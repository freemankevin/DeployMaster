// Format file size
export const formatFileSize = (bytes: number | undefined | null): string => {
  // Handle undefined, null, NaN or non-numeric cases
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format speed
export const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Generate unique ID
export const generateId = (): string => Math.random().toString(36).substring(2, 15);

// Disk usage progress bar color
export const getDiskUsageColor = (percentage: string): string => {
  const num = parseInt(percentage);
  if (num >= 90) return 'bg-red-500';
  if (num >= 70) return 'bg-yellow-500';
  return 'bg-emerald-500';
};