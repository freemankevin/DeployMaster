import { Folder, Activity, HardDrive } from 'lucide-react';

interface StatusBarProps {
  fileCount: number;
  selectedCount: number;
  searchQuery: string;
  activeTransfers: number;
  hostAddress: string;
  currentPath: string;
}

const StatusBar = ({
  fileCount,
  selectedCount,
  searchQuery,
  activeTransfers,
  hostAddress,
  currentPath
}: StatusBarProps) => {
  return (
    <div
      className="h-8 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between px-4 text-[12px]"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <div className="flex items-center gap-4">
        {/* File Count */}
        <div className="flex items-center gap-2 text-gray-400">
          <Folder className="w-3.5 h-3.5" />
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
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{activeTransfers} transfer(s) active</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Current Path */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <HardDrive className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">{currentPath}</span>
        </div>

        {/* Host Address */}
        <div className="text-gray-400">
          {hostAddress}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
