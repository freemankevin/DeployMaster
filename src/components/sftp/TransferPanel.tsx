import type { TransferTask, TransferLog, LogFilter } from './types';
import { formatFileSize } from './utils';

interface TransferPanelProps {
  transferTasks: TransferTask[];
  transferLogs: TransferLog[];
  activeLogFilter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  onClearLogs: () => void;
  onClearLogsByFilter?: (filter: LogFilter) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  onRestoreDownload?: () => void;  // Restore download dialog
  hasBackgroundDownload?: boolean;  // Has background download task
  backgroundDownloadProgress?: number;  // Background download progress
  backgroundDownloadSpeed?: string;  // Background download speed
  backgroundDownloadFilename?: string;  // Background download filename
  onCancelBackgroundDownload?: () => void;  // Cancel background download
  onRestoreUpload?: () => void;  // Restore upload dialog
  hasBackgroundUpload?: boolean;  // Has background upload task
  backgroundUploadProgress?: number;  // Background upload progress
  backgroundUploadSpeed?: string;  // Background upload speed
  backgroundUploadFilename?: string;  // Background upload filename
  onCancelBackgroundUpload?: () => void;  // Cancel background upload
}

const getStatusColor = (status: TransferTask['status']) => {
  switch (status) {
    case 'completed': return 'text-emerald-500';
    case 'failed': return 'text-red-500';
    case 'cancelled': return 'text-amber-500';
    case 'transferring': return 'text-blue-500';
    case 'paused': return 'text-amber-500';
    default: return 'text-gray-400';
  }
};

const getStatusIcon = (status: TransferTask['status']) => {
  switch (status) {
    case 'completed': return <i className="fa-solid fa-check text-[11px]" />;
    case 'failed': return <i className="fa-solid fa-circle-exclamation text-[11px]" />;
    case 'cancelled': return <i className="fa-solid fa-ban text-[11px]" />;
    case 'transferring': return <i className="fa-solid fa-spinner animate-spin text-[11px]" />;
    case 'paused': return <i className="fa-solid fa-clock text-[11px]" />;
    default: return <i className="fa-solid fa-clock text-[11px]" />;
  }
};

