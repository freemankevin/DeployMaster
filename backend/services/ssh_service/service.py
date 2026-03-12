"""
SSH 服务模块
提供 SSH 连接测试、命令执行、终端会话等功能
"""

from typing import Dict, Any, Optional

import paramiko

from utils.logger import get_logger
from .config import SSHConnectionConfig
from .connection import SSHConnection
from .pool import connection_pool

logger = get_logger(__name__)


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