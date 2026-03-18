import { useState, useEffect, useCallback, useRef } from 'react';
import type { WindowState } from '../types';

interface WindowSize {
  width: number;
  height: number;
}

interface WindowPosition {
  x: number;
  y: number;
}

interface UseWindowStateReturn {
  windowState: WindowState;
  windowSize: WindowSize;
  windowPosition: WindowPosition;
  isDragging: boolean;
  modalRef: React.RefObject<HTMLDivElement>;
  handleMinimize: () => void;
  handleMaximize: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

const DEFAULT_WIDTH = 896;
const DEFAULT_HEIGHT = 600;
const MINIMIZED_HEIGHT = 40;
const FULLSCREEN_MARGIN = 32; // inset-4 = 16px * 2

export function useWindowState(): UseWindowStateReturn {
  const [windowState, setWindowState] = useState<WindowState>({
    isMaximized: false,
    isMinimized: false
  });
  
  const [windowSize, setWindowSize] = useState<WindowSize>({ 
    width: DEFAULT_WIDTH, 
    height: DEFAULT_HEIGHT 
  });
  
  const [windowPosition, setWindowPosition] = useState<WindowPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Center window on mount
  useEffect(() => {
    const centerX = Math.max(0, (window.innerWidth - windowSize.width) / 2);
    const centerY = Math.max(0, (window.innerHeight - windowSize.height) / 2);
    setWindowPosition({ x: centerX, y: centerY });
  }, []);

  // Drag handling
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setWindowPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMinimize = () => {
    setWindowState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
    if (!windowState.isMinimized) {
      // Keep width when minimized, only show title bar
      setWindowSize(prev => ({ width: prev.width, height: MINIMIZED_HEIGHT }));
    } else {
      // Restore - Consistent with terminal
      setWindowSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
      const centerX = Math.max(0, (window.innerWidth - DEFAULT_WIDTH) / 2);
      const centerY = Math.max(0, (window.innerHeight - DEFAULT_HEIGHT) / 2);
      setWindowPosition({ x: centerX, y: centerY });
    }
  };

  const handleMaximize = () => {
    setWindowState(prev => ({ ...prev, isMaximized: !prev.isMaximized }));
    if (!windowState.isMaximized) {
      // Fullscreen mode - Consistent with terminal, using inset-4 margins
      setWindowSize({
        width: window.innerWidth - FULLSCREEN_MARGIN,
        height: window.innerHeight - FULLSCREEN_MARGIN
      });
      setWindowPosition({ x: 16, y: 16 });
    } else {
      // Restore - Consistent with terminal
      setWindowSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
      const centerX = Math.max(0, (window.innerWidth - DEFAULT_WIDTH) / 2);
      const centerY = Math.max(0, (window.innerHeight - DEFAULT_HEIGHT) / 2);
      setWindowPosition({ x: centerX, y: centerY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current || (e.target as HTMLElement).closest('.window-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - windowPosition.x,
        y: e.clientY - windowPosition.y
      });
    }
  };

  return {
    windowState,
    windowSize,
    windowPosition,
    isDragging,
    modalRef,
    handleMinimize,
    handleMaximize,
    handleMouseDown
  };
}

