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
  backgroundDownloadFileSize?: number;  // Background download file size in bytes
  backgroundDownloadTransferred?: number;  // Background download transferred bytes
  onCancelBackgroundDownload?: () => void;  // Cancel background download
  onRestoreUpload?: () => void;  // Restore upload dialog
  hasBackgroundUpload?: boolean;  // Has background upload task
  backgroundUploadProgress?: number;  // Background upload progress
  backgroundUploadSpeed?: string;  // Background upload speed
  backgroundUploadFilename?: string;  // Background upload filename
  backgroundUploadFileSize?: number;  // Background upload file size in bytes
  backgroundUploadTransferred?: number;  // Background upload transferred bytes
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
  backgroundDownloadFileSize = 0,
  backgroundDownloadTransferred = 0,
  onCancelBackgroundDownload,
  onRestoreUpload,
  hasBackgroundUpload,
  backgroundUploadProgress = 0,
  backgroundUploadSpeed = '',
  backgroundUploadFilename = '',
  backgroundUploadFileSize = 0,
  backgroundUploadTransferred = 0,
  onCancelBackgroundUpload
}: TransferPanelProps) => {

  // Filter completed tasks and logs based on current filter
  const completedTasks = transferTasks.filter(t => {
    if (t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled') return false;
    if (activeLogFilter === 'upload') return t.type === 'upload';
    if (activeLogFilter === 'download') return t.type === 'download';
    return true;
  });

  // Filter active/transferring tasks based on current filter
  const activeTasks = transferTasks.filter(t => {
    if (t.status !== 'transferring' && t.status !== 'paused') return false;
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
        {/* Background Upload Task Card - Only show in Upload tab */}
        {activeLogFilter === 'upload' && hasBackgroundUpload && onRestoreUpload && (
          <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-[#1a1a2e]/80 to-cyan-500/10 backdrop-blur-sm">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5 animate-pulse" />
            
            {/* Content */}
            <div className="relative p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
                      <i className="fa-solid fa-cloud-arrow-up text-sm text-blue-400" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#1a1a2e] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-blue-400">正在上传</div>
                    <div className="text-[10px] text-gray-500">后台运行中</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRestoreUpload(); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all border border-blue-500/20 hover:border-blue-500/40"
                    title="还原窗口"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                  </button>
                  {onCancelBackgroundUpload && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCancelBackgroundUpload(); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20 hover:border-red-500/40"
                      title="取消上传"
                    >
                      <i className="fa-solid fa-xmark text-[11px]" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* File info */}
              <div className="bg-black/20 rounded-lg p-2 mb-2">
                <div className="text-[12px] text-gray-200 truncate font-medium mb-1">
                  {backgroundUploadFilename}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>{backgroundUploadFileSize > 0 ? formatFileSize(backgroundUploadFileSize) : '--'}</span>
                  <span className="text-blue-400 font-medium">{backgroundUploadSpeed || '-- /s'}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full transition-all duration-300 relative"
                    style={{ width: `${backgroundUploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-500">
                    {backgroundUploadTransferred > 0 && backgroundUploadFileSize > 0
                      ? `${formatFileSize(backgroundUploadTransferred)} / ${formatFileSize(backgroundUploadFileSize)}`
                      : '处理中...'}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-400">{Math.round(backgroundUploadProgress)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background Download Task Card - Only show in Download tab */}
        {activeLogFilter === 'download' && hasBackgroundDownload && onRestoreDownload && (
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#1a1a2e]/80 to-cyan-500/10 backdrop-blur-sm">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5 animate-pulse" />
            
            {/* Content */}
            <div className="relative p-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center">
                      <i className="fa-solid fa-cloud-arrow-down text-sm text-emerald-400" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1a1a2e] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-emerald-400">正在下载</div>
                    <div className="text-[10px] text-gray-500">后台运行中</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRestoreDownload(); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-all border border-emerald-500/20 hover:border-emerald-500/40"
                    title="还原窗口"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                  </button>
                  {onCancelBackgroundDownload && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCancelBackgroundDownload(); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20 hover:border-red-500/40"
                      title="取消下载"
                    >
                      <i className="fa-solid fa-xmark text-[11px]" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* File info */}
              <div className="bg-black/20 rounded-lg p-2 mb-2">
                <div className="text-[12px] text-gray-200 truncate font-medium mb-1">
                  {backgroundDownloadFilename}
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>{backgroundDownloadFileSize > 0 ? formatFileSize(backgroundDownloadFileSize) : '--'}</span>
                  <span className="text-emerald-400 font-medium">{backgroundDownloadSpeed || '-- /s'}</span>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 rounded-full transition-all duration-300 relative"
                    style={{ width: `${backgroundDownloadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-500">
                    {backgroundDownloadTransferred > 0 && backgroundDownloadFileSize > 0
                      ? `${formatFileSize(backgroundDownloadTransferred)} / ${formatFileSize(backgroundDownloadFileSize)}`
                      : '处理中...'}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">{Math.round(backgroundDownloadProgress)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active/Transferring Tasks */}
        {activeTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-spinner fa-spin text-[10px]" />
              {activeLogFilter === 'upload' ? 'Active Uploads' : 'Active Downloads'} ({activeTasks.length})
            </h5>
            <div className="space-y-2">
              {activeTasks.map(task => (
                <div
                  key={task.id}
                  className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-2.5"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {task.type === 'upload' ? (
                      <i className="fa-solid fa-upload text-[10px] text-blue-400" />
                    ) : (
                      <i className="fa-solid fa-circle-down text-[10px] text-emerald-400" />
                    )}
                    <span className="flex-1 truncate text-gray-200 text-[12px] font-medium">{task.filename}</span>
                    <span className="text-[11px] text-blue-400 font-semibold">{Math.round(task.progress || 0)}%</span>
                  </div>
                  {/* Progress bar for active task */}
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        task.type === 'upload'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      }`}
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>{task.speed || 'Waiting...'}</span>
                    <span>
                      {task.transferred && task.size
                        ? `${formatFileSize(task.transferred)} / ${formatFileSize(task.size)}`
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
            <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-check text-[10px]" />
              {activeLogFilter === 'upload' ? 'Uploads' : 'Downloads'} ({completedTasks.length})
            </h5>
            <div className="space-y-1">
              {completedTasks.slice(0, 10).map(task => (
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
        {activeTasks.length === 0 && completedTasks.length === 0 && !hasBackgroundDownload && !hasBackgroundUpload && (
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
