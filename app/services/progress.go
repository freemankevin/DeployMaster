package services

import (
	"sync"
	"time"

	"deploy-master/models"
)

// 进度存储
var progressStore = make(map[string]*models.TransferProgress)
var progressMu sync.RWMutex

// UpdateProgress 更新进度
func UpdateProgress(id, stage string, progress int, transferred, total int64, message string) {
	progressMu.Lock()
	defer progressMu.Unlock()

	p, exists := progressStore[id]
	if !exists {
		p = &models.TransferProgress{
			TransferID: id,
		}
		progressStore[id] = p
	}

	p.Stage = stage
	p.Progress = progress
	p.BytesTransferred = transferred
	p.TotalBytes = total
	p.Message = message

	// 计算速度
	if p.Stage == "completed" {
		p.Speed = calculateSpeed(transferred, total, time.Since(time.Time{}))
	}
}

// GetProgress 获取进度
func GetProgress(id string) *models.TransferProgress {
	progressMu.RLock()
	defer progressMu.RUnlock()

	if p, exists := progressStore[id]; exists {
		return p
	}
	return nil
}

// DeleteProgress 删除进度
func DeleteProgress(id string) {
	progressMu.Lock()
	defer progressMu.Unlock()
	delete(progressStore, id)
}

// calculateSpeed 计算速度
func calculateSpeed(transferred, total int64, elapsed time.Duration) string {
	if elapsed.Seconds() == 0 {
		return "0 B/s"
	}
	
	speed := float64(transferred) / elapsed.Seconds()
	return formatSize(int64(speed)) + "/s"
}