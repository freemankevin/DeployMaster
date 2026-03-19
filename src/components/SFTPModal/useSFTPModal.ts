import { useState, useRef, useCallback, useMemo } from 'react';
import type { SFTPFile } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useDialog } from '@/components/Dialog';
import type { LogFilter } from '../sftp/types';
import {
  useTransferManager,
  useSFTP,
  useFileOperations,
  useWindowState,
  useUploadManager,
  useDownloadManager
} from '../sftp';

interface UseSFTPModalProps {
  hostId: number;
  hostName: string;
  hostAddress: string;
}

interface UseSFTPModalReturn {
  // SFTP state
  sftp: ReturnType<typeof useSFTP>;
  transfer: ReturnType<typeof useTransferManager>;
  fileOps: ReturnType<typeof useFileOperations>;
  window: ReturnType<typeof useWindowState>;
  upload: ReturnType<typeof useUploadManager>;
  download: ReturnType<typeof useDownloadManager>;
  
  // UI state
  pathInputValue: string;
  setPathInputValue: React.Dispatch<React.SetStateAction<string>>;
  isPathEditing: boolean;
  pathInputRef: React.RefObject<HTMLInputElement>;
  selectedFiles: Set<string>;
  searchQuery: string;
  showFilter: boolean;
  showTransferPanel: boolean;
  showUploadMenu: boolean;
  activeLogFilter: LogFilter;
  showNewFolderDialog: boolean;
  newFolderName: string;
  showRenameDialog: boolean;
  renameTarget: SFTPFile | null;
  newFileName: string;
  showFileEditor: boolean;
  isDragOver: boolean;
  
  // Computed
  pathSegments: Array<{ name: string; path: string }>;
  filteredFiles: SFTPFile[];
  activeTransfers: number;
  
  // Dialog component
  dialogComponent: React.ReactNode;
  
  // Handlers
  handlePathEdit: () => void;
  handlePathConfirm: () => void;
  handlePathKeyDown: (e: React.KeyboardEvent) => void;
  handleFileClick: (file: SFTPFile) => Promise<void>;
  toggleFileSelection: (path: string) => void;
  handleSelectAll: (selected: boolean) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  handleCreateFolder: () => Promise<void>;
  handleRename: () => Promise<void>;
  handleSaveAndClose: () => Promise<void>;
  clearFilter: () => void;
  
  // Setters
  setIsPathEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
  setShowTransferPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowUploadMenu: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveLogFilter: React.Dispatch<React.SetStateAction<LogFilter>>;
  setShowNewFolderDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
  setShowRenameDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setRenameTarget: React.Dispatch<React.SetStateAction<SFTPFile | null>>;
  setNewFileName: React.Dispatch<React.SetStateAction<string>>;
  setShowFileEditor: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSFTPModal({ hostId, hostName, hostAddress }: UseSFTPModalProps): UseSFTPModalReturn {
  // UI State
  const [pathInputValue, setPathInputValue] = useState('/');
  const [isPathEditing, setIsPathEditing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showTransferPanel, setShowTransferPanel] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [activeLogFilter, setActiveLogFilter] = useState<LogFilter>('upload');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SFTPFile | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const pathInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();
  const { showDialog, dialogComponent } = useDialog();
  
  // Custom hooks
  const transfer = useTransferManager();
  const sftp = useSFTP({ hostId, onLog: transfer.addTransferLog });
  const fileOps = useFileOperations({
    hostId, 
    currentPath: sftp.currentPath,
    onLog: transfer.addTransferLog, 
    onSuccess: success, 
    onError: showError, 
    onRefresh: sftp.refresh,
    onShowDialog: showDialog
  });
  const window = useWindowState();
  const upload = useUploadManager({
    hostId,
    currentPath: sftp.currentPath,
    transfer,
    onSuccess: success,
    onError: showError,
    onRefresh: sftp.refresh
  });
  const download = useDownloadManager({
    hostId,
    transfer,
    onSuccess: success,
    onError: showError
  });

  // Path segments
  const pathSegments = useMemo(() => {
    if (sftp.currentPath === '/') return [];
    const parts = sftp.currentPath.split('/').filter(Boolean);
    return parts.map((name, index) => ({
      name,
      path: '/' + parts.slice(0, index + 1).join('/')
    }));
  }, [sftp.currentPath]);

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    let result = sftp.files || [];
    
    if (searchQuery.trim()) {
      result = result.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sorting: directories > links > files
    const directories = result.filter(f => f.is_dir && !f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    const links = result.filter(f => f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    const files = result.filter(f => !f.is_dir && !f.is_link).sort((a, b) => a.name.localeCompare(b.name));
    
    return [...directories, ...links, ...files];
  }, [sftp.files, searchQuery]);

  // Path editing handlers
  const handlePathEdit = useCallback(() => {
    setPathInputValue(sftp.currentPath);
    setIsPathEditing(true);
    setTimeout(() => pathInputRef.current?.focus(), 0);
  }, [sftp.currentPath]);

  const handlePathConfirm = useCallback(() => {
    const newPath = pathInputValue.trim();
    if (newPath && newPath !== sftp.currentPath) {
      sftp.navigateTo(newPath);
    }
    setIsPathEditing(false);
  }, [pathInputValue, sftp]);

  const handlePathKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePathConfirm();
    else if (e.key === 'Escape') setIsPathEditing(false);
  }, [handlePathConfirm]);

