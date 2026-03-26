// ============================================
// Color system - Following document specifications
// ============================================
export const colors = {
  // Primary - Directory type, source code
  blue: '#8B5CF6',
  // Teal - Executable/script type, structured data
  teal: '#22C55E',
  // Orange - Compressed/archive type
  orange: '#F97316',
  // Amber - Config file type
  amber: '#EAB308',
  // Purple - Document/image type
  purple: '#A855F7',
  // Pink - Key/certificate type
  pink: '#EC4899',
  // Gray - Regular file, log, symlink
  gray: '#71717A',
  // Red - Delete/error operation
  red: '#EF4444',
};

// ============================================
// Icon config interface - Using Font Awesome class names
// ============================================
export interface IconConfig {
  icon: string; // Font Awesome icon class (e.g., 'fa-folder')
  color: string;
  opacity?: number;
  style?: 'solid' | 'regular';
}

// ============================================
// Compound extension mapping (higher priority than single extension)
// ============================================
export const COMPOUND_EXTS: Record<string, IconConfig> = {
  'tar.gz': { icon: 'fa-file-zipper', color: colors.orange },
  'tar.bz2': { icon: 'fa-file-zipper', color: colors.orange },
  'tar.xz': { icon: 'fa-file-zipper', color: colors.orange },
  'tar.zst': { icon: 'fa-file-zipper', color: colors.orange },
};

// ============================================
// Single extension mapping
// ============================================
export const EXT_MAP: Record<string, IconConfig> = {
  // ========== Compressed archives ==========
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

  // ========== Executable/script ==========
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

  // ========== Config files ==========
  conf: { icon: 'fa-gear', color: colors.amber },
  config: { icon: 'fa-gear', color: colors.amber },
  cfg: { icon: 'fa-gear', color: colors.amber },
  ini: { icon: 'fa-gear', color: colors.amber },
  env: { icon: 'fa-gear', color: colors.amber },
  yaml: { icon: 'fa-gear', color: colors.amber },
  yml: { icon: 'fa-gear', color: colors.amber },
  toml: { icon: 'fa-gear', color: colors.amber },
  properties: { icon: 'fa-gear', color: colors.amber },

  // ========== Structured data ==========
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

  // ========== Database ==========
  db: { icon: 'fa-database', color: colors.teal },
  sqlite: { icon: 'fa-database', color: colors.teal },
  sqlite3: { icon: 'fa-database', color: colors.teal },
  mdb: { icon: 'fa-database', color: colors.teal },
  accdb: { icon: 'fa-database', color: colors.teal },
  rdb: { icon: 'fa-database', color: colors.teal },
  dump: { icon: 'fa-database', color: colors.teal },
  bak: { icon: 'fa-database', color: colors.teal },

  // ========== Key/certificate ==========
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

  // ========== Image files ==========
  iso: { icon: 'fa-compact-disc', color: colors.purple },
  img: { icon: 'fa-hard-drive', color: colors.purple },
  vhd: { icon: 'fa-hard-drive', color: colors.purple },
  vhdx: { icon: 'fa-hard-drive', color: colors.purple },
  vmdk: { icon: 'fa-hard-drive', color: colors.purple },
  qcow2: { icon: 'fa-hard-drive', color: colors.purple },
  qcow: { icon: 'fa-hard-drive', color: colors.purple },
  raw: { icon: 'fa-hard-drive', color: colors.purple },

  // ========== Documents ==========
  md: { icon: 'fa-file-lines', color: colors.purple },
  markdown: { icon: 'fa-file-lines', color: colors.purple },
  txt: { icon: 'fa-file-lines', color: colors.purple },
  rst: { icon: 'fa-file-lines', color: colors.purple },
  adoc: { icon: 'fa-file-lines', color: colors.purple },
  pdf: { icon: 'fa-file-pdf', color: colors.purple },
  doc: { icon: 'fa-file-word', color: colors.purple },
  docx: { icon: 'fa-file-word', color: colors.purple },

  // ========== Logs ==========
  log: { icon: 'fa-scroll', color: colors.gray },
  trace: { icon: 'fa-scroll', color: colors.gray },

  // ========== Source code ==========
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

  // ========== Media files ==========
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
// Special filename mapping (full filename, highest priority)
// ============================================
export const FILENAME_MAP: Record<string, IconConfig> = {
  // Build scripts
  Makefile: { icon: 'fa-wrench', color: colors.teal },
  makefile: { icon: 'fa-wrench', color: colors.teal },
  GNUmakefile: { icon: 'fa-wrench', color: colors.teal },
  // Docker
  Dockerfile: { icon: 'fa-cube', color: colors.teal },
  'docker-compose.yml': { icon: 'fa-layer-group', color: colors.teal },
  'docker-compose.yaml': { icon: 'fa-layer-group', color: colors.teal },
  // Shell config
  '.bashrc': { icon: 'fa-gear', color: colors.amber },
  '.zshrc': { icon: 'fa-gear', color: colors.amber },
  '.profile': { icon: 'fa-gear', color: colors.amber },
  '.bash_profile': { icon: 'fa-gear', color: colors.amber },
  '.zprofile': { icon: 'fa-gear', color: colors.amber },
  // Editor config
  '.vimrc': { icon: 'fa-gear', color: colors.amber },
  '.nvimrc': { icon: 'fa-gear', color: colors.amber },
  '.gitconfig': { icon: 'fa-gear', color: colors.amber },
  '.gitignore': { icon: 'fa-gear', color: colors.amber },
  // Cron
  crontab: { icon: 'fa-clock', color: colors.amber },
  // SSH auth config
  authorized_keys: { icon: 'fa-shield-halved', color: colors.pink },
  known_hosts: { icon: 'fa-shield-halved', color: colors.pink },
  config: { icon: 'fa-shield-halved', color: colors.pink },
  // sudo config
  sudoers: { icon: 'fa-shield-halved', color: colors.pink },
  // SSH keys
  id_rsa: { icon: 'fa-shield-halved', color: colors.pink },
  id_ed25519: { icon: 'fa-shield-halved', color: colors.pink },
  id_ecdsa: { icon: 'fa-shield-halved', color: colors.pink },
  id_dsa: { icon: 'fa-shield-halved', color: colors.pink },
  'id_rsa.pub': { icon: 'fa-shield-halved', color: colors.pink },
  'id_ed25519.pub': { icon: 'fa-shield-halved', color: colors.pink },
  'id_ecdsa.pub': { icon: 'fa-shield-halved', color: colors.pink },
  'id_dsa.pub': { icon: 'fa-shield-halved', color: colors.pink },
};