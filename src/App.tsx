import { useState, useEffect, useCallback } from 'react';
import Sidebar, { type PageType } from './components/Sidebar';
import Header from './components/Header';
import { HostsGrid } from './components/HostsGrid';
import AddHostModal from './components/AddHostModal';
import TerminalModal from './components/TerminalModal';
import SFTPModal from './components/SFTPModal';
import LoginPage from './components/LoginPage';
import PlaceholderPage from './components/PlaceholderPage';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useDialog } from './components/Dialog';
import { hostApi } from './services/api';
import { isAuthenticated, getCurrentUser, tokenManager } from './services/authApi';
import type { SSHHost, CreateHostRequest, UpdateHostRequest, OpenWindow, WindowType, User } from './types';
import { Loader2, Terminal, FolderOpen, X } from 'lucide-react';

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Page state
  const [currentPage, setCurrentPage] = useState<PageType>('hosts');
  
  // Hosts state
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
  const [editingHost, setEditingHost] = useState<SSHHost | null>(null);
  const [copyingHost, setCopyingHost] = useState<SSHHost | null>(null);
  const { toasts, removeToast, success, error } = useToast();
  const { showDialog, dialogComponent } = useDialog();

  // Check authentication on mount
  useEffect(() => {
    const authenticated = isAuthenticated();
    if (authenticated) {
      const user = getCurrentUser();
      if (user) {
        setIsLoggedIn(true);
        setCurrentUser(user);
      }
    }
    setAuthChecked(true);
  }, []);

  // Handle login success
  const handleLoginSuccess = useCallback(() => {
    const user = getCurrentUser();
    setIsLoggedIn(true);
    setCurrentUser(user);
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    tokenManager.clearTokens();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage('hosts');
  }, []);

  // Handle user update (from settings modal)
  const handleUserUpdate = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
  }, []);

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

  // Initialize load - only when authenticated
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadHosts();
    }
  }, [isLoggedIn, currentUser, loadHosts]);

  // Add host
  const handleAddHost = async (data: CreateHostRequest) => {
    try {
      const response = await hostApi.create(data);
      if (response.success) {
        await loadHosts();
        setIsAddModalOpen(false);
        setCopyingHost(null);
        success('Added Successfully', 'Host has been added successfully');
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
        success('Updated Successfully', 'Host information has been updated');
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
      message: 'Are you sure you want to delete this host? This action cannot be undone.',
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
        success('Connected Successfully', 'SSH connection test passed');
        await loadHosts();
      } else {
        error('Connection Failed', response.message || 'Unable to connect to host');
      }
    } catch (err) {
      console.error('Test connection failed:', err);
      error('Connection Failed', 'An error occurred during connection test');
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

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div 
        className="h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isLoggedIn || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div 
      className="h-screen overflow-hidden flex m-0 p-0"
      style={{ 
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        currentUser={currentUser}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative" style={{ background: 'var(--bg-base)' }}>
        {/* Background Pattern - Subtle grid */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
        
        {/* Header */}
        <Header 
          currentUser={currentUser} 
          onLogout={handleLogout}
          onUserUpdate={handleUserUpdate}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 relative z-10">
          {currentPage === 'hosts' ? (
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
          ) : (
            <PlaceholderPage page={currentPage} />
          )}
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

      {/* Terminal Windows - always render to keep connection alive */}
      {openWindows.filter(w => w.type === 'terminal').map(window => (
        <TerminalModal
          key={window.id}
          host={window.host}
          onClose={() => handleCloseWindow(window.id)}
          isMinimized={window.isMinimized}
          onToggleMinimize={() => handleToggleMinimize(window.id)}
        />
      ))}

      {/* SFTP Windows - always render to keep connection alive */}
      {openWindows.filter(w => w.type === 'sftp').map(window => (
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

      {/* Minimized Windows Stack - Bottom Right */}
      {minimizedWindows.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse gap-2">
          {minimizedWindows.map((window, index) => (
            <div
              key={window.id}
              className="cursor-pointer group animate-fade-in"
            >
              <div 
                className="rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-150 hover:scale-105"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '0.5px solid var(--border-default)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Icon */}
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: window.type === 'terminal' ? 'var(--accent)' : 'var(--color-success)' }}
                >
                  {window.type === 'terminal'
                    ? <Terminal className="w-4 h-4 text-white" />
                    : <FolderOpen className="w-4 h-4 text-white" />}
                </div>
                {/* Connection status and host info */}
                <div 
                  className="flex items-center gap-2 flex-1" 
                  onClick={() => handleRestoreWindow(window.id)}
                  style={{ fontFamily: '"JetBrains Mono", "SF Mono", "Monaco", "Menlo", "Consolas", monospace', fontSize: '13px' }}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: 'var(--color-success)' }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>{window.host.address}</span>
                </div>
                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseWindow(window.id);
                  }}
                  className="ml-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                  style={{ 
                    background: 'var(--color-error-muted)',
                    color: 'var(--text-tertiary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-error)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-error-muted)';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                  title="Close"
                >
                  <X className="w-3 h-3" />
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