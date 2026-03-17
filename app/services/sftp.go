package services

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"deploy-master/config"
	"deploy-master/models"
	"github.com/pkg/sftp"
)

// SFTPService SFTP 服务
type SFTPService struct {
	Client   *sftp.Client
	hostID   uint
	mu       sync.Mutex
}

// SFTP连接池
var sftpConnections = make(map[uint]*SFTPService)
var sftpMu sync.RWMutex

// ConnectSFTP 连接 SFTP
func ConnectSFTP(hostID uint) (*SFTPService, error) {
	sftpMu.Lock()
	defer sftpMu.Unlock()

	// 如果已存在连接，返回
	if service, exists := sftpConnections[hostID]; exists {
		return service, nil
	}

	// 获取 SSH 连接
	conn, exists := config.Pool.Get(hostID)
	if !exists {
		return nil, fmt.Errorf("SSH not connected")
	}

	// 创建 SFTP 客户端
	client, err := sftp.NewClient(conn.Client)
	if err != nil {
		return nil, fmt.Errorf("failed to create SFTP client: %v", err)
	}

	service := &SFTPService{Client: client, hostID: hostID}
	sftpConnections[hostID] = service

	log.Printf("[SFTP] Connected (host_id=%d)", hostID)
	return service, nil
}

// GetSFTP 获取 SFTP 连接
func GetSFTP(hostID uint) (*SFTPService, bool) {
	sftpMu.RLock()
	defer sftpMu.RUnlock()
	service, exists := sftpConnections[hostID]
	return service, exists
}

// DisconnectSFTP 断开 SFTP 连接
func DisconnectSFTP(hostID uint) {
	sftpMu.Lock()
	defer sftpMu.Unlock()

	if service, exists := sftpConnections[hostID]; exists {
		service.Client.Close()
		delete(sftpConnections, hostID)
		log.Printf("[SFTP] Disconnected (host_id=%d)", hostID)
	}
}

// ListDirectory 列出目录
func (s *SFTPService) ListDirectory(path string) ([]models.FileInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if path == "." || path == "" {
		// 获取当前目录
		wd, err := s.Client.Getwd()
		if err != nil {
			path = "."
		} else {
			path = wd
		}
	}

	entries, err := s.Client.ReadDir(path)
	if err != nil {
		return nil, err
	}

	var files []models.FileInfo
	for _, entry := range entries {
		fullPath := filepath.Join(path, entry.Name())
		fullPath = strings.ReplaceAll(fullPath, "\\", "/")

		info := models.FileInfo{
			Name:             entry.Name(),
			Path:             fullPath,
			Size:             entry.Size(),
			SizeFormatted:    formatSize(entry.Size()),
			IsDir:            entry.IsDir(),
			ModTime:          entry.ModTime(),
			ModTimeFormatted: entry.ModTime().Format("2006-01-02 15:04:05"),
			Permissions:      entry.Mode().String(),
		}

		// 检查是否是符号链接
		if entry.Mode()&os.ModeSymlink != 0 {
			info.IsLink = true
		}

		// 尝试获取详细信息
		if stat, err := s.Client.Stat(fullPath); err == nil {
			if sysStat, ok := stat.Sys().(*sftp.FileStat); ok {
				info.Owner = strconv.Itoa(int(sysStat.UID))
				info.Group = strconv.Itoa(int(sysStat.GID))
			}
		}

		files = append(files, info)
	}

	// 排序：目录在前
	sortFiles(files)
	return files, nil
}

