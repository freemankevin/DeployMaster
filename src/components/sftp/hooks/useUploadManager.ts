import { useState, useRef, useCallback } from 'react';
import { sftpApi } from '@/services/api';
import { formatFileSize } from '../utils';
import type { TransferManager } from '../types';
import {
  UploadProgress,
  ActiveUpload,
  BackgroundUploadState,
  activeUploads,
  generateUploadId,
  cancelUploadById,
  INITIAL_PROGRESS,
  createProgressPolling,
  collectFiles,
  handleUploadComplete,
  handleUploadCancelled
} from './uploadUtils';

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
  cancelUpload: (uploadId: string) => void;
  showUploadProgress: boolean;
  uploadingFile: { name: string; size: number } | null;
  uploadProgress: UploadProgress;
  backgroundUpload: BackgroundUploadState | null;
  setShowUploadProgress: (show: boolean) => void;
  setBackgroundUpload: (upload: BackgroundUploadState | null) => void;
  currentUploadId: string | null;
  currentTaskId: string | null;
}

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

  // Modal and background upload state
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{ name: string; size: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(INITIAL_PROGRESS);
  const [backgroundUpload, setBackgroundUpload] = useState<BackgroundUploadState | null>(null);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Upload single file with real progress tracking
  const uploadFileWithProgress = useCallback(async (
    file: File,
    relativePath?: string
  ): Promise<boolean> => {
    const uploadId = generateUploadId();
    const fileName = relativePath || file.name;
    const filePath = `${currentPath}/${fileName}`;
    const taskId = await transfer.createTransferTask(
      'upload',
      file.name,
      filePath,
      file.size
    );

    // Store uploadId to task for cancellation
    transfer.updateTransferTask(taskId, { status: 'transferring', uploadId });
    transfer.addTransferLog(
      'upload',
      `Starting upload: ${fileName}`,
      filePath,
      'info',
      formatFileSize(file.size)
    );

    // Create AbortController for cancellation
    const abortController = new AbortController();

    // Store active upload task
    const activeUpload: ActiveUpload = {
      progressInterval: null,
      abortController,
      taskId
    };
    activeUploads.set(uploadId, activeUpload);

    // Set modal state
    const initialProgress: UploadProgress = {
      progress: 0,
      bytes_transferred: 0,
      total_bytes: file.size,
      speed: '',
      stage: 'init',
      message: 'Preparing to upload...'
    };
    setUploadingFile({ name: fileName, size: file.size });
    setUploadProgress(initialProgress);
    setBackgroundUpload({ file: { name: fileName, size: file.size }, progress: initialProgress });
    setShowUploadProgress(true);
    setCurrentUploadId(uploadId);
    setCurrentTaskId(taskId);

    // Create progress polling function
    const startProgressPolling = createProgressPolling({
      uploadId,
      taskId,
      fileName,
      filePath,
      fileSize: file.size,
      transfer,
      setUploadProgress,
      setBackgroundUpload,
      setCurrentUploadId,
      setCurrentTaskId,
      abortController
    });

    let isCompleted = false;

    try {
      // Start progress polling
      startProgressPolling();

      // Send upload request with abort signal
      const response = await sftpApi.uploadFile(
        hostId,
        currentPath,
        file,
        relativePath,
        uploadId,
        abortController.signal
      );

      // Stop polling
      const upload = activeUploads.get(uploadId);
      if (upload?.progressInterval) {
        clearInterval(upload.progressInterval);
        upload.progressInterval = null;
      }

      // If polling already handled completion, return immediately
      if (isCompleted) {
        return true;
      }

      // Clean up
      activeUploads.delete(uploadId);
      setCurrentUploadId(null);
      setCurrentTaskId(null);

      if (response.success) {
        handleUploadComplete(
          true,
          fileName,
          filePath,
          file.size,
          taskId,
          transfer,
          setUploadProgress,
          setBackgroundUpload,
          setCurrentUploadId,
          setCurrentTaskId
        );
        return true;
      } else {
        handleUploadComplete(
          false,
          fileName,
          filePath,
          file.size,
          taskId,
          transfer,
          setUploadProgress,
          setBackgroundUpload,
          setCurrentUploadId,
          setCurrentTaskId,
          response.message
        );
        return false;
      }
    } catch (err: any) {
      // Stop polling
      const upload = activeUploads.get(uploadId);
      if (upload?.progressInterval) {
        clearInterval(upload.progressInterval);
        upload.progressInterval = null;
      }

      // Clean up
      activeUploads.delete(uploadId);
      setCurrentUploadId(null);
      setCurrentTaskId(null);

      // If polling already handled completion, return immediately
      if (isCompleted) {
        return true;
      }

      // Check if user cancelled
      const isCancelled = err?.name === 'CanceledError' ||
                          err?.name === 'AbortError' ||
                          err?.code === 'ERR_CANCELED' ||
                          err?.message === 'canceled' ||
                          abortController.signal.aborted;

      if (isCancelled) {
        handleUploadCancelled(
          fileName,
          file.size,
          uploadProgress,
          transfer,
          setUploadProgress,
          setBackgroundUpload,
          setCurrentUploadId,
          setCurrentTaskId
        );
        return false;
      }

      handleUploadComplete(
        false,
        fileName,
        filePath,
        file.size,
        taskId,
        transfer,
        setUploadProgress,
        setBackgroundUpload,
        setCurrentUploadId,
        setCurrentTaskId,
        (err as Error).message
      );
      return false;
    }
  }, [hostId, currentPath, transfer, uploadProgress]);

  // Cancel upload
  const cancelUpload = useCallback((uploadId: string) => {
    cancelUploadById(uploadId);
  }, []);

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
    handleDropUpload,
    cancelUpload,
    showUploadProgress,
    uploadingFile,
    uploadProgress,
    backgroundUpload,
    setShowUploadProgress,
    setBackgroundUpload,
    currentUploadId,
    currentTaskId
  };
}

// Re-export for external use
export { cancelUploadById, isUploadCancelled } from './uploadUtils';
export type { TransferManager } from '../types';