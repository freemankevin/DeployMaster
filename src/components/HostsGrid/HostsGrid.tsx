import type { SSHHost } from '@/types';
import { Plus, Search } from 'lucide-react';
import HostListItem from './HostListItem';
import FilterDropdown from './FilterDropdown';
import { useHostsGrid } from './useHostsGrid';
import { useColumnResize } from '@/hooks/useColumnResize';
import type { HostsGridProps, ColumnWidths } from './types';

// Default column widths - Railway 风格优化
const defaultColumnWidths: ColumnWidths = {
  id: 140,
  hostName: 180,
  status: 100,
  specs: 120,
  swap: 80,
  arch: 80,
  kernel: 220,
  os: 100,
  ip: 160,
  disk: 200,
  actions: 180,
};

// Hidden columns (保留用于导出，UI 中隐藏)
const hiddenColumns = ['id', 'hostName', 'status', 'swap', 'kernel'];

const HostsGrid = ({
  hosts,
  loading,
  onEdit,
  onDelete,
  onTestConnection,
  onOpenTerminal,
  onOpenSFTP,
  onAddHost,
  onCopyHost,
  onRefresh
}: HostsGridProps) => {
  // Column resize hook
  const { widths: colWidths, getResizeHandleProps, getResizeIndicatorProps } = useColumnResize<ColumnWidths>({
    initialWidths: defaultColumnWidths,
    minWidth: 50,
  });

  const {
    statusFilter,
    osFilter,
    archFilter,
    statusOptions,
    osOptions,
    archOptions,
    setStatusFilter,
    setOsFilter,
    setArchFilter,
    searchQuery,
    setSearchQuery,
    activeMenu,
    setActiveMenu,
    expandedHost,
    setExpandedHost,
    refreshingHostId,
    handleRefreshSystemInfo,
    handleClickOutside,
    copiedField,
    copyToClipboard,
    filteredHosts,
    handleExport,
  } = useHostsGrid({ hosts, onRefresh });

  const handleCopyHost = (host: SSHHost) => {
    if (onCopyHost) {
      onCopyHost(host);
    }
    setActiveMenu(null);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="rounded-lg p-4 animate-pulse"
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-default)',
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-lg"
                style={{ background: 'var(--bg-overlay)' }}
              />
              <div className="flex-1">
                <div 
                  className="h-4 rounded w-32 mb-2"
                  style={{ background: 'var(--bg-overlay)' }}
                />
                <div 
                  className="h-3 rounded w-48"
                  style={{ background: 'var(--bg-overlay)' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Operation bar - Railway style */}
      <div className="flex items-center gap-3">
        {/* Left side: Search box */}
        <div className="flex items-center gap-2">
          {/* Search box - Railway style */}
          <div className="relative">
            <Search className="w-4 h-4 search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="w-[280px] lg:w-[360px] pl-9 pr-3 py-2 text-sm h-[36px] input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right side: Add button */}
        <div className="flex items-center gap-2">
          {/* Add host button - Railway style */}
          <button
            onClick={onAddHost}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium h-[36px] btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>NEW</span>
          </button>
        </div>
      </div>

      {/* List view - Railway style */}
      <div 
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-default)',
        }}
      >
        <div className="overflow-x-auto">
          {/* Table header */}
          <div 
            className="flex text-xs"
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '0.5px solid var(--border-subtle)',
              minWidth: Object.values(colWidths).reduce((a, b) => a + b, 0),
            }}
          >
            {/* ID - Hidden */}
            <div className="relative flex items-center shrink-0 hidden" style={{ width: colWidths.id }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  ID
                </span>
              </div>
              <div {...getResizeHandleProps('id')}><div {...getResizeIndicatorProps('id')} /></div>
            </div>
            
            {/* IP - 左侧显示 */}
            <div className="relative flex items-center shrink-0" style={{ width: colWidths.ip }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  IP
                </span>
              </div>
              <div {...getResizeHandleProps('ip')}><div {...getResizeIndicatorProps('ip')} /></div>
            </div>
            
            {/* Host Name - Hidden */}
            <div className="relative flex items-center shrink-0 hidden" style={{ width: colWidths.hostName }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Host Name
                </span>
              </div>
              <div {...getResizeHandleProps('hostName')}><div {...getResizeIndicatorProps('hostName')} /></div>
            </div>
            
            {/* Status - Hidden */}
            <div className="relative flex items-center shrink-0 hidden" style={{ width: colWidths.status }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <FilterDropdown column="Status" options={statusOptions} selectedValues={statusFilter} onChange={setStatusFilter} />
              </div>
              <div {...getResizeHandleProps('status')}><div {...getResizeIndicatorProps('status')} /></div>
            </div>
            
            {/* Specs */}
            <div className="relative flex items-center shrink-0" style={{ width: colWidths.specs }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Specs
                </span>
              </div>
              <div {...getResizeHandleProps('specs')}><div {...getResizeIndicatorProps('specs')} /></div>
            </div>
            
            {/* Swap - Hidden */}
            <div className="relative flex items-center shrink-0 hidden" style={{ width: colWidths.swap }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Swap
                </span>
              </div>
              <div {...getResizeHandleProps('swap')}><div {...getResizeIndicatorProps('swap')} /></div>
            </div>
            
            {/* Arch */}
            <div className="relative flex items-center shrink-0" style={{ width: colWidths.arch }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <FilterDropdown column="Arch" options={archOptions} selectedValues={archFilter} onChange={setArchFilter} />
              </div>
              <div {...getResizeHandleProps('arch')}><div {...getResizeIndicatorProps('arch')} /></div>
            </div>
            
            {/* Kernel - Hidden */}
            <div className="relative flex items-center shrink-0 hidden" style={{ width: colWidths.kernel }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Kernel
                </span>
              </div>
              <div {...getResizeHandleProps('kernel')}><div {...getResizeIndicatorProps('kernel')} /></div>
            </div>
            
            {/* OS */}
            <div className="relative flex items-center shrink-0" style={{ width: colWidths.os }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <FilterDropdown column="OS" options={osOptions} selectedValues={osFilter} onChange={setOsFilter} />
              </div>
              <div {...getResizeHandleProps('os')}><div {...getResizeIndicatorProps('os')} /></div>
            </div>
            
            {/* Disk */}
            <div className="relative flex items-center shrink-0" style={{ width: colWidths.disk }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Disk
                </span>
              </div>
              <div {...getResizeHandleProps('disk')}><div {...getResizeIndicatorProps('disk')} /></div>
            </div>
            
            {/* Actions - no resize handle for last column */}
            <div className="relative flex items-center shrink-0" style={{ width: colWidths.actions }}>
              <div className="flex-1 px-3 py-3 flex items-center">
                <span 
                  className="font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Actions
                </span>
              </div>
            </div>
          </div>

          {/* Host list */}
          <div 
            className="divide-y"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {filteredHosts.map((host) => (
              <HostListItem
                key={host.id}
                host={host}
                isExpanded={expandedHost === host.id}
                isMenuOpen={activeMenu === host.id}
                isRefreshing={refreshingHostId === host.id}
                copiedField={copiedField}
                columnWidths={colWidths}
                onToggleExpand={() => setExpandedHost(expandedHost === host.id ? null : host.id)}
                onToggleMenu={() => setActiveMenu(activeMenu === host.id ? null : host.id)}
                onCloseMenu={handleClickOutside}
                onCopy={copyToClipboard}
                onEdit={() => onEdit(host)}
                onDelete={() => onDelete(host.id, host.name || host.address)}
                onTestConnection={() => onTestConnection(host.id)}
                onRefresh={() => handleRefreshSystemInfo(host.id)}
                onCopyHost={() => handleCopyHost(host)}
                onOpenTerminal={() => onOpenTerminal(host)}
                onOpenSFTP={() => onOpenSFTP?.(host)}
                onExport={() => handleExport(host)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostsGrid;