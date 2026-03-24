import type { SFTPFile } from '@/services/api';

export interface SFTPModalProps {
  host: {
    id: number;
    name: string;
    address: string;
  };
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export interface DiskUsage {
  size: string;
  used: string;
  available: string;
  use_percentage: string;
}

// Transfer task type
export interface TransferTask {
  id: string;
  type: 'upload' | 'download';
  filename: string;
  remotePath: string;
  localPath?: string;
  directory?: string;    // Directory location
  size: number;
  transferred: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused' | 'cancelled';
  speed: string;
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  uploadId?: string;  // Used for cancelling upload
  downloadId?: string;  // Used for cancelling download
}

// Transfer log entry
export interface TransferLog {
  id: string;
  timestamp: Date;
  type: 'upload' | 'download' | 'mkdir' | 'delete' | 'rename' | 'error' | 'info';
  message: string;
  path: string;
  size?: string;
  status: 'success' | 'error' | 'info';
  directory?: string;  // Directory location
}

// Background task interface
export interface BackgroundTask {
  type: 'upload' | 'download';
  filename: string;
  size: number;
  progress: number;
  speed: string;
  transferred: number;
  taskId: string;
  progressId: string;
  directory?: string;  // Directory location
}

// Window state
export interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
}

// Connection state
export interface ConnectionState {
  isConnected: boolean;
  lastActivityTime: number;
  connectionStartTime: number;
}

export type ViewMode = 'list' | 'grid';
export type LogFilter = 'upload' | 'download';

// TransferManager return type
export interface TransferManager {
  transferTasks: TransferTask[];
  transferLogs: TransferLog[];
  addTransferLog: (type: TransferLog['type'], message: string, path: string, status?: TransferLog['status'], size?: string, directory?: string) => void;
  createTransferTask: (type: 'upload' | 'download', filename: string, remotePath: string, size: number, directory?: string) => Promise<string>;
  updateTransferTask: (taskId: string, updates: Partial<TransferTask>) => void;
  completeTransferTask: (taskId: string, success: boolean, errorMsg?: string) => void;
  pauseTransferTask: (taskId: string) => void;
  resumeTransferTask: (taskId: string, fileSize: number) => void;
  cancelTransferTask: (taskId: string) => void;
  cancelUploadById?: (uploadId: string) => void;
  cancelDownloadById?: (downloadId: string) => void;
  simulateTransferProgress: (taskId: string, fileSize: number, onProgress?: (progress: number) => void) => (() => void);
  clearLogs: () => void;
  clearLogsByFilter: (filter: 'all' | 'upload' | 'download') => void;
  clearCompletedTasks: () => void;
  loadTransferRecords: () => Promise<void>;
}

export { SFTPFile };