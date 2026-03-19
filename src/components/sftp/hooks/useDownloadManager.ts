import { useState, useCallback } from 'react';
import type { SFTPFile, DownloadProgress } from '@/services/api';
import { sftpApi } from '@/services/api';
import { formatFileSize } from '../utils';
import type { TransferManager } from '../types';

interface UseDownloadManagerProps {
  hostId: number;
  transfer: TransferManager;
  onSuccess: (title: string, message: string, duration?: number) => void;
  onError: (title: string, message: string) => void;
}

interface UseDownloadManagerReturn {
  showDownloadProgress: boolean;
  downloadingFile: SFTPFile | null;
  downloadProgress: DownloadProgress;
  backgroundDownload: { file: SFTPFile; progress: DownloadProgress } | null;
  handleDownload: (file: SFTPFile) => Promise<void>;
  downloadFolder: (folder: SFTPFile) => Promise<void>;
  setShowDownloadProgress: (show: boolean) => void;
  setBackgroundDownload: (download: { file: SFTPFile; progress: DownloadProgress } | null) => void;
}

const INITIAL_PROGRESS: DownloadProgress = {
  progress: 0,
  bytes_transferred: 0,
  total_bytes: 0,
  speed: '',
  stage: 'init',
  message: ''
};

export function useDownloadManager({
  hostId,
  transfer,
  onSuccess,
  onError
}: UseDownloadManagerProps): UseDownloadManagerReturn {
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<SFTPFile | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(INITIAL_PROGRESS);
  const [backgroundDownload, setBackgroundDownload] = useState<{
    file: SFTPFile;
    progress: DownloadProgress;
  } | null>(null);

  // Download handling with game-style progress dialog
  const handleDownload = useCallback(async (file: SFTPFile) => {
    if (file.is_dir) {
      await downloadFolder(file);
      return;
    }
    
    // Initialize download progress dialog
    setDownloadingFile(file);
    const initialProgress: DownloadProgress = {
      progress: 0,
      bytes_transferred: 0,
      total_bytes: file.size,
      speed: '',
      stage: 'init',
      message: 'Preparing to download...'
    };
    setDownloadProgress(initialProgress);
    setBackgroundDownload({ file, progress: initialProgress });
    setShowDownloadProgress(true);
    
    const taskId = await transfer.createTransferTask('download', file.name, file.path, file.size);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    
    try {
      // Use download method with progress polling
      const { blob } = await sftpApi.downloadFileWithProgress(
        hostId,
        file.path,
        (progressInfo) => {
          // Update game-style progress dialog
          setDownloadProgress(progressInfo);
          setBackgroundDownload(prev => prev ? { ...prev, progress: progressInfo } : null);
          
          // Update task progress
          transfer.updateTransferTask(taskId, {
            progress: progressInfo.progress,
            transferred: progressInfo.bytes_transferred,
            size: progressInfo.total_bytes,
            speed: progressInfo.speed || '',
            status: progressInfo.stage === 'error' ? 'failed' :
                    progressInfo.stage === 'completed' ? 'completed' : 'transferring'
          });
          
          // If download is complete
          if (progressInfo.stage === 'completed') {
            transfer.addTransferLog('download', `✓ Download complete: ${file.name}`, file.path, 'success', file.size_formatted);
          } else if (progressInfo.stage === 'error') {
            transfer.addTransferLog('download', `✗ Download failed: ${file.name}`, progressInfo.message || 'Unknown error', 'error');
          }
        },
        file.size
      );
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Delay cleanup to ensure download has started
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      transfer.completeTransferTask(taskId, true);
      setBackgroundDownload(null); // Clear background download status
      onSuccess('Download Complete', `${file.name} downloaded successfully`);
      transfer.addTransferLog('download', `Downloaded: ${file.name}`, file.path, 'success', file.size_formatted);
    } catch (err) {
      const errorProgress: DownloadProgress = {
        ...downloadProgress,
        stage: 'error',
        message: (err as Error).message
      };
      setDownloadProgress(errorProgress);
      setBackgroundDownload(prev => prev ? { ...prev, progress: errorProgress } : null);
      transfer.completeTransferTask(taskId, false, (err as Error).message);
      transfer.addTransferLog('download', `Download failed: ${file.name}`, (err as Error).message, 'error');
      onError('Download Failed', (err as Error).message);
    }
  }, [hostId, transfer, onSuccess, onError, downloadProgress]);

  const downloadFolder = useCallback(async (folder: SFTPFile) => {
    const taskId = await transfer.createTransferTask('download', `${folder.name}.zip`, folder.path, 0);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    
    onSuccess('Download Started', `Preparing ${folder.name}.zip...`, 2000);
    
    try {
      const blob = await sftpApi.downloadFolder(
        hostId, 
        folder.path,
        (progress, transferred, total) => {
          transfer.updateTransferTask(taskId, {
            progress,
            transferred,
            size: total,
            speed: ''
          });
        }
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `${folder.name}.zip`;
      document.body.appendChild(a); 
      a.click();
      document.body.removeChild(a); 
      window.URL.revokeObjectURL(url);
      
      transfer.completeTransferTask(taskId, true);
      onSuccess('Download Complete', `${folder.name}.zip downloaded successfully`);
      transfer.addTransferLog('download', `Downloaded folder: ${folder.name}.zip`, folder.path, 'success', formatFileSize(blob.size));
    } catch (err) {
      transfer.completeTransferTask(taskId, false, (err as Error).message);
      transfer.addTransferLog('download', `Download failed: ${folder.name}`, (err as Error).message, 'error');
      onError('Download Failed', (err as Error).message);
    }
  }, [hostId, transfer, onSuccess, onError]);

  return {
    showDownloadProgress,
    downloadingFile,
    downloadProgress,
    backgroundDownload,
    handleDownload,
    downloadFolder,
    setShowDownloadProgress,
    setBackgroundDownload
  };
}

