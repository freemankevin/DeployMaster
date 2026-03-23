import OSIcon, { getOSLabel } from '../OSIcon';
import StatusBadge from './StatusBadge';
import DiskProgressBar from './DiskProgressBar';
import ActionMenu from './ActionMenu';
import Checkbox from '../Checkbox';
import { formatMemory, getSystemDisk, getDiskTextColor, formatBytes, bytesToGB } from './types';
import type { HostListItemProps } from './types';

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

  // Build tooltip content: prefer os_pretty_name for complete version info
  // e.g., "Ubuntu 22.04.5 LTS" instead of "Ubuntu (22.04)"
  const osTooltip = host.os_pretty_name ||
    `${getOSLabel(host.os_key, host.system_type)}${host.os_version ? ` (${host.os_version})` : ''}`;

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
        <div className="w-40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span className="text-xs text-gray-600 truncate">{host.name || host.address}</span>
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
        <div className="w-20 px-4 py-3 shrink-0 flex items-center">
          <StatusBadge status={host.status} />
        </div>

        {/* Specs - CPU/RAM */}
        <div className="w-24 px-4 py-3 shrink-0 flex items-center">
          <span className="text-xs text-gray-600">
            {host.cpu_cores ? `${host.cpu_cores}C ` : ''}{formatMemory(host.memory_gb)}
          </span>
        </div>

        {/* Swap - 垂直居中+左对齐 */}
        <div className="w-16 px-4 py-3 shrink-0 flex items-center">
          <span className="text-xs text-gray-500">
            {host.swap_gb ? `${host.swap_gb} GB` : '0'}
          </span>
        </div>

        {/* Arch - 垂直居中+左对齐 */}
        <div className="w-16 px-4 py-3 shrink-0 flex items-center">
          <span className="text-xs text-gray-500 font-mono">{host.architecture || '-'}</span>
        </div>

        {/* Kernel */}
        <div className="w-52 px-4 py-3 shrink-0 flex items-center">
          <div className="flex items-center gap-1.5 group/copy min-w-0">
            <span className="text-xs text-gray-500 font-mono truncate" title={host.kernel_version || ''}>{host.kernel_version || '-'}</span>
            {host.kernel_version && (
              <button
                onClick={() => onCopy(host.kernel_version!, `host-${host.id}-kernel`)}
                className="p-1 rounded transition-all shrink-0 relative opacity-0 group-hover/copy:opacity-100 active:scale-90 flex items-center justify-center"
                title="Copy"
              >
                {copiedField === `host-${host.id}-kernel` ? (
                  <i className="fa-solid fa-check text-xs text-emerald-500"></i>
                ) : (
                  <i className="fa-regular fa-copy text-xs text-gray-400 hover:text-gray-600"></i>
                )}
                {copiedField === `host-${host.id}-kernel` && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 animate-fade-in">
                    <div className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap">
                      Copied!
                    </div>
                    <div className="w-2 h-2 bg-emerald-500 rotate-45 -mt-1"></div>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Operating System - 垂直居中+左对齐，只显示图标 */}
        <div className="w-24 px-4 py-3 shrink-0 flex items-center">
          <OSIcon
            osKey={host.os_key}
            systemType={host.system_type}
            size="sm"
            title={osTooltip}
          />
        </div>

        {/* Main IPv4 Address */}
        <div className="w-40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-1.5 group/copy">
            <span className="text-xs text-gray-600">{host.address}</span>
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

        {/* Disk - Root mount disk first, supports click to expand */}
        <div className="w-48 px-4 py-3 min-w-0">
          {systemDisk ? (
            <div
              className="flex items-center gap-2 cursor-pointer w-full"
              onClick={() => host.disks && host.disks.length > 1 && onToggleExpand()}
            >
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {systemDisk.mount_point === '/' ? 'System' : systemDisk.mount_point}
                  </span>
                  <span className={`text-xs font-medium ${getDiskTextColor(systemDisk.usage)}`}>
                    {systemDisk.usage.toFixed(0)}%
                  </span>
                </div>
                <DiskProgressBar usage={systemDisk.usage} className="w-full" />
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {bytesToGB(systemDisk.used)}G / {bytesToGB(systemDisk.total)}G
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
            <i className="fa-solid fa-terminal w-3.5 h-3.5 shrink-0 text-white"></i>
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
            <i className="fa-solid fa-folder-open w-3.5 h-3.5 shrink-0 text-emerald-500"></i>
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
              <i className="fa-solid fa-ellipsis-vertical w-4 h-4 text-gray-500"></i>
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

      {/* Expanded Disk Details - Shows all disks when expanded */}
      {isExpanded && host.disks && host.disks.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              <i className="fa-solid fa-hard-drive mr-1.5 text-blue-500"></i>
              Disk Details ({host.disks.length})
            </span>
            <button
              onClick={onToggleExpand}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <i className="fa-solid fa-chevron-up text-gray-400"></i>
              Collapse
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {host.disks.map((disk, index) => {
              const isSystemDisk = disk.mount_point === '/';
              const isUnmounted = disk.status === 'unmounted';
              // Check if this is an LVM logical volume (device contains "mapper")
              const isLVM = disk.device?.includes('/mapper/') || disk.device?.startsWith('/dev/mapper');
              // Physical disk path (e.g., "/dev/sda")
              const physicalDiskPath = disk.physical_disk || '';
              // Device path (e.g., "/dev/mapper/data_vg-data_lv" or "/dev/sda1")
              const devicePath = disk.device || '';
              // Check if physical disk differs from device (indicates LVM or partition)
              const hasPhysicalDisk = physicalDiskPath && physicalDiskPath !== devicePath;
              
              return (
                <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <i className={`fa-solid fa-hard-drive w-4 h-4 ${isUnmounted ? 'text-gray-300' : isSystemDisk ? 'text-blue-500' : 'text-amber-500'}`}></i>
                      <span className="text-xs font-medium text-gray-700">
                        {isUnmounted ? 'Unmounted' : isSystemDisk ? 'System' : 'Data'}
                      </span>
                      {/* LVM tag */}
                      {isLVM && (
                        <span className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded font-medium">LVM</span>
                      )}
                    </div>
                    {/* Right corner: show device path */}
                    <span className="text-[10px] text-gray-500 font-mono" title={`Device: ${devicePath}`}>
                      {devicePath || '-'}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <DiskProgressBar usage={disk.usage} className="mb-2" />
                  
                  {/* Usage stats */}
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="text-gray-400">{bytesToGB(disk.used)} GB / {bytesToGB(disk.total)} GB</span>
                    <span className={`font-medium ${getDiskTextColor(disk.usage)}`}>
                      {disk.usage.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Disk details */}
                  <div className="space-y-1 pt-2 border-t border-gray-100">
                    {/* Device name - show full path */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <i className="fa-solid fa-tag w-3 h-3 text-blue-500"></i>
                      <span className="truncate font-mono" title={`Device: ${devicePath}`}>{devicePath || '-'}</span>
                    </div>
                    
                    {/* Physical disk info - always show if available and different from device */}
                    {hasPhysicalDisk && (
                      <div className="flex items-center gap-1.5 text-[10px] text-blue-600">
                        <i className="fa-solid fa-hard-drive w-3 h-3 text-blue-500"></i>
                        <span className="truncate font-mono" title={`Physical Disk: ${physicalDiskPath}`}>
                          Physical Disk: {physicalDiskPath}
                        </span>
                      </div>
                    )}
                    
                    {/* Mount point */}
                    {disk.mount_point ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <i className="fa-solid fa-folder-open w-3 h-3 text-amber-500"></i>
                        <span className="truncate font-mono" title={`Mount: ${disk.mount_point}`}>{disk.mount_point}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
                        <i className="fa-solid fa-triangle-exclamation w-3 h-3"></i>
                        <span>No mount point</span>
                      </div>
                    )}
                    
                    {/* Filesystem type */}
                    {disk.fs_type && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <i className="fa-solid fa-layer-group w-3 h-3 text-purple-500"></i>
                        <span>{disk.fs_type}</span>
                      </div>
                    )}
                    
                    {/* Unmounted warning */}
                    {isUnmounted && (
                      <div className="mt-2 p-1.5 bg-amber-50 rounded border border-amber-100">
                        <div className="text-[10px] text-amber-600 flex items-start gap-1">
                          <i className="fa-solid fa-circle-info w-3 h-3 mt-0.5 shrink-0 text-amber-500"></i>
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
