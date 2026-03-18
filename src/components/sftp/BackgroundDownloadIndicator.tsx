import React from 'react';
import type { SFTPFile, DownloadProgress } from '@/services/api';

interface BackgroundDownloadIndicatorProps {
  backgroundDownload: {
    file: SFTPFile;
    progress: DownloadProgress;
  } | null;
  showDownloadProgress: boolean;
  onRestore: () => void;
}

export const BackgroundDownloadIndicator: React.FC<BackgroundDownloadIndicatorProps> = ({
  backgroundDownload,
  showDownloadProgress,
  onRestore
}) => {
  if (!backgroundDownload || showDownloadProgress) return null;
  
  const { file, progress } = backgroundDownload;
  
  // Only show for active downloads
  if (progress.stage !== 'downloading' && progress.stage !== 'init') return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-up cursor-pointer"
      onClick={onRestore}
    >
      <div className="bg-gradient-to-r from-blue-600/90 to-cyan-600/90 backdrop-blur-xl rounded-full px-5 py-2.5 shadow-lg border border-white/20 flex items-center gap-3 hover:scale-105 transition-transform">
        {/* Download icon */}
        <div className="relative">
          <i className="fa-solid fa-cloud-arrow-down text-white text-lg" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        
        {/* Progress info */}
        <div className="flex items-center gap-3 text-white">
          <span className="text-sm font-medium max-w-[150px] truncate">
            {file.name}
          </span>
          <span className="text-sm font-bold">
            {Math.round(progress.progress)}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        
        {/* Speed */}
        {progress.speed && (
          <span className="text-xs text-white/80">
            {progress.speed}
          </span>
        )}
        
        {/* Click hint */}
        <span className="text-xs text-white/60 ml-2">
          Click to view
        </span>
      </div>
    </div>
  );
};

export default BackgroundDownloadIndicator;
