import type { SFTPFile } from '@/services/api';

interface FileIconProps {
  file: SFTPFile;
  size?: 'sm' | 'md' | 'lg';
  isOpen?: boolean;
}

// ============================================
// 颜色系统 - 遵循文档规范
// ============================================
const colors = {
  // Blue - 目录类
  blue: '#378ADD',
  // Teal - 可执行/脚本类、结构化数据
  teal: '#1D9E75',
  // Orange - 压缩/归档类
  orange: '#D85A30',
  // Amber - 配置文件类
  amber: '#BA7517',
  // Purple - 文档/镜像类
  purple: '#7F77DD',
  // Pink - 密钥/证书类
  pink: '#D4537E',
  // Gray - 普通文件、日志、符号链接
  gray: '#888780',
  // Red - 删除/错误操作
  red: '#E24B4A',
};

// ============================================
// 图标配置接口 - 使用 Font Awesome 类名
// ============================================
interface IconConfig {
  icon: string; // Font Awesome icon class (e.g., 'fa-folder')
  color: string;
  opacity?: number;
  style?: 'solid' | 'regular';
}

// ============================================
// 复合扩展名映射（优先级高于单扩展名）
// ============================================
const COMPOUND_EXTS: Record<string, IconConfig> = {
  'tar.gz': { icon: 'fa-file-zipper', color: colors.orange },
  'tar.bz2': { icon: 'fa-file-zipper', color: colors.orange },
  'tar.xz': { icon: 'fa-file-zipper', color: colors.orange },
  'tar.zst': { icon: 'fa-file-zipper', color: colors.orange },
};

