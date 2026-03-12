import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // WebSocket 代理 - 必须放在普通 API 代理之前
      '/api/terminal/ws': {
        target: 'ws://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
      // API 代理
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})