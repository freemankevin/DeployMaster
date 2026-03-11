import { useState } from 'react';
import { Server, CheckCircle, Terminal, Key, ChevronDown, ChevronUp, Copy, Check, Cpu, HardDrive, MemoryStick, Files, FolderOpen, X } from 'lucide-react';
import type { SSHHost } from '@/types';
import OSIcon, { getOSColor, getOSLabel } from './OSIcon';

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
  const [expandedHostId, setExpandedHostId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'connected':
        return { color: 'bg-emerald-500', pulse: 'status-pulse', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'warning':
        return { color: 'bg-amber-500', pulse: 'animate-pulse', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
      default:
        return { color: 'bg-gray-400', pulse: '', text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
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

  // 切换展开状态
  const toggleExpand = (hostId: number) => {
    setExpandedHostId(expandedHostId === hostId ? null : hostId);
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

  // 处理复制主机
  const handleCopyHost = (e: React.MouseEvent, host: SSHHost) => {
    e.stopPropagation();
    if (onCopyHost) {
      onCopyHost(host);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">总主机数</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Server className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{hosts.length}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">在线主机</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {hosts.filter(h => h.status === 'connected').length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">活跃会话</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {hosts.filter(h => h.status === 'connected').length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">密钥管理</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Key className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {hosts.filter(h => h.auth_type === 'key').length}
          </div>
        </div>
      </div>

      {/* Hosts List */}
      <div className="space-y-3">
        {hosts.map((host, index) => {
          const statusStyle = getStatusStyle(host.status);
          const isExpanded = expandedHostId === host.id;
          const copyKey = `host-${host.id}`;
          const osColor = getOSColor(host.os_key, host.system_type);

          return (
            <div
              key={host.id}
              className={`bg-white rounded-xl border ${
                host.status === 'connected' ? 'border-emerald-200' :
                host.status === 'warning' ? 'border-amber-200' : 'border-gray-200'
              } overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in relative`}
              style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
            >
              {/* 左上角删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(host.id);
                }}
                className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 border border-red-200 shadow-sm"
                title="删除主机"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Main Row - Always Visible */}
              <div
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => toggleExpand(host.id)}
              >
                {/* OS Icon - 使用系统类型图标替代数字 */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundColor: osColor + '20' }}
                  >
                    <div className="w-8 h-8" style={{ color: osColor }}>
                      <OSIcon
                        osKey={host.os_key}
                        systemType={host.system_type}
                        size="lg"
                      />
                    </div>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${statusStyle.color} rounded-full border-2 border-white ${statusStyle.pulse}`}></div>
                </div>

                {/* Host Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {host.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(host.name, `${copyKey}-name`);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="复制名称"
                    >
                      {copiedField === `${copyKey}-name` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-mono">{host.address}:{host.port}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(`${host.address}:${host.port}`, `${copyKey}-address`);
                      }}
                      className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="复制地址"
                    >
                      {copiedField === `${copyKey}-address` ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* System Info Badge */}
                <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                  {host.system_type && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                      <OSIcon
                        osKey={host.os_key}
                        systemType={host.system_type}
                        size="sm"
                      />
                      <span className="text-xs text-gray-600 font-medium">
                        {getOSLabel(host.os_key, host.system_type)}
                      </span>
                    </div>
                  )}

                  {/* Quick Stats */}
                  {host.cpu_cores && host.cpu_cores > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{host.cpu_cores}核</span>
                    </div>
                  )}
                  {host.memory_gb && host.memory_gb > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                      <MemoryStick className="w-3.5 h-3.5" />
                      <span>{formatMemory(host.memory_gb)}</span>
                    </div>
                  )}
                </div>

                {/* Auth Type Badge */}
                <div className="flex-shrink-0">
                  {host.auth_type === 'key' ? (
                    <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-600 text-xs border border-purple-100 flex items-center gap-1 font-medium">
                      <Key className="w-3 h-3" />
                      密钥
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs border border-gray-200 flex items-center gap-1 font-medium">
                      <i className="fas fa-lock text-xs"></i>
                      密码
                    </span>
                  )}
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0 text-gray-400">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4 animate-slide-down">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* System Details */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">系统信息</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">操作系统</span>
                          <div className="flex items-center gap-1.5">
                            <OSIcon
                              osKey={host.os_key}
                              systemType={host.system_type}
                              size="sm"
                            />
                            <span className="text-sm font-medium text-gray-900">
                              {getOSLabel(host.os_key, host.system_type)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">内核版本</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-mono text-gray-900 truncate max-w-[120px]">
                              {host.kernel_version || '-'}
                            </span>
                            {host.kernel_version && (
                              <button
                                onClick={() => copyToClipboard(host.kernel_version!, `${copyKey}-kernel`)}
                                className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                              >
                                {copiedField === `${copyKey}-kernel` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">架构</span>
                          <span className="text-sm font-mono text-gray-900">{host.architecture || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hardware Info */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">硬件信息</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">CPU 核心</span>
                          <div className="flex items-center gap-1.5">
                            <Cpu className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {host.cpu_cores && host.cpu_cores > 0 ? `${host.cpu_cores} 核` : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">内存容量</span>
                          <div className="flex items-center gap-1.5">
                            <MemoryStick className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatMemory(host.memory_gb)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connection Info */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">连接信息</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">用户名</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-mono text-gray-900">{host.username}</span>
                            <button
                              onClick={() => copyToClipboard(host.username, `${copyKey}-username`)}
                              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                            >
                              {copiedField === `${copyKey}-username` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">认证方式</span>
                          <span className="text-sm text-gray-900">
                            {host.auth_type === 'key' ? 'SSH 密钥' : '密码'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">状态</span>
                          <span className={`text-sm font-medium ${statusStyle.text}`}>
                            {host.status === 'connected' ? '已连接' :
                             host.status === 'warning' ? '警告' : '未连接'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">操作</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onOpenTerminal(host)}
                          className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-blue-200"
                        >
                          <Terminal className="w-4 h-4" />
                          终端
                        </button>
                        <button
                          onClick={() => onOpenSFTP && onOpenSFTP(host)}
                          disabled={!onOpenSFTP || host.status !== 'connected'}
                          className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FolderOpen className="w-4 h-4" />
                          SFTP
                        </button>
                        <button
                          onClick={() => onTestConnection(host.id)}
                          className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-emerald-200"
                        >
                          <i className="fas fa-plug"></i>
                          测试
                        </button>
                        <button
                          onClick={() => onEdit(host)}
                          className="py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-gray-200"
                        >
                          <i className="fas fa-edit"></i>
                          编辑
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={(e) => handleCopyHost(e, host)}
                          className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-indigo-200"
                        >
                          <Files className="w-4 h-4" />
                          复制主机
                        </button>
                        <button
                          onClick={() => onDelete(host.id)}
                          className="py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 border border-red-200"
                        >
                          <i className="fas fa-trash"></i>
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add New Host Button */}
        <button
          onClick={onAddHost}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-300 group"
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110">
            <i className="fas fa-plus text-xl group-hover:rotate-90 transition-transform duration-300"></i>
          </div>
          <span className="font-medium">添加新主机</span>
          <span className="text-xs mt-1 text-gray-500">支持密码或密钥认证</span>
        </button>
      </div>
    </>
  );
};

export default HostsGrid;
