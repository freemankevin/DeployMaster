import { useState, useEffect } from 'react';
import { X, Key, Lock, Plug, Copy, Server, User, Globe, Hash } from 'lucide-react';
import type { SSHHost, CreateHostRequest, UpdateHostRequest, SSHKey } from '@/types';
import { keyApi } from '@/services/api';

interface AddHostModalProps {
  host: SSHHost | null;
  copyingHost?: SSHHost | null;
  onClose: () => void;
  onSubmit: (data: CreateHostRequest | UpdateHostRequest) => Promise<boolean>;
}

const AddHostModal = ({ host, copyingHost, onClose, onSubmit }: AddHostModalProps) => {
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    port: 22,
    username: '',
    auth_type: 'password' as 'password' | 'key',
    password: '',
    private_key: '',
    key_passphrase: '',
    tags: [] as string[],
  });

  // 加载密钥列表
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const response = await keyApi.getAll();
        if (response.success && response.data) {
          setKeys(response.data);
        }
      } catch (error) {
        console.error('Failed to load keys:', error);
      }
    };
    loadKeys();
  }, []);

  // 编辑模式或复制模式时填充表单
  useEffect(() => {
    if (host) {
      setFormData({
        name: host.name,
        address: host.address,
        port: host.port,
        username: host.username,
        auth_type: host.auth_type,
        password: host.password || '',
        private_key: host.private_key || '',
        key_passphrase: host.key_passphrase || '',
        tags: host.tags || [],
      });
    } else if (copyingHost) {
      setFormData({
        name: `${copyingHost.name} (副本)`,
        address: '',
        port: copyingHost.port,
        username: copyingHost.username,
        auth_type: copyingHost.auth_type,
        password: copyingHost.password || '',
        private_key: copyingHost.private_key || '',
        key_passphrase: copyingHost.key_passphrase || '',
        tags: copyingHost.tags || [],
      });
    } else {
      setFormData({
        name: '',
        address: '',
        port: 22,
        username: '',
        auth_type: 'password',
        password: '',
        private_key: '',
        key_passphrase: '',
        tags: [],
      });
    }
  }, [host, copyingHost]);

  // 表单验证
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      alert('请填写显示名称');
      return false;
    }
    if (!formData.address.trim()) {
      alert('请填写主机地址');
      return false;
    }
    if (!formData.username.trim()) {
      alert('请填写用户名');
      return false;
    }
    // 编辑模式下，如果已有密码/私钥，允许不重新输入
    if (formData.auth_type === 'password' && !formData.password && !host) {
      alert('请输入密码');
      return false;
    }
    if (formData.auth_type === 'key' && !formData.private_key && !host) {
      alert('请选择或输入私钥');
      return false;
    }
    return true;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 构建提交数据
      const submitData: Record<string, unknown> = {
        name: formData.name,
        address: formData.address,
        port: formData.port,
        username: formData.username,
        auth_type: formData.auth_type,
        tags: formData.tags,
      };
      
      // 处理敏感字段
      if (formData.auth_type === 'password') {
        // 编辑模式下，如果密码为空则不发送（保留原值）
        if (!host || formData.password) {
          submitData.password = formData.password || undefined;
        }
      } else if (formData.auth_type === 'key') {
        // 编辑模式下，如果私钥为空则不发送（保留原值）
        if (!host || formData.private_key) {
          submitData.private_key = formData.private_key || undefined;
          submitData.key_passphrase = formData.key_passphrase || undefined;
        }
      }
      
      console.log('提交数据:', submitData);
      console.log('编辑模式:', !!host, '主机ID:', host?.id);
      
      const success = await onSubmit(submitData as CreateHostRequest | UpdateHostRequest);
      console.log('提交结果:', success);
      
      if (!success) {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('提交错误:', error);
      alert('保存失败，请查看控制台日志');
    } finally {
      setLoading(false);
    }
  };

  // 获取标题
  const getTitle = () => {
    if (host) return '编辑 SSH 主机';
    if (copyingHost) return '复制 SSH 主机';
    return '添加 SSH 主机';
  };

  // 获取提交按钮文本
  const getSubmitText = () => {
    if (loading) return '保存中...';
    if (host) return '保存修改';
    if (copyingHost) return '创建副本';
    return '测试并保存';
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in 
                    border border-gray-200/60 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 
                          flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-gray-900">
                {getTitle()}
              </h3>
              {copyingHost && (
                <p className="text-[12px] text-gray-500">
                  克隆自: {copyingHost.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                     rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Name & Address */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-gray-400" />
                显示名称
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                         text-[13px] text-gray-900 placeholder-gray-400
                         transition-all duration-200
                         focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                         hover:border-gray-300"
                placeholder="例如：Production-API"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                主机地址
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                         text-[13px] text-gray-900 placeholder-gray-400 font-mono
                         transition-all duration-200
                         focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                         hover:border-gray-300"
                placeholder="IP 或域名"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          {/* Port & Username */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                端口
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                         text-[13px] text-gray-900 font-mono
                         transition-all duration-200
                         focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                         hover:border-gray-300"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                用户名
              </label>
              <input
                type="text"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                         text-[13px] text-gray-900 placeholder-gray-400
                         transition-all duration-200
                         focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                         hover:border-gray-300"
                placeholder="root"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          {/* Auth Type */}
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">
              认证方式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auth_type: 'key' })}
                className={`px-4 py-3 rounded-xl border-2 text-[13px] font-medium 
                          transition-all duration-200 flex items-center justify-center gap-2
                          ${formData.auth_type === 'key'
                            ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
              >
                <Key className="w-4 h-4" />
                SSH 密钥
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auth_type: 'password' })}
                className={`px-4 py-3 rounded-xl border-2 text-[13px] font-medium 
                          transition-all duration-200 flex items-center justify-center gap-2
                          ${formData.auth_type === 'password'
                            ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
              >
                <Lock className="w-4 h-4" />
                密码
              </button>
            </div>
          </div>

          {/* Auth Input */}
          {formData.auth_type === 'key' ? (
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-gray-400" />
                选择密钥
              </label>
              <select
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                         text-[13px] text-gray-900
                         transition-all duration-200
                         focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                         hover:border-gray-300 appearance-none cursor-pointer"
                value={formData.private_key}
                onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
              >
                <option value="">选择已保存的密钥</option>
                {keys.map((key) => (
                  <option key={key.id} value={key.id.toString()}>
                    {key.name} ({key.key_type.toUpperCase()})
                  </option>
                ))}
                <option value="__custom__">+ 手动输入私钥</option>
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                密码
              </label>
              <input
                type="password"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                         text-[13px] text-gray-900 placeholder-gray-400
                         transition-all duration-200
                         focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                         hover:border-gray-300"
                placeholder={host ? "留空保持原密码不变" : "输入密码"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          )}

          {/* Copy Mode Hint */}
          {copyingHost && (
            <div className="p-4 bg-indigo-50 border border-indigo-200/60 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Copy className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-indigo-900">正在克隆主机配置</p>
                  <p className="text-[12px] text-indigo-700 mt-1">
                    已复制 {copyingHost.name} 的认证配置，请填写新的主机地址和名称。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 
                     hover:text-gray-800 hover:bg-gray-200/50 
                     transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl 
                     text-[13px] font-medium transition-all duration-200 
                     flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-[0_0.5px_1px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                     hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                     hover:brightness-105 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                保存中...
              </>
            ) : (
              <>
                <Plug className="w-4 h-4" />
                {getSubmitText()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddHostModal;
