import { 
  Folder, 
  File, 
  FileCode, 
  FileJson, 
  FileText, 
  Terminal, 
  Image, 
  FileArchive, 
  FileSpreadsheet, 
  Settings, 
  Link2, 
  Music, 
  Video, 
  Database,
  Braces,
  Hash,
  FileType2,
  FileImage,
  FileAudio,
  FileVideo,
  FileBox,
  FileCog,
  FileKey,
  FileLock,
  FileCode2,
  FileStack
} from 'lucide-react';
import type { SFTPFile } from '@/services/api';

interface FileIconProps {
  file: SFTPFile;
  size?: 'sm' | 'md' | 'lg';
}

// Tabby-style color palette (without backgrounds)
const tabbyColors = {
  folder: '#F0C75E',       // Yellow/Gold for folders
  folderOpen: '#E5B84A',   // Slightly darker for open folders
  link: '#A78BFA',         // Purple for symlinks
  code: '#60A5FA',         // Blue for code files
  image: '#F472B6',        // Pink for images
  video: '#FB7185',        // Red/Rose for videos
  audio: '#A78BFA',        // Purple for audio
  archive: '#FBBF24',      // Yellow/Amber for archives
  document: '#34D399',     // Green for documents
  config: '#22D3EE',       // Cyan for config files
  data: '#818CF8',         // Indigo for data files
  executable: '#4ADE80',   // Green for executables
  default: '#9CA3AF'       // Gray for default
};

const FileIcon = ({ file, size = 'md' }: FileIconProps) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-12 h-12'
  };

  const iconSize = sizeClasses[size];
  const iconInnerSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

  // Symlink - simple icon without background
  if (file.is_link) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <Link2 
          className={iconInnerSize}
          style={{ color: tabbyColors.link }}
        />
      </div>
    );
  }

  // Folder - solid filled icon (no background)
  if (file.is_dir) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <Folder 
          className={iconInnerSize}
          style={{ color: tabbyColors.folder }}
          fill={tabbyColors.folder}
        />
      </div>
    );
  }

  // Get file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const name = file.name.toLowerCase();

  // Code files
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'm', 'mm'];
  if (codeExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileCode2 
          className={iconInnerSize}
          style={{ color: tabbyColors.code }}
        />
      </div>
    );
  }

  // JSON files
  if (ext === 'json') {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <Braces 
          className={iconInnerSize}
          style={{ color: tabbyColors.config }}
        />
      </div>
    );
  }

  // Markdown files
  if (ext === 'md' || ext === 'markdown' || ext === 'mdx') {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileText 
          className={iconInnerSize}
          style={{ color: '#14B8A6' }}
        />
      </div>
    );
  }

  // Shell scripts
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh' || ext === 'fish' || name === 'makefile' || ext === 'mk') {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <Terminal 
          className={iconInnerSize}
          style={{ color: tabbyColors.executable }}
        />
      </div>
    );
  }

  // Image files
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'raw', 'heic'];
  if (imageExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileImage 
          className={iconInnerSize}
          style={{ color: tabbyColors.image }}
        />
      </div>
    );
  }

  // Video files
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp'];
  if (videoExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileVideo 
          className={iconInnerSize}
          style={{ color: tabbyColors.video }}
        />
      </div>
    );
  }

  // Audio files
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'aiff', 'opus'];
  if (audioExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileAudio 
          className={iconInnerSize}
          style={{ color: tabbyColors.audio }}
        />
      </div>
    );
  }

  // Archive files
  const archiveExts = ['zip', 'rar', 'tar', 'gz', 'bz2', '7z', 'xz', 'tgz', 'tbz', 'lz', 'br'];
  if (archiveExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileBox 
          className={iconInnerSize}
          style={{ color: tabbyColors.archive }}
        />
      </div>
    );
  }

  // Spreadsheet files
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods', 'numbers'];
  if (spreadsheetExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileSpreadsheet 
          className={iconInnerSize}
          style={{ color: '#10B981' }}
        />
      </div>
    );
  }

  // Document files
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'pages', 'odt', 'epub'];
  if (documentExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileText 
          className={iconInnerSize}
          style={{ color: tabbyColors.document }}
        />
      </div>
    );
  }

  // Config files
  const configExts = ['yml', 'yaml', 'xml', 'ini', 'conf', 'cfg', 'toml', 'env', 'properties'];
  if (configExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileCog 
          className={iconInnerSize}
          style={{ color: tabbyColors.config }}
        />
      </div>
    );
  }

  // Database files
  const dbExts = ['db', 'sqlite', 'sql', 'mdb', 'accdb', 'frm', 'ibd'];
  if (dbExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <Database 
          className={iconInnerSize}
          style={{ color: tabbyColors.data }}
        />
      </div>
    );
  }

  // Key/Security files
  const keyExts = ['pem', 'key', 'crt', 'cer', 'p12', 'pfx', 'pub'];
  if (keyExts.includes(ext)) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileKey 
          className={iconInnerSize}
          style={{ color: '#F97316' }}
        />
      </div>
    );
  }

  // Log files
  if (ext === 'log') {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileStack 
          className={iconInnerSize}
          style={{ color: '#6B7280' }}
        />
      </div>
    );
  }

  // Lock/Encrypted files
  if (ext === 'lock' || name.endsWith('.lock')) {
    return (
      <div className={`${iconSize} flex items-center justify-center`}>
        <FileLock 
          className={iconInnerSize}
          style={{ color: '#EF4444' }}
        />
      </div>
    );
  }

  // Default file icon - no background
  return (
    <div className={`${iconSize} flex items-center justify-center`}>
      <File 
        className={iconInnerSize}
        style={{ color: tabbyColors.default }}
      />
    </div>
  );
};

export default FileIcon;
