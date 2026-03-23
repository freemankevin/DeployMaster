import type { ActionMenuProps } from './types';

export const ActionMenu = ({
  isOpen,
  isRefreshing,
  onClose,
  onEdit,
  onDelete,
  onTestConnection,
  onRefresh,
  onCopyHost
}: ActionMenuProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div className="fixed right-auto top-auto mt-1.5 w-36
                    bg-white/95 backdrop-blur-xl rounded-lg border border-gray-200/60
                    shadow-macos-lg z-[110] py-1 animate-slide-down"
           style={{ marginTop: '6px' }}>
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full px-3 py-1.5 text-left text-xs text-gray-700
                   hover:bg-gray-50/80 flex items-center gap-2.5 transition-colors"
        >
          <i className="fa-solid fa-pencil w-3.5 h-3.5 text-blue-500"></i>
          Edit
        </button>
        <button
          onClick={() => { onCopyHost(); onClose(); }}
          className="w-full px-3 py-1.5 text-left text-xs text-gray-700
                   hover:bg-gray-50/80 flex items-center gap-2.5 transition-colors"
        >
          <i className="fa-solid fa-copy w-3.5 h-3.5 text-emerald-500"></i>
          Copy
        </button>
        <button
          onClick={() => { onTestConnection(); onClose(); }}
          className="w-full px-3 py-1.5 text-left text-xs text-gray-700
                   hover:bg-gray-50/80 flex items-center gap-2.5 transition-colors"
        >
          <i className="fa-solid fa-plug w-3.5 h-3.5 text-purple-500"></i>
          Test Connection
        </button>
        <div className="h-px bg-gray-200/60 my-1" />
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full px-3 py-1.5 text-left text-xs text-macos-red
                   hover:bg-red-50/50 flex items-center gap-2.5 transition-colors"
        >
          <i className="fa-solid fa-trash w-3.5 h-3.5 text-red-500"></i>
          Delete
        </button>
      </div>
    </>
  );
};

export default ActionMenu;
