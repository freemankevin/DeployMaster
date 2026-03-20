import type { SFTPModalProps } from '../sftp/types';
import { useSFTPModal } from './useSFTPModal';
import {
  FileList,
  TransferPanel,
  StatusBar,
  WindowHeader,
  MinimizedView,
  NewFolderDialog,
  RenameDialog,
  FileEditor,
  LoadingOverlay,
  ErrorOverlay,
  UploadProgressDialog
} from '../sftp';
import DownloadProgressDialog from '../sftp/DownloadProgressDialog';
import DiskSpaceErrorDialog from '../sftp/DiskSpaceErrorDialog';

// Mac Terminal Style SFTP Modal
const SFTPModal = ({ host, onClose }: SFTPModalProps) => {
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
    hostAddress: host.address
  });

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
              onMinimize={window.handleMinimize}
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
                  onRestoreUpload={() => {
                    if (upload.backgroundUpload) {
                      upload.setShowUploadProgress(true);
                    }
                  }}
                  hasBackgroundDownload={!!download.backgroundDownload && !download.showDownloadProgress &&
                    (download.backgroundDownload.progress.stage === 'downloading' || download.backgroundDownload.progress.stage === 'init')}
                  backgroundDownloadProgress={download.backgroundDownload?.progress.progress || 0}
                  backgroundDownloadSpeed={download.backgroundDownload?.progress.speed || ''}
                  backgroundDownloadFilename={download.backgroundDownload?.file.name || ''}
                  hasBackgroundUpload={!!upload.backgroundUpload && !upload.showUploadProgress &&
                    (upload.backgroundUpload.progress.stage === 'uploading' || upload.backgroundUpload.progress.stage === 'init' || upload.backgroundUpload.progress.stage === 'received')}
                  backgroundUploadProgress={upload.backgroundUpload?.progress.progress || 0}
                  backgroundUploadSpeed={upload.backgroundUpload?.progress.speed || ''}
                  backgroundUploadFilename={upload.backgroundUpload?.file.name || ''}
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
      
      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        isOpen={upload.showUploadProgress}
        filename={upload.uploadingFile?.name || ''}
        fileSize={upload.uploadingFile?.size || 0}
        progress={upload.uploadProgress.progress}
        bytesTransferred={upload.uploadProgress.bytes_transferred}
        speed={upload.uploadProgress.speed}
        stage={upload.uploadProgress.stage}
        message={upload.uploadProgress.message}
        onClose={() => {
          upload.setShowUploadProgress(false);
          upload.setBackgroundUpload(null);
        }}
        onMinimize={() => {
          upload.setShowUploadProgress(false);
        }}
        onCancel={() => {
          if (upload.currentUploadId) {
            upload.cancelUpload(upload.currentUploadId);
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