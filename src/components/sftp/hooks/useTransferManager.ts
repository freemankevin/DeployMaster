import { useState, useCallback, useRef } from 'react';
import type { TransferTask, TransferLog } from '../types';
import { generateId, formatFileSize } from '../utils';

export const useTransferManager = () => {
  const [transferTasks, setTransferTasks] = useState<TransferTask[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);
  
  // 用于存储进度模拟的定时器
  const progressIntervals = useRef<Map<string, number>>(new Map());

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
  const createTransferTask = useCallback((type: 'upload' | 'download', filename: string, remotePath: string, size: number): string => {
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
    return taskId;
  }, []);

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
    
    setTransferTasks(prev => prev.map(task => 
      task.id === taskId ? { 
        ...task, 
        status: success ? 'completed' : 'failed',
        progress: success ? 100 : task.progress,
        endTime: new Date(),
        error: errorMsg
      } : task
    ));
  }, []);

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

  // 取消传输任务
  const cancelTransferTask = useCallback((taskId: string) => {
    // 清除进度定时器
    const intervalId = progressIntervals.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      progressIntervals.current.delete(taskId);
    }
    
    setTransferTasks(prev => prev.filter(task => task.id !== taskId));
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
  }, []);

  // 按分类清空日志
  const clearLogsByFilter = useCallback((filter: 'all' | 'upload' | 'download' | 'error') => {
    if (filter === 'all') {
      setTransferLogs([]);
    } else if (filter === 'error') {
      // 清理所有错误日志（包括 status === 'error' 和 type === 'error'）
      setTransferLogs(prev => prev.filter(log => log.status !== 'error' && log.type !== 'error'));
    } else {
      setTransferLogs(prev => prev.filter(log => log.type !== filter));
    }
  }, []);

  // 清空已完成的任务
  const clearCompletedTasks = useCallback(() => {
    setTransferTasks(prev => prev.filter(t => 
      t.status === 'transferring' || t.status === 'pending' || t.status === 'paused'
    ));
  }, []);

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
    clearCompletedTasks
  };
};
