import { useState, useEffect, useCallback } from 'react';
import { sftpApi } from '@/services/api';
import type { SFTPFile } from '@/services/api';
import type { TransferLog } from '../types';

interface UseSFTPProps {
  hostId: number;
  onLog: (type: TransferLog['type'], message: string, path: string, status: TransferLog['status'], size?: string) => void;
}

interface DiskUsage {
  size: string;
  used: string;
  available: string;
  use_percentage: string;
}

export const useSFTP = ({ hostId, onLog }: UseSFTPProps) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<SFTPFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState('');
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const loadDirectory = useCallback(async (path: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await sftpApi.listDirectory(hostId, path);
      if (response.success) {
        setFiles(response.files);
        setCurrentPath(response.path);
        return response.path;
      } else {
        setError(response.error || 'Failed to load directory');
        return null;
      }
    } catch (err) {
      setError('Error loading directory: ' + (err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  const loadDiskUsage = useCallback(async () => {
    try {
      const response = await sftpApi.getDiskUsage(hostId, '/');
      if (response.success) {
        setDiskUsage({
          size: response.size,
          used: response.used,
          available: response.available,
          use_percentage: response.use_percentage
        });
      }
    } catch (err) {
      console.error('Failed to load disk usage:', err);
    }
  }, [hostId]);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      const response = await sftpApi.connect(hostId);
      if (response.success) {
        await loadDirectory('/');
        await loadDiskUsage();
        // 连接成功不添加日志，改用界面展示
        return true;
      } else {
        setError('SFTP connection failed: ' + (response.message || 'Unknown error'));
        return false;
      }
    } catch (err) {
      setError('SFTP connection error: ' + (err as Error).message);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [hostId, loadDirectory, loadDiskUsage]);

  const navigateTo = useCallback(async (path: string) => {
    const newHistory = pathHistory.slice(0, historyIndex + 1);
    newHistory.push(path);
    setPathHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    return await loadDirectory(path);
  }, [pathHistory, historyIndex, loadDirectory]);

  const goBack = useCallback(async () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      return await loadDirectory(pathHistory[historyIndex - 1]);
    }
    return null;
  }, [historyIndex, pathHistory, loadDirectory]);

  const goForward = useCallback(async () => {
    if (historyIndex < pathHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      return await loadDirectory(pathHistory[historyIndex + 1]);
    }
    return null;
  }, [historyIndex, pathHistory, loadDirectory]);

  const goUp = useCallback(async () => {
    if (currentPath === '/') return null;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    return await navigateTo(parentPath);
  }, [currentPath, navigateTo]);

  const refresh = useCallback(async () => {
    await loadDirectory(currentPath);
    await loadDiskUsage();
  }, [currentPath, loadDirectory, loadDiskUsage]);

  const disconnect = useCallback(() => {
    sftpApi.disconnect(hostId).catch(console.error);
  }, [hostId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    currentPath,
    files,
    loading,
    connecting,
    error,
    diskUsage,
    pathHistory,
    historyIndex,
    loadDirectory,
    navigateTo,
    goBack,
    goForward,
    goUp,
    refresh,
    setError
  };
};
