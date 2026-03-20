import { useState, useCallback, useRef, useEffect } from 'react';
import type { TransferTask, TransferLog } from '../types';
import { generateId, formatFileSize } from '../utils';
import { cancelUploadById } from './useUploadManager';
import { transferApi } from '@/services/api';

export const useTransferManager = (hostId?: number) => {
  const [transferTasks, setTransferTasks] = useState<TransferTask[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  
  // 用于存储进度模拟的定时器
  const progressIntervals = useRef<Map<string, number>>(new Map());
  
  // 用于存储后端记录ID的映射
  const backendRecordIds = useRef<Map<string, number>>(new Map());

  // 初始化时从后端加载历史记录
  useEffect(() => {
    loadTransferRecords();
  }, []);

  // 从后端加载传输记录
  const loadTransferRecords = useCallback(async () => {
    try {
      const response = await transferApi.getAll(100, 0);
      if (response.success && response.data) {
        // 将后端记录转换为前端任务格式
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
        
        // 只加载非进行中的任务（进行中的任务可能是之前中断的）
        const completedTasks = tasks.filter(t => 
          t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
        );
        
        setTransferTasks(completedTasks);
        
        // 建立ID映射
        response.data.forEach(record => {
          backendRecordIds.current.set(record.transfer_id, record.id);
        });
      }
    } catch (error) {
      console.error('[TransferManager] Failed to load transfer records:', error);
    }
  }, []);

  // 保存传输记录到后端
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
        // 更新现有记录
        await transferApi.update(existingId, recordData);
      } else {
        // 创建新记录
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

  // 添加传输日志
  const addTransferLog = useCallback((type: TransferLog['type'], message: string, path: string, status: TransferLog['status'] = 'info', size?: string) => {
    const newLog: TransferLog = {
      id: generateId(),
      timestamp: new Date(),
      type,
      message,
      path,
      size,
      status
    };
    setTransferLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  // 创建传输任务
  const createTransferTask = useCallback(async (type: 'upload' | 'download', filename: string, remotePath: string, size: number): Promise<string> => {
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
    
    // 保存到后端
    try {
      const response = await transferApi.create({
        transfer_id: taskId,
        type,
        filename,
        remote_path: remotePath,
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

  // 更新传输任务进度
  const updateTransferTask = useCallback((taskId: string, updates: Partial<TransferTask>) => {
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  // 完成传输任务
  const completeTransferTask = useCallback((taskId: string, success: boolean, errorMsg?: string) => {
    // 清除进度定时器
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
          error: errorMsg
        };
        
        // 保存到后端
        saveTransferRecord(updatedTask, status);
        
        return updatedTask;
      }
      return task;
    }));
  }, [saveTransferRecord]);

  // 取消传输任务
  const cancelTransferTask = useCallback((taskId: string) => {
    // 清除进度定时器
    const intervalId = progressIntervals.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      progressIntervals.current.delete(taskId);
    }
    
    const now = new Date();
    
    // 查找任务以获取 uploadId
    setTransferTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task?.uploadId) {
        // 如果是上传任务，调用取消上传
        cancelUploadById(task.uploadId);
      }
      
      // 更新任务状态为已取消
      return prev.map(t => {
        if (t.id === taskId) {
          const updatedTask = { 
            ...t, 
            status: 'cancelled' as const,
            endTime: now,
            error: 'User cancelled'
          };
          
          // 保存到后端
          saveTransferRecord(updatedTask, 'cancelled');
          
          return updatedTask;
        }
        return t;
      });
    });
  }, [saveTransferRecord]);

  // 暂停传输任务
  const pauseTransferTask = useCallback((taskId: string) => {
    // 清除进度定时器
    const intervalId = progressIntervals.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      progressIntervals.current.delete(taskId);
    }
    
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'paused', speed: '0 B/s' } : task
    ));
  }, []);

  // 恢复传输任务
  const resumeTransferTask = useCallback((taskId: string, fileSize: number) => {
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'transferring' } : task
    ));
    
    // 重新开始进度模拟
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

  // 模拟传输进度
  const simulateTransferProgress = useCallback((taskId: string, fileSize: number, onProgress?: (progress: number) => void) => {
    // 清除已存在的定时器
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

  // 清空日志
  const clearLogs = useCallback(() => {
    setTransferLogs([]);
    // 同时清空所有已完成的任务
    setTransferTasks(prev => prev.filter(t =>
      t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
    ));
  }, []);

  // 按分类清空日志和已完成的任务（永久删除，调用后端 API）
  const clearLogsByFilter = useCallback(async (filter: 'all' | 'upload' | 'download') => {
    try {
      if (filter === 'all') {
        // 清空所有已完成的任务
        await transferApi.clearCompleted();
      } else {
        // 清理特定类型的已完成任务
        await transferApi.clearByType(filter);
      }
      
      // 更新本地状态
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
      
      // 清除对应的 backendRecordIds 映射
      backendRecordIds.current.clear();
    } catch (error) {
      console.error('[TransferManager] Failed to clear transfer records:', error);
    }
  }, []);

  // 清空已完成的任务
  const clearCompletedTasks = useCallback(async () => {
    // 获取要删除的任务ID
    const tasksToDelete = transferTasks.filter(t =>
      t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );
    
    // 从后端删除
    try {
      await transferApi.clearCompleted();
    } catch (error) {
      console.error('[TransferManager] Failed to clear completed records:', error);
    }
    
    // 更新本地状态
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
    simulateTransferProgress,
    clearLogs,
    clearLogsByFilter,
    clearCompletedTasks,
    loadTransferRecords
  };
};