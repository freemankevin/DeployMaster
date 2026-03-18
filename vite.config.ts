import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'src/public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // 大文件上传支持
    host: '0.0.0.0',
    proxy: {
      // WebSocket 代理 - 必须放在普通 API 代理之前
      '/api/terminal': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        // WebSocket 代理配置
        configure: (proxy, _options) => {
          // 静默处理所有代理错误
          proxy.on('error', (err, _req, _res) => {
            // 忽略所有 WebSocket 相关错误（这些是正常的连接关闭行为）
            const errorCode = (err as any).code;
            if (errorCode === 'ECONNABORTED' || 
                errorCode === 'ECONNRESET' || 
                errorCode === 'EPIPE' ||
                errorCode === 'ETIMEDOUT') {
              return; // 静默忽略
            }
            // 只打印非预期的错误
            console.warn('[Vite WS Proxy] Error:', err.message);
          });
          
          proxy.on('proxyReqWs', (_proxyReq, _req, socket, _options, _head) => {
            // 监听 socket 错误并静默处理
            socket.on('error', (err) => {
              const errorCode = (err as any).code;
              if (errorCode === 'ECONNABORTED' || 
                  errorCode === 'ECONNRESET' || 
                  errorCode === 'EPIPE') {
                return; // 静默忽略
              }
            });
            
            // 监听 socket 关闭事件
            socket.on('close', (hadError) => {
              // Socket 正常关闭，无需处理
            });
          });
          
          proxy.on('close', (_req, _socket, _head) => {
            // 代理关闭事件
          });
        },
      },
      // API 代理
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // 大文件上传配置
        timeout: 30 * 60 * 1000, // 30 分钟超时
      },
    },
  },
})