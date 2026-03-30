import { useRef } from 'react';
import {
  Check,
  Copy,
  ChevronRight,
  ChevronUp,
  Terminal,
  FolderOpen,
  MoreVertical,
  HardDrive,
  Tag,
  AlertTriangle,
  Folder,
  Layers,
  Info,
} from 'lucide-react';
import OSIcon, { getOSLabel } from '../OSIcon';
import StatusBadge from './StatusBadge';
import DiskProgressBar from './DiskProgressBar';
import ActionMenu from './ActionMenu';
import Checkbox from '../Checkbox';
import { formatMemory, getSystemDisk, getDiskTextColor, bytesToGB } from './types';
import type { HostListItemProps } from './types';

// Default column widths fallback
const defaultWidths = {
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

export const HostListItem = ({
  host,
  isExpanded,
  isMenuOpen,
  isRefreshing,
  copiedField,
  isSelected,
  columnWidths,
  onToggleExpand,
  onToggleMenu,
  onCloseMenu,
  onCopy,
  onEdit,
  onDelete,
  onTestConnection,
  onRefresh,
  onCopyHost,
  onOpenTerminal,
  onOpenSFTP,
  onSelect
}: HostListItemProps) => {
  const widths = columnWidths || defaultWidths;
  const systemDisk = getSystemDisk(host.disks);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const osTooltip = host.os_pretty_name ||
    `${getOSLabel(host.os_key, host.system_type)}${host.os_version ? ` (${host.os_version})` : ''}`;

  return (
    <div className="group">
      <div 
        className="flex items-center transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-overlay)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center justify-center shrink-0" style={{ width: widths.checkbox, padding: '12px 8px 12px 12px' }}>
          <Checkbox checked={isSelected} onChange={onSelect} />
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.id, padding: '12px' }}>
          <span 
            className="text-xs truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {host.host_id}
          </span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.hostName, padding: '12px' }}>
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span 
              className="text-xs truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {host.name || host.address}
            </span>
            <button
              onClick={() => onCopy(host.name || host.address, `host-${host.id}-name`)}
              className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-name` ? (
                <Check className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
              ) : (
                <Copy 
                  className="w-3 h-3" 
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.status, padding: '12px' }}>
          <StatusBadge status={host.status} />
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.specs, padding: '12px' }}>
          <span 
            className="text-xs whitespace-nowrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {host.cpu_cores ? `${host.cpu_cores} Cores ` : ''}{formatMemory(host.memory_gb)}
          </span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.swap, padding: '12px' }}>
          <span 
            className="text-xs"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatMemory(host.swap_gb) || '0'}
          </span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.arch, padding: '12px' }}>
          <span 
            className="text-xs font-mono"
            style={{ color: 'var(--text-primary)' }}
          >
            {host.architecture || '-'}
          </span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.kernel, padding: '12px' }}>
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span 
              className="text-xs font-mono truncate"
              style={{ color: 'var(--text-primary)' }}
              title={host.kernel_version || ''}
            >
              {host.kernel_version || '-'}
            </span>
            {host.kernel_version && (
              <button
                onClick={() => onCopy(host.kernel_version!, `host-${host.id}-kernel`)}
                className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
                title="Copy"
              >
                {copiedField === `host-${host.id}-kernel` ? (
                  <Check className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
                ) : (
                  <Copy 
                    className="w-3 h-3"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  />
                )}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.os, padding: '12px' }}>
          <OSIcon osKey={host.os_key} systemType={host.system_type} size="sm" title={osTooltip} />
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.ip, padding: '12px' }}>
          <div className="flex items-center gap-1.5 group/copy">
            <span 
              className="text-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              {host.address}
            </span>
            <button
              onClick={() => onCopy(host.address, `host-${host.id}-ip`)}
              className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-ip` ? (
                <Check className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
              ) : (
                <Copy 
                  className="w-3 h-3"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.disk, padding: '12px' }}>
          {systemDisk ? (
            <div 
              className="flex items-center gap-2 cursor-pointer w-full"
              onClick={() => host.disks && host.disks.length > 1 && onToggleExpand()}
            >
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span 
                    className="text-xs"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {systemDisk.mount_point === '/' ? 'System Disk' : systemDisk.mount_point}
                  </span>
                  <span 
                    className="text-xs font-medium"
                    style={{ 
                      color: systemDisk.usage > 90 
                        ? 'var(--color-error)' 
                        : systemDisk.usage > 70 
                          ? 'var(--color-warning)' 
                          : 'var(--color-success)' 
                    }}
                  >
                    {systemDisk.usage.toFixed(0)}%
                  </span>
                </div>
                <DiskProgressBar usage={systemDisk.usage} className="w-full" />
                <div 
                  className="text-[10px] mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {bytesToGB(systemDisk.used)}G / {bytesToGB(systemDisk.total)}G
                </div>
              </div>
              {host.disks && host.disks.length > 1 && (
                <ChevronRight 
                  className="w-4 h-4 transition-transform shrink-0"
                  style={{ 
                    color: 'var(--text-tertiary)',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              )}
            </div>
          ) : (
            <span 
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              -
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0" style={{ width: widths.actions, padding: '12px' }}>
          <button
            onClick={onOpenTerminal}
            className="px-2.5 py-1.5 text-white rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
          >
            <Terminal className="w-3 h-3 shrink-0 text-white" />
            <span>Terminal</span>
          </button>
          <button
            onClick={onOpenSFTP}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            style={{ 
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '0.5px solid var(--border-default)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.background = 'var(--bg-overlay)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <FolderOpen className="w-3 h-3 shrink-0" style={{ color: 'var(--color-success)' }} />
            <span>SFTP</span>
          </button>
          <div className={`relative shrink-0 ${isMenuOpen ? 'z-50' : ''}`}>
            <button
              ref={menuButtonRef}
              onClick={onToggleMenu}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 shrink-0"
              style={{ 
                background: 'var(--bg-overlay)',
                border: '0.5px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-overlay)';
              }}
            >
              <MoreVertical className="w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <ActionMenu
              isOpen={isMenuOpen}
              isRefreshing={isRefreshing}
              anchorEl={menuButtonRef.current}
              onClose={onCloseMenu}
              onEdit={onEdit}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
              onRefresh={onRefresh}
              onCopyHost={onCopyHost}
            />
          </div>
        </div>
      </div>

      {isExpanded && host.disks && host.disks.length > 0 && (
        <div 
          className="px-4 py-3"
          style={{ 
            background: 'var(--bg-overlay)',
            borderTop: '0.5px solid var(--border-subtle)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span 
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <HardDrive className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              Disk Details ({host.disks.length})
            </span>
            <button 
              onClick={onToggleExpand} 
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              <ChevronUp className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
              Collapse
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {host.disks.map((disk, index) => {
              const isSystemDisk = disk.mount_point === '/';
              const isUnmounted = disk.status === 'unmounted';
              const isLVM = disk.device?.includes('/mapper/') || disk.device?.startsWith('/dev/mapper');
              const physicalDiskPath = disk.physical_disk || '';
              const devicePath = disk.device || '';
              const hasPhysicalDisk = physicalDiskPath && physicalDiskPath !== devicePath;
              
              return (
                <div 
                  key={index} 
                  className="rounded-lg p-3 transition-colors"
                  style={{ 
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-default)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <HardDrive 
                        className="w-4 h-4" 
                        style={{ 
                          color: isUnmounted 
                            ? 'var(--text-tertiary)' 
                            : isSystemDisk 
                              ? 'var(--accent)' 
                              : 'var(--color-warning)' 
                        }} 
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {isUnmounted ? 'Unmounted' : isSystemDisk ? 'System Disk' : 'Data Disk'}
                      </span>
                      {isLVM && (
                        <span 
                          className="text-[9px] px-1 py-0.5 rounded font-medium"
                          style={{ 
                            background: 'var(--accent-muted)',
                            color: 'var(--accent)',
                          }}
                        >
                          LVM
                        </span>
                      )}
                    </div>
                    <span 
                      className="text-[10px] font-mono"
                      style={{ color: 'var(--text-tertiary)' }}
                      title={`Device: ${devicePath}`}
                    >
                      {devicePath || '-'}
                    </span>
                  </div>
                  <DiskProgressBar usage={disk.usage} className="mb-2" />
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      {bytesToGB(disk.used)} GB / {bytesToGB(disk.total)} GB
                    </span>
                    <span 
                      className="font-medium"
                      style={{ 
                        color: disk.usage > 90 
                          ? 'var(--color-error)' 
                          : disk.usage > 70 
                            ? 'var(--color-warning)' 
                            : 'var(--color-success)' 
                      }}
                    >
                      {disk.usage.toFixed(1)}%
                    </span>
                  </div>
                  <div 
                    className="space-y-1 pt-2"
                    style={{ borderTop: '0.5px solid var(--border-subtle)' }}
                  >
                    <div 
                      className="flex items-center gap-1.5 text-[10px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Tag className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                      <span className="truncate font-mono" title={`Device: ${devicePath}`}>{devicePath || '-'}</span>
                    </div>
                    {hasPhysicalDisk && (
                      <div 
                        className="flex items-center gap-1.5 text-[10px]"
                        style={{ color: 'var(--accent)' }}
                      >
                        <HardDrive className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                        <span className="truncate font-mono" title={`Physical Disk: ${physicalDiskPath}`}>Physical Disk: {physicalDiskPath}</span>
                      </div>
                    )}
                    {disk.mount_point ? (
                      <div 
                        className="flex items-center gap-1.5 text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <FolderOpen className="w-3 h-3" style={{ color: 'var(--color-warning)' }} />
                        <span className="truncate font-mono" title={`Mount: ${disk.mount_point}`}>{disk.mount_point}</span>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-1.5 text-[10px]"
                        style={{ color: 'var(--color-warning)' }}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>No mount point</span>
                      </div>
                    )}
                    {disk.fs_type && (
                      <div 
                        className="flex items-center gap-1.5 text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Layers className="w-3 h-3" style={{ color: 'var(--color-info)' }} />
                        <span>{disk.fs_type}</span>
                      </div>
                    )}
                    {isUnmounted && (
                      <div 
                        className="mt-2 p-1.5 rounded"
                        style={{ 
                          background: 'var(--color-warning-muted)',
                          border: '0.5px solid rgba(250, 204, 21, 0.2)',
                        }}
                      >
                        <div 
                          className="text-[10px] flex items-start gap-1"
                          style={{ color: 'var(--color-warning)' }}
                        >
                          <Info className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
                          <span>Unmounted or unformatted</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostListItem;