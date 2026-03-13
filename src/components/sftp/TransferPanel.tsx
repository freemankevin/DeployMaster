import { Upload, Download, Check, X, AlertCircle, Clock, Trash2, Folder, FileText, Terminal } from 'lucide-react';
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
    case 'completed': return <Check className="w-3.5 h-3.5" />;
    case 'failed': return <AlertCircle className="w-3.5 h-3.5" />;
    case 'transferring': return <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    case 'paused': return <Clock className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
};

const TransferPanel = ({
  transferTasks,
  activeLogFilter,
  onFilterChange,
  onClearLogs,
  onClearLogsByFilter,
  onCancelTask
}: TransferPanelProps) => {
  // 活跃任务
  const activeTasks = transferTasks.filter(t =>
    t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
  );

  // 根据当前筛选过滤已完成的任务和日志
  const filteredTasks = transferTasks.filter(t => {
    if (t.status !== 'completed' && t.status !== 'failed') return false;
    if (activeLogFilter === 'all') return true;
    if (activeLogFilter === 'upload') return t.type === 'upload';
    if (activeLogFilter === 'download') return t.type === 'download';
    return true;
  });

  // 获取计数
  const getCount = (filter: LogFilter) => {
    if (filter === 'all') return transferTasks.filter(t => t.status === 'completed' || t.status === 'failed').length;
    if (filter === 'upload') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed') && t.type === 'upload').length;
    if (filter === 'download') return transferTasks.filter(t => (t.status === 'completed' || t.status === 'failed') && t.type === 'download').length;
    return 0;
  };

  const currentCount = activeLogFilter === 'all' 
    ? filteredTasks.length 
    : getCount(activeLogFilter);

  return (
    <div
      className="w-80 bg-[#1e1e1e] border-l border-white/5 flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Tabs - 只显示 All, Upload, Download */}
      <div className="flex border-b border-white/5">
        {(['all', 'upload', 'download'] as LogFilter[]).map((filter) => (
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
              {filter === 'all' && 'All'}
              {filter === 'upload' && 'Upload'}
              {filter === 'download' && 'Download'}
              {getCount(filter) > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === 'upload' ? 'bg-blue-500/20 text-blue-400' :
                  filter === 'download' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {getCount(filter)}
                </span>
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
                        <Upload className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-emerald-500" />
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
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{formatFileSize(task.transferred)} / {formatFileSize(task.size)}</span>
                      <span className="font-medium text-blue-400">{task.speed}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.status === 'transferring' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 
                          task.status === 'paused' ? 'bg-amber-400' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {task.status === 'transferring' ? 'Transferring' :
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
              <Check className="w-3 h-3" />
              {activeLogFilter === 'all' ? 'Completed' : activeLogFilter === 'upload' ? 'Uploads' : 'Downloads'} ({filteredTasks.length})
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
                    <Upload className={`w-3 h-3 ${task.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}`} />
                  ) : (
                    <Download className={`w-3 h-3 ${task.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}`} />
                  )}
                  <span className="flex-1 truncate text-gray-300">{task.filename}</span>
                  <span className="text-[11px] text-gray-500">{formatFileSize(task.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeTasks.length === 0 && filteredTasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-[12px]">
            {activeLogFilter === 'all' ? 'No transfer tasks' : 
             activeLogFilter === 'upload' ? 'No upload tasks' : 'No download tasks'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-[#1a1a1a]">
        <div className="flex items-center justify-between text-[12px] text-gray-500">
          <span>
            {activeLogFilter === 'all' && `Total: ${currentCount}`}
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
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferPanel;
