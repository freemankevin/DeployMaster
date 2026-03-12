"""
SSH 连接模块
管理 SSH 连接的建立、命令执行和关闭
"""

import paramiko
import socket
from typing import Optional, Dict, Any, TYPE_CHECKING

from utils.logger import get_logger
from .config import SSHConnectionConfig
from .system_detection import SystemDetector

if TYPE_CHECKING:
    import paramiko

logger = get_logger(__name__)


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
                auth_type = 'key'
            elif self.config.password:
                # 使用密码认证
                connect_kwargs['password'] = self.config.password
                auth_type = 'password'
            else:
                raise ValueError("必须提供密码或私钥")

            # 建立连接
            self.client.connect(**connect_kwargs)
            self.is_connected = True

            # 获取系统信息
            self._detect_system()

            logger.info(f"SSH 连接成功 | {self.config.username}@{self.config.host}:{self.config.port} | auth={auth_type}")
            return True

        except paramiko.AuthenticationException as e:
            self.last_error = f"认证失败: {str(e)}"
            logger.error(f"SSH 认证失败 | {self.config.host} | {e}")
        except paramiko.SSHException as e:
            self.last_error = f"SSH 错误: {str(e)}"
            logger.error(f"SSH 连接错误 | {self.config.host} | {e}")
        except socket.error as e:
            self.last_error = f"网络错误: {str(e)}"
            logger.error(f"SSH 网络错误 | {self.config.host} | {e}")
        except Exception as e:
            self.last_error = f"连接失败: {str(e)}"
            logger.error(f"SSH 连接异常 | {self.config.host} | {e}")

        self.is_connected = False
        return False

    def _detect_system(self):
        """检测远程系统信息"""
        if not self.client:
            return
        
        detector = SystemDetector(self.client)
        self.system_info = detector.detect_system()
        
        # 检查是否有错误信息
        if 'error' in self.system_info:
            self.last_error = self.system_info['error']

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
            logger.debug(f"执行命令 | {self.config.host} | {command[:50]}...")
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
            logger.error(f"命令执行失败 | {self.config.host} | {e}")
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
            transport = self._get_active_transport()
            if not transport:
                return None

            channel = transport.open_session()
            # 设置终端大小 (默认 80x24)
            channel.get_pty(term='xterm-256color', width=80, height=24)
            channel.invoke_shell()
            logger.info(f"Shell 会话已打开 | {self.config.username}@{self.config.host}")
            return channel
        except Exception as e:
            logger.error(f"获取 shell 失败 | {self.config.host} | {e}")
            return None

    def _get_active_transport(self) -> Optional[paramiko.Transport]:
        """获取活跃的传输通道"""
        if not self.client:
            return None
            
        transport = self.client.get_transport()
        if not transport:
            logger.error("SSH transport is None")
            return None

        # 检查 transport 是否活跃
        if not transport.is_active():
            logger.warning("SSH transport 不活跃，尝试重新连接...")
            if not self.connect():
                return None
            transport = self.client.get_transport() if self.client else None
            if not transport or not transport.is_active():
                return None

        return transport

    def open_sftp(self) -> bool:
        """打开 SFTP 会话"""
        if not self.is_connected or not self.client:
            return False

        try:
            self.sftp = self.client.open_sftp()
            return True
        except Exception as e:
            logger.error(f"SFTP 打开失败 | {self.config.host} | {e}")
            return False

    def close(self):
        """关闭连接"""
        if self.sftp:
            try:
                self.sftp.close()
            except Exception:
                pass
            self.sftp = None

        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None

        self.is_connected = False
        logger.info(f"SSH 连接已关闭 | {self.config.host}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()