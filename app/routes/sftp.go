package routes

import (
	"log"
	"net/http"

	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/models"
	"deploy-master/services"

	"github.com/gin-gonic/gin"
)

// sftpConnect 连接SFTP
func sftpConnect(c *gin.Context) {
	var input struct {
		HostID uint `json:"host_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 首先检查 SSH 连接是否存在
	if _, exists := config.Pool.Get(input.HostID); !exists {
		// SSH 连接不存在，需要先建立 SSH 连接
		var host models.Host
		if err := database.DB.First(&host, input.HostID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Host not found"})
			return
		}

		// 解密密码
		password := ""
		if host.Password != "" {
			password = config.DecryptPassword(host.Password)
		}

		// 获取密钥
		var key *models.SSHKey
		if host.KeyID != nil {
			key = &models.SSHKey{}
			if err := database.DB.First(key, *host.KeyID).Error; err != nil {
				log.Printf("[SFTP] Failed to load key (key_id=%d): %v", *host.KeyID, err)
				key = nil
			} else {
				log.Printf("[SFTP] Loaded key (key_id=%d, name=%s)", *host.KeyID, key.Name)
			}
		}

		// 建立 SSH 连接
		_, err := config.Pool.Connect(input.HostID, host.Host, host.Port, host.User, password, key)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "SSH connection failed: " + err.Error()})
			return
		}
		log.Printf("[SFTP] Auto-connected SSH for host %s (host_id=%d)", host.Name, input.HostID)
	}

	_, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "SFTP connected"})
}

// sftpDisconnect 断开SFTP连接
func sftpDisconnect(c *gin.Context) {
	var input struct {
		HostID uint `json:"host_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	services.DisconnectSFTP(input.HostID)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "SFTP disconnected"})
}

// sftpList 列出目录内容
func sftpList(c *gin.Context) {
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

	files, err := service.ListDirectory(input.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"path":    input.Path,
		"files":   files,
	})
}

// sftpMkdir 创建目录
func sftpMkdir(c *gin.Context) {
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

	err = service.CreateDirectory(input.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Directory created"})
}

// sftpDelete 删除文件或目录
func sftpDelete(c *gin.Context) {
	var input struct {
		HostID    uint   `json:"host_id"`
		Path      string `json:"path"`
		IsDir     bool   `json:"is_dir"`
		Recursive bool   `json:"recursive"`
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

	if input.IsDir {
		err = service.DeleteDirectory(input.Path, input.Recursive)
	} else {
		err = service.DeleteFile(input.Path)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Deleted"})
}

// sftpRename 重命名文件或目录
func sftpRename(c *gin.Context) {
	var input struct {
		HostID  uint   `json:"host_id"`
		OldPath string `json:"old_path"`
		NewPath string `json:"new_path"`
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

	err = service.Rename(input.OldPath, input.NewPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Renamed"})
}