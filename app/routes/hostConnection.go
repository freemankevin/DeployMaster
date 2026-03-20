package routes

import (
	"encoding/json"
	"net/http"
	"strings"

	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/models"
	"deploy-master/pkg/logger"
	"deploy-master/services"

	"github.com/gin-gonic/gin"
)

// connectHost 连接主机
func connectHost(c *gin.Context) {
	id := c.Param("id")
	var host models.Host
	if err := database.DB.First(&host, id).Error; err != nil {
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
			logger.SSH.Warn("Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			logger.SSH.Debug("Loaded key (key_id=%d, name=%s, has_private_key=%v)",
				*host.KeyID, key.Name, key.PrivateKey != "")
		}
	}

	// 连接
	hostID := uint(parseInt(id))
	conn, err := config.Pool.Connect(hostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取系统信息并更新数据库
	updateHostSystemInfo(&host, hostID)

	// 保存更新
	database.DB.Save(&host)

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Connected",
		"host_id":     hostID,
		"connected":   true,
		"server_info": conn.ServerInfo,
	})
}

// disconnectHost 断开主机连接
func disconnectHost(c *gin.Context) {
	id := c.Param("id")
	hostID := uint(parseInt(id))
	config.Pool.Disconnect(hostID)
	services.DisconnectSFTP(hostID)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Disconnected"})
}

// executeCommand 执行命令
func executeCommand(c *gin.Context) {
	id := c.Param("id")
	hostID := uint(parseInt(id))

	var input struct {
		Command string `json:"command"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	output, err := config.Pool.ExecuteCommand(hostID, input.Command)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"output": output})
}

// getSystemInfo 获取系统信息
func getSystemInfo(c *gin.Context) {
	id := c.Param("id")
	hostID := uint(parseInt(id))

	info, err := services.GetSystemInfo(hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, info)
}

// getHardwareInfo 获取硬件信息
func getHardwareInfo(c *gin.Context) {
	id := c.Param("id")
	hostID := uint(parseInt(id))

	info, err := services.GetHardwareInfo(hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, info)
}

// testHostConnection 测试主机连接
func testHostConnection(c *gin.Context) {
	id := c.Param("id")
	var host models.Host
	if err := database.DB.First(&host, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host not found", "success": false})
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
			logger.SSH.Warn("Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			logger.SSH.Debug("Loaded key (key_id=%d, name=%s, has_private_key=%v)",
				*host.KeyID, key.Name, key.PrivateKey != "")
		}
	}

	// 尝试连接
	hostID := uint(parseInt(id))
	_, err := config.Pool.Connect(hostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	logger.TestConnection.Info("Successfully connected to host %s (%s), fetching system info...", host.Name, host.Host)

	// 获取系统信息并更新数据库
	updateHostSystemInfo(&host, hostID)

	// 保存更新
	if err := database.DB.Save(&host).Error; err != nil {
		logger.TestConnection.Error("Failed to save host info: %v", err)
	} else {
		logger.TestConnection.Info("Successfully updated host %s with system info", host.Name)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection successful",
	})
}

// autoConnectAndGetInfo 自动连接主机并获取系统信息（异步版本，用于后台更新）
func autoConnectAndGetInfo(host models.Host) {
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
			logger.AutoConnect.Warn("Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			logger.AutoConnect.Debug("Loaded key (key_id=%d, name=%s)", *host.KeyID, key.Name)
		}
	}

	// 尝试连接
	hostID := host.ID
	_, err := config.Pool.Connect(hostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		logger.AutoConnect.Error("Failed to connect to host %s (%s): %v", host.Name, host.Host, err)
		return
	}

	logger.AutoConnect.Info("Successfully connected to host %s (%s), fetching system info...", host.Name, host.Host)

	// 更新主机系统信息
	updateHostSystemInfo(&host, hostID)

	// 保存更新
	if err := database.DB.Save(&host).Error; err != nil {
		logger.AutoConnect.Error("Failed to save host info: %v", err)
	} else {
		logger.AutoConnect.Info("Successfully updated host %s with system info", host.Name)
	}
}

// connectAndGetInfoSync 同步连接主机并获取系统信息（用于创建主机时立即返回完整信息）
func connectAndGetInfoSync(host *models.Host) {
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
			logger.ConnectSync.Warn("Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			logger.ConnectSync.Debug("Loaded key (key_id=%d, name=%s)", *host.KeyID, key.Name)
		}
	}

	// 尝试连接
	hostID := host.ID
	_, err := config.Pool.Connect(hostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		logger.ConnectSync.Error("Failed to connect to host %s (%s): %v", host.Name, host.Host, err)
		return
	}

	logger.ConnectSync.Info("Successfully connected to host %s (%s), fetching system info...", host.Name, host.Host)

	// 更新主机系统信息
	updateHostSystemInfo(host, hostID)

	// 保存更新
	if err := database.DB.Save(host).Error; err != nil {
		logger.ConnectSync.Error("Failed to save host info: %v", err)
	} else {
		logger.ConnectSync.Info("Successfully updated host %s with system info", host.Name)
	}
}

// updateHostSystemInfo 更新主机系统信息
func updateHostSystemInfo(host *models.Host, hostID uint) {
	systemInfo, _ := services.GetSystemInfo(hostID)
	hardwareInfo, _ := services.GetHardwareInfo(hostID)

	if systemInfo != nil {
		host.SystemType = "linux"
		host.OSKey = systemInfo.Distro
		host.OSVersion = systemInfo.Version
		host.KernelVersion = systemInfo.Kernel
		host.Architecture = "x86_64"

		// 获取架构
		if arch, err := config.Pool.ExecuteCommand(hostID, "uname -m"); err == nil {
			host.Architecture = strings.TrimSpace(arch)
		}
	}

	if hardwareInfo != nil {
		host.CPUCores = hardwareInfo.CPU.Cores
		// 内存转换为 GB
		host.MemoryGB = int(hardwareInfo.Memory.Total / 1024 / 1024 / 1024)

		// 保存所有磁盘信息为JSON
		var diskList []models.DiskInfoJSON
		for _, disk := range hardwareInfo.Disks {
			diskList = append(diskList, models.DiskInfoJSON{
				Device:     disk.Device,
				MountPoint: disk.MountPoint,
				Total:      int(disk.Total / 1024 / 1024 / 1024),
				Used:       int(disk.Used / 1024 / 1024 / 1024),
				Free:       int(disk.Free / 1024 / 1024 / 1024),
				Usage:      disk.Usage,
			})
		}
		if len(diskList) > 0 {
			if diskJSON, err := json.Marshal(diskList); err == nil {
				host.Disks = diskJSON
			}
		}
	}
}