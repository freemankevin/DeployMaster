"""
SSH 服务模块
处理 SSH 连接、命令执行和文件传输
仅支持 Linux 系统
"""

import paramiko
import socket
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime
import threading
import time

from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class SSHConnectionConfig:
    """SSH 连接配置"""
    host: str
    port: int = 22
    username: str = ""
    password: Optional[str] = None
    private_key: Optional[str] = None
    key_passphrase: Optional[str] = None
    timeout: int = 30


class SSHConnection:
    """SSH 连接管理类"""

    def __init__(self, config: SSHConnectionConfig):
        self.config = config
        self.client: Optional[paramiko.SSHClient] = None
        self.sftp: Optional[paramiko.SFTPClient] = None
        self.is_connected = False
        self.last_error: Optional[str] = None
        self.system_info: Dict[str, Any] = {}

    def connect(self) -> bool:
        """建立 SSH 连接"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # 准备连接参数
            connect_kwargs = {
                'hostname': self.config.host,
                'port': self.config.port,
                'username': self.config.username,
                'timeout': self.config.timeout,
                'look_for_keys': False,
            }

            # 根据认证方式添加参数
            if self.config.private_key:
                # 使用密钥认证
                private_key = paramiko.RSAKey.from_private_key(
                    file_obj=__import__('io').StringIO(self.config.private_key),
                    password=self.config.key_passphrase
                )
                connect_kwargs['pkey'] = private_key
            elif self.config.password:
                # 使用密码认证
                connect_kwargs['password'] = self.config.password
            else:
                raise ValueError("必须提供密码或私钥")

            # 建立连接
            self.client.connect(**connect_kwargs)
            self.is_connected = True

            # 获取系统信息
            self._detect_system()

            logger.info(f"SSH 连接成功: {self.config.username}@{self.config.host}:{self.config.port}")
            return True

        except paramiko.AuthenticationException as e:
            self.last_error = f"认证失败: {str(e)}"
            logger.error(f"SSH 认证失败: {self.config.host} - {e}")
        except paramiko.SSHException as e:
            self.last_error = f"SSH 错误: {str(e)}"
            logger.error(f"SSH 连接错误: {self.config.host} - {e}")
        except socket.error as e:
            self.last_error = f"网络错误: {str(e)}"
            logger.error(f"SSH 网络错误: {self.config.host} - {e}")
        except Exception as e:
            self.last_error = f"连接失败: {str(e)}"
            logger.error(f"SSH 连接异常: {self.config.host} - {e}")

        self.is_connected = False
        return False

    def _detect_system(self):
        """检测远程系统信息 - 仅支持 Linux 系统"""
        if not self.client:
            return
        try:
            # 执行 uname 命令获取系统信息
            stdin, stdout, stderr = self.client.exec_command('uname -a')
            uname_output = stdout.read().decode().strip()
            stderr_output = stderr.read().decode().strip()

            if uname_output:
                self.system_info['kernel'] = uname_output

                # 使用 uname -m 获取准确的架构信息
                try:
                    stdin, stdout, stderr = self.client.exec_command('uname -m')
                    arch_output = stdout.read().decode().strip()
                    if arch_output:
                        self.system_info['architecture'] = arch_output
                except:
                    pass

                # 检测操作系统类型
                if 'Linux' in uname_output:
                    self._detect_linux_distro()
                    self._get_linux_hardware_info()
                else:
                    # 非 Linux 系统，标记为不支持
                    self.system_info['os'] = 'Unsupported'
                    self.system_info['os_key'] = 'unknown'
                    self.system_info['icon'] = 'server'
                    self.system_info['color'] = '#94a3b8'
                    self.last_error = "仅支持 Linux 系统"
            else:
                self.system_info['os'] = 'Unknown'
                self.system_info['os_key'] = 'unknown'
                self.system_info['icon'] = 'server'
                self.system_info['color'] = '#94a3b8'

        except Exception as e:
            logger.warning(f"系统检测失败: {e}")
            self.system_info['os'] = 'Unknown'
            self.system_info['os_key'] = 'unknown'
            self.system_info['icon'] = 'server'
            self.system_info['color'] = '#94a3b8'

    def _get_linux_hardware_info(self):
        """获取 Linux 硬件信息"""
        try:
            # 获取 CPU 核心数 - 尝试多种方法
            cpu_cores = 0
            try:
                stdin, stdout, stderr = self.client.exec_command('nproc 2>/dev/null')
                output = stdout.read().decode().strip()
                if output and output.isdigit():
                    cpu_cores = int(output)
            except:
                pass

            if cpu_cores == 0:
                try:
                    stdin, stdout, stderr = self.client.exec_command('grep -c ^processor /proc/cpuinfo 2>/dev/null')
                    output = stdout.read().decode().strip()
                    if output and output.isdigit():
                        cpu_cores = int(output)
                except:
                    pass

            self.system_info['cpu_cores'] = cpu_cores if cpu_cores > 0 else None

            # 获取内存信息 (GB) - 尝试多种方法
            memory_gb = 0
            try:
                # 方法1: 使用 free 命令（最通用）
                stdin, stdout, stderr = self.client.exec_command("free -m | grep Mem | awk '{print $2}'")
                output = stdout.read().decode().strip()
                if output:
                    # 尝试解析数字（可能包含小数）
                    try:
                        memory_mb = float(output)
                        memory_gb = round(memory_mb / 1024, 1)
                    except ValueError:
                        pass
            except:
                pass

            if memory_gb == 0:
                try:
                    # 方法2: 使用 /proc/meminfo
                    stdin, stdout, stderr = self.client.exec_command("cat /proc/meminfo | grep MemTotal | awk '{print $2}'")
                    output = stdout.read().decode().strip()
                    if output:
                        try:
                            memory_kb = float(output)
                            memory_gb = round(memory_kb / (1024 * 1024), 1)
                        except ValueError:
                            pass
                except:
                    pass

            if memory_gb == 0:
                try:
                    # 方法3: 使用 vmstat
                    stdin, stdout, stderr = self.client.exec_command("vmstat -s | grep 'total memory' | awk '{print $1}'")
                    output = stdout.read().decode().strip()
                    if output:
                        try:
                            memory_pages = float(output)
                            # 假设页面大小为 4KB
                            memory_gb = round((memory_pages * 4) / (1024 * 1024), 1)
                        except ValueError:
                            pass
                except:
                    pass

            self.system_info['memory_gb'] = memory_gb if memory_gb > 0 else None

            # 获取内核版本
            try:
                stdin, stdout, stderr = self.client.exec_command('uname -r 2>/dev/null')
                kernel_version = stdout.read().decode().strip()
                if kernel_version:
                    self.system_info['kernel_version'] = kernel_version
            except:
                self.system_info['kernel_version'] = None

        except Exception as e:
            logger.warning(f"获取 Linux 硬件信息失败: {e}")
            self.system_info['cpu_cores'] = None
            self.system_info['memory_gb'] = None
            self.system_info['kernel_version'] = None

    def _detect_linux_distro(self):
        """检测 Linux 发行版 - 支持国内外主流系统"""
        try:
            # 尝试获取发行版信息
            stdin, stdout, stderr = self.client.exec_command(
                'cat /etc/os-release 2>/dev/null || echo "Unknown"'
            )
            os_info = stdout.read().decode()

            # 转换为小写便于匹配
            os_info_lower = os_info.lower()

            # 国外开源/商业系统
            if 'ubuntu' in os_info_lower:
                self.system_info['os'] = 'Ubuntu'
                self.system_info['os_key'] = 'ubuntu'
                self.system_info['icon'] = 'ubuntu'
                self.system_info['color'] = '#E95420'
            elif 'debian' in os_info_lower:
                self.system_info['os'] = 'Debian'
                self.system_info['os_key'] = 'debian'
                self.system_info['icon'] = 'debian'
                self.system_info['color'] = '#A81C33'
            elif 'centos' in os_info_lower:
                self.system_info['os'] = 'CentOS'
                self.system_info['os_key'] = 'centos'
                self.system_info['icon'] = 'centos'
                self.system_info['color'] = '#932279'
            elif 'rhel' in os_info_lower or 'red hat' in os_info_lower:
                self.system_info['os'] = 'RHEL'
                self.system_info['os_key'] = 'rhel'
                self.system_info['icon'] = 'redhat'
                self.system_info['color'] = '#EE0000'
            elif 'fedora' in os_info_lower:
                self.system_info['os'] = 'Fedora'
                self.system_info['os_key'] = 'fedora'
                self.system_info['icon'] = 'fedora'
                self.system_info['color'] = '#294172'
            elif 'arch' in os_info_lower:
                self.system_info['os'] = 'Arch Linux'
                self.system_info['os_key'] = 'arch'
                self.system_info['icon'] = 'arch'
                self.system_info['color'] = '#1793D1'
            elif 'alpine' in os_info_lower:
                self.system_info['os'] = 'Alpine'
                self.system_info['os_key'] = 'alpine'
                self.system_info['icon'] = 'alpine'
                self.system_info['color'] = '#0D597F'
            elif 'opensuse' in os_info_lower or 'suse' in os_info_lower:
                self.system_info['os'] = 'openSUSE'
                self.system_info['os_key'] = 'opensuse'
                self.system_info['icon'] = 'opensuse'
                self.system_info['color'] = '#73BA25'
            elif 'kali' in os_info_lower:
                self.system_info['os'] = 'Kali Linux'
                self.system_info['os_key'] = 'kali'
                self.system_info['icon'] = 'kali'
                self.system_info['color'] = '#367BF0'
            elif 'gentoo' in os_info_lower:
                self.system_info['os'] = 'Gentoo'
                self.system_info['os_key'] = 'gentoo'
                self.system_info['icon'] = 'gentoo'
                self.system_info['color'] = '#54487A'
            elif 'manjaro' in os_info_lower:
                self.system_info['os'] = 'Manjaro'
                self.system_info['os_key'] = 'manjaro'
                self.system_info['icon'] = 'manjaro'
                self.system_info['color'] = '#35BF5C'
            elif 'mint' in os_info_lower:
                self.system_info['os'] = 'Linux Mint'
                self.system_info['os_key'] = 'mint'
                self.system_info['icon'] = 'mint'
                self.system_info['color'] = '#87CF3E'
            # 国内开源/商业系统
            elif 'kylin' in os_info_lower or '麒麟' in os_info:
                self.system_info['os'] = 'Kylin'
                self.system_info['os_key'] = 'kylin'
                self.system_info['icon'] = 'kylin'
                self.system_info['color'] = '#C41E3A'
            elif 'uos' in os_info_lower or '统信' in os_info:
                self.system_info['os'] = 'UOS'
                self.system_info['os_key'] = 'uos'
                self.system_info['icon'] = 'uos'
                self.system_info['color'] = '#2B5F8E'
            elif 'deepin' in os_info_lower:
                self.system_info['os'] = 'Deepin'
                self.system_info['os_key'] = 'deepin'
                self.system_info['icon'] = 'deepin'
                self.system_info['color'] = '#0078D4'
            elif 'redflag' in os_info_lower or '红旗' in os_info:
                self.system_info['os'] = 'RedFlag'
                self.system_info['os_key'] = 'redflag'
                self.system_info['icon'] = 'redflag'
                self.system_info['color'] = '#CC0000'
            elif 'neokylin' in os_info_lower or '方德' in os_info:
                self.system_info['os'] = 'NeoKylin'
                self.system_info['os_key'] = 'neokylin'
                self.system_info['icon'] = 'neokylin'
                self.system_info['color'] = '#1E50A2'
            elif 'openeuler' in os_info_lower or '欧拉' in os_info:
                self.system_info['os'] = 'openEuler'
                self.system_info['os_key'] = 'openeuler'
                self.system_info['icon'] = 'openeuler'
                self.system_info['color'] = '#002C5F'
            elif 'anolis' in os_info_lower or '龙蜥' in os_info:
                self.system_info['os'] = 'Anolis OS'
                self.system_info['os_key'] = 'anolis'
                self.system_info['icon'] = 'anolis'
                self.system_info['color'] = '#F5222D'
            elif 'alibaba' in os_info_lower or 'alios' in os_info_lower or 'alinux' in os_info_lower:
                self.system_info['os'] = 'Alibaba Cloud Linux'
                self.system_info['os_key'] = 'alibaba'
                self.system_info['icon'] = 'alibaba'
                self.system_info['color'] = '#FF6A00'
            elif 'tencentos' in os_info_lower or 'tlinux' in os_info_lower:
                self.system_info['os'] = 'TencentOS'
                self.system_info['os_key'] = 'tencent'
                self.system_info['icon'] = 'tencent'
                self.system_info['color'] = '#0052D9'
            elif 'rocky' in os_info_lower:
                self.system_info['os'] = 'Rocky Linux'
                self.system_info['os_key'] = 'rocky'
                self.system_info['icon'] = 'rocky'
                self.system_info['color'] = '#10B981'
            elif 'almalinux' in os_info_lower:
                self.system_info['os'] = 'AlmaLinux'
                self.system_info['os_key'] = 'almalinux'
                self.system_info['icon'] = 'almalinux'
                self.system_info['color'] = '#082336'
            elif 'oracle' in os_info_lower:
                self.system_info['os'] = 'Oracle Linux'
                self.system_info['os_key'] = 'oracle'
                self.system_info['icon'] = 'oracle'
                self.system_info['color'] = '#F80000'
            elif 'amazon' in os_info_lower:
                self.system_info['os'] = 'Amazon Linux'
                self.system_info['os_key'] = 'amazon'
                self.system_info['icon'] = 'amazon'
                self.system_info['color'] = '#FF9900'
            else:
                # 通用 Linux
                self.system_info['os'] = 'Linux'
                self.system_info['os_key'] = 'linux'
                self.system_info['icon'] = 'linux'
                self.system_info['color'] = '#FCC624'

        except Exception as e:
            logger.warning(f"Linux 发行版检测失败: {e}")
            self.system_info['os'] = 'Linux'
            self.system_info['os_key'] = 'linux'
            self.system_info['icon'] = 'linux'
            self.system_info['color'] = '#FCC624'

    def execute_command(self, command: str, timeout: int = 60) -> Dict[str, Any]:
        """执行远程命令"""
        if not self.is_connected or not self.client:
            return {
                'success': False,
                'stdout': '',
                'stderr': '未连接到服务器',
                'exit_code': -1
            }

        try:
            logger.debug(f"执行命令: {command}")
            stdin, stdout, stderr = self.client.exec_command(command, timeout=timeout)

            exit_code = stdout.channel.recv_exit_status()
            stdout_data = stdout.read().decode('utf-8', errors='replace')
            stderr_data = stderr.read().decode('utf-8', errors='replace')

            return {
                'success': exit_code == 0,
                'stdout': stdout_data,
                'stderr': stderr_data,
                'exit_code': exit_code
            }

        except Exception as e:
            logger.error(f"命令执行失败: {e}")
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'exit_code': -1
            }

    def get_shell(self) -> Optional[paramiko.Channel]:
        """获取交互式 shell"""
        if not self.is_connected or not self.client:
            # 尝试重新连接
            if not self.connect():
                return None

        try:
            transport = self.client.get_transport()
            if not transport:
                logger.error("SSH transport is None")
                return None

            # 检查 transport 是否活跃
            if not transport.is_active():
                logger.error("SSH transport is not active, trying to reconnect...")
                if not self.connect():
                    return None
                transport = self.client.get_transport()
                if not transport or not transport.is_active():
                    return None

            channel = transport.open_session()
            # 设置终端大小 (默认 80x24)
            channel.get_pty(term='xterm-256color', width=80, height=24)
            channel.invoke_shell()
            logger.info(f"Shell session opened for {self.config.username}@{self.config.host}")
            return channel
        except Exception as e:
            logger.error(f"获取 shell 失败: {e}")
            return None

    def open_sftp(self) -> bool:
        """打开 SFTP 会话"""
        if not self.is_connected or not self.client:
            return False

        try:
            self.sftp = self.client.open_sftp()
            return True
        except Exception as e:
            logger.error(f"SFTP 打开失败: {e}")
            return False

    def close(self):
        """关闭连接"""
        if self.sftp:
            try:
                self.sftp.close()
            except:
                pass
            self.sftp = None

        if self.client:
            try:
                self.client.close()
            except:
                pass
            self.client = None

        self.is_connected = False
        logger.info(f"SSH 连接已关闭: {self.config.host}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class SSHConnectionPool:
    """SSH 连接池管理"""

    def __init__(self, max_connections: int = 10):
        self.connections: Dict[int, SSHConnection] = {}
        self.max_connections = max_connections
        self._lock = threading.Lock()
        self._monitor_thread = threading.Thread(target=self._monitor_connections, daemon=True)
        self._monitor_thread.start()

    def get_connection(self, host_id: int, config: SSHConnectionConfig) -> Optional[SSHConnection]:
        """获取或创建连接"""
        with self._lock:
            # 检查现有连接
            if host_id in self.connections:
                conn = self.connections[host_id]
                if conn.is_connected:
                    return conn
                else:
                    # 连接已断开，移除
                    del self.connections[host_id]

            # 创建新连接
            if len(self.connections) >= self.max_connections:
                # 移除最旧的连接
                oldest_id = min(self.connections.keys())
                self.connections[oldest_id].close()
                del self.connections[oldest_id]

            conn = SSHConnection(config)
            if conn.connect():
                self.connections[host_id] = conn
                return conn

            return None

    def close_connection(self, host_id: int):
        """关闭指定连接"""
        with self._lock:
            if host_id in self.connections:
                self.connections[host_id].close()
                del self.connections[host_id]

    def _monitor_connections(self):
        """监控连接状态"""
        while True:
            time.sleep(30)  # 每 30 秒检查一次
            with self._lock:
                for host_id, conn in list(self.connections.items()):
                    try:
                        # 发送 keepalive
                        if conn.client:
                            transport = conn.client.get_transport()
                            if transport:
                                transport.send_ignore()
                    except:
                        # 连接已断开
                        conn.is_connected = False

    def close_all(self):
        """关闭所有连接"""
        with self._lock:
            for conn in self.connections.values():
                conn.close()
            self.connections.clear()


# 全局连接池
connection_pool = SSHConnectionPool()


class SSHService:
    """SSH 服务类"""

    @staticmethod
    def test_connection(host_data: Dict[str, Any]) -> Dict[str, Any]:
        """测试 SSH 连接"""
        config = SSHConnectionConfig(
            host=host_data['address'],
            port=host_data.get('port', 22),
            username=host_data['username'],
            password=host_data.get('password'),
            private_key=host_data.get('private_key'),
            key_passphrase=host_data.get('key_passphrase')
        )

        conn = SSHConnection(config)
        success = conn.connect()

        result = {
            'success': success,
            'message': '连接成功' if success else conn.last_error,
            'system_info': conn.system_info if success else None
        }

        conn.close()
        return result

    @staticmethod
    def execute_on_host(host_data: Dict[str, Any], command: str) -> Dict[str, Any]:
        """在指定主机上执行命令"""
        config = SSHConnectionConfig(
            host=host_data['address'],
            port=host_data.get('port', 22),
            username=host_data['username'],
            password=host_data.get('password'),
            private_key=host_data.get('private_key'),
            key_passphrase=host_data.get('key_passphrase')
        )

        host_id = host_data.get('id', 0)
        conn = connection_pool.get_connection(host_id, config)

        if not conn:
            return {
                'success': False,
                'stdout': '',
                'stderr': '无法建立连接',
                'exit_code': -1
            }

        return conn.execute_command(command)

    @staticmethod
    def get_terminal_session(host_data: Dict[str, Any]) -> Optional[paramiko.Channel]:
        """获取终端会话"""
        config = SSHConnectionConfig(
            host=host_data['address'],
            port=host_data.get('port', 22),
            username=host_data['username'],
            password=host_data.get('password'),
            private_key=host_data.get('private_key'),
            key_passphrase=host_data.get('key_passphrase')
        )

        host_id = host_data.get('id', 0)
        conn = connection_pool.get_connection(host_id, config)

        if conn:
            return conn.get_shell()
        return None

    @staticmethod
    def disconnect_host(host_id: int):
        """断开主机连接"""
        connection_pool.close_connection(host_id)
