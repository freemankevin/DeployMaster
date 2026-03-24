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
          xtermRef.current.writeln(`\r\n\x1b[33m[Connection closed due to ${idleTimeout} minutes of inactivity]\x1b[0m\r\n`);
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
        <div className={`fixed inset-0 z-50 transition-all duration-300 bg-black/60 backdrop-blur-md flex items-center justify-center animate-fade-in opacity-100`}>
          <div className={`bg-background-primary/95 backdrop-blur-xl border border-border-primary rounded-xl flex flex-col overflow-hidden animate-scale-in transition-all duration-300 ${
            isFullscreen ? 'fixed inset-4 w-auto h-auto max-w-none rounded-2xl' : 'w-full max-w-4xl h-[600px] rounded-xl'
          }`}
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 100px -20px rgba(0,0,0,0.3)' }}>
            
            {/* Terminal Header - macOS Dark Mode style */}
            <div className="bg-gradient-to-b from-background-tertiary to-background-secondary px-4 py-2 border-b border-border-secondary flex items-center justify-between select-none">
              {/* macOS window buttons - left */}
              <div className="flex gap-2">
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-macos-red hover:brightness-110 transition-colors group flex items-center justify-center" title="Close">
                  <i className="fa-solid fa-xmark text-[10px] text-white/60 opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={toggleMinimize} className="w-3 h-3 rounded-full bg-macos-orange hover:brightness-110 transition-colors group flex items-center justify-center" title="Minimize">
                  <i className="fa-solid fa-minus text-[10px] text-white/60 opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={toggleFullscreen} className="w-3 h-3 rounded-full bg-macos-green hover:brightness-110 transition-colors group flex items-center justify-center" title="Fullscreen">
                  <i className="fa-solid fa-plus text-[9px] text-white/60 opacity-0 group-hover:opacity-100" />
                </button>
              </div>
              {/* Connection status - center */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-text-secondary" style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif', fontSize: '12px' }}>
                {connected ? (
                  <>
                    <i className="fa-solid fa-plug-circle-check text-macos-green" />
                    <div className="flex items-center gap-1.5 group/copy">
                      <span className="cursor-pointer hover:text-white transition-colors">{host.address}</span>
                      <button
                        onClick={() => copyToClipboard(host.address, 'terminal-ip')}
                        className="p-1 rounded transition-all relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
                        title="Copy IP"
                      >
                        {copiedField === 'terminal-ip' ? (
                          <i className="fa-solid fa-check text-xs text-macos-green"></i>
                        ) : (
                          <i className="fa-regular fa-copy text-xs text-text-tertiary hover:text-white"></i>
                        )}
                        {copiedField === 'terminal-ip' && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-fade-in">
                            <div className="bg-background-elevated text-white text-[10px] px-2 py-1 rounded shadow-macos-dropdown whitespace-nowrap">
                              Copied!
                            </div>
                            <div className="w-2 h-2 bg-background-elevated rotate-45 -mt-1"></div>
                          </div>
                        )}
                      </button>
                    </div>
                  </>
                ) : connecting ? (
                  <>
                    <i className="fa-solid fa-plug animate-pulse text-macos-orange" />
                    <span className="text-macos-orange">Connecting...</span>
                  </>
                ) : error ? (
                  <button onClick={reconnect} className="flex items-center gap-1.5 px-2 py-1 bg-macos-blue/20 hover:bg-macos-blue/30 text-macos-blue rounded transition-colors">
                    <i className="fa-solid fa-rotate-right text-sm" />
                    <span>Reconnect</span>
                  </button>
                ) : (
                  <>
                    <i className="fa-solid fa-plug-circle-xmark text-macos-red" />
                    <span className="text-macos-red">Disconnected</span>
                  </>
                )}
              </div>
              {/* Placeholder for spacing */}
              <div className="w-[60px]"></div>
            </div>
            
            {/* Terminal Body */}
            <div className="flex-1 bg-[#0a0a0a] overflow-hidden relative" onClick={handleTerminalClick}>
              <div ref={terminalRef} className="w-full h-full p-2 pb-3 relative z-10" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TerminalModal;