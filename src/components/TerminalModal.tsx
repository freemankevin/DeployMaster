import { useState, useEffect, useRef, useCallback } from 'react';
import type { SSHHost } from '@/types';
import useTerminal from '@/hooks/useTerminal';

interface TerminalModalProps {
  host: SSHHost;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

// Default idle timeout: 30 minutes
const DEFAULT_IDLE_TIMEOUT = 30;

const TerminalModal = ({ host, onClose, isMinimized: externalMinimized, onToggleMinimize }: TerminalModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [internalMinimized, setInternalMinimized] = useState(false);
  const [idleTimeout] = useState(DEFAULT_IDLE_TIMEOUT);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Use external minimized state if provided, otherwise use internal state
  const isMinimized = externalMinimized !== undefined ? externalMinimized : internalMinimized;
  
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Copy to clipboard with feedback
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  const {
    terminalRef,
    xtermRef,
    wsRef,
    connected,
    connecting,
    error,
    fitTerminal,
    reconnect
  } = useTerminal({
    hostId: host.id
  });

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const timeoutMs = idleTimeout * 60 * 1000;
      if (idleTime >= timeoutMs) {
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n\x1b[33m[Connection closed due to ${idleTimeout} min idle]\x1b[0m\r\n`);
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
      }
    }, idleTimeout * 60 * 1000);
  }, [idleTimeout, xtermRef, wsRef]);

  useEffect(() => {
    const handleActivity = () => {
      if (connected) {
        resetIdleTimer();
      }
    };

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    
    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [connected, resetIdleTimer]);

  useEffect(() => {
    if (connected) {
      resetIdleTimer();
    }
  }, [connected, resetIdleTimer]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => fitTerminal(), 100);
  };

  const toggleMinimize = () => {
    if (onToggleMinimize) {
      onToggleMinimize();
    } else {
      setInternalMinimized(!internalMinimized);
    }
    if (!isMinimized) {
      document.body.style.overflow = '';
    } else {
      setTimeout(() => fitTerminal(), 100);
    }
  };

  const handleTerminalClick = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <>
      {/* Terminal main window - only render if not minimized */}
      {!isMinimized && (
        <div className={`fixed inset-0 z-50 transition-all duration-300 bg-black/40 backdrop-blur-md flex items-center justify-center animate-fade-in opacity-100`}>
          <div className={`bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden animate-scale-in transition-all duration-300 ${
            isFullscreen ? 'fixed inset-4 w-auto h-auto max-w-none rounded-2xl' : 'w-full max-w-4xl h-[600px] rounded-xl'
          }`}
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 100px -20px rgba(0,0,0,0.3)' }}>
            
            {/* Terminal Header - macOS style */}
            <div className="bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] px-4 py-2 border-b border-white/5 flex items-center justify-between select-none">
              {/* macOS window buttons - left */}
              <div className="flex gap-2">
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors group flex items-center justify-center" title="Close">
                  <i className="fa-solid fa-xmark text-[10px] text-[#990000] opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={toggleMinimize} className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors group flex items-center justify-center" title="Minimize (Tab to restore)">
                  <i className="fa-solid fa-minus text-[10px] text-[#985700] opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={toggleFullscreen} className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors group flex items-center justify-center" title="Fullscreen">
                  <i className="fa-solid fa-plus text-[9px] text-[#006500] opacity-0 group-hover:opacity-100" />
                </button>
              </div>
              {/* Connection status - center */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-gray-400" style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif', fontSize: '12px' }}>
                {connected ? (
                  <>
                    <i className="fa-solid fa-plug-circle-check text-emerald-400" />
                    <div className="flex items-center gap-1.5 group/copy">
                      <span className="cursor-pointer hover:text-gray-200 transition-colors">{host.address}</span>
                      <button
                        onClick={() => copyToClipboard(host.address, 'terminal-ip')}
                        className="p-1 rounded transition-all relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
                        title="Copy IP"
                      >
                        {copiedField === 'terminal-ip' ? (
                          <i className="fa-solid fa-check text-xs text-emerald-500"></i>
                        ) : (
                          <i className="fa-regular fa-copy text-xs text-gray-400 hover:text-gray-200"></i>
                        )}
                        {copiedField === 'terminal-ip' && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-fade-in">
                            <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              Copied!
                            </div>
                            <div className="w-2 h-2 bg-gray-800 rotate-45 -mt-1"></div>
                          </div>
                        )}
                      </button>
                    </div>
                  </>
                ) : connecting ? (
                  <>
                    <i className="fa-solid fa-plug animate-pulse text-yellow-400" />
                    <span className="text-yellow-400">CONNECTING...</span>
                  </>
                ) : error ? (
                  <button onClick={reconnect} className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors">
                    <i className="fa-solid fa-rotate-right text-sm" />
                    <span>Reconnect</span>
                  </button>
                ) : (
                  <>
                    <i className="fa-solid fa-plug-circle-xmark text-red-400" />
                    <span className="text-red-400">DISCONNECTED</span>
                  </>
                )}
              </div>
              {/* Placeholder for spacing */}
              <div className="w-[60px]"></div>
            </div>
            
            {/* Terminal Body */}
            <div className="flex-1 bg-[#1e1e1e] overflow-hidden relative" onClick={handleTerminalClick}>
              <div ref={terminalRef} className="w-full h-full p-2 pb-3 relative z-10" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TerminalModal;