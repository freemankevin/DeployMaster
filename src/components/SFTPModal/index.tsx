import { useEffect } from 'react';
import type { SFTPModalProps } from '../sftp/types';
import { useSFTPModal } from './useSFTPModal';
import {
  FileList,
  TransferPanel,
  StatusBar,
  WindowHeader,
  NewFolderDialog,
  RenameDialog,
  FileEditor,
  LoadingOverlay,
  ErrorOverlay,
  UploadProgressDialog
} from '../sftp';
import DownloadProgressDialog from '../sftp/DownloadProgressDialog';
import DiskSpaceErrorDialog from '../sftp/DiskSpaceErrorDialog';

// Extended props to include toast methods from parent
interface SFTPModalExtendedProps extends SFTPModalProps {
  onSuccess?: (title: string, message?: string, duration?: number) => string;
  onError?: (title: string, message?: string, duration?: number) => string;
}

// Mac Terminal Style SFTP Modal - Dark Mode
const SFTPModal = ({ host, onClose, isMinimized: externalMinimized, onToggleMinimize, onSuccess, onError }: SFTPModalExtendedProps) => {
  const {
    sftp, transfer, fileOps, window, upload, download,
    pathInputValue, setPathInputValue, isPathEditing, pathInputRef,
    selectedFiles, searchQuery, showFilter, showTransferPanel, showUploadMenu,
    activeLogFilter, showNewFolderDialog, newFolderName, showRenameDialog,
    renameTarget, newFileName, showFileEditor, isDragOver,
    pathSegments, filteredFiles, activeTransfers, dialogComponent,
    handlePathEdit, handlePathConfirm, handlePathKeyDown, handleFileClick,
    toggleFileSelection, handleSelectAll, handleDragOver, handleDragLeave,
    handleDrop, handleCreateFolder, handleRename, handleSaveAndClose, clearFilter,
    setIsPathEditing, setSelectedFiles, setSearchQuery, setShowFilter,
    setShowTransferPanel, setShowUploadMenu, setActiveLogFilter,
    setShowNewFolderDialog, setNewFolderName, setShowRenameDialog,
    setRenameTarget, setNewFileName, setShowFileEditor,
  } = useSFTPModal({
    hostId: host.id,
    hostName: host.name,
    hostAddress: host.address,
    onSuccess,
    onError
  });

  // Use external minimized state if provided, otherwise use internal state
  const isMinimized = externalMinimized !== undefined ? externalMinimized : window.windowState.isMinimized;
  
  // Handle minimize toggle
  const handleMinimizeToggle = () => {
    if (onToggleMinimize) {
      onToggleMinimize();
    } else {
      window.handleMinimize();
    }
  };

  // If minimized, don't render the modal (App.tsx will render the minimized view)
  if (isMinimized) {
    return null;
  }

  return (
    <>
      <LoadingOverlay isOpen={sftp.connecting} hostName={host.name} />
      <ErrorOverlay isOpen={!!sftp.error && !sftp.files.length} error={sftp.error} onClose={onClose} />

      {!sftp.connecting && (!sftp.error || sftp.files.length > 0) && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            ref={window.modalRef}
            className="bg-background-primary/95 backdrop-blur-xl rounded-xl shadow-macos-modal flex flex-col overflow-hidden border border-border-primary sftp-font"
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
              showFilter={showFilter}
              showUploadMenu={showUploadMenu}
              showTransferPanel={showTransferPanel}
              activeTransfers={activeTransfers}
              activeLogFilter={activeLogFilter}
              onPathChange={setPathInputValue}
              onPathConfirm={handlePathConfirm}
              onPathKeyDown={handlePathKeyDown}
              onPathEdit={handlePathEdit}
              onNavigateTo={sftp.navigateTo}
              onClose={onClose}
              onMinimize={handleMinimizeToggle}
              onMaximize={window.handleMaximize}
              isMaximized={window.windowState.isMaximized}
              onShowFilter={() => setShowFilter(true)}
              onHideFilter={() => setShowFilter(false)}
              onNewFolder={() => setShowNewFolderDialog(true)}
              onUpload={upload.handleUpload}
              onUploadFolder={upload.handleUploadFolder}
              onToggleUploadMenu={() => setShowUploadMenu(!showUploadMenu)}
              onCloseUploadMenu={() => setShowUploadMenu(false)}
              onToggleTransferPanel={() => setShowTransferPanel(!showTransferPanel)}
            />

            {/* Filter Bar - Dark Mode */}
            {showFilter && (
              <div className="flex items-center px-4 py-2 bg-background-secondary border-b border-border-secondary">
                <div className="flex items-center w-full">
                  <div className="flex-1 min-w-0 border border-border-primary rounded-l overflow-hidden focus-within:border-macos-blue transition-colors">
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-[13px] text-white placeholder-text-tertiary px-3 py-1.5 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={clearFilter}
                    className="shrink-0 px-2 text-text-tertiary hover:text-white bg-background-tertiary hover:bg-background-elevated rounded-r border border-l-0 border-border-primary transition-colors flex items-center justify-center self-stretch"
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
                className={`flex-1 overflow-auto bg-[#0a0a0a]/50 scrollbar-custom ${isDragOver ? 'ring-2 ring-macos-blue ring-inset' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDragOver && (
                  <div className="absolute inset-0 bg-macos-blue/10 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-background-secondary px-6 py-4 rounded-lg shadow-macos-dropdown border border-macos-blue/30">
                      <div className="flex items-center gap-3 text-macos-blue">
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
                  uploadTasks={upload.uploadTasks}
                  onViewUploadTask={(task) => {
                    upload.setViewingTask(task);
                    upload.setShowUploadProgress(true);
                  }}
                  onCancelUpload={upload.cancelUpload}
                  downloadTasks={download.downloadTasks}
                  onViewDownloadTask={(task) => {
                    download.setViewingTask(task);
                    download.setShowDownloadProgress(true);
                  }}
                  onCancelDownload={download.cancelDownload}
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
        isOpen={download.showDownloadProgress && !!download.viewingTask}
        filename={download.viewingTask?.filename || ''}
        fileSize={download.viewingTask?.fileSize || 0}
        progress={download.viewingTask?.progress || { progress: 0, bytes_transferred: 0, total_bytes: 0, speed: '', stage: 'init', message: '' }}
        onClose={() => {
          download.setShowDownloadProgress(false);
          download.setViewingTask(null);
        }}
        onMinimize={() => {
          download.setShowDownloadProgress(false);
        }}
        onCancel={download.viewingTask ? () => download.cancelDownload(download.viewingTask!.downloadId) : undefined}
      />
      
      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        isOpen={upload.showUploadProgress && !!upload.viewingTask}
        filename={upload.viewingTask?.filename || ''}
        fileSize={upload.viewingTask?.fileSize || 0}
        progress={upload.viewingTask?.progress.progress || 0}
        bytesTransferred={upload.viewingTask?.progress.bytes_transferred || 0}
        speed={upload.viewingTask?.progress.speed || ''}
        stage={upload.viewingTask?.progress.stage || 'init'}
        message={upload.viewingTask?.progress.message || ''}
        onClose={() => {
          upload.setShowUploadProgress(false);
          upload.setViewingTask(null);
        }}
        onMinimize={() => {
          upload.setShowUploadProgress(false);
        }}
        onCancel={() => {
          if (upload.viewingTask) {
            upload.cancelUpload(upload.viewingTask.uploadId);
          }
        }}
      />
      
      {/* Dialog Component */}
      {dialogComponent}
      
      {/* Disk Space Error Dialog */}
      <DiskSpaceErrorDialog
        isOpen={upload.showDiskSpaceError}
        diskInfo={upload.diskSpaceInfo}
        fileInfo={upload.diskSpaceFileInfo}
        errorCode={upload.diskSpaceErrorCode || undefined}
        onClose={upload.closeDiskSpaceError}
      />
    </>
  );
};

export default SFTPModal;