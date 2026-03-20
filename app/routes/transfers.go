package routes

import (
	"net/http"
	"time"

	"deploy-master/database"
	"deploy-master/models"

	"github.com/gin-gonic/gin"
)

// getTransferRecords 获取传输记录列表
func getTransferRecords(c *gin.Context) {
	limit := 100
	offset := 0

	if l := c.Query("limit"); l != "" {
		limit = parseInt(l)
	}
	if o := c.Query("offset"); o != "" {
		offset = parseInt(o)
	}

	records, total, err := database.GetAllTransferRecords(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
		"total":   total,
	})
}

// createTransferRecord 创建传输记录
func createTransferRecord(c *gin.Context) {
	var input models.TransferRecord
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 设置开始时间
	if input.StartTime.IsZero() {
		input.StartTime = time.Now()
	}

	if err := database.CreateTransferRecord(&input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": input})
}

// updateTransferRecord 更新传输记录
func updateTransferRecord(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		TransferID  string     `json:"transfer_id"`
		Type        string     `json:"type"`
		Filename    string     `json:"filename"`
		RemotePath  string     `json:"remote_path"`
		Size        int64      `json:"size"`
		Transferred int64      `json:"transferred"`
		Status      string     `json:"status"`
		Progress    int        `json:"progress"`
		Speed       string     `json:"speed"`
		Error       string     `json:"error"`
		HostID      uint       `json:"host_id"`
		EndTime     *time.Time `json:"end_time"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	recordID := uint(parseInt(id))
	record, err := database.GetTransferRecordByID(recordID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Transfer record not found"})
		return
	}

	// 更新字段
	if input.TransferID != "" {
		record.TransferID = input.TransferID
	}
	if input.Type != "" {
		record.Type = input.Type
	}
	if input.Filename != "" {
		record.Filename = input.Filename
	}
	if input.RemotePath != "" {
		record.RemotePath = input.RemotePath
	}
	if input.Size > 0 {
		record.Size = input.Size
	}
	if input.Transferred > 0 {
		record.Transferred = input.Transferred
	}
	if input.Status != "" {
		record.Status = input.Status
	}
	if input.Progress > 0 {
		record.Progress = input.Progress
	}
	if input.Speed != "" {
		record.Speed = input.Speed
	}
	if input.Error != "" {
		record.Error = input.Error
	}
	if input.HostID > 0 {
		record.HostID = input.HostID
	}
	if input.EndTime != nil {
		record.EndTime = input.EndTime
	}

	if err := database.UpdateTransferRecord(record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": record})
}

// deleteTransferRecord 删除传输记录
func deleteTransferRecord(c *gin.Context) {
	id := c.Param("id")
	recordID := uint(parseInt(id))

	if err := database.DeleteTransferRecord(recordID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Transfer record deleted"})
}

// clearCompletedTransferRecords 清除已完成的传输记录
func clearCompletedTransferRecords(c *gin.Context) {
	if err := database.ClearCompletedTransferRecords(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Completed transfer records cleared"})
}

// clearTransferRecordsByType 清除指定类型的传输记录
func clearTransferRecordsByType(c *gin.Context) {
	transferType := c.Param("type") // "upload" 或 "download"

	if transferType != "upload" && transferType != "download" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid transfer type. Must be 'upload' or 'download'"})
		return
	}

	if err := database.ClearTransferRecordsByType(transferType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": transferType + " transfer records cleared"})
}

// clearAllTransferRecords 清除所有传输记录
func clearAllTransferRecords(c *gin.Context) {
	if err := database.ClearAllTransferRecords(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "All transfer records cleared"})
}