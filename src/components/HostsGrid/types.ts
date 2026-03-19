import type { SSHHost, DiskInfo } from '@/types';

export interface HostsGridProps {
  hosts: SSHHost[];
  loading: boolean;
  onEdit: (host: SSHHost) => void;
  onDelete: (id: number, hostName: string) => void;
  onTestConnection: (id: number) => void;
  onOpenTerminal: (host: SSHHost) => void;
  onOpenSFTP?: (host: SSHHost) => void;
  onAddHost: () => void;
  onCopyHost?: (host: SSHHost) => void;
  onRefresh?: () => void;
}

export interface HostListItemProps {
  host: SSHHost;
  isExpanded: boolean;
  isMenuOpen: boolean;
  isRefreshing: boolean;
  copiedField: string | null;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onCopy: (text: string, field: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onTestConnection: () => void;
  onRefresh: () => void;
  onCopyHost: () => void;
  onOpenTerminal: () => void;
  onOpenSFTP: () => void;
  onSelect: (checked: boolean) => void;
}

export interface HostGridCardProps {
  host: SSHHost;
  onOpenTerminal: () => void;
  onOpenSFTP: () => void;
}

export interface ActionMenuProps {
  isOpen: boolean;
  isRefreshing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTestConnection: () => void;
  onRefresh: () => void;
  onCopyHost: () => void;
}

export interface DiskProgressBarProps {
  usage: number;
  className?: string;
}

export interface StatusBadgeProps {
  status: string;
}

// 辅助函数
export const formatMemory = (memoryGb?: number): string => {
  if (!memoryGb || memoryGb === 0) return '-';
  if (memoryGb >= 1) {
    return `${memoryGb.toFixed(0)}GiB`;
  } else {
    return `${(memoryGb * 1024).toFixed(0)}MiB`;
  }
};

export const getSystemDisk = (disks?: DiskInfo[]): DiskInfo | undefined => {
  if (!disks || disks.length === 0) return undefined;
  return disks.find(d => d.mount_point === '/') || disks[0];
};

export const getDiskColor = (usagePercent: number): string => {
  if (usagePercent >= 90) return 'bg-red-500';
  if (usagePercent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

export const getDiskTextColor = (usagePercent: number): string => {
  if (usagePercent >= 90) return 'text-red-500';
  if (usagePercent >= 70) return 'text-amber-500';
  return 'text-emerald-500';
};

// Batch operation types
export type BatchOperationType = 'delete' | 'shutdown' | 'restart';

export interface BatchDialogState {
  isOpen: boolean;
  type: BatchOperationType | null;
}

// useHostsGrid hook types
export interface UseHostsGridProps {
  hosts: SSHHost[];
  onRefresh?: () => Promise<void> | void;
}

export interface UseHostsGridReturn {
  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
  
  // Filter
  statusFilter: string[];
  osFilter: string[];
  statusOptions: string[];
  osOptions: string[];
  setStatusFilter: (filter: string[]) => void;
  setOsFilter: (filter: string[]) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Selection
  selectedHosts: Set<number>;
  selectedHostObjects: SSHHost[];
  handleSelectHost: (hostId: number, checked: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
  isPartialSelected: boolean;
  
  // Refresh
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  
  // Menu
  activeMenu: number | null;
  setActiveMenu: (id: number | null) => void;
  expandedHost: number | null;
  setExpandedHost: (id: number | null) => void;
  refreshingHostId: number | null;
  handleRefreshSystemInfo: (hostId: number) => Promise<void>;
  handleClickOutside: () => void;
  
  // Copy
  copiedField: string | null;
  copyToClipboard: (text: string, field: string) => Promise<void>;
  
  // More actions
  isMoreActionsOpen: boolean;
  setIsMoreActionsOpen: (open: boolean) => void;
  
  // Batch dialog
  batchDialog: BatchDialogState;
  handleBatchDelete: () => void;
  handleBatchShutdown: () => void;
  handleBatchRestart: () => void;
  executeBatchDelete: () => Promise<void>;
  executeBatchShutdown: () => Promise<void>;
  executeBatchRestart: () => Promise<void>;
  closeBatchDialog: () => void;
  getBatchDialogConfig: () => {
    title: string;
    message: string;
    confirmText: string;
    confirmButtonClass: string;
  } | null;
  
  // Data
  filteredHosts: SSHHost[];
  paginatedHosts: SSHHost[];
  
  // Export
  handleExport: () => void;
}
