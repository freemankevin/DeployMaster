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
      className="h-8 flex items-center justify-between px-4 text-[12px]"
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        background: 'linear-gradient(180deg, rgba(20,20,22,0.95) 0%, rgba(16,16,18,0.98) 100%)',
        borderTop: '1px solid rgba(0,0,0,0.3)',
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px',
      }}
    >
      <div className="flex items-center gap-4">
        {/* File Count */}
        <div className="flex items-center gap-2 text-text-tertiary">
          <i className="fa-solid fa-folder text-xs" />
          <span>{fileCount} items</span>
          {selectedCount > 0 && (
            <span className="text-macos-blue font-medium">
              ({selectedCount} selected)
            </span>
          )}
        </div>

        {/* Search Status */}
        {searchQuery && (
          <div className="flex items-center gap-1 text-macos-orange">
            <span>Filter: "{searchQuery}"</span>
          </div>
        )}

        {/* Transfer Status */}
        {activeTransfers > 0 && (
          <div className="flex items-center gap-1.5 text-macos-blue">
            <i className="fa-solid fa-spinner animate-spin text-xs" />
            <span>{activeTransfers} transfer(s) active</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Host Address with Status Indicator */}
        <div className="flex items-center gap-2 text-text-tertiary">
          <span className="w-1.5 h-1.5 rounded-full bg-macos-green animate-pulse" />
          <span>{hostAddress}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