// ============================================
// 单扩展名映射
// ============================================
const EXT_MAP: Record<string, IconConfig> = {
  // ========== 压缩归档 ==========
  tar: { icon: 'fa-file-zipper', color: colors.orange },
  gz: { icon: 'fa-file-zipper', color: colors.orange },
  tgz: { icon: 'fa-file-zipper', color: colors.orange },
  bz2: { icon: 'fa-file-zipper', color: colors.orange },
  tbz2: { icon: 'fa-file-zipper', color: colors.orange },
  xz: { icon: 'fa-file-zipper', color: colors.orange },
  txz: { icon: 'fa-file-zipper', color: colors.orange },
  zst: { icon: 'fa-file-zipper', color: colors.orange },
  zip: { icon: 'fa-file-zipper', color: colors.orange },
  rar: { icon: 'fa-file-zipper', color: colors.orange },
  '7z': { icon: 'fa-file-zipper', color: colors.orange },
  deb: { icon: 'fa-file-zipper', color: colors.orange },
  rpm: { icon: 'fa-file-zipper', color: colors.orange },
  apk: { icon: 'fa-file-zipper', color: colors.orange },
  snap: { icon: 'fa-file-zipper', color: colors.orange },
  flatpak: { icon: 'fa-file-zipper', color: colors.orange },
  jar: { icon: 'fa-file-zipper', color: colors.orange },
  war: { icon: 'fa-file-zipper', color: colors.orange },
  ear: { icon: 'fa-file-zipper', color: colors.orange },

  // ========== 可执行/脚本 ==========
  sh: { icon: 'fa-terminal', color: colors.teal },
  bash: { icon: 'fa-terminal', color: colors.teal },
  zsh: { icon: 'fa-terminal', color: colors.teal },
  fish: { icon: 'fa-terminal', color: colors.teal },
  py: { icon: 'fa-terminal', color: colors.teal },
  rb: { icon: 'fa-terminal', color: colors.teal },
  pl: { icon: 'fa-terminal', color: colors.teal },
  php: { icon: 'fa-terminal', color: colors.teal },
  exe: { icon: 'fa-terminal', color: colors.teal },
  bin: { icon: 'fa-terminal', color: colors.teal },
  run: { icon: 'fa-terminal', color: colors.teal },
  out: { icon: 'fa-terminal', color: colors.teal },
  elf: { icon: 'fa-terminal', color: colors.teal },
  appimage: { icon: 'fa-terminal', color: colors.teal },

  // ========== 配置文件 ==========
  conf: { icon: 'fa-gear', color: colors.amber },
  config: { icon: 'fa-gear', color: colors.amber },
  cfg: { icon: 'fa-gear', color: colors.amber },
  ini: { icon: 'fa-gear', color: colors.amber },
  env: { icon: 'fa-gear', color: colors.amber },
  yaml: { icon: 'fa-gear', color: colors.amber },
  yml: { icon: 'fa-gear', color: colors.amber },
  toml: { icon: 'fa-gear', color: colors.amber },
  properties: { icon: 'fa-gear', color: colors.amber },

  // ========== 结构化数据 ==========
  json: { icon: 'fa-file-code', color: colors.teal },
  json5: { icon: 'fa-file-code', color: colors.teal },
  xml: { icon: 'fa-file-code', color: colors.teal },
  html: { icon: 'fa-file-code', color: colors.teal },
  htm: { icon: 'fa-file-code', color: colors.teal },
  csv: { icon: 'fa-file-csv', color: colors.teal },
  tsv: { icon: 'fa-file-csv', color: colors.teal },
  parquet: { icon: 'fa-file-csv', color: colors.teal },
  avro: { icon: 'fa-file-csv', color: colors.teal },
  proto: { icon: 'fa-file-code', color: colors.teal },
  graphql: { icon: 'fa-file-code', color: colors.teal },
  gql: { icon: 'fa-file-code', color: colors.teal },
  sql: { icon: 'fa-database', color: colors.teal },

  // ========== 数据库 ==========
  db: { icon: 'fa-database', color: colors.teal },
  sqlite: { icon: 'fa-database', color: colors.teal },
  sqlite3: { icon: 'fa-database', color: colors.teal },
  mdb: { icon: 'fa-database', color: colors.teal },
  accdb: { icon: 'fa-database', color: colors.teal },
  rdb: { icon: 'fa-database', color: colors.teal },
  dump: { icon: 'fa-database', color: colors.teal },
  bak: { icon: 'fa-database', color: colors.teal },

  // ========== 密钥/证书 ==========
  pem: { icon: 'fa-shield-halved', color: colors.pink },
  key: { icon: 'fa-shield-halved', color: colors.pink },
  privkey: { icon: 'fa-shield-halved', color: colors.pink },
  pub: { icon: 'fa-shield-halved', color: colors.pink },
  crt: { icon: 'fa-shield-halved', color: colors.pink },
  cer: { icon: 'fa-shield-halved', color: colors.pink },
  csr: { icon: 'fa-shield-halved', color: colors.pink },
  p12: { icon: 'fa-shield-halved', color: colors.pink },
  pfx: { icon: 'fa-shield-halved', color: colors.pink },
  jks: { icon: 'fa-shield-halved', color: colors.pink },
  gpg: { icon: 'fa-lock', color: colors.pink },
  pgp: { icon: 'fa-lock', color: colors.pink },

  // ========== 镜像文件 ==========
  iso: { icon: 'fa-compact-disc', color: colors.purple },
  img: { icon: 'fa-hard-drive', color: colors.purple },
  vhd: { icon: 'fa-hard-drive', color: colors.purple },
  vhdx: { icon: 'fa-hard-drive', color: colors.purple },
  vmdk: { icon: 'fa-hard-drive', color: colors.purple },
  qcow2: { icon: 'fa-hard-drive', color: colors.purple },
  qcow: { icon: 'fa-hard-drive', color: colors.purple },
  raw: { icon: 'fa-hard-drive', color: colors.purple },

  // ========== 文档 ==========
  md: { icon: 'fa-file-lines', color: colors.purple },
  markdown: { icon: 'fa-file-lines', color: colors.purple },
  txt: { icon: 'fa-file-lines', color: colors.purple },
  rst: { icon: 'fa-file-lines', color: colors.purple },
  adoc: { icon: 'fa-file-lines', color: colors.purple },
  pdf: { icon: 'fa-file-pdf', color: colors.purple },
  doc: { icon: 'fa-file-word', color: colors.purple },
  docx: { icon: 'fa-file-word', color: colors.purple },

  // ========== 日志 ==========
  log: { icon: 'fa-scroll', color: colors.gray },
  trace: { icon: 'fa-scroll', color: colors.gray },

  // ========== 代码源文件 ==========
  c: { icon: 'fa-file-code', color: colors.blue },
  h: { icon: 'fa-file-code', color: colors.blue },
  cpp: { icon: 'fa-file-code', color: colors.blue },
  cc: { icon: 'fa-file-code', color: colors.blue },
  hpp: { icon: 'fa-file-code', color: colors.blue },
  cxx: { icon: 'fa-file-code', color: colors.blue },
  go: { icon: 'fa-file-code', color: colors.blue },
  rs: { icon: 'fa-file-code', color: colors.blue },
  java: { icon: 'fa-file-code', color: colors.blue },
  kt: { icon: 'fa-file-code', color: colors.blue },
  kts: { icon: 'fa-file-code', color: colors.blue },
  ts: { icon: 'fa-file-code', color: colors.blue },
  tsx: { icon: 'fa-file-code', color: colors.blue },
  js: { icon: 'fa-file-code', color: colors.blue },
  jsx: { icon: 'fa-file-code', color: colors.blue },
  vue: { icon: 'fa-file-code', color: colors.blue },
  svelte: { icon: 'fa-file-code', color: colors.blue },
  css: { icon: 'fa-file-code', color: colors.blue },
  scss: { icon: 'fa-file-code', color: colors.blue },
  sass: { icon: 'fa-file-code', color: colors.blue },
  less: { icon: 'fa-file-code', color: colors.blue },
  lua: { icon: 'fa-file-code', color: colors.blue },
  awk: { icon: 'fa-file-code', color: colors.blue },
  swift: { icon: 'fa-file-code', color: colors.blue },
  cs: { icon: 'fa-file-code', color: colors.blue },

  // ========== 媒体文件 ==========
  png: { icon: 'fa-file-image', color: colors.gray },
  jpg: { icon: 'fa-file-image', color: colors.gray },
  jpeg: { icon: 'fa-file-image', color: colors.gray },
  gif: { icon: 'fa-file-image', color: colors.gray },
  webp: { icon: 'fa-file-image', color: colors.gray },
  svg: { icon: 'fa-file-image', color: colors.gray },
  bmp: { icon: 'fa-file-image', color: colors.gray },
  ico: { icon: 'fa-file-image', color: colors.gray },
  tiff: { icon: 'fa-file-image', color: colors.gray },
  heic: { icon: 'fa-file-image', color: colors.gray },
  cr2: { icon: 'fa-file-image', color: colors.gray },
  nef: { icon: 'fa-file-image', color: colors.gray },
  arw: { icon: 'fa-file-image', color: colors.gray },
  dng: { icon: 'fa-file-image', color: colors.gray },
  mp4: { icon: 'fa-file-video', color: colors.gray },
  avi: { icon: 'fa-file-video', color: colors.gray },
  mkv: { icon: 'fa-file-video', color: colors.gray },
  mov: { icon: 'fa-file-video', color: colors.gray },
  wmv: { icon: 'fa-file-video', color: colors.gray },
  flv: { icon: 'fa-file-video', color: colors.gray },
  webm: { icon: 'fa-file-video', color: colors.gray },
  m4v: { icon: 'fa-file-video', color: colors.gray },
  mpg: { icon: 'fa-file-video', color: colors.gray },
  mpeg: { icon: 'fa-file-video', color: colors.gray },
  '3gp': { icon: 'fa-file-video', color: colors.gray },
  mp3: { icon: 'fa-file-audio', color: colors.gray },
  wav: { icon: 'fa-file-audio', color: colors.gray },
  flac: { icon: 'fa-file-audio', color: colors.gray },
  aac: { icon: 'fa-file-audio', color: colors.gray },
  ogg: { icon: 'fa-file-audio', color: colors.gray },
  m4a: { icon: 'fa-file-audio', color: colors.gray },
  wma: { icon: 'fa-file-audio', color: colors.gray },
  aiff: { icon: 'fa-file-audio', color: colors.gray },
  opus: { icon: 'fa-file-audio', color: colors.gray },
  ttf: { icon: 'fa-font', color: colors.gray },
  otf: { icon: 'fa-font', color: colors.gray },
  woff: { icon: 'fa-font', color: colors.gray },
  woff2: { icon: 'fa-font', color: colors.gray },
};

