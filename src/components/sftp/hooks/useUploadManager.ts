import { useRef, useCallback } from 'react';
import type { SFTPFile } from '@/services/api';
import { sftpApi } from '@/services/api';
import { formatFileSize } from '../utils';
import type { TransferManager } from '../types';

interface UseUploadManagerProps {
  hostId: number;
  currentPath: string;
  transfer: TransferManager;
  onSuccess: (title: string, message: string, duration?: number) => void;
  onError: (title: string, message: string) => void;
  onRefresh: () => void;
}

interface UseUploadManagerReturn {
  fileInputRef: React.RefObject<HTMLInputElement>;
  folderInputRef: React.RefObject<HTMLInputElement>;
  handleUpload: () => void;
  handleUploadFolder: () => void;
  handleUploadFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDropUpload: (items: DataTransferItemList) => Promise<void>;
}

// Generate unique upload ID
const generateUploadId = () => Math.random().toString(36).substring(2, 10);

export function useUploadManager({
  hostId,
  currentPath,
  transfer,
  onSuccess,
  onError,
  onRefresh
}: UseUploadManagerProps): UseUploadManagerReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Upload single file with real progress tracking
  const uploadFileWithProgress = useCallback(async (
    file: File, 
    relativePath?: string
  ): Promise<boolean> => {
    const uploadId = generateUploadId();
    const taskId = transfer.createTransferTask(
      'upload', 
      file.name, 
      `${currentPath}/${relativePath || file.name}`, 
      file.size
    );
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    transfer.addTransferLog(
      'upload', 
      `Starting upload: ${relativePath || file.name}`, 
      `${currentPath}/${relativePath || file.name}`, 
      'info', 
      formatFileSize(file.size)
    );

    // Start progress polling
    let progressInterval: number | null = null;
    let lastStage = '';
    let isCompleted = false;
    
    const startProgressPolling = () => {
      progressInterval = window.setInterval(async () => {
        try {
          const result = await sftpApi.getUploadProgress(uploadId);
          if (result.success && result.progress) {
            const { progress, stage, message, speed, bytes_sent } = result.progress;
            
            // Calculate transferred bytes based on progress percentage
            const transferred = file.size > 0 
              ? Math.round((progress / 100) * file.size) 
              : (bytes_sent || 0);
            
            // Update task progress
            transfer.updateTransferTask(taskId, {
              progress,
              transferred,
              speed: speed || '',
              status: stage === 'error' ? 'failed' : 'transferring'
            });
            
            // Detect stage changes and add logs
            if (stage !== lastStage) {
              if (stage === 'transferring' && lastStage === 'received') {
                transfer.addTransferLog(
                  'upload', 
                  `Received, transferring to server...`, 
                  `${currentPath}/${relativePath || file.name}`, 
                  'info'
                );
              }
              lastStage = stage;
            }
            
            // If completed or error, stop polling and update final status
            if (stage === 'completed' || stage === 'error') {
              if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
              }
              
              // If polling detected completion, update UI immediately
              if (stage === 'completed' && !isCompleted) {
                isCompleted = true;
                transfer.updateTransferTask(taskId, {
                  progress: 100,
                  transferred: file.size,
                  status: 'completed'
                });
                transfer.completeTransferTask(taskId, true);
                transfer.addTransferLog(
                  'upload', 
                  `✓ Upload success: ${relativePath || file.name}`, 
                  `${currentPath}/${relativePath || file.name}`, 
                  'success', 
                  formatFileSize(file.size)
                );
              } else if (stage === 'error' && !isCompleted) {
                isCompleted = true;
                transfer.completeTransferTask(taskId, false, message);
                transfer.addTransferLog(
                  'error', 
                  `✗ Upload failed: ${relativePath || file.name}`, 
                  message || 'Upload failed', 
                  'error'
                );
              }
            }
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 300);
    };

    try {
      // Start progress polling
      startProgressPolling();
      
      // Send upload request
      const response = await sftpApi.uploadFile(
        hostId, 
        currentPath, 
        file, 
        relativePath, 
        uploadId
      );
      
      // Stop polling
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      // If polling already handled completion, return immediately
      if (isCompleted) {
        return true;
      }
      
      if (response.success) {
        // Ensure progress shows 100% and transferred bytes are complete
        transfer.updateTransferTask(taskId, {
          progress: 100,
          transferred: file.size,
          status: 'completed'
        });
        transfer.completeTransferTask(taskId, true);
        transfer.addTransferLog(
          'upload', 
          `✓ Upload success: ${relativePath || file.name}`, 
          `${currentPath}/${relativePath || file.name}`, 
          'success', 
          formatFileSize(file.size)
        );
        return true;
      } else {
        transfer.completeTransferTask(taskId, false, response.message);
        transfer.addTransferLog(
          'error', 
          `✗ Upload failed: ${relativePath || file.name}`, 
          response.message || 'Upload failed', 
          'error'
        );
        return false;
      }
    } catch (err) {
      // Stop polling
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      // If polling already handled completion, return immediately
      if (isCompleted) {
        return true;
      }
      
      transfer.completeTransferTask(taskId, false, (err as Error).message);
      transfer.addTransferLog(
        'error', 
        `✗ Upload failed: ${relativePath || file.name}`, 
        (err as Error).message, 
        'error'
      );
      return false;
    }
  }, [hostId, currentPath, transfer]);

  const handleUpload = () => fileInputRef.current?.click();
  const handleUploadFolder = () => folderInputRef.current?.click();

  const handleUploadFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if it's a folder upload (via webkitRelativePath)
    const isFolderUpload = files[0].webkitRelativePath && files[0].webkitRelativePath.includes('/');
    
    if (isFolderUpload) {
      // Handle folder upload
      const rootFolderName = files[0].webkitRelativePath?.split('/')[0] || 'upload';
      onSuccess('Upload Started', `Uploading folder "${rootFolderName}"...`, 3000);
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = file.webkitRelativePath;
        if (!relativePath) continue;
        
        const result = await uploadFileWithProgress(file, relativePath);
        if (result) successCount++;
        else failCount++;
      }
      
      if (failCount === 0) {
        onSuccess('Upload Complete', `Folder "${rootFolderName}" uploaded (${successCount} files)`);
      } else {
        onError('Partial Upload Failed', `${successCount} files uploaded, ${failCount} failed`);
      }
    } else {
      // Handle regular file upload
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFileWithProgress(file);
        if (result) {
          onSuccess('Upload Complete', `${file.name} uploaded successfully`);
        } else {
          onError('Upload Failed', `${file.name} upload failed`);
        }
      }
    }
    
    onRefresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }, [uploadFileWithProgress, onSuccess, onError, onRefresh]);

  // Collect files from drag and drop entries
  const collectFiles = async (
    entry: FileSystemEntry, 
    basePath: string = ''
  ): Promise<{ file: File; relativePath: string }[]> => {
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
  };

  const handleDropUpload = useCallback(async (items: DataTransferItemList) => {
    const entries: FileSystemEntry[] = [];
    
    // Collect all entries
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          entries.push(entry);
        }
      }
    }
    
    if (entries.length === 0) return;
    
    // Collect all files (including files in directories)
    const allFiles: { file: File; relativePath: string }[] = [];
    for (const entry of entries) {
      const files = await collectFiles(entry);
      allFiles.push(...files);
    }
    
    if (allFiles.length === 0) {
      onError('No Files', 'No files found to upload');
      return;
    }
    
    // Show upload start notification
    onSuccess('Upload Started', `Uploading ${allFiles.length} files...`, 3000);
    
    let successCount = 0;
    let failCount = 0;
    
    // Upload all files (with real progress tracking)
    for (const { file, relativePath } of allFiles) {
      const result = await uploadFileWithProgress(file, relativePath);
      if (result) successCount++;
      else failCount++;
    }
    
    if (failCount === 0) {
      onSuccess('Upload Complete', `${successCount} files uploaded successfully`);
    } else {
      onError('Partial Upload Failed', `${successCount} files uploaded, ${failCount} failed`);
    }
    
    onRefresh();
  }, [uploadFileWithProgress, onSuccess, onError, onRefresh]);

  return {
    fileInputRef,
    folderInputRef,
    handleUpload,
    handleUploadFolder,
    handleUploadFileSelect,
    handleDropUpload
  };
}

