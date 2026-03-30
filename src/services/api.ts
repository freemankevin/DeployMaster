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
import { tokenManager } from './authApi';

// Create axios instance
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
    // Add JWT token to Authorization header
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If data is FormData, delete default Content-Type to let browser set correct multipart/form-data boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // For blob type responses, return data directly
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

// ==================== Host Management API ====================

export const hostApi = {
  // Get all hosts
  getAll: () => 
    api.get<unknown, ApiResponse<SSHHost[]>>('/hosts'),

  // Get single host
  getById: (id: number) => 
    api.get<unknown, ApiResponse<SSHHost>>(`/hosts/${id}`),

  // Add host
  create: (data: CreateHostRequest) => 
    api.post<unknown, ApiResponse<SSHHost>>('/hosts', data),

  // Update host
  update: (id: number, data: UpdateHostRequest) => 
    api.put<unknown, ApiResponse<SSHHost>>(`/hosts/${id}`, data),

  // Delete host
  delete: (id: number) => 
    api.delete<unknown, ApiResponse<void>>(`/hosts/${id}`),

  // Test connection
  testConnection: (id: number) => 
    api.post<unknown, ConnectionTestResult>(`/hosts/${id}/test`),

  // Execute command
  executeCommand: (id: number, command: string) => 
    api.post<unknown, CommandResult>(`/hosts/${id}/execute`, { command }),

  // Search hosts
  search: (query: string) =>
    api.get<unknown, ApiResponse<SSHHost[]>>(`/hosts/search?q=${encodeURIComponent(query)}`),

  // Get stats
  getStats: () =>
    api.get<unknown, ApiResponse<HostStats>>('/hosts/stats'),

  // Connect host
  connect: (id: number) =>
    api.post<unknown, ApiResponse<{ message: string; host_id: number; connected: boolean; server_info?: unknown }>>(`/hosts/${id}/connect`),

  // Disconnect host
  disconnect: (id: number) =>
    api.post<unknown, ApiResponse<void>>(`/hosts/${id}/disconnect`),

  // Refresh system info (reconnect and get latest info)
  refreshSystemInfo: (id: number) =>
    api.post<unknown, ApiResponse<{ message: string; host_id: number; connected: boolean; server_info?: unknown }>>(`/hosts/${id}/connect`),
};

// ==================== SSH Key API ====================

export interface SSHKeyResponse {
  id: number;
  name: string;
  type: string;
  public_key: string;
  comment?: string;
}

export const keyApi = {
  // Get all keys
  getAll: () =>
    api.get<unknown, ApiResponse<SSHKeyResponse[]>>('/keys'),

  // Add key
  create: (data: { name: string; type: string; private_key: string; public_key?: string; passphrase?: string }) =>
    api.post<unknown, ApiResponse<SSHKeyResponse>>('/keys', data),

  // Delete key
  delete: (id: number) =>
    api.delete<unknown, ApiResponse<void>>(`/keys/${id}`),

  // Generate key pair
  generate: (name: string, keyType: 'rsa' | 'ed25519') =>
    api.post<unknown, ApiResponse<{ id: number; name: string; type: string; public_key: string }>>('/keys/generate', {
      name,
      type: keyType
    }),
};

// ==================== Terminal API ====================

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
  // Connect terminal
  connect: (hostId: number) =>
    api.post<unknown, ApiResponse<void>>(`/terminal/${hostId}/connect`),

  // Disconnect terminal
  disconnect: (hostId: number) =>
    api.post<unknown, ApiResponse<void>>(`/terminal/${hostId}/disconnect`),

  // Tab completion
  complete: (hostId: number, data: TabCompletionRequest) =>
    api.post<unknown, TabCompletionResponse>(`/terminal/${hostId}/complete`, data),

  // WebSocket connection URL (via Vite proxy) with JWT token
  getWebSocketUrl: (hostId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Contains hostname and port
    const token = tokenManager.getAccessToken();
    return `${protocol}//${host}/api/terminal/${hostId}?token=${encodeURIComponent(token || '')}`;
  },
};

// ==================== Re-export from sub-modules ====================

// SFTP API
export { sftpApi } from './sftpApi';
export type { SFTPFile, SFTPListResponse, UploadProgress, DownloadProgress } from './sftpApi';

// Transfer API
export { transferApi } from './transferApi';
export type { TransferRecord } from './transferApi';

export default api;