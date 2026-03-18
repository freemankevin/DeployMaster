import React from 'react';
import type { SFTPFile } from '@/services/api';

interface PathSegment {
  name: string;
  path: string;
}

interface WindowHeaderProps {
  hostName: string;
  isPathEditing: boolean;
  pathInputValue: string;
  pathInputRef: React.RefObject<HTMLInputElement>;
  pathSegments: PathSegment[];
  onPathChange: (value: string) => void;
  onPathConfirm: () => void;
  onPathKeyDown: (e: React.KeyboardEvent) => void;
  onPathEdit: () => void;
  onNavigateTo: (path: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isMaximized: boolean;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  hostName,
  isPathEditing,
  pathInputValue,
  pathInputRef,
  pathSegments,
  onPathChange,
  onPathConfirm,
  onPathKeyDown,
  onPathEdit,
  onNavigateTo,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized
}) => {
  return (
    <div className="window-header flex items-center px-4 py-3 bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] border-b border-white/5">
      {/* Mac Window Controls - Consistent with terminal */}
      <div className="flex items-center gap-2 mr-4">
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors flex items-center justify-center group"
          title="Close"
        >
          <i className="fa-solid fa-xmark text-[10px] text-[#990000] opacity-0 group-hover:opacity-100" />
        </button>
        <button
          onClick={onMinimize}
          className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#febc2e]/80 transition-colors flex items-center justify-center group"
          title="Minimize"
        >
          <i className="fa-solid fa-minus text-[10px] text-[#985700] opacity-0 group-hover:opacity-100" />
        </button>
        <button
          onClick={onMaximize}
          className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#28c840]/80 transition-colors flex items-center justify-center group"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <i className="fa-solid fa-expand text-[10px] text-[#006500] opacity-0 group-hover:opacity-100" />
        </button>
      </div>

      {/* Path Navigation */}
      {isPathEditing ? (
        <input
          ref={pathInputRef}
          type="text"
          value={pathInputValue}
          onChange={(e) => onPathChange(e.target.value)}
          onKeyDown={onPathKeyDown}
          onBlur={() => onPathEdit()}
          className="flex-1 bg-[#1e1e1e] border border-white/20 rounded px-3 py-1 text-[13px] text-gray-200 focus:outline-none focus:border-blue-500"
          autoFocus
        />
      ) : (
        <div
          className="flex items-center flex-1 overflow-hidden"
          onDoubleClick={onPathEdit}
        >
          {/* Home icon - Navigate to root */}
          <button
            onClick={() => onNavigateTo('/')}
            className="text-blue-400 hover:text-blue-300 mr-2 flex items-center"
            title="Go to root directory"
          >
            <i className="fa-solid fa-house text-xs" />
          </button>
          {pathSegments.map((segment) => (
            <span key={segment.path} className="flex items-center text-xs">
              <span className="text-gray-500 mx-1">/</span>
              <button
                onClick={() => onNavigateTo(segment.path)}
                className="text-gray-300 hover:text-white hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors"
              >
                {segment.name}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" onDoubleClick={onPathEdit} />

      {/* Host name display */}
      <span className="text-xs text-gray-400 font-medium ml-4">{hostName}</span>
    </div>
  );
};

export default WindowHeader;
