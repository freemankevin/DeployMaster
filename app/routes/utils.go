package routes

import (
	"crypto/rand"
)

// parseInt 解析字符串为整数
func parseInt(s string) int {
	var n int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}

// generateID 生成随机ID
func generateID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = chars[i%len(chars)]
	}
	return string(b)
}

// generateHostID 生成主机ID，格式：ins-8位随机字符
func generateHostID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 8)
	rand.Read(b)
	for i := range b {
		b[i] = chars[b[i]%byte(len(chars))]
	}
	return "ins-" + string(b)
}