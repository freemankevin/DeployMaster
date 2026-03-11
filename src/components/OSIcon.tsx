/**
 * 操作系统图标组件
 * 仅支持 Linux 系统（国内外主流开源和商业发行版）
 *
 * 国外系统：Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Alpine, openSUSE,
 *         Kali, Gentoo, Manjaro, Mint, Rocky, AlmaLinux, Oracle, Amazon Linux
 * 国内系统：Kylin(麒麟), UOS(统信), Deepin(深度), RedFlag(红旗),
 *         NeoKylin(方德), openEuler(欧拉), Anolis OS(龙蜥),
 *         Alibaba Cloud Linux, TencentOS
 */

import { Server } from 'lucide-react';

interface OSIconProps {
  osKey?: string;
  systemType?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 操作系统图标映射 - SVG 图标（使用更简洁的设计）
const osIconMap: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  // Ubuntu
  ubuntu: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#E95420"/>
        <circle cx="12" cy="12" r="2.5" fill="white"/>
        <circle cx="17" cy="7" r="1.8" fill="white"/>
        <circle cx="6" cy="12" r="1.8" fill="white"/>
        <circle cx="17" cy="17" r="1.8" fill="white"/>
        <path d="M12 9.5 L17 7 M12 14.5 L6 12 M12 14.5 L17 17" stroke="white" strokeWidth="1.2" fill="none"/>
      </svg>
    ),
    color: '#E95420',
    label: 'Ubuntu'
  },
  // Debian
  debian: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#A81C33"/>
        <path d="M12 6 C8.5 6 6.5 8.5 6.5 11.5 C6.5 15 9 17 12 17 C15 17 17 15 17 12.5 C17 10.5 15.5 9.5 14.5 9.5 C13.5 9.5 12.5 10.5 12.5 11.5 C12.5 12.5 13.5 13.5 14.5 13.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    color: '#A81C33',
    label: 'Debian'
  },
  // CentOS
  centos: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#932279"/>
        <path d="M12 5 L14.5 11 L19.5 11 L15.5 14.5 L17 19.5 L12 16 L7 19.5 L8.5 14.5 L4.5 11 L9.5 11 Z" fill="white"/>
      </svg>
    ),
    color: '#932279',
    label: 'CentOS'
  },
  // RHEL
  rhel: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#EE0000"/>
        <path d="M8 8 L16 8 L16 16 L8 16 Z" fill="white"/>
        <path d="M10 10 L14 10 L14 14 L10 14 Z" fill="#EE0000"/>
      </svg>
    ),
    color: '#EE0000',
    label: 'RHEL'
  },
  // Fedora
  fedora: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#294172"/>
        <path d="M12 6 C15.5 6 17.5 8.5 17.5 11.5 C17.5 15 15 17 12 17 C8.5 17 6.5 15 6.5 12 C6.5 8.5 9 6 12 6" fill="white"/>
        <circle cx="12" cy="12" r="2.5" fill="#294172"/>
      </svg>
    ),
    color: '#294172',
    label: 'Fedora'
  },
  // Arch Linux
  arch: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#1793D1"/>
        <path d="M12 6 L14.5 13.5 L12 11.5 L9.5 13.5 Z" fill="white"/>
        <rect x="11" y="13.5" width="2" height="4.5" fill="white"/>
      </svg>
    ),
    color: '#1793D1',
    label: 'Arch'
  },
  // Alpine
  alpine: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#0D597F"/>
        <path d="M12 6 L16 16 L8 16 Z" fill="white"/>
      </svg>
    ),
    color: '#0D597F',
    label: 'Alpine'
  },
  // openSUSE
  opensuse: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#73BA25"/>
        <path d="M8 12 C8 9 10 7 12 7 C15 7 17 9 17 12 C17 15 15 17 12 17" stroke="white" strokeWidth="2" fill="none"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
      </svg>
    ),
    color: '#73BA25',
    label: 'openSUSE'
  },
  // Kali Linux
  kali: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#367BF0"/>
        <path d="M8 8 L16 16 M16 8 L8 16" stroke="white" strokeWidth="2"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="1.5"/>
      </svg>
    ),
    color: '#367BF0',
    label: 'Kali'
  },
  // Gentoo
  gentoo: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#54487A"/>
        <path d="M12 6 C15.5 6 17.5 8.5 17.5 11.5 C17.5 14.5 15 16.5 12 16.5 C9 16.5 7 14.5 7 12 C7 9 9.5 6 12 6" fill="white"/>
        <path d="M12 9 C13.8 9 15 10.2 15 12 C15 13.8 13.8 15 12 15" fill="#54487A"/>
      </svg>
    ),
    color: '#54487A',
    label: 'Gentoo'
  },
  // Manjaro
  manjaro: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#35BF5C"/>
        <rect x="7" y="6" width="3" height="12" fill="white"/>
        <rect x="11" y="9" width="3" height="9" fill="white"/>
        <rect x="15" y="12" width="3" height="6" fill="white"/>
      </svg>
    ),
    color: '#35BF5C',
    label: 'Manjaro'
  },
  // Linux Mint
  mint: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#87CF3E"/>
        <path d="M8 8 L16 8 L16 10 L10 10 L10 16 L8 16 Z" fill="white"/>
      </svg>
    ),
    color: '#87CF3E',
    label: 'Mint'
  },
  // Rocky Linux
  rocky: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#10B981"/>
        <path d="M12 6 L16 10 L14 10 L14 16 L10 16 L10 10 L8 10 Z" fill="white"/>
      </svg>
    ),
    color: '#10B981',
    label: 'Rocky'
  },
  // AlmaLinux
  almalinux: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#082336"/>
        <path d="M12 6 C15 6 17 8 17 11 C17 14 15 16 12 16 C9 16 7 14 7 11 C7 8 9 6 12 6" fill="white"/>
        <path d="M12 9 C13.5 9 14.5 10 14.5 11 C14.5 12.5 13.5 13.5 12 13.5" fill="#082336"/>
      </svg>
    ),
    color: '#082336',
    label: 'AlmaLinux'
  },
  // Oracle Linux
  oracle: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#F80000"/>
        <path d="M8 12 C8 9 10 7 12 7 C14 7 16 9 16 12 C16 15 14 17 12 17 C10 17 8 15 8 12" fill="none" stroke="white" strokeWidth="1.5"/>
        <text x="12" y="14" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="Arial">O</text>
      </svg>
    ),
    color: '#F80000',
    label: 'Oracle'
  },
  // Amazon Linux
  amazon: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#FF9900"/>
        <path d="M8 12 L12 8 L16 12 L12 16 Z" fill="white"/>
        <text x="12" y="13" textAnchor="middle" fill="#FF9900" fontSize="5" fontWeight="bold" fontFamily="Arial">a</text>
      </svg>
    ),
    color: '#FF9900',
    label: 'Amazon'
  },
  // 麒麟 Kylin
  kylin: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#C41E3A"/>
        <path d="M12 6 L14 10 L18 10 L15 13 L16 17 L12 15 L8 17 L9 13 L6 10 L10 10 Z" fill="white"/>
      </svg>
    ),
    color: '#C41E3A',
    label: '麒麟'
  },
  // 统信 UOS
  uos: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#2B5F8E"/>
        <rect x="8" y="8" width="8" height="8" rx="1" fill="white"/>
        <path d="M10 11 L12 13 L14 11" stroke="#2B5F8E" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    color: '#2B5F8E',
    label: 'UOS'
  },
  // 深度 Deepin
  deepin: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#0078D4"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
        <circle cx="12" cy="12" r="2" fill="#0078D4"/>
      </svg>
    ),
    color: '#0078D4',
    label: 'Deepin'
  },
  // 红旗 RedFlag
  redflag: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#CC0000"/>
        <path d="M8 8 L16 8 L14 16 L10 16 Z" fill="white"/>
        <circle cx="12" cy="11" r="2" fill="#CC0000"/>
      </svg>
    ),
    color: '#CC0000',
    label: '红旗'
  },
  // 方德 NeoKylin
  neokylin: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#1E50A2"/>
        <path d="M8 8 L16 8 L16 10 L10 10 L10 14 L16 14 L16 16 L8 16 Z" fill="white"/>
      </svg>
    ),
    color: '#1E50A2',
    label: '方德'
  },
  // 欧拉 openEuler
  openeuler: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#002C5F"/>
        <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
        <path d="M12 7 L12 5 M12 19 L12 17 M7 12 L5 12 M19 12 L17 12" stroke="white" strokeWidth="1"/>
      </svg>
    ),
    color: '#002C5F',
    label: '欧拉'
  },
  // 龙蜥 Anolis
  anolis: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#F5222D"/>
        <path d="M8 10 C8 8 10 7 12 7 C14 7 16 8 16 10 C16 12 14 13 12 13 C10 13 8 14 8 16" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="12" cy="10" r="1.5" fill="white"/>
      </svg>
    ),
    color: '#F5222D',
    label: '龙蜥'
  },
  // 阿里云 Alibaba
  alibaba: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#FF6A00"/>
        <path d="M8 12 L12 8 L16 12 L12 16 Z" fill="white"/>
        <text x="12" y="13" textAnchor="middle" fill="#FF6A00" fontSize="5" fontWeight="bold" fontFamily="Arial">A</text>
      </svg>
    ),
    color: '#FF6A00',
    label: '阿里云'
  },
  // 腾讯云 Tencent
  tencent: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#0052D9"/>
        <path d="M8 8 L16 8 L16 10 L10 10 L10 14 L16 14 L16 16 L8 16 Z" fill="white"/>
      </svg>
    ),
    color: '#0052D9',
    label: '腾讯云'
  },
  // 通用 Linux
  linux: {
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        <circle cx="12" cy="12" r="10" fill="#FCC624"/>
        <path d="M8 14 C8 11 10 9 12 9 C14 9 16 11 16 14 C16 16 14 18 12 18 C10 18 8 16 8 14" fill="#333"/>
        <circle cx="10.5" cy="12.5" r="1" fill="white"/>
        <circle cx="13.5" cy="12.5" r="1" fill="white"/>
        <path d="M11 15 L13 15" stroke="white" strokeWidth="0.5"/>
      </svg>
    ),
    color: '#FCC624',
    label: 'Linux'
  },
  // 未知系统
  unknown: {
    icon: null,
    color: '#94a3b8',
    label: 'Unknown'
  }
};