const TransferPanel = ({
  transferTasks,
  activeLogFilter,
  onFilterChange,
  onClearLogs,
  onClearLogsByFilter,
  onCancelTask,
  onRestoreDownload,
  hasBackgroundDownload,
  backgroundDownloadProgress = 0,
  backgroundDownloadSpeed = '',
  backgroundDownloadFilename = '',
  onRestoreUpload,
  hasBackgroundUpload,
  backgroundUploadProgress = 0,
  backgroundUploadSpeed = '',
  backgroundUploadFilename = ''
}: TransferPanelProps) => {

  // Filter completed tasks and logs based on current filter
  const filteredTasks = transferTasks.filter(t => {
    if (t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled') return false;
    if (activeLogFilter === 'upload') return t.type === 'upload';
    if (activeLogFilter === 'download') return t.type === 'download';
    return true;
  });

  // Get count
  const getCount = (filter: LogFilter) => {
    if (filter === 'upload') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled') && t.type === 'upload').length;
    if (filter === 'download') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled') && t.type === 'download').length;
    return 0;
  };

  const currentCount = getCount(activeLogFilter);

  return (
    <div
      className="w-80 bg-[#1e1e1e] border-l border-white/5 flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Tabs - 只显示 Upload, Download */}
      <div className="flex border-b border-white/5">
        {(['upload', 'download'] as LogFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`flex-1 px-3 py-2 text-[12px] font-medium transition-all relative ${
              activeLogFilter === filter
                ? 'bg-white/5 text-gray-200'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              {filter === 'upload' && 'Upload'}
              {filter === 'download' && 'Download'}
              {getCount(filter) > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === 'upload' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {getCount(filter)}
                </span>
              )}
              {/* Background upload indicator */}
              {filter === 'upload' && hasBackgroundUpload && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
              {/* Background download indicator */}
              {filter === 'download' && hasBackgroundDownload && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
            </span>
            {activeLogFilter === filter && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 space-y-3 bg-[#0d0d0d]">
        {/* Background Upload Restore Button - Only show in Upload tab */}
        {activeLogFilter === 'upload' && hasBackgroundUpload && onRestoreUpload && (
          <div 
            onClick={onRestoreUpload}
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg p-3 border border-blue-500/30 cursor-pointer hover:from-blue-500/30 hover:to-cyan-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <i className="fa-solid fa-cloud-arrow-up text-[10px] text-blue-400" />
                </div>
                <span className="text-[11px] font-medium text-blue-400">Uploading in background</span>
              </div>
              <button className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-[10px] text-blue-400 transition-colors group-hover:bg-blue-500/40">
                <i className="fa-solid fa-expand text-[9px] mr-1" />
                Restore
              </button>
            </div>
            
            {/* File name */}
            <div className="text-[12px] text-gray-300 truncate mb-2">
              {backgroundUploadFilename}
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${backgroundUploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Background Download Restore Button - Only show in Download tab */}
        {activeLogFilter === 'download' && hasBackgroundDownload && onRestoreDownload && (
          <div 
            onClick={onRestoreDownload}
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg p-3 border border-blue-500/30 cursor-pointer hover:from-blue-500/30 hover:to-cyan-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <i className="fa-solid fa-cloud-arrow-down text-[10px] text-blue-400" />
                </div>
                <span className="text-[11px] font-medium text-blue-400">Downloading in background</span>
              </div>
              <button className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-[10px] text-blue-400 transition-colors group-hover:bg-blue-500/40">
                <i className="fa-solid fa-expand text-[9px] mr-1" />
                Restore
              </button>
            </div>
            
            {/* File name */}
            <div className="text-[12px] text-gray-300 truncate mb-2">
              {backgroundDownloadFilename}
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${backgroundDownloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed/Failed Tasks */}
        {filteredTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-check text-[10px]" />
              {activeLogFilter === 'upload' ? 'Uploads' : 'Downloads'} ({filteredTasks.length})
            </h5>
            <div className="space-y-1">
              {filteredTasks.slice(0, 10).map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-[12px] ${
                    task.status === 'failed'
                      ? 'bg-red-500/10 border border-red-500/20'
                      : task.status === 'cancelled'
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'bg-emerald-500/10 border border-emerald-500/20'
                  }`}
                >
                  {task.type === 'upload' ? (
                    <i className={`fa-solid fa-upload text-[10px] ${task.status === 'failed' ? 'text-red-400' : task.status === 'cancelled' ? 'text-amber-400' : 'text-emerald-400'}`} />
                  ) : (
                    <i className={`fa-solid fa-circle-down text-[10px] ${task.status === 'failed' ? 'text-red-400' : task.status === 'cancelled' ? 'text-amber-400' : 'text-emerald-400'}`} />
                  )}
                  <span className="flex-1 truncate text-gray-300">{task.filename}</span>
                  <span className="text-[11px] text-gray-500">{formatFileSize(task.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && !hasBackgroundDownload && !hasBackgroundUpload && (
          <div className="text-center py-8 text-gray-500 text-[12px]">
            {activeLogFilter === 'upload' ? 'No upload tasks' : 'No download tasks'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-[#1a1a1a]">
        <div className="flex items-center justify-between text-[12px] text-gray-500">
          <span>
            {activeLogFilter === 'upload' && `Upload: ${currentCount}`}
            {activeLogFilter === 'download' && `Download: ${currentCount}`}
          </span>
          <button
            onClick={() => {
              if (onClearLogsByFilter) {
                onClearLogsByFilter(activeLogFilter);
              } else {
                onClearLogs();
              }
            }}
            className="text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <i className="fa-solid fa-trash-can text-[10px]" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferPanel;
