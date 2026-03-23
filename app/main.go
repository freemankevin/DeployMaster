package main

import (
	"bufio"
	"deploy-master/config"
	"deploy-master/database"
	"deploy-master/middleware"
	"deploy-master/routes"
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const (
	APP_VERSION    = "1.0.0"
	APP_PORT       = 8000
	OUR_PROCESS_NAME = "deploy-master"
)

// 可能的进程名列表
var OUR_PROCESS_NAMES = []string{"deploy-master", "deploy-master.exe", "main", "main.exe"}

// ProcessInfo 进程信息
type ProcessInfo struct {
	PID         int
	Name        string
	IsOurProcess bool
}

// checkAndKillProcessOnPort 检查并终止占用指定端口的进程
func checkAndKillProcessOnPort(port int) (bool, error) {
	// 首先尝试绑定端口，如果成功说明端口未被占用
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err == nil {
		ln.Close()
		return true, nil // 端口未被占用
	}

	// 端口被占用，获取占用进程信息
	processes, err := getProcessesOnPort(port)
	if err != nil {
		return false, fmt.Errorf("failed to get processes on port %d: %v", port, err)
	}

	if len(processes) == 0 {
		return false, fmt.Errorf("no processes found on port %d", port)
	}

	// 打印端口占用信息
	fmt.Printf("\n")
	fmt.Printf("  ┌─────────────────────────────────────────────────────────────┐\n")
	fmt.Printf("  │  ⚠ Port %d is occupied                                      \n", port)
	fmt.Printf("  └─────────────────────────────────────────────────────────────┘\n")
	fmt.Printf("\n")

	for _, proc := range processes {
		if proc.IsOurProcess {
			// 我们自己的旧进程，自动清理
			fmt.Printf("  ◈ Detected previous %s instance (PID: %d)\n", OUR_PROCESS_NAME, proc.PID)
			fmt.Printf("  ◈ Automatically terminating previous instance...\n")
			
			if err := killProcess(proc.PID); err != nil {
				fmt.Printf("  ◈ Failed to terminate PID %d: %v\n", proc.PID, err)
				continue
			}
			fmt.Printf("  ◈ Previous instance terminated successfully\n")
		} else {
			// 其他服务的进程，需要用户确认
			fmt.Printf("  ◈ Port %d is occupied by external service: %s (PID: %d)\n", port, proc.Name, proc.PID)
			fmt.Printf("  ◈ Waiting for user confirmation to terminate...\n")
			
			// 等待用户确认
			if !confirmKill(proc) {
				fmt.Printf("  ◈ User declined to terminate external process\n")
				return false, fmt.Errorf("user declined to terminate external process %s (PID: %d)", proc.Name, proc.PID)
			}
			
			if err := killProcess(proc.PID); err != nil {
				fmt.Printf("  ◈ Failed to terminate PID %d: %v\n", proc.PID, err)
				return false, fmt.Errorf("failed to terminate external process: %v", err)
			}
			fmt.Printf("  ◈ External process terminated successfully\n")
		}
	}

	// 等待端口释放
	time.Sleep(800 * time.Millisecond)
	
	// 验证端口是否已释放
	ln, err = net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err == nil {
		ln.Close()
		fmt.Printf("  ◈ Port %d is now available\n", port)
		return true, nil
	}
	
	return false, fmt.Errorf("port %d is still occupied after cleanup attempt", port)
}

// getProcessesOnPort 获取占用指定端口的所有进程
func getProcessesOnPort(port int) ([]ProcessInfo, error) {
	var processes []ProcessInfo

	switch runtime.GOOS {
	case "windows":
		processes = getProcessesOnPortWindows(port)
	case "darwin", "linux":
		processes = getProcessesOnPortUnix(port)
	default:
		return nil, fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}

	return processes, nil
}

// getProcessesOnPortWindows 在 Windows 上获取占用端口的进程
func getProcessesOnPortWindows(port int) []ProcessInfo {
	var processes []ProcessInfo

	// 使用 netstat 查找占用端口的 PID
	cmd := exec.Command("cmd", "/c", fmt.Sprintf("netstat -ano | findstr :%d | findstr LISTENING", port))
	output, err := cmd.Output()
	if err != nil {
		return processes
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Fields(strings.TrimSpace(line))
		if len(parts) >= 5 {
			pidStr := parts[4]
			pid, err := strconv.Atoi(pidStr)
			if err != nil {
				continue
			}

			// 获取进程名
			processName := getProcessNameWindows(pid)
			isOurProcess := isOurProcessName(processName)

			processes = append(processes, ProcessInfo{
				PID:         pid,
				Name:        processName,
				IsOurProcess: isOurProcess,
			})
		}
	}

	return processes
}

// getProcessNameWindows 在 Windows 上获取进程名
func getProcessNameWindows(pid int) string {
	cmd := exec.Command("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	parts := strings.Split(strings.TrimSpace(string(output)), ",")
	if len(parts) >= 1 {
		return strings.Trim(parts[0], "\"")
	}
	return "unknown"
}

// getProcessesOnPortUnix 在 Unix 上获取占用端口的进程
func getProcessesOnPortUnix(port int) []ProcessInfo {
	var processes []ProcessInfo

	cmd := exec.Command("lsof", "-ti", fmt.Sprintf(":%d", port))
	output, err := cmd.Output()
	if err != nil {
		return processes
	}

	pids := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, pidStr := range pids {
		pidStr = strings.TrimSpace(pidStr)
		if pidStr == "" {
			continue
		}

		pid, _ := strconv.Atoi(pidStr)
		processName := getProcessNameUnix(pid)
		isOurProcess := isOurProcessName(processName)

		processes = append(processes, ProcessInfo{
			PID:         pid,
			Name:        processName,
			IsOurProcess: isOurProcess,
		})
	}

	return processes
}

// getProcessNameUnix 在 Unix 上获取进程名
func getProcessNameUnix(pid int) string {
	cmd := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "comm=")
	output, err := cmd.Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(output))
}

