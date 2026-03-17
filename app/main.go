package main

import (
	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/middleware"
	"deploy-master/routes"
	"fmt"
	"os"
	"os/signal"
	"syscall"
)

const (
	APP_VERSION = "1.0.0"
	APP_PORT    = 8000
)

func main() {
	// 打印启动横幅
	middleware.PrintBanner(APP_PORT, APP_VERSION)

	// 初始化数据库
	database.InitDB()
	middleware.PrintStartupInfo("Database initialized", "success")

	// 初始化 SSH 连接池
	config.InitConnectionPool()
	middleware.PrintStartupInfo("SSH connection pool ready", "success")

	// 启动 HTTP 服务器
	router := routes.SetupRouter()
	middleware.PrintStartupInfo("API routes configured", "success")

	// 打印空行分隔
	fmt.Println()

	// 启动服务器 (在 goroutine 中)
	go func() {
		if err := router.Run(":8000"); err != nil {
			middleware.PrintStartupInfo("Server failed: "+err.Error(), "error")
			os.Exit(1)
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// 优雅关闭
	fmt.Println()
	middleware.PrintStartupInfo("Shutting down server...", "warning")
}