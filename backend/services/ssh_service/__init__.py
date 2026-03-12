"""
SSH 服务模块
处理 SSH 连接、命令执行和文件传输
仅支持 Linux 系统
"""

from .config import SSHConnectionConfig
from .connection import SSHConnection
from .pool import SSHConnectionPool, connection_pool
from .service import SSHService
from .system_detection import SystemDetector
from .hardware import HardwareDetector
from .version import VersionDetector

__all__ = [
    'SSHConnectionConfig',
    'SSHConnection',
    'SSHConnectionPool',
    'connection_pool',
    'SSHService',
    'SystemDetector',
    'HardwareDetector',
    'VersionDetector',
]