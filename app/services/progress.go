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
			StartTime:  time.Now(),
		}
		progressStore[id] = p
	}

	p.Stage = stage
	p.Progress = progress
	p.BytesTransferred = transferred
	p.TotalBytes = total
	p.Message = message

	// 计算速度（基于已传输字节数和经过的时间）
	if !p.StartTime.IsZero() && time.Since(p.StartTime).Seconds() > 0 {
		elapsed := time.Since(p.StartTime).Seconds()
		speed := float64(transferred) / elapsed
		p.Speed = formatSize(int64(speed)) + "/s"
	}

	// 如果完成，设置结束时间
	if stage == "completed" {
		p.EndTime = time.Now()
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