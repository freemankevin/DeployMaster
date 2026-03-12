"""
SSH 连接池模块
管理 SSH 连接的复用和生命周期
"""

import threading
import time
from typing import Dict, Optional

from utils.logger import get_logger
from .config import SSHConnectionConfig
from .connection import SSHConnection

logger = get_logger(__name__)


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
                    except Exception:
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