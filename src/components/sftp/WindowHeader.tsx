import React from 'react';
import {
  X,
  Minus,
  Plus,
  Home,
  Filter,
  FolderPlus,
  Upload,
  ChevronDown,
  ArrowLeftRight,
} from 'lucide-react';
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
        background: 'var(--bg-surface)',
        borderBottom: '0.5px solid var(--border-subtle)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
      }}>
      {/* Mac Window Controls */}
      <div className="flex items-center gap-2 mr-4">
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
          style={{
            background: 'var(--color-error)',
          }}
          title="Close"
        >
          <X className="w-[9px] h-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={onMinimize}
          className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
          style={{
            background: 'var(--color-warning)',
          }}
          title="Minimize"
        >
          <Minus className="w-[9px] h-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        <button
          onClick={onMaximize}
          className="w-3 h-3 rounded-full transition-all duration-150 group flex items-center justify-center"
          style={{
            background: 'var(--color-success)',
          }}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Plus className="w-[8px] h-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
          className="flex-1 rounded-md px-3 py-1.5 text-[13px] placeholder-text-tertiary focus:outline-none transition-all"
          style={{
            background: 'var(--bg-base)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
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
            className="mr-2 flex items-center transition-colors"
            style={{ color: 'var(--accent)' }}
            title="Go to root directory"
          >
            <Home className="w-3 h-3" />
          </button>
          {pathSegments.map((segment) => (
            <span key={segment.path} className="flex items-center text-xs">
              <span style={{ color: 'var(--text-tertiary)' }} className="mx-1">/</span>
              <button
                onClick={() => onNavigateTo(segment.path)}
                className="px-1.5 py-0.5 rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
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
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Filter files"
          >
            <Filter className="w-[11px] h-[11px]" />
            <span>Filter</span>
          </button>
        )}

        <button
          onClick={onNewFolder}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-tertiary)';
            e.currentTarget.style.background = 'transparent';
          }}
          title="Create new folder"
        >
          <FolderPlus className="w-[11px] h-[11px]" />
          <span>New</span>
        </button>

        {/* Upload with dropdown menu */}
        <div className={`relative ${showUploadMenu ? 'z-40' : ''}`}>
          <button
            onClick={onToggleUploadMenu}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Upload files or folder"
          >
            <Upload className="w-[11px] h-[11px]" />
            <span>Upload</span>
            <ChevronDown className="w-[8px] h-[8px] ml-0.5" />
          </button>
          
          {showUploadMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={onCloseUploadMenu}
              />
              <div 
                className="absolute top-full right-0 mt-1 rounded-lg z-[60] min-w-[140px] py-1"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '0.5px solid var(--border-default)',
                }}
              >
                <button
                   onClick={() => { onUpload(); onCloseUploadMenu(); }}
                   className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                   style={{ color: 'var(--text-secondary)' }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.color = 'var(--text-primary)';
                     e.currentTarget.style.background = 'var(--bg-elevated)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.color = 'var(--text-secondary)';
                     e.currentTarget.style.background = 'transparent';
                   }}
                 >
                   <span className="w-4 h-4 flex items-center justify-center">
                     <FileUploadIcon className="w-4 h-4" />
                   </span>
                   <span>Upload Files</span>
                 </button>
                 <button
                   onClick={() => { onUploadFolder(); onCloseUploadMenu(); }}
                   className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
                   style={{ color: 'var(--text-secondary)' }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.color = 'var(--text-primary)';
                     e.currentTarget.style.background = 'var(--bg-elevated)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.color = 'var(--text-secondary)';
                     e.currentTarget.style.background = 'transparent';
                   }}
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
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors"
          style={{ 
            color: showTransferPanel ? 'var(--accent)' : 'var(--text-tertiary)',
            background: showTransferPanel ? 'var(--accent-muted)' : 'transparent',
          }}
          title="Transfer history"
        >
          <ArrowLeftRight className="w-[11px] h-[11px]" />
          <span>Transfer</span>
          {activeTransfers > 0 && (
            <span 
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--accent)' }}
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default WindowHeader;