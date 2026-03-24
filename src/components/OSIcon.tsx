/**
 * OS Icon Component - Use local logo images
 * Only supports systems with logo files, others use default linux.png
 */

interface OSIconProps {
  osKey?: string;
  systemType?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;  // Custom tooltip, takes priority
}

// Supported system type mapping - Use SVG logo files
const supportedSystems: Record<string, { 
  file: string;
  label: string;
}> = {
  // Ubuntu
  'ubuntu': { file: 'ubuntu.svg', label: 'Ubuntu' },
  
  // Debian
  'debian': { file: 'debian.svg', label: 'Debian' },
  
  // CentOS
  'centos': { file: 'centos.svg', label: 'CentOS' },
  
  // RedHat/RHEL
  'rhel': { file: 'redhat.svg', label: 'RHEL' },
  'redhat': { file: 'redhat.svg', label: 'RHEL' },
  'red hat': { file: 'redhat.svg', label: 'RHEL' },
  'red hat enterprise linux': { file: 'redhat.svg', label: 'RHEL' },
  
  // Alpine
  'alpine': { file: 'alpine.svg', label: 'Alpine' },
  
  // openSUSE/SUSE
  'opensuse': { file: 'suse.svg', label: 'openSUSE' },
  'suse': { file: 'suse.svg', label: 'openSUSE' },
  
  // Rocky Linux
  'rocky': { file: 'rocky.svg', label: 'Rocky' },
  'rocky linux': { file: 'rocky.svg', label: 'Rocky' },
  
  // Deepin
  'deepin': { file: 'deepin.svg', label: 'Deepin' },
  '深度': { file: 'deepin.svg', label: 'Deepin' },
  
  // Kylin
  'kylin': { file: '麒麟.svg', label: 'Kylin' },
  '麒麟': { file: '麒麟.svg', label: 'Kylin' },
  '银河麒麟': { file: '麒麟.svg', label: 'Kylin' },
  '中标麒麟': { file: '麒麟.svg', label: 'Kylin' },
  
  // openEuler
  'openeuler': { file: '欧拉.svg', label: 'openEuler' },
  '欧拉': { file: '欧拉.svg', label: 'openEuler' },
  
  // Anolis
  'anolis': { file: '龙蜥.svg', label: 'Anolis' },
  '龙蜥': { file: '龙蜥.svg', label: 'Anolis' },
  'anolis os': { file: '龙蜥.svg', label: 'Anolis' },
};

// System type mapping - Map various possible system names to standard keys
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

// Icon sizes
const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

const OSIcon = ({ osKey, systemType, size = 'md', className = '', title }: OSIconProps) => {
  // Determine system key
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
  
  // If supported system config exists, use corresponding logo, otherwise use default linux.svg
  const logoFile = systemConfig ? systemConfig.file : 'linux.svg';
  const logoPath = `/logo/${logoFile}`;
  const label = systemConfig ? systemConfig.label : (systemType || 'Linux');
  const sizeClass = sizeMap[size];
  
  // Use custom title if provided, otherwise fall back to label
  const displayTitle = title || label;

  return (
    <img
      src={logoPath}
      alt={label}
      className={`${sizeClass} object-contain ${className}`}
      title={displayTitle}
    />
  );
};

// Get system color - Return corresponding color based on system type
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

// Get system display name
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
