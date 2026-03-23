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
	HostID       uint   // 数据库主键ID（内部使用）
	HostIDStr    string // 主机ID字符串，格式：ins-xxxxxxxx（日志显示使用）
	LastUsed     time.Time
	ServerInfo   *models.SystemInfo
	TerminalOpen bool // SSH终端是否打开
	SFTPOpen     bool // SFTP是否打开
}

// ConnectionPool 连接池
type ConnectionPool struct {
	connections map[uint]*SSHConnection
	mu          sync.RWMutex
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
	PrettyName string `json:"pretty_name"` // 完整系统版本描述，如 "Ubuntu 22.04.5 LTS"
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
	SwapTotal uint64  `json:"swap_total"` // Swap 总容量(字节)
	SwapUsed  uint64  `json:"swap_used"`  // Swap 已用(字节)
	SwapUsage float64 `json:"swap_usage"` // Swap 使用率(百分比)
}

// DiskInfo 磁盘信息
type DiskInfo struct {
	Device        string  `json:"device"`         // 设备名 (如 /dev/sda1 或 /dev/mapper/vg-lv)
	PhysicalDisk  string  `json:"physical_disk"`  // 物理磁盘 (如 /dev/sda)
	MountPoint    string  `json:"mount_point"`    // 挂载点 (如 /, /data)
	FileSystem    string  `json:"file_system"`    // 文件系统类型 (如 ext4, xfs)
	FSType        string  `json:"fs_type"`        // 文件系统类型别名
	Total         uint64  `json:"total"`          // 总容量(字节)
	Used          uint64  `json:"used"`           // 已用(字节)
	Free          uint64  `json:"free"`           // 可用(字节)
	Usage         float64 `json:"usage"`          // 使用率(百分比)
	Status        string  `json:"status"`         // 状态: mounted, unmounted, unformatted
	IsVirtual     bool    `json:"is_virtual"`     // 是否为虚拟文件系统(tmpfs等)
}

// NetInfo 网络信息
type NetInfo struct {
	Interface string `json:"interface"`
	IP        string `json:"ip"`
	MAC       string `json:"mac"`
	RxBytes   uint64 `json:"rx_bytes"`
	TxBytes   uint64 `json:"tx_bytes"`
}