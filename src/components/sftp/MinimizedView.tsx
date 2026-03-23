import React from 'react';
import { LoadingOverlay, ErrorOverlay } from './Dialogs';

interface MinimizedViewProps {
  hostName: string;
  hostAddress?: string;
  connecting: boolean;
  connected?: boolean;
  error: string | null;
  onClose: () => void;
  onRestore: () => void;
}

export const MinimizedView: React.FC<MinimizedViewProps> = ({
  hostName,
  hostAddress,
  connecting,
  connected = true,
  error,
  onClose,
  onRestore
}) => {
  // Display address or name
  const displayText = hostAddress || hostName;
  
  return (
    <>
      <LoadingOverlay isOpen={connecting} hostName={hostName} />
      <ErrorOverlay isOpen={!!error && !connecting} error={error} onClose={onClose} />

      {!connecting && !error && (
        <div className="fixed bottom-6 right-6 z-[60] cursor-pointer group animate-fade-in">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 hover:bg-[#2a2a2a]/95 transition-all duration-300 hover:scale-105 overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 10px 40px -10px rgba(0,0,0,0.5)' }}>
            {/* SFTP Icon with solid color matching card */}
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-folder-open text-white text-sm" />
            </div>
            
            {/* Connection status and host info */}
            <div 
              className="flex items-center gap-2 flex-1 min-w-0" 
              onClick={onRestore}
              style={{ fontFamily: '"JetBrains Mono", "SF Mono", "Monaco", "Menlo", "Consolas", monospace', fontSize: '13px' }}
            >
              {connected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-gray-300 truncate">{displayText}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="text-red-400">DISCONNECTED</span>
                </>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="ml-1 w-6 h-6 rounded-full bg-[#ff5f57]/20 hover:bg-[#ff5f57] flex items-center justify-center transition-colors group/close shrink-0"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-[10px] text-gray-400 group-hover/close:text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MinimizedView;
