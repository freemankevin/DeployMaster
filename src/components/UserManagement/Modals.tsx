import React, { useState } from 'react';
import type { User, UserRole, AuditLog, CreateUserRequest } from '../../types';
import { styles } from './styles';
import {
  X,
  Plus,
  Check,
  Loader2,
  Trash2,
  Key,
  BookText,
  Eye,
  EyeOff,
} from 'lucide-react';

// Password input with toggle visibility
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ value, onChange, placeholder, label }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      <div style={styles.passwordWrapper}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...styles.input, ...styles.passwordInput }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="password-toggle-btn"
          title={showPassword ? '隐藏密码' : '显示密码'}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

// User Form Modal
interface UserFormModalProps {
  mode: 'create' | 'edit';
  visible: boolean;
  user: User | null;
  formData: CreateUserRequest;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (data: CreateUserRequest) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  mode,
  visible,
  formData,
  loading,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  if (!visible) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {mode === 'create' ? 'Create User' : 'Edit User'}
          </h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div style={styles.modalBody}>
          {mode === 'create' && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => onFormChange({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  style={styles.input}
                />
              </div>
              <PasswordInput
                value={formData.password}
                onChange={(password) => onFormChange({ ...formData, password })}
                placeholder="Enter password (at least 6 characters)"
                label="Password *"
              />
            </>
          )}
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select
              value={formData.role}
              onChange={(e) => onFormChange({ ...formData, role: e.target.value as UserRole })}
              style={styles.select}
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
              placeholder="Enter email"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => onFormChange({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelButton}>
            <X className="w-4 h-4" style={{ marginRight: '6px' }} />
            Cancel
          </button>
          <button onClick={onSubmit} disabled={loading} style={styles.confirmButton}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: '6px' }} />
                Processing...
              </>
            ) : (
              <>
                {mode === 'create' ? (
                  <Plus className="w-4 h-4" style={{ marginRight: '6px' }} />
                ) : (
                  <Check className="w-4 h-4" style={{ marginRight: '6px' }} />
                )}
                {mode === 'create' ? 'Create' : 'Save'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirm Modal
interface DeleteConfirmModalProps {
  visible: boolean;
  user: User | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  user,
  loading,
  onClose,
  onConfirm,
}) => {
  if (!visible || !user) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '400px' }}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Confirm Delete</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div style={styles.modalBody}>
          <p style={styles.confirmText}>
            Are you sure you want to delete user <strong>{user.username}</strong>? This action cannot be undone.
          </p>
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelButton}>
            <X className="w-4 h-4" style={{ marginRight: '6px' }} />
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={styles.deleteConfirmButton}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: '6px' }} />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" style={{ marginRight: '6px' }} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Reset Password Modal
interface ResetPasswordModalProps {
  visible: boolean;
  user: User | null;
  newPassword: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPasswordChange: (password: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  user,
  newPassword,
  loading,
  onClose,
  onConfirm,
  onPasswordChange,
}) => {
  if (!visible || !user) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '400px' }}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Reset Password</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div style={styles.modalBody}>
          <p style={styles.confirmText}>
            Set a new password for user <strong>{user.username}</strong>
          </p>
          <PasswordInput
            value={newPassword}
            onChange={onPasswordChange}
            placeholder="Enter new password (at least 6 characters)"
            label="New Password"
          />
        </div>
        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.cancelButton}>
            <X className="w-4 h-4" style={{ marginRight: '6px' }} />
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={styles.confirmButton}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: '6px' }} />
                Processing...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" style={{ marginRight: '6px' }} />
                Reset Password
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Audit Logs Modal
interface AuditLogsModalProps {
  visible: boolean;
  logs: AuditLog[];
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  visible,
  logs,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '900px', maxHeight: '80vh' }}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            <BookText className="w-4 h-4" style={{ marginRight: '8px' }} />
            Audit Logs
          </h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div style={{ ...styles.modalBody, padding: 0, maxHeight: '60vh', overflow: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Resource</th>
                <th style={styles.th}>Details</th>
                <th style={styles.th}>IP</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(log.created_at).toLocaleString('en-US')}</td>
                  <td style={styles.td}>{log.username}</td>
                  <td style={styles.td}>{log.action}</td>
                  <td style={styles.td}>{log.resource}</td>
                  <td style={{ ...styles.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.detail}
                  </td>
                  <td style={styles.td}>{log.source_ip}</td>
                  <td style={styles.td}>
                    <span style={log.status === 'success' ? styles.statusActive : styles.statusInactive}>
                      {log.status === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};