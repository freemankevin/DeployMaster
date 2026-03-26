import type { SSHHost } from '@/types';
import HostListItem from './HostListItem';
import Checkbox from '../Checkbox';
import MoreActionsMenu from './MoreActionsMenu';
import BatchConfirmDialog from './BatchConfirmDialog';
import Pagination from './Pagination';
import FilterDropdown from './FilterDropdown';
import { useHostsGrid } from './useHostsGrid';
import { useColumnResize } from '@/hooks/useColumnResize';
import type { HostsGridProps, ColumnWidths } from './types';

// Default column widths
const defaultColumnWidths: ColumnWidths = {
  checkbox: 36,
  id: 140,
  hostName: 160,
  status: 80,
  specs: 100,
  swap: 60,
  arch: 70,
  kernel: 200,
  os: 80,
  ip: 140,
  disk: 180,
  actions: 200,
};

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
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
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
    selectedHosts,
    selectedHostObjects,
    handleSelectHost,
    handleSelectAll,
    isAllSelected,
    isRefreshing,
    handleRefresh,
    activeMenu,
    setActiveMenu,
    expandedHost,
    setExpandedHost,
    refreshingHostId,
    handleRefreshSystemInfo,
    handleClickOutside,
    copiedField,
    copyToClipboard,
    isMoreActionsOpen,
    setIsMoreActionsOpen,
    batchDialog,
    handleBatchDelete,
    handleBatchShutdown,
    handleBatchRestart,
    executeBatchDelete,
    executeBatchShutdown,
    executeBatchRestart,
    closeBatchDialog,
    getBatchDialogConfig,
    filteredHosts,
    paginatedHosts,
    handleExport,
  } = useHostsGrid({ hosts, onRefresh });

  const handleCopyHost = (host: SSHHost) => {
    if (onCopyHost) {
      onCopyHost(host);
    }
    setActiveMenu(null);
  };

  const dialogConfig = getBatchDialogConfig();

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg bg-background-secondary border border-border-primary p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-background-tertiary rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-background-tertiary rounded w-32 mb-2" />
                <div className="h-3 bg-background-tertiary rounded w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Operation bar - macOS Dark Mode style */}
      <div className="flex items-center gap-3">
        {/* Left side: operation button group */}
        <div className="flex items-center gap-2">
          {/* Add host button */}
          <button
            onClick={onAddHost}
            className="flex items-center gap-1.5 px-3 py-2 bg-macos-blue text-white
                     rounded-md text-xs font-medium h-[34px]
                     transition-all duration-200 ease-macos
                     shadow-macos-button
                     hover:brightness-110 hover:shadow-glow-blue
                     active:shadow-macos-button-active active:scale-[0.97]"
          >
            <i className="fa-solid fa-plus text-[11px]"></i>
            <span>Add Host</span>
          </button>

          {/* More actions dropdown */}
          <MoreActionsMenu
            isOpen={isMoreActionsOpen}
            selectedCount={selectedHosts.size}
            onToggle={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
            onClose={() => setIsMoreActionsOpen(false)}
            onShutdown={handleBatchShutdown}
            onRestart={handleBatchRestart}
            onDelete={handleBatchDelete}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Right side: Search + Tools */}
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <i className="fa-solid fa-search text-[12px] absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
            <input
              type="text"
              placeholder="Search..."
              className="w-[140px] lg:w-[180px] pl-7 pr-2 py-2 bg-background-tertiary/80 border border-border-primary
                       rounded-md text-xs text-text-primary placeholder-text-tertiary h-[34px]
                       transition-all duration-200 ease-macos
                       shadow-macos-input
                       focus:outline-none focus:border-macos-blue focus:shadow-macos-input-focus
                       hover:border-border-tertiary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
          />
          </div>

          {/* Tool group */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh"
              className="flex items-center justify-center w-[34px] h-[34px]
                       bg-background-tertiary/80 border border-border-primary rounded-md
                       hover:border-border-tertiary hover:bg-background-hover
                       text-text-secondary transition-all duration-200 ease-macos
                       shadow-macos-button
                       active:shadow-macos-button-active active:scale-[0.97]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <i className={`fa-solid fa-rotate-right text-[12px] text-macos-green ${isRefreshing ? 'animate-spin' : ''}`}></i>
            </button>

            <button
              onClick={handleExport}
              title="Export"
              className="flex items-center justify-center w-[34px] h-[34px]
                       bg-background-tertiary/80 border border-border-primary rounded-md
                       hover:border-border-tertiary hover:bg-background-hover
                       text-text-secondary transition-all duration-200 ease-macos
                       shadow-macos-button
                       active:shadow-macos-button-active active:scale-[0.97]"
            >
              <i className="fa-solid fa-download text-[12px] text-macos-purple"></i>
            </button>
          </div>
        </div>
      </div>

      {/* List view - Dark Mode with horizontal scroll */}
      <div className="bg-background-secondary rounded-lg border border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          {/* Table header with resize handles */}
          <div className="flex bg-background-tertiary border-b border-border-primary text-xs" style={{ minWidth: Object.values(colWidths).reduce((a, b) => a + b, 0) }}>
          {/* Checkbox */}
          <div className="relative flex items-center justify-center shrink-0" style={{ width: colWidths.checkbox }}>
            <div className="flex-1 pl-3 pr-2 py-2.5 flex items-center justify-center">
              <Checkbox checked={isAllSelected} onChange={handleSelectAll} />
            </div>
            <div {...getResizeHandleProps('checkbox')}><div {...getResizeIndicatorProps('checkbox')} /></div>
          </div>
          {/* ID */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.id }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">ID</span>
            </div>
            <div {...getResizeHandleProps('id')}><div {...getResizeIndicatorProps('id')} /></div>
          </div>
          {/* Host Name */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.hostName }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">Host Name</span>
            </div>
            <div {...getResizeHandleProps('hostName')}><div {...getResizeIndicatorProps('hostName')} /></div>
          </div>
          {/* Status */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.status }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <FilterDropdown column="Status" options={statusOptions} selectedValues={statusFilter} onChange={setStatusFilter} />
            </div>
            <div {...getResizeHandleProps('status')}><div {...getResizeIndicatorProps('status')} /></div>
          </div>
          {/* Specs */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.specs }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">Specs</span>
            </div>
            <div {...getResizeHandleProps('specs')}><div {...getResizeIndicatorProps('specs')} /></div>
          </div>
          {/* Swap */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.swap }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">Swap</span>
            </div>
            <div {...getResizeHandleProps('swap')}><div {...getResizeIndicatorProps('swap')} /></div>
          </div>
          {/* Arch */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.arch }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <FilterDropdown column="Arch" options={archOptions} selectedValues={archFilter} onChange={setArchFilter} />
            </div>
            <div {...getResizeHandleProps('arch')}><div {...getResizeIndicatorProps('arch')} /></div>
          </div>
          {/* Kernel */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.kernel }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">Kernel</span>
            </div>
            <div {...getResizeHandleProps('kernel')}><div {...getResizeIndicatorProps('kernel')} /></div>
          </div>
          {/* OS */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.os }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <FilterDropdown column="OS" options={osOptions} selectedValues={osFilter} onChange={setOsFilter} />
            </div>
            <div {...getResizeHandleProps('os')}><div {...getResizeIndicatorProps('os')} /></div>
          </div>
          {/* IPv4 Address */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.ip }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">IP</span>
            </div>
            <div {...getResizeHandleProps('ip')}><div {...getResizeIndicatorProps('ip')} /></div>
          </div>
          {/* Disk */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.disk }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">Disk</span>
            </div>
            <div {...getResizeHandleProps('disk')}><div {...getResizeIndicatorProps('disk')} /></div>
          </div>
          {/* Actions - no resize handle for last column */}
          <div className="relative flex items-center shrink-0" style={{ width: colWidths.actions }}>
            <div className="flex-1 px-2 py-2.5 flex items-center">
              <span className="font-semibold text-text-secondary">Actions</span>
            </div>
          </div>
        </div>

        {/* Host list */}
        <div className="divide-y divide-border-secondary">
          {paginatedHosts.map((host) => (
            <HostListItem
              key={host.id}
              host={host}
              isExpanded={expandedHost === host.id}
              isMenuOpen={activeMenu === host.id}
              isRefreshing={refreshingHostId === host.id}
              copiedField={copiedField}
              isSelected={selectedHosts.has(host.id)}
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
              onSelect={(checked) => handleSelectHost(host.id, checked)}
            />
          ))}
        </div>

        {/* Pagination bar */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredHosts.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
        </div>
      </div>

      {/* Batch Operation Confirmation Dialog */}
      {dialogConfig && (
        <BatchConfirmDialog
          isOpen={batchDialog.isOpen}
          title={dialogConfig.title}
          message={dialogConfig.message}
          hosts={selectedHostObjects}
          confirmText={dialogConfig.confirmText}
          confirmButtonClass={dialogConfig.confirmButtonClass}
          onConfirm={
            batchDialog.type === 'delete'
              ? executeBatchDelete
              : batchDialog.type === 'shutdown'
              ? executeBatchShutdown
              : executeBatchRestart
          }
          onCancel={closeBatchDialog}
        />
      )}
    </div>
  );
};

export default HostsGrid;