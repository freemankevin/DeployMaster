import { useState } from 'react';
import OSIcon, { getOSLabel } from '../OSIcon';
import StatusBadge from './StatusBadge';
import DiskProgressBar from './DiskProgressBar';
import { formatMemory, getSystemDisk, getDiskTextColor, bytesToGB } from './types';
import type { HostGridCardProps, DiskInfo } from './types';

export const HostGridCard = ({
  host,
  onOpenTerminal,
  onOpenSFTP
}: HostGridCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const systemDisk = getSystemDisk(host.disks);
  const hasMultipleDisks = (host.disks?.length || 0) > 1;

  // Render a single disk item
  const renderDiskItem = (disk: DiskInfo, isCompact = false) => {
    const isSystemDisk = disk.mount_point === '/';
    const isUnmounted = disk.status === 'unmounted';
    // Use physical_disk for the label (e.g., "sda" from "/dev/sda")
    const diskLabel = (disk.physical_disk || disk.device || '').split('/').pop() || '-';

    if (isCompact) {
      return (
        <div
          key={disk.device}
          className="bg-background-tertiary rounded-lg p-3 border border-border-primary hover:border-macos-gray-2 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <i className={`fa-solid fa-hard-drive w-4 h-4 ${isUnmounted ? 'text-text-tertiary' : isSystemDisk ? 'text-macos-blue' : 'text-text-secondary'}`}></i>
              <span className="text-xs font-medium text-text-secondary">
                {isUnmounted ? 'Unmounted' : isSystemDisk ? 'System' : 'Data'}
              </span>
            </div>
            {/* Show physical disk name */}
            <span className="text-[10px] text-text-tertiary font-mono" title={`Physical: ${disk.physical_disk || disk.device}`}>
              {diskLabel}
            </span>
          </div>
          <DiskProgressBar usage={disk.usage} className="mb-2" />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-tertiary">{bytesToGB(disk.used)} GB / {bytesToGB(disk.total)} GB</span>
            <span className={`font-medium ${getDiskTextColor(disk.usage)}`}>
              {disk.usage.toFixed(1)}%
            </span>
          </div>
          {disk.mount_point && (
            <div className="mt-1.5 text-[10px] text-text-tertiary truncate">
              <i className="fa-solid fa-folder text-[8px] mr-1 text-macos-orange"></i>
              {disk.mount_point}
            </div>
          )}
          {disk.fs_type && (
            <div className="text-[10px] text-text-tertiary truncate">
              <i className="fa-solid fa-database text-[8px] mr-1 text-macos-purple"></i>
              {disk.fs_type}
            </div>
          )}
          {isUnmounted && (
            <div className="mt-1.5 text-[10px] text-macos-orange truncate">
              <i className="fa-solid fa-triangle-exclamation text-[8px] mr-1"></i>
              Unmounted or Unformatted
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="bg-background-secondary rounded-lg border border-border-primary p-4
               hover:border-macos-gray-2 hover:shadow-macos-card transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <OSIcon
            osKey={host.os_key}
            systemType={host.system_type}
            size="md"
            title={host.os_pretty_name || `${getOSLabel(host.os_key, host.system_type)}${host.os_version ? ` (${host.os_version})` : ''}`}
          />
          <div>
            <h3 className="font-medium text-sm text-white">{host.name || host.address}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-text-secondary">{host.address}</span>
              <StatusBadge status={host.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <i className="fa-solid fa-microchip w-3.5 h-3.5 text-macos-blue"></i>
          <span>{host.cpu_cores || '-'} Cores {formatMemory(host.memory_gb)} {host.architecture || ''}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <i className="fa-solid fa-hard-drive w-3.5 h-3.5 text-macos-orange"></i>
          <span>{host.disks?.length || '-'} Disks</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <i className="fa-solid fa-desktop w-3.5 h-3.5 text-macos-purple"></i>
          <span>{getOSLabel(host.os_key, host.system_type)}</span>
        </div>
      </div>

      {/* Disk - Main display */}
      {systemDisk && (
        <div className="mb-3">
          {/* Main disk info - clickable if multiple disks */}
          <div
            className={`p-2 bg-background-tertiary rounded-lg ${hasMultipleDisks ? 'cursor-pointer hover:bg-background-elevated' : ''}`}
            onClick={() => hasMultipleDisks && setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <i className={`fa-solid fa-hard-drive w-3.5 h-3.5 ${systemDisk.mount_point === '/' ? 'text-macos-blue' : 'text-text-secondary'}`}></i>
                <span className="text-xs text-text-secondary">
                  {systemDisk.mount_point === '/' ? 'System Disk' : systemDisk.mount_point}
                </span>
              </div>
              <span className={`text-xs font-medium ${getDiskTextColor(systemDisk.usage)}`}>
                {systemDisk.usage.toFixed(0)}%
              </span>
            </div>
            <DiskProgressBar usage={systemDisk.usage} />
            <div className="flex items-center justify-between text-[10px] text-text-tertiary mt-1">
              <span>{bytesToGB(systemDisk.used)} GB / {bytesToGB(systemDisk.total)} GB</span>
              {/* Show physical disk name */}
              <span className="font-mono text-[10px] text-text-secondary" title={`Physical: ${systemDisk.physical_disk || systemDisk.device}`}>
                {(systemDisk.physical_disk || systemDisk.device || '').split('/').pop()}
              </span>
            </div>
          </div>

          {/* Expanded disk list */}
          {isExpanded && hasMultipleDisks && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">All Disks</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="text-xs text-text-tertiary hover:text-white"
                >
                  <i className="fa-solid fa-chevron-up"></i>
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {host.disks?.map((disk) => renderDiskItem(disk, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onOpenTerminal}
          className="flex-1 py-1.5 bg-macos-blue hover:brightness-110 text-white
                   rounded text-xs font-medium transition-all
                   flex items-center justify-center gap-1
                   shadow-macos-button active:scale-[0.98]"
        >
          <i className="fa-solid fa-terminal w-3.5 h-3.5 text-white"></i>
          Terminal
        </button>
        <button
          onClick={onOpenSFTP}
          className="flex-1 py-1.5 bg-background-tertiary hover:bg-background-elevated text-white
                   rounded text-xs font-medium transition-colors
                   flex items-center justify-center gap-1
                   border border-border-primary"
        >
          <i className="fa-solid fa-folder-open w-3.5 h-3.5 text-macos-green"></i>
          SFTP
        </button>
      </div>
    </div>
  );
};

export default HostGridCard;