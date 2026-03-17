import { useEffect, useState } from 'react';
import type { DownloadProgress } from '@/services/api';

interface DownloadProgressDialogProps {
  isOpen: boolean;
  filename: string;
  fileSize: number;
  progress: DownloadProgress;
  onClose: () => void;
  onMinimize: () => void;
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化时间
const formatTime = (seconds: number): string => {
  if (seconds < 0 || !isFinite(seconds)) return '--:--';
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}分${secs}秒`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}时${remainMins}分`;
};

// 解析速度字符串获取字节/秒
const parseSpeed = (speedStr: string): number => {
  if (!speedStr || speedStr === '0 B/s') return 0;
  const match = speedStr.match(/^([\d.]+)\s*(B|KB|MB|GB)\/s$/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
  return value * (multipliers[unit] || 1);
};

const DownloadProgressDialog = ({
  isOpen,
  filename,
  fileSize,
  progress,
  onClose,
  onMinimize
}: DownloadProgressDialogProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [smoothSpeed, setSmoothSpeed] = useState('0 B/s');
  
  // 平滑进度动画
  useEffect(() => {
    const targetProgress = progress.progress || 0;
    const currentProgress = displayProgress;
    
    if (Math.abs(targetProgress - currentProgress) < 0.5) {
      setDisplayProgress(targetProgress);
      return;
    }
    
    // 平滑过渡
    const step = (targetProgress - currentProgress) / 10;
    const timer = setInterval(() => {
      setDisplayProgress(prev => {
        const next = prev + step;
        if ((step > 0 && next >= targetProgress) || (step < 0 && next <= targetProgress)) {
          clearInterval(timer);
          return targetProgress;
        }
        return next;
      });
    }, 30);
    
    return () => clearInterval(timer);
  }, [progress.progress]);
  
  // 平滑速度显示
  useEffect(() => {
    if (progress.speed) {
      setSmoothSpeed(progress.speed);
    }
  }, [progress.speed]);
  
  if (!isOpen) return null;
  
  const speed = parseSpeed(progress.speed || '0 B/s');
  const remainingBytes = fileSize - (progress.bytes_received || 0);
  const remainingTime = speed > 0 ? remainingBytes / speed : -1;
  const isCompleted = progress.stage === 'completed';
  const isError = progress.stage === 'error';
  const isDownloading = progress.stage === 'downloading';
  
  // 计算进度条颜色
  const getProgressColor = () => {
    if (isError) return 'from-red-500 to-red-400';
    if (isCompleted) return 'from-emerald-500 to-emerald-400';
    return 'from-blue-500 via-blue-400 to-cyan-400';
  };
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMinimize} />
      
      {/* 弹窗主体 */}
      <div 
        className="relative bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        style={{ 
          width: 420,
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* 图标动画 */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isCompleted ? 'bg-emerald-500/20' : 
              isError ? 'bg-red-500/20' : 
              'bg-blue-500/20'
            }`}>
              {isCompleted ? (
                <i className="fa-solid fa-check text-lg text-emerald-400" />
              ) : isError ? (
                <i className="fa-solid fa-circle-exclamation text-lg text-red-400" />
              ) : (
                <i className="fa-solid fa-cloud-arrow-down text-lg text-blue-400 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-100">
                {isCompleted ? '下载完成' : isError ? '下载失败' : '正在下载'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{filename}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onMinimize}
              className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
              title="最小化到后台"
            >
              <i className="fa-solid fa-minus text-sm" />
            </button>
            {isCompleted || isError ? (
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                title="关闭"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            ) : null}
          </div>
        </div>
        
        {/* 进度区域 */}
        <div className="px-5 py-6">
          {/* 大百分比显示 */}
          <div className="text-center mb-4">
            <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {Math.round(displayProgress)}%
            </span>
          </div>
          
          {/* 进度条 - 游戏风格 */}
          <div className="relative mb-5">
            {/* 背景轨道 */}
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              {/* 进度填充 */}
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300 relative`}
                style={{ width: `${displayProgress}%` }}
              >
                {/* 光效动画 */}
                {isDownloading && (
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                      style={{ 
                        animation: 'shimmer 1.5s infinite',
                        transform: 'skewX(-20deg)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 进度条上的光点 */}
            {isDownloading && displayProgress > 0 && (
              <div 
                className="absolute top-0 w-3 h-3 rounded-full bg-white shadow-lg shadow-blue-400/50"
                style={{ 
                  left: `calc(${displayProgress}% - 6px)`,
                  top: '0px',
                  animation: 'pulse 1s infinite'
                }}
              />
            )}
          </div>
          
          {/* 详细信息 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* 文件大小 */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">文件大小</div>
              <div className="text-sm font-medium text-gray-200">{formatFileSize(fileSize)}</div>
            </div>
            
            {/* 下载速度 */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">下载速度</div>
              <div className={`text-sm font-medium ${isDownloading ? 'text-blue-400' : 'text-gray-200'}`}>
                {smoothSpeed}
              </div>
            </div>
            
            {/* 剩余时间 */}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">剩余时间</div>
              <div className="text-sm font-medium text-gray-200">
                {isCompleted ? '已完成' : formatTime(remainingTime)}
              </div>
            </div>
          </div>
          
          {/* 传输详情 */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              已下载: {formatFileSize(progress.bytes_received || 0)}
            </span>
            <span>
              {progress.message || '准备中...'}
            </span>
          </div>
        </div>
        
        {/* 底部操作区 */}
        {(isCompleted || isError) && (
          <div className="px-5 py-4 border-t border-white/5 bg-white/[0.02]">
            <button
              onClick={isCompleted ? onClose : onMinimize}
              className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                isCompleted 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:from-emerald-400 hover:to-emerald-300'
                  : 'bg-gradient-to-r from-red-500 to-red-400 text-white hover:from-red-400 hover:to-red-300'
              }`}
            >
              {isCompleted ? '完成' : '关闭'}
            </button>
          </div>
        )}
        
        {/* 装饰性背景 */}
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>
    </div>
  );
};

export default DownloadProgressDialog;