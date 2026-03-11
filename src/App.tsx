import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HostsGrid from './components/HostsGrid';
import AddHostModal from './components/AddHostModal';
import TerminalModal from './components/TerminalModal';
import { hostApi } from './services/api';
import type { SSHHost, HostStats, CreateHostRequest, UpdateHostRequest } from './types';

function App() {
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [stats, setStats] = useState<HostStats>({ total: 0, online: 0, offline: 0, key_count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<SSHHost | null>(null);
  const [editingHost, setEditingHost] = useState<SSHHost | null>(null);
  const [copyingHost, setCopyingHost] = useState<SSHHost | null>(null);

  // 加载主机列表
  const loadHosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await hostApi.getAll();
      if (response.success && response.data) {
        setHosts(response.data);
      }
    } catch (error) {
      console.error('Failed to load hosts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const response = await hostApi.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadHosts();
    loadStats();
  }, [loadHosts, loadStats]);

  // 搜索主机
  useEffect(() => {
    const searchHosts = async () => {
      if (!searchQuery.trim()) {
        loadHosts();
        return;
      }
      try {
        const response = await hostApi.search(searchQuery);
        if (response.success && response.data) {
          setHosts(response.data);
        }
      } catch (error) {
        console.error('Search failed:', error);
      }
    };

    const debounceTimer = setTimeout(searchHosts, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, loadHosts]);

  // 添加主机
  const handleAddHost = async (data: CreateHostRequest) => {
    try {
      const response = await hostApi.create(data);
      if (response.success) {
        await loadHosts();
        await loadStats();
        setIsAddModalOpen(false);
        setCopyingHost(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add host:', error);
      return false;
    }
  };

  // 更新主机
  const handleUpdateHost = async (id: number, data: UpdateHostRequest) => {
    try {
      const response = await hostApi.update(id, data);
      if (response.success) {
        await loadHosts();
        await loadStats();
        setEditingHost(null);
        setIsAddModalOpen(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update host:', error);
      return false;
    }
  };

  // 删除主机
  const handleDeleteHost = async (id: number) => {
    if (!confirm('确定要删除此主机吗？此操作不可恢复。')) {
      return;
    }
    try {
      const response = await hostApi.delete(id);
      if (response.success) {
        await loadHosts();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to delete host:', error);
    }
  };

  // 测试连接
  const handleTestConnection = async (id: number) => {
    try {
      const response = await hostApi.testConnection(id);
      if (response.success) {
        alert('连接成功！');
        await loadHosts();
      } else {
        alert(`连接失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('Test connection failed:', error);
      alert('连接测试失败');
    }
  };

  // 打开终端
  const handleOpenTerminal = (host: SSHHost) => {
    setSelectedHost(host);
    setIsTerminalOpen(true);
  };

  // 打开 SFTP - 暂时使用提示功能，后续可以添加完整的 SFTP 客户端
  const handleOpenSFTP = (host: SSHHost) => {
    if (host.status !== 'connected') {
      alert('请先连接主机后再使用 SFTP 功能');
      return;
    }
    // 构建 SFTP URL 或使用外部客户端打开
    const sftpUrl = `sftp://${host.username}@${host.address}:${host.port}`;
    alert(`SFTP 连接信息:\n${sftpUrl}\n\n您可以使用 FileZilla、WinSCP 等 SFTP 客户端连接。`);
  };

  // 打开编辑模态框
  const handleEditHost = (host: SSHHost) => {
    setEditingHost(host);
    setCopyingHost(null);
    setIsAddModalOpen(true);
  };

  // 复制主机 - 打开模态框并预填充数据
  const handleCopyHost = (host: SSHHost) => {
    setEditingHost(null);
    setCopyingHost(host);
    setIsAddModalOpen(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingHost(null);
    setCopyingHost(null);
  };

  return (
    <div className="bg-gray-50 text-gray-800 h-screen overflow-hidden flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-grid-light relative">
        {/* Header */}
        <Header
          stats={stats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddHost={() => setIsAddModalOpen(true)}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <HostsGrid
            hosts={hosts}
            loading={loading}
            onEdit={handleEditHost}
            onDelete={handleDeleteHost}
            onTestConnection={handleTestConnection}
            onOpenTerminal={handleOpenTerminal}
            onOpenSFTP={handleOpenSFTP}
            onAddHost={() => setIsAddModalOpen(true)}
            onCopyHost={handleCopyHost}
          />
        </div>
      </main>

      {/* Add Host Modal */}
      {isAddModalOpen && (
        <AddHostModal
          host={editingHost}
          copyingHost={copyingHost}
          onClose={handleCloseModal}
          onSubmit={async (data) => {
            if (editingHost) {
              return await handleUpdateHost(editingHost.id, data as UpdateHostRequest);
            } else {
              return await handleAddHost(data as CreateHostRequest);
            }
          }}
        />
      )}

      {/* Terminal Modal */}
      {isTerminalOpen && selectedHost && (
        <TerminalModal
          host={selectedHost}
          onClose={() => {
            setIsTerminalOpen(false);
            setSelectedHost(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
