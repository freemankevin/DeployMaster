# Linux SFTP 文件图标系统设计规范

> 基于 **Lucide React** 图标库，适配 React + Tailwind CSS 项目。
> 图标全部来自 `lucide-react`，无需额外依赖。
> 颜色遵循语义分组原则，同一类型文件使用相同色系。

---

## 一、设计原则

- **语义优先**：图标形状传达文件的「用途」，而非文件名
- **色彩分组**：同一大类文件使用同一色系，颜色数量控制在 7 种以内
- **尺寸统一**：列表中图标统一 `size={15} strokeWidth={1.8}`
- **透明度层级**：正常 `opacity: 0.9`，隐藏文件 `opacity: 0.45`，悬停高亮 `opacity: 1`
- **深色背景适配**：stroke 颜色使用中间色值（400 级），在 `#161618` 背景上清晰可辨

---

## 二、颜色系统

| 色系 | Hex（深色背景用） | 语义 |
|------|-----------------|------|
| Blue | `#378ADD` | 目录类 |
| Teal | `#1D9E75` | 可执行/脚本类、结构化数据 |
| Amber/Orange | `#D85A30` | 压缩/归档类 |
| Amber | `#BA7517` | 配置文件类 |
| Purple | `#7F77DD` | 文档/镜像类 |
| Pink | `#D4537E` | 密钥/证书类 |
| Gray | `#888780` | 普通文件、日志、符号链接 |
| Red | `#E24B4A` | 删除/错误操作按钮 |

---

## 三、目录类型

| 类型 | Lucide 图标 | 颜色 | 备注 |
|------|------------|------|------|
| 普通目录（折叠） | `Folder` | `#378ADD` | 默认蓝色目录 |
| 普通目录（展开） | `FolderOpen` | `#378ADD` | 点击展开后切换 |
| 隐藏目录（`.`开头） | `Folder` | `#888780` | 灰色 + opacity 0.5 |
| `/bin` 可执行目录 | `FolderCog` | `#BA7517` | 含可执行文件的系统目录 |
| `/lib` `/lib64` 库目录 | `FolderGit2` | `#1D9E75` | 绿色区分库文件夹 |
| `/etc` 配置目录 | `FolderCog` | `#BA7517` | 配置类 amber |
| `/var/log` 日志目录 | `FolderClock` | `#888780` | 灰色强调时间性 |
| `/tmp` 临时目录 | `FolderX` | `#888780` | 灰色，临时性 |
| `/home` 用户目录 | `Home` | `#378ADD` | 蓝色 Home 图标 |
| `/root` 根用户目录 | `Home` | `#D4537E` | 粉红强调特权 |
| `/proc` `/sys` 虚拟目录 | `Cpu` | `#888780` | 系统虚拟文件系统 |
| `/dev` 设备目录 | `HardDrive` | `#888780` | 设备节点 |
| 受保护目录（权限 700） | `Lock` | `#D4537E` | 粉红强调受限 |
| 空目录 | `FolderMinus` | `#888780` | 内容为空 |

```tsx
// 目录图标示例
import { Folder, FolderOpen, FolderCog, Home, Lock } from 'lucide-react'

function DirIcon({ name, isOpen, mode }: { name: string; isOpen: boolean; mode: number }) {
  const isHidden = name.startsWith('.')
  const isProtected = (mode & 0o777) === 0o700

  if (isProtected) return <Lock size={15} strokeWidth={1.8} style={{ color: '#D4537E' }} />
  if (name === 'bin' || name === 'sbin') return <FolderCog size={15} strokeWidth={1.8} style={{ color: '#BA7517' }} />
  if (name === 'home') return <Home size={15} strokeWidth={1.8} style={{ color: '#378ADD' }} />
  if (name === 'root') return <Home size={15} strokeWidth={1.8} style={{ color: '#D4537E' }} />

  const Icon = isOpen ? FolderOpen : Folder
  return <Icon size={15} strokeWidth={1.8} style={{ color: isHidden ? '#888780' : '#378ADD', opacity: isHidden ? 0.5 : 0.9 }} />
}
```

