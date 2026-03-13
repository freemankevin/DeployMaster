import { Upload, Download, Check, X, AlertCircle, Clock, Trash2, FileText, FolderPlus, Edit3, Trash, Terminal, Info } from 'lucide-react';
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

// Get appropriate icon for log type
const getLogTypeIcon = (log: TransferLog) => {
  if (log.status === 'error') {
    return <AlertCircle className="w-3 h-3 text-red-400" />;
  }
  
  switch (log.type) {
    case 'upload':
      return <Upload className="w-3 h-3 text-blue-400" />;
    case 'download':
      return <Download className="w-3 h-3 text-emerald-400" />;
    case 'mkdir':
      return <FolderPlus className="w-3 h-3 text-amber-400" />;
    case 'rename':
      return <Edit3 className="w-3 h-3 text-purple-400" />;
    case 'delete':
      return <Trash className="w-3 h-3 text-red-400" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-400" />;
    case 'info':
    default:
      return <Info className="w-3 h-3 text-gray-400" />;
  }
};

// Get log entry background color
const getLogBackgroundColor = (log: TransferLog) => {
  if (log.status === 'error') return 'bg-red-500/10 border-red-500/20';
  
  switch (log.type) {
    case 'upload':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'download':
      return 'bg-emerald-500/10 border-emerald-500/20';
    case 'mkdir':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'rename':
      return 'bg-purple-500/10 border-purple-500/20';
    case 'delete':
      return 'bg-red-500/10 border-red-500/20';
    default:
      return 'bg-white/5 border-white/10';
  }
};

const TransferPanel = ({
  transferTasks,
  transferLogs,
  activeLogFilter,
  onFilterChange,
  onClearLogs,
  onClearLogsByFilter,
  onCancelTask
}: TransferPanelProps) => {
  const activeTasks = transferTasks.filter(t =>
    t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
  );

  const completedTasks = transferTasks.filter(t =>
    t.status === 'completed' || t.status === 'failed'
  );

  // 按类型分组日志
  const uploadLogs = transferLogs.filter(log => log.type === 'upload');
  const downloadLogs = transferLogs.filter(log => log.type === 'download');
  const errorLogs = transferLogs.filter(log => log.status === 'error' || log.type === 'error');
  const otherLogs = transferLogs.filter(log => 
    log.type !== 'upload' && log.type !== 'download' && log.type !== 'error' && log.status !== 'error'
  );

  // 根据当前筛选获取要显示的日志
  const getDisplayLogs = () => {
    switch (activeLogFilter) {
      case 'upload': return uploadLogs;
      case 'download': return downloadLogs;
      case 'error': return errorLogs;
      default: return transferLogs;
    }
  };

  const displayLogs = getDisplayLogs();

  // Remove duplicate logs (same message and path within 1 second)
  const uniqueLogs = displayLogs.filter((log, index, self) => {
    const isDuplicate = self.findIndex((l) => 
      l.message === log.message && 
      l.path === log.path &&
      Math.abs(l.timestamp.getTime() - log.timestamp.getTime()) < 1000
    ) !== index;
    return !isDuplicate;
  });

  // 获取日志计数
  const getLogCount = (filter: LogFilter) => {
    switch (filter) {
      case 'upload': return uploadLogs.length;
      case 'download': return downloadLogs.length;
      case 'error': return errorLogs.length;
      default: return transferLogs.length;
    }
  };

  return (
    <div
      className="w-80 bg-[#1e1e1e] border-l border-white/5 flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(['all', 'upload', 'download', 'error'] as LogFilter[]).map((filter) => (
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
              {filter === 'error' && 'Error'}
              {getLogCount(filter) > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === 'error' ? 'bg-red-500/20 text-red-400' :
                  filter === 'upload' ? 'bg-blue-500/20 text-blue-400' :
                  filter === 'download' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {getLogCount(filter)}
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
                    {/* Progress Bar */}
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

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Check className="w-3 h-3" />
              Completed ({completedTasks.length})
            </h5>
            <div className="space-y-1">
              {completedTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 p-2 rounded-lg text-[12px] ${
                    task.status === 'failed' ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
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

        {/* Transfer Logs - 按类型分组显示 */}
        {uniqueLogs.length > 0 && (
          <div>
            <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3 h-3" />
              {activeLogFilter === 'all' ? 'All Logs' : 
               activeLogFilter === 'upload' ? 'Upload Logs' :
               activeLogFilter === 'download' ? 'Download Logs' : 'Error Logs'}
              <span className="text-gray-600">({uniqueLogs.length})</span>
            </h5>
            <div className="space-y-1">
              {uniqueLogs.slice(0, 20).map(log => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 p-2 rounded-lg text-[12px] border ${getLogBackgroundColor(log)}`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getLogTypeIcon(log)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-300 truncate">{log.message}</div>
                    <div className="text-gray-500 text-[11px] truncate">{log.path}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      {log.size && <span className="text-[11px] text-gray-500">{log.size}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {transferTasks.length === 0 && transferLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-[12px]">No transfer tasks</div>
        )}
        
        {/* Empty State for current filter */}
        {transferLogs.length > 0 && uniqueLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-[12px]">
            No {activeLogFilter === 'all' ? '' : activeLogFilter} logs
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-[#1a1a1a]">
        <div className="flex items-center justify-between text-[12px] text-gray-500">
          <span>
            {activeLogFilter === 'all' && `Total: ${transferLogs.length}`}
            {activeLogFilter === 'upload' && `Upload: ${uploadLogs.length}`}
            {activeLogFilter === 'download' && `Download: ${downloadLogs.length}`}
            {activeLogFilter === 'error' && `Error: ${errorLogs.length}`}
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
            Clear {activeLogFilter !== 'all' ? activeLogFilter : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferPanel;
