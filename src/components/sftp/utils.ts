// 格式化文件大小
export const formatFileSize = (bytes: number | undefined | null): string => {
  // 处理 undefined、null、NaN 或非数字的情况
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化速度
export const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 生成唯一ID
export const generateId = (): string => Math.random().toString(36).substring(2, 15);

// 磁盘使用进度条颜色
export const getDiskUsageColor = (percentage: string): string => {
  const num = parseInt(percentage);
  if (num >= 90) return 'bg-red-500';
  if (num >= 70) return 'bg-yellow-500';
  return 'bg-emerald-500';
};
