package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// DiskInfoJSON 磁盘信息（用于JSON存储）
type DiskInfoJSON struct {
	Device       string  `json:"device"`        // 设备名 (如 /dev/sda1)
	PhysicalDisk string  `json:"physical_disk"` // 物理磁盘 (如 /dev/sda)
	MountPoint   string  `json:"mount_point"`   // 挂载点 (如 /, /data)
	FileSystem   string  `json:"file_system"`   // 文件系统设备
	FSType       string  `json:"fs_type"`       // 文件系统类型 (如 ext4, xfs)
	Total        uint64  `json:"total"`         // 总容量(字节)
	Used         uint64  `json:"used"`          // 已用(字节)
	Free         uint64  `json:"free"`          // 可用(字节)
	Usage        float64 `json:"usage"`         // 使用率(百分比)
	Status       string  `json:"status"`        // 状态 (mounted, unmounted)
	IsVirtual    bool    `json:"is_virtual"`    // 是否为虚拟文件系统
}

// Host 主机模型
type Host struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	HostID      string    `json:"host_id" gorm:"column:host_id;index;default:''"` // 主机ID，格式：ins-xxxxxxxx
	Name        string    `json:"name" gorm:"not null"`
	Host        string    `json:"address" gorm:"column:host;not null"`  // 主机地址，返回给前端时用 address
	Port        int       `json:"port" gorm:"default:22"`
	User        string    `json:"username" gorm:"column:user;not null"` // 用户名，返回给前端时用 username
	Password    string    `json:"-"`                                     // 不返回给前端
	HasPassword bool      `json:"has_password" gorm:"-"`                 // 是否有密码，计算字段
	KeyID       *uint     `json:"key_id"`                                // 关联的密钥ID
	AuthType    string    `json:"auth_type" gorm:"-"`                    // 认证类型，计算字段，不存储在数据库
	Group       string    `json:"group" gorm:"default:''"`
	Description string    `json:"description"`
	
	// 系统信息字段
	SystemType      string          `json:"system_type" gorm:"column:system_type"`           // 系统类型 (linux, windows, etc.)
	OSKey           string          `json:"os_key" gorm:"column:os_key"`                     // 操作系统标识符 (ubuntu, centos, etc.)
	OSVersion       string          `json:"os_version" gorm:"column:os_version"`             // 操作系统版本号（完整版本，包含小版本号）
	OSPrettyName    string          `json:"os_pretty_name" gorm:"column:os_pretty_name"`     // 完整系统版本描述，如 "Ubuntu 22.04.5 LTS"
	KernelVersion   string          `json:"kernel_version" gorm:"column:kernel_version"`     // 内核版本
	Architecture    string          `json:"architecture" gorm:"column:architecture"`         // 架构类型 (x86_64, arm64, etc.)
	CPUCores        int             `json:"cpu_cores" gorm:"column:cpu_cores;default:0"`     // CPU核心数
	MemoryGB        int             `json:"memory_gb" gorm:"column:memory_gb;default:0"`     // 内存容量(GB)
	SwapGB          int             `json:"swap_gb" gorm:"column:swap_gb;default:0"`         // Swap容量(GB)
	Disks           json.RawMessage `json:"disks" gorm:"column:disks;type:text"`             // 磁盘信息列表(JSON格式)

	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名
func (Host) TableName() string {
	return "hosts"
}

// AfterFind GORM 钩子，查询后设置 auth_type 和 has_password
func (h *Host) AfterFind(tx *gorm.DB) error {
	if h.KeyID != nil {
		h.AuthType = "key"
	} else {
		h.AuthType = "password"
	}
	h.HasPassword = h.Password != ""
	return nil
}