  // File click handling
  const handleFileClick = useCallback(async (file: SFTPFile) => {
    if (file.is_dir) {
      sftp.navigateTo(file.path);
    } else {
      const content = await fileOps.readFile(file);
      if (content !== null) setShowFileEditor(true);
    }
  }, [sftp, fileOps]);

  // File selection
  const toggleFileSelection = useCallback((path: string) => {
    setSelectedFiles(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(path)) newSelected.delete(path);
      else newSelected.add(path);
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedFiles(selected ? new Set(filteredFiles.map(f => f.path).filter(Boolean)) : new Set());
  }, [filteredFiles]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    await upload.handleDropUpload(items);
  }, [upload]);

  // Folder creation
  const handleCreateFolder = useCallback(async () => {
    if (await fileOps.createFolder(newFolderName)) {
      setShowNewFolderDialog(false);
      setNewFolderName('');
    }
  }, [fileOps, newFolderName]);

  // Rename
  const handleRename = useCallback(async () => {
    if (!renameTarget) return;
    if (await fileOps.renameFile(renameTarget, newFileName)) {
      setShowRenameDialog(false);
      setRenameTarget(null);
      setNewFileName('');
    }
  }, [fileOps, renameTarget, newFileName]);

  // Save file
  const handleSaveAndClose = useCallback(async () => {
    if (await fileOps.saveFile()) {
      setShowFileEditor(false);
      fileOps.closeEditor();
    }
  }, [fileOps]);

  // Clear filter
  const clearFilter = useCallback(() => {
    setSearchQuery('');
    setShowFilter(false);
  }, []);

  const activeTransfers = transfer.transferTasks.filter(t => t.status === 'transferring').length;

  return {
    // SFTP state
    sftp,
    transfer,
    fileOps,
    window,
    upload,
    download,
    
    // UI state
    pathInputValue,
    setPathInputValue,
    isPathEditing,
    pathInputRef,
    selectedFiles,
    searchQuery,
    showFilter,
    showTransferPanel,
    showUploadMenu,
    activeLogFilter,
    showNewFolderDialog,
    newFolderName,
    showRenameDialog,
    renameTarget,
    newFileName,
    showFileEditor,
    isDragOver,
    
    // Computed
    pathSegments,
    filteredFiles,
    activeTransfers,
    
    // Dialog component
    dialogComponent,
    
    // Handlers
    handlePathEdit,
    handlePathConfirm,
    handlePathKeyDown,
    handleFileClick,
    toggleFileSelection,
    handleSelectAll,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCreateFolder,
    handleRename,
    handleSaveAndClose,
    clearFilter,
    
    // Setters
    setIsPathEditing,
    setSelectedFiles,
    setSearchQuery,
    setShowFilter,
    setShowTransferPanel,
    setShowUploadMenu,
    setActiveLogFilter,
    setShowNewFolderDialog,
    setNewFolderName,
    setShowRenameDialog,
    setRenameTarget,
    setNewFileName,
    setShowFileEditor,
  };
}