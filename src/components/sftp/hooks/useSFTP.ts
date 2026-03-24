import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>(['/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isConnectedRef = useRef(false);

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
    // Prevent duplicate connections
    if (isConnectedRef.current) {
      return true;
    }
    
    try {
      setConnecting(true);
      setError(''); // Clear previous error state
      const response = await sftpApi.connect(hostId);
      if (response.success) {
        const result = await loadDirectory('/');
        if (result === null) {
          // loadDirectory failed, error has been set
          setConnected(false);
          return false;
        }
        await loadDiskUsage();
        isConnectedRef.current = true;
        setConnected(true);
        // Don't add log on successful connection, use UI display instead
        return true;
      } else {
        setError('SFTP connection failed: ' + (response.message || 'Unknown error'));
        setConnected(false);
        return false;
      }
    } catch (err) {
      setError('SFTP connection error: ' + (err as Error).message);
      setConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [hostId, loadDirectory, loadDiskUsage]);

  const navigateTo = useCallback(async (path: string) => {
    // Try loading directory first, then update history on success
    const result = await loadDirectory(path);
    if (result !== null) {
      // Only update history after directory loads successfully
      setPathHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(path);
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
    }
    return result;
  }, [historyIndex, loadDirectory]);

  const goBack = useCallback(async () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const path = pathHistory[newIndex];
      const result = await loadDirectory(path);
      if (result !== null) {
        setHistoryIndex(newIndex);
      }
      return result;
    }
    return null;
  }, [historyIndex, pathHistory, loadDirectory]);

  const goForward = useCallback(async () => {
    if (historyIndex < pathHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const path = pathHistory[newIndex];
      const result = await loadDirectory(path);
      if (result !== null) {
        setHistoryIndex(newIndex);
      }
      return result;
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
    // Reset connection state
    isConnectedRef.current = false;
    connect();
    return () => {
      isConnectedRef.current = false;
      disconnect();
    };
  }, [hostId]); // Only reconnect when hostId changes

  return {
    currentPath,
    files,
    loading,
    connecting,
    connected,
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
