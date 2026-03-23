import type { SFTPFile } from '@/services/api';
import { sftpApi } from '@/services/api';
import { formatFileSize } from '../utils';
import type { TransferManager } from '../types';

// Upload progress interface
export interface UploadProgress {
  progress: number;
  bytes_transferred: number;
  total_bytes: number;
  speed: string;
  stage: string;
  message: string;
}

// Active upload task interface
export interface ActiveUpload {
  progressInterval: number | null;
  abortController: AbortController;
  taskId: string;
}

// Global storage for active uploads
export const activeUploads = new Map<string, ActiveUpload>();

// Generate unique upload ID
export const generateUploadId = () => Math.random().toString(36).substring(2, 10);

// Cancel upload by ID, returns associated taskId
export const cancelUploadById = (uploadId: string): string | null => {
  const upload = activeUploads.get(uploadId);
  if (upload) {
    console.log(`[Upload] Cancelling upload: ${uploadId}, progressInterval: ${upload.progressInterval}`);
    // Clear progress polling timer
    if (upload.progressInterval) {
      clearInterval(upload.progressInterval);
      upload.progressInterval = null;
    }
    // Cancel HTTP request
    upload.abortController.abort();
    // Remove from Map
    activeUploads.delete(uploadId);
    console.log(`[Upload] Cancelled upload: ${uploadId}`);
    return upload.taskId;
  }
  return null;
};

// Check if upload is cancelled
export const isUploadCancelled = (uploadId: string): boolean => {
  return !activeUploads.has(uploadId);
};

// Initial progress state
export const INITIAL_PROGRESS: UploadProgress = {
  progress: 0,
  bytes_transferred: 0,
  total_bytes: 0,
  speed: '',
  stage: 'init',
  message: ''
};

// Background upload state type
export interface BackgroundUploadState {
  file: { name: string; size: number };
  progress: UploadProgress;
}

// Progress polling options
export interface ProgressPollingOptions {
  uploadId: string;
  taskId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  transfer: TransferManager;
  setUploadProgress: (progress: UploadProgress) => void;
  setBackgroundUpload: (upload: BackgroundUploadState | null | ((prev: BackgroundUploadState | null) => BackgroundUploadState | null)) => void;
  setCurrentUploadId: (id: string | null) => void;
  setCurrentTaskId: (id: string | null) => void;
  abortController: AbortController;
}

