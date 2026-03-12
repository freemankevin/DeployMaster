"""
系统检测模块
检测远程 Linux 系统的发行版、硬件信息等
"""

from typing import Dict, Any, Optional, TYPE_CHECKING

from utils.logger import get_logger
from .hardware import HardwareDetector
from .version import VersionDetector

if TYPE_CHECKING:
    import paramiko

logger = get_logger(__name__)


class SystemDetector:
    """系统检测器类"""

    def __init__(self, client: Optional["paramiko.SSHClient"]):
        self.client = client
        self.system_info: Dict[str, Any] = {}
        self.hardware_detector = HardwareDetector(client)
        self.version_detector = VersionDetector(client)

    def detect_system(self) -> Dict[str, Any]:
        """检测远程系统信息 - 仅支持 Linux 系统"""
        if not self.client:
            return self._get_unknown_system()
        
        try:
            # 执行 uname 命令获取系统信息
            stdin, stdout, stderr = self.client.exec_command('uname -a')
            uname_output = stdout.read().decode().strip()

            if uname_output:
                self.system_info['kernel'] = uname_output

                # 使用 uname -m 获取准确的架构信息
                self._detect_architecture()

                # 检测操作系统类型
                if 'Linux' in uname_output:
                    self._detect_linux_distro()
                    # 获取硬件信息
                    hardware_info = self.hardware_detector.detect_hardware()
                    self.system_info.update(hardware_info)
                    
                    # 获取操作系统版本号
                    os_key = self.system_info.get('os_key', '').lower()
                    os_version = self.version_detector.get_os_version(os_key)
                    self.system_info['os_version'] = os_version
                    logger.debug(f"系统版本号: {os_version}")
                else:
                    # 非 Linux 系统，标记为不支持
                    self.system_info['os'] = 'Unsupported'
                    self.system_info['os_key'] = 'unknown'
                    self.system_info['icon'] = 'server'
                    self.system_info['color'] = '#94a3b8'
                    self.system_info['error'] = "仅支持 Linux 系统"
            else:
                return self._get_unknown_system()

        except Exception as e:
            logger.warning(f"系统检测失败 | {e}")
            return self._get_unknown_system()
        
        return self.system_info

    def _get_unknown_system(self) -> Dict[str, Any]:
        """返回未知系统信息"""
        return {
            'os': 'Unknown',
            'os_key': 'unknown',
            'icon': 'server',
            'color': '#94a3b8'
        }

    def _detect_architecture(self):
        """检测系统架构"""
        if not self.client:
            return
        try:
            stdin, stdout, stderr = self.client.exec_command('uname -m')
            arch_output = stdout.read().decode().strip()
            if arch_output:
                self.system_info['architecture'] = arch_output
        except Exception:
            pass

    def _detect_linux_distro(self):
        """检测 Linux 发行版 - 支持国内外主流系统"""
        if not self.client:
            return
            
        try:
            # 尝试获取发行版信息
            stdin, stdout, stderr = self.client.exec_command(
                'cat /etc/os-release 2>/dev/null || echo "Unknown"'
            )
            os_info = stdout.read().decode()

            # 转换为小写便于匹配
            os_info_lower = os_info.lower()

            # 发行版映射配置
            distro_configs = [
                # 国外开源/商业系统
                ('ubuntu', 'Ubuntu', 'ubuntu', 'ubuntu', '#E95420'),
                ('debian', 'Debian', 'debian', 'debian', '#A81C33'),
                ('centos', 'CentOS', 'centos', 'centos', '#932279'),
                ('rhel', 'RHEL', 'rhel', 'redhat', '#EE0000'),
                ('red hat', 'RHEL', 'rhel', 'redhat', '#EE0000'),
                ('fedora', 'Fedora', 'fedora', 'fedora', '#294172'),
                ('arch', 'Arch Linux', 'arch', 'arch', '#1793D1'),
                ('alpine', 'Alpine', 'alpine', 'alpine', '#0D597F'),
                ('opensuse', 'openSUSE', 'opensuse', 'opensuse', '#73BA25'),
                ('suse', 'openSUSE', 'opensuse', 'opensuse', '#73BA25'),
                ('kali', 'Kali Linux', 'kali', 'kali', '#367BF0'),
                ('gentoo', 'Gentoo', 'gentoo', 'gentoo', '#54487A'),
                ('manjaro', 'Manjaro', 'manjaro', 'manjaro', '#35BF5C'),
                ('mint', 'Linux Mint', 'mint', 'mint', '#87CF3E'),
                # 国内开源/商业系统
                ('kylin', 'Kylin', 'kylin', 'kylin', '#1E88E5'),
                ('麒麟', 'Kylin', 'kylin', 'kylin', '#1E88E5'),
                ('uos', 'UOS', 'uos', 'uos', '#2B5F8E'),
                ('统信', 'UOS', 'uos', 'uos', '#2B5F8E'),
                ('deepin', 'Deepin', 'deepin', 'deepin', '#0078D4'),
                ('redflag', 'RedFlag', 'redflag', 'redflag', '#CC0000'),
                ('红旗', 'RedFlag', 'redflag', 'redflag', '#CC0000'),
                ('neokylin', 'NeoKylin', 'neokylin', 'neokylin', '#1E50A2'),
                ('方德', 'NeoKylin', 'neokylin', 'neokylin', '#1E50A2'),
                ('openeuler', 'openEuler', 'openeuler', 'openeuler', '#002C5F'),
                ('欧拉', 'openEuler', 'openeuler', 'openeuler', '#002C5F'),
                ('anolis', 'Anolis OS', 'anolis', 'anolis', '#F5222D'),
                ('龙蜥', 'Anolis OS', 'anolis', 'anolis', '#F5222D'),
                ('alibaba', 'Alibaba Cloud Linux', 'alibaba', 'alibaba', '#FF6A00'),
                ('alios', 'Alibaba Cloud Linux', 'alibaba', 'alibaba', '#FF6A00'),
                ('alinux', 'Alibaba Cloud Linux', 'alibaba', 'alibaba', '#FF6A00'),
                ('tencentos', 'TencentOS', 'tencent', 'tencent', '#0052D9'),
                ('tlinux', 'TencentOS', 'tencent', 'tencent', '#0052D9'),
                ('rocky', 'Rocky Linux', 'rocky', 'rocky', '#10B981'),
                ('almalinux', 'AlmaLinux', 'almalinux', 'almalinux', '#082336'),
                ('oracle', 'Oracle Linux', 'oracle', 'oracle', '#F80000'),
                ('amazon', 'Amazon Linux', 'amazon', 'amazon', '#FF9900'),
            ]

            for pattern, os_name, os_key, icon, color in distro_configs:
                if pattern in os_info_lower:
                    self.system_info['os'] = os_name
                    self.system_info['os_key'] = os_key
                    self.system_info['icon'] = icon
                    self.system_info['color'] = color
                    return

            # 通用 Linux
            self.system_info['os'] = 'Linux'
            self.system_info['os_key'] = 'linux'
            self.system_info['icon'] = 'linux'
            self.system_info['color'] = '#FCC624'

        except Exception as e:
            logger.warning(f"Linux 发行版检测失败 | {e}")
            self.system_info['os'] = 'Linux'
            self.system_info['os_key'] = 'linux'
            self.system_info['icon'] = 'linux'
            self.system_info['color'] = '#FCC624'