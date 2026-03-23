package config

import (
	"bytes"
	"fmt"
	"io"
	"net"
	"time"

	"deploy-master/models"
	"deploy-master/pkg/logger"
	"golang.org/x/crypto/ssh"
)

var Pool *ConnectionPool

// InitConnectionPool 初始化连接池
func InitConnectionPool() {
	Pool = &ConnectionPool{
		connections: make(map[uint]*SSHConnection),
	}
	// 启动后台健康检查任务
	go Pool.healthCheckLoop()
}

// healthCheckLoop 定期检查连接健康状态
func (p *ConnectionPool) healthCheckLoop() {
	ticker := time.NewTicker(60 * time.Second) // 每60秒检查一次
	defer ticker.Stop()

	for range ticker.C {
		p.checkConnectionHealth()
	}
}

// checkConnectionHealth 检查连接健康状态，移除已断开的连接
// 注意：不会主动断开连接，只清理已经失效的连接
func (p *ConnectionPool) checkConnectionHealth() {
	p.mu.Lock()
	defer p.mu.Unlock()

	for hostID, conn := range p.connections {
		// 检查连接是否仍然有效
		// 通过创建一个空会话来测试连接是否存活
		session, err := conn.Client.NewSession()
		if err != nil {
			// 连接已失效，清理它
			logger.ConnectionPool.Info("[%s] Connection lost, removing from pool", conn.HostIDStr)
			conn.Client.Close()
			delete(p.connections, hostID)
			continue
		}
		session.Close()
	}
}

// SetTerminalOpen 设置SSH终端打开状态
func (p *ConnectionPool) SetTerminalOpen(hostID uint, open bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if conn, exists := p.connections[hostID]; exists {
		conn.TerminalOpen = open
		if open {
			logger.ConnectionPool.Debug("[%s] Terminal opened", conn.HostIDStr)
		} else {
			logger.ConnectionPool.Debug("[%s] Terminal closed", conn.HostIDStr)
		}
	}
}

// SetSFTPOpen 设置SFTP打开状态
func (p *ConnectionPool) SetSFTPOpen(hostID uint, open bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if conn, exists := p.connections[hostID]; exists {
		conn.SFTPOpen = open
		if open {
			logger.ConnectionPool.Debug("[%s] SFTP opened", conn.HostIDStr)
		} else {
			logger.ConnectionPool.Debug("[%s] SFTP closed", conn.HostIDStr)
		}
	}
}

// Connect 建立 SSH 连接
// hostID: 数据库主键ID（内部使用）
// hostIDStr: 主机ID字符串，格式：ins-xxxxxxxx（日志显示使用）
func (p *ConnectionPool) Connect(hostID uint, hostIDStr, address string, port int, username, password string, key *models.SSHKey) (*SSHConnection, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// 如果已存在连接，先关闭
	if conn, exists := p.connections[hostID]; exists {
		conn.Client.Close()
		delete(p.connections, hostID)
	}

	// 创建 SSH 配置
	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout: 10 * time.Second,
	}

	// 添加认证方式
	authMethods := []string{}

	if key != nil && key.PrivateKey != "" {
		logger.SSH.Debug("[%s] Using key authentication (key_name=%s, has_passphrase=%v)",
			hostIDStr, key.Name, key.Passphrase != "")
		var signer ssh.Signer
		var err error

		if key.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(key.PrivateKey), []byte(key.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(key.PrivateKey))
		}

		if err != nil {
			logger.SSH.Error("[%s] Failed to parse private key: %v", hostIDStr, err)
			return nil, fmt.Errorf("failed to parse private key: %v", err)
		}
		config.Auth = append(config.Auth, ssh.PublicKeys(signer))
		authMethods = append(authMethods, "publickey")
	}

	if password != "" {
		logger.SSH.Debug("[%s] Using password authentication", hostIDStr)
		config.Auth = append(config.Auth, ssh.Password(password))
		authMethods = append(authMethods, "password")
	}

	logger.SSH.Info("[%s] Attempting connection to %s:%d with auth methods: %v", hostIDStr, address, port, authMethods)

	// 连接
	addr := fmt.Sprintf("%s:%d", address, port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		logger.SSH.Error("[%s] Connection failed: %v", hostIDStr, err)
		return nil, fmt.Errorf("failed to connect: %v", err)
	}

	conn := &SSHConnection{
		Client:       client,
		HostID:       hostID,
		HostIDStr:    hostIDStr,
		LastUsed:     time.Now(),
		TerminalOpen: false,
		SFTPOpen:     false,
	}

	p.connections[hostID] = conn

	logger.SSH.Info("[%s] Connected to %s:%d", hostIDStr, address, port)
	return conn, nil
}

// Get 获取连接
func (p *ConnectionPool) Get(hostID uint) (*SSHConnection, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	conn, exists := p.connections[hostID]
	if exists {
		conn.LastUsed = time.Now()
	}
	return conn, exists
}

// Disconnect 断开连接
func (p *ConnectionPool) Disconnect(hostID uint) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if conn, exists := p.connections[hostID]; exists {
		conn.Client.Close()
		delete(p.connections, hostID)
		logger.SSH.Info("[%s] Disconnected", conn.HostIDStr)
	}
}

// ExecuteCommand 执行命令
func (p *ConnectionPool) ExecuteCommand(hostID uint, command string) (string, error) {
	conn, exists := p.Get(hostID)
	if !exists {
		return "", fmt.Errorf("not connected to host %d", hostID)
	}

	session, err := conn.Client.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	err = session.Run(command)
	if err != nil {
		return stdout.String() + stderr.String(), err
	}
	return stdout.String(), nil
}

// CreateTunnel 创建 SSH 隧道
func (p *ConnectionPool) CreateTunnel(hostID uint, localPort, remoteHost string, remotePort int) (net.Listener, error) {
	conn, exists := p.Get(hostID)
	if !exists {
		return nil, fmt.Errorf("not connected to host %d", hostID)
	}

	// 创建本地监听
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%s", localPort))
	if err != nil {
		return nil, err
	}

	go func() {
		for {
			localConn, err := listener.Accept()
			if err != nil {
				break
			}

			go func() {
				defer localConn.Close()

				// 通过 SSH 连接到远程
				remoteAddr := fmt.Sprintf("%s:%d", remoteHost, remotePort)
				remoteConn, err := conn.Client.Dial("tcp", remoteAddr)
				if err != nil {
					return
				}
				defer remoteConn.Close()

				// 双向转发
				go io.Copy(localConn, remoteConn)
				io.Copy(remoteConn, localConn)
			}()
		}
	}()

	return listener, nil
}