"""
数据库管理模块
使用 SQLite 存储 SSH 主机信息和配置
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
from contextlib import contextmanager

from utils.logger import get_logger

logger = get_logger(__name__)


class DatabaseManager:
    """SQLite 数据库管理器"""
    
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # 默认数据库路径
            db_dir = Path(__file__).parent.parent / 'data'
            db_dir.mkdir(exist_ok=True)
            db_path = db_dir / 'deploymaster.db'
        
        self.db_path = str(db_path)
        self._init_tables()
    
    @contextmanager
    def _get_connection(self):
        """获取数据库连接的上下文管理器"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _init_tables(self):
        """初始化数据库表结构"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # SSH 主机表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ssh_hosts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    port INTEGER DEFAULT 22,
                    username TEXT NOT NULL,
                    auth_type TEXT DEFAULT 'password',
                    password TEXT,
                    private_key TEXT,
                    key_passphrase TEXT,
                    tags TEXT DEFAULT '[]',
                    status TEXT DEFAULT 'disconnected',
                    system_type TEXT,
                    os_key TEXT,
                    kernel_version TEXT,
                    architecture TEXT,
                    cpu_cores INTEGER,
                    memory_gb REAL,
                    last_seen TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 检查并添加 os_key 列（兼容旧数据库）
            try:
                cursor.execute('SELECT os_key FROM ssh_hosts LIMIT 1')
            except sqlite3.OperationalError:
                cursor.execute('ALTER TABLE ssh_hosts ADD COLUMN os_key TEXT')
                logger.info("添加 os_key 列到 ssh_hosts 表")
            
            # 检查并添加系统信息列（兼容旧数据库）
            new_columns = [
                ('kernel_version', 'TEXT'),
                ('architecture', 'TEXT'),
                ('cpu_cores', 'INTEGER'),
                ('memory_gb', 'REAL'),
                ('os_version', 'TEXT'),  # 操作系统版本号
                ('system_disk_total', 'REAL'),  # 系统盘总容量(GB)
                ('system_disk_used', 'REAL'),   # 系统盘已用(GB)
                ('data_disk_total', 'REAL'),    # 数据盘总容量(GB)
                ('data_disk_used', 'REAL'),     # 数据盘已用(GB)
            ]
            for col_name, col_type in new_columns:
                try:
                    cursor.execute(f'SELECT {col_name} FROM ssh_hosts LIMIT 1')
                except sqlite3.OperationalError:
                    cursor.execute(f'ALTER TABLE ssh_hosts ADD COLUMN {col_name} {col_type}')
                    logger.info(f"添加 {col_name} 列到 ssh_hosts 表")
            
            # SSH 密钥表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ssh_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    key_type TEXT DEFAULT 'rsa',
                    private_key TEXT NOT NULL,
                    public_key TEXT,
                    fingerprint TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 部署历史表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS deployment_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    host_id INTEGER,
                    action TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    output TEXT,
                    error_message TEXT,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    FOREIGN KEY (host_id) REFERENCES ssh_hosts(id)
                )
            ''')
            
            logger.info("数据库表初始化完成")
    
    # ==================== SSH 主机操作 ====================
    
    def add_host(self, host_data: Dict[str, Any]) -> int:
        """添加 SSH 主机"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 将 tags 列表转换为 JSON 字符串
            tags = json.dumps(host_data.get('tags', []))
            
            cursor.execute('''
                INSERT INTO ssh_hosts 
                (name, address, port, username, auth_type, password, 
                 private_key, key_passphrase, tags, system_type, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                host_data['name'],
                host_data['address'],
                host_data.get('port', 22),
                host_data['username'],
                host_data.get('auth_type', 'password'),
                host_data.get('password'),
                host_data.get('private_key'),
                host_data.get('key_passphrase'),
                tags,
                host_data.get('system_type', 'Linux'),
                'disconnected'
            ))
            
            host_id = cursor.lastrowid
            if host_id is None:
                raise RuntimeError("Failed to get lastrowid after insert")
            logger.info(f"添加主机成功: {host_data['name']} (ID: {host_id})")
            return host_id
    
    def get_host(self, host_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取主机信息"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM ssh_hosts WHERE id = ?', (host_id,))
            row = cursor.fetchone()
            
            if row:
                return self._row_to_dict(row)
            return None
    
    def get_all_hosts(self) -> List[Dict[str, Any]]:
        """获取所有主机"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM ssh_hosts ORDER BY created_at DESC')
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    def update_host(self, host_id: int, updates: Dict[str, Any]) -> bool:
        """更新主机信息"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 构建更新语句
            allowed_fields = ['name', 'address', 'port', 'username', 
                            'auth_type', 'password', 'private_key', 
                            'key_passphrase', 'tags', 'status', 
                            'system_type', 'os_key', 'last_seen',
                            'kernel_version', 'architecture', 'cpu_cores', 'memory_gb',
                            'os_version', 'system_disk_total', 'system_disk_used',
                            'data_disk_total', 'data_disk_used']
            
            set_clauses = []
            values = []
            
            for key, value in updates.items():
                if key in allowed_fields:
                    if key == 'tags' and isinstance(value, list):
                        value = json.dumps(value)
                    set_clauses.append(f"{key} = ?")
                    values.append(value)
            
            if not set_clauses:
                return False
            
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            values.append(host_id)
            
            query = f"UPDATE ssh_hosts SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(query, values)
            
            success = cursor.rowcount > 0
            if success:
                logger.info(f"更新主机成功: ID {host_id}")
            return success
    
    def delete_host(self, host_id: int) -> bool:
        """删除主机"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM ssh_hosts WHERE id = ?', (host_id,))
            success = cursor.rowcount > 0
            if success:
                logger.info(f"删除主机成功: ID {host_id}")
            return success
    
    def search_hosts(self, query: str) -> List[Dict[str, Any]]:
        """搜索主机"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            search_pattern = f"%{query}%"
            cursor.execute('''
                SELECT * FROM ssh_hosts 
                WHERE name LIKE ? OR address LIKE ? OR username LIKE ?
                ORDER BY created_at DESC
            ''', (search_pattern, search_pattern, search_pattern))
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    def get_host_stats(self) -> Dict[str, int]:
        """获取主机统计信息"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM ssh_hosts')
            total = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM ssh_hosts WHERE status = 'connected'")
            online = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM ssh_hosts WHERE auth_type = 'key'")
            key_count = cursor.fetchone()[0]
            
            return {
                'total': total,
                'online': online,
                'offline': total - online,
                'key_count': key_count
            }
    
    # ==================== SSH 密钥操作 ====================
    
    def add_ssh_key(self, key_data: Dict[str, Any]) -> int:
        """添加 SSH 密钥"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ssh_keys (name, key_type, private_key, public_key, fingerprint)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                key_data['name'],
                key_data.get('key_type', 'rsa'),
                key_data['private_key'],
                key_data.get('public_key'),
                key_data.get('fingerprint')
            ))
            key_id = cursor.lastrowid
            if key_id is None:
                raise RuntimeError("Failed to get lastrowid after insert")
            return key_id
    
    def get_all_ssh_keys(self) -> List[Dict[str, Any]]:
        """获取所有 SSH 密钥"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM ssh_keys ORDER BY created_at DESC')
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    def get_ssh_key(self, key_id: int) -> Optional[Dict[str, Any]]:
        """获取单个 SSH 密钥"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM ssh_keys WHERE id = ?', (key_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
            return None
    
    def delete_ssh_key(self, key_id: int) -> bool:
        """删除 SSH 密钥"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM ssh_keys WHERE id = ?', (key_id,))
            return cursor.rowcount > 0
    
    # ==================== 部署历史操作 ====================
    
    def add_deployment_record(self, record: Dict[str, Any]) -> int:
        """添加部署记录"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO deployment_history 
                (host_id, action, status, output, error_message)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                record.get('host_id'),
                record['action'],
                record.get('status', 'pending'),
                record.get('output'),
                record.get('error_message')
            ))
            record_id = cursor.lastrowid
            if record_id is None:
                raise RuntimeError("Failed to get lastrowid after insert")
            return record_id
    
    def update_deployment_status(self, record_id: int, status: str, 
                                  output: Optional[str] = None, error: Optional[str] = None):
        """更新部署状态"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE deployment_history 
                SET status = ?, output = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (status, output, error, record_id))
    
    def get_deployment_history(self, host_id: Optional[int] = None, limit: int = 50) -> List[Dict]:
        """获取部署历史"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if host_id:
                cursor.execute('''
                    SELECT * FROM deployment_history 
                    WHERE host_id = ? 
                    ORDER BY started_at DESC 
                    LIMIT ?
                ''', (host_id, limit))
            else:
                cursor.execute('''
                    SELECT * FROM deployment_history 
                    ORDER BY started_at DESC 
                    LIMIT ?
                ''', (limit,))
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
    
    # ==================== 辅助方法 ====================
    
    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """将数据库行转换为字典"""
        result = dict(row)
        
        # 解析 JSON 字段
        if 'tags' in result and result['tags']:
            try:
                result['tags'] = json.loads(result['tags'])
            except json.JSONDecodeError:
                result['tags'] = []
        
        return result
    
    def close(self):
        """关闭数据库连接（实际上使用上下文管理器，此方法为兼容性保留）"""
        pass


# 全局数据库管理器实例
db_manager = DatabaseManager()
