import type { TransferTask, TransferLog, LogFilter } from './types';
import { formatFileSize } from './utils';
import type { UploadTask } from './hooks/useUploadManager';
import type { DownloadTask } from './hooks/useDownloadManager';

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
  // Upload tasks for concurrent display
  uploadTasks?: UploadTask[];
  onViewUploadTask?: (task: UploadTask) => void;
  onCancelUpload?: (uploadId: string) => void;
  // Download tasks for concurrent display
  downloadTasks?: DownloadTask[];
  onViewDownloadTask?: (task: DownloadTask) => void;
  onCancelDownload?: (downloadId: string) => void;
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
  uploadTasks = [],
  onViewUploadTask,
  onCancelUpload,
  downloadTasks = [],
  onViewDownloadTask,
  onCancelDownload
}: TransferPanelProps) => {

  // Filter completed tasks based on current filter
  const completedTasks = transferTasks.filter(t => {
    if (t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled') return false;
    if (activeLogFilter === 'upload') return t.type === 'upload';
    if (activeLogFilter === 'download') return t.type === 'download';
    return true;
  });

  // Get active upload/download tasks for current filter
  const activeUploadTasks = uploadTasks.filter(t => 
    t.progress.stage !== 'completed' && t.progress.stage !== 'error'
  );
  
  const activeDownloadTasks = downloadTasks.filter(t => 
    t.progress.stage !== 'completed' && t.progress.stage !== 'error'
  );

  // Get completed count for a filter
  const getCompletedCount = (filter: LogFilter) => {
    if (filter === 'upload') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled') && t.type === 'upload').length;
    if (filter === 'download') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled') && t.type === 'download').length;
    return 0;
  };

  // Get active count for a filter
  const getActiveCount = (filter: LogFilter) => {
    if (filter === 'upload') return activeUploadTasks.length;
    if (filter === 'download') return activeDownloadTasks.length;
    return 0;
  };

  const currentCount = getCompletedCount(activeLogFilter);

  return (
    <div
      className="w-80 bg-gradient-to-b from-[#161618] to-[#121214] border-l border-white/[0.04] flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Tabs */}
      <div className="flex border-b border-white/[0.04]">
        {(['upload', 'download'] as LogFilter[]).map((filter) => {
          const activeCount = getActiveCount(filter);
          const completedCount = getCompletedCount(filter);
          return (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`flex-1 px-3 py-2 text-[12px] font-medium transition-all relative ${
                activeLogFilter === filter
                  ? 'bg-white/[0.04] text-white'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                {filter === 'upload' && 'Upload'}
                {filter === 'download' && 'Download'}
                {/* Show active count if there are active tasks */}
                {activeCount > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    filter === 'upload' ? 'bg-macos-blue/30 text-macos-blue' :
                    'bg-macos-green/30 text-macos-green'
                  }`}>
                    {activeCount}
                  </span>
                )}
                {/* Show completed count if there are completed tasks and no active tasks */}
                {activeCount === 0 && completedCount > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    filter === 'upload' ? 'bg-macos-blue/20 text-macos-blue' :
                    'bg-macos-green/20 text-macos-green'
                  }`}>
                    {completedCount}
                  </span>
                )}
              </span>
              {activeLogFilter === filter && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-macos-blue" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 space-y-3 bg-[#0a0a0a]/80">
        {/* Active Upload Tasks */}
        {activeLogFilter === 'upload' && activeUploadTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-macos-blue uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-spinner fa-spin text-[10px]" />
              Active Uploads ({activeUploadTasks.length})
            </h5>
            <div className="space-y-2">
              {activeUploadTasks.map(task => (
                <div
                  key={task.uploadId}
                  className="bg-gradient-to-r from-macos-blue/10 to-macos-teal/10 border border-macos-blue/20 rounded-lg p-2.5 cursor-pointer hover:border-macos-blue/40 transition-all"
                  onClick={() => onViewUploadTask?.(task)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <i className="fa-solid fa-upload text-[10px] text-macos-blue" />
                    <span className="flex-1 truncate text-white text-[12px] font-medium" title={task.filename}>{task.filename}</span>
                    <span className="text-[11px] text-macos-blue font-semibold">{Math.round(task.progress.progress || 0)}%</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCancelUpload?.(task.uploadId); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-macos-red/10 hover:bg-macos-red/20 text-macos-red transition-all border border-macos-red/20 hover:border-macos-red/40"
                      title="Cancel"
                    >
                      <i className="fa-solid fa-xmark text-[10px]" />
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-macos-blue to-macos-teal rounded-full transition-all duration-300"
                      style={{ width: `${task.progress.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                    <span>{task.progress.speed || 'Waiting...'}</span>
                    <span>
                      {task.progress.bytes_transferred && task.fileSize
                        ? `${formatFileSize(task.progress.bytes_transferred)} / ${formatFileSize(task.fileSize)}`
                        : '--'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Download Tasks */}
        {activeLogFilter === 'download' && activeDownloadTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-macos-green uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-spinner fa-spin text-[10px]" />
              Active Downloads ({activeDownloadTasks.length})
            </h5>
            <div className="space-y-2">
              {activeDownloadTasks.map(task => (
                <div
                  key={task.downloadId}
                  className="bg-gradient-to-r from-macos-green/10 to-macos-teal/10 border border-macos-green/20 rounded-lg p-2.5 cursor-pointer hover:border-macos-green/40 transition-all"
                  onClick={() => onViewDownloadTask?.(task)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <i className="fa-solid fa-circle-down text-[10px] text-macos-green" />
                    <span className="flex-1 truncate text-white text-[12px] font-medium" title={task.filename}>{task.filename}</span>
                    <span className="text-[11px] text-macos-green font-semibold">{Math.round(task.progress.progress || 0)}%</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onCancelDownload?.(task.downloadId); }}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-macos-red/10 hover:bg-macos-red/20 text-macos-red transition-all border border-macos-red/20 hover:border-macos-red/40"
                      title="Cancel"
                    >
                      <i className="fa-solid fa-xmark text-[10px]" />
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-macos-green to-macos-teal rounded-full transition-all duration-300"
                      style={{ width: `${task.progress.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                    <span>{task.progress.speed || 'Waiting...'}</span>
                    <span>
                      {task.progress.bytes_transferred && task.fileSize
                        ? `${formatFileSize(task.progress.bytes_transferred)} / ${formatFileSize(task.fileSize)}`
                        : '--'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed/Failed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-check text-[10px]" />
              {activeLogFilter === 'upload' ? 'Uploads' : 'Downloads'} ({completedTasks.length})
            </h5>
            <div className="space-y-1">
              {completedTasks.slice(0, 10).map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-[12px] ${
                    task.status === 'failed'
                      ? 'bg-macos-red/10 border border-macos-red/20'
                      : task.status === 'cancelled'
                      ? 'bg-macos-orange/10 border border-macos-orange/20'
                      : 'bg-macos-green/10 border border-macos-green/20'
                  }`}
                >
                  {task.type === 'upload' ? (
                    <i className={`fa-solid fa-upload text-[10px] ${task.status === 'failed' ? 'text-macos-red' : task.status === 'cancelled' ? 'text-macos-orange' : 'text-macos-green'}`} />
                  ) : (
                    <i className={`fa-solid fa-circle-down text-[10px] ${task.status === 'failed' ? 'text-macos-red' : task.status === 'cancelled' ? 'text-macos-orange' : 'text-macos-green'}`} />
                  )}
                  <span className="flex-1 truncate text-text-secondary">{task.filename}</span>
                  <span className="text-[11px] text-text-tertiary">{formatFileSize(task.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {completedTasks.length === 0 && activeUploadTasks.length === 0 && activeDownloadTasks.length === 0 && (
          <div className="text-center py-8 text-text-tertiary text-[12px]">
            {activeLogFilter === 'upload' ? 'No upload tasks' : 'No download tasks'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.04] bg-gradient-to-b from-[#141416] to-[#101012]">
        <div className="flex items-center justify-between text-[12px] text-text-tertiary">
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
            className="text-text-tertiary hover:text-white transition-colors flex items-center gap-1"
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