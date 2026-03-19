import React from 'react';
import type { SFTPFile } from '@/services/api';
import type { LogFilter } from './types';

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
  showFilter: boolean;
  showUploadMenu: boolean;
  showTransferPanel: boolean;
  activeTransfers: number;
  activeLogFilter: LogFilter;
  onPathChange: (value: string) => void;
  onPathConfirm: () => void;
  onPathKeyDown: (e: React.KeyboardEvent) => void;
  onPathEdit: () => void;
  onNavigateTo: (path: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isMaximized: boolean;
  onShowFilter: () => void;
  onHideFilter: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onUploadFolder: () => void;
  onToggleUploadMenu: () => void;
  onCloseUploadMenu: () => void;
  onToggleTransferPanel: () => void;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  isPathEditing,
  pathInputValue,
  pathInputRef,
  pathSegments,
  showFilter,
  showUploadMenu,
  showTransferPanel,
  activeTransfers,
  onPathChange,
  onPathConfirm,
  onPathKeyDown,
  onPathEdit,
  onNavigateTo,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized,
  onShowFilter,
  onNewFolder,
  onUpload,
  onUploadFolder,
  onToggleUploadMenu,
  onCloseUploadMenu,
  onToggleTransferPanel
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

      {/* Toolbar Buttons - Right Side */}
      <div className="flex items-center gap-0.5 ml-4">
        {!showFilter && (
          <button
            onClick={onShowFilter}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
            title="Filter files"
          >
            <i className="fa-solid fa-filter text-[11px]" />
            <span>Filter</span>
          </button>
        )}

        <button
          onClick={onNewFolder}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
          title="Create new folder"
        >
          <i className="fa-solid fa-folder-plus text-[11px]" />
          <span>New</span>
        </button>

        {/* Upload with dropdown menu */}
        <div className={`relative ${showUploadMenu ? 'z-40' : ''}`}>
          <button
            onClick={onToggleUploadMenu}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
            title="Upload files or folder"
          >
            <i className="fa-solid fa-upload text-[11px]" />
            <span>Upload</span>
            <i className="fa-solid fa-chevron-down text-[8px] ml-0.5" />
          </button>
          
          {showUploadMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={onCloseUploadMenu}
              />
              <div className="absolute top-full right-0 mt-1 bg-[#2a2a2a] border border-white/10 rounded-md shadow-xl z-[60] min-w-[140px] py-1">
                <button
                  onClick={() => { onUpload(); onCloseUploadMenu(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ti ti-file-upload-filled text-base" />
                  </span>
                  <span>Upload Files</span>
                </button>
                <button
                  onClick={() => { onUploadFolder(); onCloseUploadMenu(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center">
                    <i className="ti ti-folder-up text-sm" />
                  </span>
                  <span>Upload Folder</span>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onToggleTransferPanel}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
            showTransferPanel ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
          title="Transfer history"
        >
          <i className="fa-solid fa-right-left text-[11px]" />
          <span>Transfer</span>
          {activeTransfers > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};

export default WindowHeader;