---

## 四、可执行文件 / 脚本类

> 统一色系：**Teal `#1D9E75`**，图标传达「可运行」语义

| 扩展名 / 类型 | Lucide 图标 | 备注 |
|-------------|------------|------|
| `.sh` `.bash` `.zsh` | `Terminal` （`> _`符号） | Shell 脚本，最常见 |
| `.py` | `Terminal` | Python 脚本 |
| `.rb` `.pl` `.php` | `Terminal` | 解释型脚本 |
| `.exe` | `Terminal` | Windows 可执行文件 |
| `.bin` `.run` | `Terminal` | Linux 二进制可执行 |
| `.AppImage` | `Terminal` | AppImage 可执行包 |
| `.out` `a.out` | `Terminal` | 编译输出可执行文件 |
| `.elf` | `Terminal` | ELF 二进制 |
| 无扩展名 + 有执行权限（`x` bit） | `Terminal` | chmod +x 的文件 |
| `.Makefile` `Makefile` | `Wrench` | 构建脚本 |
| `Dockerfile` | `Box` | 容器构建文件，可用 Teal |
| `docker-compose.yml` | `Layers` | 容器编排文件 |

```tsx
import { Terminal, Wrench, Box, Layers } from 'lucide-react'

const EXECUTABLE_EXTS = new Set(['sh', 'bash', 'zsh', 'py', 'rb', 'pl', 'exe', 'bin', 'run', 'out', 'elf', 'appimage'])

function isExecutableByMode(mode: number): boolean {
  return (mode & 0o111) !== 0  // 任意执行权限位
}

function getExecutableIcon(name: string, ext: string, mode: number) {
  if (name === 'Makefile' || name === 'makefile') return { Icon: Wrench, color: '#1D9E75' }
  if (name === 'Dockerfile') return { Icon: Box, color: '#1D9E75' }
  if (name === 'docker-compose.yml' || name === 'docker-compose.yaml') return { Icon: Layers, color: '#1D9E75' }
  if (EXECUTABLE_EXTS.has(ext) || isExecutableByMode(mode)) return { Icon: Terminal, color: '#1D9E75' }
  return null
}
```

---

## 五、压缩 / 归档类

> 统一色系：**Orange `#D85A30`**，图标使用 `Package`（3D 包裹体），强调「多文件聚合」

| 扩展名 | Lucide 图标 | 备注 |
|--------|------------|------|
| `.tar` | `Package` | 未压缩打包 |
| `.tar.gz` `.tgz` | `Package` | gzip 压缩包 |
| `.tar.bz2` `.tbz2` | `Package` | bzip2 压缩包 |
| `.tar.xz` `.txz` | `Package` | xz 压缩包 |
| `.tar.zst` | `Package` | zstd 压缩包 |
| `.gz` | `Package` | 单文件 gzip |
| `.bz2` | `Package` | 单文件 bzip2 |
| `.xz` | `Package` | 单文件 xz |
| `.zip` | `Package` | ZIP 压缩包 |
| `.rar` | `Package` | RAR 压缩包 |
| `.7z` | `Package` | 7-Zip 压缩包 |
| `.zst` | `Package` | Zstandard 压缩包 |
| `.deb` | `Package` | Debian 软件包 |
| `.rpm` | `Package` | RPM 软件包 |
| `.apk` | `Package` | Alpine Linux 包 |
| `.snap` | `Package` | Snap 软件包 |
| `.flatpak` | `Package` | Flatpak 包 |
| `.jar` `.war` `.ear` | `Package` | Java 归档包 |

