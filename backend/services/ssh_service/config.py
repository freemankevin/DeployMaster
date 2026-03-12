"""
SSH 连接配置模块
定义 SSH 连接的配置数据类
"""

from dataclasses import dataclass
from typing import Optional


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