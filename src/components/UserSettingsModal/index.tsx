import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../../types';
import { authApi } from '../../services/authApi';
import { useToast } from '../../hooks/useToast';
import {
  UserCog,
  X,
  User as UserIcon,
  Key,
  Loader2,
  Camera,
  UserCircle,
  Mail,
  Phone,
  Check,
  Lock,
  Eye,
  EyeOff,
  LockKeyhole,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Wrench,
} from 'lucide-react';

interface NotificationData {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdate: (user: User) => void;
  onNotification?: (notification: NotificationData) => void;
}

type ActiveTab = 'profile' | 'password';

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { success: successToast, error: errorToast, info: infoToast } = useToast();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: currentUser.username,
    email: currentUser.email || '',
    phone: currentUser.phone || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProfileForm({
        username: currentUser.username,
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      });
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setAvatarPreview(null);
      setActiveTab('profile');
    }
  }, [isOpen, currentUser]);

  // Animation effects
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  // Handle avatar file selection - auto upload on select
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow re-selecting same file
    e.target.value = '';

    // Validate file type
    if (!file.type.startsWith('image/')) {
      errorToast('Error', 'Please select a valid image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errorToast('Error', 'Image size cannot exceed 10MB');
      return;
    }

    // Create preview and upload immediately
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const avatarData = event.target?.result as string;
      setAvatarPreview(avatarData);
      
      try {
        const result = await authApi.uploadAvatar(avatarData);
        if (result.code === 0 && result.data?.user) {
          onUserUpdate(result.data.user);
          successToast('Success', 'Avatar updated successfully');
          setAvatarPreview(null);
        } else {
          errorToast('Error', result.message || 'Failed to upload avatar');
          setAvatarPreview(null);
        }
      } catch {
        errorToast('Error', 'Failed to upload avatar');
        setAvatarPreview(null);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Update profile
  const handleProfileUpdate = async () => {
    // Validate username
    if (profileForm.username.length < 3) {
      errorToast('Error', 'Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const updateData: { username?: string; email?: string; phone?: string } = {};
      
      if (profileForm.username !== currentUser.username) {
        updateData.username = profileForm.username;
      }
      if (profileForm.email !== currentUser.email) {
        updateData.email = profileForm.email;
      }
      if (profileForm.phone !== currentUser.phone) {
        updateData.phone = profileForm.phone;
      }

      if (Object.keys(updateData).length === 0) {
        infoToast('Info', 'No changes to save');
        return;
      }

      const result = await authApi.updateProfile(updateData);
      if (result.code === 0 && result.data) {
        onUserUpdate(result.data);
        // Send notification instead of toast
        onNotification?.({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your profile has been updated successfully.',
        });
      } else {
        errorToast('Error', result.message || 'Failed to update profile');
      }
    } catch {
      errorToast('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const handlePasswordUpdate = async () => {
    // Validate passwords
    if (!passwordForm.oldPassword) {
      errorToast('Error', 'Please enter your current password');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      errorToast('Error', 'New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errorToast('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.updatePassword({
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword,
      });
      if (result.code === 0) {
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        // Send notification instead of toast
        onNotification?.({
          type: 'success',
          title: 'Password Changed',
          message: 'Your password has been changed successfully.',
        });
      } else {
        errorToast('Error', result.message || 'Failed to change password');
      }
    } catch {
      errorToast('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (currentUser.avatar) {
      // If avatar is a full URL, use it directly
      if (currentUser.avatar.startsWith('http')) return currentUser.avatar;
      // Otherwise, prepend the API base
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

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-150 ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          background: 'rgba(11, 13, 15, 0.85)',
          backdropFilter: 'blur(8px)',
          opacity: isVisible && !isClosing ? 1 : 0,
        }}
      />

      {/* Modal container */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-[480px] transform transition-all duration-150 ${
          isVisible && !isClosing
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        {/* Main modal card */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-overlay)',
            border: '0.5px solid var(--border-default)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '0.5px solid var(--border-default)' }}
          >
            <h2
              className="text-base font-semibold flex items-center"
              style={{ color: 'var(--text-primary)' }}
            >
              <UserCog className="w-4 h-4 mr-2" style={{ color: 'var(--accent)' }} />
              User Settings
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex px-6 pt-4 gap-1"
            style={{ borderBottom: '0.5px solid var(--border-default)' }}
          >
            <button
              onClick={() => setActiveTab('profile')}
              className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative flex items-center"
              style={{
                color: activeTab === 'profile' ? 'var(--accent)' : 'var(--text-secondary)',
                background: activeTab === 'profile' ? 'var(--accent-muted)' : 'transparent',
              }}
            >
              <UserIcon className="w-4 h-4 mr-1.5" />
              Profile
              {activeTab === 'profile' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative flex items-center"
              style={{
                color: activeTab === 'password' ? 'var(--accent)' : 'var(--text-secondary)',
                background: activeTab === 'password' ? 'var(--accent-muted)' : 'transparent',
              }}
            >
              <Key className="w-4 h-4 mr-1.5" />
              Password
              {activeTab === 'password' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'profile' ? (
              <div className="space-y-6">
                {/* Avatar section */}
                <div className="flex items-center gap-4">
                  <div
                    className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center cursor-pointer group flex-shrink-0"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: loading ? '2px solid var(--accent)' : '2px solid var(--border-default)',
                    }}
                    onClick={() => !loading && fileInputRef.current?.click()}
                  >
                    {getAvatarUrl() ? (
                      <img
                        src={getAvatarUrl()!}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-2xl font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {currentUser.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* Hover overlay - show upload icon */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                      }}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-white" />
                          <span className="text-white text-xs mt-1">Upload</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Profile Picture
                    </p>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      JPG, PNG, GIF, WEBP, BMP • Max 10MB
                    </p>
                    <p
                      className="text-xs mt-1.5 leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Click avatar to upload
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                {/* Username field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 flex items-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <UserCircle className="w-4 h-4 mr-1.5" style={{ color: 'var(--accent)' }} />
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="Enter username"
                    minLength={3}
                    maxLength={50}
                  />
                </div>

                {/* Email field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 flex items-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Mail className="w-4 h-4 mr-1.5" style={{ color: 'var(--accent)' }} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="Enter email address (optional)"
                  />
                </div>

                {/* Phone field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 flex items-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Phone className="w-4 h-4 mr-1.5" style={{ color: 'var(--accent)' }} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="Enter phone number (optional)"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current password */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 flex items-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Lock className="w-4 h-4 mr-1.5" style={{ color: 'var(--accent)' }} />
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm transition-colors"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-colors hover:bg-opacity-10"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {showOldPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 flex items-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Key className="w-4 h-4 mr-1.5" style={{ color: 'var(--accent)' }} />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm transition-colors"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="Enter new password (at least 6 characters)"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-colors hover:bg-opacity-10"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2 flex items-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <LockKeyhole className="w-4 h-4 mr-1.5" style={{ color: 'var(--accent)' }} />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm transition-colors"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-colors hover:bg-opacity-10"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p
                      className="text-xs mt-2 flex items-center"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Update password button */}
                <button
                  onClick={handlePasswordUpdate}
                  disabled={loading}
                  className="w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            )}
          </div>

          {/* Footer info */}
          <div
            className="px-6 py-3 text-xs flex items-center"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              borderTop: '0.5px solid var(--border-default)',
            }}
          >
            <ShieldCheck className="w-3 h-3 mr-1.5" />
            Role: {roleLabels[currentUser.role] || currentUser.role}
            <span className="mx-2">•</span>
            <Calendar className="w-3 h-3 mr-1.5" />
            Registered: {new Date(currentUser.created_at).toLocaleDateString('en-US')}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserSettingsModal;