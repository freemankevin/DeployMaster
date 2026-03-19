package config

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net"
	"time"

	"deploy-master/models"
	"golang.org/x/crypto/ssh"
)

var Pool *ConnectionPool

// 默认连接保持时间（10分钟）
const DefaultKeepAliveDuration = 10 * time.Minute

// InitConnectionPool 初始化连接池
func InitConnectionPool() {
	Pool = &ConnectionPool{
		connections: make(map[uint]*SSHConnection),
		timeout:     DefaultKeepAliveDuration,
	}
	// 启动后台清理任务
	go Pool.cleanupLoop()
}

// cleanupLoop 定期清理过期连接
func (p *ConnectionPool) cleanupLoop() {
	ticker := time.NewTicker(30 * time.Second) // 每30秒检查一次
	defer ticker.Stop()

	for range ticker.C {
		p.cleanupExpiredConnections()
	}
}

// cleanupExpiredConnections 清理过期连接
func (p *ConnectionPool) cleanupExpiredConnections() {
	p.mu.Lock()
	defer p.mu.Unlock()

	now := time.Now()
	for hostID, conn := range p.connections {
		// 如果终端或SFTP窗口打开，延长保持时间
		if conn.TerminalOpen || conn.SFTPOpen {
			conn.KeepUntil = now.Add(DefaultKeepAliveDuration)
			log.Printf("[ConnectionPool] Host %d has active terminal/SFTP, extending keep-alive", hostID)
			continue
		}

		// 检查是否超过保持时间
		if now.After(conn.KeepUntil) {
			log.Printf("[ConnectionPool] Connection expired for host %d, disconnecting", hostID)
			conn.Client.Close()
			delete(p.connections, hostID)
		}
	}
}

// SetTerminalOpen 设置SSH终端打开状态
func (p *ConnectionPool) SetTerminalOpen(hostID uint, open bool) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if conn, exists := p.connections[hostID]; exists {
		conn.TerminalOpen = open
		if open {
			conn.KeepUntil = time.Now().Add(DefaultKeepAliveDuration)
			log.Printf("[ConnectionPool] Terminal opened for host %d, keeping connection alive", hostID)
		} else {
			// 终端关闭时，重新计算保持时间（从当前时间开始10分钟）
			conn.KeepUntil = time.Now().Add(DefaultKeepAliveDuration)
			log.Printf("[ConnectionPool] Terminal closed for host %d, keeping connection for 10 more minutes", hostID)
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
			conn.KeepUntil = time.Now().Add(DefaultKeepAliveDuration)
			log.Printf("[ConnectionPool] SFTP opened for host %d, keeping connection alive", hostID)
		} else {
			// SFTP关闭时，重新计算保持时间（从当前时间开始10分钟）
			conn.KeepUntil = time.Now().Add(DefaultKeepAliveDuration)
			log.Printf("[ConnectionPool] SFTP closed for host %d, keeping connection for 10 more minutes", hostID)
		}
	}
}

// Connect 建立 SSH 连接
func (p *ConnectionPool) Connect(hostID uint, address string, port int, username, password string, key *models.SSHKey) (*SSHConnection, error) {
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
		log.Printf("[SSH] Using key authentication (key_name=%s, has_passphrase=%v)",
			key.Name, key.Passphrase != "")
		var signer ssh.Signer
		var err error

		if key.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(key.PrivateKey), []byte(key.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(key.PrivateKey))
		}

		if err != nil {
			log.Printf("[SSH] Failed to parse private key: %v", err)
			return nil, fmt.Errorf("failed to parse private key: %v", err)
		}
		config.Auth = append(config.Auth, ssh.PublicKeys(signer))
		authMethods = append(authMethods, "publickey")
	}

	if password != "" {
		log.Printf("[SSH] Using password authentication")
		config.Auth = append(config.Auth, ssh.Password(password))
		authMethods = append(authMethods, "password")
	}

	log.Printf("[SSH] Attempting connection to %s:%d with auth methods: %v", address, port, authMethods)

	// 连接
	addr := fmt.Sprintf("%s:%d", address, port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		log.Printf("[SSH] Connection failed: %v", err)
		return nil, fmt.Errorf("failed to connect: %v", err)
	}

	conn := &SSHConnection{
		Client:       client,
		HostID:       hostID,
		LastUsed:     time.Now(),
		KeepUntil:    time.Now().Add(DefaultKeepAliveDuration),
		TerminalOpen: false,
		SFTPOpen:     false,
	}

	p.connections[hostID] = conn

	log.Printf("[SSH] Connected to %s:%d (host_id=%d)", address, port, hostID)
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
		log.Printf("[SSH] Disconnected (host_id=%d)", hostID)
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