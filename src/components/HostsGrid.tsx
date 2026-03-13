import { useState } from 'react';
import {
  Terminal,
  HardDrive,
  Plug,
  Pencil,
  Trash2,
  Copy,
  MoreVertical,
  Server,
  CheckCircle2,
  Cpu,
  MemoryStick,
  Key,
  Check,
  Plus
} from 'lucide-react';
import type { SSHHost } from '@/types';
import OSIcon, { getOSLabel } from './OSIcon';

interface HostsGridProps {
  hosts: SSHHost[];
  loading: boolean;
  onEdit: (host: SSHHost) => void;
  onDelete: (id: number) => void;
  onTestConnection: (id: number) => void;
  onOpenTerminal: (host: SSHHost) => void;
  onOpenSFTP?: (host: SSHHost) => void;
  onAddHost: () => void;
  onCopyHost?: (host: SSHHost) => void;
}

const HostsGrid = ({
  hosts,
  loading,
  onEdit,
  onDelete,
  onTestConnection,
  onOpenTerminal,
  onOpenSFTP,
  onAddHost,
  onCopyHost
}: HostsGridProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  // 获取状态样式 - Mac 风格
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          dot: 'bg-emerald-500',
          glow: 'shadow-emerald-500/20',
          label: '运行中',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          border: 'border-emerald-200'
        };
      case 'warning':
        return {
          dot: 'bg-amber-500',
          glow: 'shadow-amber-500/20',
          label: '警告',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          border: 'border-amber-200'
        };
      default:
        return {
          dot: 'bg-gray-400',
          glow: 'shadow-gray-400/20',
          label: '已停止',
          badge: 'bg-gray-100 text-gray-600 border-gray-200',
          border: 'border-gray-200'
        };
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 格式化内存显示
  const formatMemory = (memoryGb?: number) => {
    if (!memoryGb || memoryGb === 0) return '-';
    if (memoryGb >= 1) {
      return `${memoryGb.toFixed(1)} GB`;
    } else {
      return `${(memoryGb * 1024).toFixed(0)} MB`;
    }
  };

  // 格式化磁盘显示
  const formatDisk = (used?: number, total?: number) => {
    if (!total || total === 0) return '-';
    return `${used?.toFixed(0) || '0'}/${total.toFixed(0)}G`;
  };

  // 获取要展示的磁盘信息 - 优先数据盘，并显示设备名
  const getDiskDisplay = (host: SSHHost) => {
    // 优先显示数据盘
    if (host.data_disk_total && host.data_disk_total > 0) {
      // 显示数据盘设备名（如 sdb1）
      const diskName = host.data_disk_name || '数据盘';
      return {
        label: diskName,
        value: formatDisk(host.data_disk_used, host.data_disk_total)
      };
    }
    // 无数据盘则显示系统盘
    if (host.system_disk_total && host.system_disk_total > 0) {
      return {
        label: '系统盘',
        value: formatDisk(host.system_disk_used, host.system_disk_total)
      };
    }
    return { label: '磁盘', value: '-' };
  };

  // 处理复制主机
  const handleCopyHost = (host: SSHHost) => {
    if (onCopyHost) {
      onCopyHost(host);
    }
    setActiveMenu(null);
  };

  // 关闭菜单
  const handleClickOutside = () => {
    setActiveMenu(null);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-white border border-gray-200 p-5 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg w-24 mb-2" />
                  <div className="h-3 bg-gray-200 rounded-lg w-32" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded-lg w-full" />
              <div className="h-3 bg-gray-200 rounded-lg w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Stats Bar - Mac 风格 */}
      <div className="flex items-center gap-6 mb-6 px-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-500" />
          <span className="text-[13px] text-gray-500">总主机</span>
          <span className="text-[13px] font-semibold text-gray-900">{hosts.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-[13px] text-gray-500">在线</span>
          <span className="text-[13px] font-semibold text-emerald-600">
            {hosts.filter(h => h.status === 'connected').length}
          </span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-600" />
          <span className="text-[13px] text-gray-500">密钥认证</span>
          <span className="text-[13px] font-semibold text-purple-600">
            {hosts.filter(h => h.auth_type === 'key').length}
          </span>
        </div>
      </div>

      {/* Host Cards Grid - Mac Light Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {hosts.map((host) => {
          const statusConfig = getStatusConfig(host.status);
          const diskInfo = getDiskDisplay(host);

          return (
            <div
              key={host.id}
              className={`
                group relative rounded-2xl overflow-hidden
                bg-white
                border border-gray-200
                shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]
                hover:border-gray-300
                transition-all duration-300
                ${statusConfig.glow}
              `}
            >
              {/* Status Glow Effect */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${statusConfig.dot} opacity-5 blur-[60px] rounded-full`} />
              
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* OS Icon */}
                    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 
                                  flex items-center justify-center flex-shrink-0">
                      <OSIcon
                        osKey={host.os_key}
                        systemType={host.system_type}
                        size="md"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[14px] text-gray-900 truncate">
                          {host.name || host.address}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[12px] text-gray-500 font-mono">{host.address}</span>
                        <button
                          onClick={() => copyToClipboard(host.address, `host-${host.id}-ip`)}
                          className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 
                                   opacity-0 group-hover:opacity-100 transition-opacity"
                          title="复制IP"
                        >
                          {copiedField === `host-${host.id}-ip` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status & Menu */}
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] 
                                    font-medium border ${statusConfig.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
                      {statusConfig.label}
                    </span>
                    
                    {/* More Actions */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === host.id ? null : host.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown Menu - Mac Style */}
                      {activeMenu === host.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={handleClickOutside} />
                          <div className="absolute right-0 top-full mt-1 w-40 
                                        bg-white
                                        rounded-xl border border-gray-200 
                                        shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-20 py-1.5">
                            <button
                              onClick={() => { onEdit(host); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-[13px] text-gray-700 
                                       hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              编辑
                            </button>
                            <button
                              onClick={() => handleCopyHost(host)}
                              className="w-full px-3 py-2 text-left text-[13px] text-gray-700 
                                       hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              复制
                            </button>
                            <button
                              onClick={() => { onTestConnection(host.id); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-[13px] text-gray-700 
                                       hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Plug className="w-3.5 h-3.5" />
                              测试连接
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => { onDelete(host.id); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-[13px] text-red-600 
                                       hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body - Specs */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  {/* CPU */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                      <Cpu className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">CPU</div>
                      <div className="text-[12px] font-medium text-gray-900">
                        {host.cpu_cores && host.cpu_cores > 0 ? `${host.cpu_cores} 核` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Memory */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                      <MemoryStick className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">内存</div>
                      <div className="text-[12px] font-medium text-gray-900">
                        {formatMemory(host.memory_gb)}
                      </div>
                    </div>
                  </div>

                  {/* Disk - 优先数据盘 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                      <HardDrive className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">{diskInfo.label}</div>
                      <div className="text-[12px] font-medium text-gray-900">
                        {diskInfo.value}
                      </div>
                    </div>
                  </div>

                  {/* Architecture - 替代认证方式 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-100">
                      <Cpu className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">架构</div>
                      <div className="text-[12px] font-medium text-gray-900">
                        {host.architecture || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OS Info */}
                {host.system_type && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-400">操作系统</span>
                      <div className="flex items-center gap-2">
                        <OSIcon osKey={host.os_key} systemType={host.system_type} size="sm" />
                        <span className="text-gray-700">{getOSLabel(host.os_key, host.system_type)}</span>
                      </div>
                    </div>
                    {host.os_version && (
                      <div className="flex items-center justify-between text-[12px] mt-2">
                        <span className="text-gray-400">版本</span>
                        <span className="text-gray-700 font-mono text-[11px]">{host.os_version}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer - Actions */}
              <div className="px-5 pb-5">
                <div className="flex gap-3">
                  <button
                    onClick={() => onOpenTerminal(host)}
                    className="flex-1 py-2.5 px-4 
                             bg-blue-600 hover:bg-blue-700
                             text-white rounded-xl text-[12px] font-medium 
                             transition-all duration-200 
                             flex items-center justify-center gap-2
                             border border-blue-600
                             shadow-[0_4px_12px_rgba(59,130,246,0.2)]
                             hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)]"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    终端
                  </button>
                  <button
                    onClick={() => {
                      console.log('[HostsGrid] SFTP button clicked, host:', host);
                      console.log('[HostsGrid] onOpenSFTP exists:', !!onOpenSFTP);
                      if (onOpenSFTP) {
                        onOpenSFTP(host);
                      }
                    }}
                    disabled={!onOpenSFTP}
                    className="flex-1 py-2.5 px-4
                             bg-gray-100 hover:bg-gray-200
                             text-gray-700 rounded-xl text-[12px] font-medium
                             transition-all duration-200
                             flex items-center justify-center gap-2
                             border border-gray-200
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    SFTP
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Host Card - Mac Style */}
        <button
          onClick={onAddHost}
          className="rounded-2xl border border-dashed border-gray-300 
                   hover:border-gray-400 hover:bg-gray-50
                   transition-all duration-300
                   min-h-[320px] flex flex-col items-center justify-center gap-4 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-gray-200 
                        flex items-center justify-center transition-all duration-300
                        border border-gray-200 group-hover:border-gray-300
                        shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <Plus className="w-7 h-7 text-gray-500 group-hover:text-gray-700 transition-colors" />
          </div>
          <div className="text-center">
            <div className="text-[15px] font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              添加主机
            </div>
            <div className="text-[12px] text-gray-400 mt-1">
              支持密码或密钥认证
            </div>
          </div>
        </button>
      </div>
    </>
  );
};

export default HostsGrid;
