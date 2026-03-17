package config

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"sync"
	"time"

	"deploy-master/models"
	"golang.org/x/crypto/ssh"
)

// SSHConnection SSH 连接
type SSHConnection struct {
	Client     *ssh.Client
	HostID     uint
	LastUsed   time.Time
	ServerInfo *models.SystemInfo
}

// ConnectionPool 连接池
type ConnectionPool struct {
	connections map[uint]*SSHConnection
	mu          sync.RWMutex
}

var Pool *ConnectionPool

// 加密密钥 (实际应用中应从配置文件读取)
var secretKey = []byte("deploy-master-secret-key-32b")

// InitConnectionPool 初始化连接池
func InitConnectionPool() {
	Pool = &ConnectionPool{
		connections: make(map[uint]*SSHConnection),
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
	if key != nil && key.PrivateKey != "" {
		var signer ssh.Signer
		var err error
		
		if key.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(key.PrivateKey), []byte(key.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(key.PrivateKey))
		}
		
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %v", err)
		}
		config.Auth = append(config.Auth, ssh.PublicKeys(signer))
	}
	
	if password != "" {
		config.Auth = append(config.Auth, ssh.Password(password))
	}

	// 连接
	addr := fmt.Sprintf("%s:%d", address, port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %v", err)
	}

	conn := &SSHConnection{
		Client:   client,
		HostID:   hostID,
		LastUsed: time.Now(),
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

// GenerateSSHKey 生成 SSH 密钥对
func GenerateSSHKey(keyType string, bits int, passphrase string) (privateKey, publicKey string, err error) {
	// 生成 RSA 私钥
	key, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		return "", "", err
	}

	// 编码私钥 (暂不支持加密，直接导出)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	})

	// 生成公钥
	pub, err := ssh.NewPublicKey(&key.PublicKey)
	if err != nil {
		return "", "", err
	}
	publicKey = string(ssh.MarshalAuthorizedKey(pub))

	return string(privateKeyPEM), publicKey, nil
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

// SaveKeyToFile 保存密钥到文件
func SaveKeyToFile(keyContent, filename string) error {
	return os.WriteFile(filename, []byte(keyContent), 0600)
}

// EncryptPassword 加密密码
func EncryptPassword(password string) string {
	if password == "" {
		return ""
	}

	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return password
	}

	plaintext := []byte(password)
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]

	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return password
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)

	return base64.StdEncoding.EncodeToString(ciphertext)
}

// DecryptPassword 解密密码
func DecryptPassword(encrypted string) string {
	if encrypted == "" {
		return ""
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return encrypted
	}

	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return encrypted
	}

	if len(ciphertext) < aes.BlockSize {
		return encrypted
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return string(ciphertext)
}

// SystemInfo 系统信息
type SystemInfo struct {
	OS         string `json:"os"`
	Kernel     string `json:"kernel"`
	Hostname   string `json:"hostname"`
	Uptime     string `json:"uptime"`
	CPU        string `json:"cpu"`
	Memory     string `json:"memory"`
	Disk       string `json:"disk"`
	IP         string `json:"ip"`
	Distro     string `json:"distro"`
	DistroLike string `json:"distro_like"`
	Version    string `json:"version"`
}

// HardwareInfo 硬件信息
type HardwareInfo struct {
	CPU     CPUInfo     `json:"cpu"`
	Memory  MemoryInfo  `json:"memory"`
	Disks   []DiskInfo  `json:"disks"`
	Network []NetInfo   `json:"network"`
}

// CPUInfo CPU 信息
type CPUInfo struct {
	Model   string    `json:"model"`
	Cores   int       `json:"cores"`
	Threads int       `json:"threads"`
	Usage   float64   `json:"usage"`
	LoadAvg []float64 `json:"load_avg"`
}

// MemoryInfo 内存信息
type MemoryInfo struct {
	Total     uint64  `json:"total"`
	Used      uint64  `json:"used"`
	Free      uint64  `json:"free"`
	Available uint64  `json:"available"`
	Usage     float64 `json:"usage"`
}

// DiskInfo 磁盘信息
type DiskInfo struct {
	Device     string  `json:"device"`
	MountPoint string  `json:"mount_point"`
	FileSystem string  `json:"file_system"`
	Total      uint64  `json:"total"`
	Used       uint64  `json:"used"`
	Free       uint64  `json:"free"`
	Usage      float64 `json:"usage"`
}

// NetInfo 网络信息
type NetInfo struct {
	Interface string `json:"interface"`
	IP        string `json:"ip"`
	MAC       string `json:"mac"`
	RxBytes   uint64 `json:"rx_bytes"`
	TxBytes   uint64 `json:"tx_bytes"`
}