// isOurProcessName 判断进程名是否是我们的应用
func isOurProcessName(name string) bool {
	nameLower := strings.ToLower(name)
	for _, ourName := range OUR_PROCESS_NAMES {
		if nameLower == strings.ToLower(ourName) {
			return true
		}
	}
	// 也检查是否包含我们的应用名
	return strings.Contains(nameLower, strings.ToLower(OUR_PROCESS_NAME))
}

// killProcess 终止指定 PID 的进程
func killProcess(pid int) error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("taskkill", "/F", "/PID", strconv.Itoa(pid))
		return cmd.Run()
	case "darwin", "linux":
		// 先尝试 SIGTERM
		cmd := exec.Command("kill", "-15", strconv.Itoa(pid))
		if err := cmd.Run(); err != nil {
			// 失败则使用 SIGKILL
			cmd = exec.Command("kill", "-9", strconv.Itoa(pid))
			return cmd.Run()
		}
		return nil
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
}

// confirmKill 等待用户确认是否终止外部进程
func confirmKill(proc ProcessInfo) bool {
	fmt.Printf("\n")
	fmt.Printf("  ┌─────────────────────────────────────────────────────────────┐\n")
	fmt.Printf("  │  ⚡ External process detected                               │\n")
	fmt.Printf("  │                                                             │\n")
	fmt.Printf("  │  Process: %-45s │\n", proc.Name)
	fmt.Printf("  │  PID:     %-46d │\n", proc.PID)
	fmt.Printf("  │                                                             │\n")
	fmt.Printf("  │  Do you want to terminate this process? (y/n):             │\n")
	fmt.Printf("  └─────────────────────────────────────────────────────────────┘\n")
	fmt.Printf("\n")
	fmt.Printf("  > Enter choice: ")

	reader := bufio.NewReader(os.Stdin)
	input, err := reader.ReadString('\n')
	if err != nil {
		return false
	}

	input = strings.TrimSpace(strings.ToLower(input))
	return input == "y" || input == "yes"
}

// truncateString 截断字符串到指定长度，添加省略号
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// getServerAddr 获取服务器绑定地址
// 默认只绑定 localhost 避免 Windows 防火墙弹窗
// 如需外部访问，设置环境变量 SERVER_ADDR=0.0.0.0:8000
func getServerAddr() string {
	if addr := os.Getenv("SERVER_ADDR"); addr != "" {
		return addr
	}
	// 默认只绑定 localhost，避免防火墙弹窗
	return "127.0.0.1:8000"
}

func main() {
	// 检查并清理占用端口的进程
	portFree, err := checkAndKillProcessOnPort(APP_PORT)
	if err != nil {
		if !portFree {
			fmt.Printf("\n")
			fmt.Printf("  ┌─────────────────────────────────────────────────────────────┐\n")
			fmt.Printf("  │  ✗ Failed to start server                                 │\n")
			fmt.Printf("  │                                                             │\n")
			fmt.Printf("  │  Reason: %s\n", truncateString(err.Error(), 58))
			fmt.Printf("  │                                                             │\n")
			fmt.Printf("  │  Please manually free up port %d and try again.           │\n", APP_PORT)
			fmt.Printf("  └─────────────────────────────────────────────────────────────┘\n")
			fmt.Printf("\n")
			os.Exit(1)
		}
	}

	// 打印启动横幅
	middleware.PrintBanner(APP_PORT, APP_VERSION)

	// 初始化数据库
	database.InitDB()
	middleware.PrintStartupInfo("Database initialized", "success")

	// 初始化 SSH 连接池
	config.InitConnectionPool()
	middleware.PrintStartupInfo("SSH connection pool ready", "success")

	// 自动连接所有已配置的主机
	routes.AutoConnectAllHosts()
	middleware.PrintStartupInfo("Auto-connecting to all hosts", "success")

	// 启动 HTTP 服务器
	router := routes.SetupRouter()
	middleware.PrintStartupInfo("API routes configured", "success")

	// 打印空行分隔
	fmt.Println()

	// 启动服务器 (在 goroutine 中)
	serverAddr := getServerAddr()
	go func() {
		if err := router.Run(serverAddr); err != nil {
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