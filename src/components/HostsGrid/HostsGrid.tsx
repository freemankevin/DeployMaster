import { useState, useMemo } from 'react';
import type { SSHHost } from '@/types';
import { hostApi } from '@/services/api';
import HostListItem from './HostListItem';
import Checkbox from '../Checkbox';
import MoreActionsMenu from './MoreActionsMenu';
import BatchConfirmDialog from './BatchConfirmDialog';
import type { HostsGridProps, BatchDialogState } from './types';

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: PaginationProps) => {
  const pageSizeOptions = [10, 20, 50, 100];

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="text-xs text-gray-500">
        Total <span className="text-gray-700">{totalItems}</span> items
      </div>
      <div className="flex items-center gap-6">
        {/* Items per page selection */}
        <div className="flex items-center gap-1.5">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded px-2 py-1 pr-6 focus:outline-none focus:border-blue-400 bg-white cursor-pointer"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500">items/page</span>
        </div>

        {/* Pagination navigation - Tencent Cloud style */}
        <div className="flex items-center gap-1">
          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <i className="fa-solid fa-chevron-left w-4 h-4"></i>
          </button>
          
          {/* Page numbers */}
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            )
          ))}
          
          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <i className="fa-solid fa-chevron-right w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

// Filter dropdown component
interface FilterDropdownProps {
  column: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const FilterDropdown = ({ column, options, selectedValues, onChange }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const handleToggle = (value: string) => {
    if (value === '(Select All)') {
      if (selectedValues.length === options.length) {
        onChange([]);
      } else {
        onChange([...options]);
      }
      return;
    }

    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const isAllSelected = selectedValues.length === options.length && options.length > 0;
  const hasFilter = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 transition-colors ${
          hasFilter ? 'text-blue-600' : ''
        }`}
      >
        <span className="font-bold text-gray-700">{column}</span>
        <i className={`fa-solid fa-filter w-3 h-3 ${hasFilter ? 'text-blue-600' : 'text-gray-400'}`}></i>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-auto left-auto mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[110] py-2" style={{ marginTop: '4px' }}>
            {/* Search box */}
            <div className="px-3 pb-2 border-b border-gray-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Option list */}
            <div className="max-h-48 overflow-y-auto py-1">
              <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={isAllSelected}
                  onChange={() => handleToggle('(全选)')}
                  size="sm"
                />
                <span className="text-xs text-gray-600">(Select All)</span>
              </label>
              {filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedValues.includes(option)}
                    onChange={() => handleToggle(option)}
                    size="sm"
                  />
                  <span className="text-xs text-gray-700">{option}</span>
                </label>
              ))}
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-end gap-2 px-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  onChange([]);
                  setIsOpen(false);
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [expandedHost, setExpandedHost] = useState<number | null>(null);
  const [refreshingHostId, setRefreshingHostId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [osFilter, setOsFilter] = useState<string[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selection state
  const [selectedHosts, setSelectedHosts] = useState<Set<number>>(new Set());

  // More Actions dropdown state
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

  // Batch operation dialog state
  const [batchDialog, setBatchDialog] = useState<BatchDialogState>({ isOpen: false, type: null });

  // Get selected host objects
  const selectedHostObjects = useMemo(() => {
    return hosts.filter(host => selectedHosts.has(host.id));
  }, [hosts, selectedHosts]);

  // Get unique filter options
  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    hosts.forEach(h => {
      if (h.status === 'connected') statuses.add('Running');
      else if (h.status === 'disconnected') statuses.add('Offline');
      else statuses.add('Unknown');
    });
    return Array.from(statuses);
  }, [hosts]);

  const osOptions = useMemo(() => {
    const oss = new Set<string>();
    hosts.forEach(h => {
      if (h.system_type) oss.add(h.system_type);
      else if (h.os_key) oss.add(h.os_key);
    });
    return Array.from(oss);
  }, [hosts]);

  // Filtered host list (including search)
  const filteredHosts = useMemo(() => {
    return hosts.filter(host => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = host.name?.toLowerCase().includes(query);
        const matchIp = host.address?.toLowerCase().includes(query);
        const matchOs = host.system_type?.toLowerCase().includes(query);
        if (!matchName && !matchIp && !matchOs) return false;
      }
      // Status filter
      if (statusFilter.length > 0) {
        const statusText = host.status === 'connected' ? 'Running' :
                          host.status === 'disconnected' ? 'Offline' : 'Unknown';
        if (!statusFilter.includes(statusText)) return false;
      }
      // OS filter
      if (osFilter.length > 0) {
        const osText = host.system_type || host.os_key || 'Unknown';
        if (!osFilter.includes(osText)) return false;
      }
      return true;
    });
  }, [hosts, searchQuery, statusFilter, osFilter]);

  // Paginated host list
  const paginatedHosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHosts.slice(start, start + pageSize);
  }, [filteredHosts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredHosts.length / pageSize);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopyHost = (host: SSHHost) => {
    if (onCopyHost) {
      onCopyHost(host);
    }
    setActiveMenu(null);
  };

  const handleRefreshSystemInfo = async (hostId: number) => {
    setRefreshingHostId(hostId);
    setActiveMenu(null);
    try {
      await hostApi.refreshSystemInfo(hostId);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh system info:', error);
    } finally {
      setRefreshingHostId(null);
    }
  };

  const handleClickOutside = () => {
    setActiveMenu(null);
  };

  // Handle pagination change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Handle selection
  const handleSelectHost = (hostId: number, checked: boolean) => {
    const newSelected = new Set(selectedHosts);
    if (checked) {
      newSelected.add(hostId);
    } else {
      newSelected.delete(hostId);
    }
    setSelectedHosts(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHosts(new Set(paginatedHosts.map(h => h.id)));
    } else {
      setSelectedHosts(new Set());
    }
  };

  const isAllSelected = paginatedHosts.length > 0 && paginatedHosts.every(h => selectedHosts.has(h.id));
  const isPartialSelected = paginatedHosts.some(h => selectedHosts.has(h.id)) && !isAllSelected;

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Batch operations
  const handleBatchDelete = () => {
    if (selectedHosts.size === 0) return;
    setBatchDialog({ isOpen: true, type: 'delete' });
    setIsMoreActionsOpen(false);
  };

  const handleBatchShutdown = () => {
    if (selectedHosts.size === 0) return;
    setBatchDialog({ isOpen: true, type: 'shutdown' });
    setIsMoreActionsOpen(false);
  };

  const handleBatchRestart = () => {
    if (selectedHosts.size === 0) return;
    setBatchDialog({ isOpen: true, type: 'restart' });
    setIsMoreActionsOpen(false);
  };

  const executeBatchDelete = async () => {
    try {
      // Directly use API to delete hosts without showing confirmation dialog
      for (const hostId of selectedHosts) {
        await hostApi.delete(hostId);
      }
      setSelectedHosts(new Set());
      // Refresh data after batch delete
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
    }
    setBatchDialog({ isOpen: false, type: null });
  };

  const executeBatchShutdown = async () => {
    try {
      for (const hostId of selectedHosts) {
        await hostApi.executeCommand(hostId, 'shutdown -h now');
      }
    } catch (error) {
      console.error('Batch shutdown failed:', error);
    }
    setBatchDialog({ isOpen: false, type: null });
  };

  const executeBatchRestart = async () => {
    try {
      for (const hostId of selectedHosts) {
        await hostApi.executeCommand(hostId, 'sync; reboot');
      }
    } catch (error) {
      console.error('Batch restart failed:', error);
    }
    setBatchDialog({ isOpen: false, type: null });
  };

  const getBatchDialogConfig = () => {
    switch (batchDialog.type) {
      case 'delete':
        return {
          title: 'Confirm Delete',
          message: `Are you sure you want to delete the following ${selectedHosts.size} host(s)? This action cannot be undone.`,
          confirmText: 'Delete',
          confirmButtonClass: 'bg-macos-red hover:bg-red-600'
        };
      case 'shutdown':
        return {
          title: 'Confirm Shutdown',
          message: `Are you sure you want to shutdown the following ${selectedHosts.size} host(s) immediately?`,
          confirmText: 'Shutdown',
          confirmButtonClass: 'bg-orange-500 hover:bg-orange-600'
        };
      case 'restart':
        return {
          title: 'Confirm Restart',
          message: `Are you sure you want to restart the following ${selectedHosts.size} host(s)? Data will be synced before restart.`,
          confirmText: 'Restart',
          confirmButtonClass: 'bg-blue-500 hover:bg-blue-600'
        };
      default:
        return null;
    }
  };

  const dialogConfig = getBatchDialogConfig();

  // Handle export to Excel
  const handleExport = () => {
    const headers = ['ID', 'Name', 'Address', 'Port', 'Username', 'Auth Type', 'Status', 'OS', 'CPU Cores', 'Memory(GB)', 'Description'];
    const rows = filteredHosts.map(host => [
      host.id,
      host.name,
      host.address,
      host.port,
      host.username,
      host.auth_type === 'password' ? 'Password' : 'Key',
      host.status === 'connected' ? 'Running' : host.status === 'disconnected' ? 'Offline' : 'Unknown',
      host.system_type || host.os_key || 'Unknown',
      host.cpu_cores || '',
      host.memory_gb || '',
      host.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Host List_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

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
          {/* Add host button - macOS style primary button */}
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

          {/* More actions dropdown - macOS style secondary button */}
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

        {/* Search box - macOS style */}
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

        {/* Tool group (refresh, export) - macOS style icon buttons */}
        <div className="flex items-center gap-1">
          {/* Refresh button */}
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

          {/* Export button */}
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
          {/* Table header - Tencent Cloud style, with checkbox column */}
          <div className="flex bg-gray-50 border-b border-gray-200 text-xs items-center">
            {/* Checkbox column - compressed width */}
            <div className="w-9 pl-4 pr-2 py-3 flex items-center justify-center shrink-0">
              <Checkbox
                checked={isAllSelected}
                onChange={handleSelectAll}
              />
            </div>
            {/* Host ID */}
            <div className="w-36 px-4 py-3 flex items-center relative shrink-0">
              <span className="font-bold text-gray-700">ID</span>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Host name */}
            <div className="w-48 px-4 py-3 flex items-center relative shrink-0">
              <span className="font-bold text-gray-700">Host Name</span>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Status - with filter */}
            <div className="w-20 px-4 py-3 flex items-center relative shrink-0">
              <FilterDropdown
                column="Status"
                options={statusOptions}
                selectedValues={statusFilter}
                onChange={setStatusFilter}
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Instance config */}
            <div className="w-32 px-4 py-3 flex items-center relative shrink-0">
              <span className="font-bold text-gray-700">Instance Config</span>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Operating system */}
            <div className="w-24 px-4 py-3 flex items-center justify-center relative shrink-0">
              <FilterDropdown
                column="OS"
                options={osOptions}
                selectedValues={osFilter}
                onChange={setOsFilter}
              />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Primary IPv4 address */}
            <div className="w-40 px-4 py-3 flex items-center relative shrink-0">
              <span className="font-bold text-gray-700">IPv4 Address</span>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Disk */}
            <div className="w-48 px-4 py-3 flex items-center relative">
              <span className="font-bold text-gray-700">Disk</span>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-px bg-gray-200" />
            </div>
            {/* Actions */}
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
                onDelete={() => onDelete(host.id)}
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
          onCancel={() => setBatchDialog({ isOpen: false, type: null })}
        />
      )}
    </div>
  );
};

export default HostsGrid;
