import React from 'react';
import type { User } from '../../types';
import { styles, getRoleBadgeStyle, roleLabels } from './styles';
import { useUserManagement } from './useUserManagement';
import { UserFormModal, DeleteConfirmModal, ResetPasswordModal, AuditLogsModal } from './Modals';
import {
  Users,
  BookText,
  Plus,
  Loader2,
  Inbox,
  ShieldCheck,
  Wrench,
  Eye,
  Pencil,
  Key,
  Trash2,
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const {
    users,
    loading,
    auditLogs,
    showAuditLogs,
    formData,
    selectedUser,
    showCreateModal,
    showEditModal,
    showDeleteConfirm,
    showResetPasswordModal,
    formLoading,
    newPassword,
    setShowAuditLogs,
    setShowCreateModal,
    setShowEditModal,
    setShowDeleteConfirm,
    setShowResetPasswordModal,
    setFormData,
    setSelectedUser,
    setNewPassword,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleResetPassword,
    openEditModal,
    resetForm,
  } = useUserManagement();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Users className="w-6 h-6" style={styles.titleIcon} />
            User Management
          </h2>
          <p style={styles.subtitle}>Manage system users and permissions</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowAuditLogs(true)} style={styles.auditButton}>
            <BookText className="w-4 h-4" />
            Audit Logs
          </button>
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} style={styles.createButton}>
            <Plus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>

      {/* Users table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>
            <Loader2 className="w-5 h-5 animate-spin" style={styles.loadingIcon} />
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div style={styles.empty}>
            <Inbox className="w-12 h-12" style={styles.emptyIcon} />
            <p>No users found</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Username</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Login</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userName}>
                      <div style={styles.avatar}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{user.username}</span>
                      {user.id === currentUser.id && (
                        <span style={styles.currentUserBadge}>Current</span>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={getRoleBadgeStyle(user.role)}>
                      {user.role === 'admin' ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : user.role === 'operator' ? (
                        <Wrench className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td style={styles.td}>{user.email || '-'}</td>
                  <td style={styles.td}>{user.phone || '-'}</td>
                  <td style={styles.td}>
                    <span style={user.is_active ? styles.statusActive : styles.statusInactive}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-US') : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => openEditModal(user)} style={styles.actionButton} title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowResetPasswordModal(true); }}
                        style={styles.actionButton}
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}
                          style={styles.deleteButton}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <UserFormModal
        mode="create"
        visible={showCreateModal}
        user={null}
        formData={formData}
        loading={formLoading}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        onSubmit={handleCreateUser}
        onFormChange={setFormData}
      />

      <UserFormModal
        mode="edit"
        visible={showEditModal}
        user={selectedUser}
        formData={formData}
        loading={formLoading}
        onClose={() => { setShowEditModal(false); resetForm(); }}
        onSubmit={handleUpdateUser}
        onFormChange={setFormData}
      />

      <DeleteConfirmModal
        visible={showDeleteConfirm}
        user={selectedUser}
        loading={formLoading}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteUser}
      />

      <ResetPasswordModal
        visible={showResetPasswordModal}
        user={selectedUser}
        newPassword={newPassword}
        loading={formLoading}
        onClose={() => { setShowResetPasswordModal(false); setNewPassword(''); }}
        onConfirm={handleResetPassword}
        onPasswordChange={setNewPassword}
      />

      <AuditLogsModal
        visible={showAuditLogs}
        logs={auditLogs}
        onClose={() => setShowAuditLogs(false)}
      />
    </div>
  );
};

export default UserManagement;