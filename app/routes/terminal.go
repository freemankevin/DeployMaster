package routes

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/models"
	"deploy-master/pkg/logger"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

// TerminalSession 终端会话
type TerminalSession struct {
	HostID  uint
	Conn    *websocket.Conn
	SSHConn *ssh.Client
	Session *ssh.Session
	mu      sync.Mutex
}

var terminalSessions = make(map[uint]*TerminalSession)
var terminalMu sync.RWMutex

// terminalHandler WebSocket 终端处理器
func terminalHandler(c *gin.Context) {
	id := c.Param("id")
	hostID := uint(parseInt(id))

	// 获取主机信息
	var host models.Host
	if err := database.DB.First(&host, hostID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		return
	}

	// 升级为 WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Terminal.Error("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	logger.Terminal.Info("[%s] WebSocket connected", host.HostID)

	// 获取 SSH 连接
	sshConn, exists := config.Pool.Get(hostID)
	if !exists {
		// 解密密码
		password := ""
		if host.Password != "" {
			password = config.DecryptPassword(host.Password)
		}

		// 获取密钥
		var key *models.SSHKey
		if host.KeyID != nil {
			key = &models.SSHKey{}
			if err := database.DB.First(key, *host.KeyID).Error; err != nil {
				logger.Terminal.Warn("[%s] Failed to load key (key_id=%d): %v", host.HostID, *host.KeyID, err)
				key = nil
			} else {
				logger.Terminal.Debug("[%s] Loaded key (key_id=%d, name=%s, has_private_key=%v)",
					host.HostID, *host.KeyID, key.Name, key.PrivateKey != "")
			}
		}

		// 连接
		sshConn, err = config.Pool.Connect(hostID, host.HostID, host.Host, host.Port, host.User, password, key)
		if err != nil {
			conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mConnection failed: "+err.Error()+"\x1b[0m\r\n"))
			return
		}
	}

	// 创建 SSH 会话
	session, err := sshConn.Client.NewSession()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mSession creation failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}
	defer session.Close()

	// 设置终端模式
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	// 请求伪终端
	if err := session.RequestPty("xterm-256color", 40, 120, modes); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mTerminal request failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}

	// 获取管道
	stdin, err := session.StdinPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mStdin pipe failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mStdout pipe failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mStderr pipe failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}

	// 启动 shell
	if err := session.Shell(); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[31mShell start failed: "+err.Error()+"\x1b[0m\r\n"))
		return
	}

	// 标记终端为打开状态，保持连接
	config.Pool.SetTerminalOpen(hostID, true)

	// 保存会话
	terminalMu.Lock()
	terminalSessions[hostID] = &TerminalSession{
		HostID:  hostID,
		Conn:    conn,
		SSHConn: sshConn.Client,
		Session: session,
	}
	terminalMu.Unlock()

	// 清理
	defer func() {
		terminalMu.Lock()
		delete(terminalSessions, hostID)
		terminalMu.Unlock()
		// 标记终端为关闭状态，但保持连接10分钟
		config.Pool.SetTerminalOpen(hostID, false)
		logger.Terminal.Info("[%s] Session closed", host.HostID)
	}()

	// 发送欢迎消息
	conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[32mConnected to "+host.Name+" ("+host.Host+")\x1b[0m\r\n"))

	// 读取输出协程
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stdout.Read(buf)
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[33m[Connection closed]\x1b[0m\r\n"))
				return
			}
			if n > 0 {
				conn.WriteMessage(websocket.TextMessage, buf[:n])
			}
		}
	}()

	// 读取错误协程
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stderr.Read(buf)
			if err != nil {
				return
			}
			if n > 0 {
				conn.WriteMessage(websocket.TextMessage, buf[:n])
			}
		}
	}()

	// 读取 WebSocket 消息
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// 尝试解析 JSON 消息
		var wsMsg struct {
			Type string `json:"type"`
			Data string `json:"data"`
			Cols int    `json:"cols"`
			Rows int    `json:"rows"`
		}
		
		if err := json.Unmarshal(msg, &wsMsg); err == nil {
			// 是 JSON 消息
			switch wsMsg.Type {
			case "ping":
				// 心跳请求，响应 pong
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`))
			case "data":
				// 写入数据到 SSH
				stdin.Write([]byte(wsMsg.Data))
			case "resize":
				// 调整终端大小
				if wsMsg.Cols > 0 && wsMsg.Rows > 0 {
					session.WindowChange(wsMsg.Rows, wsMsg.Cols)
				}
			}
		} else {
			// 原始消息，直接写入 SSH（向后兼容）
			stdin.Write(msg)
		}
	}
}

// ResizeTerminal 调整终端大小
func ResizeTerminal(hostID uint, cols, rows int) error {
	terminalMu.RLock()
	session, exists := terminalSessions[hostID]
	terminalMu.RUnlock()

	if !exists {
		return nil
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	return session.Session.WindowChange(rows, cols)
}

// CloseTerminal 关闭终端
func CloseTerminal(hostID uint) {
	terminalMu.Lock()
	defer terminalMu.Unlock()

	if session, exists := terminalSessions[hostID]; exists {
		session.Conn.Close()
		session.Session.Close()
		delete(terminalSessions, hostID)
	}
}

// KeepAlive 保持连接
func init() {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			terminalMu.RLock()
			for _, session := range terminalSessions {
				session.Conn.WriteMessage(websocket.PingMessage, nil)
			}
			terminalMu.RUnlock()
		}
	}()
}