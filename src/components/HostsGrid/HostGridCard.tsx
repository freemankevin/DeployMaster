import { useState } from 'react';
import {
  HardDrive,
  Folder,
  Database,
  AlertTriangle,
  Cpu,
  Monitor,
  ChevronUp,
  Terminal,
  FolderOpen,
} from 'lucide-react';
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
    const diskLabel = (disk.physical_disk || disk.device || '').split('/').pop() || '-';

    if (isCompact) {
      return (
        <div
          key={disk.device}
          className="rounded-lg p-3 transition-colors"
          style={{
            background: 'var(--bg-overlay)',
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
                      : 'var(--text-secondary)' 
                }} 
              />
              <span 
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isUnmounted ? 'Unmounted' : isSystemDisk ? 'System' : 'Data'}
              </span>
            </div>
            <span 
              className="text-[10px] font-mono"
              style={{ color: 'var(--text-tertiary)' }}
              title={`Physical: ${disk.physical_disk || disk.device}`}
            >
              {diskLabel}
            </span>
          </div>
          <DiskProgressBar usage={disk.usage} className="mb-2" />
          <div className="flex items-center justify-between text-[10px]">
            <span style={{ color: 'var(--text-tertiary)' }}>
              {bytesToGB(disk.used)} GB / {bytesToGB(disk.total)} GB
            </span>
            <span className="font-medium" style={{ color: getDiskTextColor(disk.usage).includes('success') ? 'var(--color-success)' : getDiskTextColor(disk.usage).includes('warning') ? 'var(--color-warning)' : getDiskTextColor(disk.usage).includes('error') ? 'var(--color-error)' : 'var(--text-primary)' }}>
              {disk.usage.toFixed(1)}%
            </span>
          </div>
          {disk.mount_point && (
            <div 
              className="mt-1.5 text-[10px] truncate flex items-center gap-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Folder className="w-3 h-3" style={{ color: 'var(--color-warning)' }} />
              {disk.mount_point}
            </div>
          )}
          {disk.fs_type && (
            <div 
              className="text-[10px] truncate flex items-center gap-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Database className="w-3 h-3" style={{ color: 'var(--accent)' }} />
              {disk.fs_type}
            </div>
          )}
          {isUnmounted && (
            <div 
              className="mt-1.5 text-[10px] truncate flex items-center gap-1"
              style={{ color: 'var(--color-warning)' }}
            >
              <AlertTriangle className="w-3 h-3" />
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
      className="rounded-lg p-4 transition-all duration-300"
      style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
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
            <h3 
              className="font-medium text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              {host.name || host.address}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span 
                className="text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {host.address}
              </span>
              <StatusBadge status={host.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div 
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <span>{host.cpu_cores || '-'} Cores {formatMemory(host.memory_gb)} {host.architecture || ''}</span>
        </div>
        <div 
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <HardDrive className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
          <span>{host.disks?.length || '-'} Disks</span>
        </div>
        <div 
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Monitor className="w-3.5 h-3.5" style={{ color: 'var(--color-info)' }} />
          <span>{getOSLabel(host.os_key, host.system_type)}</span>
        </div>
      </div>

      {/* Disk - Main display */}
      {systemDisk && (
        <div className="mb-3">
          <div
            className="p-2.5 rounded-lg transition-colors"
            style={{
              background: 'var(--bg-overlay)',
              border: '0.5px solid var(--border-subtle)',
              cursor: hasMultipleDisks ? 'pointer' : 'default',
            }}
            onClick={() => hasMultipleDisks && setIsExpanded(!isExpanded)}
            onMouseEnter={(e) => {
              if (hasMultipleDisks) {
                e.currentTarget.style.background = 'var(--bg-elevated)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }
            }}
            onMouseLeave={(e) => {
              if (hasMultipleDisks) {
                e.currentTarget.style.background = 'var(--bg-overlay)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <HardDrive 
                  className="w-3.5 h-3.5" 
                  style={{ 
                    color: systemDisk.mount_point === '/' 
                      ? 'var(--accent)' 
                      : 'var(--text-secondary)' 
                  }} 
                />
                <span 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {systemDisk.mount_point === '/' ? 'System Disk' : systemDisk.mount_point}
                </span>
              </div>
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
            <DiskProgressBar usage={systemDisk.usage} />
            <div 
              className="flex items-center justify-between text-[10px] mt-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <span>{bytesToGB(systemDisk.used)} GB / {bytesToGB(systemDisk.total)} GB</span>
              <span 
                className="font-mono text-[10px]"
                style={{ color: 'var(--text-secondary)' }}
                title={`Physical: ${systemDisk.physical_disk || systemDisk.device}`}
              >
                {(systemDisk.physical_disk || systemDisk.device || '').split('/').pop()}
              </span>
            </div>
          </div>

          {/* Expanded disk list */}
          {isExpanded && hasMultipleDisks && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span 
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  All Disks
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {host.disks?.map((disk) => renderDiskItem(disk, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions - Railway style buttons */}
      <div className="flex gap-2">
        <button
          onClick={onOpenTerminal}
          className="flex-1 py-2 text-white rounded-md text-xs font-medium transition-all duration-150
                   flex items-center justify-center gap-1.5"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
        >
          <Terminal className="w-3.5 h-3.5" />
          Terminal
        </button>
        <button
          onClick={onOpenSFTP}
          className="flex-1 py-2 rounded-md text-xs font-medium transition-all duration-150
                   flex items-center justify-center gap-1.5"
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
          <FolderOpen className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
          SFTP
        </button>
      </div>
    </div>
  );
};

export default HostGridCard;