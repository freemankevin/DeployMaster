import { useState, useRef, useCallback, useMemo } from 'react';
import type { SFTPFile } from '@/services/api';
import { useToast } from '@/hooks/useToast';

import type { SFTPModalProps, LogFilter } from './sftp/types';
import { 
  useTransferManager, 
  useSFTP, 
  useFileOperations,
  useWindowState,
  useUploadManager,
  useDownloadManager
} from './sftp';

import { 
  FileList, 
  TransferPanel, 
  StatusBar,
  WindowHeader,
  Toolbar,
  MinimizedView,
  BackgroundDownloadIndicator,
  NewFolderDialog, 
  RenameDialog, 
  FileEditor, 
  LoadingOverlay, 
  ErrorOverlay 
} from './sftp';
import DownloadProgressDialog from './sftp/DownloadProgressDialog';

// Mac Terminal Style SFTP Modal
const SFTPModal = ({ host, onClose }: SFTPModalProps) => {
  // UI State
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
  
  const pathInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();
  
  // Custom hooks
  const transfer = useTransferManager();
  const sftp = useSFTP({ hostId: host.id, onLog: transfer.addTransferLog });
  const fileOps = useFileOperations({
    hostId: host.id, 
    currentPath: sftp.currentPath,
    onLog: transfer.addTransferLog, 
    onSuccess: success, 
    onError: showError, 
    onRefresh: sftp.refresh
  });
  const window = useWindowState();
  const upload = useUploadManager({
    hostId: host.id,
    currentPath: sftp.currentPath,
    transfer,
    onSuccess: success,
    onError: showError,
    onRefresh: sftp.refresh
  });
  const download = useDownloadManager({
    hostId: host.id,
    transfer,
    onSuccess: success,
    onError: showError
  });

  // Path segments
  const pathSegments = useMemo(() => {
    if (sftp.currentPath === '/') return [];
    const parts = sftp.currentPath.split('/').filter(Boolean);
    return parts.map((name, index) => ({
      name,
      path: '/' + parts.slice(0, index + 1).join('/')
    }));
  }, [sftp.currentPath]);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    let result = sftp.files;
    
    if (searchQuery.trim()) {
      result = result.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sorting: directories > links > files
    const directories = result.filter(f => f.is_dir && !f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    const links = result.filter(f => f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    const files = result.filter(f => !f.is_dir && !f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    
    return [...directories, ...links, ...files];
  }, [sftp.files, searchQuery]);

  // Path editing handlers
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

  // Drag and drop handlers
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

    await upload.handleDropUpload(items);
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

  // Minimized view
  if (window.windowState.isMinimized) {
    return (
      <MinimizedView
        hostName={host.name}
        windowPosition={window.windowPosition}
        windowSize={{ width: window.windowSize.width }}
        connecting={sftp.connecting}
        error={sftp.error}
        onClose={onClose}
        onMinimize={window.handleMinimize}
        onMaximize={window.handleMaximize}
        onMouseDown={window.handleMouseDown}
      />
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
            ref={window.modalRef}
            className="bg-[#1e1e1e]/95 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col overflow-hidden border border-white/10 sftp-font"
            style={{
              width: window.windowSize.width,
              height: window.windowSize.height,
              position: 'absolute',
              left: window.windowPosition.x,
              top: window.windowPosition.y,
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onMouseDown={window.handleMouseDown}
          >
            {/* Mac Style Title Bar */}
            <WindowHeader
              hostName={host.name}
              isPathEditing={isPathEditing}
              pathInputValue={pathInputValue}
              pathInputRef={pathInputRef}
              pathSegments={pathSegments}
              onPathChange={setPathInputValue}
              onPathConfirm={handlePathConfirm}
              onPathKeyDown={handlePathKeyDown}
              onPathEdit={handlePathEdit}
              onNavigateTo={sftp.navigateTo}
              onClose={onClose}
              onMinimize={window.handleMinimize}
              onMaximize={window.handleMaximize}
              isMaximized={window.windowState.isMaximized}
            />

            {/* Toolbar */}
            <div className="flex items-center px-4 py-2 bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] border-b border-white/5">
              <div className="flex-1" />
              <Toolbar
                showFilter={showFilter}
                showUploadMenu={showUploadMenu}
                showTransferPanel={showTransferPanel}
                searchQuery={searchQuery}
                activeTransfers={activeTransfers}
                activeLogFilter={activeLogFilter}
                onShowFilter={() => setShowFilter(true)}
                onHideFilter={() => setShowFilter(false)}
                onSearchChange={setSearchQuery}
                onClearFilter={clearFilter}
                onNewFolder={() => setShowNewFolderDialog(true)}
                onUpload={upload.handleUpload}
                onUploadFolder={upload.handleUploadFolder}
                onToggleUploadMenu={() => setShowUploadMenu(!showUploadMenu)}
                onCloseUploadMenu={() => setShowUploadMenu(false)}
                onToggleTransferPanel={() => setShowTransferPanel(!showTransferPanel)}
              />
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
                  onDownload={download.handleDownload}
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
                    if (download.backgroundDownload) {
                      download.setShowDownloadProgress(true);
                    }
                  }}
                  hasBackgroundDownload={!!download.backgroundDownload && !download.showDownloadProgress &&
                    (download.backgroundDownload.progress.stage === 'downloading' || download.backgroundDownload.progress.stage === 'init')}
                  backgroundDownloadProgress={download.backgroundDownload?.progress.progress || 0}
                  backgroundDownloadSpeed={download.backgroundDownload?.progress.speed || ''}
                  backgroundDownloadFilename={download.backgroundDownload?.file.name || ''}
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
      <input 
        ref={upload.fileInputRef} 
        type="file" 
        multiple 
        onChange={upload.handleUploadFileSelect} 
        className="hidden" 
      />
      <input 
        ref={upload.folderInputRef} 
        type="file" 
        {...{ webkitdirectory: '', directory: '' }} 
        multiple 
        onChange={upload.handleUploadFileSelect} 
        className="hidden" 
      />

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
      
      {/* Download Progress Dialog */}
      <DownloadProgressDialog
        isOpen={download.showDownloadProgress}
        filename={download.downloadingFile?.name || ''}
        fileSize={download.downloadingFile?.size || 0}
        progress={download.downloadProgress}
        onClose={() => {
          download.setShowDownloadProgress(false);
          download.setBackgroundDownload(null);
        }}
        onMinimize={() => {
          download.setShowDownloadProgress(false);
        }}
      />
      
      {/* Background download indicator */}
      <BackgroundDownloadIndicator
        backgroundDownload={download.backgroundDownload}
        showDownloadProgress={download.showDownloadProgress}
        onRestore={() => {
          if (download.backgroundDownload) {
            download.setShowDownloadProgress(true);
          }
        }}
      />
    </>
  );
};

export default SFTPModal;
