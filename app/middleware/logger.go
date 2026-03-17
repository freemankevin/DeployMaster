package middleware

import (
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// 颜色定义
const (
	colorReset   = "\033[0m"
	colorRed     = "\033[31m"
	colorGreen   = "\033[32m"
	colorYellow  = "\033[33m"
	colorBlue    = "\033[34m"
	colorPurple  = "\033[35m"
	colorCyan    = "\033[36m"
	colorWhite   = "\033[37m"
	colorGray    = "\033[90m"
	colorBold    = "\033[1m"
)

// LoggerConfig 日志配置
type LoggerConfig struct {
	Output       io.Writer
	SkipPaths    []string
	SkipPrefixes []string
}

// Logger 专业的日志中间件
func Logger(config ...LoggerConfig) gin.HandlerFunc {
	// 默认配置
	var output io.Writer = os.Stdout
	skipPaths := []string{}
	skipPrefixes := []string{}

	if len(config) > 0 {
		if config[0].Output != nil {
			output = config[0].Output
		}
		if config[0].SkipPaths != nil {
			skipPaths = config[0].SkipPaths
		}
		if config[0].SkipPrefixes != nil {
			skipPrefixes = config[0].SkipPrefixes
		}
	}

	return func(c *gin.Context) {
		// 开始时间
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		query := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 结束时间
		end := time.Now()
		latency := end.Sub(start)

		// 跳过指定路径
		for _, skipPath := range skipPaths {
			if path == skipPath {
				return
			}
		}

		// 跳过指定前缀
		for _, prefix := range skipPrefixes {
			if strings.HasPrefix(path, prefix) {
				return
			}
		}

		// 状态码
		status := c.Writer.Status()
		statusColor := getStatusColor(status)
		methodColor := getMethodColor(method)

		// 客户端 IP
		clientIP := c.ClientIP()

		// 响应大小
		bodySize := c.Writer.Size()

		// 格式化时间
		timeStr := start.Format("15:04:05")

		// 构建日志行
		var logLine strings.Builder

		// 时间
		logLine.WriteString(colorGray)
		logLine.WriteString(timeStr)
		logLine.WriteString(colorReset)
		logLine.WriteString(" ")

		// 方法
		logLine.WriteString(methodColor)
		logLine.WriteString(fmt.Sprintf("%-6s", method))
		logLine.WriteString(colorReset)

		// 路径
		logLine.WriteString(path)

		// 查询参数
		if query != "" {
			logLine.WriteString(colorGray)
			logLine.WriteString("?")
			logLine.WriteString(query)
			logLine.WriteString(colorReset)
		}

		// 状态码
		logLine.WriteString(" ")
		logLine.WriteString(statusColor)
		logLine.WriteString(fmt.Sprintf("| %3d ", status))
		logLine.WriteString(colorReset)

		// 延迟
		latencyStr := formatLatency(latency)
		logLine.WriteString(colorCyan)
		logLine.WriteString(latencyStr)
		logLine.WriteString(colorReset)

		// 响应大小
		logLine.WriteString(" ")
		logLine.WriteString(colorGray)
		logLine.WriteString(formatSize(int64(bodySize)))
		logLine.WriteString(colorReset)

		// 客户端 IP
		logLine.WriteString(" ")
		logLine.WriteString(colorGray)
		logLine.WriteString(clientIP)
		logLine.WriteString(colorReset)

		// 错误信息
		if len(c.Errors) > 0 {
			logLine.WriteString(" ")
			logLine.WriteString(colorRed)
			logLine.WriteString(c.Errors.String())
			logLine.WriteString(colorReset)
		}

		// 输出日志
		fmt.Fprintln(output, logLine.String())
	}
}

// getStatusColor 获取状态码颜色
func getStatusColor(status int) string {
	switch {
	case status >= 200 && status < 300:
		return colorGreen
	case status >= 300 && status < 400:
		return colorCyan
	case status >= 400 && status < 500:
		return colorYellow
	case status >= 500:
		return colorRed
	default:
		return colorWhite
	}
}

// getMethodColor 获取请求方法颜色
func getMethodColor(method string) string {
	switch method {
	case "GET":
		return colorGreen
	case "POST":
		return colorBlue
	case "PUT":
		return colorYellow
	case "DELETE":
		return colorRed
	case "PATCH":
		return colorPurple
	case "OPTIONS":
		return colorCyan
	default:
		return colorWhite
	}
}

// formatLatency 格式化延迟
func formatLatency(latency time.Duration) string {
	switch {
	case latency < time.Millisecond:
		return fmt.Sprintf("%7dns", latency.Nanoseconds())
	case latency < time.Second:
		return fmt.Sprintf("%6.1fms", float64(latency.Microseconds())/1000)
	default:
		return fmt.Sprintf("%6.2fs", latency.Seconds())
	}
}

// formatSize 格式化大小
func formatSize(bytes int64) string {
	if bytes < 0 {
		return "-"
	}
	switch {
	case bytes < 1024:
		return fmt.Sprintf("%dB", bytes)
	case bytes < 1024*1024:
		return fmt.Sprintf("%.1fKB", float64(bytes)/1024)
	case bytes < 1024*1024*1024:
		return fmt.Sprintf("%.1fMB", float64(bytes)/(1024*1024))
	default:
		return fmt.Sprintf("%.1fGB", float64(bytes)/(1024*1024*1024))
	}
}

// PrintBanner 打印启动横幅
func PrintBanner(port int, version string) {
	banner := fmt.Sprintf(`
%s╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗ ███████╗ █████╗ ████████╗███████╗               ║
║   ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝               ║
║   ██║  ██║█████╗  ███████║   ██║   █████╗                 ║
║   ██║  ██║██╔══╝  ██╔══██║   ██║   ██╔══╝                 ║
║   ██████╔╝███████╗██║  ██║   ██║   ███████╗               ║
║   ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝               ║
║                                                           ║
║   %sDeploy Master%s - Server Deployment & Management Platform   ║
║   Version: %-46s ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝%s

`, colorCyan, colorBold+colorWhite, colorReset, version, colorReset)

	fmt.Print(banner)

	// 服务信息
	fmt.Printf("%s┌─%s Server Info %s", colorCyan, colorReset, colorCyan)
	fmt.Printf("%s\n", strings.Repeat("─", 48))

	fmt.Printf("│ %s◈%s Port:    %shttp://localhost:%d%s\n",
		colorGreen, colorReset, colorBlue, port, colorReset)
	fmt.Printf("│ %s◈%s Mode:    %s%s%s\n",
		colorGreen, colorReset, colorYellow, "development", colorReset)
	fmt.Printf("│ %s◈%s API:     %s/api/*%s\n",
		colorGreen, colorReset, colorPurple, colorReset)
	fmt.Printf("│ %s◈%s Health:  %s/api/health%s\n",
		colorGreen, colorReset, colorPurple, colorReset)

	fmt.Printf("%s└%s%s\n\n", colorCyan, strings.Repeat("─", 58), colorReset)

	fmt.Printf("%s➜%s Press %sCtrl+C%s to stop the server\n\n", colorGreen, colorReset, colorBold, colorReset)
}

// PrintStartupInfo 打印启动信息
func PrintStartupInfo(component string, status string) {
	var statusIcon, statusColor string

	switch status {
	case "success", "ok", "initialized":
		statusIcon = "✓"
		statusColor = colorGreen
	case "error", "failed":
		statusIcon = "✗"
		statusColor = colorRed
	case "warning":
		statusIcon = "!"
		statusColor = colorYellow
	default:
		statusIcon = "•"
		statusColor = colorCyan
	}

	fmt.Printf("  %s%s%s %s\n", statusColor, statusIcon, colorReset, component)
}

// PrintTable 打印表格
func PrintTable(headers []string, rows [][]string) {
	// 计算列宽
	widths := make([]int, len(headers))
	for i, h := range headers {
		widths[i] = len(h)
	}
	for _, row := range rows {
		for i, cell := range row {
			if len(cell) > widths[i] {
				widths[i] = len(cell)
			}
		}
	}

	// 打印分隔线
	printLine := func() {
		fmt.Print(colorCyan + "+")
		for _, w := range widths {
			fmt.Print(strings.Repeat("-", w+2) + "+")
		}
		fmt.Println(colorReset)
	}

	// 打印表头
	printLine()
	fmt.Print(colorCyan + "|" + colorReset)
	for i, h := range headers {
		fmt.Printf(" %s%-*s%s ", colorBold, widths[i], h, colorReset)
		fmt.Print(colorCyan + "|" + colorReset)
	}
	fmt.Println()
	printLine()

	// 打印数据行
	for _, row := range rows {
		fmt.Print(colorCyan + "|" + colorReset)
		for i, cell := range row {
			fmt.Printf(" %-*s ", widths[i], cell)
			fmt.Print(colorCyan + "|" + colorReset)
		}
		fmt.Println()
	}
	printLine()
}