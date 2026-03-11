import axios from 'axios';
import type { 
  SSHHost, 
  SSHKey, 
  CreateHostRequest, 
  UpdateHostRequest, 
  HostStats, 
  ApiResponse,
  CommandResult,
  ConnectionTestResult 
} from '@/types';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// ==================== 主机管理 API ====================

export const hostApi = {
  // 获取所有主机
  getAll: () => 
    api.get<unknown, ApiResponse<SSHHost[]>>('/hosts'),

  // 获取单个主机
  getById: (id: number) => 
    api.get<unknown, ApiResponse<SSHHost>>(`/hosts/${id}`),

  // 添加主机
  create: (data: CreateHostRequest) => 
    api.post<unknown, ApiResponse<SSHHost>>('/hosts', data),

  // 更新主机
  update: (id: number, data: UpdateHostRequest) => 
    api.put<unknown, ApiResponse<SSHHost>>(`/hosts/${id}`, data),

  // 删除主机
  delete: (id: number) => 
    api.delete<unknown, ApiResponse<void>>(`/hosts/${id}`),

  // 测试连接
  testConnection: (id: number) => 
    api.post<unknown, ConnectionTestResult>(`/hosts/${id}/test`),

  // 执行命令
  executeCommand: (id: number, command: string) => 
    api.post<unknown, CommandResult>(`/hosts/${id}/execute`, { command }),

  // 搜索主机
  search: (query: string) => 
    api.get<unknown, ApiResponse<SSHHost[]>>(`/hosts/search?q=${encodeURIComponent(query)}`),

  // 获取统计信息
  getStats: () => 
    api.get<unknown, ApiResponse<HostStats>>('/hosts/stats'),
};

// ==================== SSH 密钥 API ====================

export const keyApi = {
  // 获取所有密钥
  getAll: () => 
    api.get<unknown, ApiResponse<SSHKey[]>>('/keys'),

  // 添加密钥
  create: (data: { name: string; key_type: string; private_key: string; public_key?: string }) => 
    api.post<unknown, ApiResponse<{ id: number }>>('/keys', data),

  // 删除密钥
  delete: (id: number) => 
    api.delete<unknown, ApiResponse<void>>(`/keys/${id}`),

  // 生成密钥对
  generate: (name: string, keyType: 'rsa' | 'ed25519') => 
    api.post<unknown, ApiResponse<{ id: number; public_key: string }>>('/keys/generate', { 
      name, 
      key_type: keyType 
    }),
};

// ==================== 终端 API ====================

export interface TabCompletionRequest {
  command: string;
  cursor_position?: number;
}

export interface TabCompletionResponse {
  success: boolean;
  completions: string[];
  common_prefix: string;
  message: string;
}

export const terminalApi = {
  // 连接终端
  connect: (hostId: number) =>
    api.post<unknown, ApiResponse<void>>(`/terminal/${hostId}/connect`),

  // 断开终端
  disconnect: (hostId: number) =>
    api.post<unknown, ApiResponse<void>>(`/terminal/${hostId}/disconnect`),

  // Tab 补全
  complete: (hostId: number, data: TabCompletionRequest) =>
    api.post<unknown, TabCompletionResponse>(`/terminal/${hostId}/complete`, data),

  // WebSocket 连接 URL (通过 Vite 代理)
  getWebSocketUrl: (hostId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // 包含主机名和端口
    return `${protocol}//${host}/api/terminal/ws/${hostId}`;
  },
};

export default api;