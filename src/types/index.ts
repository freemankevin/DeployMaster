// 磁盘信息类型
export interface DiskInfo {
  device: string;         // 设备名 (如 /dev/sda1 或 /dev/mapper/vg-lv)
  physical_disk: string;  // 物理磁盘 (如 /dev/sda)
  mount_point: string;    // 挂载点 (如 /, /data)
  file_system: string;    // 文件系统设备
  fs_type: string;        // 文件系统类型 (如 ext4, xfs)
  total: number;          // 总容量(字节)
  used: number;           // 已用(字节)
  free: number;           // 可用(字节)
  usage: number;          // 使用率(百分比)
  status: 'mounted' | 'unmounted' | 'unformatted';  // 状态
  is_virtual: boolean;    // 是否为虚拟文件系统
}

// SSH 主机类型
export interface SSHHost {
  id: number;
  host_id: string;  // 主机ID，格式：ins-xxxxxxxx
  name: string;
  address: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  has_password?: boolean;  // 是否已设置密码（编辑模式使用）
  password?: string;
  private_key?: string;
  key_passphrase?: string;
  key_id?: number;
  group?: string;
  description?: string;
  system_type?: string;
  os_key?: string;  // 操作系统标识符，用于图标映射
  os_version?: string;  // 操作系统版本号（完整版本，包含小版本号）
  os_pretty_name?: string;  // 完整系统版本描述，如 "Ubuntu 22.04.5 LTS"
  kernel_version?: string;  // 内核版本
  architecture?: string;    // 架构类型
  cpu_cores?: number;       // CPU核心数
  memory_gb?: number;       // 内存容量(GB)
  swap_gb?: number;         // Swap容量(GB)
  disks?: DiskInfo[];       // 磁盘信息列表
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
  // 后端返回的状态字段
  status: 'connected' | 'disconnected' | 'warning';
}

// SSH 密钥类型
export interface SSHKey {
  id: number;
  name: string;
  type: 'rsa' | 'ed25519';
  public_key?: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
}

// 创建主机请求
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

// 更新主机请求
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

// 统计信息
export interface HostStats {
  total: number;
  online: number;
  offline: number;
  key_count: number;
}

// API 响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// 命令执行结果
export interface CommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  message?: string;
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  system_info?: {
    os?: string;
    version?: string;
    hostname?: string;
  };
}

// 窗口类型
export type WindowType = 'terminal' | 'sftp';

// 窗口状态
export interface OpenWindow {
  id: string;           // 唯一窗口ID，格式：${type}-${hostId}-${timestamp}
  type: WindowType;     // 窗口类型
  hostId: number;       // 主机ID
  host: SSHHost;        // 主机信息
  isMinimized: boolean; // 是否最小化
  openedAt: number;     // 打开时间戳
}