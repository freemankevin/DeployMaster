import type { SSHHost, DiskInfo } from '@/types';

export interface HostsGridProps {
  hosts: SSHHost[];
  loading: boolean;
  onEdit: (host: SSHHost) => void;
  onDelete: (id: number) => void;
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