// Create progress polling function
export function createProgressPolling(options: ProgressPollingOptions): () => void {
  const {
    uploadId,
    taskId,
    fileName,
    filePath,
    fileSize,
    transfer,
    setUploadProgress,
    setBackgroundUpload,
    setCurrentUploadId,
    setCurrentTaskId,
    abortController
  } = options;

  let lastStage = '';
  let isCompleted = false;
  let progressNotFoundCount = 0;
  const MAX_NOT_FOUND_RETRIES = 50; // Max 50 404s (about 15 seconds)

  return () => {
    const intervalId = window.setInterval(async () => {
      // Check if already cancelled
      if (!activeUploads.has(uploadId)) {
        clearInterval(intervalId);
        return;
      }

      try {
        const result = await sftpApi.getUploadProgress(uploadId);

        // Check again after async operation
        if (!activeUploads.has(uploadId)) {
          clearInterval(intervalId);
          return;
        }

        if (result.success && result.progress) {
          // Reset 404 counter
          progressNotFoundCount = 0;

          const { progress, stage, message, speed, bytes_transferred } = result.progress;
          
          // Debug log
          console.log('[Upload Progress] Polling result:', {
            uploadId,
            progress,
            stage,
            bytes_transferred,
            total_bytes: fileSize,
            speed
          });

          // Validate and clamp progress value (0-100)
          // Backend might return invalid values during 'receiving' stage
          let validProgress = progress;
          if (stage === 'receiving') {
            // During receiving stage, progress should be 0
            validProgress = 0;
          } else if (typeof progress !== 'number' || isNaN(progress)) {
            validProgress = 0;
          } else if (progress < 0) {
            validProgress = 0;
          } else if (progress > 100) {
            validProgress = 100;
          }

          // Calculate transferred bytes based on progress percentage
          const transferred = fileSize > 0
            ? Math.round((validProgress / 100) * fileSize)
            : (bytes_transferred || 0);

          // Update progress
          const newProgress: UploadProgress = {
            progress: validProgress,
            bytes_transferred: transferred,
            total_bytes: fileSize,
            speed: speed || '',
            stage: stage || 'uploading',
            message: message || ''
          };
          setUploadProgress(newProgress);
          setBackgroundUpload(prev => prev ? { ...prev, progress: newProgress } : null);

          // Update task progress
          transfer.updateTransferTask(taskId, {
            progress: validProgress,
            transferred,
            speed: speed || '',
            status: stage === 'error' ? 'failed' : 'transferring'
          });

          // Detect stage changes and add logs
          if (stage !== lastStage) {
            if (stage === 'uploading' && lastStage === 'receiving') {
              transfer.addTransferLog(
                'upload',
                `Received, transferring to server...`,
                filePath,
                'info'
              );
            }
            lastStage = stage;
          }

          // If completed or error, stop polling and update final status
          if (stage === 'completed' || stage === 'error') {
            clearInterval(intervalId);

            // If polling detected completion, update UI immediately
            if (stage === 'completed' && !isCompleted) {
              isCompleted = true;
              const completedProgress: UploadProgress = {
                progress: 100,
                bytes_transferred: fileSize,
                total_bytes: fileSize,
                speed: '',
                stage: 'completed',
                message: 'Upload complete'
              };
              setUploadProgress(completedProgress);
              setBackgroundUpload(null);
              transfer.updateTransferTask(taskId, {
                progress: 100,
                transferred: fileSize,
                status: 'completed'
              });
              transfer.completeTransferTask(taskId, true);
              transfer.addTransferLog(
                'upload',
                `✓ Upload success: ${fileName}`,
                filePath,
                'success',
                formatFileSize(fileSize)
              );
              activeUploads.delete(uploadId);
              setCurrentUploadId(null);
              setCurrentTaskId(null);
            } else if (stage === 'error' && !isCompleted) {
              isCompleted = true;
              // Check if cancelled
              const isCancelled = message?.toLowerCase().includes('cancelled') ||
                                  message?.toLowerCase().includes('canceled');
              if (isCancelled) {
                const cancelledProgress: UploadProgress = {
                  progress,
                  bytes_transferred: transferred,
                  total_bytes: fileSize,
                  speed: '',
                  stage: 'cancelled',
                  message: 'Upload cancelled'
                };
                setUploadProgress(cancelledProgress);
                setBackgroundUpload(null);
                transfer.addTransferLog(
                  'upload',
                  `✗ Upload cancelled: ${fileName}`,
                  message || 'User cancelled the upload',
                  'info'
                );
              } else {
                const errorProgress: UploadProgress = {
                  progress,
                  bytes_transferred: transferred,
                  total_bytes: fileSize,
                  speed: '',
                  stage: 'error',
                  message: message || 'Upload failed'
                };
                setUploadProgress(errorProgress);
                setBackgroundUpload(null);
                transfer.completeTransferTask(taskId, false, message);
                transfer.addTransferLog(
                  'error',
                  `✗ Upload failed: ${fileName}`,
                  message || 'Upload failed',
                  'error'
                );
              }
              activeUploads.delete(uploadId);
              setCurrentUploadId(null);
              setCurrentTaskId(null);
            }
          }
        }
      } catch (e: any) {
        // Check if cancelled
        if (!activeUploads.has(uploadId)) {
          clearInterval(intervalId);
          return;
        }

        // Handle 404 error - for large file uploads, server needs time to receive request body
        // During this time, progress record may not exist yet
        if (e?.response?.status === 404) {
          progressNotFoundCount++;
          // If exceeded max retries, stop polling and report error
          if (progressNotFoundCount > MAX_NOT_FOUND_RETRIES) {
            clearInterval(intervalId);
            const errorProgress: UploadProgress = {
              progress: 0,
              bytes_transferred: 0,
              total_bytes: fileSize,
              speed: '',
              stage: 'error',
              message: 'Upload progress not found - server may be busy'
            };
            setUploadProgress(errorProgress);
            setBackgroundUpload(null);
            transfer.completeTransferTask(taskId, false, 'Upload progress not found - server may be busy');
            transfer.addTransferLog(
              'error',
              `✗ Upload failed: ${fileName}`,
              'Server is not responding with progress updates',
              'error'
            );
            activeUploads.delete(uploadId);
            setCurrentUploadId(null);
            setCurrentTaskId(null);
          }
          return;
        }
        // Ignore other errors
      }
    }, 300);

    // Store interval ID to activeUpload object
    const upload = activeUploads.get(uploadId);
    if (upload) {
      upload.progressInterval = intervalId;
    }
  };
}

