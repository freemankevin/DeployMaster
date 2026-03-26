#!/bin/bash
echo "📦 安装依赖..."
go mod tidy
echo "🚀 启动应用..."
go run .