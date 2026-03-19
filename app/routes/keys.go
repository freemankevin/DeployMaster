package routes

import (
	"net/http"

	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/models"

	"github.com/gin-gonic/gin"
)

// getKeys 获取所有SSH密钥
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

// getKey 获取单个SSH密钥
func getKey(c *gin.Context) {
	id := c.Param("id")
	var key models.SSHKey
	if err := database.DB.First(&key, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key not found"})
		return
	}
	c.JSON(http.StatusOK, key)
}

// createKey 创建SSH密钥
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

// updateKey 更新SSH密钥
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

// deleteKey 删除SSH密钥
func deleteKey(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.SSHKey{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Key deleted"})
}

// generateKey 生成SSH密钥对
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
		"success":    true,
		"id":         key.ID,
		"name":       key.Name,
		"type":       key.Type,
		"public_key": publicKey,
	})
}