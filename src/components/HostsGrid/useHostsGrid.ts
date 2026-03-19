import { useState, useMemo, useCallback } from 'react';
import type { SSHHost } from '@/types';
import { hostApi } from '@/services/api';
import type { BatchDialogState, UseHostsGridProps, UseHostsGridReturn } from './types';

export function useHostsGrid({ hosts, onRefresh }: UseHostsGridProps): UseHostsGridReturn {
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
  
  // Menu state
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [expandedHost, setExpandedHost] = useState<number | null>(null);
  const [refreshingHostId, setRefreshingHostId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // More actions state
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  
  // Batch dialog state
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
  
  // Filtered host list
  const filteredHosts = useMemo(() => {
    return hosts.filter(host => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = host.name?.toLowerCase().includes(query);
        const matchIp = host.address?.toLowerCase().includes(query);
        const matchOs = host.system_type?.toLowerCase().includes(query);
        if (!matchName && !matchIp && !matchOs) return false;
      }
      if (statusFilter.length > 0) {
        const statusText = host.status === 'connected' ? 'Running' :
                          host.status === 'disconnected' ? 'Offline' : 'Unknown';
        if (!statusFilter.includes(statusText)) return false;
      }
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
  
  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);
  
  const handleSelectHost = useCallback((hostId: number, checked: boolean) => {
    setSelectedHosts(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(hostId);
      } else {
        newSelected.delete(hostId);
      }
      return newSelected;
    });
  }, []);
  
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedHosts(new Set(paginatedHosts.map(h => h.id)));
    } else {
      setSelectedHosts(new Set());
    }
  }, [paginatedHosts]);
  
  const isAllSelected = paginatedHosts.length > 0 && paginatedHosts.every(h => selectedHosts.has(h.id));
  const isPartialSelected = paginatedHosts.some(h => selectedHosts.has(h.id)) && !isAllSelected;
  
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);
  
  const handleRefreshSystemInfo = useCallback(async (hostId: number) => {
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
  }, [onRefresh]);
  
  const handleClickOutside = useCallback(() => {
    setActiveMenu(null);
  }, []);
  
  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);
  
  // Batch operations
  const handleBatchDelete = useCallback(() => {
    if (selectedHosts.size === 0) return;
    setBatchDialog({ isOpen: true, type: 'delete' });
    setIsMoreActionsOpen(false);
  }, [selectedHosts.size]);
  
  const handleBatchShutdown = useCallback(() => {
    if (selectedHosts.size === 0) return;
    setBatchDialog({ isOpen: true, type: 'shutdown' });
    setIsMoreActionsOpen(false);
  }, [selectedHosts.size]);
  
  const handleBatchRestart = useCallback(() => {
    if (selectedHosts.size === 0) return;
    setBatchDialog({ isOpen: true, type: 'restart' });
    setIsMoreActionsOpen(false);
  }, [selectedHosts.size]);
  
  const executeBatchDelete = useCallback(async () => {
    try {
      for (const hostId of selectedHosts) {
        await hostApi.delete(hostId);
      }
      setSelectedHosts(new Set());
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
    }
    setBatchDialog({ isOpen: false, type: null });
  }, [selectedHosts, onRefresh]);
  
  const executeBatchShutdown = useCallback(async () => {
    try {
      for (const hostId of selectedHosts) {
        await hostApi.executeCommand(hostId, 'shutdown -h now');
      }
    } catch (error) {
      console.error('Batch shutdown failed:', error);
    }
    setBatchDialog({ isOpen: false, type: null });
  }, [selectedHosts]);
  
  const executeBatchRestart = useCallback(async () => {
    try {
      for (const hostId of selectedHosts) {
        await hostApi.executeCommand(hostId, 'sync; reboot');
      }
    } catch (error) {
      console.error('Batch restart failed:', error);
    }
    setBatchDialog({ isOpen: false, type: null });
  }, [selectedHosts]);
  
  const closeBatchDialog = useCallback(() => {
    setBatchDialog({ isOpen: false, type: null });
  }, []);
  
  const getBatchDialogConfig = useCallback(() => {
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
  }, [batchDialog.type, selectedHosts.size]);
  
  // Export
  const handleExport = useCallback(() => {
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
  }, [filteredHosts]);
  
  return {
    // Pagination
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    
    // Filter
    statusFilter,
    osFilter,
    statusOptions,
    osOptions,
    setStatusFilter,
    setOsFilter,
    
    // Search
    searchQuery,
    setSearchQuery,
    
    // Selection
    selectedHosts,
    selectedHostObjects,
    handleSelectHost,
    handleSelectAll,
    isAllSelected,
    isPartialSelected,
    
    // Refresh
    isRefreshing,
    handleRefresh,
    
    // Menu
    activeMenu,
    setActiveMenu,
    expandedHost,
    setExpandedHost,
    refreshingHostId,
    handleRefreshSystemInfo,
    handleClickOutside,
    
    // Copy
    copiedField,
    copyToClipboard,
    
    // More actions
    isMoreActionsOpen,
    setIsMoreActionsOpen,
    
    // Batch dialog
    batchDialog,
    handleBatchDelete,
    handleBatchShutdown,
    handleBatchRestart,
    executeBatchDelete,
    executeBatchShutdown,
    executeBatchRestart,
    closeBatchDialog,
    getBatchDialogConfig,
    
    // Data
    filteredHosts,
    paginatedHosts,
    
    // Export
    handleExport,
  };
}