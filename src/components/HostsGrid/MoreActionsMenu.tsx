import { useRef, useEffect } from 'react';

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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={menuRef}>
      <button
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
        <i className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {/* Dropdown menu - click to toggle */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={onClose}
          />
          <div className="absolute top-full left-0 mt-1.5 w-36 bg-white/95 backdrop-blur-xl rounded-lg shadow-macos-lg border border-gray-200/60 z-[70] py-1 animate-slide-down">
            <button
              onClick={onShutdown}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50/80 transition-colors"
            >
              <i className="fa-solid fa-power-off text-[11px] text-gray-500"></i>
              <span>Shutdown</span>
            </button>
            <button
              onClick={onRestart}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50/80 transition-colors"
            >
              <i className="fa-solid fa-rotate-right text-[11px] text-gray-500"></i>
              <span>Restart</span>
            </button>
            <div className="h-px bg-gray-200/60 my-1" />
            <button
              onClick={onDelete}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-macos-red hover:bg-red-50/50 transition-colors"
            >
              <i className="fa-solid fa-trash text-[11px]"></i>
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MoreActionsMenu;
