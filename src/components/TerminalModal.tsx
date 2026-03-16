import { useState, useEffect, useRef, useCallback } from 'react';
import { Server, Clock } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
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

// 空闲超时选项（分钟）
const IDLE_TIMEOUT_OPTIONS = [
  { value: 10, label: '10 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 180, label: '3 小时' },
];

const TerminalModal = ({ host, onClose }: TerminalModalProps) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState(10); // 默认10分钟
  const [showTimeoutSelector, setShowTimeoutSelector] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initializedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // 建立 WebSocket 连接和 xterm
  useEffect(() => {
    debug('useEffect triggered, terminalRef.current:', terminalRef.current, 'initialized:', initializedRef.current);
    
    // 防止重复初始化
    if (initializedRef.current) {
      debug('Already initialized, skipping');
      return;
    }
    
    if (!terminalRef.current) {
      debug('terminalRef.current is null, returning');
      return;
    }

    // 立即标记为已初始化
    initializedRef.current = true;
    
    // 如果已经存在清理函数，先执行清理
    if (cleanupRef.current) {
      debug('Cleaning up previous instance before creating new one');
      cleanupRef.current();
      cleanupRef.current = null;
    }

    try {
      debug('Creating xterm instance...');
      
      // 创建 xterm 实例，支持中英文环境
      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 14,
        // 字体优先级：优先使用支持中文的等宽字体，确保中文字符宽度正确计算
        // 使用支持双宽字符的字体，避免中文显示重叠问题
        fontFamily: '"Noto Sans Mono CJK SC", "WenQuanYi Micro Hei Mono", "Source Han Sans CN", "Microsoft YaHei", "SimHei", "SF Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", monospace',
        theme: {
          // macOS Terminal 风格配色
          background: '#0d0d0d',
          foreground: '#f0f0f0',
          cursor: '#00ff88',
          cursorAccent: '#0d0d0d',
          selectionBackground: 'rgba(0, 122, 255, 0.4)',
          selectionForeground: '#ffffff',
          // ANSI 颜色 - 精心调校
          black: '#000000',
          red: '#ff3b30',
          green: '#28c840',
          yellow: '#ffcc00',
          blue: '#007aff',
          magenta: '#af52de',
          cyan: '#32ade6',
          white: '#f0f0f0',
          brightBlack: '#6e6e73',
          brightRed: '#ff6961',
          brightGreen: '#5de67a',
          brightYellow: '#ffd60a',
          brightBlue: '#4da3ff',
          brightMagenta: '#c779e8',
          brightCyan: '#5ac8f5',
          brightWhite: '#ffffff',
          // 扩展 ANSI 颜色支持更多高亮
          extendedAnsi: [
            '#58a6ff', '#79c0ff', '#a5d6ff', // 蓝色系 - 用于关键字
            '#7ee787', '#a5f3b5', '#c6ffc7', // 绿色系 - 用于字符串
            '#ffa657', '#ffb77a', '#ffc997', // 橙色系 - 用于数字
            '#ff7b72', '#ffa198', '#ffb3b3', // 红色系 - 用于错误
            '#d2a8ff', '#e0b8ff', '#ebc8ff', // 紫色系 - 用于注释
          ],
        },
        scrollback: 10000,
        allowProposedApi: true,
        // 启用 Unicode 支持
        allowTransparency: false,
        convertEol: true,
        // 字体设置优化中文显示
        fontWeight: 'normal',
        fontWeightBold: 'bold',
        // 增加字母间距避免字符重叠（对中文字符尤为重要）
        letterSpacing: 0,
        // 增加行高避免行重叠
        lineHeight: 1.2,
        // 启用粗体和斜体文本
        drawBoldTextInBrightColors: true,
        // 启用最小对比度，提高可读性
        minimumContrastRatio: 1,
      });

      debug('xterm instance created, loading addons...');
      
      // 加载 Fit 插件
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      // 加载 Unicode11 插件，支持完整的 Unicode 字符（包括中文）
      const unicode11Addon = new Unicode11Addon();
      term.loadAddon(unicode11Addon);
      term.unicode.activeVersion = '11';
      debug('Unicode11 addon loaded');
      
      debug('Opening terminal...');
      term.open(terminalRef.current);
      
      // 尝试加载 WebGL 渲染插件（提升性能）
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon.dispose();
        });
        term.loadAddon(webglAddon);
        debug('WebGL addon loaded');
      } catch (e) {
        debug('WebGL addon not available, using canvas:', e);
      }
      
      // 自定义 fit 函数，预留底部空间给命令输入区域
      // 使用防抖避免频繁 resize 导致字符重叠
      const fitWithReservedLine = () => {
        // 先计算可用尺寸
        const element = terminalRef.current;
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        
        // 检查尺寸是否有效（避免小窗口时的异常）
        if (rect.width < 100 || rect.height < 50) {
          debug('Terminal container too small, skipping fit:', rect.width, 'x', rect.height);
          return;
        }
        
        try {
          // 直接 fit
          fitAddon.fit();
          
          // 获取当前尺寸
          const currentRows = term.rows;
          const currentCols = term.cols;
          
          // 额外减少一行确保底部留白，避免最后一行被截断
          if (currentRows > 1) {
            debug('Adjusting rows from', currentRows, 'to', currentRows - 1, 'for bottom padding');
            term.resize(currentCols, currentRows - 1);
          }
        } catch (e) {
          debug('Error during fit:', e);
          // 降级处理：直接 fit
          try {
            fitAddon.fit();
          } catch (e2) {
            debug('Fallback fit also failed:', e2);
          }
        }
      };
      
      // 初始 fit（延迟确保 DOM 渲染完成）
      setTimeout(() => fitWithReservedLine(), 50);
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // 自动聚焦终端
      term.focus();
      debug('Terminal focused');

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
        
        // 连接成功后，立即发送当前终端大小（使用调整后的行数）
        const currentRows = term.rows;
        const currentCols = term.cols;
        debug('Sending initial resize:', currentCols, 'x', currentRows);
        ws.send(JSON.stringify({ type: 'resize', cols: currentCols, rows: currentRows }));
        
        // 发送一个回车键来触发命令提示符显示
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'data', data: '\r' }));
          }
          term.focus();
        }, 300);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            term.writeln(`\r\n\x1b[32m✓ ${message.message}\x1b[0m\r\n`);
            term.focus();
          } else if (message.type === 'data') {
            term.write(message.data);
          } else if (message.error) {
            term.writeln(`\r\n\x1b[31m✗ 错误: ${message.error}\x1b[0m\r\n`);
          }
        } catch (e) {
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        debug('WebSocket error');
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

      // 处理终端输入
      term.onData((data) => {
        debug('Terminal input received:', JSON.stringify(data));
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({ type: 'data', data }));
        }
      });

      // 处理终端大小变化
      term.onResize(({ cols, rows }) => {
        debug('Terminal resize:', cols, 'x', rows);
        const currentWs = wsRef.current;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });

      // 选中即复制功能
      term.onSelectionChange(() => {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection).then(() => {
            debug('Selection copied to clipboard');
          }).catch((e) => {
            debug('Failed to copy selection:', e);
          });
        }
      });

      // 防抖的 resize 处理函数
      const debouncedResize = () => {
        // 清除之前的定时器
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        // 设置新的定时器，100ms 后执行
        resizeTimeoutRef.current = setTimeout(() => {
          const element = terminalRef.current;
          if (!element) {
            try {
              fitAddon.fit();
            } catch (e) {
              debug('Error during resize fit:', e);
            }
            return;
          }
          
          const rect = element.getBoundingClientRect();
          
          // 检查尺寸是否有效
          if (rect.width < 100 || rect.height < 50) {
            debug('Terminal container too small during resize:', rect.width, 'x', rect.height);
            return;
          }
          
          try {
            // 直接 fit
            fitAddon.fit();
            
            // 额外减少一行确保完全可见
            const currentRows = term.rows;
            const currentCols = term.cols;
            if (currentRows > 1) {
              debug('Resizing terminal from', currentRows, 'to', currentRows - 1, 'rows');
              term.resize(currentCols, currentRows - 1);
            }
          } catch (e) {
            debug('Error during resize:', e);
          }
        }, 100);
      };
      
      // 使用 ResizeObserver 监听终端容器大小变化（比 window resize 更精确）
      const resizeObserver = new ResizeObserver((entries) => {
        // 检查尺寸是否有效
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
      
      // 同时监听 window resize 作为后备
      window.addEventListener('resize', debouncedResize);

      // 处理右键点击（复制选中内容或粘贴）
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection).then(() => {
            debug('Right-click copied to clipboard');
          });
        } else {
          navigator.clipboard.readText().then((text) => {
            if (text && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'data', data: text }));
              debug('Right-click pasted from clipboard');
            }
          }).catch((e) => {
            debug('Failed to paste:', e);
          });
        }
      };
      
      const terminalElement = terminalRef.current;
      terminalElement.addEventListener('contextmenu', handleContextMenu);

      // 保存清理函数
      cleanupRef.current = () => {
        debug('Cleaning up...');
        
        // 清理 resize 相关
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
        
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        
        try {
          term.dispose();
        } catch (e) {
          // 忽略 dispose 时的错误
        }
        initializedRef.current = false;
      };

      return cleanupRef.current;
    } catch (err) {
      debug('Error initializing terminal:', err);
      setError('终端初始化失败: ' + (err instanceof Error ? err.message : String(err)));
      setConnecting(false);
      initializedRef.current = false;
    }
  }, []);

  // 空闲超时处理
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      const timeoutMs = idleTimeout * 60 * 1000;
      if (idleTime >= timeoutMs) {
        debug('Idle timeout reached, closing connection');
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n\x1b[33m[连接已因空闲 ${idleTimeout} 分钟自动关闭]\x1b[0m\r\n`);
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
        setConnected(false);
        setError(`连接已因空闲 ${idleTimeout} 分钟自动关闭`);
      }
    }, idleTimeout * 60 * 1000);
  }, [idleTimeout]);

  // 监听用户活动
  useEffect(() => {
    const handleActivity = () => {
      if (connected) {
        resetIdleTimer();
      }
    };

    // 监听键盘和鼠标活动
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

  // 连接成功后启动空闲计时器
  useEffect(() => {
    if (connected) {
      resetIdleTimer();
    }
  }, [connected, resetIdleTimer]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      debug('Component unmounting, executing cleanup');
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
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

  // 通用 fit 函数，预留底部空间
  const fitTerminalWithPadding = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current || !terminalRef.current) return;
    
    const element = terminalRef.current;
    const rect = element.getBoundingClientRect();
    const paddingBottom = 32; // 底部预留空间 (pb-8 = 32px)
    const availableHeight = rect.height - paddingBottom;
    
    // 临时设置终端尺寸进行 fit
    const originalHeight = element.style.height;
    element.style.height = `${availableHeight}px`;
    
    fitAddonRef.current.fit();
    
    // 恢复原始高度
    element.style.height = originalHeight;
    
    // 额外减少一行确保完全可见
    const term = xtermRef.current;
    const currentRows = term.rows;
    const currentCols = term.cols;
    if (currentRows > 1) {
      term.resize(currentCols, currentRows - 1);
    }
    
    term.focus();
  }, []);

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      fitTerminalWithPadding();
    }, 100);
  };

  // 最小化/恢复终端
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      // 最小化时聚焦主页面
      document.body.style.overflow = '';
    } else {
      // 恢复时重新聚焦终端
      setTimeout(() => {
        fitTerminalWithPadding();
      }, 100);
    }
  };

  // 监听 Tab 键恢复终端
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

  // 点击终端容器时聚焦
  const handleTerminalClick = () => {
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  };

  return (
    <>
      {/* 最小化状态下的浮动按钮 */}
      {isMinimized && (
        <div
          onClick={toggleMinimize}
          className="fixed bottom-6 right-6 z-[60] cursor-pointer group"
        >
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 hover:bg-[#2a2a2a]/95 transition-all duration-300 hover:scale-105"
            style={{
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.05),
                0 10px 40px -10px rgba(0,0,0,0.5)
              `
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs text-gray-200">{host.username}@{host.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {connected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] text-gray-400">已连接 · 点击恢复</span>
                  </>
                ) : (
                  <span className="text-[10px] text-red-400">未连接</span>
                )}
              </div>
            </div>
            <div className="ml-2 text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
              Tab
            </div>
          </div>
        </div>
      )}

      {/* 终端主窗口 */}
      <div className={`fixed inset-0 z-50 transition-all duration-300 ${
        isMinimized
          ? 'pointer-events-none opacity-0 scale-95'
          : 'bg-black/40 backdrop-blur-md flex items-center justify-center animate-fade-in opacity-100'
      }`}>
        <div
          ref={modalRef}
          className={`bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col overflow-hidden animate-scale-in transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-4 w-auto h-auto max-w-none rounded-2xl'
              : 'w-full max-w-4xl h-[600px] rounded-xl'
          }`}
          style={{
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.05),
              0 25px 50px -12px rgba(0,0,0,0.5),
              0 0 100px -20px rgba(0,0,0,0.3)
            `
          }}
        >
          {/* Terminal Header - macOS 风格 */}
          <div className="bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] px-4 py-2.5 border-b border-white/5 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              {/* macOS 风格窗口按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors group flex items-center justify-center"
                  title="关闭终端"
                >
                  <svg className="w-2 h-2 text-[#990000] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  onClick={toggleMinimize}
                  className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors group flex items-center justify-center"
                  title="最小化 (Tab 恢复)"
                >
                  <svg className="w-2 h-2 text-[#985700] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                    <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors group flex items-center justify-center"
                  title="全屏"
                >
                  <svg className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100" viewBox="0 0 12 12">
                    <path d="M2 5l4-4 4 4M2 7l4 4 4-4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              {/* 连接信息 */}
              <div className="ml-3 flex items-center gap-2 text-sm">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-mono text-gray-300 text-xs">{host.username}@{host.name}</span>
                {connected ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    已连接
                  </span>
                ) : connecting ? (
                  <span className="text-[10px] text-yellow-400">
                    连接中...
                  </span>
                ) : (
                  <span className="text-[10px] text-red-400">
                    未连接
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* 空闲超时设置 */}
              <div className="relative">
                <button
                  onClick={() => setShowTimeoutSelector(!showTimeoutSelector)}
                  className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-gray-200 transition-colors text-xs"
                  title="空闲超时设置"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{IDLE_TIMEOUT_OPTIONS.find(o => o.value === idleTimeout)?.label}</span>
                </button>
                {showTimeoutSelector && (
                  <div className="absolute top-full right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 min-w-[140px] backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] text-gray-500 border-b border-white/5 uppercase tracking-wider">
                      空闲自动断开
                    </div>
                    {IDLE_TIMEOUT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setIdleTimeout(option.value);
                          setShowTimeoutSelector(false);
                          resetIdleTimer();
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          idleTimeout === option.value
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {error && (
                <button
                  onClick={handleReconnect}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-md text-xs transition-colors"
                >
                  重连
                </button>
              )}
            </div>
          </div>
          
          {/* Terminal Body - 深色背景优化 */}
          <div className="flex-1 bg-[#0d0d0d] overflow-hidden relative" onClick={handleTerminalClick}>
            {/* 内发光效果 */}
            <div className="absolute inset-0 pointer-events-none" style={{
              boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3)'
            }}></div>
            {/* 终端容器 */}
            <div ref={terminalRef} className="w-full h-full p-3 pb-8 relative z-10" />
          </div>
        </div>
      </div>
    </>
  );
};

export default TerminalModal;
