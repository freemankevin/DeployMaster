import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import { terminalApi } from '@/services/api';
import '@xterm/xterm/css/xterm.css';

interface UseTerminalOptions {
  hostId: number;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement>;
  xtermRef: React.RefObject<Terminal | null>;
  wsRef: React.RefObject<WebSocket | null>;
  connected: boolean;
  connecting: boolean;
  error: string;
  fitTerminal: () => void;
  reconnect: () => void;
}

export const useTerminal = ({
  hostId,
  onConnected,
  onDisconnected,
  onError
}: UseTerminalOptions): UseTerminalReturn => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string>('');
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Create terminal configuration
  const createTerminalConfig = () => ({
    cursorBlink: true,
    cursorStyle: 'bar' as const,
    fontSize: 13,
    fontWeight: 'normal' as const,
    fontWeightBold: 'bold' as const,
    fontFamily: '"SF Mono", "Monaco", "Menlo", "Consolas", "Liberation Mono", "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#28c840',
      cursorAccent: '#1e1e1e',
      selectionBackground: 'rgba(255, 255, 255, 0.3)',
      selectionForeground: '#000000',
      black: '#000000',
      red: '#ff3b30',
      green: '#28c840',
      yellow: '#ffcc00',
      blue: '#007aff',
      magenta: '#af52de',
      cyan: '#32ade6',
      white: '#ffffff',
      brightBlack: '#666666',
      brightRed: '#ff6961',
      brightGreen: '#5de67a',
      brightYellow: '#ffd60a',
      brightBlue: '#4da3ff',
      brightMagenta: '#c779e8',
      brightCyan: '#5ac8f5',
      brightWhite: '#ffffff',
    },
    scrollback: 5000,
    allowProposedApi: true,
    allowTransparency: true,
    convertEol: true,
    letterSpacing: 0,
    lineHeight: 1.15,
    drawBoldTextInBrightColors: true,
    minimumContrastRatio: 1,
  });

  // Fit terminal to container
  const fitTerminal = useCallback(() => {
    const element = terminalRef.current;
    const term = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    
    if (!element || !term || !fitAddon) return;
    
    const rect = element.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 50) return;
    
    try {
      fitAddon.fit();
      const currentRows = term.rows;
      const currentCols = term.cols;
      if (currentRows > 1) {
        term.resize(currentCols, currentRows - 1);
      }
    } catch (e) {
      // Ignore fit errors
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      const currentWs = wsRef.current;
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        try {
          currentWs.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          // Ignore send errors
        }
      }
    }, 30000);
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Initialize terminal
  useEffect(() => {
    mountedRef.current = true;
    
    if (!terminalRef.current) return;

    // Create terminal
    const term = new Terminal(createTerminalConfig());
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    // Load Unicode11 addon
    const unicode11Addon = new Unicode11Addon();
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';
    
    term.open(terminalRef.current);
    
    // Try to load WebGL addon
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
    } catch (e) {
      // WebGL not available
    }
    
    setTimeout(() => fitTerminal(), 50);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.focus();

    // Establish WebSocket connection
    const wsUrl = terminalApi.getWebSocketUrl(hostId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      
      setConnecting(false);
      setConnected(true);
      setError('');
      startHeartbeat();
      
      const currentRows = term.rows;
      const currentCols = term.cols;
      try {
        ws.send(JSON.stringify({ type: 'resize', cols: currentCols, rows: currentRows }));
      } catch (e) {}
      
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
          try {
            ws.send(JSON.stringify({ type: 'data', data: '\r' }));
          } catch (e) {}
        }
        term.focus();
      }, 300);
      
      onConnected?.();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'pong') return;
        if (message.type === 'connected') {
          term.writeln(`\r\n\x1b[32m✓ ${message.message}\x1b[0m\r\n`);
          term.focus();
        } else if (message.type === 'data') {
          term.write(message.data);
        } else if (message.error) {
          term.writeln(`\r\n\x1b[31m✗ Error: ${message.error}\x1b[0m\r\n`);
        }
      } catch (e) {
        term.write(event.data);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
    };

    ws.onclose = (event) => {
      stopHeartbeat();
      
      if (!mountedRef.current) return;
      
      setConnected(false);
      
      if (event.code !== 1000) {
        setError('Connection closed unexpectedly');
        term.writeln(`\r\n\x1b[33m[Connection closed]\x1b[0m\r\n`);
      } else {
        term.writeln(`\r\n\x1b[33m[Connection closed]\x1b[0m\r\n`);
      }
      
      onDisconnected?.();
    };

    term.onData((data) => {
      const currentWs = wsRef.current;
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        try {
          currentWs.send(JSON.stringify({ type: 'data', data }));
        } catch (e) {}
      }
    });

    term.onResize(({ cols, rows }) => {
      const currentWs = wsRef.current;
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        try {
          currentWs.send(JSON.stringify({ type: 'resize', cols, rows }));
        } catch (e) {}
      }
    });

    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(selection).catch(() => {});
        }
      }
    });

    // Resize handler
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => fitTerminal(), 100);
    };
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          debouncedResize();
        }
      }
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
      resizeObserverRef.current = resizeObserver;
    }
    
    window.addEventListener('resize', debouncedResize);

    // Context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const selection = term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      } else {
        navigator.clipboard.readText().then((text) => {
          const currentWs = wsRef.current;
          if (text && currentWs && currentWs.readyState === WebSocket.OPEN) {
            try {
              currentWs.send(JSON.stringify({ type: 'data', data: text }));
            } catch (e) {}
          }
        }).catch(() => {});
      }
    };
    
    const terminalElement = terminalRef.current;
    terminalElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      stopHeartbeat();
      window.removeEventListener('resize', debouncedResize);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      terminalElement.removeEventListener('contextmenu', handleContextMenu);
      
      const currentWs = wsRef.current;
      if (currentWs) {
        try {
          currentWs.onopen = null;
          currentWs.onmessage = null;
          currentWs.onerror = null;
          currentWs.onclose = null;
          
          if (currentWs.readyState === WebSocket.OPEN || currentWs.readyState === WebSocket.CONNECTING) {
            currentWs.close(1000, 'Component unmounted');
          }
        } catch (e) {}
        wsRef.current = null;
      }
      
      try {
        term.dispose();
      } catch (e) {}
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [hostId, fitTerminal, startHeartbeat, stopHeartbeat, onConnected, onDisconnected]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnecting(true);
    setConnected(false);
    setError('');
    window.location.reload();
  }, []);

  return {
    terminalRef,
    xtermRef,
    wsRef,
    connected,
    connecting,
    error,
    fitTerminal,
    reconnect
  };
};

export default useTerminal;