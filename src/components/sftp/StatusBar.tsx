interface StatusBarProps {
  fileCount: number;
  selectedCount: number;
  searchQuery: string;
  activeTransfers: number;
  hostAddress: string;
}

const StatusBar = ({
  fileCount,
  selectedCount,
  searchQuery,
  activeTransfers,
  hostAddress
}: StatusBarProps) => {
  return (
    <div
      className="h-8 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between px-4 text-[12px]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="flex items-center gap-4">
        {/* File Count */}
        <div className="flex items-center gap-2 text-gray-400">
          <i className="fa-regular fa-folder text-xs" />
          <span>{fileCount} items</span>
          {selectedCount > 0 && (
            <span className="text-blue-400 font-medium">
              ({selectedCount} selected)
            </span>
          )}
        </div>

        {/* Search Status */}
        {searchQuery && (
          <div className="flex items-center gap-1 text-amber-400">
            <span>Filter: "{searchQuery}"</span>
          </div>
        )}

        {/* Transfer Status */}
        {activeTransfers > 0 && (
          <div className="flex items-center gap-1.5 text-blue-400">
            <i className="fa-solid fa-spinner animate-spin text-xs" />
            <span>{activeTransfers} transfer(s) active</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Host Address with Status Indicator */}
        <div className="flex items-center gap-2 text-gray-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <i className="fa-solid fa-circle text-[6px] text-green-500 relative" />
          </span>
          <span>{hostAddress}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
