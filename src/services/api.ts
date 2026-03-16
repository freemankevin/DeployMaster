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
    // 如果数据是 FormData，删除默认的 Content-Type，让浏览器自动设置正确的 multipart/form-data 边界
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 对于 blob 类型的响应，直接返回 data
    if (response.config.responseType === 'blob') {
      return response.data;
    }
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

export interface UploadProgress {
  stage: 'init' | 'receiving' | 'received' | 'transferring' | 'completed' | 'error' | 'not_found';
  progress: number;  // 0-100
  bytes_sent: number;
  total_bytes: number;
  speed: string;
  message: string;
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

  // 上传文件（带进度ID）
  uploadFile: (hostId: number, remotePath: string, file: File, relativePath?: string, uploadId?: string) => {
    const formData = new FormData();
    formData.append('host_id', hostId.toString());
    formData.append('remote_path', remotePath);
    // 如果提供了上传ID，添加到表单
    if (uploadId) {
      formData.append('upload_id', uploadId);
    }
    // 如果提供了相对路径，使用相对路径作为文件名，以支持目录结构
    const fileName = relativePath || file.name;
    // 直接使用 File 对象，避免创建额外的 Blob 副本
    formData.append('file', file, fileName);
    // 根据文件大小动态计算超时时间（至少60秒，每MB增加5秒，最大30分钟）
    // 假设最慢传输速度为 200KB/s
    const sizeMB = file.size / 1024 / 1024;
    const timeout = Math.min(30 * 60 * 1000, Math.max(60000, sizeMB * 5000));
    return api.post<unknown, ApiResponse<void>>('/sftp/upload', formData, {
      // 不要手动设置 Content-Type，让浏览器自动设置（包含 boundary）
      timeout: timeout,
    });
  },

  // 获取上传进度
  getUploadProgress: (uploadId: string) =>
    api.get<unknown, { success: boolean; progress: UploadProgress }>(`/sftp/upload-progress/${uploadId}`),

  // 下载文件（带进度回调）
  downloadFile: async (
    hostId: number, 
    remotePath: string, 
    onProgress?: (progress: number, transferred: number, total: number) => void,
    fileSize?: number
  ) => {
    // 根据文件大小动态计算超时时间（默认30分钟最大，每MB增加5秒）
    const timeout = fileSize 
      ? Math.min(30 * 60 * 1000, Math.max(60000, (fileSize / 1024 / 1024) * 5000))
      : 30 * 60 * 1000; // 默认30分钟
    
    console.log('[SFTP] Starting download:', remotePath, 'timeout:', timeout, 'fileSize:', fileSize);
    
    try {
      const response = await api.post<unknown, Blob>('/sftp/download', { host_id: hostId, path: remotePath }, {
        responseType: 'blob',
        timeout: timeout,
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress, progressEvent.loaded, progressEvent.total);
          }
        },
      });
      
      console.log('[SFTP] Download response received:', typeof response, response instanceof Blob ? `Blob(${response.size}, ${response.type})` : response);
      
      // 检查是否返回了错误 JSON（而不是文件内容）
      if (response && typeof response === 'object' && response.type === 'application/json') {
        const text = await (response as Blob).text();
        console.log('[SFTP] Error response text:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || errorData.message || '下载失败');
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error(text || '下载失败');
        }
      }
      
      console.log('[SFTP] Download successful');
      return response;
    } catch (error) {
      console.error('[SFTP] Download error:', error);
      // 处理 axios 错误（HTTP 状态码错误）
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Blob; status?: number } };
        if (axiosError.response?.data instanceof Blob) {
          const text = await axiosError.response.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.detail || errorData.message || '下载失败');
          } catch (e) {
            if (e instanceof Error) throw e;
            throw new Error(text || '下载失败');
          }
        }
      }
      throw error;
    }
  },

  // 下载目录为ZIP（带进度回调）
  downloadFolder: async (
    hostId: number, 
    remotePath: string,
    onProgress?: (progress: number, transferred: number, total: number) => void
  ) => {
    // 目录下载超时设为30分钟
    const timeout = 30 * 60 * 1000;
    
    console.log('[SFTP] Starting folder download:', remotePath);
    
    try {
      const response = await api.post<unknown, Blob>('/sftp/download-folder', { host_id: hostId, path: remotePath }, {
        responseType: 'blob',
        timeout: timeout,
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress, progressEvent.loaded, progressEvent.total);
          }
        },
      });
      
      console.log('[SFTP] Folder download response received:', typeof response, response instanceof Blob ? `Blob(${response.size}, ${response.type})` : response);
      
      // 检查是否返回了错误 JSON（而不是文件内容）
      if (response && typeof response === 'object' && response.type === 'application/json') {
        const text = await (response as Blob).text();
        console.log('[SFTP] Error response text:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || errorData.message || '下载失败');
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error(text || '下载失败');
        }
      }
      
      console.log('[SFTP] Folder download successful');
      return response;
    } catch (error) {
      console.error('[SFTP] Folder download error:', error);
      // 处理 axios 错误（HTTP 状态码错误）
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Blob; status?: number } };
        if (axiosError.response?.data instanceof Blob) {
          const text = await axiosError.response.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.detail || errorData.message || '下载失败');
          } catch (e) {
            if (e instanceof Error) throw e;
            throw new Error(text || '下载失败');
          }
        }
      }
      throw error;
    }
  },

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