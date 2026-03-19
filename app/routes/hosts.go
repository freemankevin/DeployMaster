package routes

import (
	"net/http"

	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/models"

	"github.com/gin-gonic/gin"
)

// CreateHostRequest 创建主机请求
type CreateHostRequest struct {
	Name          string `json:"name"`
	Address       string `json:"address"`
	Port          int    `json:"port"`
	Username      string `json:"username"`
	AuthType      string `json:"auth_type"`
	Password      string `json:"password"`
	PrivateKey    string `json:"private_key"`
	KeyPassphrase string `json:"key_passphrase"`
	Group         string `json:"group"`
	Description   string `json:"description"`
}

// UpdateHostRequest 更新主机请求
type UpdateHostRequest struct {
	Name          string `json:"name"`
	Address       string `json:"address"`
	Port          int    `json:"port"`
	Username      string `json:"username"`
	AuthType      string `json:"auth_type"`
	Password      string `json:"password"`
	PrivateKey    string `json:"private_key"`
	KeyPassphrase string `json:"key_passphrase"`
	Group         string `json:"group"`
	Description   string `json:"description"`
}

// getHosts 获取所有主机
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

// getHost 获取单个主机
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

// createHost 创建主机
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

	// 同步连接主机并获取系统信息（等待完成后再返回）
	connectAndGetInfoSync(&host)

	// 构建响应，包含连接状态
	type HostResponse struct {
		models.Host
		Status string `json:"status"`
	}

	// 检查连接池中的状态
	status := "disconnected"
	if _, exists := config.Pool.Get(host.ID); exists {
		status = "connected"
	}

	response := HostResponse{
		Host:   host,
		Status: status,
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": response})
}

// updateHost 更新主机
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

// deleteHost 删除主机
func deleteHost(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Host{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Host deleted"})
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
		"success": true,
		"data": gin.H{
			"total":     total,
			"online":    connected,
			"offline":   total - connected,
			"key_count": keyCount,
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