```tsx
import { Package } from 'lucide-react'

// 注意：.tar.gz 等复合扩展名需要特殊处理
const ARCHIVE_EXTS = new Set([
  'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', 'txz',
  'zip', 'rar', '7z', 'zst', 'deb', 'rpm', 'apk',
  'snap', 'flatpak', 'jar', 'war', 'ear'
])

function isArchive(filename: string): boolean {
  // 处理复合扩展名
  if (filename.endsWith('.tar.gz') || filename.endsWith('.tar.bz2') ||
      filename.endsWith('.tar.xz') || filename.endsWith('.tar.zst')) return true
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return ARCHIVE_EXTS.has(ext)
}
```

---

## 六、配置文件类

> 统一色系：**Amber `#BA7517`**，图标使用 `Settings`（齿轮）

| 扩展名 / 文件名 | Lucide 图标 | 备注 |
|---------------|------------|------|
| `.conf` `.config` | `Settings` | 通用配置 |
| `.cfg` | `Settings` | 通用配置 |
| `.ini` | `Settings` | INI 格式配置 |
| `.env` `.env.*` | `Settings` | 环境变量 |
| `.yaml` `.yml` | `Settings` | YAML 配置（非 docker-compose） |
| `.toml` | `Settings` | TOML 配置 |
| `.properties` | `Settings` | Java Properties |
| `nginx.conf` `httpd.conf` | `Settings` | Web 服务器配置 |
| `.htaccess` | `Settings` | Apache 访问控制 |
| `crontab` `.cron` | `Clock` | 定时任务配置 |
| `.bashrc` `.zshrc` `.profile` | `Settings` | Shell 配置 |
| `.vimrc` `.nvimrc` | `Settings` | 编辑器配置 |
| `known_hosts` `authorized_keys` | `ShieldCheck` | SSH 授权配置，用 Pink |
| `sudoers` | `ShieldAlert` | sudo 配置，用 Pink |

---

## 七、结构化数据文件

> 统一色系：**Teal `#1D9E75`**，图标使用含 `{}` 的文件形

| 扩展名 | Lucide 图标 | 备注 |
|--------|------------|------|
| `.json` | `FileJson` | JSON 数据 |
| `.json5` | `FileJson` | JSON5 |
| `.xml` | `FileCode` | XML 数据 |
| `.html` `.htm` | `FileCode` | HTML 文件 |
| `.csv` | `Table` | CSV 表格数据 |
| `.tsv` | `Table` | TSV 表格数据 |
| `.parquet` | `Table` | 列式数据文件 |
| `.avro` | `Table` | Avro 数据 |
| `.proto` | `FileCode` | Protobuf 定义 |
| `.graphql` `.gql` | `FileCode` | GraphQL schema |
| `.sql` | `Database` | SQL 文件 |

---

## 八、数据库文件

> 统一色系：**Teal `#1D9E75`**，图标使用 `Database`（圆柱体）

| 扩展名 | Lucide 图标 | 备注 |
|--------|------------|------|
| `.db` `.sqlite` `.sqlite3` | `Database` | SQLite 数据库 |
| `.mdb` `.accdb` | `Database` | Access 数据库 |
| `.rdb` | `Database` | Redis 数据库快照 |
| `.dump` | `Database` | 数据库转储文件 |
| `.bak` | `DatabaseBackup` | 数据库备份 |

---

## 九、密钥 / 证书类

> 统一色系：**Pink `#D4537E`**，图标使用 `Shield`（盾牌），强调安全敏感

| 扩展名 / 文件名 | Lucide 图标 | 备注 |
|---------------|------------|------|
| `.pem` | `Shield` | PEM 格式证书/密钥 |
| `.key` `.privkey` | `Shield` | 私钥文件 |
| `.pub` | `ShieldCheck` | 公钥文件，用较浅颜色 |
| `.crt` `.cer` | `ShieldCheck` | 证书文件 |
| `.csr` | `Shield` | 证书签名请求 |
| `.p12` `.pfx` | `Shield` | PKCS#12 密钥库 |
| `.jks` | `Shield` | Java KeyStore |
| `.gpg` `.pgp` | `Lock` | GPG 加密文件 |
| `id_rsa` `id_ed25519` | `Shield` | SSH 私钥 |
| `id_rsa.pub` `id_ed25519.pub` | `ShieldCheck` | SSH 公钥 |

