import type { SSHHost } from '@/types';
import HostListItem from './HostListItem';
import Checkbox from '../Checkbox';
import MoreActionsMenu from './MoreActionsMenu';
import BatchConfirmDialog from './BatchConfirmDialog';
import Pagination from './Pagination';
import FilterDropdown from './FilterDropdown';
import { useHostsGrid } from './useHostsGrid';
import type { HostsGridProps } from './types';

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
  const {
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    statusFilter,
    osFilter,
    statusOptions,
    osOptions,
    setStatusFilter,
    setOsFilter,
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
          <div key={i} className="rounded-lg bg-white border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-48" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Operation bar - macOS style design */}
      <div className="flex items-center gap-3 py-3">
        {/* Left side: operation button group */}
        <div className="flex items-center gap-2 mr-auto">
          {/* Add host button */}
          <button
            onClick={onAddHost}
            className="flex items-center gap-1.5 px-4 py-2 bg-macos-blue text-white
                     rounded-lg text-sm font-medium
                     transition-all duration-200 ease-macos
                     shadow-[0_0.5px_1px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                     hover:brightness-110 hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.3)]
                     active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.2)] active:scale-[0.97]"
          >
            <i className="fa-solid fa-plus w-4 h-4"></i>
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

        {/* Search box */}
        <div className="relative">
          <i className="fa-solid fa-search w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search hosts"
            className="w-[280px] pl-9 pr-4 py-2 bg-white border border-gray-300
                     rounded-lg text-sm text-gray-900 placeholder-gray-400
                     transition-all duration-200 ease-macos
                     shadow-[0_1px_3px_rgba(0,0,0,0.08)]
                     focus:outline-none focus:border-macos-blue focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15),0_0_0_1px_rgba(0,122,255,0.5),0_1px_3px_rgba(0,0,0,0.12)]
                     hover:border-gray-400 hover:shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tool group (refresh, export) */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-9 h-9
                     bg-white border border-gray-300 rounded-lg
                     hover:border-gray-400 hover:bg-gray-50
                     text-gray-600 transition-all duration-200 ease-macos
                     shadow-[0_1px_3px_rgba(0,0,0,0.08)]
                     active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.08)] active:scale-[0.97]
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <i className={`fa-solid fa-rotate-right w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}></i>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center justify-center w-9 h-9
                     bg-white border border-gray-300 rounded-lg
                     hover:border-gray-400 hover:bg-gray-50
                     text-gray-600 transition-all duration-200 ease-macos
                     shadow-[0_1px_3px_rgba(0,0,0,0.08)]
                     active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.08)] active:scale-[0.97]"
          >
            <i className="fa-solid fa-download w-4 h-4"></i>
          </button>
        </div>
      </div>

      {/* List view */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="flex bg-gray-50 border-b border-gray-200 text-xs items-center">
          <div className="w-9 pl-4 pr-2 py-3 flex items-center justify-center shrink-0">
            <Checkbox checked={isAllSelected} onChange={handleSelectAll} />
          </div>
          <div className="w-36 px-4 py-3 flex items-center relative shrink-0">
            <span className="font-bold text-gray-700">ID</span>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-48 px-4 py-3 flex items-center relative shrink-0">
            <span className="font-bold text-gray-700">Host Name</span>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-20 px-4 py-3 flex items-center relative shrink-0">
            <FilterDropdown column="Status" options={statusOptions} selectedValues={statusFilter} onChange={setStatusFilter} />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-32 px-4 py-3 flex items-center relative shrink-0">
            <span className="font-bold text-gray-700">Instance Config</span>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-24 px-4 py-3 flex items-center justify-center relative shrink-0">
            <FilterDropdown column="OS" options={osOptions} selectedValues={osFilter} onChange={setOsFilter} />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-40 px-4 py-3 flex items-center relative shrink-0">
            <span className="font-bold text-gray-700">IPv4 Address</span>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-48 px-4 py-3 flex items-center relative">
            <span className="font-bold text-gray-700">Disk</span>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
          </div>
          <div className="w-44 px-4 py-3 flex items-center shrink-0">
            <span className="font-bold text-gray-700">Actions</span>
          </div>
        </div>

        {/* Host list */}
        <div className="divide-y divide-gray-100">
          {paginatedHosts.map((host) => (
            <HostListItem
              key={host.id}
              host={host}
              isExpanded={expandedHost === host.id}
              isMenuOpen={activeMenu === host.id}
              isRefreshing={refreshingHostId === host.id}
              copiedField={copiedField}
              isSelected={selectedHosts.has(host.id)}
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