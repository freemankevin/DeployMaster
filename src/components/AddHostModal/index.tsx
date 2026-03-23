import { useState, useEffect } from 'react';
import type { SSHHost, CreateHostRequest, UpdateHostRequest } from '@/types';
import { keyApi, type SSHKeyResponse } from '@/services/api';
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
        alert('Failed to save, please try again');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to save, please check console logs');
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
    return 'Test and Save';
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in 
                    border border-gray-200/60 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 
                          flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-server w-5 h-5 text-white"></i>
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-gray-900">
                {getTitle()}
              </h3>
              {copyingHost && (
                <p className="text-[12px] text-gray-500">
                  Cloned from: {copyingHost.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                     rounded-lg transition-all duration-200"
          >
            <i className="fa-solid fa-xmark w-5 h-5"></i>
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 
                     hover:text-gray-800 hover:bg-gray-200/50 
                     transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl 
                     text-[13px] font-medium transition-all duration-200 
                     flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-[0_0.5px_1px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                     hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                     hover:brightness-105 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin w-4 h-4"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fa-solid fa-plug w-4 h-4"></i>
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