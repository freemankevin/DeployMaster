import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../types';
import UserSettingsModal from './UserSettingsModal';
import {
  ShieldCheck,
  Wrench,
  Eye,
  User as UserIcon,
  Settings,
  LogOut,
  Clock,
  Bell,
  CheckCircle2,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface HeaderProps {
  currentUser?: User | null;
  onLogout?: () => void;
  onUserUpdate?: (user: User) => void;
}

const Header = ({ currentUser, onLogout, onUserUpdate }: HeaderProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifClosing, setNotifClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Add notification helper
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Remove single notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // User menu
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        showUserMenu
      ) {
        handleCloseMenu();
      }
      // Notifications menu
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(e.target as Node) &&
        notifButtonRef.current &&
        !notifButtonRef.current.contains(e.target as Node) &&
        showNotifications
      ) {
        handleCloseNotifications();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showNotifications]);

  // Animation effect for user menu
  useEffect(() => {
    if (showUserMenu) {
      setMenuClosing(false);
      setTimeout(() => setMenuVisible(true), 10);
    } else {
      setMenuVisible(false);
    }
  }, [showUserMenu]);

  // Animation effect for notifications menu
  useEffect(() => {
    if (showNotifications) {
      setNotifClosing(false);
      setTimeout(() => setNotifVisible(true), 10);
    } else {
      setNotifVisible(false);
    }
  }, [showNotifications]);

  const handleCloseMenu = () => {
    setMenuClosing(true);
    setTimeout(() => {
      setShowUserMenu(false);
      setMenuClosing(false);
    }, 150);
  };

  const handleCloseNotifications = () => {
    setNotifClosing(true);
    setTimeout(() => {
      setShowNotifications(false);
      setNotifClosing(false);
    }, 150);
  };

  const handleOpenSettings = () => {
    setShowUserMenu(false);
    setShowSettingsModal(true);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout?.();
  };

  // Expose addNotification to window for global access
  useEffect(() => {
    (window as any).addAppNotification = addNotification;
    return () => {
      delete (window as any).addAppNotification;
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getAvatarUrl = () => {
    if (currentUser?.avatar) {
      if (currentUser.avatar.startsWith('http')) return currentUser.avatar;
      return `http://127.0.0.1:8000${currentUser.avatar}`;
    }
    // Default avatar
    return '/cat.jpg';
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    operator: 'Operator',
    viewer: 'Viewer',
  };

  const roleIcons: Record<string, React.ElementType> = {
    admin: ShieldCheck,
    operator: Wrench,
    viewer: Eye,
  };

  return (
    <header className="h-14 bg-background-secondary/80 backdrop-blur-xl border-b border-border-primary flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Left side - empty or can add breadcrumbs/title */}
      <div className="flex items-center gap-4">
        {/* Page title could go here */}
      </div>

      {/* Right side - Notifications and User avatar */}
      {currentUser && (
        <div className="flex items-center gap-3">
          {/* Notification bell button */}
          <button
            ref={notifButtonRef}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 relative"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  padding: '0 3px',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Divider between notification and avatar */}
          <div
            className="w-px self-center"
            style={{
              height: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
            }}
          />

          {/* Notifications dropdown menu */}
          {showNotifications && createPortal(
            <div
              ref={notifMenuRef}
              className={`fixed transform transition-all duration-150 ${
                notifVisible && !notifClosing
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95'
              }`}
              style={{
                top: notifButtonRef.current ? notifButtonRef.current.getBoundingClientRect().bottom + 8 : 0,
                right: notifButtonRef.current ? window.innerWidth - notifButtonRef.current.getBoundingClientRect().right : 0,
                width: '320px',
                maxHeight: '400px',
                zIndex: 1000,
              }}
            >
              <div
                className="rounded-xl overflow-hidden shadow-lg"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '0.5px solid var(--border-default)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ borderBottom: '0.5px solid var(--border-default)' }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Notifications
                  </span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <>
                        <button
                          onClick={markAllAsRead}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Mark all read
                        </button>
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Clear all
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Notifications list */}
                <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                  {notifications.length === 0 ? (
                    <div
                      className="px-4 py-8 text-center"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 flex items-start gap-3 transition-colors ${
                          !notif.read ? 'bg-opacity-5' : ''
                        }`}
                        style={{
                          borderBottom: '0.5px solid var(--border-default)',
                          background: !notif.read ? 'var(--accent-muted)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (notif.read) {
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (notif.read) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: notif.type === 'success' ? 'var(--color-success-muted)' :
                                       notif.type === 'error' ? 'var(--color-error-muted)' :
                                       'var(--bg-tertiary)',
                            color: notif.type === 'success' ? 'var(--color-success)' :
                                   notif.type === 'error' ? 'var(--color-error)' :
                                   'var(--accent)',
                          }}
                        >
                          {notif.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : notif.type === 'error' ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium leading-tight"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {notif.title}
                          </p>
                          <p
                            className="text-xs mt-1 leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {notif.message}
                          </p>
                          <p
                            className="text-xs mt-1.5"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {new Date(notif.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Close button */}
                        <button
                          onClick={() => removeNotification(notif.id)}
                          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-tertiary)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* User avatar button */}
          <button
            ref={buttonRef}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all duration-150 hover:ring-2 hover:ring-offset-2"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1.5px solid var(--border-default)',
              '--tw-ring-color': 'var(--accent)',
              '--tw-ring-offset-color': 'var(--bg-surface)',
            } as React.CSSProperties}
          >
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()!}
                alt={currentUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {currentUser.username.charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {/* Dropdown menu - using Portal */}
          {showUserMenu && createPortal(
            <div
              ref={menuRef}
              className={`fixed transform transition-all duration-150 ${
                menuVisible && !menuClosing
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95'
              }`}
              style={{
                top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
                right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0,
                width: '220px',
                zIndex: 1000,
              }}
            >
              <div
                className="rounded-xl overflow-hidden shadow-lg"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '0.5px solid var(--border-default)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* User info header */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: '0.5px solid var(--border-default)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1.5px solid var(--border-default)',
                      }}
                    >
                      {getAvatarUrl() ? (
                        <img
                          src={getAvatarUrl()!}
                          alt={currentUser.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-base font-semibold"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {currentUser.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p
                        className="text-sm font-medium truncate leading-tight"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {currentUser.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 leading-none">
                        {(() => {
                          const IconComponent = roleIcons[currentUser.role] || UserIcon;
                          return <IconComponent className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />;
                        })()}
                        <span
                          className="text-xs leading-none"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {roleLabels[currentUser.role] || currentUser.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  {/* Settings */}
                  <button
                    onClick={handleOpenSettings}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Settings
                      className="w-4 h-4"
                      style={{ color: 'var(--accent)' }}
                    />
                    <span>User Settings</span>
                  </button>

                  {/* Divider */}
                  <div
                    className="my-1 mx-4"
                    style={{ height: '0.5px', background: 'var(--border-default)' }}
                  />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--color-error)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-error-muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-2 text-xs flex items-center"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    borderTop: '0.5px solid var(--border-default)',
                  }}
                >
                  <Clock className="w-3 h-3 mr-1.5" />
                  Last login: {currentUser.last_login_at
                    ? new Date(currentUser.last_login_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'First login'}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* User Settings Modal */}
      {currentUser && (
        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentUser={currentUser}
          onUserUpdate={(user) => {
            onUserUpdate?.(user);
            // Don't close modal, just add notification
            addNotification({
              type: 'success',
              title: 'Profile Updated',
              message: 'Your profile has been updated successfully.',
            });
          }}
          onNotification={(notification) => {
            addNotification(notification);
          }}
        />
      )}
    </header>
  );
};

export default Header;