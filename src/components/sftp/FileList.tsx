import { useState } from 'react';
import FileIcon from './FileIcon';
import type { SFTPFile } from '@/services/api';

interface FileListProps {
  files: SFTPFile[];
  loading: boolean;
  currentPath: string;
  selectedFiles: Set<string>;
  searchQuery: string;
  onFileClick: (file: SFTPFile) => void;
  onFileSelect?: (path: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onDownload: (file: SFTPFile) => void;
  onRename: (file: SFTPFile) => void;
  onDelete: (file: SFTPFile) => void;
  onNavigate: (path: string) => void;
  onGoUp: () => void;
}

const FileList = ({
  files,
  loading,
  currentPath,
  selectedFiles,
  searchQuery,
  onFileClick,
  onFileSelect,
  onSelectAll,
  onDownload,
  onRename,
  onDelete,
  onGoUp
}: FileListProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: SFTPFile } | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-macos-gray-2 border-t-macos-blue rounded-full animate-spin" />
            <span className="text-[13px] text-text-secondary">Loading...</span>
          </div>
      </div>
    );
  }

  const handleContextMenu = (e: React.MouseEvent, file: SFTPFile) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Format permissions to ensure single line display
  const formatPermissions = (perms: string) => {
    // Remove any newlines or extra spaces
    return perms.replace(/\s+/g, ' ').trim();
  };

  return (
    <div className="h-full">
      {/* File List - Mac Style Dark Mode */}
      <div className="min-h-full">
        {/* Go to parent */}
        {currentPath !== '/' && (!searchQuery || searchQuery.trim() === '') && (
          <button
            onClick={onGoUp}
            className="w-full flex items-center gap-3 px-4 py-2 text-text-secondary hover:text-white hover:bg-white/5 transition-all duration-150 text-left group"
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-arrow-turn-up text-sm" />
            </div>
            <span className="text-[13px] text-text-tertiary group-hover:text-text-secondary transition-colors">Go Up</span>
          </button>
        )}

        {/* File Items */}
        {files?.map((file) => {
          // Defensive check: ensure file and file.path exist
          if (!file || !file.path) return null;
          return (
          <div
            key={file.path}
            onClick={() => onFileClick(file)}
            onContextMenu={(e) => handleContextMenu(e, file)}
            className={`group flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
              selectedFiles.has(file.path)
                ? 'bg-macos-blue/10'
                : 'hover:bg-white/5'
            }`}
            style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <FileIcon file={file} size="sm" />
            </div>

            {/* Filename - adaptive width, truncate when too long */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <span 
                className="text-[13px] text-white truncate font-normal block"
                title={file.name}
              >
                {file.name}
              </span>
            </div>

            {/* Right side info container - fixed width, priority display */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Size */}
              <div className="w-16 text-right flex-shrink-0">
                {!file.is_dir && (
                  <span className="text-[12px] text-text-tertiary">{file.size_formatted}</span>
                )}
              </div>

              {/* Modified Time */}
              <div className="w-24 text-right flex-shrink-0">
                <span className="text-[12px] text-text-tertiary whitespace-nowrap">{file.modified_time_formatted}</span>
              </div>

              {/* Permissions */}
              <div className="w-16 text-right flex-shrink-0">
                <span className="text-[12px] text-text-tertiary whitespace-nowrap">
                  {file.permissions}
                </span>
              </div>

              {/* Action Buttons - always occupy space, show on hover */}
              <div className="w-20 flex items-center justify-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDownload(file);
                    }}
                    className="p-1.5 text-text-tertiary hover:text-macos-blue hover:bg-macos-blue/10 rounded transition-colors"
                    title={file.is_dir ? "Download as ZIP" : "Download"}
                  >
                    <i className="fa-solid fa-circle-down text-[11px]" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRename(file); }}
                    className="p-1.5 text-text-tertiary hover:text-macos-green hover:bg-macos-green/10 rounded transition-colors"
                    title="Rename"
                  >
                    <i className="fa-solid fa-pen text-[11px]" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                    className="p-1.5 text-text-tertiary hover:text-macos-red hover:bg-macos-red/10 rounded transition-colors"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash text-[11px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          );
        })}

        {/* Empty State - Search */}
        {(!files || files.length === 0) && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
            <i className="fa-solid fa-magnifying-glass text-2xl mb-3 opacity-50" />
            <p className="text-[13px]">No files matching "{searchQuery}"</p>
          </div>
        )}

        {/* Empty State - Folder */}
        {(!files || files.length === 0) && !searchQuery && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
            <i className="fa-solid fa-folder text-2xl mb-3 opacity-50" />
            <p className="text-[13px]">Folder is empty</p>
          </div>
        )}
      </div>

      {/* Context Menu - Dark Mode */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-[110] bg-background-secondary rounded-lg shadow-macos-dropdown border border-border-primary py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => { onFileClick(contextMenu.file); closeContextMenu(); }}
              className="w-full px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-background-tertiary hover:text-white flex items-center gap-2"
            >
              <i className="fa-solid fa-folder text-xs" />
              {contextMenu.file.is_dir ? 'Open' : 'Edit'}
            </button>
            
            <button
              onClick={() => { onDownload(contextMenu.file); closeContextMenu(); }}
              className="w-full px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-background-tertiary hover:text-white flex items-center gap-2"
            >
              <i className="fa-solid fa-circle-down text-xs" />
              {contextMenu.file.is_dir ? 'Download as ZIP' : 'Download'}
            </button>
            
            <div className="h-px bg-border-primary my-1" />
            
            <button
              onClick={() => { onRename(contextMenu.file); closeContextMenu(); }}
              className="w-full px-3 py-2 text-left text-[13px] text-text-secondary hover:bg-background-tertiary hover:text-white flex items-center gap-2"
            >
              <i className="fa-solid fa-pen text-xs" />
              Rename
            </button>
            
            <button
              onClick={() => { onDelete(contextMenu.file); closeContextMenu(); }}
              className="w-full px-3 py-2 text-left text-[13px] text-macos-red hover:bg-macos-red/10 flex items-center gap-2"
            >
              <i className="fa-solid fa-trash text-xs" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FileList;