// DownloadFile 下载文件 - 高性能流式传输
func (s *SFTPService) DownloadFile(remotePath string, writer io.Writer, progressID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 打开远程文件
	file, err := s.Client.Open(remotePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// 获取文件大小
	stat, err := file.Stat()
	if err != nil {
		return err
	}
	fileSize := stat.Size()

	// 更新进度
	UpdateProgress(progressID, "downloading", 0, 0, fileSize, "Starting download...")

	// 使用大缓冲区传输 (16MB)
	buffer := make([]byte, 16*1024*1024)
	var totalRead int64
	startTime := time.Now()
	lastUpdate := startTime

	for {
		n, err := file.Read(buffer)
		if n > 0 {
			written, writeErr := writer.Write(buffer[:n])
			if writeErr != nil {
				return writeErr
			}
			totalRead += int64(written)

			// 每 500ms 更新一次进度
			if time.Since(lastUpdate) > 500*time.Millisecond {
				elapsed := time.Since(startTime).Seconds()
				speed := float64(totalRead) / elapsed
				progress := int(float64(totalRead) / float64(fileSize) * 100)
				
				UpdateProgress(progressID, "downloading", progress, totalRead, fileSize, 
					fmt.Sprintf("Downloading %d%% (%s/s)", progress, formatSize(int64(speed))))
				lastUpdate = time.Now()
			}
		}

		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	// 完成
	elapsed := time.Since(startTime).Seconds()
	avgSpeed := float64(fileSize) / elapsed
	UpdateProgress(progressID, "completed", 100, fileSize, fileSize, 
		fmt.Sprintf("Completed (%s/s)", formatSize(int64(avgSpeed))))

	log.Printf("[SFTP] Download completed: %s (%s, %.2fs)", remotePath, formatSize(fileSize), elapsed)
	return nil
}

// UploadFile 上传文件
func (s *SFTPService) UploadFile(localReader io.Reader, remotePath string, fileSize int64, progressID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 创建远程文件
	file, err := s.Client.Create(remotePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// 更新进度
	UpdateProgress(progressID, "uploading", 0, 0, fileSize, "Starting upload...")

	// 使用大缓冲区传输
	buffer := make([]byte, 16*1024*1024)
	var totalWritten int64
	startTime := time.Now()
	lastUpdate := startTime

	for {
		n, err := localReader.Read(buffer)
		if n > 0 {
			written, writeErr := file.Write(buffer[:n])
			if writeErr != nil {
				return writeErr
			}
			totalWritten += int64(written)

			// 每 500ms 更新一次进度
			if time.Since(lastUpdate) > 500*time.Millisecond {
				elapsed := time.Since(startTime).Seconds()
				speed := float64(totalWritten) / elapsed
				progress := int(float64(totalWritten) / float64(fileSize) * 100)
				
				UpdateProgress(progressID, "uploading", progress, totalWritten, fileSize,
					fmt.Sprintf("Uploading %d%% (%s/s)", progress, formatSize(int64(speed))))
				lastUpdate = time.Now()
			}
		}

		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	// 完成
	elapsed := time.Since(startTime).Seconds()
	avgSpeed := float64(fileSize) / elapsed
	UpdateProgress(progressID, "completed", 100, fileSize, fileSize,
		fmt.Sprintf("Completed (%s/s)", formatSize(int64(avgSpeed))))

	log.Printf("[SFTP] Upload completed: %s (%s, %.2fs)", remotePath, formatSize(fileSize), elapsed)
	return nil
}

// CreateDirectory 创建目录
func (s *SFTPService) CreateDirectory(path string) error {
	return s.Client.MkdirAll(path)
}

// DeleteFile 删除文件
func (s *SFTPService) DeleteFile(path string) error {
	return s.Client.Remove(path)
}

// DeleteDirectory 删除目录
func (s *SFTPService) DeleteDirectory(path string, recursive bool) error {
	if recursive {
		return s.Client.RemoveAll(path)
	}
	return s.Client.RemoveDirectory(path)
}

// Rename 重命名
func (s *SFTPService) Rename(oldPath, newPath string) error {
	return s.Client.Rename(oldPath, newPath)
}

// GetFileContent 获取文件内容
func (s *SFTPService) GetFileContent(path string, maxSize int64) (string, error) {
	file, err := s.Client.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return "", err
	}

	if stat.Size() > maxSize {
		return "", fmt.Errorf("file too large: %d bytes (max: %d)", stat.Size(), maxSize)
	}

	var buffer bytes.Buffer
	_, err = io.Copy(&buffer, file)
	if err != nil {
		return "", err
	}

	return buffer.String(), nil
}

// WriteFileContent 写入文件内容
func (s *SFTPService) WriteFileContent(path, content string) error {
	file, err := s.Client.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.Write([]byte(content))
	return err
}

// 辅助函数

func formatSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func sortFiles(files []models.FileInfo) {
	// 简单排序：目录在前
	for i := 0; i < len(files)-1; i++ {
		for j := i + 1; j < len(files); j++ {
			if !files[i].IsDir && files[j].IsDir {
				files[i], files[j] = files[j], files[i]
			}
		}
	}
}

// DiskUsage 磁盘使用信息
type DiskUsage struct {
	Total     int64  `json:"total"`
	Used      int64  `json:"used"`
	Available int64  `json:"available"`
	Percent   string `json:"percent"`
}

// GetDiskUsage 获取磁盘使用情况
func (s *SFTPService) GetDiskUsage(path string) (*DiskUsage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 获取 SSH 连接
	conn, exists := config.Pool.Get(s.hostID)
	if !exists {
		return nil, fmt.Errorf("SSH not connected")
	}

	// 使用 df 命令获取磁盘使用情况
	session, err := conn.Client.NewSession()
	if err != nil {
		return nil, err
	}
	defer session.Close()

	output, err := session.CombinedOutput("df -B1 " + path + " | tail -1")
	if err != nil {
		return nil, err
	}

	// 解析输出: Filesystem 1B-blocks Used Available Use% Mounted on
	parts := strings.Fields(string(output))
	if len(parts) < 4 {
		return nil, fmt.Errorf("failed to parse df output")
	}

	total, _ := strconv.ParseInt(parts[1], 10, 64)
	used, _ := strconv.ParseInt(parts[2], 10, 64)
	available, _ := strconv.ParseInt(parts[3], 10, 64)
	percent := ""
	if len(parts) >= 5 {
		percent = parts[4]
	}

	return &DiskUsage{
		Total:     total,
		Used:      used,
		Available: available,
		Percent:   percent,
	}, nil
}

// DownloadFolder 下载文件夹（打包为 tar）
func (s *SFTPService) DownloadFolder(remotePath string, writer io.Writer, progressID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 获取 SSH 连接
	conn, exists := config.Pool.Get(s.hostID)
	if !exists {
		return fmt.Errorf("SSH not connected")
	}

	// 更新进度
	UpdateProgress(progressID, "downloading", 0, 0, 0, "Starting folder download...")

	// 使用 tar 命令打包并流式传输
	session, err := conn.Client.NewSession()
	if err != nil {
		return err
	}
	defer session.Close()

	// 设置输出到 writer
	session.Stdout = writer
	session.Stderr = writer

	// 使用 tar 打包
	err = session.Run("tar -cf - " + remotePath)
	if err != nil {
		return err
	}

	UpdateProgress(progressID, "completed", 100, 0, 0, "Folder download completed")
	return nil
}