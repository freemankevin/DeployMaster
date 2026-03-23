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
			logger.SSH.Warn("[%s] Failed to load key (key_id=%d): %v", host.HostID, *host.KeyID, err)
			key = nil
		} else {
			logger.SSH.Debug("[%s] Loaded key (key_id=%d, name=%s, has_private_key=%v)",
				host.HostID, *host.KeyID, key.Name, key.PrivateKey != "")
		}
	}

	// 连接
	hostID := uint(parseInt(id))
	conn, err := config.Pool.Connect(hostID, host.HostID, host.Host, host.Port, host.User, password, key)
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
		"host_id":     host.HostID,
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
			logger.SSH.Warn("[%s] Failed to load key (key_id=%d): %v", host.HostID, *host.KeyID, err)
			key = nil
		} else {
			logger.SSH.Debug("[%s] Loaded key (key_id=%d, name=%s, has_private_key=%v)",
				host.HostID, *host.KeyID, key.Name, key.PrivateKey != "")
		}
	}

	// 尝试连接
	hostID := uint(parseInt(id))
	_, err := config.Pool.Connect(hostID, host.HostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	logger.TestConnection.Info("[%s] Successfully connected to host %s (%s), fetching system info...", host.HostID, host.Name, host.Host)

	// 获取系统信息并更新数据库
	updateHostSystemInfo(&host, hostID)

	// 保存更新
	if err := database.DB.Save(&host).Error; err != nil {
		logger.TestConnection.Error("[%s] Failed to save host info: %v", host.HostID, err)
	} else {
		logger.TestConnection.Info("[%s] Successfully updated host %s with system info", host.HostID, host.Name)
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
			logger.AutoConnect.Warn("[%s] Failed to load key (key_id=%d): %v", host.HostID, *host.KeyID, err)
			key = nil
		} else {
			logger.AutoConnect.Debug("[%s] Loaded key (key_id=%d, name=%s)", host.HostID, *host.KeyID, key.Name)
		}
	}

	// 尝试连接
	hostID := host.ID
	_, err := config.Pool.Connect(hostID, host.HostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		logger.AutoConnect.Error("[%s] Failed to connect to host %s (%s): %v", host.HostID, host.Name, host.Host, err)
		return
	}

	logger.AutoConnect.Info("[%s] Successfully connected to host %s (%s), fetching system info...", host.HostID, host.Name, host.Host)

	// 更新主机系统信息
	updateHostSystemInfo(&host, hostID)

	// 保存更新
	if err := database.DB.Save(&host).Error; err != nil {
		logger.AutoConnect.Error("[%s] Failed to save host info: %v", host.HostID, err)
	} else {
		logger.AutoConnect.Info("[%s] Successfully updated host %s with system info", host.HostID, host.Name)
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
			logger.ConnectSync.Warn("[%s] Failed to load key (key_id=%d): %v", host.HostID, *host.KeyID, err)
			key = nil
		} else {
			logger.ConnectSync.Debug("[%s] Loaded key (key_id=%d, name=%s)", host.HostID, *host.KeyID, key.Name)
		}
	}

	// 尝试连接
	hostID := host.ID
	_, err := config.Pool.Connect(hostID, host.HostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		logger.ConnectSync.Error("[%s] Failed to connect to host %s (%s): %v", host.HostID, host.Name, host.Host, err)
		return
	}

	logger.ConnectSync.Info("[%s] Successfully connected to host %s (%s), fetching system info...", host.HostID, host.Name, host.Host)

	// 更新主机系统信息
	updateHostSystemInfo(host, hostID)

	// 保存更新
	if err := database.DB.Save(host).Error; err != nil {
		logger.ConnectSync.Error("[%s] Failed to save host info: %v", host.HostID, err)
	} else {
		logger.ConnectSync.Info("[%s] Successfully updated host %s with system info", host.HostID, host.Name)
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
		host.OSPrettyName = systemInfo.PrettyName
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
		// Swap 转换为 GB
		host.SwapGB = int(hardwareInfo.Memory.SwapTotal / 1024 / 1024 / 1024)

		// 保存所有磁盘信息为JSON
		var diskList []models.DiskInfoJSON
		for _, disk := range hardwareInfo.Disks {
			diskList = append(diskList, models.DiskInfoJSON{
				Device:       disk.Device,
				PhysicalDisk: disk.PhysicalDisk,
				MountPoint:   disk.MountPoint,
				FileSystem:   disk.FileSystem,
				FSType:       disk.FSType,
				Total:        disk.Total,
				Used:         disk.Used,
				Free:         disk.Free,
				Usage:        disk.Usage,
				Status:       disk.Status,
				IsVirtual:    disk.IsVirtual,
			})
		}
		if len(diskList) > 0 {
			if diskJSON, err := json.Marshal(diskList); err == nil {
				host.Disks = diskJSON
			}
		}
	}
}

// AutoConnectAllHosts 自动连接所有已配置的主机
// 在应用启动时调用，尝试连接数据库中的所有主机
func AutoConnectAllHosts() {
	hosts, err := database.GetAllHosts()
	if err != nil {
		logger.AutoConnect.Error("Failed to get hosts from database: %v", err)
		return
	}

	logger.AutoConnect.Info("Starting auto-connect for %d hosts...", len(hosts))

	for _, host := range hosts {
		go func(h models.Host) {
			// 解密密码
			password := ""
			if h.Password != "" {
				password = config.DecryptPassword(h.Password)
			}

			// 获取密钥
			var key *models.SSHKey
			if h.KeyID != nil {
				key = &models.SSHKey{}
				if err := database.DB.First(key, *h.KeyID).Error; err != nil {
					logger.AutoConnect.Warn("[%s] Failed to load key (key_id=%d): %v", h.HostID, *h.KeyID, err)
					key = nil
				}
			}

			// 尝试连接
			_, err := config.Pool.Connect(h.ID, h.HostID, h.Host, h.Port, h.User, password, key)
			if err != nil {
				logger.AutoConnect.Warn("[%s] Failed to connect to host %s (%s): %v", h.HostID, h.Name, h.Host, err)
				return
			}

			logger.AutoConnect.Info("[%s] Connected to host %s (%s)", h.HostID, h.Name, h.Host)

			// 更新主机系统信息
			updateHostSystemInfo(&h, h.ID)
			database.DB.Save(&h)
		}(host)
	}
}