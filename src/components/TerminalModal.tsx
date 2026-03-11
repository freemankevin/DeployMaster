import { useState, useEffect, useRef } from 'react';
import { X, Maximize, Minimize, Server } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { SSHHost } from '@/types';
import { terminalApi } from '@/services/api';
import '@xterm/xterm/css/xterm.css';

// 调试日志
const debug = (...args: any[]) => {
  console.log('[TerminalModal]', ...args);
};

interface TerminalModalProps {
  host: SSHHost;
  onClose: () => void;
}

const TerminalModal = ({ host, onClose }: TerminalModalProps) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initializedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 建立 WebSocket 连接和 xterm
  useEffect(() => {
    debug('useEffect triggered, terminalRef.current:', terminalRef.current, 'initialized:', initializedRef.current);
    
    // 防止重复初始化 - 使用闭包变量确保只初始化一次
    if (initializedRef.current) {
      debug('Already initialized, skipping');
      return;
    }
    
    if (!terminalRef.current) {
      debug('terminalRef.current is null, returning');
      return;
    }

    // 立即标记为已初始化，防止 React StrictMode 导致的重复初始化
    initializedRef.current = true;
    
    // 如果已经存在清理函数，先执行清理
    if (cleanupRef.current) {
      debug('Cleaning up previous instance before creating new one');
      cleanupRef.current();
      cleanupRef.current = null;
    }

    try {
      debug('Creating xterm instance...');
      // 创建 xterm 实例
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 14,
        fontFamily: '"SF Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "PingFang SC", "Microsoft YaHei", monospace',
        theme: {
          background: '#1e293b',
          foreground: '#e2e8f0',
          cursor: '#22c55e',
          selectionBackground: '#3b82f6',
          black: '#0f172a',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc',
          brightBlack: '#334155',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        scrollback: 10000,
        allowProposedApi: true,
      });

      debug('xterm instance created, loading fit addon...');
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      debug('Opening terminal...');
      term.open(terminalRef.current);
      fitAddon.fit();
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // 建立 WebSocket 连接
      const wsUrl = terminalApi.getWebSocketUrl(host.id);
      debug('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        debug('WebSocket connected');
        setConnecting(false);
        setConnected(true);
        setError('');
        
        // 连接成功后，立即发送当前终端大小
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          debug('Sending initial resize:', dims.cols, 'x', dims.rows);
          ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
        
        // 发送一个回车键来触发命令提示符显示
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'data', data: '\r' }));
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            term.writeln(`\r\n\x1b[32m✓ ${message.message}\x1b[0m\r\n`);
          } else if (message.type === 'data') {
            // 写入数据到终端
            term.write(message.data);
          } else if (message.error) {
            term.writeln(`\r\n\x1b[31m✗ 错误: ${message.error}\x1b[0m\r\n`);
          }
        } catch (e) {
          // 如果不是 JSON，直接写入数据
          term.write(event.data);
        }
      };

      ws.onerror = (error) => {
        debug('WebSocket error:', error);
        setConnecting(false);
        setConnected(false);
        setError('WebSocket 连接错误');
        term.writeln(`\r\n\x1b[31m✗ WebSocket 连接错误\x1b[0m\r\n`);
      };

      ws.onclose = (event) => {
        debug('WebSocket closed:', event.code, event.reason);
        setConnected(false);
        if (!error) {
          term.writeln(`\r\n\x1b[33m[连接已关闭]\x1b[0m\r\n`);
        }
      };

      // 处理终端输入 - 使用 wsRef 确保始终引用当前的 WebSocket
      term.onData((data) => {
        debug('Terminal input received:', JSON.stringify(data));
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          debug('Sending to WebSocket:', JSON.stringify(data));
          currentWs.send(JSON.stringify({ type: 'data', data }));
        } else {
          debug('WebSocket not ready, state:', currentWs?.readyState);
        }
      });

      // 处理终端大小变化 - 使用 wsRef 确保始终引用当前的 WebSocket
      term.onResize(({ cols, rows }) => {
        debug('Terminal resize:', cols, 'x', rows);
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });

      // 窗口大小变化时调整终端
      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener('resize', handleResize);

      // 保存清理函数
      cleanupRef.current = () => {
        debug('Cleaning up...');
        window.removeEventListener('resize', handleResize);
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        term.dispose();
        initializedRef.current = false;
      };

      return cleanupRef.current;
    } catch (err) {
      debug('Error initializing terminal:', err);
      setError('终端初始化失败: ' + (err instanceof Error ? err.message : String(err)));
      setConnecting(false);
      initializedRef.current = false;
    }
  }, []); // 空依赖数组，因为 host.id 在组件生命周期内不会改变

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      debug('Component unmounting, executing cleanup');
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // 重连
  const handleReconnect = () => {
    window.location.reload();
  };

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // 延迟执行 fit 以适应新的尺寸
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div 
        ref={modalRef}
        className={`bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in transition-all duration-300 ${
          isFullscreen 
            ? 'fixed inset-4 w-auto h-auto max-w-none' 
            : 'w-full max-w-4xl h-[600px]'
        }`}
      >
        {/* Terminal Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"></button>
              <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"></button>
              <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"></button>
            </div>
            <div className="ml-4 flex items-center gap-2 text-sm text-gray-600">
              <Server className="w-4 h-4 text-blue-500" />
              <span className="font-mono">{host.username}@{host.name}</span>
              <span className="text-gray-400">~</span>
              {connected ? (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-xs border border-emerald-100 font-medium">
                  已连接
                </span>
              ) : connecting ? (
                <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-600 text-xs border border-yellow-100 font-medium">
                  连接中...
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs border border-red-100 font-medium">
                  未连接
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <button 
                onClick={handleReconnect}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
              >
                重连
              </button>
            )}
            <button 
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" 
              title={isFullscreen ? "退出全屏" : "全屏"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Terminal Body */}
        <div className="flex-1 bg-gray-900 overflow-hidden relative">
          <div ref={terminalRef} className="w-full h-full p-2" />
        </div>
        
        {/* 状态栏 */}
        <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={connected ? 'text-emerald-400' : connecting ? 'text-yellow-400' : 'text-red-400'}>
              {connected ? '● 已连接' : connecting ? '● 连接中...' : '○ 未连接'}
            </span>
            <span>xterm.js</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Tab: 自动补全</span>
            <span>Ctrl+C: 中断</span>
            <span>Ctrl+L: 清屏</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalModal;
