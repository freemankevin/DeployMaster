import axios from 'axios';
import type { ApiResponse } from '@/types';

// SFTP File interface
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
  stage: 'init' | 'receiving' | 'received' | 'transferring' | 'completed' | 'error' | 'not_found' | 'uploading' | 'downloading';
  progress: number;  // 0-100
  bytes_transferred: number;
  total_bytes: number;
  speed: string;
  message: string;
  transfer_id?: string;
}

export interface DownloadProgress {
  stage: 'init' | 'downloading' | 'completed' | 'error' | 'not_found';
  progress: number;  // 0-100
  bytes_transferred: number;
  total_bytes: number;
  speed: string;
  message: string;
}

// Get axios instance from main api module
const getApi = () => {
  const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  api.interceptors.request.use(
    (config) => {
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  api.interceptors.response.use(
    (response) => {
      if (response.config.responseType === 'blob') {
        return response.data;
      }
      return response.data;
    },
    (error) => Promise.reject(error)
  );

  return api;
};

// Helper to handle blob errors
async function handleBlobError(response: Blob): Promise<void> {
  const text = await response.text();
  try {
    const errorData = JSON.parse(text);
    throw new Error(errorData.detail || errorData.message || '操作失败');
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(text || '操作失败');
  }
}

// 磁盘空间信息接口
export interface DiskInfo {
  used_bytes: number;
  available_bytes: number;
  total_bytes: number;
  usage_percent: string;
  used_formatted: string;
  available_formatted: string;
  total_formatted: string;
  threshold?: string;
}

// 文件信息接口
export interface FileInfo {
  name: string;
  size_bytes: number;
  size_formatted: string;
}

// 上传错误信息接口
export interface UploadError {
  success: boolean;
  error: string;
  error_code?: 'DISK_SPACE_THRESHOLD_EXCEEDED' | 'DISK_SPACE_INSUFFICIENT';
  file_info?: FileInfo;
  disk_info?: DiskInfo;
}

export const sftpApi = {
  // Connect SFTP
  connect: (hostId: number) =>
    getApi().post<unknown, ApiResponse<void>>('/sftp/connect', { host_id: hostId }),

  // Disconnect SFTP
  disconnect: (hostId: number) =>
    getApi().post<unknown, ApiResponse<void>>('/sftp/disconnect', { host_id: hostId }),

  // List directory
  listDirectory: (hostId: number, path: string = '.') =>
    getApi().post<unknown, SFTPListResponse>('/sftp/list', { host_id: hostId, path }),

  // Create directory
  createDirectory: (hostId: number, path: string) =>
    getApi().post<unknown, ApiResponse<void>>('/sftp/mkdir', { host_id: hostId, path }),

  // Remove file/directory
  remove: (hostId: number, path: string, isDir: boolean = false, recursive: boolean = false) =>
    getApi().post<unknown, ApiResponse<void>>('/sftp/remove', { host_id: hostId, path, is_dir: isDir, recursive }),

  // Rename
  rename: (hostId: number, oldPath: string, newPath: string) =>
    getApi().post<unknown, ApiResponse<void>>('/sftp/rename', { host_id: hostId, old_path: oldPath, new_path: newPath }),

  // Upload file with progress ID and cancel support
  uploadFile: async (hostId: number, remotePath: string, file: File, relativePath?: string, uploadId?: string, abortSignal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('host_id', hostId.toString());
    formData.append('path', remotePath);
    const fileName = relativePath || file.name;
    formData.append('file', file, fileName);
    
    // Dynamic timeout based on file size (min 60s, +5s per MB, max 30 min)
    const sizeMB = file.size / 1024 / 1024;
    const timeout = Math.min(30 * 60 * 1000, Math.max(60000, sizeMB * 5000));
    const url = uploadId ? `/sftp/upload?upload_id=${uploadId}` : '/sftp/upload';
    
    try {
      return await getApi().post<unknown, ApiResponse<void>>(url, formData, {
        timeout: timeout,
        signal: abortSignal,
      });
    } catch (error: any) {
      // 处理磁盘空间不足的错误
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData.error) {
          // 创建包含磁盘信息和文件信息的错误对象
          const uploadError: UploadError = {
            success: false,
            error: errorData.error,
            error_code: errorData.error_code,
            file_info: errorData.file_info,
            disk_info: errorData.disk_info
          };
          // 抛出自定义错误
          const customError = new Error(errorData.error);
          (customError as any).uploadError = uploadError;
          throw customError;
        }
      }
      throw error;
    }
  },

  // Get upload progress
  getUploadProgress: (uploadId: string) =>
    getApi().get<unknown, { success: boolean; progress: UploadProgress }>(`/sftp/upload-progress/${uploadId}`),

  // Download file with progress polling
  downloadFileWithProgress: async (
    hostId: number,
    remotePath: string,
    onProgress?: (progress: DownloadProgress) => void,
    fileSize?: number
  ): Promise<{ blob: Blob; downloadId: string }> => {
    const timeout = fileSize
      ? Math.min(30 * 60 * 1000, Math.max(60000, (fileSize / 1024 / 1024) * 5000))
      : 30 * 60 * 1000;
    
    const downloadId = Math.random().toString(36).substring(2, 10);
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let lastProgress: DownloadProgress = {
      stage: 'init',
      progress: 0,
      bytes_transferred: 0,
      total_bytes: fileSize || 0,
      speed: '0 B/s',
      message: 'Preparing download...'
    };
    
    // 先通知初始状态
    if (onProgress) {
      onProgress(lastProgress);
    }
    
    try {
      const api = getApi();
      
      // 发送下载请求，后端会在收到请求时创建进度记录
      const downloadPromise = api.post<unknown, Blob>(`/sftp/download?download_id=${downloadId}`, { host_id: hostId, path: remotePath }, {
        responseType: 'blob',
        timeout: timeout,
      });
      
      // 等待一小段时间让后端创建进度记录，然后开始轮询
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (onProgress) {
        progressInterval = setInterval(async () => {
          try {
            const response = await sftpApi.getDownloadProgress(downloadId);
            if (response.success && response.progress) {
              lastProgress = response.progress;
              onProgress(lastProgress);
              
              if (lastProgress.stage === 'completed' || lastProgress.stage === 'error') {
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
              }
            }
          } catch (e) {
            // 忽略 404 错误，后端可能还在创建进度记录
            console.warn('[SFTP API] Progress polling error:', e);
          }
        }, 500);  // 增加轮询间隔到 500ms
      }
      
      // 等待下载完成
      const response = await downloadPromise;
      
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      if (response && typeof response === 'object' && response.type === 'application/json') {
        await handleBlobError(response);
      }
      
      if (onProgress) {
        onProgress({
          stage: 'completed',
          progress: 100,
          bytes_transferred: response.size,
          total_bytes: response.size,
          speed: '',
          message: 'Download complete'
        });
      }
      
      return { blob: response, downloadId };
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Blob; status?: number } };
        if (axiosError.response?.data instanceof Blob) {
          await handleBlobError(axiosError.response.data);
        }
      }
      throw error;
    }
  },

  // Get download progress
  getDownloadProgress: (downloadId: string) =>
    getApi().get<unknown, { success: boolean; progress: DownloadProgress }>(`/sftp/download-progress/${downloadId}`),

  // Download file (traditional way with progress callback)
  downloadFile: async (
    hostId: number,
    remotePath: string,
    onProgress?: (progress: number, transferred: number, total: number) => void,
    fileSize?: number
  ) => {
    const timeout = fileSize
      ? Math.min(30 * 60 * 1000, Math.max(60000, (fileSize / 1024 / 1024) * 5000))
      : 30 * 60 * 1000;
    
    try {
      const api = getApi();
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
      
      if (response && typeof response === 'object' && response.type === 'application/json') {
        await handleBlobError(response);
      }
      
      return response;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Blob; status?: number } };
        if (axiosError.response?.data instanceof Blob) {
          await handleBlobError(axiosError.response.data);
        }
      }
      throw error;
    }
  },

  // Download folder as ZIP
  downloadFolder: async (
    hostId: number, 
    remotePath: string,
    onProgress?: (progress: number, transferred: number, total: number) => void
  ) => {
    const timeout = 30 * 60 * 1000;
    
    try {
      const api = getApi();
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
      
      if (response && typeof response === 'object' && response.type === 'application/json') {
        await handleBlobError(response);
      }
      
      return response;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: Blob; status?: number } };
        if (axiosError.response?.data instanceof Blob) {
          await handleBlobError(axiosError.response.data);
        }
      }
      throw error;
    }
  },

  // Read file content
  readFile: (hostId: number, remotePath: string) =>
    getApi().post<unknown, { success: boolean; content: string; error?: string }>('/sftp/read', { host_id: hostId, path: remotePath }),

  // Write file content
  writeFile: (hostId: number, remotePath: string, content: string) =>
    getApi().post<unknown, ApiResponse<void>>('/sftp/write', { host_id: hostId, path: remotePath, content }),

  // Get disk usage
  getDiskUsage: (hostId: number, path: string = '/') =>
    getApi().post<unknown, { success: boolean; filesystem: string; size: string; used: string; available: string; use_percentage: string; error?: string }>('/sftp/disk-usage', { host_id: hostId, path }),
};

export default sftpApi;