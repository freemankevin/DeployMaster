import React from 'react';
import type { LogFilter } from './types';

interface ToolbarProps {
  showFilter: boolean;
  showUploadMenu: boolean;
  showTransferPanel: boolean;
  searchQuery: string;
  activeTransfers: number;
  activeLogFilter: LogFilter;
  onShowFilter: () => void;
  onHideFilter: () => void;
  onSearchChange: (value: string) => void;
  onClearFilter: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onUploadFolder: () => void;
  onToggleUploadMenu: () => void;
  onCloseUploadMenu: () => void;
  onToggleTransferPanel: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  showFilter,
  showUploadMenu,
  showTransferPanel,
  searchQuery,
  activeTransfers,
  onShowFilter,
  onHideFilter,
  onSearchChange,
  onClearFilter,
  onNewFolder,
  onUpload,
  onUploadFolder,
  onToggleUploadMenu,
  onCloseUploadMenu,
  onToggleTransferPanel
}) => {
  return (
    <div className="flex items-center gap-0.5">
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
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-white/10 rounded-md shadow-xl z-[60] min-w-[140px] py-1">
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
  );
};

export default Toolbar;
