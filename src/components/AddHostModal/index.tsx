import { useState, useEffect } from 'react';
import type { SSHHost, CreateHostRequest, UpdateHostRequest } from '@/types';
import { keyApi, type SSHKeyResponse } from '@/services/api';
import {
  Server,
  X,
  Loader2,
  Plug,
} from 'lucide-react';
import {
  HostFormData,
  BasicInfoFields,
  PortUsernameFields,
  AuthTypeSelector,
  SSHKeyFields,
  PasswordField,
  CopyModeHint
} from './FormFields';

interface AddHostModalProps {
  host: SSHHost | null;
  copyingHost?: SSHHost | null;
  onClose: () => void;
  onSubmit: (data: CreateHostRequest | UpdateHostRequest) => Promise<boolean>;
}

const initialFormData: HostFormData = {
  name: '',
  address: '',
  port: 22,
  username: 'root',
  auth_type: 'password',
  password: '',
  private_key: '',
  key_passphrase: '',
  group: '',
  description: '',
};

const AddHostModal = ({ host, copyingHost, onClose, onSubmit }: AddHostModalProps) => {
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState<SSHKeyResponse[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<HostFormData>(initialFormData);

  // Load key list
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

  // Populate form in edit or copy mode
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
        group: host.group || '',
        description: host.description || '',
      });
    } else if (copyingHost) {
      setFormData({
        name: `${copyingHost.name} (Copy)`,
        address: '',
        port: copyingHost.port,
        username: copyingHost.username,
        auth_type: copyingHost.auth_type,
        password: copyingHost.password || '',
        private_key: copyingHost.private_key || '',
        key_passphrase: copyingHost.key_passphrase || '',
        group: copyingHost.group || '',
        description: copyingHost.description || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [host, copyingHost]);

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      alert('Please enter host name');
      return false;
    }
    if (!formData.address.trim()) {
      alert('Please enter host address');
      return false;
    }
    if (!formData.username.trim()) {
      alert('Please enter username');
      return false;
    }
    // In edit mode, if password/private key already exists, allow not re-entering
    if (formData.auth_type === 'password' && !formData.password && !host?.has_password) {
      alert('Please enter password');
      return false;
    }
    if (formData.auth_type === 'key' && !formData.private_key && !host?.key_id) {
      alert('Please select or enter private key');
      return false;
    }
    return true;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Build submission data
      const submitData: Record<string, unknown> = {
        name: formData.name,
        address: formData.address,
        port: formData.port,
        username: formData.username,
        auth_type: formData.auth_type,
        group: formData.group,
        description: formData.description,
      };

      // Handle sensitive fields
      if (formData.auth_type === 'password') {
        if (formData.password) {
          submitData.password = formData.password;
        }
        submitData.private_key = '';
        submitData.key_passphrase = '';
      } else if (formData.auth_type === 'key') {
        if (formData.private_key && formData.private_key !== '__custom__') {
          submitData.private_key = formData.private_key;
        }
        if (formData.key_passphrase) {
          submitData.key_passphrase = formData.key_passphrase;
        }
        submitData.password = '';
      }

      console.log('Submission data:', submitData);
      console.log('Edit mode:', !!host, 'Host ID:', host?.id);

      const success = await onSubmit(submitData as CreateHostRequest | UpdateHostRequest);
      console.log('Submission result:', success);

      if (!success) {
        alert('Save failed, please try again');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Save failed, please check console logs');
    } finally {
      setLoading(false);
    }
  };

  // Get title
  const getTitle = () => {
    if (host) return 'Edit SSH Host';
    if (copyingHost) return 'Copy SSH Host';
    return 'Add SSH Host';
  };

  // Get submit button text
  const getSubmitText = () => {
    if (loading) return 'Saving...';
    if (host) return 'Save Changes';
    if (copyingHost) return 'Create Copy';
    return 'Test & Save';
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] animate-fade-in"
      style={{
        background: 'rgba(11, 13, 15, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Modal container - Railway style */}
      <div 
        className="w-full max-w-lg overflow-hidden animate-scale-in"
        style={{
          background: 'var(--bg-overlay)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header - Railway style */}
        <div className="modal-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icon container - Pure color, no gradient */}
            <div className="icon-box icon-box-lg icon-box-accent">
              <Server className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-base font-medium text-text-primary">
                {getTitle()}
              </h3>
              {copyingHost && (
                <p className="text-xs mt-0.5 text-text-tertiary">
                  Cloned from: {copyingHost.name}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          <BasicInfoFields formData={formData} setFormData={setFormData} />
          <PortUsernameFields formData={formData} setFormData={setFormData} />
          <AuthTypeSelector formData={formData} setFormData={setFormData} />

          {/* Auth Input */}
          {formData.auth_type === 'key' ? (
            <SSHKeyFields formData={formData} setFormData={setFormData} keys={keys} />
          ) : (
            <PasswordField
              formData={formData}
              setFormData={setFormData}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isEditMode={!!host}
              hasPassword={host?.has_password}
            />
          )}

          {/* Copy Mode Hint */}
          {copyingHost && <CopyModeHint copyingHostName={copyingHost.name} />}
        </div>

        {/* Footer - Railway style */}
        <div className="modal-footer flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-white rounded-lg text-sm font-medium btn-primary
                     flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
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