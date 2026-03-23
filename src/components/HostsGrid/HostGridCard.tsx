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
          className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <i className={`fa-solid fa-hard-drive w-4 h-4 ${isUnmounted ? 'text-gray-300' : isSystemDisk ? 'text-blue-500' : 'text-gray-400'}`}></i>
              <span className="text-xs font-medium text-gray-700">
                {isUnmounted ? 'Unmounted' : isSystemDisk ? 'System' : 'Data'}
              </span>
            </div>
            {/* Show physical disk name */}
            <span className="text-[10px] text-gray-500 font-mono" title={`Physical: ${disk.physical_disk || disk.device}`}>
              {diskLabel}
            </span>
          </div>
          <DiskProgressBar usage={disk.usage} className="mb-2" />
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">{bytesToGB(disk.used)} GB / {bytesToGB(disk.total)} GB</span>
            <span className={`font-medium ${getDiskTextColor(disk.usage)}`}>
              {disk.usage.toFixed(1)}%
            </span>
          </div>
          {disk.mount_point && (
            <div className="mt-1.5 text-[10px] text-gray-400 truncate">
              <i className="fa-solid fa-folder text-[8px] mr-1 text-amber-500"></i>
              {disk.mount_point}
            </div>
          )}
          {disk.fs_type && (
            <div className="text-[10px] text-gray-400 truncate">
              <i className="fa-solid fa-database text-[8px] mr-1 text-purple-500"></i>
              {disk.fs_type}
            </div>
          )}
          {isUnmounted && (
            <div className="mt-1.5 text-[10px] text-amber-500 truncate">
              <i className="fa-solid fa-triangle-exclamation text-[8px] mr-1"></i>
              Unmounted or unformatted
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4
               hover:border-gray-300 hover:shadow-sm transition-all"
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
            <h3 className="font-medium text-sm text-gray-900">{host.name || host.address}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-500">{host.address}</span>
              <StatusBadge status={host.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <i className="fa-solid fa-microchip w-3.5 h-3.5 text-blue-500"></i>
          <span>{host.cpu_cores || '-'} Cores {formatMemory(host.memory_gb)} {host.architecture || ''}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <i className="fa-solid fa-hard-drive w-3.5 h-3.5 text-amber-500"></i>
          <span>{host.disks?.length || '-'} Disks</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <i className="fa-solid fa-desktop w-3.5 h-3.5 text-purple-500"></i>
          <span>{getOSLabel(host.os_key, host.system_type)}</span>
        </div>
      </div>

      {/* Disk - Main display */}
      {systemDisk && (
        <div className="mb-3">
          {/* Main disk info - clickable if multiple disks */}
          <div
            className={`p-2 bg-gray-50 rounded-lg ${hasMultipleDisks ? 'cursor-pointer hover:bg-gray-100' : ''}`}
            onClick={() => hasMultipleDisks && setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <i className={`fa-solid fa-hard-drive w-3.5 h-3.5 ${systemDisk.mount_point === '/' ? 'text-blue-500' : 'text-gray-400'}`}></i>
                <span className="text-xs text-gray-500">
                  {systemDisk.mount_point === '/' ? 'System' : systemDisk.mount_point}
                </span>
              </div>
              <span className={`text-xs font-medium ${getDiskTextColor(systemDisk.usage)}`}>
                {systemDisk.usage.toFixed(0)}%
              </span>
            </div>
            <DiskProgressBar usage={systemDisk.usage} />
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
              <span>{bytesToGB(systemDisk.used)} GB / {bytesToGB(systemDisk.total)} GB</span>
              {/* Show physical disk name */}
              <span className="font-mono text-[10px] text-gray-500" title={`Physical: ${systemDisk.physical_disk || systemDisk.device}`}>
                {(systemDisk.physical_disk || systemDisk.device || '').split('/').pop()}
              </span>
            </div>
          </div>

          {/* Expanded disk list */}
          {isExpanded && hasMultipleDisks && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">All Disks</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
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
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white
                   rounded text-xs font-medium transition-colors
                   flex items-center justify-center gap-1"
        >
          <i className="fa-solid fa-terminal w-3.5 h-3.5 text-white"></i>
          Terminal
        </button>
        <button
          onClick={onOpenSFTP}
          className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                   rounded text-xs font-medium transition-colors
                   flex items-center justify-center gap-1"
        >
          <i className="fa-solid fa-folder-open w-3.5 h-3.5 text-emerald-500"></i>
          SFTP
        </button>
      </div>
    </div>
  );
};

export default HostGridCard;
