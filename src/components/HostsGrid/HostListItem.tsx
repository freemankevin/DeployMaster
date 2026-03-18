import OSIcon, { getOSLabel } from '../OSIcon';
import StatusBadge from './StatusBadge';
import DiskProgressBar from './DiskProgressBar';
import ActionMenu from './ActionMenu';
import Checkbox from '../Checkbox';
import { formatMemory, getSystemDisk, getDiskTextColor } from './types';
import type { HostListItemProps } from './types';

// Determine IP address type (public/private)
const getIPType = (ip: string): 'public' | 'private' => {
  // Remove port number if present
  const cleanIp = ip.split(':')[0];

  // Check if it's IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleanIp.match(ipv4Regex);

  if (!match) {
    // If not IPv4, assume public (IPv6 or others)
    return 'public';
  }

  const [, a, b, c, d] = match.map(Number);

  // Check if it's private IP
  // 10.0.0.0/8
  if (a === 10) return 'private';
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return 'private';
  // 192.168.0.0/16
  if (a === 192 && b === 168) return 'private';
  // 127.0.0.0/8 (loopback)
  if (a === 127) return 'private';
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return 'private';

  return 'public';
};

export const HostListItem = ({
  host,
  isExpanded,
  isMenuOpen,
  isRefreshing,
  copiedField,
  isSelected,
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
  const systemDisk = getSystemDisk(host.disks);

  // Build tooltip content: system name + version
  const osTooltip = `${getOSLabel(host.os_key, host.system_type)}${host.os_version ? ` (${host.os_version})` : ''}`;

  // Determine IP type
  const ipType = getIPType(host.address);
  const ipTypeLabel = ipType === 'public' ? 'Pub' : 'Priv';

  return (
    <div className="group">
      {/* Main row - adjusted column layout per Tencent Cloud style, added checkbox column */}
      <div className="flex items-center hover:bg-gray-50 transition-colors">
        {/* Checkbox column - compressed width */}
        <div className="w-9 pl-4 pr-2 py-3 flex items-center justify-center shrink-0">
          <Checkbox
            checked={isSelected}
            onChange={onSelect}
          />
        </div>
        {/* Host ID */}
        <div className="w-36 px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5 group/copy">
            <span className="text-xs text-gray-500 truncate">{host.host_id}</span>
            <button
              onClick={() => onCopy(host.host_id, `host-${host.id}-id`)}
              className="p-1 rounded transition-all relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-id` ? (
                <i className="fa-solid fa-check text-xs text-emerald-500"></i>
              ) : (
                <i className="fa-regular fa-copy text-xs text-gray-400 hover:text-gray-600"></i>
              )}
              {copiedField === `host-${host.id}-id` && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-fade-in">
                  <div className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap">
                    Copied!
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rotate-45 -mt-1"></div>
                </div>
              )}
            </button>
          </div>
        </div>
        {/* Host Name */}
        <div className="w-48 px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span className="font-medium text-sm text-gray-900 truncate">{host.name || host.address}</span>
            <button
              onClick={() => onCopy(host.name || host.address, `host-${host.id}-name`)}
              className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-name` ? (
                <i className="fa-solid fa-check text-xs text-emerald-500"></i>
              ) : (
                <i className="fa-regular fa-copy text-xs text-gray-400 hover:text-gray-600"></i>
              )}
              {copiedField === `host-${host.id}-name` && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-fade-in">
                  <div className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap">
                    Copied!
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rotate-45 -mt-1"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="w-20 px-4 py-3 shrink-0">
          <StatusBadge status={host.status} />
        </div>

        {/* Instance Config */}
        <div className="w-32 px-4 py-3 shrink-0">
          <div className="text-xs text-gray-600">
            {host.cpu_cores ? `${host.cpu_cores}C ` : ''}
            {formatMemory(host.memory_gb)}
            {host.architecture ? ` ${host.architecture}` : ''}
          </div>
        </div>

        {/* Operating System - only show icon, hover for details */}
        <div className="w-24 px-4 py-3 shrink-0">
          <div className="flex items-center justify-center">
            <div
              className="flex items-center justify-center cursor-pointer"
              title={osTooltip}
            >
              <OSIcon
                osKey={host.os_key}
                systemType={host.system_type}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Main IPv4 Address - auto-detect public/private */}
        <div className="w-40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5 group/copy">
            <span className="text-xs text-gray-400 shrink-0">{ipTypeLabel}:</span>
            <span className="text-xs text-gray-600 truncate">{host.address}</span>
            <button
              onClick={() => onCopy(host.address, `host-${host.id}-ip`)}
              className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
              title="Copy"
            >
              {copiedField === `host-${host.id}-ip` ? (
                <i className="fa-solid fa-check text-xs text-emerald-500"></i>
              ) : (
                <i className="fa-regular fa-copy text-xs text-gray-400 hover:text-gray-600"></i>
              )}
              {copiedField === `host-${host.id}-ip` && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-fade-in">
                  <div className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap">
                    Copied!
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rotate-45 -mt-1"></div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Disk - System Disk: xxx GB, supports click to expand */}
        <div className="w-48 px-4 py-3 min-w-0">
          {systemDisk ? (
            <div
              className="flex items-center gap-2 cursor-pointer w-full"
              onClick={() => host.disks && host.disks.length > 1 && onToggleExpand()}
            >
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">System Disk</span>
                  <span className={`text-xs font-medium ${getDiskTextColor(systemDisk.usage)}`}>
                    {systemDisk.usage.toFixed(0)}%
                  </span>
                </div>
                <DiskProgressBar usage={systemDisk.usage} className="w-full" />
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {systemDisk.total}GB
                </div>
              </div>
              {host.disks && host.disks.length > 1 && (
                <i className={`fa-solid fa-chevron-right w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}></i>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>

        {/* Actions - macOS style button group */}
        <div className="w-auto px-4 py-3 flex items-center gap-2 justify-start shrink-0">
          {/* Terminal button - macOS style primary button */}
          <button
            onClick={onOpenTerminal}
            className="px-3 py-1.5 bg-macos-blue text-white
                     rounded-lg text-xs font-medium
                     transition-all duration-200 ease-macos
                     shadow-[0_0.5px_1px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                     hover:brightness-110 hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_3px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.3)]
                     active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.2)] active:scale-[0.97]
                     flex items-center gap-1.5 whitespace-nowrap"
          >
            <i className="fa-solid fa-terminal w-3.5 h-3.5 shrink-0"></i>
            <span>Terminal</span>
          </button>
          
          {/* SFTP button - macOS style secondary button */}
          <button
            onClick={onOpenSFTP}
            className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200/80
                     rounded-lg text-xs font-medium
                     transition-all duration-200 ease-macos
                     shadow-[0_0.5px_1px_rgba(0,0,0,0.04)]
                     hover:bg-gray-50/80 hover:border-gray-300
                     active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.08)] active:scale-[0.97]
                     flex items-center gap-1.5 whitespace-nowrap"
          >
            <i className="fa-solid fa-folder-open w-3.5 h-3.5 shrink-0 text-gray-500"></i>
            <span>SFTP</span>
          </button>

          {/* More Actions - macOS style icon button */}
          <div className={`relative ${isMenuOpen ? 'z-50' : ''}`}>
            <button
              onClick={onToggleMenu}
              className="flex items-center justify-center w-7 h-7
                       bg-white border border-gray-200/60 rounded-lg
                       hover:border-gray-300 hover:bg-gray-50/80
                       text-gray-500 transition-all duration-200 ease-macos
                       shadow-[0_0.5px_1px_rgba(0,0,0,0.04)]
                       active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.08)] active:scale-[0.97]"
            >
              <i className="fa-solid fa-ellipsis-vertical w-4 h-4"></i>
            </button>

            <ActionMenu
              isOpen={isMenuOpen}
              isRefreshing={isRefreshing}
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

      {/* Expanded Disk Details */}
      {isExpanded && host.disks && host.disks.length > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-4 gap-3">
            {host.disks.map((disk, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <i className={`fa-solid fa-hard-drive w-4 h-4 ${disk.mount_point === '/' ? 'text-blue-500' : 'text-gray-400'}`}></i>
                    <span className="text-xs font-medium text-gray-700">
                      {disk.mount_point === '/' ? 'System Disk' : disk.mount_point || disk.device}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {disk.device.split('/').pop()}
                  </span>
                </div>
                <DiskProgressBar usage={disk.usage} className="mb-2" />
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">{disk.used}G / {disk.total}G</span>
                  <span className={`font-medium ${getDiskTextColor(disk.usage)}`}>
                    {disk.usage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostListItem;
