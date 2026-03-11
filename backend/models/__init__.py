"""
模型模块初始化
"""

from models.schemas import (
    AuthType, HostStatus, KeyType,
    HostBase, HostCreate, HostUpdate, HostResponse,
    HostListResponse, HostSingleResponse,
    SSHKeyBase, SSHKeyCreate, SSHKeyGenerate, SSHKeyResponse, SSHKeyListResponse,
    CommandExecute, CommandResult,
    ConnectionTestResult, HostStats, StatsResponse,
    MessageResponse, ErrorResponse
)

__all__ = [
    'AuthType', 'HostStatus', 'KeyType',
    'HostBase', 'HostCreate', 'HostUpdate', 'HostResponse',
    'HostListResponse', 'HostSingleResponse',
    'SSHKeyBase', 'SSHKeyCreate', 'SSHKeyGenerate', 'SSHKeyResponse', 'SSHKeyListResponse',
    'CommandExecute', 'CommandResult',
    'ConnectionTestResult', 'HostStats', 'StatsResponse',
    'MessageResponse', 'ErrorResponse'
]