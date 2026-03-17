package models

import (
	"time"

	"gorm.io/gorm"
)

// Host 主机模型
type Host struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Host        string    `json:"address" gorm:"column:host;not null"`  // 主机地址，返回给前端时用 address
	Port        int       `json:"port" gorm:"default:22"`
	User        string    `json:"username" gorm:"column:user;not null"` // 用户名，返回给前端时用 username
	Password    string    `json:"-"`                                     // 不返回给前端
	KeyID       *uint     `json:"key_id"`                                // 关联的密钥ID
	AuthType    string    `json:"auth_type" gorm:"-"`                    // 认证类型，计算字段，不存储在数据库
	Group       string    `json:"group" gorm:"default:''"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName 指定表名
func (Host) TableName() string {
	return "hosts"
}

// AfterFind GORM 钩子，查询后设置 auth_type
func (h *Host) AfterFind(tx *gorm.DB) error {
	if h.KeyID != nil {
		h.AuthType = "key"
	} else {
		h.AuthType = "password"
	}
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