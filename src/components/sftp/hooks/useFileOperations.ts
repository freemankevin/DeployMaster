import { useState, useCallback } from 'react';
import { sftpApi } from '@/services/api';
import type { SFTPFile } from '@/services/api';
import type { TransferLog } from '../types';
import type { DialogType } from '@/components/Dialog';

interface UseFileOperationsProps {
  hostId: number;
  currentPath: string;
  onLog: (type: TransferLog['type'], message: string, path: string, status: TransferLog['status'], size?: string) => void;
  onSuccess: (title: string, message: string) => void;
  onError: (title: string, message: string) => void;
  onRefresh: () => void;
  onShowDialog: (params: {
    type: DialogType;
    title: string;
    message?: string;
    itemName?: string;
    confirmText?: string;
  }) => Promise<boolean>;
}

export const useFileOperations = ({
  hostId,
  currentPath,
  onLog,
  onSuccess,
  onError,
  onRefresh,
  onShowDialog
}: UseFileOperationsProps) => {
  const [editingFile, setEditingFile] = useState<SFTPFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [saving, setSaving] = useState(false);

  const createFolder = useCallback(async (folderName: string) => {
    if (!folderName.trim()) return false;
    const newPath = `${currentPath}/${folderName}`.replace(/\/+/g, '/');
    try {
      const response = await sftpApi.createDirectory(hostId, newPath);
      if (response.success) {
        onSuccess('Success', 'Folder created successfully');
        onLog('mkdir', `Created folder: ${folderName}`, newPath, 'success');
        onRefresh();
        return true;
      } else {
        onError('Failed', response.message || 'Failed to create folder');
        onLog('mkdir', `Failed to create folder: ${folderName}`, newPath, 'error');
        return false;
      }
    } catch (err) {
      onError('Failed', (err as Error).message);
      onLog('mkdir', `Error creating folder: ${(err as Error).message}`, newPath, 'error');
      return false;
    }
  }, [hostId, currentPath, onLog, onSuccess, onError, onRefresh]);

  const deleteFile = useCallback(async (file: SFTPFile) => {
    const confirmed = await onShowDialog({
      type: 'delete',
      title: file.is_dir ? 'Delete Folder' : 'Delete File',
      message: file.is_dir 
        ? 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.'
        : 'Are you sure you want to delete this file? This action cannot be undone.',
      itemName: file.name,
      confirmText: 'Delete',
    });
    if (!confirmed) return false;
    try {
      const response = await sftpApi.remove(hostId, file.path, file.is_dir, false);
      if (response.success) {
        onSuccess('Deleted', `${file.name} has been deleted`);
        onLog('delete', `Deleted ${file.is_dir ? 'folder' : 'file'}: ${file.name}`, file.path, 'success', file.size_formatted);
        onRefresh();
        return true;
      } else {
        onError('Failed', response.message || 'Failed to delete');
        onLog('delete', `Failed to delete: ${file.name}`, file.path, 'error');
        return false;
      }
    } catch (err) {
      onError('Failed', (err as Error).message);
      onLog('delete', `Error deleting: ${(err as Error).message}`, file.path, 'error');
      return false;
    }
  }, [hostId, onLog, onSuccess, onError, onRefresh]);

  const renameFile = useCallback(async (target: SFTPFile, newName: string) => {
    if (!newName.trim() || newName === target.name) return false;
    const parentPath = currentPath === '/' ? '' : currentPath;
    const newPath = `${parentPath}/${newName}`.replace(/\/+/g, '/');
    try {
      const response = await sftpApi.rename(hostId, target.path, newPath);
      if (response.success) {
        onSuccess('Renamed', `${target.name} → ${newName}`);
        onLog('rename', `Renamed: ${target.name} → ${newName}`, newPath, 'success');
        onRefresh();
        return true;
      } else {
        onError('Failed', response.message || 'Failed to rename');
        onLog('rename', `Failed to rename: ${target.name}`, newPath, 'error');
        return false;
      }
    } catch (err) {
      onError('Failed', (err as Error).message);
      onLog('rename', `Error renaming: ${(err as Error).message}`, target.path, 'error');
      return false;
    }
  }, [hostId, currentPath, onLog, onSuccess, onError, onRefresh]);

  const readFile = useCallback(async (file: SFTPFile) => {
    const textExtensions = ['.txt', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.py', '.sh', '.yml', '.yaml', '.conf', '.cfg', '.ini', '.log', '.html', '.css', '.xml'];
    const isTextFile = textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isTextFile) return null;

    try {
      const response = await sftpApi.readFile(hostId, file.path);
      if (response.success) {
        setEditingFile(file);
        setFileContent(response.content);
        return response.content;
      } else {
        onError('Failed', response.error || 'Failed to read file');
        return null;
      }
    } catch (err) {
      onError('Failed', (err as Error).message);
      return null;
    }
  }, [hostId, onError]);

  const saveFile = useCallback(async () => {
    if (!editingFile) return false;
    try {
      setSaving(true);
      const response = await sftpApi.writeFile(hostId, editingFile.path, fileContent);
      if (response.success) {
        onSuccess('Saved', 'File saved successfully');
        onRefresh();
        return true;
      } else {
        onError('Failed', response.message || 'Failed to save file');
        return false;
      }
    } catch (err) {
      onError('Failed', (err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [hostId, editingFile, fileContent, onSuccess, onError, onRefresh]);

  const closeEditor = useCallback(() => {
    setEditingFile(null);
    setFileContent('');
  }, []);

  return {
    editingFile,
    fileContent,
    saving,
    setFileContent,
    createFolder,
    deleteFile,
    renameFile,
    readFile,
    saveFile,
    closeEditor
  };
};
