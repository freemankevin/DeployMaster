import { useEffect, useRef } from 'react';
import type { SFTPFile } from '@/services/api';

// New Folder Dialog
interface NewFolderDialogProps {
  isOpen: boolean;
  folderName: string;
  onNameChange: (name: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export const NewFolderDialog = ({ isOpen, folderName, onNameChange, onCreate, onCancel }: NewFolderDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="bg-[#1e1e1e] rounded-lg shadow-2xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-[13px] font-medium text-gray-200">New Folder</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#378ADD]/20 flex items-center justify-center">
              <i className="fa-solid fa-folder text-lg text-[#378ADD]" />
            </div>
            <div className="flex-1">
              <label className="block text-[12px] text-gray-500 mb-1">Folder Name</label>
              <input
                ref={inputRef}
                type="text"
                value={folderName}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onCreate()}
                placeholder="Enter folder name..."
                className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!folderName.trim()}
            className="px-4 py-2 text-[13px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// Rename Dialog
interface RenameDialogProps {
  isOpen: boolean;
  target: SFTPFile | null;
  newName: string;
  onNameChange: (name: string) => void;
  onRename: () => void;
  onCancel: () => void;
}

export const RenameDialog = ({ isOpen, target, newName, onNameChange, onRename, onCancel }: RenameDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen || !target) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="bg-[#1e1e1e] rounded-lg shadow-2xl w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-[13px] font-medium text-gray-200">Rename</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#378ADD]/20 flex items-center justify-center">
              {target.is_dir ? (
                <i className="fa-solid fa-folder text-lg text-[#378ADD]" />
              ) : (
                <i className="fa-solid fa-file-lines text-lg text-[#378ADD]" />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-[12px] text-gray-500 mb-1">New Name</label>
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onRename()}
                placeholder="Enter new name..."
                className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <p className="text-[12px] text-gray-500">
            Original: <span className="text-gray-400">{target.name}</span>
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRename}
            disabled={!newName.trim() || newName === target.name}
            className="px-4 py-2 text-[13px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
};

// File Editor
interface FileEditorProps {
  isOpen: boolean;
  file: SFTPFile | null;
  content: string;
  saving: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const FileEditor = ({ isOpen, file, content, saving, onContentChange, onSave, onClose }: FileEditorProps) => {
  if (!isOpen || !file) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="bg-[#1e1e1e] rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col border border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-file-lines text-lg text-blue-400" />
            <h3 className="text-[13px] font-medium text-gray-200">{file.name}</h3>
            <span className="text-[12px] text-gray-500">{file.size_formatted}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <i className="fa-solid fa-spinner text-sm animate-spin" />
              ) : (
                <i className="fa-solid fa-floppy-disk text-sm" />
              )}
              Save
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
        <div className="flex-1 p-4">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-full bg-[#0d0d0d] border border-white/10 rounded-lg p-4 text-[13px] text-gray-200 font-mono resize-none focus:outline-none focus:border-blue-500/50"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

// Loading Overlay - 美化设计
interface LoadingOverlayProps {
  isOpen: boolean;
  hostName: string;
}

export const LoadingOverlay = ({ isOpen, hostName }: LoadingOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="bg-[#1e1e1e] rounded-xl shadow-2xl p-8 border border-white/10 min-w-[280px]">
        <div className="flex flex-col items-center gap-5">
          {/* 动画效果 - 脉冲圆环 */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-blue-500/20" />
            <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-t-blue-400 border-r-blue-400/50 border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-2 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          
          {/* 文字信息 */}
          <div className="text-center">
            <p className="text-[15px] text-gray-200 font-medium">正在连接</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[13px] text-gray-500 font-mono">{hostName}</p>
            </div>
          </div>
          
          {/* 进度指示器 */}
          <div className="w-full flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Error Overlay
interface ErrorOverlayProps {
  isOpen: boolean;
  error: string | null;
  onClose: () => void;
}

export const ErrorOverlay = ({ isOpen, error, onClose }: ErrorOverlayProps) => {
  if (!isOpen || !error) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="bg-[#1e1e1e] rounded-lg shadow-2xl w-full max-w-md border border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <i className="fa-solid fa-circle-exclamation text-lg text-red-400" />
          <h3 className="text-[13px] font-medium text-gray-200">Connection Failed</h3>
        </div>
        <div className="p-4">
          <p className="text-[13px] text-gray-400">{error}</p>
        </div>
        <div className="flex items-center justify-end px-4 py-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
