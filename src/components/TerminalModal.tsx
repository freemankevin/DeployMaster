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

  // Re-fit terminal when restoring from minimized state
  useEffect(() => {
    if (!isMinimized && connected) {
      // Delay to allow DOM to update
      const timer = setTimeout(() => {
        fitTerminal();
        // Force xterm to refresh its display
        if (xtermRef.current) {
          xtermRef.current.refresh(0, xtermRef.current.rows - 1);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMinimized, connected, fitTerminal, xtermRef]);

  const handleTerminalClick = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <>
      {/* Terminal main window - always render but hide when minimized */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 flex items-center justify-center ${
          isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}>
        <div className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-none rounded-2xl' : 'w-full max-w-4xl h-[600px] rounded-xl'
        }`}
            style={{
              background: 'linear-gradient(145deg, rgba(30, 30, 35, 0.95) 0%, rgba(24, 24, 28, 0.98) 100%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              backdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: isFullscreen ? '16px' : '12px',
              boxShadow: `
                0 0 0 1px rgba(255, 255, 255, 0.05),
                0 2px 8px rgba(0, 0, 0, 0.6),
                0 8px 24px rgba(0, 0, 0, 0.5),
                0 20px 48px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.08),
                inset 0 -1px 0 rgba(0, 0, 0, 0.3)
              `
            }}>
            
            {/* Terminal Header - Railway Dark Mode style */}
            <div className="relative px-4 py-2.5 flex items-center justify-between select-none"
              style={{
                background: 'linear-gradient(180deg, rgba(26, 24, 37, 0.95) 0%, rgba(31, 29, 43, 0.98) 100%)',
                borderBottom: '1px solid rgba(139, 92, 246, 0.08)',
                borderTopLeftRadius: isFullscreen ? '16px' : '12px',
                borderTopRightRadius: isFullscreen ? '16px' : '12px',
              }}>
              {/* Subtle top highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              {/* macOS window buttons - left */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #ff6b6b 0%, #ff5252 100%)',
                    boxShadow: '0 0.5px 1px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.2)'
                  }}
                  title="Close">
                  <i className="fa-solid fa-xmark text-[9px] text-[#8b0000] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button
                  onClick={toggleMinimize}
                  className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #ffd93d 0%, #ffbe0b 100%)',
                    boxShadow: '0 0.5px 1px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.2)'
                  }}
                  title="Minimize">
                  <i className="fa-solid fa-minus text-[9px] text-[#8b6914] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #51cf66 0%, #40c057 100%)',
                    boxShadow: '0 0.5px 1px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.2)'
                  }}
                  title="Fullscreen">
                  <i className="fa-solid fa-plus text-[8px] text-[#1a5c1a] opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <button onClick={reconnect} className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors">
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
            
            {/* Terminal Body - Railway Dark Mode style with subtle inner shadow */}
            <div
              className="flex-1 overflow-hidden relative"
              onClick={handleTerminalClick}
              style={{
                background: 'linear-gradient(180deg, #0D0D0D 0%, #0A0A0A 100%)',
                borderBottomLeftRadius: isFullscreen ? '16px' : '12px',
                borderBottomRightRadius: isFullscreen ? '16px' : '12px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
              }}>
              {/* Subtle scanline effect for terminal feel */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
                }}
              />
              {/* Terminal content with reduced padding to eliminate gap */}
              <div
                className="absolute inset-0 p-0"
                style={{
                  borderBottomLeftRadius: isFullscreen ? '16px' : '12px',
                  borderBottomRightRadius: isFullscreen ? '16px' : '12px',
                  overflow: 'hidden'
                }}>
                <div ref={terminalRef} className="w-full h-full relative z-10" />
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default TerminalModal;