package routes

import (
	"net/http"
	"time"

	"cockpit/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// SetupRouter 设置路由
func SetupRouter(db *gorm.DB) *gin.Engine {
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

	// 静态文件服务 - 头像上传目录
	router.Static("/uploads/avatars", "uploads/avatars")

	// API 路由组
	api := router.Group("/api")
	{
		// 健康检查（公开）
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		// 认证路由（公开）
		AuthRoutes(api, db)

		// 用户管理路由（内部已包含认证检查）
		UserRoutes(api, db)

		// 以下路由需要认证
		protected := api.Group("")
		protected.Use(middleware.JWTAuthMiddleware(db))
		{
			// 主机管理
			protected.GET("/hosts", getHosts)
			protected.GET("/hosts/stats", getHostStats)
			protected.GET("/hosts/search", searchHosts)
			protected.GET("/hosts/:id", getHost)
			protected.POST("/hosts", createHost)
			protected.PUT("/hosts/:id", updateHost)
			protected.DELETE("/hosts/:id", deleteHost)
			protected.POST("/hosts/:id/connect", connectHost)
			protected.POST("/hosts/:id/disconnect", disconnectHost)
			protected.POST("/hosts/:id/test", testHostConnection)
			protected.POST("/hosts/:id/execute", executeCommand)
			protected.POST("/hosts/:id/system-info", getSystemInfo)
			protected.POST("/hosts/:id/hardware-info", getHardwareInfo)

			// SSH 密钥管理
			protected.GET("/keys", getKeys)
			protected.GET("/keys/:id", getKey)
			protected.POST("/keys", createKey)
			protected.PUT("/keys/:id", updateKey)
			protected.DELETE("/keys/:id", deleteKey)
			protected.POST("/keys/generate", generateKey)

			// SFTP 文件管理
			protected.POST("/sftp/connect", sftpConnect)
			protected.POST("/sftp/disconnect", sftpDisconnect)
			protected.POST("/sftp/list", sftpList)
			protected.POST("/sftp/download", sftpDownload)
			protected.GET("/sftp/download-progress/:id", sftpDownloadProgress)
			protected.POST("/sftp/upload", sftpUpload)
			protected.GET("/sftp/upload-progress/:id", sftpUploadProgress)
			protected.POST("/sftp/mkdir", sftpMkdir)
			protected.POST("/sftp/remove", sftpDelete)
			protected.POST("/sftp/delete", sftpDelete)
			protected.POST("/sftp/rename", sftpRename)
			protected.POST("/sftp/read", sftpRead)
			protected.POST("/sftp/write", sftpWrite)
			protected.POST("/sftp/disk-usage", sftpDiskUsage)
			protected.POST("/sftp/download-folder", sftpDownloadFolder)
			protected.GET("/sftp/progress/:id", sftpProgress)

			// 传输记录管理
			protected.GET("/transfers", getTransferRecords)
			protected.POST("/transfers", createTransferRecord)
			protected.PUT("/transfers/:id", updateTransferRecord)
			protected.DELETE("/transfers/:id", deleteTransferRecord)
			protected.DELETE("/transfers/completed", clearCompletedTransferRecords)
			protected.DELETE("/transfers/type/:type", clearTransferRecordsByType)
			protected.DELETE("/transfers/all", clearAllTransferRecords)

			// WebSocket 终端（单独处理认证，因为 WebSocket 无法使用标准 Authorization header）
			api.GET("/terminal/:id", terminalHandler)

			// Certificate management
			protected.GET("/certificates", getCertificateInfo)
			protected.POST("/certificates", uploadCertificate)
			protected.DELETE("/certificates", deleteCertificate)
			protected.POST("/certificates/generate", generateSelfSignedCertificate)
		}
	}

	return router
}