// SSHKey SSH 密钥模型
type SSHKey struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Name       string    `json:"name" gorm:"not null;unique"`
	Type       string    `json:"type" gorm:"default:'rsa'"`        // rsa, ed25519, ecdsa
	PrivateKey string    `json:"private_key,omitempty"`            // 返回时可选
	PublicKey  string    `json:"public_key"`
	Passphrase string    `json:"-"`                               // 不返回给前端
	Comment    string    `json:"comment"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TableName 指定表名
func (SSHKey) TableName() string {
	return "ssh_keys"
}

// FileInfo 文件信息
type FileInfo struct {
	Name             string    `json:"name"`
	Path             string    `json:"path"`
	Size             int64     `json:"size"`
	SizeFormatted    string    `json:"size_formatted"`
	IsDir            bool      `json:"is_dir"`
	IsLink           bool      `json:"is_link"`
	ModTime          time.Time `json:"modified_time"`
	ModTimeFormatted string    `json:"modified_time_formatted"`
	Permissions      string    `json:"permissions"`
	Owner            string    `json:"owner"`
	Group            string    `json:"group"`
}

// TransferProgress 传输进度
type TransferProgress struct {
	TransferID       string    `json:"transfer_id"`
	Stage            string    `json:"stage"`            // init, downloading, uploading, completed, error
	Progress         int       `json:"progress"`         // 0-100
	BytesTransferred int64     `json:"bytes_transferred"`
	TotalBytes       int64     `json:"total_bytes"`
	Speed            string    `json:"speed"`            // e.g. "10.5 MB/s"
	Message          string    `json:"message"`
	StartTime        time.Time `json:"start_time,omitempty"`
	EndTime          time.Time `json:"end_time,omitempty"`
}

// TransferRecord 传输记录（持久化存储）
type TransferRecord struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	TransferID    string    `json:"transfer_id" gorm:"index;not null"`           // 传输任务ID
	Type          string    `json:"type" gorm:"not null"`                        // upload, download
	Filename      string    `json:"filename" gorm:"not null"`                    // 文件名
	RemotePath    string    `json:"remote_path" gorm:"not null"`                 // 远程路径
	Size          int64     `json:"size" gorm:"default:0"`                       // 文件大小
	Transferred   int64     `json:"transferred" gorm:"default:0"`                // 已传输字节
	Status        string    `json:"status" gorm:"not null"`                      // pending, transferring, completed, failed, cancelled
	Progress      int       `json:"progress" gorm:"default:0"`                   // 进度 0-100
	Speed         string    `json:"speed" gorm:"default:''"`                     // 传输速度
	Error         string    `json:"error" gorm:"default:''"`                     // 错误信息
	HostID        uint      `json:"host_id" gorm:"index"`                        // 主机ID
	StartTime     time.Time `json:"start_time" gorm:"index"`                     // 开始时间
	EndTime       *time.Time `json:"end_time"`                                     // 结束时间
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// TableName 指定表名
func (TransferRecord) TableName() string {
	return "transfer_records"
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

// API 响应结构

// HostResponse 主机响应 (包含连接状态)
type HostResponse struct {
	Host
	Connected bool       `json:"connected"`
	ServerInfo *SystemInfo `json:"server_info,omitempty"`
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// ConnectResponse 连接响应
type ConnectResponse struct {
	Message    string      `json:"message"`
	HostID     uint        `json:"host_id"`
	Connected  bool        `json:"connected"`
	ServerInfo *SystemInfo `json:"server_info,omitempty"`
}

// ExecuteResponse 命令执行响应
type ExecuteResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

// ListResponse 目录列表响应
type ListResponse struct {
	Path  string     `json:"path"`
	Files []FileInfo `json:"files"`
}

// ProgressResponse 进度响应
type ProgressResponse struct {
	TransferID       string `json:"transfer_id"`
	Stage            string `json:"stage"`
	Progress         int    `json:"progress"`
	BytesTransferred int64  `json:"bytes_transferred"`
	TotalBytes       int64  `json:"total_bytes"`
	Speed            string `json:"speed"`
	Message          string `json:"message"`
}