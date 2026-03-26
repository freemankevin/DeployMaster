import React from 'react';
import type { SFTPFile } from '@/services/api';
import type { LogFilter } from './types';
import { FileUploadIcon, FolderUploadIcon } from './Icons';

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
    <div
      className="window-header relative flex items-center px-4 py-2.5"
      style={{
        background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
      }}>
      {/* Subtle top highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Mac Window Controls - Consistent with terminal */}
      <div className="flex items-center gap-2 mr-4">
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #ff6b6b 0%, #ff5252 100%)',
            boxShadow: '0 0.5px 1px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.2)'
          }}
          title="Close"
        >
          <i className="fa-solid fa-xmark text-[9px] text-[#8b0000] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={onMinimize}
          className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #ffd93d 0%, #ffbe0b 100%)',
            boxShadow: '0 0.5px 1px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.2)'
          }}
          title="Minimize"
        >
          <i className="fa-solid fa-minus text-[9px] text-[#8b6914] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={onMaximize}
          className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #51cf66 0%, #40c057 100%)',
            boxShadow: '0 0.5px 1px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.2)'
          }}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <i className="fa-solid fa-plus text-[8px] text-[#1a5c1a] opacity-0 group-hover:opacity-100 transition-opacity" />
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
          className="flex-1 bg-[#0a0a0a] border border-white/[0.12] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-text-tertiary focus:outline-none focus:border-macos-blue/50 focus:ring-1 focus:ring-macos-blue/20 transition-all"
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
            className="text-macos-blue hover:text-macos-blue/80 mr-2 flex items-center transition-colors"
            title="Go to root directory"
          >
            <i className="fa-solid fa-house text-xs" />
          </button>
          {pathSegments.map((segment) => (
            <span key={segment.path} className="flex items-center text-xs">
              <span className="text-text-tertiary mx-1">/</span>
              <button
                onClick={() => onNavigateTo(segment.path)}
                className="text-text-secondary hover:text-white hover:bg-white/[0.06] px-1.5 py-0.5 rounded transition-colors"
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
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
            title="Filter files"
          >
            <i className="fa-solid fa-filter text-[11px]" />
            <span>Filter</span>
          </button>
        )}

        <button
          onClick={onNewFolder}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
          title="Create new folder"
        >
          <i className="fa-solid fa-folder-plus text-[11px]" />
          <span>New</span>
        </button>

        {/* Upload with dropdown menu */}
        <div className={`relative ${showUploadMenu ? 'z-40' : ''}`}>
          <button
            onClick={onToggleUploadMenu}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
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
              <div className="absolute top-full right-0 mt-1 bg-[#1e1e20] border border-white/[0.08] rounded-lg shadow-2xl z-[60] min-w-[140px] py-1 backdrop-blur-xl">
                <button
                   onClick={() => { onUpload(); onCloseUploadMenu(); }}
                   className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors"
                 >
                   <span className="w-4 h-4 flex items-center justify-center">
                     <FileUploadIcon className="w-4 h-4" />
                   </span>
                   <span>Upload Files</span>
                 </button>
                 <button
                   onClick={() => { onUploadFolder(); onCloseUploadMenu(); }}
                   className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors"
                 >
                   <span className="w-4 h-4 flex items-center justify-center">
                     <FolderUploadIcon className="w-4 h-4" />
                   </span>
                   <span>Upload Folder</span>
                 </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onToggleTransferPanel}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
            showTransferPanel ? 'text-macos-blue bg-macos-blue/10' : 'text-text-tertiary hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Transfer history"
        >
          <i className="fa-solid fa-right-left text-[11px]" />
          <span>Transfer</span>
          {activeTransfers > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-macos-blue animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};

export default WindowHeader;
