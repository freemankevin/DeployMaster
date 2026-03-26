import { useState, useCallback, useRef } from 'react';

type ColumnWidth = { [key: string]: number };

interface UseColumnResizeOptions<T extends ColumnWidth> {
  initialWidths: T;
  minWidth?: number;
}

export const useColumnResize = <T extends ColumnWidth>({ initialWidths, minWidth = 50 }: UseColumnResizeOptions<T>) => {
  const [widths, setWidths] = useState<T>(initialWidths);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingKey(key);
    startXRef.current = e.clientX;
    startWidthRef.current = widths[key] || minWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + delta);
      setWidths(prev => ({ ...prev, [key]: newWidth }));
    };

    const handleMouseUp = () => {
      setDraggingKey(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [widths, minWidth]);

  const setHover = useCallback((key: string | null) => {
    setHoverKey(key);
  }, []);

  const getResizeHandleProps = useCallback((key: string) => ({
    className: `absolute right-0 top-0 bottom-0 w-4 cursor-col-resize flex items-center justify-center z-10
      ${hoverKey === key ? 'bg-macos-blue/10' : ''}
      ${draggingKey === key ? 'bg-macos-blue/20' : ''}`,
    onMouseEnter: () => setHover(key),
    onMouseLeave: () => setHover(null),
    onMouseDown: (e: React.MouseEvent) => handleResizeStart(e, key),
  }), [hoverKey, draggingKey, setHover, handleResizeStart]);

  const getResizeIndicatorProps = useCallback((key: string) => ({
    className: `h-4 w-px transition-colors duration-150
      ${draggingKey === key ? 'bg-macos-blue' : hoverKey === key ? 'bg-macos-blue/60' : 'bg-transparent'}`,
  }), [draggingKey, hoverKey]);

  return {
    widths,
    draggingKey,
    hoverKey,
    getResizeHandleProps,
    getResizeIndicatorProps,
  };
};

export default useColumnResize;
