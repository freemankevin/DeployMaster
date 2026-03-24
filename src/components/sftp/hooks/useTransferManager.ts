import { useState, useCallback, useRef, useEffect } from 'react';
import type { TransferTask, TransferLog } from '../types';
import { generateId, formatFileSize } from '../utils';
import { transferApi } from '@/services/api';

export const useTransferManager = (hostId?: number) => {
  const [transferTasks, setTransferTasks] = useState<TransferTask[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  
  // Store progress simulation timers
  const progressIntervals = useRef<Map<string, number>>(new Map());
  
  // Store backend record ID mapping
  const backendRecordIds = useRef<Map<string, number>>(new Map());

  // Load history from backend on initialization
  useEffect(() => {
    loadTransferRecords();
  }, []);

  // Load transfer records from backend
  const loadTransferRecords = useCallback(async () => {
    try {
      const response = await transferApi.getAll(100, 0);
      if (response.success && response.data) {
        // Convert backend records to frontend task format
        const tasks: TransferTask[] = response.data.map(record => ({
          id: record.transfer_id,
          type: record.type,
          filename: record.filename,
          remotePath: record.remote_path,
          size: record.size,
          transferred: record.transferred,
          status: record.status as TransferTask['status'],
          speed: record.speed,
          progress: record.progress,
          error: record.error || undefined,
          startTime: new Date(record.start_time),
          endTime: record.end_time ? new Date(record.end_time) : undefined,
        }));
        
        // Only load non-in-progress tasks (in-progress tasks may be from previous interrupted sessions)
        const completedTasks = tasks.filter(t => 
          t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
        );
        
        setTransferTasks(completedTasks);
        
        // Build ID mapping
        response.data.forEach(record => {
          backendRecordIds.current.set(record.transfer_id, record.id);
        });
      }
    } catch (error) {
      console.error('[TransferManager] Failed to load transfer records:', error);
    }
  }, []);

  // Save transfer record to backend
  const saveTransferRecord = useCallback(async (task: TransferTask, status?: TransferTask['status']) => {
    try {
      const existingId = backendRecordIds.current.get(task.id);
      const recordStatus = status || task.status;
      const recordData = {
        transfer_id: task.id,
        type: task.type,
        filename: task.filename,
        remote_path: task.remotePath,
        size: task.size,
        transferred: task.transferred,
        status: recordStatus,
        progress: task.progress,
        speed: task.speed,
        error: task.error || '',
        host_id: hostId || 0,
        end_time: task.endTime?.toISOString(),
      };

      if (existingId) {
        // Update existing record
        await transferApi.update(existingId, recordData);
      } else {
        // Create new record
        const response = await transferApi.create({
          ...recordData,
          start_time: task.startTime?.toISOString() || new Date().toISOString(),
        });
        if (response.success && response.data) {
          backendRecordIds.current.set(task.id, response.data.id);
        }
      }
    } catch (error) {
      console.error('[TransferManager] Failed to save transfer record:', error);
    }
  }, [hostId]);

  // Add transfer log
  const addTransferLog = useCallback((type: TransferLog['type'], message: string, path: string, status: TransferLog['status'] = 'info', size?: string, directory?: string) => {
    const newLog: TransferLog = {
      id: generateId(),
      timestamp: new Date(),
      type,
      message,
      path,
      size,
      status,
      directory
    };
    setTransferLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  // Create transfer task
  const createTransferTask = useCallback(async (type: 'upload' | 'download', filename: string, remotePath: string, size: number, directory?: string): Promise<string> => {
    const taskId = generateId();
    const newTask: TransferTask = {
      id: taskId,
      type,
      filename,
      remotePath,
      size,
      transferred: 0,
      status: 'pending',
      speed: '0 B/s',
      progress: 0,
      startTime: new Date()
    };
    setTransferTasks(prev => [newTask, ...prev]);
    
    // Save to backend
    try {
      const response = await transferApi.create({
        transfer_id: taskId,
        type,
        filename,
        remote_path: remotePath,
        local_path: '',
        directory: directory || '',
        size,
        transferred: 0,
        status: 'pending',
        progress: 0,
        speed: '0 B/s',
        error: '',
        host_id: hostId || 0,
        start_time: new Date().toISOString(),
      });
      if (response.success && response.data) {
        backendRecordIds.current.set(taskId, response.data.id);
      }
    } catch (error) {
      console.error('[TransferManager] Failed to create transfer record:', error);
    }
    
    return taskId;
  }, [hostId]);

  // Update transfer task progress
  const updateTransferTask = useCallback((taskId: string, updates: Partial<TransferTask>) => {
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  // Complete transfer task
  const completeTransferTask = useCallback((taskId: string, success: boolean, errorMsg?: string) => {
    // Clear progress timer
    const intervalId = progressIntervals.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      progressIntervals.current.delete(taskId);
    }

    const status: TransferTask['status'] = success ? 'completed' : 'failed';
    const now = new Date();

    setTransferTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask: TransferTask = {
          ...task,
          status,
          progress: success ? 100 : task.progress,
          endTime: now,
          error: errorMsg,
          uploadId: undefined  // Clear uploadId
        };

        // Save to backend
        saveTransferRecord(updatedTask, status);

        return updatedTask;
      }
      return task;
    }));
  }, [saveTransferRecord]);

  // Cancel upload (called by useUploadManager)
  const cancelUploadById = useCallback((uploadId: string) => {
    // Find corresponding transfer task and cancel it
    setTransferTasks(prev => {
      return prev.map(task => {
        if (task.uploadId === uploadId) {
          const updatedTask = {
            ...task,
            status: 'cancelled' as const,
            endTime: new Date(),
            error: 'User cancelled',
            uploadId: undefined  // Clear uploadId
          };
          saveTransferRecord(updatedTask, 'cancelled');
          return updatedTask;
        }
        return task;
      });
    });
  }, [saveTransferRecord]);

  // Cancel download (called by useDownloadManager)
  const cancelDownloadById = useCallback((downloadId: string) => {
    // Find corresponding transfer task and cancel it
    setTransferTasks(prev => {
      return prev.map(task => {
        if (task.downloadId === downloadId) {
          const updatedTask = {
            ...task,
            status: 'cancelled' as const,
            endTime: new Date(),
            error: 'User cancelled',
            downloadId: undefined  // Clear downloadId
          };
          saveTransferRecord(updatedTask, 'cancelled');
          return updatedTask;
        }
        return task;
      });
    });
  }, [saveTransferRecord]);

  // Cancel transfer task
  const cancelTransferTask = useCallback((taskId: string) => {
    // Clear progress timer
    const intervalId = progressIntervals.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      progressIntervals.current.delete(taskId);
    }
    
    const now = new Date();
    
    // Update task status to cancelled
    setTransferTasks(prev => {
      return prev.map(t => {
        if (t.id === taskId) {
          const updatedTask = { 
            ...t, 
            status: 'cancelled' as const,
            endTime: now,
            error: 'User cancelled'
          };
          
          // Save to backend
          saveTransferRecord(updatedTask, 'cancelled');
          
          return updatedTask;
        }
        return t;
      });
    });
  }, [saveTransferRecord]);

  // Pause transfer task
  const pauseTransferTask = useCallback((taskId: string) => {
    // Clear progress timer
    const intervalId = progressIntervals.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      progressIntervals.current.delete(taskId);
    }
    
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'paused', speed: '0 B/s' } : task
    ));
  }, []);

  // Resume transfer task
  const resumeTransferTask = useCallback((taskId: string, fileSize: number) => {
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'transferring' } : task
    ));
    
    // Restart progress simulation
    const interval = window.setInterval(() => {
      setTransferTasks(prev => {
        const task = prev.find(t => t.id === taskId);
        if (!task || task.status !== 'transferring') {
          const currentInterval = progressIntervals.current.get(taskId);
          if (currentInterval) {
            clearInterval(currentInterval);
            progressIntervals.current.delete(taskId);
          }
          return prev;
        }
        
        const newTransferred = Math.min(task.transferred + fileSize / 20, fileSize);
        const progress = Math.round((newTransferred / fileSize) * 100);
        
        return prev.map(t => 
          t.id === taskId ? {
            ...t,
            transferred: newTransferred,
            progress,
            speed: formatFileSize(fileSize / 10) + '/s'
          } : t
        );
      });
    }, 500);
    
    progressIntervals.current.set(taskId, interval);
  }, []);

  // Simulate transfer progress
  const simulateTransferProgress = useCallback((taskId: string, fileSize: number, onProgress?: (progress: number) => void) => {
    // Clear existing timer
    const existingInterval = progressIntervals.current.get(taskId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    const interval = window.setInterval(() => {
      setTransferTasks(prev => {
        const task = prev.find(t => t.id === taskId);
        if (!task || task.status !== 'transferring') {
          const currentInterval = progressIntervals.current.get(taskId);
          if (currentInterval) {
            clearInterval(currentInterval);
            progressIntervals.current.delete(taskId);
          }
          return prev;
        }
        
        const newTransferred = Math.min(task.transferred + fileSize / 20, fileSize);
        const progress = Math.round((newTransferred / fileSize) * 100);
        
        if (onProgress) onProgress(progress);
        
        return prev.map(t => 
          t.id === taskId ? {
            ...t,
            transferred: newTransferred,
            progress,
            speed: formatFileSize(fileSize / 10) + '/s'
          } : t
        );
      });
    }, 500);
    
    progressIntervals.current.set(taskId, interval);

    return () => {
      const currentInterval = progressIntervals.current.get(taskId);
      if (currentInterval) {
        clearInterval(currentInterval);
        progressIntervals.current.delete(taskId);
      }
    };
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setTransferLogs([]);
    // Also clear all completed tasks
    setTransferTasks(prev => prev.filter(t =>
      t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
    ));
  }, []);

  // Clear logs and completed tasks by category (permanent deletion, calls backend API)
  const clearLogsByFilter = useCallback(async (filter: 'all' | 'upload' | 'download') => {
    try {
      if (filter === 'all') {
        // Clear all completed tasks
        await transferApi.clearCompleted();
      } else {
        // Clear completed tasks of specific type
        await transferApi.clearByType(filter);
      }
      
      // Update local state
      setTransferTasks(prev => {
        if (filter === 'all') {
          return prev.filter(t =>
            t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
          );
        } else {
          return prev.filter(t => {
            if (t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled') return true;
            return t.type !== filter;
          });
        }
      });
      
      // Clear corresponding backendRecordIds mapping
      backendRecordIds.current.clear();
    } catch (error) {
      console.error('[TransferManager] Failed to clear transfer records:', error);
    }
  }, []);

  // Clear completed tasks
  const clearCompletedTasks = useCallback(async () => {
    // Get task IDs to delete
    const tasksToDelete = transferTasks.filter(t =>
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );
    
    // Delete from backend
    try {
      await transferApi.clearCompleted();
    } catch (error) {
      console.error('[TransferManager] Failed to clear completed records:', error);
    }
    
    // Update local state
    setTransferTasks(prev => prev.filter(t =>
      t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
    ));
  }, [transferTasks]);

  return {
    transferTasks,
    transferLogs,
    addTransferLog,
    createTransferTask,
    updateTransferTask,
    completeTransferTask,
    pauseTransferTask,
    resumeTransferTask,
    cancelTransferTask,
    cancelUploadById,
    cancelDownloadById,
    simulateTransferProgress,
    clearLogs,
    clearLogsByFilter,
    clearCompletedTasks,
    loadTransferRecords
  };
};