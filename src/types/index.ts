// Disk information type
export interface DiskInfo {
  device: string;         // Device name (e.g., /dev/sda1 or /dev/mapper/vg-lv)
  physical_disk: string;  // Physical disk (e.g., /dev/sda)
  mount_point: string;    // Mount point (e.g., /, /data)
  file_system: string;    // File system device
  fs_type: string;        // File system type (e.g., ext4, xfs)
  total: number;          // Total capacity (bytes)
  used: number;           // Used (bytes)
  free: number;           // Available (bytes)
  usage: number;          // Usage percentage
  status: 'mounted' | 'unmounted' | 'unformatted';  // Status
  is_virtual: boolean;    // Whether it's a virtual file system
}

// SSH Host type
export interface SSHHost {
  id: number;
  host_id: string;  // Host ID, format: ins-xxxxxxxx
  name: string;
  address: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  has_password?: boolean;  // Whether password is set (used in edit mode)
  password?: string;
  private_key?: string;
  key_passphrase?: string;
  key_id?: number;
  group?: string;
  description?: string;
  system_type?: string;
  os_key?: string;  // OS identifier for icon mapping
  os_version?: string;  // OS version number (full version including minor version)
  os_pretty_name?: string;  // Full system version description, e.g., "Ubuntu 22.04.5 LTS"
  kernel_version?: string;  // Kernel version
  architecture?: string;    // Architecture type
  cpu_cores?: number;       // CPU core count
  memory_gb?: number;       // Memory capacity (GB)
  swap_gb?: number;         // Swap capacity (GB)
  disks?: DiskInfo[];       // Disk information list
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
  // Status field returned by backend
  status: 'connected' | 'disconnected' | 'warning';
}

// SSH Key type
export interface SSHKey {
  id: number;
  name: string;
  type: 'rsa' | 'ed25519';
  public_key?: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

// Create host request
export interface CreateHostRequest {
  name: string;
  address: string;
  port?: number;
  username: string;
  auth_type: 'password' | 'key';
  password?: string;
  private_key?: string;
  key_passphrase?: string;
  group?: string;
  description?: string;
}

// Update host request
export interface UpdateHostRequest {
  name?: string;
  address?: string;
  port?: number;
  username?: string;
  auth_type?: 'password' | 'key';
  password?: string;
  private_key?: string;
  key_passphrase?: string;
  group?: string;
  description?: string;
}

// Statistics
export interface HostStats {
  total: number;
  online: number;
  offline: number;
  key_count: number;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// Command execution result
export interface CommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  message?: string;
}

// Connection test result
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  system_info?: {
    os?: string;
    version?: string;
    hostname?: string;
  };
}

// Window type
export type WindowType = 'terminal' | 'sftp';

// Window state
export interface OpenWindow {
  id: string;           // Unique window ID, format: ${type}-${hostId}-${timestamp}
  type: WindowType;     // Window type
  hostId: number;       // Host ID
  host: SSHHost;        // Host information
  isMinimized: boolean; // Whether minimized
  openedAt: number;     // Open timestamp
}