"""
SFTP 服务模块
提供 SFTP 文件传输功能
"""

import os
import stat
from typing import Dict, Any, List, Optional, BinaryIO, Callable
from dataclasses import dataclass
from datetime import datetime

import paramiko

from utils.logger import get_logger
from .config import SSHConnectionConfig
from .connection import SSHConnection

logger = get_logger(__name__)


@dataclass
class FileInfo:
    """文件信息"""
    name: str
    path: str
    size: int
    is_dir: bool
    is_link: bool
    modified_time: datetime
    permissions: str
    owner: str
    group: str


@dataclass
class TransferProgress:
    """传输进度"""
    current: int
    total: int
    percentage: float
    speed: str  # 如 "1.5 MB/s"


class SFTPService:
    """SFTP 服务类"""

    def __init__(self, config: SSHConnectionConfig):
        self.config = config
        self.ssh_conn: Optional[SSHConnection] = None
        self.sftp: Optional[paramiko.SFTPClient] = None
        self._connected = False

    def connect(self) -> bool:
        """建立 SFTP 连接"""
        try:
            self.ssh_conn = SSHConnection(self.config)
            if not self.ssh_conn.connect():
                logger.error(f"SFTP 连接失败: {self.ssh_conn.last_error}")
                return False

            # 打开 SFTP 会话
            if self.ssh_conn.client is None:
                logger.error("SSH client is None")
                return False
            self.sftp = self.ssh_conn.client.open_sftp()
            self._connected = True
            logger.info(f"SFTP 连接成功: {self.config.host}")
            return True

        except Exception as e:
            logger.error(f"SFTP 连接错误: {e}")
            self._connected = False
            return False

    def disconnect(self):
        """断开 SFTP 连接"""
        try:
            if self.sftp:
                self.sftp.close()
                self.sftp = None
            if self.ssh_conn:
                self.ssh_conn.close()
                self.ssh_conn = None
            self._connected = False
            logger.info("SFTP 连接已断开")
        except Exception as e:
            logger.error(f"SFTP 断开错误: {e}")

    def is_connected(self) -> bool:
        """检查是否已连接"""
        return self._connected and self.sftp is not None

    def list_directory(self, remote_path: str = ".") -> Dict[str, Any]:
        """列出远程目录内容"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            # 获取绝对路径
            if remote_path == ".":
                if self.sftp is None:
                    return {"success": False, "error": "SFTP 未连接"}
                remote_path = self.sftp.getcwd() or "/"

            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            entries = self.sftp.listdir_attr(remote_path)
            files: List[FileInfo] = []

            for entry in entries:
                full_path = os.path.join(remote_path, entry.filename).replace("\\", "/")

                # 解析权限 - 确保 mode 是整数
                mode = self._get_file_mode(entry)
                if mode == 0:
                    continue

                # 注意：先检查符号链接，因为符号链接可能指向目录
                is_link = stat.S_ISLNK(mode)
                # 如果是符号链接，获取目标的类型
                if is_link:
                    try:
                        # 尝试获取链接目标的信息
                        if self.sftp is not None:
                            target_stat = self.sftp.stat(full_path)
                            if target_stat.st_mode is not None:
                                # 使用目标的 mode 来判断是否是目录
                                is_dir = stat.S_ISDIR(target_stat.st_mode)
                            else:
                                is_dir = False
                        else:
                            is_dir = False
                    except:
                        # 如果无法获取目标信息，默认为文件
                        is_dir = False
                else:
                    is_dir = stat.S_ISDIR(mode)

                # 格式化权限字符串
                perms = self._format_permissions(mode)

                # 获取所有者和组
                try:
                    uid = entry.st_uid
                    gid = entry.st_gid
                    owner = str(uid)  # 简化处理，实际可以查询 /etc/passwd
                    group = str(gid)
                except:
                    owner = "unknown"
                    group = "unknown"

                file_info = FileInfo(
                    name=entry.filename,
                    path=full_path,
                    size=entry.st_size or 0,
                    is_dir=is_dir,
                    is_link=is_link,
                    modified_time=datetime.fromtimestamp(entry.st_mtime or 0),
                    permissions=perms,
                    owner=owner,
                    group=group
                )
                files.append(file_info)

            # 排序：目录在前，文件在后，按名称排序
            files.sort(key=lambda x: (not x.is_dir, x.name.lower()))

            return {
                "success": True,
                "path": remote_path,
                "files": [
                    {
                        "name": f.name,
                        "path": f.path,
                        "size": f.size,
                        "size_formatted": self._format_size(f.size),
                        "is_dir": f.is_dir,
                        "is_link": f.is_link,
                        "modified_time": f.modified_time.isoformat(),
                        "modified_time_formatted": f.modified_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "permissions": f.permissions,
                        "owner": f.owner,
                        "group": f.group
                    }
                    for f in files
                ]
            }

        except Exception as e:
            logger.error(f"列出目录失败: {e}")
            return {"success": False, "error": str(e)}

    def create_directory(self, remote_path: str) -> Dict[str, Any]:
        """创建远程目录"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            self.sftp.mkdir(remote_path)
            logger.info(f"创建目录成功: {remote_path}")
            return {"success": True, "message": "目录创建成功"}
        except Exception as e:
            logger.error(f"创建目录失败: {e}")
            return {"success": False, "error": str(e)}

    def remove_file(self, remote_path: str) -> Dict[str, Any]:
        """删除远程文件"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            self.sftp.remove(remote_path)
            logger.info(f"删除文件成功: {remote_path}")
            return {"success": True, "message": "文件删除成功"}
        except Exception as e:
            logger.error(f"删除文件失败: {e}")
            return {"success": False, "error": str(e)}

    def remove_directory(self, remote_path: str, recursive: bool = False) -> Dict[str, Any]:
        """删除远程目录"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if recursive:
                # 递归删除
                self._rmdir_recursive(remote_path)
            else:
                if self.sftp is None:
                    return {"success": False, "error": "SFTP 未连接"}
                self.sftp.rmdir(remote_path)
            logger.info(f"删除目录成功: {remote_path}")
            return {"success": True, "message": "目录删除成功"}
        except Exception as e:
            logger.error(f"删除目录失败: {e}")
            return {"success": False, "error": str(e)}

    def _rmdir_recursive(self, remote_path: str):
        """递归删除目录"""
        if self.sftp is None:
            return
        for entry in self.sftp.listdir_attr(remote_path):
            full_path = f"{remote_path}/{entry.filename}"
            mode = entry.st_mode
            if mode is not None and stat.S_ISDIR(mode):
                self._rmdir_recursive(full_path)
            else:
                self.sftp.remove(full_path)
        self.sftp.rmdir(remote_path)

    def rename(self, old_path: str, new_path: str) -> Dict[str, Any]:
        """重命名文件或目录"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            self.sftp.rename(old_path, new_path)
            logger.info(f"重命名成功: {old_path} -> {new_path}")
            return {"success": True, "message": "重命名成功"}
        except Exception as e:
            logger.error(f"重命名失败: {e}")
            return {"success": False, "error": str(e)}

    def upload_file(self, local_path: str, remote_path: str,
                   progress_callback: Optional[Callable[[int, int], None]] = None) -> Dict[str, Any]:
        """上传文件到远程服务器"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            file_size = os.path.getsize(local_path)
            uploaded = [0]  # 使用列表以便在回调中修改

            def callback(sent: int, total: int):
                uploaded[0] = sent
                if progress_callback:
                    progress_callback(sent, total)

            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            self.sftp.put(local_path, remote_path, callback=callback)
            logger.info(f"上传文件成功: {local_path} -> {remote_path}")
            return {
                "success": True,
                "message": "文件上传成功",
                "size": file_size,
                "size_formatted": self._format_size(file_size)
            }
        except Exception as e:
            logger.error(f"上传文件失败: {e}")
            return {"success": False, "error": str(e)}

    def download_file(self, remote_path: str, local_path: str,
                     progress_callback: Optional[Callable[[int, int], None]] = None) -> Dict[str, Any]:
        """从远程服务器下载文件"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            file_size = self.sftp.stat(remote_path).st_size
            downloaded = [0]

            def callback(sent: int, total: int):
                downloaded[0] = sent
                if progress_callback:
                    progress_callback(sent, total)

            self.sftp.get(remote_path, local_path, callback=callback)
            logger.info(f"下载文件成功: {remote_path} -> {local_path}")
            return {
                "success": True,
                "message": "文件下载成功",
                "size": file_size or 0,
                "size_formatted": self._format_size(file_size or 0)
            }
        except Exception as e:
            logger.error(f"下载文件失败: {e}")
            return {"success": False, "error": str(e)}

    def get_file_content(self, remote_path: str, max_size: int = 1024 * 1024) -> Dict[str, Any]:
        """获取远程文件内容（用于文本文件预览）"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            # 检查文件大小
            file_stat = self.sftp.stat(remote_path)
            file_size = file_stat.st_size or 0
            if file_size > max_size:
                return {
                    "success": False,
                    "error": f"文件过大 ({self._format_size(file_size)})，超过限制 {self._format_size(max_size)}"
                }

            # 读取文件内容
            with self.sftp.file(remote_path, 'r') as f:
                content = f.read().decode('utf-8', errors='replace')

            return {
                "success": True,
                "content": content,
                "size": file_size,
                "size_formatted": self._format_size(file_size)
            }
        except Exception as e:
            logger.error(f"读取文件内容失败: {e}")
            return {"success": False, "error": str(e)}

    def write_file_content(self, remote_path: str, content: str) -> Dict[str, Any]:
        """写入内容到远程文件"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            if self.sftp is None:
                return {"success": False, "error": "SFTP 未连接"}
            with self.sftp.file(remote_path, 'w') as f:
                f.write(content.encode('utf-8'))
            logger.info(f"写入文件成功: {remote_path}")
            return {"success": True, "message": "文件保存成功"}
        except Exception as e:
            logger.error(f"写入文件失败: {e}")
            return {"success": False, "error": str(e)}

    def get_disk_usage(self, path: str = "/") -> Dict[str, Any]:
        """获取磁盘使用情况"""
        if not self.is_connected():
            return {"success": False, "error": "未连接"}

        try:
            # 执行 df 命令获取磁盘使用情况
            if self.ssh_conn is None or self.ssh_conn.client is None:
                return {"success": False, "error": "SSH 未连接"}
            stdin, stdout, stderr = self.ssh_conn.client.exec_command(f'df -h "{path}"')
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()

            if error:
                return {"success": False, "error": error}

            lines = output.split('\n')
            if len(lines) >= 2:
                # 解析 df 输出
                parts = lines[1].split()
                if len(parts) >= 6:
                    return {
                        "success": True,
                        "filesystem": parts[0],
                        "size": parts[1],
                        "used": parts[2],
                        "available": parts[3],
                        "use_percentage": parts[4],
                        "mounted_on": parts[5]
                    }

            return {"success": False, "error": "无法解析磁盘使用情况"}
        except Exception as e:
            logger.error(f"获取磁盘使用情况失败: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _format_size(size: int) -> str:
        """格式化文件大小"""
        size_float = float(size)
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_float < 1024:
                return f"{size_float:.1f} {unit}"
            size_float /= 1024
        return f"{size_float:.1f} PB"

    @staticmethod
    def _format_permissions(mode: int) -> str:
        """格式化权限为字符串 - 与 ls -l 格式一致"""
        # 确保 mode 是整数类型
        if not isinstance(mode, int):
            try:
                mode = int(mode)
            except (TypeError, ValueError):
                return "----------"

        # 使用 stat 模块的 filemode 函数（Python 3.4+）
        try:
            # 尝试使用 stat.filemode（Python 3.4+）
            return stat.filemode(mode)
        except AttributeError:
            # 如果不可用，手动格式化
            pass

        # 只保留低 12 位（标准 Unix 权限位）
        mode = mode & 0o7777

        perms = ""
        # 文件类型
        if stat.S_ISDIR(mode):
            perms = "d"
        elif stat.S_ISLNK(mode):
            perms = "l"
        elif stat.S_ISBLK(mode):
            perms = "b"
        elif stat.S_ISCHR(mode):
            perms = "c"
        elif stat.S_ISSOCK(mode):
            perms = "s"
        elif stat.S_ISFIFO(mode):
            perms = "p"
        else:
            perms = "-"

        # 所有者权限 (user)
        perms += "r" if mode & stat.S_IRUSR else "-"
        perms += "w" if mode & stat.S_IWUSR else "-"
        if mode & stat.S_ISUID:
            perms += "s" if mode & stat.S_IXUSR else "S"
        else:
            perms += "x" if mode & stat.S_IXUSR else "-"

        # 组权限 (group)
        perms += "r" if mode & stat.S_IRGRP else "-"
        perms += "w" if mode & stat.S_IWGRP else "-"
        if mode & stat.S_ISGID:
            perms += "s" if mode & stat.S_IXGRP else "S"
        else:
            perms += "x" if mode & stat.S_IXGRP else "-"

        # 其他用户权限 (others)
        perms += "r" if mode & stat.S_IROTH else "-"
        perms += "w" if mode & stat.S_IWOTH else "-"
        if mode & stat.S_ISVTX:
            perms += "t" if mode & stat.S_IXOTH else "T"
        else:
            perms += "x" if mode & stat.S_IXOTH else "-"

        return perms

    def _get_file_mode(self, entry) -> int:
        """获取文件 mode，处理各种可能的类型"""
        mode = entry.st_mode
        if mode is None:
            return 0
        
        # 处理 mode 可能是字符串或其他类型的情况
        if isinstance(mode, str):
            try:
                mode = int(mode, 8) if mode.startswith('0') else int(mode)
            except (ValueError, TypeError):
                mode = 0
        elif not isinstance(mode, int):
            try:
                mode = int(mode)
            except (ValueError, TypeError):
                mode = 0
        
        return mode


def create_sftp_service(host_data: Dict[str, Any]) -> SFTPService:
    """从主机数据创建 SFTP 服务"""
    from .config import SSHConnectionConfig

    config = SSHConnectionConfig(
        host=host_data['address'],
        port=host_data.get('port', 22),
        username=host_data['username'],
        password=host_data.get('password'),
        private_key=host_data.get('private_key'),
        key_passphrase=host_data.get('key_passphrase')
    )

    return SFTPService(config)
