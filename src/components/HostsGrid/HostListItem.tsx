import { useRef } from 'react';
import OSIcon, { getOSLabel } from '../OSIcon';
import StatusBadge from './StatusBadge';
import DiskProgressBar from './DiskProgressBar';
import ActionMenu from './ActionMenu';
import Checkbox from '../Checkbox';
import { formatMemory, getSystemDisk, getDiskTextColor, formatBytes, bytesToGB } from './types';
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
      <div className="flex items-center hover:bg-background-tertiary/50 transition-colors">
        <div className="flex items-center justify-center shrink-0" style={{ width: widths.checkbox, padding: '12px 8px 12px 12px' }}>
          <Checkbox checked={isSelected} onChange={onSelect} />
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.id, padding: '12px' }}>
          <span className="text-xs text-text-primary truncate">{host.host_id}</span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.hostName, padding: '12px' }}>
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span className="text-xs text-text-primary truncate">{host.name || host.address}</span>
            <button
              onClick={() => onCopy(host.name || host.address, `host-${host.id}-name`)}
              className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-name` ? (
                <i className="fa-solid fa-check text-xs text-macos-green"></i>
              ) : (
                <i className="fa-regular fa-copy text-xs text-text-tertiary hover:text-white"></i>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.status, padding: '12px' }}>
          <StatusBadge status={host.status} />
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.specs, padding: '12px' }}>
          <span className="text-xs text-text-primary whitespace-nowrap">
            {host.cpu_cores ? `${host.cpu_cores}C ` : ''}{formatMemory(host.memory_gb)}
          </span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.swap, padding: '12px' }}>
          <span className="text-xs text-text-primary">{formatMemory(host.swap_gb) || '0'}</span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.arch, padding: '12px' }}>
          <span className="text-xs text-text-primary font-mono">{host.architecture || '-'}</span>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.kernel, padding: '12px' }}>
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span className="text-xs text-text-primary font-mono truncate" title={host.kernel_version || ''}>{host.kernel_version || '-'}</span>
            {host.kernel_version && (
              <button
                onClick={() => onCopy(host.kernel_version!, `host-${host.id}-kernel`)}
                className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
                title="Copy"
              >
                {copiedField === `host-${host.id}-kernel` ? (
                  <i className="fa-solid fa-check text-xs text-macos-green"></i>
                ) : (
                  <i className="fa-regular fa-copy text-xs text-text-tertiary hover:text-white"></i>
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
            <span className="text-xs text-text-primary">{host.address}</span>
            <button
              onClick={() => onCopy(host.address, `host-${host.id}-ip`)}
              className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-ip` ? (
                <i className="fa-solid fa-check text-xs text-macos-green"></i>
              ) : (
                <i className="fa-regular fa-copy text-xs text-text-tertiary hover:text-white"></i>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center shrink-0 overflow-hidden" style={{ width: widths.disk, padding: '12px' }}>
          {systemDisk ? (
            <div className="flex items-center gap-2 cursor-pointer w-full" onClick={() => host.disks && host.disks.length > 1 && onToggleExpand()}>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-primary">{systemDisk.mount_point === '/' ? 'System Disk' : systemDisk.mount_point}</span>
                  <span className={`text-xs font-medium ${getDiskTextColor(systemDisk.usage)}`}>{systemDisk.usage.toFixed(0)}%</span>
                </div>
                <DiskProgressBar usage={systemDisk.usage} className="w-full" />
                <div className="text-[10px] text-text-secondary mt-0.5">{bytesToGB(systemDisk.used)}G / {bytesToGB(systemDisk.total)}G</div>
              </div>
              {host.disks && host.disks.length > 1 && (
                <i className={`fa-solid fa-chevron-right w-4 h-4 text-text-tertiary transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}></i>
              )}
            </div>
          ) : (
            <span className="text-xs text-text-tertiary">-</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0" style={{ width: widths.actions, padding: '12px' }}>
          <button
            onClick={onOpenTerminal}
            className="px-2.5 py-1.5 bg-macos-blue text-white rounded-lg text-xs font-medium transition-all duration-200 ease-macos shadow-macos-button hover:brightness-110 hover:shadow-glow-blue active:shadow-macos-button-active active:scale-[0.97] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <i className="fa-solid fa-terminal text-xs shrink-0 text-white"></i>
            <span>Terminal</span>
          </button>
          <button
            onClick={onOpenSFTP}
            className="px-2.5 py-1.5 bg-background-tertiary text-white border border-border-primary rounded-lg text-xs font-medium transition-all duration-200 ease-macos shadow-macos-button hover:bg-background-elevated hover:border-macos-gray-2 active:shadow-macos-button-active active:scale-[0.97] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <i className="fa-solid fa-folder-open text-xs shrink-0 text-macos-green"></i>
            <span>SFTP</span>
          </button>
          <div className={`relative shrink-0 ${isMenuOpen ? 'z-50' : ''}`}>
            <button
              ref={menuButtonRef}
              onClick={onToggleMenu}
              className="flex items-center justify-center w-7 h-7 bg-background-tertiary border border-border-primary rounded-lg hover:border-macos-gray-2 hover:bg-background-elevated text-text-secondary transition-all duration-200 ease-macos shadow-macos-button active:shadow-macos-button-active active:scale-[0.97] shrink-0"
            >
              <i className="fa-solid fa-ellipsis-vertical text-xs text-text-secondary"></i>
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
        <div className="px-4 py-3 bg-background-tertiary/30 border-t border-border-secondary">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">
              <i className="fa-solid fa-hard-drive mr-1.5 text-macos-blue"></i>
              Disk Details ({host.disks.length})
            </span>
            <button onClick={onToggleExpand} className="text-xs text-text-tertiary hover:text-white flex items-center gap-1">
              <i className="fa-solid fa-chevron-up text-text-tertiary"></i>
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
                <div key={index} className="bg-background-secondary rounded-lg p-3 border border-border-primary hover:border-macos-gray-2 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <i className={`fa-solid fa-hard-drive w-4 h-4 ${isUnmounted ? 'text-text-tertiary' : isSystemDisk ? 'text-macos-blue' : 'text-macos-orange'}`}></i>
                      <span className="text-xs font-medium text-text-secondary">{isUnmounted ? 'Unmounted' : isSystemDisk ? 'System Disk' : 'Data Disk'}</span>
                      {isLVM && <span className="text-[9px] px-1 py-0.5 bg-macos-purple/20 text-macos-purple rounded font-medium">LVM</span>}
                    </div>
                    <span className="text-[10px] text-text-tertiary font-mono" title={`Device: ${devicePath}`}>{devicePath || '-'}</span>
                  </div>
                  <DiskProgressBar usage={disk.usage} className="mb-2" />
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="text-text-tertiary">{bytesToGB(disk.used)} GB / {bytesToGB(disk.total)} GB</span>
                    <span className={`font-medium ${getDiskTextColor(disk.usage)}`}>{disk.usage.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-border-secondary">
                    <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                      <i className="fa-solid fa-tag w-3 h-3 text-macos-blue"></i>
                      <span className="truncate font-mono" title={`Device: ${devicePath}`}>{devicePath || '-'}</span>
                    </div>
                    {hasPhysicalDisk && (
                      <div className="flex items-center gap-1.5 text-[10px] text-macos-blue">
                        <i className="fa-solid fa-hard-drive w-3 h-3 text-macos-blue"></i>
                        <span className="truncate font-mono" title={`Physical Disk: ${physicalDiskPath}`}>Physical Disk: {physicalDiskPath}</span>
                      </div>
                    )}
                    {disk.mount_point ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                        <i className="fa-solid fa-folder-open w-3 h-3 text-macos-orange"></i>
                        <span className="truncate font-mono" title={`Mount: ${disk.mount_point}`}>{disk.mount_point}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-macos-orange">
                        <i className="fa-solid fa-triangle-exclamation w-3 h-3"></i>
                        <span>No Mount Point</span>
                      </div>
                    )}
                    {disk.fs_type && (
                      <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                        <i className="fa-solid fa-layer-group w-3 h-3 text-macos-purple"></i>
                        <span>{disk.fs_type}</span>
                      </div>
                    )}
                    {isUnmounted && (
                      <div className="mt-2 p-1.5 bg-macos-orange/10 rounded border border-macos-orange/20">
                        <div className="text-[10px] text-macos-orange flex items-start gap-1">
                          <i className="fa-solid fa-circle-info w-3 h-3 mt-0.5 shrink-0 text-macos-orange"></i>
                          <span>Unmounted or Unformatted</span>
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
