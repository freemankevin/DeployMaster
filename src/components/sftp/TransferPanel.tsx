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
  onRestoreDownload?: () => void;  // 还原下载弹窗
  hasBackgroundDownload?: boolean;  // 是否有后台下载任务
  backgroundDownloadProgress?: number;  // 后台下载进度
  backgroundDownloadSpeed?: string;  // 后台下载速度
  backgroundDownloadFilename?: string;  // 后台下载文件名
}

const getStatusColor = (status: TransferTask['status']) => {
  switch (status) {
    case 'completed': return 'text-emerald-500';
    case 'failed': return 'text-red-500';
    case 'transferring': return 'text-blue-500';
    case 'paused': return 'text-amber-500';
    default: return 'text-gray-400';
  }
};

const getStatusIcon = (status: TransferTask['status']) => {
  switch (status) {
    case 'completed': return <i className="fa-solid fa-check text-[11px]" />;
    case 'failed': return <i className="fa-solid fa-circle-exclamation text-[11px]" />;
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
  backgroundDownloadFilename = ''
}: TransferPanelProps) => {
  // 活跃任务
  const activeTasks = transferTasks.filter(t =>
    t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
  );

  // 根据当前筛选过滤已完成的任务和日志
  const filteredTasks = transferTasks.filter(t => {
    if (t.status !== 'completed' && t.status !== 'failed') return false;
    if (activeLogFilter === 'upload') return t.type === 'upload';
    if (activeLogFilter === 'download') return t.type === 'download';
    return true;
  });

  // 获取计数
  const getCount = (filter: LogFilter) => {
    if (filter === 'upload') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed') && t.type === 'upload').length;
    if (filter === 'download') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed') && t.type === 'download').length;
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
              {/* 后台下载指示器 */}
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
        {/* Background Download Restore Button - 只在 Download 标签显示 */}
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
                <span className="text-[11px] font-medium text-blue-400">正在后台下载</span>
              </div>
              <button className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-[10px] text-blue-400 transition-colors group-hover:bg-blue-500/40">
                <i className="fa-solid fa-expand text-[9px] mr-1" />
                还原
              </button>
            </div>
            
            {/* 文件名 */}
            <div className="text-[12px] text-gray-300 truncate mb-2">
              {backgroundDownloadFilename}
            </div>
            
            {/* 进度条 */}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${backgroundDownloadProgress}%` }}
              />
            </div>
            
            {/* 进度信息 */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{Math.round(backgroundDownloadProgress)}%</span>
              {backgroundDownloadSpeed && (
                <span className="text-blue-400">{backgroundDownloadSpeed}</span>
              )}
            </div>
          </div>
        )}

        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Active ({activeTasks.length})
            </h5>
            <div className="space-y-2">
              {activeTasks.map(task => (
                <div key={task.id} className="bg-[#1a1a1a] rounded-lg p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {task.type === 'upload' ? (
                        <i className="fa-solid fa-upload text-[11px] text-blue-500" />
                      ) : (
                        <i className="fa-solid fa-circle-down text-[11px] text-emerald-500" />
                      )}
                      <span className="text-[12px] font-medium text-gray-300 truncate max-w-[120px]">
                        {task.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={getStatusColor(task.status)}>
                        {getStatusIcon(task.status)}
                      </span>
                      {onCancelTask && (
                        <button
                          onClick={() => onCancelTask(task.id)}
                          className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                          title="Cancel"
                        >
                          <i className="fa-solid fa-xmark text-[10px]" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{formatFileSize(task.transferred)} / {formatFileSize(task.size)}</span>
                      <span className="font-medium text-blue-400">{task.speed}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                      {task.progress > 0 ? (
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.status === 'transferring' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                            task.status === 'paused' ? 'bg-amber-400' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${task.progress}%` }}
                        />
                      ) : (
                        // 进度为0%时显示加载动画
                        <div className="absolute inset-0 flex items-center">
                          <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500/30 to-transparent animate-shimmer"
                               style={{ animation: 'shimmer 1.5s infinite' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {task.status === 'transferring' ? (task.progress > 0 ? 'Transferring' : 'Initializing...') :
                         task.status === 'paused' ? 'Paused' : 'Pending'}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
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
                      : 'bg-emerald-500/10 border border-emerald-500/20'
                  }`}
                >
                  {task.type === 'upload' ? (
                    <i className={`fa-solid fa-upload text-[10px] ${task.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}`} />
                  ) : (
                    <i className={`fa-solid fa-circle-down text-[10px] ${task.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}`} />
                  )}
                  <span className="flex-1 truncate text-gray-300">{task.filename}</span>
                  <span className="text-[11px] text-gray-500">{formatFileSize(task.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeTasks.length === 0 && filteredTasks.length === 0 && !hasBackgroundDownload && (
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
