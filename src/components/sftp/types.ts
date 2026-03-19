import type { SFTPFile } from '@/services/api';

export interface SFTPModalProps {
  host: {
    id: number;
    name: string;
    address: string;
  };
  onClose: () => void;
}

export interface DiskUsage {
  size: string;
  used: string;
  available: string;
  use_percentage: string;
}

// 传输任务类型
export interface TransferTask {
  id: string;
  type: 'upload' | 'download';
  filename: string;
  remotePath: string;
  localPath?: string;
  size: number;
  transferred: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused' | 'cancelled';
  speed: string;
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  uploadId?: string;  // 用于取消上传
}

// 传输日志条目
export interface TransferLog {
  id: string;
  timestamp: Date;
  type: 'upload' | 'download' | 'mkdir' | 'delete' | 'rename' | 'error' | 'info';
  message: string;
  path: string;
  size?: string;
  status: 'success' | 'error' | 'info';
}

// 窗口状态
export interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
}

// 连接状态
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
  addTransferLog: (type: TransferLog['type'], message: string, path: string, status?: TransferLog['status'], size?: string) => void;
  createTransferTask: (type: 'upload' | 'download', filename: string, remotePath: string, size: number) => Promise<string>;
  updateTransferTask: (taskId: string, updates: Partial<TransferTask>) => void;
  completeTransferTask: (taskId: string, success: boolean, errorMsg?: string) => void;
  pauseTransferTask: (taskId: string) => void;
  resumeTransferTask: (taskId: string, fileSize: number) => void;
  cancelTransferTask: (taskId: string) => void;
  simulateTransferProgress: (taskId: string, fileSize: number, onProgress?: (progress: number) => void) => (() => void);
  clearLogs: () => void;
  clearLogsByFilter: (filter: 'all' | 'upload' | 'download') => void;
  clearCompletedTasks: () => void;
}

export { SFTPFile };
