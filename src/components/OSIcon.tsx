/**
 * 操作系统图标组件 - 使用本地 logo 图片
 * 只支持有 logo 文件的系统，其他使用默认 linux.png
 */

interface OSIconProps {
  osKey?: string;
  systemType?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 支持的系统类型映射 - 只包含有 logo 文件的系统
const supportedSystems: Record<string, { 
  file: string;
  label: string;
}> = {
  // Ubuntu
  'ubuntu': { file: 'ubuntu.png', label: 'Ubuntu' },
  
  // Debian
  'debian': { file: 'Debian.png', label: 'Debian' },
  
  // CentOS
  'centos': { file: 'centos.png', label: 'CentOS' },
  
  // RedHat/RHEL
  'rhel': { file: 'redhat.png', label: 'RHEL' },
  'redhat': { file: 'redhat.png', label: 'RHEL' },
  'red hat': { file: 'redhat.png', label: 'RHEL' },
  'red hat enterprise linux': { file: 'redhat.png', label: 'RHEL' },
  
  // Alpine
  'alpine': { file: 'alpine.png', label: 'Alpine' },
  
  // openSUSE/SUSE
  'opensuse': { file: 'suse.png', label: 'openSUSE' },
  'suse': { file: 'suse.png', label: 'openSUSE' },
  
  // Rocky Linux
  'rocky': { file: 'Rocky.png', label: 'Rocky' },
  'rocky linux': { file: 'Rocky.png', label: 'Rocky' },
  
  // Deepin
  'deepin': { file: 'Deepin.png', label: 'Deepin' },
  '深度': { file: 'Deepin.png', label: 'Deepin' },
  
  // 麒麟 Kylin
  'kylin': { file: '麒麟.png', label: '麒麟' },
  '麒麟': { file: '麒麟.png', label: '麒麟' },
  '银河麒麟': { file: '麒麟.png', label: '麒麟' },
  '中标麒麟': { file: '麒麟.png', label: '麒麟' },
  
  // 欧拉 openEuler
  'openeuler': { file: '欧拉.png', label: '欧拉' },
  '欧拉': { file: '欧拉.png', label: '欧拉' },
  
  // 龙蜥 Anolis
  'anolis': { file: '龙蜥.png', label: '龙蜥' },
  '龙蜥': { file: '龙蜥.png', label: '龙蜥' },
  'anolis os': { file: '龙蜥.png', label: '龙蜥' },
};

// 系统类型映射 - 将各种可能的系统名称映射到标准 key
const systemTypeMapping: Record<string, string> = {
  'ubuntu': 'ubuntu',
  'debian': 'debian',
  'centos': 'centos',
  'centos/rhel': 'centos',
  'rhel': 'rhel',
  'red hat': 'rhel',
  'redhat': 'rhel',
  'red hat enterprise linux': 'rhel',
  'alpine': 'alpine',
  'opensuse': 'opensuse',
  'suse': 'opensuse',
  'rocky': 'rocky',
  'rocky linux': 'rocky',
  'deepin': 'deepin',
  '深度': 'deepin',
  'kylin': 'kylin',
  '麒麟': 'kylin',
  '银河麒麟': 'kylin',
  '中标麒麟': 'kylin',
  'openeuler': 'openeuler',
  '欧拉': 'openeuler',
  'anolis': 'anolis',
  '龙蜥': 'anolis',
  'anolis os': 'anolis',
};

// 图标尺寸
const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

const OSIcon = ({ osKey, systemType, size = 'md', className = '' }: OSIconProps) => {
  // 确定系统 key
  const getSystemKey = (): string => {
    if (osKey) {
      return osKey.toLowerCase();
    }
    if (systemType) {
      const normalizedType = systemType.toLowerCase().trim();
      return systemTypeMapping[normalizedType] || normalizedType;
    }
    return 'unknown';
  };

  const systemKey = getSystemKey();
  const systemConfig = supportedSystems[systemKey];
  
  // 如果有支持的系统配置，使用对应 logo，否则使用默认 linux.png
  const logoFile = systemConfig ? systemConfig.file : 'linux.png';
  const logoPath = `/logo/${logoFile}`;
  const label = systemConfig ? systemConfig.label : (systemType || 'Linux');
  const sizeClass = sizeMap[size];

  return (
    <img 
      src={logoPath}
      alt={label}
      className={`${sizeClass} object-contain rounded ${className}`}
      title={label}
    />
  );
};

// 获取系统颜色 - 基于系统类型返回对应颜色
export const getOSColor = (osKey?: string, systemType?: string): string => {
  const key = osKey?.toLowerCase() || systemType?.toLowerCase().trim() || 'unknown';
  const mappedKey = systemTypeMapping[key] || key;
  
  const colorMap: Record<string, string> = {
    'ubuntu': '#E95420',
    'debian': '#A81C33',
    'centos': '#932279',
    'rhel': '#EE0000',
    'alpine': '#0D597F',
    'opensuse': '#73BA25',
    'rocky': '#10B981',
    'deepin': '#0078D4',
    'kylin': '#1E88E5',
    'openeuler': '#002C5F',
    'anolis': '#F5222D',
  };
  
  return colorMap[mappedKey] || '#8E8E93';
};

// 获取系统显示名称
export const getOSLabel = (osKey?: string, systemType?: string): string => {
  if (osKey) {
    const key = osKey.toLowerCase();
    if (supportedSystems[key]) {
      return supportedSystems[key].label;
    }
  }
  if (systemType) {
    const normalizedType = systemType.toLowerCase().trim();
    const mappedKey = systemTypeMapping[normalizedType];
    if (mappedKey && supportedSystems[mappedKey]) {
      return supportedSystems[mappedKey].label;
    }
    return systemType;
  }
  return 'Linux';
};

export default OSIcon;
