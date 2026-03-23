import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MoreActionsMenuProps {
  isOpen: boolean;
  selectedCount: number;
  onToggle: () => void;
  onClose: () => void;
  onShutdown: () => void;
  onRestart: () => void;
  onDelete: () => void;
}

export const MoreActionsMenu = ({
  isOpen,
  selectedCount,
  onToggle,
  onClose,
  onShutdown,
  onRestart,
  onDelete
}: MoreActionsMenuProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Update menu position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking on button or menu
      if (buttonRef.current?.contains(target)) {
        return;
      }
      if (menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    if (isOpen) {
      // Use click instead of mousedown to allow menu item clicks to fire first
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen, onClose]);

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

  const handleShutdown = () => {
    onShutdown();
    onClose();
  };

  const handleRestart = () => {
    onRestart();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  if (!isOpen) {
    return (
      <button
        ref={buttonRef}
        onClick={onToggle}
        disabled={selectedCount === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200
                 hover:border-gray-300 hover:bg-gray-50/80 disabled:opacity-40 disabled:cursor-not-allowed
                 text-gray-700 rounded-md text-xs font-medium
                 transition-all duration-200 ease-macos
                 shadow-[0_0.5px_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]
                 active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.08)] active:scale-[0.97]"
      >
        <span>More Actions</span>
        {selectedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-macos-blue text-white text-[10px] rounded-full">
            {selectedCount}
          </span>
        )}
        <i className="fa-solid fa-chevron-down text-[10px] text-gray-500"></i>
      </button>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onToggle}
        disabled={selectedCount === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200
                 hover:border-gray-300 hover:bg-gray-50/80 disabled:opacity-40 disabled:cursor-not-allowed
                 text-gray-700 rounded-md text-xs font-medium
                 transition-all duration-200 ease-macos
                 shadow-[0_0.5px_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]
                 active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.08)] active:scale-[0.97]"
      >
        <span>More Actions</span>
        {selectedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-macos-blue text-white text-[10px] rounded-full">
            {selectedCount}
          </span>
        )}
        <i className="fa-solid fa-chevron-down text-[10px] text-gray-500 rotate-180 transition-transform"></i>
      </button>

      {createPortal(
        <div
          ref={menuRef}
          className="fixed z-[70] bg-white/95 backdrop-blur-xl rounded-lg shadow-macos-lg border border-gray-200/60 py-1 animate-slide-down"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: '144px'
          }}
        >
          <button
            onClick={handleShutdown}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50/80 transition-colors"
          >
            <i className="fa-solid fa-power-off text-[11px] text-red-500"></i>
            <span>Shutdown</span>
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50/80 transition-colors"
          >
            <i className="fa-solid fa-rotate-right text-[11px] text-blue-500"></i>
            <span>Restart</span>
          </button>
          <div className="h-px bg-gray-200/60 my-1" />
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-macos-red hover:bg-red-50/50 transition-colors"
          >
            <i className="fa-solid fa-trash text-[11px] text-red-500"></i>
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default MoreActionsMenu;