import { keyApi, type SSHKeyResponse } from '@/services/api';

// Form data type
export interface HostFormData {
  name: string;
  address: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password: string;
  private_key: string;
  key_passphrase: string;
  group: string;
  description: string;
}

// Props for form fields
interface FormFieldsProps {
  formData: HostFormData;
  setFormData: React.Dispatch<React.SetStateAction<HostFormData>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  keys: SSHKeyResponse[];
  isEditMode: boolean;
  hasPassword?: boolean;  // Whether password is set (used in edit mode)
}

// Basic info fields (name, address, port, username)
export function BasicInfoFields({ formData, setFormData }: Pick<FormFieldsProps, 'formData' | 'setFormData'>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-server w-3.5 h-3.5 text-blue-500"></i>
          Host Name
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900 placeholder-gray-400
                   transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300"
          placeholder="e.g.: Web Server, DB Master"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-globe w-3.5 h-3.5 text-cyan-500"></i>
          IPv4 Address
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900 placeholder-gray-400 font-mono
                   transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300"
          placeholder="e.g.: 192.168.1.100"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
    </div>
  );
}

// Port and username fields
export function PortUsernameFields({ formData, setFormData }: Pick<FormFieldsProps, 'formData' | 'setFormData'>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-hashtag w-3.5 h-3.5 text-purple-500"></i>
          Port
        </label>
        <input
          type="number"
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900
                   transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300"
          value={formData.port}
          onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-user w-3.5 h-3.5 text-emerald-500"></i>
          Username
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900 placeholder-gray-400
                   font-sans transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300"
          placeholder="root"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />
      </div>
    </div>
  );
}

// Auth type selector
export function AuthTypeSelector({ formData, setFormData }: Pick<FormFieldsProps, 'formData' | 'setFormData'>) {
  return (
    <div className="space-y-2">
      <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">
        Authentication Method
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setFormData({ ...formData, auth_type: 'key' })}
          className={`px-4 py-3 rounded-xl border-2 text-[13px] font-medium 
                    transition-all duration-200 flex items-center justify-center gap-2
                    ${formData.auth_type === 'key'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
        >
          <i className="fa-solid fa-key w-4 h-4"></i>
          SSH Key
        </button>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, auth_type: 'password' })}
          className={`px-4 py-3 rounded-xl border-2 text-[13px] font-medium 
                    transition-all duration-200 flex items-center justify-center gap-2
                    ${formData.auth_type === 'password'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
        >
          <i className="fa-solid fa-lock w-4 h-4"></i>
          Password
        </button>
      </div>
    </div>
  );
}

// SSH Key auth fields
export function SSHKeyFields({
  formData,
  setFormData,
  keys
}: Pick<FormFieldsProps, 'formData' | 'setFormData' | 'keys'>) {
  // Handle file upload for private key
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setFormData({ ...formData, private_key: content });
      };
      reader.onerror = () => {
        alert('Failed to read file');
      };
      reader.readAsText(file);
    }
    // Reset input to allow re-uploading the same file
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-key w-3.5 h-3.5 text-amber-500"></i>
          Select Key
        </label>
        <select
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900
                   transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300 appearance-none cursor-pointer"
          value={formData.private_key}
          onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
        >
          <option value="">Select saved key</option>
          {keys.map((key) => (
            <option key={key.id} value={key.id.toString()}>
              {key.name} ({key.type.toUpperCase()})
            </option>
          ))}
          <option value="__custom__">+ Manually enter private key</option>
        </select>
      </div>

      {/* Manual private key input */}
      {formData.private_key === '__custom__' && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <i className="fa-solid fa-pen-to-square w-3.5 h-3.5 text-orange-500"></i>
              Private Key Content
            </label>
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100
                           text-[11px] font-medium text-emerald-600 rounded-lg cursor-pointer
                           transition-all duration-200">
              <i className="fa-solid fa-upload w-3 h-3"></i>
              Upload File
              <input
                type="file"
                accept=".pem,.key,.pub,*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <textarea
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                     text-[12px] text-gray-900 placeholder-gray-400 font-mono
                     transition-all duration-200
                     focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                     hover:border-gray-300 resize-none"
            rows={6}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
            value={formData.private_key === '__custom__' ? '' : formData.private_key}
            onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
          />
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <i className="fa-solid fa-info-circle w-3 h-3 text-blue-400"></i>
            Paste content directly or use "Upload File" to load from a .pem or .key file
          </p>
        </div>
      )}

      {/* Key Passphrase (optional) */}
      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
          <i className="fa-solid fa-shield-halved w-3.5 h-3.5 text-violet-500"></i>
          Key Passphrase <span className="text-gray-400 font-normal normal-case">(Optional)</span>
        </label>
        <input
          type="password"
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900 placeholder-gray-400
                   transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300"
          placeholder="Enter passphrase if your key is encrypted"
          value={formData.key_passphrase}
          onChange={(e) => setFormData({ ...formData, key_passphrase: e.target.value })}
        />
      </div>
    </div>
  );
}

// Password auth field
export function PasswordField({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  isEditMode,
  hasPassword
}: Pick<FormFieldsProps, 'formData' | 'setFormData' | 'showPassword' | 'setShowPassword' | 'isEditMode' | 'hasPassword'>) {
  return (
    <div className="space-y-2">
      <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
        <i className="fa-solid fa-lock w-3.5 h-3.5 text-rose-500"></i>
        Password
        {isEditMode && hasPassword && (
          <span className="ml-auto text-[11px] font-normal text-emerald-600 flex items-center gap-1">
            <i className="fa-solid fa-check-circle w-3 h-3"></i>
            Set
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className="w-full px-3 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl
                   text-[13px] text-gray-900 placeholder-gray-400
                   transition-all duration-200
                   focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
                   hover:border-gray-300"
          placeholder={isEditMode && hasPassword ? "Leave empty to keep unchanged" : "Enter password"}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1
                   text-gray-400 hover:text-gray-600
                   transition-colors rounded-md hover:bg-gray-100"
          title={showPassword ? "Hide password" : "Show password"}
        >
          <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} w-4 h-4`}></i>
        </button>
      </div>
    </div>
  );
}

// Copy mode hint
export function CopyModeHint({ copyingHostName }: { copyingHostName: string }) {
  return (
    <div className="p-4 bg-indigo-50 border border-indigo-200/60 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-copy w-4 h-4 text-indigo-600"></i>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-indigo-900">Cloning Host Configuration</p>
          <p className="text-[12px] text-indigo-700 mt-1">
            Copied authentication config from {copyingHostName}. Please fill in new host address and name.
          </p>
        </div>
      </div>
    </div>
  );
}