---

## 十、镜像文件

> 统一色系：**Purple `#7F77DD`**，图标使用 `Disc`（光盘圆环）

| 扩展名 | Lucide 图标 | 备注 |
|--------|------------|------|
| `.iso` | `Disc` | 光盘镜像 |
| `.img` | `HardDrive` | 磁盘镜像 |
| `.vhd` `.vhdx` | `HardDrive` | Hyper-V 虚拟磁盘 |
| `.vmdk` | `HardDrive` | VMware 磁盘 |
| `.qcow2` `.qcow` | `HardDrive` | QEMU 虚拟磁盘 |
| `.ova` `.ovf` | `Package` | 虚拟机模板，归档类 |
| `.raw` | `HardDrive` | 原始磁盘镜像 |

---

## 十一、文档类

> 统一色系：**Purple `#7F77DD`**

| 扩展名 | Lucide 图标 | 备注 |
|--------|------------|------|
| `.md` `.markdown` | `FileText`（自定义 M↓ 矩形） | Markdown 文档 |
| `.txt` | `FileText` | 纯文本 |
| `.rst` | `FileText` | reStructuredText |
| `.adoc` | `FileText` | AsciiDoc |
| `.pdf` | `FileText` | PDF 文档，可用红色 |
| `.doc` `.docx` | `FileText` | Word 文档 |
| `.log` | `ScrollText` | 日志文件，用 Gray |
| `.out` `.trace` | `ScrollText` | 程序输出日志 |

---

## 十二、代码源文件

> 统一色系：**Blue `#378ADD`**（区别于 Teal 脚本），图标 `FileCode`

| 扩展名 | Lucide 图标 | 备注 |
|--------|------------|------|
| `.c` `.h` | `FileCode` | C 源代码 |
| `.cpp` `.cc` `.hpp` | `FileCode` | C++ 源代码 |
| `.go` | `FileCode` | Go 源代码 |
| `.rs` | `FileCode` | Rust 源代码 |
| `.java` `.kt` | `FileCode` | Java / Kotlin |
| `.ts` `.tsx` | `FileCode` | TypeScript |
| `.js` `.jsx` | `FileCode` | JavaScript |
| `.vue` `.svelte` | `FileCode` | 前端框架文件 |
| `.css` `.scss` `.less` | `FileCode` | 样式文件 |
| `.lua` `.awk` | `FileCode` | 其他脚本语言 |

---

## 十三、符号链接 / 特殊文件

| 类型 | Lucide 图标 | 颜色 | 备注 |
|------|------------|------|------|
| 符号链接（symlink） | `Link` | `#888780` | 显示 `→ target` |
| 硬链接 | `Link2` | `#888780` | 与符号链接区分 |
| 设备文件（`/dev/*`） | `Cpu` | `#888780` | 字符/块设备 |
| 管道文件（FIFO） | `ArrowRight` | `#888780` | 命名管道 |
| Socket 文件 | `Radio` | `#888780` | Unix Domain Socket |
| 损坏的符号链接 | `LinkOff` | `#E24B4A` | 目标不存在时显示红色 |

---

## 十四、媒体 / 二进制文件

| 类型 | Lucide 图标 | 颜色 |
|------|------------|------|
| `.png` `.jpg` `.gif` `.webp` | `Image` | `#888780` |
| `.mp4` `.avi` `.mkv` | `Film` | `#888780` |
| `.mp3` `.wav` `.flac` | `Music` | `#888780` |
| `.ttf` `.otf` `.woff` | `Type` | `#888780` |
| 未知二进制 | `File` | `#888780` |

---

## 十五、操作工具栏图标

