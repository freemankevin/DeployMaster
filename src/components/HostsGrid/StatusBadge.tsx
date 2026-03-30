import type { StatusBadgeProps } from './types';

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  // Railway style status badge - using CSS variables
  const configs = {
    connected: {
      dot: 'bg-[var(--color-success)]',
      label: 'Running'
    },
    warning: {
      dot: 'bg-[var(--color-warning)]',
      label: 'Warning'
    },
    default: {
      dot: 'bg-[var(--text-tertiary)]',
      label: 'Offline'
    }
  };

  const config = configs[status as keyof typeof configs] || configs.default;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;