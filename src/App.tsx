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
import type { SSHHost, CreateHostRequest, UpdateHostRequest, OpenWindow, WindowType } from './types';

function App() {
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
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
      console.log('handleUpdateHost called, id:', id, 'data:', data);
      const response = await hostApi.update(id, data);
      console.log('API response:', response);
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

  // Generate unique window ID
  const generateWindowId = (type: WindowType, hostId: number): string => {
    return `${type}-${hostId}-${Date.now()}`;
  };

  // Open terminal window
  const handleOpenTerminal = (host: SSHHost) => {
    const windowId = generateWindowId('terminal', host.id);
    const newWindow: OpenWindow = {
      id: windowId,
      type: 'terminal',
      hostId: host.id,
      host,
      isMinimized: false,
      openedAt: Date.now()
    };
    setOpenWindows(prev => [...prev, newWindow]);
  };

  // Open SFTP window
  const handleOpenSFTP = (host: SSHHost) => {
    console.log('[App] handleOpenSFTP called:', host);
    const windowId = generateWindowId('sftp', host.id);
    const newWindow: OpenWindow = {
      id: windowId,
      type: 'sftp',
      hostId: host.id,
      host,
      isMinimized: false,
      openedAt: Date.now()
    };
    setOpenWindows(prev => [...prev, newWindow]);
  };

  // Close window
  const handleCloseWindow = (windowId: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== windowId));
  };

  // Toggle window minimize state
  const handleToggleMinimize = (windowId: string) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  // Restore window (from minimized state)
  const handleRestoreWindow = (windowId: string) => {
    setOpenWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: false } : w
    ));
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

  // Get minimized windows for display
  const minimizedWindows = openWindows.filter(w => w.isMinimized);
  const activeWindows = openWindows.filter(w => !w.isMinimized);

  return (
    <div className="bg-background-primary text-white h-screen overflow-hidden flex m-0 p-0">
      {/* Sidebar */}
      <Sidebar hostCount={hosts.length} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background-primary relative">
        {/* Background Pattern - Dark Mode */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
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

      {/* Active Terminal Windows */}
      {activeWindows.filter(w => w.type === 'terminal').map(window => (
        <TerminalModal
          key={window.id}
          host={window.host}
          onClose={() => handleCloseWindow(window.id)}
          isMinimized={window.isMinimized}
          onToggleMinimize={() => handleToggleMinimize(window.id)}
        />
      ))}

      {/* Active SFTP Windows */}
      {activeWindows.filter(w => w.type === 'sftp').map(window => (
        <SFTPModal
          key={window.id}
          host={window.host}
          onClose={() => handleCloseWindow(window.id)}
          isMinimized={window.isMinimized}
          onToggleMinimize={() => handleToggleMinimize(window.id)}
          onSuccess={success}
          onError={error}
        />
      ))}

      {/* Minimized Windows Stack - Bottom Right - Dark Mode */}
      {minimizedWindows.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse gap-2">
          {minimizedWindows.map((window, index) => (
            <div
              key={window.id}
              className="cursor-pointer group animate-fade-in"
            >
              <div className="bg-background-secondary/95 backdrop-blur-xl border border-border-primary rounded-xl px-4 py-3 shadow-macos-dropdown flex items-center gap-3 hover:bg-background-tertiary/95 transition-all duration-300 hover:scale-105"
                style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 10px 40px -10px rgba(0,0,0,0.5)' }}>
                {/* Icon with gradient background */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  window.type === 'terminal' 
                    ? 'bg-macos-blue' 
                    : 'bg-macos-green'
                }`}>
                  <i className={`fa-solid ${window.type === 'terminal' ? 'fa-terminal' : 'fa-folder-open'} text-white text-sm`} />
                </div>
                {/* Connection status and host info */}
                <div 
                  className="flex items-center gap-2 flex-1" 
                  onClick={() => handleRestoreWindow(window.id)}
                  style={{ fontFamily: '"JetBrains Mono", "SF Mono", "Monaco", "Menlo", "Consolas", monospace', fontSize: '13px' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-macos-green animate-pulse" />
                  <span className="text-text-secondary">{window.host.address}</span>
                </div>
                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseWindow(window.id);
                  }}
                  className="ml-1 w-6 h-6 rounded-full bg-macos-red/20 hover:bg-macos-red flex items-center justify-center transition-colors group/close"
                  title="Close"
                >
                  <i className="fa-solid fa-xmark text-[10px] text-text-tertiary group-hover/close:text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Dialog Component */}
      {dialogComponent}
    </div>
  );
}

export default App;