import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { HostsGrid } from './components/HostsGrid';
import AddHostModal from './components/AddHostModal';
import TerminalModal from './components/TerminalModal';
import SFTPModal from './components/SFTPModal';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useDialog } from './components/Dialog';
import { hostApi } from './services/api';
import type { SSHHost, CreateHostRequest, UpdateHostRequest } from './types';

function App() {
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSFTPOpen, setIsSFTPOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState<SSHHost | null>(null);
  const [editingHost, setEditingHost] = useState<SSHHost | null>(null);
  const [copyingHost, setCopyingHost] = useState<SSHHost | null>(null);
  const { toasts, removeToast, success, error } = useToast();
  const { showDialog, dialogComponent } = useDialog();

  // Load host list
  const loadHosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await hostApi.getAll();
      console.log('loadHosts response:', response);
      if (response.success && response.data) {
        console.log('Setting hosts:', response.data.length);
        setHosts(response.data);
      } else {
        console.error('loadHosts failed:', response.message);
      }
    } catch (err) {
      console.error('Failed to load hosts:', err);
      error('Load Failed', 'Unable to load host list');
    } finally {
      setLoading(false);
    }
  }, [error]);

  // Initialize load
  useEffect(() => {
    loadHosts();
  }, [loadHosts]);

  // Add host
  const handleAddHost = async (data: CreateHostRequest) => {
    try {
      const response = await hostApi.create(data);
      if (response.success) {
        await loadHosts();
        setIsAddModalOpen(false);
        setCopyingHost(null);
        success('Added Successfully', 'Host has been successfully added');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add host:', err);
      error('Add Failed', 'Unable to add host, please check configuration');
      return false;
    }
  };

  // Update host
  const handleUpdateHost = async (id: number, data: UpdateHostRequest) => {
    try {
      console.log('handleUpdateHost 被调用, id:', id, 'data:', data);
      const response = await hostApi.update(id, data);
      console.log('API 响应:', response);
      if (response.success) {
        await loadHosts();
        setEditingHost(null);
        setIsAddModalOpen(false);
        success('Update Successful', 'Host information has been updated');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update host:', err);
      error('Update Failed', 'Unable to update host information');
      return false;
    }
  };

  // Delete host
  const handleDeleteHost = async (id: number, hostName: string) => {
    const confirmed = await showDialog({
      type: 'delete',
      title: 'Delete Host',
      message: 'Are you sure you want to delete this host? This operation cannot be undone.',
      itemName: hostName,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      const response = await hostApi.delete(id);
      console.log('Delete response:', response);
      if (response.success) {
        console.log('Delete successful, refreshing hosts...');
        await loadHosts();
        console.log('Hosts refreshed, current count:', hosts.length);
        success('Deleted Successfully', 'Host has been deleted');
      } else {
        console.error('Delete failed:', response.message);
        error('Delete Failed', response.message || 'Unable to delete host');
      }
    } catch (err) {
      console.error('Failed to delete host:', err);
      error('Delete Failed', 'Unable to delete host');
    }
  };

  // Test connection
  const handleTestConnection = async (id: number) => {
    try {
      const response = await hostApi.testConnection(id);
      if (response.success) {
        success('Connection Successful', 'SSH connection test passed');
        await loadHosts();
      } else {
        error('Connection Failed', response.message || 'Unable to connect to host');
      }
    } catch (err) {
      console.error('Test connection failed:', err);
      error('Connection Failed', 'Error occurred during connection test');
    }
  };

  // Open terminal
  const handleOpenTerminal = (host: SSHHost) => {
    setSelectedHost(host);
    setIsTerminalOpen(true);
  };

  // Open SFTP
  const handleOpenSFTP = (host: SSHHost) => {
    console.log('[App] handleOpenSFTP called:', host);
    console.log('[App] Setting selectedHost and isSFTPOpen...');
    setSelectedHost(host);
    setIsSFTPOpen(true);
    console.log('[App] isSFTPOpen should be true now');
  };

  // Open edit modal
  const handleEditHost = (host: SSHHost) => {
    setEditingHost(host);
    setCopyingHost(null);
    setIsAddModalOpen(true);
  };

  // Copy host
  const handleCopyHost = (host: SSHHost) => {
    setEditingHost(null);
    setCopyingHost(host);
    setIsAddModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingHost(null);
    setCopyingHost(null);
  };

  return (
    <div className="bg-[#F5F5F7] text-gray-900 h-screen overflow-hidden flex m-0 p-0">
      {/* Sidebar */}
      <Sidebar hostCount={hosts.length} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#F5F5F7] relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>
        
        {/* Header */}
        <Header />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 relative z-10">
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
            onRefresh={loadHosts}
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

      {/* SFTP Modal */}
      {isSFTPOpen && selectedHost && (
        <SFTPModal
          host={selectedHost}
          onClose={() => {
            setIsSFTPOpen(false);
            setSelectedHost(null);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Dialog Component */}
      {dialogComponent}
    </div>
  );
}

export default App;
