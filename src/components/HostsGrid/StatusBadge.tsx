import type { StatusBadgeProps } from './types';

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const configs = {
    connected: {
      dot: 'bg-macos-green',
      label: 'Running'
    },
    warning: {
      dot: 'bg-macos-orange',
      label: 'Warning'
    },
    default: {
      dot: 'bg-text-tertiary',
      label: 'Offline'
    }
  };

  const config = configs[status as keyof typeof configs] || configs.default;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;