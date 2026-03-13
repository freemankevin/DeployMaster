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
    console.log('API Response:', response.config.url, response.status, response.data);
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
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

// ==================== SFTP API ====================

export interface SFTPFile {
  name: string;
  path: string;
  size: number;
  size_formatted: string;
  is_dir: boolean;
  is_link: boolean;
  modified_time: string;
  modified_time_formatted: string;
  permissions: string;
  owner: string;
  group: string;
}

export interface SFTPListResponse {
  success: boolean;
  path: string;
  files: SFTPFile[];
  error?: string;
}

export const sftpApi = {
  // 连接 SFTP
  connect: (hostId: number) =>
    api.post<unknown, ApiResponse<void>>('/sftp/connect', { host_id: hostId }),

  // 断开 SFTP
  disconnect: (hostId: number) =>
    api.post<unknown, ApiResponse<void>>('/sftp/disconnect', { host_id: hostId }),

  // 列出目录
  listDirectory: (hostId: number, path: string = '.') =>
    api.post<unknown, SFTPListResponse>('/sftp/list', { host_id: hostId, path }),

  // 创建目录
  createDirectory: (hostId: number, path: string) =>
    api.post<unknown, ApiResponse<void>>('/sftp/mkdir', { host_id: hostId, path }),

  // 删除文件/目录
  remove: (hostId: number, path: string, recursive: boolean = false) =>
    api.post<unknown, ApiResponse<void>>('/sftp/remove', { host_id: hostId, path, recursive }),

  // 重命名
  rename: (hostId: number, oldPath: string, newPath: string) =>
    api.post<unknown, ApiResponse<void>>('/sftp/rename', { host_id: hostId, old_path: oldPath, new_path: newPath }),

  // 上传文件
  uploadFile: (hostId: number, remotePath: string, file: File, relativePath?: string) => {
    const formData = new FormData();
    formData.append('host_id', hostId.toString());
    formData.append('remote_path', remotePath);
    // 如果提供了相对路径，使用相对路径作为文件名，以支持目录结构
    const fileName = relativePath || file.name;
    // 创建一个新的 File 对象来保留相对路径
    const fileToUpload = new File([file], fileName, { type: file.type });
    formData.append('file', fileToUpload);
    return api.post<unknown, ApiResponse<void>>('/sftp/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 下载文件
  downloadFile: (hostId: number, remotePath: string) =>
    api.post<unknown, Blob>('/sftp/download', { host_id: hostId, path: remotePath }, {
      responseType: 'blob',
    }),

  // 读取文件内容
  readFile: (hostId: number, remotePath: string) =>
    api.post<unknown, { success: boolean; content: string; size: number; error?: string }>('/sftp/read', { host_id: hostId, path: remotePath }),

  // 写入文件内容
  writeFile: (hostId: number, remotePath: string, content: string) =>
    api.post<unknown, ApiResponse<void>>('/sftp/write', { host_id: hostId, path: remotePath, content }),

  // 获取磁盘使用情况
  getDiskUsage: (hostId: number, path: string = '/') =>
    api.post<unknown, { success: boolean; filesystem: string; size: string; used: string; available: string; use_percentage: string; error?: string }>('/sftp/disk-usage', { host_id: hostId, path }),
};

export default api;