// ============================================
// 特殊文件名映射（完整文件名，优先级最高）
// ============================================
const FILENAME_MAP: Record<string, IconConfig> = {
  // 构建脚本
  Makefile: { icon: 'fa-wrench', color: colors.teal },
  makefile: { icon: 'fa-wrench', color: colors.teal },
  GNUmakefile: { icon: 'fa-wrench', color: colors.teal },
  // Docker
  Dockerfile: { icon: 'fa-cube', color: colors.teal },
  'docker-compose.yml': { icon: 'fa-layer-group', color: colors.teal },
  'docker-compose.yaml': { icon: 'fa-layer-group', color: colors.teal },
  // Shell 配置
  '.bashrc': { icon: 'fa-gear', color: colors.amber },
  '.zshrc': { icon: 'fa-gear', color: colors.amber },
  '.profile': { icon: 'fa-gear', color: colors.amber },
  '.bash_profile': { icon: 'fa-gear', color: colors.amber },
  '.zprofile': { icon: 'fa-gear', color: colors.amber },
  // 编辑器配置
  '.vimrc': { icon: 'fa-gear', color: colors.amber },
  '.nvimrc': { icon: 'fa-gear', color: colors.amber },
  '.gitconfig': { icon: 'fa-gear', color: colors.amber },
  '.gitignore': { icon: 'fa-gear', color: colors.amber },
  // 定时任务
  crontab: { icon: 'fa-clock', color: colors.amber },
  // SSH 授权配置
  authorized_keys: { icon: 'fa-shield-halved', color: colors.pink },
  known_hosts: { icon: 'fa-shield-halved', color: colors.pink },
  config: { icon: 'fa-shield-halved', color: colors.pink },
  // sudo 配置
  sudoers: { icon: 'fa-shield-halved', color: colors.pink },
  // SSH 密钥
  id_rsa: { icon: 'fa-shield-halved', color: colors.pink },
  id_ed25519: { icon: 'fa-shield-halved', color: colors.pink },
  id_ecdsa: { icon: 'fa-shield-halved', color: colors.pink },
  id_dsa: { icon: 'fa-shield-halved', color: colors.pink },
  'id_rsa.pub': { icon: 'fa-shield-halved', color: colors.pink },
  'id_ed25519.pub': { icon: 'fa-shield-halved', color: colors.pink },
  'id_ecdsa.pub': { icon: 'fa-shield-halved', color: colors.pink },
  'id_dsa.pub': { icon: 'fa-shield-halved', color: colors.pink },
};