// Collect files from drag and drop entries
export async function collectFiles(
  entry: FileSystemEntry,
  basePath: string = ''
): Promise<{ file: File; relativePath: string }[]> {
  const files: { file: File; relativePath: string }[] = [];

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve) => {
      fileEntry.file(resolve);
    });
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    files.push({ file, relativePath });
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();

    const readAllEntries = async (): Promise<FileSystemEntry[]> => {
      const allEntries: FileSystemEntry[] = [];
      const readBatch = (): Promise<FileSystemEntry[]> => {
        return new Promise((resolve) => {
          reader.readEntries(resolve);
        });
      };

      let batch = await readBatch();
      while (batch.length > 0) {
        allEntries.push(...batch);
        batch = await readBatch();
      }
      return allEntries;
    };

    const subEntries = await readAllEntries();
    const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    for (const subEntry of subEntries) {
      const subFiles = await collectFiles(subEntry, newBasePath);
      files.push(...subFiles);
    }
  }

  return files;
}

// Handle upload completion
export function handleUploadComplete(
  success: boolean,
  fileName: string,
  filePath: string,
  fileSize: number,
  taskId: string,
  transfer: TransferManager,
  setUploadProgress: (progress: UploadProgress) => void,
  setBackgroundUpload: (upload: BackgroundUploadState | null) => void,
  setCurrentUploadId: (id: string | null) => void,
  setCurrentTaskId: (id: string | null) => void,
  errorMessage?: string
): void {
  if (success) {
    const completedProgress: UploadProgress = {
      progress: 100,
      bytes_transferred: fileSize,
      total_bytes: fileSize,
      speed: '',
      stage: 'completed',
      message: 'Upload complete'
    };
    setUploadProgress(completedProgress);
    setBackgroundUpload(null);
    transfer.updateTransferTask(taskId, {
      progress: 100,
      transferred: fileSize,
      status: 'completed'
    });
    transfer.completeTransferTask(taskId, true);
    transfer.addTransferLog(
      'upload',
      `✓ Upload success: ${fileName}`,
      filePath,
      'success',
      formatFileSize(fileSize)
    );
  } else {
    const errorProgress: UploadProgress = {
      progress: 0,
      bytes_transferred: 0,
      total_bytes: fileSize,
      speed: '',
      stage: 'error',
      message: errorMessage || 'Upload failed'
    };
    setUploadProgress(errorProgress);
    setBackgroundUpload(null);
    transfer.completeTransferTask(taskId, false, errorMessage);
    transfer.addTransferLog(
      'error',
      `✗ Upload failed: ${fileName}`,
      errorMessage || 'Upload failed',
      'error'
    );
  }
  setCurrentUploadId(null);
  setCurrentTaskId(null);
}

// Handle upload cancellation
export function handleUploadCancelled(
  fileName: string,
  fileSize: number,
  currentProgress: UploadProgress,
  transfer: TransferManager,
  setUploadProgress: (progress: UploadProgress) => void,
  setBackgroundUpload: (upload: BackgroundUploadState | null) => void,
  setCurrentUploadId: (id: string | null) => void,
  setCurrentTaskId: (id: string | null) => void
): void {
  const cancelledProgress: UploadProgress = {
    ...currentProgress,
    stage: 'cancelled',
    message: 'Upload cancelled'
  };
  setUploadProgress(cancelledProgress);
  setBackgroundUpload(null);
  transfer.addTransferLog(
    'upload',
    `✗ Upload cancelled: ${fileName}`,
    'User cancelled the upload',
    'info'
  );
  setCurrentUploadId(null);
  setCurrentTaskId(null);
}