import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActionMenuProps } from './types';

export const ActionMenu = ({
  isOpen,
  isRefreshing,
  anchorEl,
  onClose,
  onEdit,
  onDelete,
  onTestConnection,
  onRefresh,
  onCopyHost
}: ActionMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position when menu opens
  useEffect(() => {
    if (isOpen && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = 120; // min width

      // Calculate left position - prefer left-aligned with button
      let left = rect.left;
      
      // If menu would overflow right edge, align to right edge of button
      if (left + menuWidth > viewportWidth - 16) {
        left = rect.right - menuWidth;
      }
      
      // Ensure minimum left position
      left = Math.max(16, left);

      setPosition({
        top: rect.bottom + 6,
        left
      });
    }
  }, [isOpen, anchorEl]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        anchorEl &&
        !anchorEl.contains(target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Use setTimeout to prevent immediate close
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, anchorEl]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] w-30
                bg-background-secondary/95 backdrop-blur-xl rounded-lg border border-border-primary
                shadow-macos-lg py-1 animate-slide-down"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '120px'
      }}
    >
      <button
        onClick={() => handleAction(onEdit)}
        className="w-full px-3 py-1.5 text-left text-xs text-white
                 hover:bg-macos-blue/20 flex items-center gap-2 transition-colors"
      >
        <i className="fa-solid fa-pencil w-3 h-3 text-macos-blue"></i>
        Edit
      </button>
      <button
        onClick={() => handleAction(onCopyHost)}
        className="w-full px-3 py-1.5 text-left text-xs text-white
                 hover:bg-macos-blue/20 flex items-center gap-2 transition-colors"
      >
        <i className="fa-solid fa-copy w-3 h-3 text-macos-green"></i>
        Copy
      </button>
      <button
        onClick={() => handleAction(onTestConnection)}
        className="w-full px-3 py-1.5 text-left text-xs text-white
                 hover:bg-macos-blue/20 flex items-center gap-2 transition-colors"
      >
        <i className="fa-solid fa-plug w-3 h-3 text-macos-purple"></i>
        Test
      </button>
      <div className="h-px bg-border-secondary my-1" />
      <button
        onClick={() => handleAction(onDelete)}
        className="w-full px-3 py-1.5 text-left text-xs text-macos-red
                 hover:bg-macos-red/20 flex items-center gap-2 transition-colors"
      >
        <i className="fa-solid fa-trash w-3 h-3 text-macos-red"></i>
        Delete
      </button>
    </div>,
    document.body
  );
};

export default ActionMenu;