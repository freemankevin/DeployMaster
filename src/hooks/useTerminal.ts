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
    fontFamily: '"JetBrains Mono", "SF Mono", "Monaco", "Menlo", "Consolas", "Liberation Mono", "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#28c840',
      cursorAccent: '#1e1e1e',
      selectionBackground: 'rgba(0, 122, 255, 0.3)',
      selectionForeground: '#ffffff',
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
    // Enable mouse events for selection and right-click
    mouseEvents: true,
    // Disable default right-click behavior, handle manually
    rightClickSelectsWord: false,
    // Disable default copy on selection, handle manually
    copyOnSelect: false,
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

    // ========================================
    // Copy/Paste functionality (Tabby-like)
    // ========================================
    
    // Helper: paste text to terminal
    const pasteText = (text: string) => {
      if (!text) return;
      const currentWs = wsRef.current;
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        try {
          currentWs.send(JSON.stringify({ type: 'data', data: text }));
        } catch (e) {}
      }
    };

    // Helper: copy text to clipboard
    const copyToClipboard = (text: string) => {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          // Fallback: try to use execCommand for older browsers
          try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, textarea.value.length);
            document.execCommand('copy');
            document.body.removeChild(textarea);
          } catch (e) {}
        });
      }
    };

    // Helper: read plain text from clipboard (removes formatting/background colors)
    // This solves the "white background block" issue when pasting from rich text sources
    const readPlainTextFromClipboard = async (): Promise<string> => {
      try {
        // Try to read as plain text first using Clipboard API
        if (navigator.clipboard && navigator.clipboard.readText) {
          return await navigator.clipboard.readText();
        }
      } catch (e) {
        // Clipboard API failed, try fallback method
      }
      
      // Fallback: use execCommand to paste into a hidden textarea
      // This ensures we get plain text only, stripping all formatting
      return new Promise((resolve) => {
        try {
          const textarea = document.createElement('textarea');
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.left = '-9999px';
          textarea.style.top = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          
          // Try to execute paste command
          const success = document.execCommand('paste');
          if (success) {
            const text = textarea.value;
            document.body.removeChild(textarea);
            resolve(text);
          } else {
            document.body.removeChild(textarea);
            resolve('');
          }
        } catch (e) {
          resolve('');
        }
      });
    };

    // 1. Auto-copy on selection - use mouseup event to detect selection complete
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        if (term.hasSelection()) {
          const selection = term.getSelection();
          if (selection) {
            copyToClipboard(selection);
          }
        }
      }, 10);
    };

    // 2. Use attachCustomKeyEventHandler for keyboard shortcuts
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // Shift+Insert for paste (plain text only - no background colors)
      if (event.shiftKey && event.key === 'Insert') {
        event.preventDefault();
        event.stopPropagation();
        
        // Focus terminal first
        term.focus();
        
        // Read plain text from clipboard and paste
        readPlainTextFromClipboard().then((text) => {
          if (text) {
            pasteText(text);
          }
        });
        return false; // Prevent default handling
      }
      
      // Ctrl+Shift+C for explicit copy
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        const selection = term.getSelection();
        if (selection) {
          copyToClipboard(selection);
        }
        return false;
      }
      
      // Ctrl+Shift+V for paste (plain text only)
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        event.stopPropagation();
        
        // Focus terminal first
        term.focus();
        
        // Read plain text from clipboard and paste
        readPlainTextFromClipboard().then((text) => {
          if (text) {
            pasteText(text);
          }
        });
        return false;
      }
      
      return true; // Let xterm.js handle other keys normally
    });

    // 3. Context menu (right-click) - paste directly with plain text
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Focus terminal before pasting
      term.focus();
      
      // Read plain text from clipboard and paste (no formatting/background)
      readPlainTextFromClipboard().then((text) => {
        if (text) {
          pasteText(text);
        }
      });
    };

    // Bind events to the terminal element and its children
    const terminalElement = terminalRef.current;
    
    // Bind mouseup for auto-copy on selection
    terminalElement.addEventListener('mouseup', handleMouseUp);
    
    // Bind contextmenu to all relevant elements
    terminalElement.addEventListener('contextmenu', handleContextMenu as EventListener);
    
    // Also bind to xterm-screen (the main terminal display area)
    const xtermScreen = terminalElement.querySelector('.xterm-screen') as HTMLElement | null;
    if (xtermScreen) {
      xtermScreen.addEventListener('contextmenu', handleContextMenu as EventListener);
      xtermScreen.addEventListener('mouseup', handleMouseUp);
    }

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
      
      // Remove all event listeners
      terminalElement.removeEventListener('contextmenu', handleContextMenu as EventListener);
      terminalElement.removeEventListener('mouseup', handleMouseUp);
      
      // Remove from xterm-screen
      const xtermScreenCleanup = terminalElement.querySelector('.xterm-screen');
      if (xtermScreenCleanup) {
        xtermScreenCleanup.removeEventListener('contextmenu', handleContextMenu as EventListener);
        xtermScreenCleanup.removeEventListener('mouseup', handleMouseUp);
      }
      
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