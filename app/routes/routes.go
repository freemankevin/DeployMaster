package routes

import (
	"net/http"
	"time"

	"deploy-master/middleware"

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

		// 传输记录管理
		api.GET("/transfers", getTransferRecords)
		api.POST("/transfers", createTransferRecord)
		api.PUT("/transfers/:id", updateTransferRecord)
		api.DELETE("/transfers/:id", deleteTransferRecord)
		api.DELETE("/transfers/completed", clearCompletedTransferRecords)

		// WebSocket 终端
		api.GET("/terminal/:id", terminalHandler)
	}

	return router
}