| 操作 | Lucide 图标 | 颜色 | 备注 |
|------|------------|------|------|
| 上传 | `Upload` | `#378ADD` | 蓝色主操作 |
| 下载 | `Download` | `#1D9E75` | 绿色 |
| 新建文件 | `FilePlus` | `#7F77DD` | 紫色 |
| 新建目录 | `FolderPlus` | `#378ADD` | 蓝色 |
| 重命名 | `Pencil` | `#888780` | 灰色次操作 |
| 移动 | `FolderInput` | `#888780` | |
| 复制 | `Copy` | `#888780` | |
| 复制路径 | `Clipboard` | `#888780` | |
| 删除 | `Trash2` | `#E24B4A` | 红色危险操作 |
| 刷新 | `RefreshCw` | `#888780` | |
| 搜索/过滤 | `Search` | `#888780` | |
| 权限设置 | `Share2` | `#BA7517` | |
| 返回上级 | `ChevronUp` | `#888780` | |
| 切换显示隐藏文件 | `Eye` / `EyeOff` | `#888780` | |

---

## 十六、状态徽标图标

> 叠加在文件图标右下角，尺寸 `size={8}`

| 状态 | Lucide 图标 | 颜色 |
|------|------------|------|
| 传输中 | `Loader` (旋转动画) | `#378ADD` |
| 传输完成 | `CheckCircle` | `#1D9E75` |
| 传输失败 | `XCircle` | `#E24B4A` |
| 权限警告 | `AlertTriangle` | `#BA7517` |
| 只读文件 | `Lock` | `#D4537E` |
| 隐藏文件 | `EyeOff` | `#888780` |
| 软链接 | `CornerDownRight` | `#888780` |

---

## 十七、完整 `getFileIcon` 工具函数