// 系统类型映射 - 将各种可能的系统名称映射到标准 key
const systemTypeMapping: Record<string, string> = {
  // Ubuntu
  'ubuntu': 'ubuntu',
  // Debian
  'debian': 'debian',
  // CentOS
  'centos': 'centos',
  'centos/rhel': 'centos',
  // RHEL
  'rhel': 'rhel',
  'red hat': 'rhel',
  'redhat': 'rhel',
  'red hat enterprise linux': 'rhel',
  // Fedora
  'fedora': 'fedora',
  // Arch
  'arch': 'arch',
  'arch linux': 'arch',
  // Alpine
  'alpine': 'alpine',
  // openSUSE
  'opensuse': 'opensuse',
  'suse': 'opensuse',
  // Kali
  'kali': 'kali',
  'kali linux': 'kali',
  // Gentoo
  'gentoo': 'gentoo',
  // Manjaro
  'manjaro': 'manjaro',
  // Mint
  'mint': 'mint',
  'linux mint': 'mint',
  // Rocky
  'rocky': 'rocky',
  'rocky linux': 'rocky',
  // AlmaLinux
  'almalinux': 'almalinux',
  'alma': 'almalinux',
  // Oracle
  'oracle': 'oracle',
  'oracle linux': 'oracle',
  // Amazon
  'amazon': 'amazon',
  'amazon linux': 'amazon',
  // 麒麟
  'kylin': 'kylin',
  '麒麟': 'kylin',
  '银河麒麟': 'kylin',
  '中标麒麟': 'kylin',
  // 统信
  'uos': 'uos',
  '统信': 'uos',
  '统信uos': 'uos',
  // 深度
  'deepin': 'deepin',
  '深度': 'deepin',
  // 红旗
  'redflag': 'redflag',
  '红旗': 'redflag',
  'red flag': 'redflag',
  // 方德
  'neokylin': 'neokylin',
  '方德': 'neokylin',
  '中科方德': 'neokylin',
  // 欧拉
  'openeuler': 'openeuler',
  '欧拉': 'openeuler',
  // 龙蜥
  'anolis': 'anolis',
  '龙蜥': 'anolis',
  'anolis os': 'anolis',
  // 阿里云
  'alibaba': 'alibaba',
  '阿里云': 'alibaba',
  'alios': 'alibaba',
  'alinux': 'alibaba',
  'alibaba cloud linux': 'alibaba',
  // 腾讯云
  'tencent': 'tencent',
  '腾讯云': 'tencent',
  'tencentos': 'tencent',
  'tlinux': 'tencent',
  // Linux
  'linux': 'linux'
};

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
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
  const osData = osIconMap[systemKey] || osIconMap['unknown'];
  const sizeClass = sizeMap[size];

  // 如果没有自定义图标，使用默认的 Server 图标
  if (!osData.icon) {
    return (
      <div
        className={`${sizeClass} ${className}`}
        style={{ color: osData.color }}
        title={osData.label}
      >
        <Server className="w-full h-full" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${className}`}
      title={osData.label}
    >
      {osData.icon}
    </div>
  );
};

// 获取系统标签颜色
export const getOSColor = (osKey?: string, systemType?: string): string => {
  if (osKey) {
    return osIconMap[osKey.toLowerCase()]?.color || '#94a3b8';
  }
  if (systemType) {
    const normalizedType = systemType.toLowerCase().trim();
    const key = systemTypeMapping[normalizedType] || normalizedType;
    return osIconMap[key]?.color || '#94a3b8';
  }
  return '#94a3b8';
};

// 获取系统显示名称
export const getOSLabel = (osKey?: string, systemType?: string): string => {
  if (osKey) {
    return osIconMap[osKey.toLowerCase()]?.label || systemType || 'Unknown';
  }
  if (systemType) {
    const normalizedType = systemType.toLowerCase().trim();
    const key = systemTypeMapping[normalizedType] || normalizedType;
    return osIconMap[key]?.label || systemType;
  }
  return 'Unknown';
};

export default OSIcon;
