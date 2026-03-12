// SSH 主机类型
export interface SSHHost {
  id: number;
  name: string;
  address: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  password?: string;
  private_key?: string;
  key_passphrase?: string;
  tags: string[];
  status: 'connected' | 'disconnected' | 'warning';
  system_type?: string;
  os_key?: string;  // 操作系统标识符，用于图标映射
  os_version?: string;  // 操作系统版本号
  kernel_version?: string;  // 内核版本
  architecture?: string;    // 架构类型
  cpu_cores?: number;       // CPU核心数
  memory_gb?: number;       // 内存容量(GB)
  system_disk_total?: number;  // 系统盘总容量(GB)
  system_disk_used?: number;   // 系统盘已用(GB)
  data_disk_total?: number;    // 数据盘总容量(GB)
  data_disk_used?: number;     // 数据盘已用(GB)
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
}

// SSH 密钥类型
export interface SSHKey {
  id: number;
  name: string;
  key_type: 'rsa' | 'ed25519';
  fingerprint?: string;
  created_at?: string;
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
  tags?: string[];
  system_type?: string;
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
  tags?: string[];
  status?: 'connected' | 'disconnected' | 'warning';
  system_type?: string;
  last_seen?: string;
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