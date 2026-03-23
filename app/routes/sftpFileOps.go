package routes

import (
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"

	"deploy-master/pkg/logger"
	"deploy-master/services"

	"github.com/gin-gonic/gin"
)

// sftpDownload 下载文件
func sftpDownload(c *gin.Context) {
	var input struct {
		HostID     uint   `json:"host_id"`
		Path       string `json:"path"`
		DownloadID string `json:"download_id"`
	}
	
	// 先从 query 参数获取 download_id（优先），这样可以在解析 JSON 之前就创建进度记录
	downloadID := c.Query("download_id")
	
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 如果 JSON body 中有 download_id，使用它（覆盖 query 参数）
	if input.DownloadID != "" {
		downloadID = input.DownloadID
	}

	// 预先创建进度记录，避免前端轮询时 404
	if downloadID != "" {
		services.UpdateProgress(downloadID, "init", 0, 0, 0, "Preparing download...")
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		// 更新进度为错误状态
		if downloadID != "" {
			services.UpdateProgress(downloadID, "error", 0, 0, 0, "SFTP connection failed: "+err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 获取文件名
	filename := input.Path
	if idx := len(input.Path) - 1; idx > 0 {
		for i := len(input.Path) - 1; i >= 0; i-- {
			if input.Path[i] == '/' {
				filename = input.Path[i+1:]
				break
			}
		}
	}

	// 设置响应头 - 使用 RFC 5987 编码文件名，支持特殊字符和空格
	encodedFilename := url.QueryEscape(filename)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", filename, encodedFilename))
	c.Header("Content-Type", "application/octet-stream")

	// 流式下载
	err = service.DownloadFile(input.Path, c.Writer, downloadID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
}

// sftpUpload 上传文件
func sftpUpload(c *gin.Context) {
	// 从查询参数获取 upload_id（优先），这样可以在解析请求体之前就创建进度记录
	// 这对于大文件上传非常重要，因为解析请求体可能需要很长时间
	progressID := c.Query("upload_id")
	if progressID == "" {
		// 如果查询参数没有，尝试从表单获取（向后兼容）
		progressID = c.PostForm("upload_id")
	}
	if progressID == "" {
		progressID = generateID()
	}

	logger.SFTP.Debug("[Upload] Starting upload request, progress_id=%s", progressID)

	// 立即创建进度记录，避免前端轮询时 404
	services.UpdateProgress(progressID, "receiving", 0, 0, 0, "Receiving file data...")

	// 检查客户端是否已断开连接（取消上传）
	if c.Request.Context().Err() != nil {
		logger.SFTP.Debug("[Upload] %s cancelled by client before receiving file", progressID)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
		// 不返回错误响应，因为客户端已经断开
		return
	}

	// 解析 multipart form
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		logger.SFTP.Error("[Upload] %s failed to parse multipart form: %v", progressID, err)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Failed to parse form: "+err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Failed to parse form: " + err.Error()})
		return
	}

	hostIDStr := c.PostForm("host_id")
	path := c.PostForm("path")
	relativePath := c.PostForm("relative_path") // 获取相对路径（文件夹上传时使用）
	hostID := uint(parseInt(hostIDStr))

	logger.SFTP.Debug("[Upload] %s host_id=%d, path=%s, relative_path=%s", progressID, hostID, path, relativePath)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		// 检查是否是客户端取消导致的错误
		if c.Request.Context().Err() != nil {
			logger.SFTP.Debug("[Upload] %s cancelled by client during file receive", progressID)
			services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
			return
		}
		// 更新进度为错误状态
		logger.SFTP.Error("[Upload] %s failed to get file from form: %v", progressID, err)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Failed to receive file: "+err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer file.Close()

	logger.SFTP.Debug("[Upload] %s received file: %s, size: %d", progressID, header.Filename, header.Size)

	// 再次检查客户端是否已断开连接
	if c.Request.Context().Err() != nil {
		logger.SFTP.Debug("[Upload] %s cancelled by client before SFTP transfer", progressID)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
		return
	}

	logger.SFTP.Debug("[Upload] %s connecting to SFTP for host_id=%d", progressID, hostID)
	service, err := services.ConnectSFTP(hostID)
	if err != nil {
		// 更新进度为错误状态
		logger.SFTP.Error("[Upload] %s SFTP connection failed: %v", progressID, err)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "SFTP connection failed: "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 构建远程文件路径
	// 优先使用 relativePath（文件夹上传时传递），否则使用 header.Filename
	fileName := relativePath
	if fileName == "" {
		fileName = header.Filename
	}
	remotePath := path + "/" + fileName
	
	// Debug: 输出文件名信息，帮助排查问题
	logger.SFTP.Debug("[Upload] %s fileName='%s', header.Filename='%s', contains '/': %v", progressID, fileName, header.Filename, strings.Contains(fileName, "/"))
	
	// 如果文件名包含目录路径（文件夹上传），需要先创建目录结构
	if strings.Contains(fileName, "/") {
		dirPath := filepath.Dir(remotePath)
		dirPath = strings.ReplaceAll(dirPath, "\\", "/")
		logger.SFTP.Info("[Upload] %s creating directory structure: %s", progressID, dirPath)
		err = service.CreateDirectory(dirPath)
		if err != nil {
			logger.SFTP.Error("[Upload] %s failed to create directory: %v", progressID, err)
			services.UpdateProgress(progressID, "error", 0, 0, 0, "Failed to create directory: "+err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to create directory: " + err.Error()})
			return
		}
		logger.SFTP.Info("[Upload] %s directory structure created successfully: %s", progressID, dirPath)
	}
	
	// 检查目标路径的磁盘空间
	logger.SFTP.Debug("[Upload] %s checking disk space for path: %s", progressID, path)
	
	diskUsage, err := service.GetDiskUsage(path)
	if err != nil {
		logger.SFTP.Warn("[Upload] %s failed to check disk usage: %v (proceeding anyway)", progressID, err)
		// 如果无法获取磁盘使用情况，继续上传（降级处理）
	} else {
		// 解析使用率百分比（去掉 % 符号）
		usagePercent := diskUsage.Percent
		if len(usagePercent) > 0 && usagePercent[len(usagePercent)-1] == '%' {
			usagePercent = usagePercent[:len(usagePercent)-1]
		}
		
		// 检查磁盘使用率是否超过 90%
		var usageValue int
		for _, c := range usagePercent {
			if c >= '0' && c <= '9' {
				usageValue = usageValue*10 + int(c-'0')
			}
		}
		
		logger.SFTP.Debug("[Upload] %s disk usage: %s%%, available: %s, required: %s", 
			progressID, diskUsage.Percent, diskUsage.Available, formatSize(header.Size))
		
		if usageValue >= 90 {
			errorMsg := "Insufficient disk space"
			logger.SFTP.Warn("[Upload] %s rejected: disk usage %s%% >= 90%%", progressID, diskUsage.Percent)
			services.UpdateProgress(progressID, "error", 0, 0, 0, errorMsg)
			c.JSON(http.StatusInsufficientStorage, gin.H{
				"success": false, 
				"error": errorMsg,
				"error_code": "DISK_SPACE_THRESHOLD_EXCEEDED",
				"file_info": gin.H{
					"name":           header.Filename,
					"size_bytes":      header.Size,
					"size_formatted": formatSize(header.Size),
				},
				"disk_info": gin.H{
					"used_bytes":      diskUsage.Used,
					"available_bytes": diskUsage.Available,
					"total_bytes":     diskUsage.Total,
					"usage_percent":   diskUsage.Percent,
					"used_formatted":  formatSize(diskUsage.Used),
					"available_formatted": formatSize(diskUsage.Available),
					"total_formatted": formatSize(diskUsage.Total),
					"threshold":       "90%",
				},
			})
			return
		}
		
		// 检查是否有足够的可用空间（预留 100MB）
		requiredSpace := header.Size + 100*1024*1024
		if diskUsage.Available < requiredSpace {
			errorMsg := "Insufficient disk space"
			logger.SFTP.Warn("[Upload] %s rejected: insufficient space (required: %s, available: %s)", 
				progressID, formatSize(header.Size), diskUsage.Available)
			services.UpdateProgress(progressID, "error", 0, 0, 0, errorMsg)
			c.JSON(http.StatusInsufficientStorage, gin.H{
				"success": false, 
				"error": errorMsg,
				"error_code": "DISK_SPACE_INSUFFICIENT",
				"file_info": gin.H{
					"name":           header.Filename,
					"size_bytes":      header.Size,
					"size_formatted": formatSize(header.Size),
				},
				"disk_info": gin.H{
					"used_bytes":      diskUsage.Used,
					"available_bytes": diskUsage.Available,
					"total_bytes":     diskUsage.Total,
					"usage_percent":   diskUsage.Percent,
					"used_formatted":  formatSize(diskUsage.Used),
					"available_formatted": formatSize(diskUsage.Available),
					"total_formatted": formatSize(diskUsage.Total),
				},
			})
			return
		}
	}
	
	logger.SFTP.Debug("[Upload] %s starting transfer to %s", progressID, remotePath)
	
	err = service.UploadFile(file, remotePath, header.Size, progressID)
	if err != nil {
		// 检查是否是客户端取消导致的错误
		if c.Request.Context().Err() != nil {
			logger.SFTP.Debug("[Upload] %s cancelled by client during transfer", progressID)
			services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
			return
		}
		logger.SFTP.Error("[Upload] %s transfer failed: %v", progressID, err)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Transfer failed: "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	logger.SFTP.Info("[Upload] %s completed: %s -> %s (%d bytes)", progressID, header.Filename, remotePath, header.Size)
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Upload completed",
		"progress_id": progressID,
	})
}

// sftpRead 读取文件内容
func sftpRead(c *gin.Context) {
	var input struct {
		HostID  uint   `json:"host_id"`
		Path    string `json:"path"`
		MaxSize int64  `json:"max_size"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if input.MaxSize == 0 {
		input.MaxSize = 1024 * 1024 // 默认 1MB
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	content, err := service.GetFileContent(input.Path, input.MaxSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "content": content})
}

// sftpWrite 写入文件内容
func sftpWrite(c *gin.Context) {
	var input struct {
		HostID  uint   `json:"host_id"`
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	err = service.WriteFileContent(input.Path, input.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "File saved"})
}

// sftpProgress 获取传输进度
func sftpProgress(c *gin.Context) {
	id := c.Param("id")
	progress := services.GetProgress(id)
	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Progress not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "progress": progress})
}

// sftpDownloadProgress 获取下载进度
func sftpDownloadProgress(c *gin.Context) {
	id := c.Param("id")
	progress := services.GetProgress(id)
	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Progress not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "progress": progress})
}

// sftpUploadProgress 获取上传进度
func sftpUploadProgress(c *gin.Context) {
	id := c.Param("id")
	progress := services.GetProgress(id)
	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Progress not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "progress": progress})
}

// sftpDiskUsage 获取磁盘使用情况
func sftpDiskUsage(c *gin.Context) {
	var input struct {
		HostID uint   `json:"host_id"`
		Path   string `json:"path"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	usage, err := service.GetDiskUsage(input.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"filesystem":     "",
		"size":           formatSize(usage.Total),
		"used":           formatSize(usage.Used),
		"available":      formatSize(usage.Available),
		"use_percentage": usage.Percent,
	})
}

// sftpDownloadFolder 下载文件夹
func sftpDownloadFolder(c *gin.Context) {
	var input struct {
		HostID     uint   `json:"host_id"`
		Path       string `json:"path"`
		DownloadID string `json:"download_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 预先创建进度记录，避免前端轮询时 404
	if input.DownloadID != "" {
		services.UpdateProgress(input.DownloadID, "init", 0, 0, 0, "Preparing folder download...")
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		// 更新进度为错误状态
		if input.DownloadID != "" {
			services.UpdateProgress(input.DownloadID, "error", 0, 0, 0, "SFTP connection failed: "+err.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取文件夹名
	foldername := input.Path
	for i := len(input.Path) - 1; i >= 0; i-- {
		if input.Path[i] == '/' {
			foldername = input.Path[i+1:]
			break
		}
	}

	// 设置响应头 - 使用 RFC 5987 编码文件名，支持特殊字符和空格
	zipFilename := foldername + ".zip"
	encodedFilename := url.QueryEscape(zipFilename)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"; filename*=UTF-8''%s", zipFilename, encodedFilename))
	c.Header("Content-Type", "application/zip")

	// 流式下载文件夹（作为 zip）
	err = service.DownloadFolder(input.Path, c.Writer, input.DownloadID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
}

// formatSize 格式化字节大小
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