```typescript
// src/utils/fileIcons.ts

import {
  Folder, FolderOpen, FolderCog, FolderMinus,
  Home, Lock, Terminal, Package, Settings, Clock,
  Shield, ShieldCheck, Disc, HardDrive, Database,
  FileText, FileCode, FileJson, Table, Image, Film,
  Music, ScrollText, Link, Link2, LinkOff, Cpu,
  Radio, Type, File, Layers, Box, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface FileIconConfig {
  Icon: LucideIcon
  color: string
  opacity?: number
}

// 复合扩展名匹配（优先级高于单扩展名）
const COMPOUND_EXTS: Record<string, FileIconConfig> = {
  'tar.gz':  { Icon: Package, color: '#D85A30' },
  'tar.bz2': { Icon: Package, color: '#D85A30' },
  'tar.xz':  { Icon: Package, color: '#D85A30' },
  'tar.zst': { Icon: Package, color: '#D85A30' },
}

// 单扩展名映射
const EXT_MAP: Record<string, FileIconConfig> = {
  // 压缩归档
  tar: { Icon: Package, color: '#D85A30' },
  gz:  { Icon: Package, color: '#D85A30' },
  tgz: { Icon: Package, color: '#D85A30' },
  bz2: { Icon: Package, color: '#D85A30' },
  xz:  { Icon: Package, color: '#D85A30' },
  zip: { Icon: Package, color: '#D85A30' },
  rar: { Icon: Package, color: '#D85A30' },
  '7z':{ Icon: Package, color: '#D85A30' },
  zst: { Icon: Package, color: '#D85A30' },
  deb: { Icon: Package, color: '#D85A30' },
  rpm: { Icon: Package, color: '#D85A30' },
  apk: { Icon: Package, color: '#D85A30' },
  jar: { Icon: Package, color: '#D85A30' },
  war: { Icon: Package, color: '#D85A30' },

  // 可执行/脚本
  sh:       { Icon: Terminal, color: '#1D9E75' },
  bash:     { Icon: Terminal, color: '#1D9E75' },
  zsh:      { Icon: Terminal, color: '#1D9E75' },
  fish:     { Icon: Terminal, color: '#1D9E75' },
  py:       { Icon: Terminal, color: '#1D9E75' },
  rb:       { Icon: Terminal, color: '#1D9E75' },
  pl:       { Icon: Terminal, color: '#1D9E75' },
  php:      { Icon: Terminal, color: '#1D9E75' },
  exe:      { Icon: Terminal, color: '#1D9E75' },
  bin:      { Icon: Terminal, color: '#1D9E75' },
  run:      { Icon: Terminal, color: '#1D9E75' },
  out:      { Icon: Terminal, color: '#1D9E75' },
  elf:      { Icon: Terminal, color: '#1D9E75' },
  appimage: { Icon: Terminal, color: '#1D9E75' },

  // 配置文件
  conf:       { Icon: Settings, color: '#BA7517' },
  config:     { Icon: Settings, color: '#BA7517' },
  cfg:        { Icon: Settings, color: '#BA7517' },
  ini:        { Icon: Settings, color: '#BA7517' },
  env:        { Icon: Settings, color: '#BA7517' },
  yaml:       { Icon: Settings, color: '#BA7517' },
  yml:        { Icon: Settings, color: '#BA7517' },
  toml:       { Icon: Settings, color: '#BA7517' },
  properties: { Icon: Settings, color: '#BA7517' },

  // 结构化数据
  json:    { Icon: FileJson, color: '#1D9E75' },
  json5:   { Icon: FileJson, color: '#1D9E75' },
  xml:     { Icon: FileCode, color: '#1D9E75' },
  html:    { Icon: FileCode, color: '#1D9E75' },
  htm:     { Icon: FileCode, color: '#1D9E75' },
  csv:     { Icon: Table,    color: '#1D9E75' },
  tsv:     { Icon: Table,    color: '#1D9E75' },
  sql:     { Icon: Database, color: '#1D9E75' },

  // 数据库
  db:      { Icon: Database, color: '#1D9E75' },
  sqlite:  { Icon: Database, color: '#1D9E75' },
  sqlite3: { Icon: Database, color: '#1D9E75' },
  rdb:     { Icon: Database, color: '#1D9E75' },
  dump:    { Icon: Database, color: '#1D9E75' },

  // 密钥/证书
  pem:     { Icon: Shield,      color: '#D4537E' },
  key:     { Icon: Shield,      color: '#D4537E' },
  crt:     { Icon: ShieldCheck, color: '#D4537E' },
  cer:     { Icon: ShieldCheck, color: '#D4537E' },
  csr:     { Icon: Shield,      color: '#D4537E' },
  p12:     { Icon: Shield,      color: '#D4537E' },
  pfx:     { Icon: Shield,      color: '#D4537E' },
  jks:     { Icon: Shield,      color: '#D4537E' },
  gpg:     { Icon: Lock,        color: '#D4537E' },
  pgp:     { Icon: Lock,        color: '#D4537E' },
  pub:     { Icon: ShieldCheck, color: '#D4537E' },

  // 镜像文件
  iso:   { Icon: Disc,      color: '#7F77DD' },
  img:   { Icon: HardDrive, color: '#7F77DD' },
  vhd:   { Icon: HardDrive, color: '#7F77DD' },
  vhdx:  { Icon: HardDrive, color: '#7F77DD' },
  vmdk:  { Icon: HardDrive, color: '#7F77DD' },
  qcow2: { Icon: HardDrive, color: '#7F77DD' },
  raw:   { Icon: HardDrive, color: '#7F77DD' },

  // 文档
  md:       { Icon: FileText, color: '#7F77DD' },
  markdown: { Icon: FileText, color: '#7F77DD' },
  txt:      { Icon: FileText, color: '#7F77DD' },
  rst:      { Icon: FileText, color: '#7F77DD' },
  pdf:      { Icon: FileText, color: '#7F77DD' },
  doc:      { Icon: FileText, color: '#7F77DD' },
  docx:     { Icon: FileText, color: '#7F77DD' },

  // 日志
  log:   { Icon: ScrollText, color: '#888780' },
  trace: { Icon: ScrollText, color: '#888780' },

  // 代码源文件
  c:      { Icon: FileCode, color: '#378ADD' },
  h:      { Icon: FileCode, color: '#378ADD' },
  cpp:    { Icon: FileCode, color: '#378ADD' },
  cc:     { Icon: FileCode, color: '#378ADD' },
  hpp:    { Icon: FileCode, color: '#378ADD' },
  go:     { Icon: FileCode, color: '#378ADD' },
  rs:     { Icon: FileCode, color: '#378ADD' },
  java:   { Icon: FileCode, color: '#378ADD' },
  kt:     { Icon: FileCode, color: '#378ADD' },
  ts:     { Icon: FileCode, color: '#378ADD' },
  tsx:    { Icon: FileCode, color: '#378ADD' },
  js:     { Icon: FileCode, color: '#378ADD' },
  jsx:    { Icon: FileCode, color: '#378ADD' },
  vue:    { Icon: FileCode, color: '#378ADD' },
  svelte: { Icon: FileCode, color: '#378ADD' },
  css:    { Icon: FileCode, color: '#378ADD' },
  scss:   { Icon: FileCode, color: '#378ADD' },
  lua:    { Icon: FileCode, color: '#378ADD' },

  // 媒体
  png:  { Icon: Image, color: '#888780' },
  jpg:  { Icon: Image, color: '#888780' },
  jpeg: { Icon: Image, color: '#888780' },
  gif:  { Icon: Image, color: '#888780' },
  webp: { Icon: Image, color: '#888780' },
  svg:  { Icon: Image, color: '#888780' },
  mp4:  { Icon: Film,  color: '#888780' },
  avi:  { Icon: Film,  color: '#888780' },
  mkv:  { Icon: Film,  color: '#888780' },
  mp3:  { Icon: Music, color: '#888780' },
  wav:  { Icon: Music, color: '#888780' },
  flac: { Icon: Music, color: '#888780' },
  ttf:  { Icon: Type,  color: '#888780' },
  otf:  { Icon: Type,  color: '#888780' },
  woff: { Icon: Type,  color: '#888780' },
}

// 特殊文件名映射（完整文件名，优先级最高）
const FILENAME_MAP: Record<string, FileIconConfig> = {
  'Makefile':            { Icon: Wrench,  color: '#1D9E75' },
  'makefile':            { Icon: Wrench,  color: '#1D9E75' },
  'Dockerfile':          { Icon: Box,     color: '#1D9E75' },
  'docker-compose.yml':  { Icon: Layers,  color: '#1D9E75' },
  'docker-compose.yaml': { Icon: Layers,  color: '#1D9E75' },
  '.bashrc':             { Icon: Settings,color: '#BA7517' },
  '.zshrc':              { Icon: Settings,color: '#BA7517' },
  '.profile':            { Icon: Settings,color: '#BA7517' },
  '.vimrc':              { Icon: Settings,color: '#BA7517' },
  'crontab':             { Icon: Clock,   color: '#BA7517' },
  'authorized_keys':     { Icon: ShieldCheck, color: '#D4537E' },
  'known_hosts':         { Icon: ShieldCheck, color: '#D4537E' },
  'sudoers':             { Icon: Shield,  color: '#D4537E' },
  'id_rsa':              { Icon: Shield,  color: '#D4537E' },
  'id_ed25519':          { Icon: Shield,  color: '#D4537E' },
  'id_rsa.pub':          { Icon: ShieldCheck, color: '#D4537E' },
  'id_ed25519.pub':      { Icon: ShieldCheck, color: '#D4537E' },
}

export type SpecialFileType = 'symlink' | 'symlink_broken' | 'device' | 'fifo' | 'socket' | 'hardlink'

export function getSpecialIcon(type: SpecialFileType): FileIconConfig {
  switch (type) {
    case 'symlink':        return { Icon: Link,    color: '#888780' }
    case 'symlink_broken': return { Icon: LinkOff, color: '#E24B4A' }
    case 'device':         return { Icon: Cpu,     color: '#888780' }
    case 'fifo':           return { Icon: Radio,   color: '#888780' }
    case 'socket':         return { Icon: Radio,   color: '#888780' }
    case 'hardlink':       return { Icon: Link2,   color: '#888780' }
  }
}

export function getFileIcon(
  name: string,
  isDir: boolean,
  isOpen = false,
  mode = 0o644
): FileIconConfig {
  const isHidden = name.startsWith('.')

  // 目录
  if (isDir) {
    if ((mode & 0o777) === 0o700) return { Icon: Lock,      color: '#D4537E' }
    if (name === 'home')          return { Icon: Home,       color: '#378ADD' }
    if (name === 'root')          return { Icon: Home,       color: '#D4537E' }
    if (name === 'bin' || name === 'sbin') return { Icon: FolderCog, color: '#BA7517' }
    if (name === 'lib' || name === 'lib64') return { Icon: FolderCog, color: '#1D9E75' }
    if (name === 'tmp')           return { Icon: FolderMinus,color: '#888780' }

    const DirIcon = isOpen ? FolderOpen : Folder
    return { Icon: DirIcon, color: isHidden ? '#888780' : '#378ADD', opacity: isHidden ? 0.5 : 0.9 }
  }

  // 特殊文件名（最高优先级）
  if (FILENAME_MAP[name]) return FILENAME_MAP[name]

  // 复合扩展名
  const lower = name.toLowerCase()
  for (const compound of Object.keys(COMPOUND_EXTS)) {
    if (lower.endsWith('.' + compound)) return COMPOUND_EXTS[compound]
  }

  // 执行权限位判断（无扩展名可执行文件）
  if ((mode & 0o111) !== 0) {
    const ext = lower.split('.').pop() ?? ''
    if (!ext || !EXT_MAP[ext]) return { Icon: Terminal, color: '#1D9E75' }
  }

  // 单扩展名
  const ext = lower.split('.').pop() ?? ''
  if (EXT_MAP[ext]) return EXT_MAP[ext]

  // 隐藏文件（无法匹配的）
  if (isHidden) return { Icon: File, color: '#888780', opacity: 0.5 }

  // 默认普通文件
  return { Icon: File, color: '#888780' }
}
```

