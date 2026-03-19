package config

import (
	"sync"
	"time"

	"deploy-master/models"
	"golang.org/x/crypto/ssh"
)

// SSHConnection SSH 连接
type SSHConnection struct {
	Client       *ssh.Client
	HostID       uint
	LastUsed     time.Time
	ServerInfo   *models.SystemInfo
	TerminalOpen bool      // SSH终端是否打开
	SFTPOpen     bool      // SFTP是否打开
	KeepUntil    time.Time // 保持连接直到这个时间
}

// ConnectionPool 连接池
type ConnectionPool struct {
	connections map[uint]*SSHConnection
	mu          sync.RWMutex
	timeout     time.Duration // 默认超时时间
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