// ============================================
// 从权限字符串解析数字模式
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
// 判断是否有执行权限
// ============================================
function isExecutableByMode(mode: number): boolean {
  return (mode & 0o111) !== 0;
}

// ============================================
// 获取文件图标配置
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

  // ========== 符号链接 ==========
  if (isSymlink) {
    return { icon: 'fa-link', color: colors.amber };
  }

  // ========== 目录 ==========
  if (isDir) {
    const dirIcon = isOpen ? 'fa-folder-open' : 'fa-folder';
    return {
      icon: dirIcon,
      color: isHidden ? colors.gray : colors.blue,
      opacity: isHidden ? 0.5 : 0.9,
      style: 'solid',
    };
  }

  // ========== 特殊文件名（最高优先级）==========
  if (FILENAME_MAP[name]) {
    return FILENAME_MAP[name];
  }

  // ========== 复合扩展名 ==========
  const lower = name.toLowerCase();
  for (const compound of Object.keys(COMPOUND_EXTS)) {
    if (lower.endsWith('.' + compound)) {
      return COMPOUND_EXTS[compound];
    }
  }

  // ========== 执行权限位判断（无扩展名可执行文件）==========
  if (isExecutableByMode(mode)) {
    const ext = lower.split('.').pop() ?? '';
    if (!ext || !EXT_MAP[ext]) {
      return { icon: 'fa-terminal', color: colors.teal };
    }
  }

  // ========== 单扩展名 ==========
  const ext = lower.split('.').pop() ?? '';
  if (EXT_MAP[ext]) {
    return EXT_MAP[ext];
  }

  // ========== 隐藏文件（无法匹配的）==========
  if (isHidden) {
    return { icon: 'fa-file', color: colors.gray, opacity: 0.5 };
  }

  // ========== 默认普通文件 ==========
  return { icon: 'fa-file', color: colors.gray };
}

// ============================================
// FileIcon 组件
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

  // 获取图标配置
  const config = getFileIconConfig(
    file.name,
    file.is_dir,
    isOpen,
    file.permissions,
    file.is_link
  );

  const { icon, color, opacity = 0.9, style = 'solid' } = config;
  const isHidden = file.name.startsWith('.');

  // 构建完整的 Font Awesome 类名
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
