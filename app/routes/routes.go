package routes

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/middleware"
	"deploy-master/models"
	"deploy-master/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// SetupRouter 设置路由
func SetupRouter() *gin.Engine {
	// 设置为发布模式，禁用 Gin 默认调试日志
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()

	// 禁用默认日志
	router.Use(gin.Recovery())

	// 使用自定义日志中间件
	router.Use(middleware.Logger(middleware.LoggerConfig{
		SkipPaths: []string{"/api/health"},
	}))

	// CORS 配置
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API 路由组
	api := router.Group("/api")
	{
		// 健康检查
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		// 主机管理
		api.GET("/hosts", getHosts)
		api.GET("/hosts/stats", getHostStats)
		api.GET("/hosts/search", searchHosts)
		api.GET("/hosts/:id", getHost)
		api.POST("/hosts", createHost)
		api.PUT("/hosts/:id", updateHost)
		api.DELETE("/hosts/:id", deleteHost)
		api.POST("/hosts/:id/connect", connectHost)
		api.POST("/hosts/:id/disconnect", disconnectHost)
		api.POST("/hosts/:id/test", testHostConnection)
		api.POST("/hosts/:id/execute", executeCommand)
		api.POST("/hosts/:id/system-info", getSystemInfo)
		api.POST("/hosts/:id/hardware-info", getHardwareInfo)

		// SSH 密钥管理
		api.GET("/keys", getKeys)
		api.GET("/keys/:id", getKey)
		api.POST("/keys", createKey)
		api.PUT("/keys/:id", updateKey)
		api.DELETE("/keys/:id", deleteKey)
		api.POST("/keys/generate", generateKey)

		// SFTP 文件管理
		api.POST("/sftp/connect", sftpConnect)
		api.POST("/sftp/disconnect", sftpDisconnect)
		api.POST("/sftp/list", sftpList)
		api.POST("/sftp/download", sftpDownload)
		api.GET("/sftp/download-progress/:id", sftpDownloadProgress)
		api.POST("/sftp/upload", sftpUpload)
		api.GET("/sftp/upload-progress/:id", sftpUploadProgress)
		api.POST("/sftp/mkdir", sftpMkdir)
		api.POST("/sftp/remove", sftpDelete)
		api.POST("/sftp/delete", sftpDelete)
		api.POST("/sftp/rename", sftpRename)
		api.POST("/sftp/read", sftpRead)
		api.POST("/sftp/write", sftpWrite)
		api.POST("/sftp/disk-usage", sftpDiskUsage)
		api.POST("/sftp/download-folder", sftpDownloadFolder)
		api.GET("/sftp/progress/:id", sftpProgress)

		// WebSocket 终端
		api.GET("/terminal/:id", terminalHandler)
	}

	return router
}

// 主机管理处理器

func getHosts(c *gin.Context) {
	hosts, err := database.GetAllHosts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 为每个主机添加连接状态
	type HostResponse struct {
		models.Host
		Status string `json:"status"`
	}

	var response []HostResponse
	for _, host := range hosts {
		status := "disconnected"
		if _, exists := config.Pool.Get(host.ID); exists {
			status = "connected"
		}

		// 设置 auth_type
		if host.KeyID != nil {
			host.AuthType = "key"
		} else {
			host.AuthType = "password"
		}

		response = append(response, HostResponse{
			Host:   host,
			Status: status,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func getHost(c *gin.Context) {
	id := c.Param("id")
	var host models.Host
	if err := database.DB.First(&host, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Host not found"})
		return
	}
	// 设置 auth_type
	if host.KeyID != nil {
		host.AuthType = "key"
	} else {
		host.AuthType = "password"
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": host})
}

// CreateHostRequest 创建主机请求
type CreateHostRequest struct {
	Name        string `json:"name"`
	Address     string `json:"address"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	AuthType    string `json:"auth_type"`
	Password    string `json:"password"`
	PrivateKey  string `json:"private_key"`
	KeyPassphrase string `json:"key_passphrase"`
	Group       string `json:"group"`
	Description string `json:"description"`
}

// UpdateHostRequest 更新主机请求
type UpdateHostRequest struct {
	Name        string `json:"name"`
	Address     string `json:"address"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	AuthType    string `json:"auth_type"`
	Password    string `json:"password"`
	PrivateKey  string `json:"private_key"`
	KeyPassphrase string `json:"key_passphrase"`
	Group       string `json:"group"`
	Description string `json:"description"`
}

func createHost(c *gin.Context) {
	var req CreateHostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 验证必填字段
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "name is required"})
		return
	}
	if req.Address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "address is required"})
		return
	}
	if req.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "username is required"})
		return
	}

	// 创建主机模型
	host := models.Host{
		HostID:      generateHostID(),
		Name:        req.Name,
		Host:        req.Address,
		Port:        req.Port,
		User:        req.Username,
		Group:       req.Group,
		Description: req.Description,
	}

	// 设置默认端口
	if host.Port == 0 {
		host.Port = 22
	}

	// 处理认证方式
	if req.AuthType == "password" {
		if req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "password is required for password authentication"})
			return
		}
		host.Password = config.EncryptPassword(req.Password)
	} else if req.AuthType == "key" {
		if req.PrivateKey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "private_key is required for key authentication"})
			return
		}
		// PrivateKey 字段存储的是密钥 ID
		keyID := uint(parseInt(req.PrivateKey))
		host.KeyID = &keyID
	}

	if err := database.DB.Create(&host).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 设置 auth_type
	if host.KeyID != nil {
		host.AuthType = "key"
	} else {
		host.AuthType = "password"
	}

	// 自动连接主机并获取系统信息
	go autoConnectAndGetInfo(host)

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": host})
}

