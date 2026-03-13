import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { SFTPFile } from '@/services/api';
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

// Mac Terminal Style SFTP Modal
const SFTPModal = ({ host, onClose }: SFTPModalProps) => {
  const [pathInputValue, setPathInputValue] = useState('/');
  const [isPathEditing, setIsPathEditing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [activeLogFilter, setActiveLogFilter] = useState<LogFilter>('all');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SFTPFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
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

  // 上传单个文件（带真实进度追踪）
  const uploadFileWithProgress = async (file: File, relativePath?: string): Promise<boolean> => {
    const uploadId = generateUploadId();
    const taskId = transfer.createTransferTask('upload', file.name, `${sftp.currentPath}/${relativePath || file.name}`, file.size);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    transfer.addTransferLog('upload', `开始上传: ${relativePath || file.name}`, `${sftp.currentPath}/${relativePath || file.name}`, 'info', formatFileSize(file.size));

    // 启动进度轮询
    let progressInterval: number | null = null;
    const startProgressPolling = () => {
      progressInterval = window.setInterval(async () => {
        try {
          const result = await sftpApi.getUploadProgress(uploadId);
          if (result.success && result.progress) {
            const { progress, stage, message, speed } = result.progress;
            transfer.updateTransferTask(taskId, {
              progress,
              speed: speed || '',
              // 根据阶段显示不同的状态
              status: stage === 'error' ? 'failed' : 'transferring'
            });
            
            // 如果完成或出错，停止轮询
            if (stage === 'completed' || stage === 'error') {
              if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
              }
            }
          }
        } catch (e) {
          // 轮询错误时忽略
        }
      }, 500); // 每500ms轮询一次
    };

    try {
      // 启动进度轮询
      startProgressPolling();
      
      // 发起上传请求
      const response = await sftpApi.uploadFile(host.id, sftp.currentPath, file, relativePath, uploadId);
      
      // 停止轮询
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      if (response.success) {
        transfer.completeTransferTask(taskId, true);
        transfer.updateTransferTask(taskId, { progress: 100 });
        transfer.addTransferLog('upload', `上传成功: ${relativePath || file.name}`, `${sftp.currentPath}/${relativePath || file.name}`, 'success', formatFileSize(file.size));
        return true;
      } else {
        transfer.completeTransferTask(taskId, false, response.message);
        transfer.addTransferLog('error', `上传失败: ${relativePath || file.name}`, response.message || '上传失败', 'error');
        return false;
      }
    } catch (err) {
      // 停止轮询
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      transfer.completeTransferTask(taskId, false, (err as Error).message);
      transfer.addTransferLog('error', `上传失败: ${relativePath || file.name}`, (err as Error).message, 'error');
      return false;
    }
  };

  const handleUploadFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查是否是文件夹上传（通过 webkitRelativePath 判断）
    const isFolderUpload = files[0].webkitRelativePath && files[0].webkitRelativePath.includes('/');
    
    if (isFolderUpload) {
      // 处理文件夹上传
      const rootFolderName = files[0].webkitRelativePath?.split('/')[0] || 'upload';
      success('开始上传', `正在上传文件夹 "${rootFolderName}"...`, 3000);
      
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
        success('上传完成', `文件夹 "${rootFolderName}" 上传成功 (${successCount} 个文件)`);
      } else {
        showError('部分上传失败', `${successCount} 个文件上传成功，${failCount} 个失败`);
      }
    } else {
      // 处理普通文件上传
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFileWithProgress(file);
        if (result) {
          success('上传完成', `${file.name} 上传成功`);
        } else {
          showError('上传失败', `${file.name} 上传失败`);
        }
      }
    }
    
    sftp.refresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // 处理拖拽上传的目录
  const handleDropUpload = async (items: DataTransferItemList) => {
    const entries: FileSystemEntry[] = [];
    
    // 收集所有条目
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
    
    // 收集所有文件（包括目录中的文件）
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
    
    // 收集所有文件
    const allFiles: { file: File; relativePath: string }[] = [];
    for (const entry of entries) {
      const files = await collectFiles(entry);
      allFiles.push(...files);
    }
    
    if (allFiles.length === 0) {
      showError('无文件', '未找到可上传的文件');
      return;
    }
    
    // 显示开始上传通知
    success('开始上传', `正在上传 ${allFiles.length} 个文件...`, 3000);
    
    let successCount = 0;
    let failCount = 0;
    
    // 上传所有文件（使用真实进度追踪）
    for (const { file, relativePath } of allFiles) {
      const result = await uploadFileWithProgress(file, relativePath);
      if (result) successCount++;
      else failCount++;
    }
    
    if (failCount === 0) {
      success('上传完成', `${successCount} 个文件上传成功`);
    } else {
      showError('部分上传失败', `${successCount} 个文件上传成功，${failCount} 个失败`);
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

  // Download handling
  const handleDownload = async (file: SFTPFile) => {
    if (file.is_dir) {
      await downloadFolder(file);
      return;
    }
    
    const taskId = transfer.createTransferTask('download', file.name, file.path, file.size);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    const stopProgress = transfer.simulateTransferProgress(taskId, file.size);
    
    success('Download Started', `${file.name} (${file.size_formatted})`, 2000);
    
    try {
      const blob = await sftpApi.downloadFile(host.id, file.path);
      stopProgress();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      transfer.completeTransferTask(taskId, true);
      success('Download Complete', `${file.name} downloaded successfully`);
      transfer.addTransferLog('download', `Downloaded: ${file.name}`, file.path, 'success', file.size_formatted);
    } catch (err) {
      transfer.completeTransferTask(taskId, false, (err as Error).message);
      transfer.addTransferLog('error', `Download failed: ${file.name}`, (err as Error).message, 'error');
      showError('Download Failed', (err as Error).message);
    }
  };

  const downloadFolder = async (folder: SFTPFile) => {
    const taskId = transfer.createTransferTask('download', `${folder.name}.zip`, folder.path, 0);
    transfer.updateTransferTask(taskId, { status: 'transferring' });
    
    success('Download Started', `Preparing ${folder.name}.zip...`, 2000);
    
    try {
      const blob = await sftpApi.downloadFolder(host.id, folder.path);
      transfer.updateTransferTask(taskId, { size: blob.size });
      const stopProgress = transfer.simulateTransferProgress(taskId, blob.size);
      stopProgress();
      
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
      transfer.addTransferLog('error', `Download failed: ${folder.name}`, (err as Error).message, 'error');
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
                  {/* 硬盘图标 - 跳转到根目录 */}
                  <button
                    onClick={() => sftp.navigateTo('/')}
                    className="text-blue-400 hover:text-blue-300 mr-2 flex items-center"
                    title="跳转到根目录"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V9c0-2-1-3-3-3h-5l-2-3H7c-2 0-3 1-3 3z" />
                    </svg>
                  </button>
                  {/* 刷新按钮 */}
                  <button
                    onClick={sftp.refresh}
                    className="text-gray-400 hover:text-gray-200 mr-2 flex items-center transition-colors"
                    title="刷新当前目录"
                    disabled={sftp.loading}
                  >
                    <svg className={`w-3.5 h-3.5 ${sftp.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
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

              {/* Toolbar Buttons - 缩小尺寸与左侧一致 */}
              <div className="flex items-center gap-0.5">
                {!showFilter && (
                  <button
                    onClick={() => setShowFilter(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                    title="筛选文件"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>筛选</span>
                  </button>
                )}

                <button
                  onClick={() => setShowNewFolderDialog(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                  title="新建文件夹"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>新建</span>
                </button>

                <button
                  onClick={handleUpload}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                  title="上传文件"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>上传</span>
                </button>

                <button
                  onClick={handleUploadFolder}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                  title="上传文件夹"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>文件夹</span>
                </button>

                <button
                  onClick={() => setShowTransferPanel(!showTransferPanel)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    showTransferPanel ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="传输历史"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>传输</span>
                  {activeTransfers > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            {showFilter && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border-b border-white/5">
                <div className="flex items-center flex-1 bg-[#2a2a2a] rounded-lg px-3 py-1.5 border border-white/10">
                  <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Filter files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-gray-200 placeholder-gray-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-gray-500 hover:text-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={clearFilter}
                  className="px-3 py-1.5 text-[13px] text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              <div 
                className={`flex-1 overflow-auto bg-[#0d0d0d]/50 ${isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDragOver && (
                  <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-[#1e1e1e] px-6 py-4 rounded-lg shadow-lg border border-blue-500/30">
                      <div className="flex items-center gap-3 text-blue-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
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
    </>
  );
};

export default SFTPModal;