---

## 十八、React 组件使用示例

```tsx
// src/components/FileRow.tsx
import React from 'react'
import { getFileIcon, getSpecialIcon } from '@/utils/fileIcons'

interface FileEntry {
  name: string
  isDir: boolean
  size: number
  modTime: string
  permissions: string   // e.g. "drwxr-xr-x"
  mode: number          // numeric mode e.g. 0o755
  isOpen?: boolean
  symlinkTarget?: string
  isSymlink?: boolean
  isBrokenSymlink?: boolean
}

export function FileRow({ file }: { file: FileEntry }) {
  const { Icon, color, opacity = 0.9 } = file.isSymlink
    ? getSpecialIcon(file.isBrokenSymlink ? 'symlink_broken' : 'symlink')
    : getFileIcon(file.name, file.isDir, file.isOpen, file.mode)

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-md
                    hover:bg-white/5 cursor-pointer select-none">
      <Icon
        size={15}
        strokeWidth={1.8}
        style={{ color, opacity, flexShrink: 0 }}
      />
      <span className={`flex-1 text-sm truncate ${
        file.name.startsWith('.') ? 'text-gray-500' : 'text-gray-200'
      }`}>
        {file.name}
        {file.isSymlink && file.symlinkTarget && (
          <span className="text-gray-600 ml-1">→ {file.symlinkTarget}</span>
        )}
      </span>
      <span className="text-xs text-gray-600 min-w-[60px] text-right">
        {file.isDir ? '' : formatSize(file.size)}
      </span>
      <span className="text-xs text-gray-600 min-w-[140px] text-right">
        {file.modTime}
      </span>
      <span className="font-mono text-xs text-gray-700 min-w-[90px] text-right">
        {file.permissions}
      </span>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}
```

---

*文档版本：1.0 | 图标库：lucide-react | 适用项目：DeployMaster SFTP 模块*
