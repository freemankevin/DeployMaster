import { createPortal } from 'react-dom';
import type { SSHHost } from '@/types';

interface BatchConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  hosts: SSHHost[];
  confirmText: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BatchConfirmDialog = ({
  isOpen,
  title,
  message,
  hosts,
  confirmText,
  confirmButtonClass = 'bg-macos-red hover:bg-red-600',
  onConfirm,
  onCancel
}: BatchConfirmDialogProps) => {
  if (!isOpen) return null;

  // Use Portal to render at body level for proper overlay coverage
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop - covers entire viewport including sticky headers */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[480px] max-w-[90vw] animate-slide-down">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <i className="fa-solid fa-xmark text-gray-400 text-xs hover:text-gray-600"></i>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-xs text-gray-600 mb-3">{message}</p>

          {/* Host list */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-[200px] overflow-y-auto">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200 bg-gray-100/50">
              Selected Hosts ({hosts.length})
            </div>
            <div className="divide-y divide-gray-100">
              {hosts.map((host) => (
                <div key={host.id} className="px-3 py-2 flex items-center gap-2">
                  <i className="fa-solid fa-server text-blue-500 text-[10px]"></i>
                  <span className="text-xs text-gray-700 font-medium">{host.name}</span>
                  <span className="text-xs text-gray-400">({host.address})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs text-white rounded-md transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BatchConfirmDialog;