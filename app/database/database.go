package database

import (
	"fmt"
	"os"
	"path/filepath"

	"deploy-master/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库
func InitDB() {
	// 确保数据目录存在
	dataDir := "data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		fmt.Printf("  \033[31m✗\033[0m Failed to create data directory: %v\n", err)
		os.Exit(1)
	}

	dbPath := filepath.Join(dataDir, "deploy_master.db")
	
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // 禁用 GORM 日志
	})
	if err != nil {
		fmt.Printf("  \033[31m✗\033[0m Failed to connect database: %v\n", err)
		os.Exit(1)
	}

	// 自动迁移
	if err := DB.AutoMigrate(&models.Host{}, &models.SSHKey{}, &models.TransferRecord{}); err != nil {
		fmt.Printf("  \033[31m✗\033[0m Failed to migrate database: %v\n", err)
		os.Exit(1)
	}
}

// GetAllHosts 获取所有主机
func GetAllHosts() ([]models.Host, error) {
	var hosts []models.Host
	result := DB.Find(&hosts)
	return hosts, result.Error
}

// GetHostByID 根据ID获取主机
func GetHostByID(id uint) (*models.Host, error) {
	var host models.Host
	result := DB.First(&host, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &host, nil
}

// CreateHost 创建主机
func CreateHost(host *models.Host) error {
	return DB.Create(host).Error
}

// UpdateHost 更新主机
func UpdateHost(host *models.Host) error {
	return DB.Save(host).Error
}

// DeleteHost 删除主机
func DeleteHost(id uint) error {
	return DB.Delete(&models.Host{}, id).Error
}

// GetAllKeys 获取所有密钥
func GetAllKeys() ([]models.SSHKey, error) {
	var keys []models.SSHKey
	result := DB.Find(&keys)
	return keys, result.Error
}

// GetKeyByID 根据ID获取密钥
func GetKeyByID(id uint) (*models.SSHKey, error) {
	var key models.SSHKey
	result := DB.First(&key, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &key, nil
}

// CreateKey 创建密钥
func CreateKey(key *models.SSHKey) error {
	return DB.Create(key).Error
}

// UpdateKey 更新密钥
func UpdateKey(key *models.SSHKey) error {
	return DB.Save(key).Error
}

// DeleteKey 删除密钥
func DeleteKey(id uint) error {
	return DB.Delete(&models.SSHKey{}, id).Error
}

// MigrateFromPython 从 Python 数据库迁移数据
func MigrateFromPython(pythonDbPath string) error {
	// TODO: 实现从 Python SQLite 数据库迁移数据的逻辑
	return nil
}

// ==================== 传输记录操作 ====================

// CreateTransferRecord 创建传输记录
func CreateTransferRecord(record *models.TransferRecord) error {
	return DB.Create(record).Error
}

// UpdateTransferRecord 更新传输记录
func UpdateTransferRecord(record *models.TransferRecord) error {
	return DB.Save(record).Error
}

// GetTransferRecordByID 根据ID获取传输记录
func GetTransferRecordByID(id uint) (*models.TransferRecord, error) {
	var record models.TransferRecord
	result := DB.First(&record, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &record, nil
}

// GetTransferRecordByTransferID 根据TransferID获取传输记录
func GetTransferRecordByTransferID(transferID string) (*models.TransferRecord, error) {
	var record models.TransferRecord
	result := DB.Where("transfer_id = ?", transferID).First(&record)
	if result.Error != nil {
		return nil, result.Error
	}
	return &record, nil
}

// GetAllTransferRecords 获取所有传输记录
func GetAllTransferRecords(limit int, offset int) ([]models.TransferRecord, int64, error) {
	var records []models.TransferRecord
	var total int64
	
	DB.Model(&models.TransferRecord{}).Count(&total)
	
	result := DB.Order("created_at DESC").Limit(limit).Offset(offset).Find(&records)
	if result.Error != nil {
		return nil, 0, result.Error
	}
	return records, total, nil
}

// GetTransferRecordsByHostID 根据主机ID获取传输记录
func GetTransferRecordsByHostID(hostID uint, limit int) ([]models.TransferRecord, error) {
	var records []models.TransferRecord
	result := DB.Where("host_id = ?", hostID).Order("created_at DESC").Limit(limit).Find(&records)
	return records, result.Error
}

// GetActiveTransferRecords 获取活动的传输记录（未完成的）
func GetActiveTransferRecords() ([]models.TransferRecord, error) {
	var records []models.TransferRecord
	result := DB.Where("status IN ?", []string{"pending", "transferring"}).Order("created_at DESC").Find(&records)
	return records, result.Error
}

// DeleteTransferRecord 删除传输记录
func DeleteTransferRecord(id uint) error {
	return DB.Delete(&models.TransferRecord{}, id).Error
}

// ClearCompletedTransferRecords 清除已完成的传输记录
func ClearCompletedTransferRecords() error {
	return DB.Where("status IN ?", []string{"completed", "failed", "cancelled"}).Delete(&models.TransferRecord{}).Error
}

// ClearTransferRecordsByType 清除指定类型的已完成传输记录
// transferType: "upload" 或 "download"
func ClearTransferRecordsByType(transferType string) error {
	return DB.Where("type = ? AND status IN ?", transferType, []string{"completed", "failed", "cancelled"}).Delete(&models.TransferRecord{}).Error
}

// ClearAllTransferRecords 清除所有传输记录（包括进行中的）
func ClearAllTransferRecords() error {
	return DB.Where("1 = 1").Delete(&models.TransferRecord{}).Error
}