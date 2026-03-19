import type { SFTPFile } from '@/services/api';
import { colors, COMPOUND_EXTS, EXT_MAP, FILENAME_MAP, type IconConfig } from './fileIconConfig';

interface FileIconProps {
  file: SFTPFile;
  size?: 'sm' | 'md' | 'lg';
  isOpen?: boolean;
}

// ============================================
// Parse numeric mode from permission string
// ============================================
function parsePermissions(permissions: string): number {
  const permStr = permissions.slice(-9);
  let mode = 0;
  
  if (permStr[0] === 'r') mode |= 0o400;
  if (permStr[1] === 'w') mode |= 0o200;
  if (permStr[2] === 'x' || permStr[2] === 's' || permStr[2] === 'S') mode |= 0o100;
  
  if (permStr[3] === 'r') mode |= 0o040;
  if (permStr[4] === 'w') mode |= 0o020;
  if (permStr[5] === 'x' || permStr[5] === 's' || permStr[5] === 'S') mode |= 0o010;
  
  if (permStr[6] === 'r') mode |= 0o004;
  if (permStr[7] === 'w') mode |= 0o002;
  if (permStr[8] === 'x' || permStr[8] === 't' || permStr[8] === 'T') mode |= 0o001;
  
  return mode;
}

// ============================================
// Check if has execute permission
// ============================================
function isExecutableByMode(mode: number): boolean {
  return (mode & 0o111) !== 0;
}

// ============================================
// Get file icon config
// ============================================
function getFileIconConfig(
  name: string,
  isDir: boolean,
  isOpen = false,
  permissions = '-rw-r--r--',
  isSymlink = false
): IconConfig {
  const isHidden = name.startsWith('.');
  const mode = parsePermissions(permissions);

  // ========== Symlink ==========
  if (isSymlink) {
    return { icon: 'fa-link', color: colors.amber };
  }

  // ========== Directory ==========
  if (isDir) {
    const dirIcon = isOpen ? 'fa-folder-open' : 'fa-folder';
    return {
      icon: dirIcon,
      color: isHidden ? colors.gray : colors.blue,
      opacity: isHidden ? 0.5 : 0.9,
      style: 'solid',
    };
  }

  // ========== Special filename (highest priority) ==========
  if (FILENAME_MAP[name]) {
    return FILENAME_MAP[name];
  }

  // ========== Compound extension ==========
  const lower = name.toLowerCase();
  for (const compound of Object.keys(COMPOUND_EXTS)) {
    if (lower.endsWith('.' + compound)) {
      return COMPOUND_EXTS[compound];
    }
  }

  // ========== Execute permission bit check (no extension executable file) ==========
  if (isExecutableByMode(mode)) {
    const ext = lower.split('.').pop() ?? '';
    if (!ext || !EXT_MAP[ext]) {
      return { icon: 'fa-terminal', color: colors.teal };
    }
  }

  // ========== Single extension ==========
  const ext = lower.split('.').pop() ?? '';
  if (EXT_MAP[ext]) {
    return EXT_MAP[ext];
  }

  // ========== Hidden file (unmatched) ==========
  if (isHidden) {
    return { icon: 'fa-file', color: colors.gray, opacity: 0.5 };
  }

  // ========== Default regular file ==========
  return { icon: 'fa-file', color: colors.gray };
}

// ============================================
// FileIcon Component
// ============================================
const FileIcon = ({ file, size = 'md', isOpen = false }: FileIconProps) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'text-[15px]',
    md: 'text-base',
    lg: 'text-2xl',
  };

  const containerClass = sizeClasses[size];
  const iconSizeClass = iconSizes[size];

  // Get icon config
  const config = getFileIconConfig(
    file.name,
    file.is_dir,
    isOpen,
    file.permissions,
    file.is_link
  );

  const { icon, color, opacity = 0.9, style = 'solid' } = config;
  const isHidden = file.name.startsWith('.');

  // Build complete Font Awesome class name
  const faClass = style === 'regular' 
    ? `fa-regular ${icon}` 
    : `fa-solid ${icon}`;

  return (
    <div className={`${containerClass} flex items-center justify-center`}>
      <i
        className={`${faClass} ${iconSizeClass}`}
        style={{
          color,
          opacity: file.is_dir && isHidden ? 0.5 : opacity,
        }}
      />
    </div>
  );
};

export default FileIcon;