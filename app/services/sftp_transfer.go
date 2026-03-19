package services

import (
	"fmt"
	"io"
	"log"
	"path/filepath"
	"strings"
	"time"

	"deploy-master/config"
)

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

// UploadFile 上传文件 - 高性能传输优化
func (s *SFTPService) UploadFile(localReader io.Reader, remotePath string, fileSize int64, progressID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 获取文件所在目录
	dir := filepath.Dir(remotePath)
	dir = strings.ReplaceAll(dir, "\\", "/")

	// 如果目录不是当前目录，则创建目录结构
	if dir != "." && dir != "/" {
		err := s.Client.MkdirAll(dir)
		if err != nil {
			return fmt.Errorf("无法创建目录 %s: %v", dir, err)
		}
	}

	// 检查磁盘空间
	diskUsage, err := s.getDiskUsageInternal(dir)
	if err == nil {
		// 检查是否有足够空间（预留 100MB）
		requiredSpace := fileSize + 100*1024*1024
		if diskUsage.Available < requiredSpace {
			availableStr := formatSize(diskUsage.Available)
			requiredStr := formatSize(fileSize)
			return fmt.Errorf("磁盘空间不足: 需要 %s，可用 %s (使用率: %s)",
				requiredStr, availableStr, diskUsage.Percent)
		}
	}

	// 更新进度
	UpdateProgress(progressID, "uploading", 0, 0, fileSize, "Starting upload...")

	startTime := time.Now()

	// 对于大文件（> 100MB），使用 SSH 管道传输（更快）
	if fileSize > 100*1024*1024 {
		err := s.pipedUpload(localReader, remotePath, fileSize, progressID, startTime)
		if err != nil {
			// 如果管道传输失败，回退到普通传输
			log.Printf("[SFTP] Pipe upload failed, falling back to normal: %v", err)
			return s.normalUpload(localReader, remotePath, fileSize, progressID, startTime)
		}
	} else {
		// 小文件使用普通传输
		err := s.normalUpload(localReader, remotePath, fileSize, progressID, startTime)
		if err != nil {
			return err
		}
	}

	return nil
}

// normalUpload 普通SFTP上传
func (s *SFTPService) normalUpload(localReader io.Reader, remotePath string, fileSize int64, progressID string, startTime time.Time) error {
	// 创建远程文件
	file, err := s.Client.Create(remotePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// 使用大缓冲区传输 (32MB)
	buffer := make([]byte, 32*1024*1024)
	var totalWritten int64
	lastUpdate := startTime

	for {
		n, err := localReader.Read(buffer)
		if n > 0 {
			written, writeErr := file.Write(buffer[:n])
			if writeErr != nil {
				return writeErr
			}
			totalWritten += int64(written)

			// 每 200ms 更新一次进度
			if time.Since(lastUpdate) > 200*time.Millisecond {
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

// pipedUpload 使用SSH管道上传（绕过SFTP协议开销，速度更快）
func (s *SFTPService) pipedUpload(localReader io.Reader, remotePath string, fileSize int64, progressID string, startTime time.Time) error {
	// 获取 SSH 连接
	conn, exists := config.Pool.Get(s.hostID)
	if !exists {
		return fmt.Errorf("SSH not connected")
	}

	// 创建 SSH 会话
	session, err := conn.Client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create SSH session: %v", err)
	}
	defer session.Close()

	// 创建标准输入管道
	stdin, err := session.StdinPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdin pipe: %v", err)
	}

	// 使用 cat 命令接收数据并写入文件
	cmd := fmt.Sprintf("cat > '%s'", remotePath)

	// 启动远程命令
	if err := session.Start(cmd); err != nil {
		return fmt.Errorf("failed to start remote command: %v", err)
	}

	// 使用大缓冲区传输 (32MB)
	buffer := make([]byte, 32*1024*1024)
	var totalWritten int64
	lastUpdate := startTime

	for {
		n, err := localReader.Read(buffer)
		if n > 0 {
			written, writeErr := stdin.Write(buffer[:n])
			if writeErr != nil {
				stdin.Close()
				return writeErr
			}
			totalWritten += int64(written)

			// 每 200ms 更新一次进度
			if time.Since(lastUpdate) > 200*time.Millisecond {
				elapsed := time.Since(startTime).Seconds()
				speed := float64(totalWritten) / elapsed
				progress := int(float64(totalWritten) / float64(fileSize) * 100)

				UpdateProgress(progressID, "uploading", progress, totalWritten, fileSize,
					fmt.Sprintf("Uploading %d%% (%s/s, pipe mode)", progress, formatSize(int64(speed))))
				lastUpdate = time.Now()
			}
		}

		if err == io.EOF {
			break
		}
		if err != nil {
			stdin.Close()
			return err
		}
	}

	// 关闭标准输入，通知远程命令结束
	stdin.Close()

	// 等待远程命令完成
	if err := session.Wait(); err != nil {
		return fmt.Errorf("remote command failed: %v", err)
	}

	// 完成
	elapsed := time.Since(startTime).Seconds()
	avgSpeed := float64(fileSize) / elapsed
	UpdateProgress(progressID, "completed", 100, fileSize, fileSize,
		fmt.Sprintf("Completed (%s/s)", formatSize(int64(avgSpeed))))

	log.Printf("[SFTP] Upload completed (pipe): %s (%s, %.2fs)", remotePath, formatSize(fileSize), elapsed)
	return nil
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