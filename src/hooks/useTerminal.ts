import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import { terminalApi } from '@/services/api';
import { setupTerminalClipboard } from './useTerminalClipboard';
import { setupTerminalEvents } from './useTerminalEvents';
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

const createTerminalConfig = () => ({
  cursorBlink: true,
  cursorStyle: 'bar' as const,
  fontSize: 13,
  fontWeight: 'normal' as const,
  fontWeightBold: 'bold' as const,
  fontFamily: '"JetBrains Mono", "SF Mono", "Monaco", "Menlo", "Consolas", monospace',
  theme: {
    // macOS Terminal style dark background
    background: '#0d0d0d',
    foreground: '#e0e0e0',
    cursor: '#28c840',
    cursorAccent: '#0d0d0d',
    selectionBackground: 'rgba(0, 122, 255, 0.3)',
    selectionForeground: '#ffffff',
    // ANSI colors - macOS Terminal palette
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
  allowTransparency: false,
  convertEol: true,
  letterSpacing: 0,
  lineHeight: 1.15,
  drawBoldTextInBrightColors: true,
  minimumContrastRatio: 1,
  mouseEvents: true,
  rightClickSelectsWord: false,
  copyOnSelect: false,
});

export const useTerminal = ({
  hostId,
  onConnected,
  onDisconnected,
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
  const cleanupRef = useRef<(() => void) | null>(null);

  const fitTerminal = useCallback(() => {
    const element = terminalRef.current;
    const term = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    if (!element || !term || !fitAddon) return;
    const rect = element.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 50) return;
    try {
      fitAddon.fit();
      if (term.rows > 1) term.resize(term.cols, term.rows - 1);
    } catch (e) {}
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
      }
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!terminalRef.current) return;

    const term = new Terminal(createTerminalConfig());
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new Unicode11Addon());
    term.unicode.activeVersion = '11';
    term.open(terminalRef.current);

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
    } catch (e) {}

    setTimeout(() => fitTerminal(), 50);
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    term.focus();

    // Setup clipboard (uses ClipboardAddon in HTTPS, native events in HTTP)
    const { clipboardAddon, handlers } = setupTerminalClipboard(term, wsRef);
    if (clipboardAddon) {
      term.loadAddon(clipboardAddon);
    }

    // Setup keyboard and mouse events
    const eventSetup = setupTerminalEvents();
    eventSetup.attachKeyHandler(term, handlers);

    // WebSocket connection
    const ws = new WebSocket(terminalApi.getWebSocketUrl(hostId));
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setConnecting(false);
      setConnected(true);
      setError('');
      startHeartbeat();
      try { ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows })); } catch (e) {}
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
          try { ws.send(JSON.stringify({ type: 'data', data: '\r' })); } catch (e) {}
        }
        term.focus();
      }, 300);
      onConnected?.();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;
        if (msg.type === 'connected') {
          term.writeln(`\r\n\x1b[32m✓ ${msg.message}\x1b[0m\r\n`);
          term.focus();
        } else if (msg.type === 'data') {
          term.write(msg.data);
        } else if (msg.error) {
          term.writeln(`\r\n\x1b[31m✗ Error: ${msg.error}\x1b[0m\r\n`);
        }
      } catch (e) { term.write(event.data); }
    };

    ws.onerror = () => { if (!mountedRef.current) return; };
    ws.onclose = () => {
      stopHeartbeat();
      if (!mountedRef.current) return;
      setConnected(false);
      term.writeln(`\r\n\x1b[33m[Connection closed]\x1b[0m\r\n`);
      onDisconnected?.();
    };

    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ type: 'data', data })); } catch (e) {}
      }
    });

    term.onResize(({ cols, rows }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows })); } catch (e) {}
      }
    });

    // Attach DOM events
    const cleanup = eventSetup.attachEvents(terminalRef.current!, handlers, term);
    cleanupRef.current = cleanup;

    // Resize observer
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => fitTerminal(), 100);
    };
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) debouncedResize();
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
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      cleanupRef.current?.();
      if (wsRef.current) {
        try {
          wsRef.current.onopen = wsRef.current.onmessage = wsRef.current.onerror = wsRef.current.onclose = null;
          if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close(1000, 'Unmounted');
          }
        } catch (e) {}
        wsRef.current = null;
      }
      try { term.dispose(); } catch (e) {}
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [hostId, fitTerminal, startHeartbeat, stopHeartbeat, onConnected, onDisconnected]);

  const reconnect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setConnecting(true);
    setConnected(false);
    setError('');
    window.location.reload();
  }, []);

  return { terminalRef, xtermRef, wsRef, connected, connecting, error, fitTerminal, reconnect };
};

export default useTerminal;