// autoConnectAndGetInfo 自动连接主机并获取系统信息
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
			log.Printf("[AutoConnect] Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			log.Printf("[AutoConnect] Loaded key (key_id=%d, name=%s)", *host.KeyID, key.Name)
		}
	}

	// 尝试连接
	hostID := host.ID
	_, err := config.Pool.Connect(hostID, host.Host, host.Port, host.User, password, key)
	if err != nil {
		log.Printf("[AutoConnect] Failed to connect to host %s (%s): %v", host.Name, host.Host, err)
		return
	}

	log.Printf("[AutoConnect] Successfully connected to host %s (%s), fetching system info...", host.Name, host.Host)

	// 获取系统信息并更新数据库
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

	// 保存更新
	if err := database.DB.Save(&host).Error; err != nil {
		log.Printf("[AutoConnect] Failed to save host info: %v", err)
	} else {
		log.Printf("[AutoConnect] Successfully updated host %s with system info", host.Name)
	}
}

func updateHost(c *gin.Context) {
	id := c.Param("id")
	var host models.Host
	if err := database.DB.First(&host, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Host not found"})
		return
	}

	var req UpdateHostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 更新字段
	if req.Name != "" {
		host.Name = req.Name
	}
	if req.Address != "" {
		host.Host = req.Address
	}
	if req.Port != 0 {
		host.Port = req.Port
	}
	if req.Username != "" {
		host.User = req.Username
	}

	// 处理认证方式切换
	if req.AuthType == "password" {
		// 切换到密码认证模式
		host.KeyID = nil // 清除密钥
		// 只有在提供了新密码时才更新密码，否则保持原密码不变
		if req.Password != "" {
			host.Password = config.EncryptPassword(req.Password)
		}
		// 注意：如果密码为空字符串，保持原有密码不变（编辑模式时留空表示不修改密码）
	} else if req.AuthType == "key" {
		// 切换到密钥认证模式
		host.Password = "" // 清除密码
		// 只有在提供了新密钥时才更新密钥
		if req.PrivateKey != "" {
			keyID := uint(parseInt(req.PrivateKey))
			host.KeyID = &keyID
		}
		// 如果private_key为空字符串，表示要清除密钥（从password切换到key但没有提供密钥）
		if req.PrivateKey == "" {
			host.KeyID = nil
		}
	} else {
		// 如果没有指定auth_type，保持原有认证方式，但允许更新凭证
		if req.Password != "" {
			host.Password = config.EncryptPassword(req.Password)
			host.KeyID = nil
		}
		if req.PrivateKey != "" {
			keyID := uint(parseInt(req.PrivateKey))
			host.KeyID = &keyID
			host.Password = ""
		}
	}

	if req.Group != "" {
		host.Group = req.Group
	}
	if req.Description != "" {
		host.Description = req.Description
	}

	if err := database.DB.Save(&host).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 设置 auth_type
	if host.KeyID != nil {
		host.AuthType = "key"
	} else {
		host.AuthType = "password"
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": host})
}

func deleteHost(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Host{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Host deleted"})
}

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
			log.Printf("[SSH] Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			log.Printf("[SSH] Loaded key (key_id=%d, name=%s, has_private_key=%v)",
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
	systemInfo, _ := services.GetSystemInfo(hostID)
	hardwareInfo, _ := services.GetHardwareInfo(hostID)

	if systemInfo != nil {
		host.SystemType = "linux"
		host.OSKey = systemInfo.Distro
		host.OSVersion = systemInfo.Version // 完整版本号（包含小版本号）
		host.KernelVersion = systemInfo.Kernel
		host.Architecture = "x86_64" // 默认值，后续可通过命令获取

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

func disconnectHost(c *gin.Context) {
	id := c.Param("id")
	hostID := uint(parseInt(id))
	config.Pool.Disconnect(hostID)
	services.DisconnectSFTP(hostID)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Disconnected"})
}

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

// SSH 密钥管理处理器

func getKeys(c *gin.Context) {
	keys, err := database.GetAllKeys()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// 返回简化版的密钥列表（不包含私钥内容）
	type KeyResponse struct {
		ID        uint   `json:"id"`
		Name      string `json:"name"`
		Type      string `json:"type"`
		PublicKey string `json:"public_key"`
		Comment   string `json:"comment"`
	}
	var response []KeyResponse
	for _, key := range keys {
		response = append(response, KeyResponse{
			ID:        key.ID,
			Name:      key.Name,
			Type:      key.Type,
			PublicKey: key.PublicKey,
			Comment:   key.Comment,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": response})
}

func getKey(c *gin.Context) {
	id := c.Param("id")
	var key models.SSHKey
	if err := database.DB.First(&key, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key not found"})
		return
	}
	c.JSON(http.StatusOK, key)
}

func createKey(c *gin.Context) {
	var key models.SSHKey
	if err := c.ShouldBindJSON(&key); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if err := database.DB.Create(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": key})
}

func updateKey(c *gin.Context) {
	id := c.Param("id")
	var key models.SSHKey
	if err := database.DB.First(&key, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key not found"})
		return
	}

	var input models.SSHKey
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key.Name = input.Name
	key.Type = input.Type
	key.PrivateKey = input.PrivateKey
	key.Passphrase = input.Passphrase

	if err := database.DB.Save(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, key)
}

func deleteKey(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.SSHKey{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Key deleted"})
}

func generateKey(c *gin.Context) {
	var input struct {
		Name       string `json:"name"`
		Type       string `json:"type"`
		Bits       int    `json:"bits"`
		Passphrase string `json:"passphrase"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if input.Type == "" {
		input.Type = "rsa"
	}
	if input.Bits == 0 {
		input.Bits = 4096
	}

	privateKey, publicKey, err := config.GenerateSSHKey(input.Type, input.Bits, input.Passphrase)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 保存到数据库
	key := models.SSHKey{
		Name:       input.Name,
		Type:       input.Type,
		PrivateKey: privateKey,
		PublicKey:  publicKey,
		Passphrase: input.Passphrase,
	}
	if err := database.DB.Create(&key).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"id":          key.ID,
		"name":        key.Name,
		"type":        key.Type,
		"public_key":  publicKey,
	})
}

// SFTP 处理器

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

func sftpDisconnect(c *gin.Context) {
	var input struct {
		HostID uint `json:"host_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	services.DisconnectSFTP(input.HostID)
	c.JSON(http.StatusOK, gin.H{"message": "SFTP disconnected"})
}

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

func sftpUpload(c *gin.Context) {
	hostID := uint(parseInt(c.PostForm("host_id")))
	path := c.PostForm("path")
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer file.Close()

	service, err := services.ConnectSFTP(hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 生成进度ID
	progressID := generateID()

	remotePath := path + "/" + header.Filename
	err = service.UploadFile(file, remotePath, header.Size, progressID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Upload completed",
		"progress_id": progressID,
	})
}

func sftpMkdir(c *gin.Context) {
	var input struct {
		HostID uint   `json:"host_id"`
		Path   string `json:"path"`
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

	err = service.CreateDirectory(input.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Directory created"})
}

func sftpDelete(c *gin.Context) {
	var input struct {
		HostID     uint   `json:"host_id"`
		Path       string `json:"path"`
		IsDir      bool   `json:"is_dir"`
		Recursive  bool   `json:"recursive"`
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

	if input.IsDir {
		err = service.DeleteDirectory(input.Path, input.Recursive)
	} else {
		err = service.DeleteFile(input.Path)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func sftpRename(c *gin.Context) {
	var input struct {
		HostID  uint   `json:"host_id"`
		OldPath string `json:"old_path"`
		NewPath string `json:"new_path"`
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

	err = service.Rename(input.OldPath, input.NewPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Renamed"})
}

func sftpRead(c *gin.Context) {
	var input struct {
		HostID  uint   `json:"host_id"`
		Path    string `json:"path"`
		MaxSize int64  `json:"max_size"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.MaxSize == 0 {
		input.MaxSize = 1024 * 1024 // 默认 1MB
	}

	service, err := services.ConnectSFTP(input.HostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	content, err := service.GetFileContent(input.Path, input.MaxSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": content})
}

func sftpWrite(c *gin.Context) {
	var input struct {
		HostID  uint   `json:"host_id"`
		Path    string `json:"path"`
		Content string `json:"content"`
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

	err = service.WriteFileContent(input.Path, input.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File saved"})
}

func sftpProgress(c *gin.Context) {
	id := c.Param("id")
	progress := services.GetProgress(id)
	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Progress not found"})
		return
	}
	c.JSON(http.StatusOK, progress)
}

// 辅助函数

func parseInt(s string) int {
	var n int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}

func generateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = chars[i%len(chars)]
	}
	return string(b)
}

// generateHostID 生成主机ID，格式：ins-8位随机字符
func generateHostID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 8)
	rand.Read(b)
	for i := range b {
		b[i] = chars[b[i]%byte(len(chars))]
	}
	return "ins-" + string(b)
}

// getHostStats 获取主机统计信息
func getHostStats(c *gin.Context) {
	var total, connected int

	hosts, err := database.GetAllHosts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	total = len(hosts)
	for _, host := range hosts {
		if _, exists := config.Pool.Get(host.ID); exists {
			connected++
		}
	}

	// 获取密钥数量
	var keyCount int64
	database.DB.Model(&models.SSHKey{}).Count(&keyCount)

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"data": gin.H{
			"total":        total,
			"online":       connected,
			"offline":      total - connected,
			"key_count":    keyCount,
		},
	})
}

// searchHosts 搜索主机
func searchHosts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		hosts, _ := database.GetAllHosts()
		c.JSON(http.StatusOK, gin.H{"success": true, "data": hosts})
		return
	}
	
	var hosts []models.Host
	database.DB.Where("name LIKE ? OR host LIKE ? OR description LIKE ?",
		"%"+query+"%", "%"+query+"%", "%"+query+"%").Find(&hosts)
	
	c.JSON(http.StatusOK, gin.H{"success": true, "data": hosts})
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
			log.Printf("[SSH] Failed to load key (key_id=%d): %v", *host.KeyID, err)
			key = nil
		} else {
			log.Printf("[SSH] Loaded key (key_id=%d, name=%s, has_private_key=%v)",
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

	log.Printf("[TestConnection] Successfully connected to host %s (%s), fetching system info...", host.Name, host.Host)

	// 获取系统信息并更新数据库
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

	// 保存更新
	if err := database.DB.Save(&host).Error; err != nil {
		log.Printf("[TestConnection] Failed to save host info: %v", err)
	} else {
		log.Printf("[TestConnection] Successfully updated host %s with system info", host.Name)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection successful",
	})
}

// sftpDownloadProgress 获取下载进度
func sftpDownloadProgress(c *gin.Context) {
	id := c.Param("id")
	progress := services.GetProgress(id)
	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Progress not found"})
		return
	}
	c.JSON(http.StatusOK, progress)
}

// sftpUploadProgress 获取上传进度
func sftpUploadProgress(c *gin.Context) {
	id := c.Param("id")
	progress := services.GetProgress(id)
	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Progress not found"})
		return
	}
	c.JSON(http.StatusOK, progress)
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

// sftpDownloadFolder 下载文件夹
func sftpDownloadFolder(c *gin.Context) {
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
}