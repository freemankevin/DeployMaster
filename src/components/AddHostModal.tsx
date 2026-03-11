import { useState, useEffect } from 'react';
import { X, Key, Lock, Plug, Copy } from 'lucide-react';
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
      // 编辑模式
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
      // 复制模式 - 克隆配置但清空名称和地址
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
      // 新增模式 - 重置表单
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
    if (formData.auth_type === 'password' && !formData.password) {
      alert('请输入密码');
      return false;
    }
    if (formData.auth_type === 'key' && !formData.private_key) {
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
      const submitData = {
        ...formData,
        private_key: formData.auth_type === 'key' ? formData.private_key : undefined,
        password: formData.auth_type === 'password' ? formData.password : undefined,
      };
      const success = await onSubmit(submitData);
      if (!success) {
        alert('保存失败，请重试');
      }
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
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {getTitle()}
            </h3>
            {copyingHost && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full">
                克隆自: {copyingHost.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">显示名称</label>
              <input
                type="text"
                className="input-field"
                placeholder="例如：Production-API"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">主机地址</label>
              <input
                type="text"
                className="input-field"
                placeholder="IP 或域名"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">端口</label>
              <input
                type="number"
                className="input-field"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">用户名</label>
              <input
                type="text"
                className="input-field"
                placeholder="root"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">认证方式</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auth_type: 'key' })}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.auth_type === 'key'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Key className="w-4 h-4" />
                SSH 密钥
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auth_type: 'password' })}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  formData.auth_type === 'password'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Lock className="w-4 h-4" />
                密码
              </button>
            </div>
          </div>

          {formData.auth_type === 'key' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">选择密钥</label>
              <select
                className="input-field"
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
              <label className="text-sm font-medium text-gray-700">密码</label>
              <input
                type="password"
                className="input-field"
                placeholder="输入密码"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          )}

          {/* 复制模式提示 */}
          {copyingHost && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Copy className="w-4 h-4 text-indigo-500 mt-0.5" />
                <div className="text-sm text-indigo-700">
                  <p className="font-medium">正在克隆主机配置</p>
                  <p className="text-indigo-600 mt-1">
                    已复制 {copyingHost.name} 的认证配置，请填写新的主机地址和名称。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all duration-200 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
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
