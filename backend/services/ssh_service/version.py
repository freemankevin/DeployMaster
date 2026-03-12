"""
版本检测模块
检测远程系统的操作系统版本号
"""

import re
from typing import Optional, TYPE_CHECKING

from utils.logger import get_logger

if TYPE_CHECKING:
    import paramiko

logger = get_logger(__name__)


class VersionDetector:
    """版本检测器类"""

    def __init__(self, client: Optional["paramiko.SSHClient"]):
        self.client = client

    def get_os_version(self, os_key: str) -> Optional[str]:
        """获取操作系统版本号"""
        if not self.client:
            return None
            
        try:
            os_version = None
            logger.debug(f"开始获取系统版本号 | os_key={os_key}")

            # 方法1: 对于 CentOS/RHEL/Rocky/AlmaLinux/Oracle
            if os_key in ['centos', 'rhel', 'rocky', 'almalinux', 'oracle']:
                os_version = self._get_redhat_version()

            # 方法2: 对于 Debian 系统
            if not os_version and os_key == 'debian':
                os_version = self._get_debian_version()

            # 方法3: 对于麒麟系统
            if not os_version and os_key == 'kylin':
                os_version = self._get_kylin_version()

            # 方法4: 从 /etc/os-release 获取版本号
            if not os_version:
                os_version = self._get_os_release_version()

            # 方法5: 对于 CentOS/RHEL，尝试使用 rpm
            if not os_version and os_key in ['centos', 'rhel', 'rocky', 'almalinux', 'oracle']:
                os_version = self._get_rpm_version()

            # 方法6: 对于国产系统特殊处理
            if not os_version:
                os_version = self._get_kyinfo_version()

            # 方法7: 使用 lsb_release
            if not os_version:
                os_version = self._get_lsb_version()

            # 方法8: 从 /etc/issue 获取版本号
            if not os_version:
                os_version = self._get_issue_version()

            logger.info(f"系统版本号: {os_version}")
            return os_version

        except Exception as e:
            logger.warning(f"获取系统版本号失败 | {e}")
            return None

    def _get_redhat_version(self) -> Optional[str]:
        """从 /etc/redhat-release 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "cat /etc/redhat-release 2>/dev/null"
            )
            release_content = stdout.read().decode().strip()
            logger.debug(f"/etc/redhat-release 内容: {release_content}")
            if release_content:
                # 匹配 x.y.z 格式
                version_match = re.search(
                    r'release\s+(\d+\.\d+\.\d+)', release_content, re.IGNORECASE
                )
                if version_match:
                    full_version = version_match.group(1)
                    version_parts = full_version.split('.')
                    os_version = f"{version_parts[0]}.{version_parts[1]}"
                    logger.debug(f"从 /etc/redhat-release 获取到完整版本号: {os_version}")
                    return os_version
                
                # 尝试匹配 x.y 格式
                version_match = re.search(
                    r'release\s+(\d+\.\d+)', release_content, re.IGNORECASE
                )
                if version_match:
                    return version_match.group(1)
                
                # 尝试匹配纯数字
                version_match = re.search(
                    r'release\s+(\d+)', release_content, re.IGNORECASE
                )
                if version_match:
                    return version_match.group(1)
        except Exception as e:
            logger.debug(f"从 /etc/redhat-release 获取版本号失败: {e}")
        
        return None

    def _get_debian_version(self) -> Optional[str]:
        """从 /etc/debian_version 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "cat /etc/debian_version 2>/dev/null"
            )
            version = stdout.read().decode().strip()
            if version:
                version_match = re.match(r'(\d+(?:\.\d+)?)', version)
                if version_match:
                    return version_match.group(1)
                return version
        except Exception as e:
            logger.debug(f"从 /etc/debian_version 获取版本号失败: {e}")
        
        return None

    def _get_kylin_version(self) -> Optional[str]:
        """从 /etc/.productinfo 获取麒麟版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "cat /etc/.productinfo 2>/dev/null"
            )
            product_info = stdout.read().decode()
            if product_info and 'Kylin' in product_info:
                # 匹配 release V10 (SPx) 格式
                version_match = re.search(
                    r'release\s+(V\d+(?:\s*\(SP\d+\))?)', product_info, re.IGNORECASE
                )
                if version_match:
                    return version_match.group(1).strip()
        except Exception as e:
            logger.debug(f"从 /etc/.productinfo 获取版本号失败: {e}")
        
        return None

    def _get_os_release_version(self) -> Optional[str]:
        """从 /etc/os-release 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "cat /etc/os-release 2>/dev/null"
            )
            os_release = stdout.read().decode()
            logger.debug(f"/etc/os-release 内容: {os_release[:200]}...")

            # 先尝试获取 VERSION_ID
            for line in os_release.split('\n'):
                if line.startswith('VERSION_ID='):
                    version = line.split('=', 1)[1].strip().strip('"').strip("'")
                    if version:
                        logger.debug(f"从 /etc/os-release VERSION_ID 获取版本号: {version}")
                        return version

            # 尝试 VERSION
            for line in os_release.split('\n'):
                if line.startswith('VERSION='):
                    version = line.split('=', 1)[1].strip().strip('"').strip("'")
                    if version:
                        # 只取版本号部分
                        return version.split()[0]
        except Exception as e:
            logger.debug(f"从 /etc/os-release 获取版本号失败: {e}")
        
        return None

    def _get_rpm_version(self) -> Optional[str]:
        """使用 rpm 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "rpm -q --queryformat '%{VERSION}' centos-release redhat-release 2>/dev/null | head -1"
            )
            version = stdout.read().decode().strip()
            logger.debug(f"rpm 获取版本: {version}")
            if (version and not version.startswith('package') 
                and not version.startswith('centos-release') 
                and not version.startswith('redhat-release')):
                return version
        except Exception:
            pass
        
        return None

    def _get_kyinfo_version(self) -> Optional[str]:
        """从 /etc/.kyinfo 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "cat /etc/.kyinfo 2>/dev/null | grep version | head -1"
            )
            version_line = stdout.read().decode().strip()
            if version_line and '=' in version_line:
                return version_line.split('=')[1].strip()
        except Exception:
            pass
        
        return None

    def _get_lsb_version(self) -> Optional[str]:
        """使用 lsb_release 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "lsb_release -rs 2>/dev/null"
            )
            version = stdout.read().decode().strip()
            if version:
                return version
        except Exception:
            pass
        
        return None

    def _get_issue_version(self) -> Optional[str]:
        """从 /etc/issue 获取版本号"""
        if not self.client:
            return None
            
        try:
            stdin, stdout, stderr = self.client.exec_command(
                "cat /etc/issue 2>/dev/null | head -1"
            )
            issue_content = stdout.read().decode().strip()
            if issue_content:
                # 匹配 x.y.z 格式
                version_match = re.search(r'(\d+\.\d+(?:\.\d+)?)', issue_content)
                if version_match:
                    return version_match.group(1)
                # 匹配 x.y 格式
                version_match = re.search(r'(\d+\.\d+)', issue_content)
                if version_match:
                    return version_match.group(1)
                # 匹配纯数字
                version_match = re.search(r'(\d+)', issue_content)
                if version_match:
                    return version_match.group(1)
        except Exception as e:
            logger.debug(f"从 /etc/issue 获取版本号失败: {e}")
        
        return None