package routes

import (
	"fmt"
	"log"
	"net/http"

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
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
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

	// 设置响应头
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/octet-stream")

	// 流式下载
	err = service.DownloadFile(input.Path, c.Writer, input.DownloadID)
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

	// 立即创建进度记录，避免前端轮询时 404
	services.UpdateProgress(progressID, "receiving", 0, 0, 0, "Receiving file data...")

	// 检查客户端是否已断开连接（取消上传）
	if c.Request.Context().Err() != nil {
		log.Printf("[SFTP] Upload %s cancelled by client before receiving file", progressID)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
		// 不返回错误响应，因为客户端已经断开
		return
	}

	hostID := uint(parseInt(c.PostForm("host_id")))
	path := c.PostForm("path")
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		// 检查是否是客户端取消导致的错误
		if c.Request.Context().Err() != nil {
			log.Printf("[SFTP] Upload %s cancelled by client during file receive", progressID)
			services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
			return
		}
		// 更新进度为错误状态
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Failed to receive file: "+err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	defer file.Close()

	// 再次检查客户端是否已断开连接
	if c.Request.Context().Err() != nil {
		log.Printf("[SFTP] Upload %s cancelled by client before SFTP transfer", progressID)
		services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
		return
	}

	service, err := services.ConnectSFTP(hostID)
	if err != nil {
		// 更新进度为错误状态
		services.UpdateProgress(progressID, "error", 0, 0, 0, "SFTP connection failed: "+err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	remotePath := path + "/" + header.Filename
	err = service.UploadFile(file, remotePath, header.Size, progressID)
	if err != nil {
		// 检查是否是客户端取消导致的错误
		if c.Request.Context().Err() != nil {
			log.Printf("[SFTP] Upload %s cancelled by client during transfer", progressID)
			services.UpdateProgress(progressID, "error", 0, 0, 0, "Upload cancelled by user")
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

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

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
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

	// 设置响应头
	c.Header("Content-Disposition", "attachment; filename="+foldername+".zip")
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