package logger

import (
	"fmt"
	"io"
	"os"
	"strings"
	"sync"
	"time"
)

// 日志级别
type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
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
	colorGray    = "\033[90m"
	colorBold    = "\033[1m"
)

// 模块颜色映射 - 每个模块使用不同的颜色便于区分
var moduleColors = map[string]string{
	"SSH":            colorCyan,
	"SFTP":           colorPurple,
	"ConnectionPool": colorBlue,
	"Terminal":       colorGreen,
	"HTTP":           colorGray,
	"Database":       colorYellow,
	"Config":         colorBlue,
	"Transfer":       colorPurple,
	"AutoConnect":    colorCyan,
	"ConnectSync":    colorCyan,
	"TestConnection": colorGreen,
}

// 级别颜色映射
var levelColors = map[Level]string{
	DEBUG: colorGray,
	INFO:  colorGreen,
	WARN:  colorYellow,
	ERROR: colorRed,
}

// 级别名称
var levelNames = map[Level]string{
	DEBUG: "DEBUG",
	INFO:  "INFO",
	WARN:  "WARN",
	ERROR: "ERROR",
}

// Logger 日志器
type Logger struct {
	mu       sync.Mutex
	output    io.Writer
	minLevel  Level
	showTime  bool
	colorize  bool
}

// 全局默认日志器
var defaultLogger = &Logger{
	output:   os.Stdout,
	minLevel: INFO,
	showTime: true,
	colorize: true,
}

// SetOutput 设置输出目标
func SetOutput(w io.Writer) {
	defaultLogger.mu.Lock()
	defer defaultLogger.mu.Unlock()
	defaultLogger.output = w
}

// SetMinLevel 设置最小日志级别
func SetMinLevel(level Level) {
	defaultLogger.mu.Lock()
	defer defaultLogger.mu.Unlock()
	defaultLogger.minLevel = level
}

// SetColorize 设置是否启用颜色
func SetColorize(enable bool) {
	defaultLogger.mu.Lock()
	defer defaultLogger.mu.Unlock()
	defaultLogger.colorize = enable
}

// log 内部日志方法
func (l *Logger) log(level Level, module, format string, args ...interface{}) {
	if level < l.minLevel {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	var sb strings.Builder

	// 时间戳（包含日期）
	if l.showTime {
		if l.colorize {
			sb.WriteString(colorGray)
		}
		sb.WriteString(time.Now().Format("2006-01-02 15:04:05"))
		if l.colorize {
			sb.WriteString(colorReset)
		}
		sb.WriteString(" ")
	}

	// 日志级别
	if l.colorize {
		sb.WriteString(levelColors[level])
	}
	sb.WriteString(fmt.Sprintf("[%-5s]", levelNames[level]))
	if l.colorize {
		sb.WriteString(colorReset)
	}
	sb.WriteString(" ")

	// 模块标签
	if module != "" {
		if l.colorize {
			if color, ok := moduleColors[module]; ok {
				sb.WriteString(color)
			}
		}
		sb.WriteString(fmt.Sprintf("[%s]", module))
		if l.colorize {
			sb.WriteString(colorReset)
		}
		sb.WriteString(" ")
	}

	// 日志内容
	sb.WriteString(fmt.Sprintf(format, args...))
	sb.WriteString("\n")

	// 输出
	fmt.Fprint(l.output, sb.String())
}

// Debug 调试日志
func Debug(module, format string, args ...interface{}) {
	defaultLogger.log(DEBUG, module, format, args...)
}

// Info 信息日志
func Info(module, format string, args ...interface{}) {
	defaultLogger.log(INFO, module, format, args...)
}

// Warn 警告日志
func Warn(module, format string, args ...interface{}) {
	defaultLogger.log(WARN, module, format, args...)
}

// Error 错误日志
func Error(module, format string, args ...interface{}) {
	defaultLogger.log(ERROR, module, format, args...)
}

// Fatal 致命错误日志（退出程序）
func Fatal(module, format string, args ...interface{}) {
	defaultLogger.log(ERROR, module, format, args...)
	os.Exit(1)
}

// WithModule 返回带模块的日志上下文
func WithModule(module string) *ModuleLogger {
	return &ModuleLogger{module: module}
}

// ModuleLogger 模块日志器
type ModuleLogger struct {
	module string
}

// Debug 调试日志
func (m *ModuleLogger) Debug(format string, args ...interface{}) {
	defaultLogger.log(DEBUG, m.module, format, args...)
}

// Info 信息日志
func (m *ModuleLogger) Info(format string, args ...interface{}) {
	defaultLogger.log(INFO, m.module, format, args...)
}

// Warn 警告日志
func (m *ModuleLogger) Warn(format string, args ...interface{}) {
	defaultLogger.log(WARN, m.module, format, args...)
}

// Error 错误日志
func (m *ModuleLogger) Error(format string, args ...interface{}) {
	defaultLogger.log(ERROR, m.module, format, args...)
}

// Fatal 致命错误日志
func (m *ModuleLogger) Fatal(format string, args ...interface{}) {
	defaultLogger.log(ERROR, m.module, format, args...)
	os.Exit(1)
}

// 预定义的模块日志器
var (
	SSH            = WithModule("SSH")
	SFTP           = WithModule("SFTP")
	ConnectionPool = WithModule("ConnectionPool")
	Terminal       = WithModule("Terminal")
	HTTP           = WithModule("HTTP")
	Database       = WithModule("Database")
	Config         = WithModule("Config")
	Transfer       = WithModule("Transfer")
	AutoConnect    = WithModule("AutoConnect")
	ConnectSync    = WithModule("ConnectSync")
	TestConnection = WithModule("TestConnection")
)