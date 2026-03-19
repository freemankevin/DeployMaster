import axios from 'axios';

// Transfer record interface
export interface TransferRecord {
  id: number;
  transfer_id: string;
  type: 'upload' | 'download';
  filename: string;
  remote_path: string;
  size: number;
  transferred: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  speed: string;
  error: string;
  host_id: number;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

// Get axios instance
const getApi = () => {
  const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Response interceptor
  api.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
  );

  return api;
};

export const transferApi = {
  // Get all transfer records
  getAll: (limit: number = 100, offset: number = 0) =>
    getApi().get<unknown, { success: boolean; data: TransferRecord[]; total: number }>(`/transfers?limit=${limit}&offset=${offset}`),

  // Create transfer record
  create: (data: Partial<TransferRecord>) =>
    getApi().post<unknown, { success: boolean; data: TransferRecord }>('/transfers', data),

  // Update transfer record
  update: (id: number, data: Partial<TransferRecord>) =>
    getApi().put<unknown, { success: boolean; data: TransferRecord }>(`/transfers/${id}`, data),

  // Delete transfer record
  delete: (id: number) =>
    getApi().delete<unknown, { success: boolean; message: string }>(`/transfers/${id}`),

  // Clear completed transfer records
  clearCompleted: () =>
    getApi().delete<unknown, { success: boolean; message: string }>('/transfers/completed'),
};

export default transferApi;