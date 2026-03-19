import { useState, useEffect, useRef, useCallback } from 'react';
import type { SSHHost } from '@/types';
import useTerminal from '@/hooks/useTerminal';

interface TerminalModalProps {
  host: SSHHost;
  onClose: () => void;
}

// Idle timeout options (minutes)
const IDLE_TIMEOUT_OPTIONS = [
  { value: 10, label: '10m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 180, label: '3h' },
];

const TerminalModal = ({ host, onClose }: TerminalModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState(10);
  const [showTimeoutSelector, setShowTimeoutSelector] = useState(false);
  
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      document.body.style.overflow = '';
    } else {
      setTimeout(() => fitTerminal(), 100);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isMinimized) {
        e.preventDefault();
        toggleMinimize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMinimized]);

  const handleTerminalClick = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <>
      {/* Minimized floating button */}
      {isMinimized && (
        <div onClick={toggleMinimize} className="fixed bottom-6 right-6 z-[60] cursor-pointer group">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 hover:bg-[#2a2a2a]/95 transition-all duration-300 hover:scale-105"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 10px 40px -10px rgba(0,0,0,0.5)' }}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <i className="fa-solid fa-server text-white text-sm" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-200">{host.username}@{host.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {connected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] text-gray-400">Connected · Click to restore</span>
                  </>
                ) : (
                  <span className="text-[10px] text-red-400">Disconnected</span>
                )}
              </div>
            </div>
            <div className="ml-2 text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">Tab</div>
          </div>
        </div>
      )}

      {/* Terminal main window */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${
        isMinimized
          ? 'pointer-events-none opacity-0 scale-95'
          : 'bg-black/40 backdrop-blur-md flex items-center justify-center animate-fade-in opacity-100'
      }`}>
        <div className={`bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden animate-scale-in transition-all duration-300 ${
          isFullscreen ? 'fixed inset-4 w-auto h-auto max-w-none rounded-2xl' : 'w-full max-w-4xl h-[600px] rounded-xl'
        }`}
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 100px -20px rgba(0,0,0,0.3)' }}>
          
          {/* Terminal Header - macOS style */}
          <div className="bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] px-4 py-2 border-b border-white/5 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              {/* macOS window buttons */}
              <div className="flex gap-2">
                <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors group flex items-center justify-center" title="Close">
                  <i className="fa-solid fa-xmark text-[10px] text-[#990000] opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={toggleMinimize} className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors group flex items-center justify-center" title="Minimize (Tab to restore)">
                  <i className="fa-solid fa-minus text-[10px] text-[#985700] opacity-0 group-hover:opacity-100" />
                </button>
                <button onClick={toggleFullscreen} className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors group flex items-center justify-center" title="Fullscreen">
                  <i className="fa-solid fa-expand text-[10px] text-[#006500] opacity-0 group-hover:opacity-100" />
                </button>
              </div>
              {/* Connection info */}
              <div className="ml-3 flex items-center gap-2 text-sm">
                <i className="fa-solid fa-server text-blue-400 text-[14px]" />
                <span className="text-gray-300 text-xs">{host.username}@{host.name}</span>
                {connected ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected
                  </span>
                ) : connecting ? (
                  <span className="text-[10px] text-yellow-400">Connecting...</span>
                ) : (
                  <span className="text-[10px] text-red-400">Disconnected</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Idle timeout selector */}
              <div className={`relative ${showTimeoutSelector ? 'z-40' : ''}`}>
                <button onClick={() => setShowTimeoutSelector(!showTimeoutSelector)} className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-gray-200 transition-colors text-xs" title="Idle timeout">
                  <i className="fa-solid fa-clock text-[14px]" />
                  <span>{IDLE_TIMEOUT_OPTIONS.find(o => o.value === idleTimeout)?.label}</span>
                </button>
                {showTimeoutSelector && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowTimeoutSelector(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-2xl py-1 z-[60] backdrop-blur-xl">
                      <div className="px-3 py-1 text-[10px] text-gray-500 border-b border-white/5">Timeout</div>
                      {IDLE_TIMEOUT_OPTIONS.map((option) => (
                        <button key={option.value} onClick={() => {
                          setIdleTimeout(option.value);
                          setShowTimeoutSelector(false);
                          resetIdleTimer();
                        }} className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          idleTimeout === option.value ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'
                        }`}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {error && (
                <button onClick={reconnect} className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-md text-xs transition-colors">
                  Reconnect
                </button>
              )}
            </div>
          </div>
          
          {/* Terminal Body */}
          <div className="flex-1 bg-[#1e1e1e] overflow-hidden relative" onClick={handleTerminalClick}>
            <div ref={terminalRef} className="w-full h-full p-2 pb-3 relative z-10" />
          </div>
        </div>
      </div>
    </>
  );
};

export default TerminalModal;