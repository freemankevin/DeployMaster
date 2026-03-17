import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { SFTPFile, DownloadProgress } from '@/services/api';
import { sftpApi } from '@/services/api';
import { useToast } from '@/hooks/useToast';

import type { SFTPModalProps, LogFilter, WindowState } from './sftp/types';
import { useTransferManager } from './sftp/hooks/useTransferManager';
import { useSFTP } from './sftp/hooks/useSFTP';
import { useFileOperations } from './sftp/hooks/useFileOperations';
import { formatFileSize } from './sftp/utils';

import FileList from './sftp/FileList';
import TransferPanel from './sftp/TransferPanel';
import StatusBar from './sftp/StatusBar';
import { NewFolderDialog, RenameDialog, FileEditor, LoadingOverlay, ErrorOverlay } from './sftp/Dialogs';
import DownloadProgressDialog from './sftp/DownloadProgressDialog';

// Mac Terminal Style SFTP Modal
const SFTPModal = ({ host, onClose }: SFTPModalProps) => {
  const [pathInputValue, setPathInputValue] = useState('/');
  const [isPathEditing, setIsPathEditing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [activeLogFilter, setActiveLogFilter] = useState<LogFilter>('upload');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SFTPFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Download progress dialog state
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<SFTPFile | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    progress: 0,
    bytes_received: 0,
    total_bytes: 0,
    speed: '',
    stage: 'init',
    message: ''
  });
  
  // 后台下载状态 - 用于最小化后重新打开
  const [backgroundDownload, setBackgroundDownload] = useState<{
    file: SFTPFile;
    progress: DownloadProgress;
  } | null>(null);
  
  // Window state for Mac-style controls
  const [windowState, setWindowState] = useState<WindowState>({
    isMaximized: false,
    isMinimized: false
  });
  
  // Window size and position - 与终端保持一致的尺寸
  const [windowSize, setWindowSize] = useState({ width: 896, height: 600 }); // max-w-4xl ≈ 896px
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();
  
  const transfer = useTransferManager();
  const sftp = useSFTP({ hostId: host.id, onLog: transfer.addTransferLog });
  const fileOps = useFileOperations({
    hostId: host.id, currentPath: sftp.currentPath,
    onLog: transfer.addTransferLog, onSuccess: success, onError: showError, onRefresh: sftp.refresh
  });

  // Center window on mount
  useEffect(() => {
    const centerX = Math.max(0, (window.innerWidth - windowSize.width) / 2);
    const centerY = Math.max(0, (window.innerHeight - windowSize.height) / 2);
    setWindowPosition({ x: centerX, y: centerY });
  }, []);

  // Path segments
  const pathSegments = useMemo(() => {
    if (sftp.currentPath === '/') return [];
    const parts = sftp.currentPath.split('/').filter(Boolean);
    return parts.map((name, index) => ({
      name,
      path: '/' + parts.slice(0, index + 1).join('/')
    }));
  }, [sftp.currentPath]);

  // Filtered and sorted files - 目录、链接、文件分开排序
  const filteredFiles = useMemo(() => {
    let result = sftp.files;
    
    // 如果有搜索查询，先过滤
    if (searchQuery.trim()) {
      result = result.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 排序逻辑：目录 > 链接 > 文件，各自按名称排序
    const directories = result.filter(f => f.is_dir && !f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    const links = result.filter(f => f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    const files = result.filter(f => !f.is_dir && !f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    
    return [...directories, ...links, ...files];
  }, [sftp.files, searchQuery]);

  // Window controls - 与终端保持一致
  const handleMinimize = () => {
    setWindowState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
    if (!windowState.isMinimized) {
      // 最小化时保持宽度，只显示标题栏
      setWindowSize(prev => ({ width: prev.width, height: 40 }));
    } else {
      // Restore - 与终端一致
      setWindowSize({ width: 896, height: 600 });
      const centerX = Math.max(0, (window.innerWidth - 896) / 2);
      const centerY = Math.max(0, (window.innerHeight - 600) / 2);
      setWindowPosition({ x: centerX, y: centerY });
    }
  };

  const handleMaximize = () => {
    setWindowState(prev => ({ ...prev, isMaximized: !prev.isMaximized }));
    if (!windowState.isMaximized) {
      // 全屏模式 - 与终端一致，使用 inset-4 的边距
      setWindowSize({
        width: window.innerWidth - 32,
        height: window.innerHeight - 32
      });
      setWindowPosition({ x: 16, y: 16 });
    } else {
      // Restore - 与终端一致
      setWindowSize({ width: 896, height: 600 });
      const centerX = Math.max(0, (window.innerWidth - 896) / 2);
      const centerY = Math.max(0, (window.innerHeight - 600) / 2);
      setWindowPosition({ x: centerX, y: centerY });
    }
  };

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current || (e.target as HTMLElement).closest('.window-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - windowPosition.x,
        y: e.clientY - windowPosition.y
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setWindowPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Path editing
  const handlePathEdit = () => {
    setPathInputValue(sftp.currentPath);
    setIsPathEditing(true);
    setTimeout(() => pathInputRef.current?.focus(), 0);
  };

  const handlePathConfirm = () => {
    const newPath = pathInputValue.trim();
    if (newPath && newPath !== sftp.currentPath) {
      sftp.navigateTo(newPath);
    }
    setIsPathEditing(false);
  };

  const handlePathKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePathConfirm();
    else if (e.key === 'Escape') setIsPathEditing(false);
  };

  // File click handling
  const handleFileClick = useCallback(async (file: SFTPFile) => {
    if (file.is_dir) {
      sftp.navigateTo(file.path);
    } else {
      const content = await fileOps.readFile(file);
      if (content !== null) setShowFileEditor(true);
    }
  }, [sftp.navigateTo, fileOps.readFile]);

  // File selection
  const toggleFileSelection = useCallback((path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) newSelected.delete(path);
    else newSelected.add(path);
    setSelectedFiles(newSelected);
  }, [selectedFiles]);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedFiles(selected ? new Set(filteredFiles.map(f => f.path)) : new Set());
  }, [filteredFiles]);

  // 生成唯一上传ID
  const generateUploadId = () => Math.random().toString(36).substring(2, 10);

  // Upload handling with progress notification
  const handleUpload = () => fileInputRef.current?.click();
  const handleUploadFolder = () => folderInputRef.current?.click();

  // Upload single file with real progress tracking
  const uploadFileWithProgress = async (file: File, relativePath?: string): Promise<boolean> => {
    const uploadId = generateUploadId();
    const taskId = transfer.createTransferTask('upload', file.name, `${sftp.currentPath}/${relativePath || file.name}`, file.size);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    transfer.addTransferLog('upload', `Starting upload: ${relativePath || file.name}`, `${sftp.currentPath}/${relativePath || file.name}`, 'info', formatFileSize(file.size));

    // Start progress polling
    let progressInterval: number | null = null;
    let lastStage = '';
    let isCompleted = false;
    
    const startProgressPolling = () => {
      progressInterval = window.setInterval(async () => {
        try {
          const result = await sftpApi.getUploadProgress(uploadId);
          if (result.success && result.progress) {
            const { progress, stage, message, speed, bytes_sent, total_bytes } = result.progress;
            
            // Calculate transferred bytes based on progress percentage
            const transferred = file.size > 0 ? Math.round((progress / 100) * file.size) : (bytes_sent || 0);
            
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
                transfer.addTransferLog('upload', `Received, transferring to server...`, `${sftp.currentPath}/${relativePath || file.name}`, 'info');
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
                transfer.addTransferLog('upload', `✓ Upload success: ${relativePath || file.name}`, `${sftp.currentPath}/${relativePath || file.name}`, 'success', formatFileSize(file.size));
              } else if (stage === 'error' && !isCompleted) {
                isCompleted = true;
                transfer.completeTransferTask(taskId, false, message);
                transfer.addTransferLog('error', `✗ Upload failed: ${relativePath || file.name}`, message || 'Upload failed', 'error');
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
      const response = await sftpApi.uploadFile(host.id, sftp.currentPath, file, relativePath, uploadId);
      
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
        transfer.addTransferLog('upload', `✓ Upload success: ${relativePath || file.name}`, `${sftp.currentPath}/${relativePath || file.name}`, 'success', formatFileSize(file.size));
        return true;
      } else {
        transfer.completeTransferTask(taskId, false, response.message);
        transfer.addTransferLog('error', `✗ Upload failed: ${relativePath || file.name}`, response.message || 'Upload failed', 'error');
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
      transfer.addTransferLog('error', `✗ Upload failed: ${relativePath || file.name}`, (err as Error).message, 'error');
      return false;
    }
  };

  const handleUploadFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if it's a folder upload (via webkitRelativePath)
    const isFolderUpload = files[0].webkitRelativePath && files[0].webkitRelativePath.includes('/');
    
    if (isFolderUpload) {
      // Handle folder upload
      const rootFolderName = files[0].webkitRelativePath?.split('/')[0] || 'upload';
      success('Upload Started', `Uploading folder "${rootFolderName}"...`, 3000);
      
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
        success('Upload Complete', `Folder "${rootFolderName}" uploaded (${successCount} files)`);
      } else {
        showError('Partial Upload Failed', `${successCount} files uploaded, ${failCount} failed`);
      }
    } else {
      // Handle regular file upload
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFileWithProgress(file);
        if (result) {
          success('Upload Complete', `${file.name} uploaded successfully`);
        } else {
          showError('Upload Failed', `${file.name} upload failed`);
        }
      }
    }
    
    sftp.refresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // Handle drag and drop upload
  const handleDropUpload = async (items: DataTransferItemList) => {
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
    const collectFiles = async (entry: FileSystemEntry, basePath: string = ''): Promise<{ file: File; relativePath: string }[]> => {
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
    
    // Collect all files
    const allFiles: { file: File; relativePath: string }[] = [];
    for (const entry of entries) {
      const files = await collectFiles(entry);
      allFiles.push(...files);
    }
    
    if (allFiles.length === 0) {
      showError('No Files', 'No files found to upload');
      return;
    }
    
    // Show upload start notification
    success('Upload Started', `Uploading ${allFiles.length} files...`, 3000);
    
    let successCount = 0;
    let failCount = 0;
    
    // Upload all files (with real progress tracking)
    for (const { file, relativePath } of allFiles) {
      const result = await uploadFileWithProgress(file, relativePath);
      if (result) successCount++;
      else failCount++;
    }
    
    if (failCount === 0) {
      success('Upload Complete', `${successCount} files uploaded successfully`);
    } else {
      showError('Partial Upload Failed', `${successCount} files uploaded, ${failCount} failed`);
    }
    
    sftp.refresh();
  };

  // Drag and drop upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    await handleDropUpload(items);
  };

  // Download handling with game-style progress dialog
  const handleDownload = async (file: SFTPFile) => {
    if (file.is_dir) {
      await downloadFolder(file);
      return;
    }
    
    // 初始化下载进度弹窗
    setDownloadingFile(file);
    const initialProgress: DownloadProgress = {
      progress: 0,
      bytes_received: 0,
      total_bytes: file.size,
      speed: '',
      stage: 'init',
      message: '准备下载...'
    };
    setDownloadProgress(initialProgress);
    setBackgroundDownload({ file, progress: initialProgress });
    setShowDownloadProgress(true);
    
    const taskId = transfer.createTransferTask('download', file.name, file.path, file.size);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    
    try {
      // 使用带进度轮询的下载方法
      const { blob } = await sftpApi.downloadFileWithProgress(
        host.id,
        file.path,
        (progressInfo) => {
          // 更新游戏风格进度弹窗
          setDownloadProgress(progressInfo);
          setBackgroundDownload(prev => prev ? { ...prev, progress: progressInfo } : null);
          
          // 更新任务进度
          transfer.updateTransferTask(taskId, {
            progress: progressInfo.progress,
            transferred: progressInfo.bytes_received,
            size: progressInfo.total_bytes,
            speed: progressInfo.speed || '',
            status: progressInfo.stage === 'error' ? 'failed' :
                    progressInfo.stage === 'completed' ? 'completed' : 'transferring'
          });
          
          // 如果下载完成
          if (progressInfo.stage === 'completed') {
            transfer.addTransferLog('download', `✓ Download complete: ${file.name}`, file.path, 'success', file.size_formatted);
          } else if (progressInfo.stage === 'error') {
            transfer.addTransferLog('download', `✗ Download failed: ${file.name}`, progressInfo.message || 'Unknown error', 'error');
          }
        },
        file.size
      );
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // 延迟清理，确保下载已开始
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      transfer.completeTransferTask(taskId, true);
      setBackgroundDownload(null); // 清理后台下载状态
      success('Download Complete', `${file.name} downloaded successfully`);
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
      showError('Download Failed', (err as Error).message);
    }
  };

  const downloadFolder = async (folder: SFTPFile) => {
    const taskId = transfer.createTransferTask('download', `${folder.name}.zip`, folder.path, 0);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    
    success('Download Started', `Preparing ${folder.name}.zip...`, 2000);
    
    try {
      const blob = await sftpApi.downloadFolder(
        host.id, 
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
      success('Download Complete', `${folder.name}.zip downloaded successfully`);
      transfer.addTransferLog('download', `Downloaded folder: ${folder.name}.zip`, folder.path, 'success', formatFileSize(blob.size));
    } catch (err) {
      transfer.completeTransferTask(taskId, false, (err as Error).message);
      transfer.addTransferLog('download', `Download failed: ${folder.name}`, (err as Error).message, 'error');
      showError('Download Failed', (err as Error).message);
    }
  };

  // Folder creation
  const handleCreateFolder = async () => {
    if (await fileOps.createFolder(newFolderName)) {
      setShowNewFolderDialog(false);
      setNewFolderName('');
    }
  };

  // Rename
  const handleRename = async () => {
    if (!renameTarget) return;
    if (await fileOps.renameFile(renameTarget, newFileName)) {
      setShowRenameDialog(false);
      setRenameTarget(null);
      setNewFileName('');
    }
  };

  // Save file
  const handleSaveAndClose = async () => {
    if (await fileOps.saveFile()) {
      setShowFileEditor(false);
      fileOps.closeEditor();
    }
  };

  // Clear filter
  const clearFilter = () => {
    setSearchQuery('');
    setShowFilter(false);
  };

  const activeTransfers = transfer.transferTasks.filter(t => t.status === 'transferring').length;

  // Don't render if minimized (Mac style - show only title bar)
  if (windowState.isMinimized) {
    return (
      <>
        <LoadingOverlay isOpen={sftp.connecting} hostName={host.name} />
        <ErrorOverlay isOpen={!!sftp.error && !sftp.files.length} error={sftp.error} onClose={onClose} />
        
        {!sftp.connecting && (!sftp.error || sftp.files.length > 0) && (
          <div 
            className="fixed z-50 animate-fade-in"
            style={{ 
              left: windowPosition.x, 
              top: windowPosition.y,
              width: windowSize.width
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Minimized Title Bar - Mac Style - 与终端一致 */}
            <div className="window-header bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] rounded-lg shadow-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center px-3 py-2">
                {/* Mac Window Controls - 与终端一致 */}
                <div className="flex items-center gap-2 mr-4">
                  <button
                    onClick={onClose}
                    className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors flex items-center justify-center group"
                  >
                    <svg className="w-2 h-2 text-[#990000] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleMinimize}
                    className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors flex items-center justify-center group"
                  >
                    <svg className="w-2 h-2 text-[#985700] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                      <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleMaximize}
                    className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors flex items-center justify-center group"
                  >
                    <svg className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                      <path d="M2 5l4-4 4 4M2 7l4 4 4-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                <span className="text-xs text-gray-400 font-medium">SFTP - {host.name}</span>
                
                <div className="flex-1" />
                
                <button
                  onClick={handleMinimize}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <LoadingOverlay isOpen={sftp.connecting} hostName={host.name} />
      <ErrorOverlay isOpen={!!sftp.error && !sftp.files.length} error={sftp.error} onClose={onClose} />

      {!sftp.connecting && (!sftp.error || sftp.files.length > 0) && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            ref={modalRef}
            className="bg-[#1e1e1e]/95 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col overflow-hidden border border-white/10 sftp-font"
            style={{
              width: windowSize.width,
              height: windowSize.height,
              position: 'absolute',
              left: windowPosition.x,
              top: windowPosition.y,
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseDown={handleMouseDown}
          >
            
            {/* Mac Style Title Bar - 与终端一致 */}
            <div className="window-header flex items-center px-4 py-3 bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] border-b border-white/5">
              {/* Mac Window Controls - 与终端一致 */}
              <div className="flex items-center gap-2 mr-4">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors flex items-center justify-center group"
                  title="Close"
                >
                  <svg className="w-2 h-2 text-[#990000] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  onClick={handleMinimize}
                  className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors flex items-center justify-center group"
                  title="Minimize"
                >
                  <svg className="w-2 h-2 text-[#985700] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                    <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  onClick={handleMaximize}
                  className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors flex items-center justify-center group"
                  title={windowState.isMaximized ? "Restore" : "Maximize"}
                >
                  <svg className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                    <path d="M2 5l4-4 4 4M2 7l4 4 4-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Path Navigation */}
              {isPathEditing ? (
                <input
                  ref={pathInputRef}
                  type="text"
                  value={pathInputValue}
                  onChange={(e) => setPathInputValue(e.target.value)}
                  onKeyDown={handlePathKeyDown}
                  onBlur={() => setIsPathEditing(false)}
                  className="flex-1 bg-[#1e1e1e] border border-white/20 rounded px-3 py-1 text-[13px] text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                <div
                  className="flex items-center flex-1 overflow-hidden"
                  onDoubleClick={handlePathEdit}
                >
                  {/* Home icon - Navigate to root */}
                  <button
                    onClick={() => sftp.navigateTo('/')}
                    className="text-blue-400 hover:text-blue-300 mr-2 flex items-center"
                    title="Go to root directory"
                  >
                    <i className="fa-solid fa-house text-xs" />
                  </button>
                  {pathSegments.map((segment) => (
                    <span key={segment.path} className="flex items-center text-xs">
                      <span className="text-gray-500 mx-1">/</span>
                      <button
                        onClick={() => sftp.navigateTo(segment.path)}
                        className="text-gray-300 hover:text-white hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {segment.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex-1" onDoubleClick={handlePathEdit} />

              {/* Toolbar Buttons */}
              <div className="flex items-center gap-0.5">
                {!showFilter && (
                  <button
                    onClick={() => setShowFilter(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                    title="Filter files"
                  >
                    <i className="fa-solid fa-filter text-[11px]" />
                    <span>Filter</span>
                  </button>
                )}

                <button
                  onClick={() => setShowNewFolderDialog(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                  title="Create new folder"
                >
                  <i className="fa-solid fa-folder-plus text-[11px]" />
                  <span>New</span>
                </button>

                {/* Upload with dropdown menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUploadMenu(!showUploadMenu)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                    title="Upload files or folder"
                  >
                    <i className="fa-solid fa-upload text-[11px]" />
                    <span>Upload</span>
                    <i className="fa-solid fa-chevron-down text-[8px] ml-0.5" />
                  </button>
                  
                  {showUploadMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowUploadMenu(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-white/10 rounded-md shadow-xl z-20 min-w-[140px] py-1">
                        <button
                          onClick={() => { handleUpload(); setShowUploadMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ti ti-file-upload text-base" />
                          </span>
                          <span>Upload Files</span>
                        </button>
                        <button
                          onClick={() => { handleUploadFolder(); setShowUploadMenu(false); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                        >
                          <span className="w-4 h-4 flex items-center justify-center">
                            <i className="ti ti-folder-up text-sm" />
                          </span>
                          <span>Upload Folder</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setShowTransferPanel(!showTransferPanel)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    showTransferPanel ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="Transfer history"
                >
                  <i className="fa-solid fa-right-left text-[11px]" />
                  <span>Transfer</span>
                  {activeTransfers > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            {showFilter && (
              <div className="flex items-center px-4 py-2 bg-[#1e1e1e] border-b border-white/5">
                <div className="flex items-center w-full">
                  <div className="flex-1 min-w-0 border border-[#3a3a3a] rounded-l overflow-hidden focus-within:border-[#00d4aa] transition-colors">
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-[13px] text-gray-200 placeholder-gray-500 px-3 py-1.5 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={clearFilter}
                    className="shrink-0 px-2 text-gray-400 hover:text-gray-200 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-r border border-l-0 border-[#3a3a3a] transition-colors flex items-center justify-center self-stretch"
                    title="Close filter"
                  >
                    <i className="fa-solid fa-xmark text-[10px]" />
                  </button>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              <div 
                className={`flex-1 overflow-auto bg-[#0d0d0d]/50 scrollbar-custom ${isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDragOver && (
                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-[#1e1e1e] px-6 py-4 rounded-lg shadow-lg border border-blue-500/30">
                      <div className="flex items-center gap-3 text-blue-400">
                        <i className="fa-solid fa-cloud-arrow-up text-2xl" />
                        <span className="text-base font-medium">Drop to upload</span>
                      </div>
                    </div>
                  </div>
                )}

                <FileList
                  files={filteredFiles}
                  loading={sftp.loading}
                  currentPath={sftp.currentPath}
                  selectedFiles={selectedFiles}
                  searchQuery={searchQuery}
                  onFileClick={handleFileClick}
                  onFileSelect={toggleFileSelection}
                  onSelectAll={handleSelectAll}
                  onDownload={handleDownload}
                  onRename={(file) => { setRenameTarget(file); setNewFileName(file.name); setShowRenameDialog(true); }}
                  onDelete={fileOps.deleteFile}
                  onNavigate={sftp.navigateTo}
                  onGoUp={sftp.goUp}
                />
              </div>

              {/* Transfer Panel */}
              {showTransferPanel && (
                <TransferPanel
                  transferTasks={transfer.transferTasks}
                  transferLogs={transfer.transferLogs}
                  activeLogFilter={activeLogFilter}
                  onFilterChange={setActiveLogFilter}
                  onClearLogs={transfer.clearLogs}
                  onClearLogsByFilter={transfer.clearLogsByFilter}
                  onPauseTask={transfer.pauseTransferTask}
                  onResumeTask={(taskId) => {
                    const task = transfer.transferTasks.find(t => t.id === taskId);
                    if (task) transfer.resumeTransferTask(taskId, task.size);
                  }}
                  onCancelTask={transfer.cancelTransferTask}
                  onRestoreDownload={() => {
                    if (backgroundDownload) {
                      setDownloadingFile(backgroundDownload.file);
                      setDownloadProgress(backgroundDownload.progress);
                      setShowDownloadProgress(true);
                    }
                  }}
                  hasBackgroundDownload={!!backgroundDownload && !showDownloadProgress &&
                    (backgroundDownload.progress.stage === 'downloading' || backgroundDownload.progress.stage === 'init')}
                  backgroundDownloadProgress={backgroundDownload?.progress.progress || 0}
                  backgroundDownloadSpeed={backgroundDownload?.progress.speed || ''}
                  backgroundDownloadFilename={backgroundDownload?.file.name || ''}
                />
              )}
            </div>

            {/* Status Bar */}
            <StatusBar
              fileCount={filteredFiles.length}
              selectedCount={selectedFiles.size}
              searchQuery={searchQuery}
              activeTransfers={activeTransfers}
              hostAddress={host.address}
            />
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" multiple onChange={handleUploadFileSelect} className="hidden" />
      <input ref={folderInputRef} type="file" {...{ webkitdirectory: '', directory: '' }} multiple onChange={handleUploadFileSelect} className="hidden" />

      {/* Dialogs */}
      <NewFolderDialog
        isOpen={showNewFolderDialog}
        folderName={newFolderName}
        onNameChange={setNewFolderName}
        onCreate={handleCreateFolder}
        onCancel={() => { setShowNewFolderDialog(false); setNewFolderName(''); }}
      />
      <RenameDialog
        isOpen={showRenameDialog}
        target={renameTarget}
        newName={newFileName}
        onNameChange={setNewFileName}
        onRename={handleRename}
        onCancel={() => { setShowRenameDialog(false); setRenameTarget(null); setNewFileName(''); }}
      />
      <FileEditor
        isOpen={showFileEditor}
        file={fileOps.editingFile}
        content={fileOps.fileContent}
        saving={fileOps.saving}
        onContentChange={fileOps.setFileContent}
        onSave={handleSaveAndClose}
        onClose={() => { setShowFileEditor(false); fileOps.closeEditor(); }}
      />
      
      {/* Game-style Download Progress Dialog */}
      <DownloadProgressDialog
        isOpen={showDownloadProgress}
        filename={downloadingFile?.name || ''}
        fileSize={downloadingFile?.size || 0}
        progress={downloadProgress}
        onClose={() => {
          setShowDownloadProgress(false);
          setDownloadingFile(null);
          setBackgroundDownload(null);
        }}
        onMinimize={() => {
          setShowDownloadProgress(false);
          // 下载会在后台继续进行，保留 backgroundDownload 状态
        }}
      />
      
      {/* 后台下载指示器 - 最小化后显示 */}
      {backgroundDownload && !showDownloadProgress &&
       (backgroundDownload.progress.stage === 'downloading' || backgroundDownload.progress.stage === 'init') && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-up cursor-pointer"
          onClick={() => {
            setDownloadingFile(backgroundDownload.file);
            setDownloadProgress(backgroundDownload.progress);
            setShowDownloadProgress(true);
          }}
        >
          <div className="bg-gradient-to-r from-blue-600/90 to-cyan-600/90 backdrop-blur-xl rounded-full px-5 py-2.5 shadow-lg border border-white/20 flex items-center gap-3 hover:scale-105 transition-transform">
            {/* 下载图标 */}
            <div className="relative">
              <i className="fa-solid fa-cloud-arrow-down text-white text-lg" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            
            {/* 进度信息 */}
            <div className="flex items-center gap-3 text-white">
              <span className="text-sm font-medium max-w-[150px] truncate">
                {backgroundDownload.file.name}
              </span>
              <span className="text-sm font-bold">
                {Math.round(backgroundDownload.progress.progress)}%
              </span>
            </div>
            
            {/* 进度条 */}
            <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${backgroundDownload.progress.progress}%` }}
              />
            </div>
            
            {/* 速度 */}
            {backgroundDownload.progress.speed && (
              <span className="text-xs text-white/80">
                {backgroundDownload.progress.speed}
              </span>
            )}
            
            {/* 点击提示 */}
            <span className="text-xs text-white/60 ml-2">
              点击查看
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default SFTPModal;
