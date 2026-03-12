import { useState } from 'react';
import {
  Terminal,
  FolderOpen,
  Plug,
  Pencil,
  Trash2,
  Copy,
  MoreVertical,
  Server,
  CheckCircle2,
  Cpu,
  HardDrive,
  MemoryStick,
  Key,
  Lock,
  Check,
  Plus,
  Power,
  RefreshCw
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

  // 获取状态样式
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          dot: 'bg-emerald-500',
          label: '运行中',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          border: 'hover:border-emerald-300'
        };
      case 'warning':
        return {
          dot: 'bg-amber-500',
          label: '警告',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          border: 'hover:border-amber-300'
        };
      default:
        return {
          dot: 'bg-gray-400',
          label: '已停止',
          badge: 'bg-gray-50 text-gray-600 border-gray-200',
          border: 'hover:border-gray-300'
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div>
                  <div className="h-4 bg-gray-100 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-5 px-1">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] text-gray-600">总主机</span>
          <span className="text-[13px] font-semibold text-gray-900">{hosts.length}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-[13px] text-gray-600">在线</span>
          <span className="text-[13px] font-semibold text-emerald-600">
            {hosts.filter(h => h.status === 'connected').length}
          </span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-500" />
          <span className="text-[13px] text-gray-600">密钥认证</span>
          <span className="text-[13px] font-semibold text-purple-600">
            {hosts.filter(h => h.auth_type === 'key').length}
          </span>
        </div>
      </div>

      {/* Host Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {hosts.map((host) => {
          const statusConfig = getStatusConfig(host.status);
          const isActive = host.status === 'connected';

          return (
            <div
              key={host.id}
              className={`bg-white rounded-lg border border-gray-200 ${statusConfig.border}
                        transition-all duration-200 hover:shadow-md group relative`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* OS Icon */}
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 
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
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status & Menu */}
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] 
                                    font-medium border ${statusConfig.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                    
                    {/* More Actions */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === host.id ? null : host.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {activeMenu === host.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={handleClickOutside} />
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg 
                                        border border-gray-200 shadow-lg z-20 py-1">
                            <button
                              onClick={() => { onEdit(host); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-[13px] text-gray-700 
                                       hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              编辑
                            </button>
                            <button
                              onClick={() => handleCopyHost(host)}
                              className="w-full px-3 py-2 text-left text-[13px] text-gray-700 
                                       hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              复制
                            </button>
                            <button
                              onClick={() => { onTestConnection(host.id); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-[13px] text-gray-700 
                                       hover:bg-gray-50 flex items-center gap-2"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              测试连接
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => { onDelete(host.id); setActiveMenu(null); }}
                              className="w-full px-3 py-2 text-left text-[13px] text-red-600 
                                       hover:bg-red-50 flex items-center gap-2"
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
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* CPU */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                      <Cpu className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">CPU</div>
                      <div className="text-[12px] font-medium text-gray-700">
                        {host.cpu_cores && host.cpu_cores > 0 ? `${host.cpu_cores} 核` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Memory */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                      <MemoryStick className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">内存</div>
                      <div className="text-[12px] font-medium text-gray-700">
                        {formatMemory(host.memory_gb)}
                      </div>
                    </div>
                  </div>

                  {/* Disk */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                      <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">系统盘</div>
                      <div className="text-[12px] font-medium text-gray-700">
                        {formatDisk(host.system_disk_used, host.system_disk_total)}
                      </div>
                    </div>
                  </div>

                  {/* Auth */}
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center 
                                  ${host.auth_type === 'key' ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      {host.auth_type === 'key' ? (
                        <Key className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">认证</div>
                      <div className="text-[12px] font-medium text-gray-700">
                        {host.auth_type === 'key' ? '密钥' : '密码'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OS Info */}
                {host.system_type && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-400">操作系统</span>
                      <div className="flex items-center gap-1.5">
                        <OSIcon osKey={host.os_key} systemType={host.system_type} size="sm" />
                        <span className="text-gray-700">{getOSLabel(host.os_key, host.system_type)}</span>
                      </div>
                    </div>
                    {host.os_version && (
                      <div className="flex items-center justify-between text-[12px] mt-1.5">
                        <span className="text-gray-400">版本</span>
                        <span className="text-gray-700 font-mono text-[11px]">{host.os_version}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer - Actions */}
              <div className="px-4 pb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenTerminal(host)}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white 
                             rounded-md text-[12px] font-medium transition-colors
                             flex items-center justify-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    终端
                  </button>
                  <button
                    onClick={() => onOpenSFTP && onOpenSFTP(host)}
                    disabled={!onOpenSFTP || !isActive}
                    className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 
                             rounded-md text-[12px] font-medium transition-colors
                             flex items-center justify-center gap-1.5
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    SFTP
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Host Card */}
        <button
          onClick={onAddHost}
          className="bg-white rounded-lg border-2 border-dashed border-gray-200 
                   hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200
                   min-h-[280px] flex flex-col items-center justify-center gap-3 group"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 
                        flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="text-center">
            <div className="text-[14px] font-medium text-gray-600 group-hover:text-blue-600 transition-colors">
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
