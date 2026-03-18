import React from 'react';
import { LoadingOverlay, ErrorOverlay } from './Dialogs';

interface MinimizedViewProps {
  hostName: string;
  windowPosition: { x: number; y: number };
  windowSize: { width: number };
  connecting: boolean;
  error: string | null;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const MinimizedView: React.FC<MinimizedViewProps> = ({
  hostName,
  windowPosition,
  windowSize,
  connecting,
  error,
  onClose,
  onMinimize,
  onMaximize,
  onMouseDown
}) => {
  return (
    <>
      <LoadingOverlay isOpen={connecting} hostName={hostName} />
      <ErrorOverlay isOpen={!!error && !connecting} error={error} onClose={onClose} />

      {!connecting && !error && (
        <div 
          className="fixed z-50 animate-fade-in"
          style={{ 
            left: windowPosition.x, 
            top: windowPosition.y,
            width: windowSize.width
          }}
          onMouseDown={onMouseDown}
        >
          {/* Minimized Title Bar - Mac Style - Consistent with terminal */}
          <div className="window-header bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] rounded-lg shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center px-3 py-2">
              {/* Mac Window Controls - Consistent with terminal */}
              <div className="flex items-center gap-2 mr-4">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors flex items-center justify-center group"
                >
                  <i className="fa-solid fa-xmark text-[10px] text-[#990000] opacity-0 group-hover:opacity-100" />
                </button>
                <button
                  onClick={onMinimize}
                  className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors flex items-center justify-center group"
                >
                  <i className="fa-solid fa-minus text-[10px] text-[#985700] opacity-0 group-hover:opacity-100" />
                </button>
                <button
                  onClick={onMaximize}
                  className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors flex items-center justify-center group"
                >
                  <i className="fa-solid fa-expand text-[10px] text-[#006500] opacity-0 group-hover:opacity-100" />
                </button>
              </div>
              
              <span className="text-xs text-gray-400 font-medium">SFTP - {hostName}</span>
              
              <div className="flex-1" />
              
              <button
                onClick={onMinimize}
                className="p-1 text-gray-400 hover:text-white"
              >
                <i className="fa-solid fa-chevron-up text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MinimizedView;
