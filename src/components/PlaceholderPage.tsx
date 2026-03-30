import {
  Server,
  Package,
  Box,
  Image,
  Layers,
  Database,
  Gauge,
  FileText,
  Bell,
  Award,
  Shield,
  Clock,
  Settings,
  Users,
  ClipboardList,
  Timer
} from 'lucide-react';

// Page type for placeholder pages
export type PageType =
  | 'hosts'
  | 'appstore'
  | 'containers'
  | 'container-install'
  | 'container-images'
  | 'container-services'
  | 'container-compose'
  | 'container-repo'
  | 'monitor'
  | 'logs'
  | 'alerts'
  | 'certificates'
  | 'firewall'
  | 'cronjob'
  | 'settings'
  | 'settings-users'
  | 'settings-audit'
  | 'settings-about';

interface PlaceholderPageProps {
  page: PageType;
}

// Page titles mapping
const pageTitles: Record<PageType, string> = {
  'hosts': 'Hosts',
  'appstore': 'App Store',
  'containers': 'Containers',
  'container-install': 'Docker Install',
  'container-images': 'Container Images',
  'container-services': 'Container Services',
  'container-compose': 'Compose Applications',
  'container-repo': 'Container Registry',
  'monitor': 'System Monitor',
  'logs': 'Log Center',
  'alerts': 'Alerts',
  'certificates': 'Certificates',
  'firewall': 'Firewall',
  'cronjob': 'Cron Jobs',
  'settings': 'Settings',
  'settings-users': 'User Management',
  'settings-audit': 'Audit Logs',
  'settings-about': 'About',
};

// Page descriptions mapping
const pageDescriptions: Record<PageType, string> = {
  'hosts': 'Manage SSH hosts and connections',
  'appstore': 'Browse and install applications',
  'containers': 'View and manage Docker containers',
  'container-install': 'Install and configure Docker on remote hosts',
  'container-images': 'Manage Docker images',
  'container-services': 'Manage running container services',
  'container-compose': 'Deploy and manage Compose applications',
  'container-repo': 'Configure container registries',
  'monitor': 'Real-time system monitoring',
  'logs': 'View container and system logs',
  'alerts': 'Configure alert rules and notifications',
  'certificates': 'Manage SSL/TLS certificates',
  'firewall': 'Configure firewall rules',
  'cronjob': 'Manage scheduled tasks',
  'settings': 'System settings and configuration',
  'settings-users': 'Manage users and permissions',
  'settings-audit': 'View operation audit logs',
  'settings-about': 'About Cockpit',
};

// Icon mapping using Lucide
const pageIcons: Record<PageType, React.ComponentType<{ className?: string }>> = {
  'hosts': Server,
  'appstore': Package,
  'containers': Box,
  'container-install': Box,
  'container-images': Image,
  'container-services': Layers,
  'container-compose': Layers,
  'container-repo': Database,
  'monitor': Gauge,
  'logs': FileText,
  'alerts': Bell,
  'certificates': Award,
  'firewall': Shield,
  'cronjob': Clock,
  'settings': Settings,
  'settings-users': Users,
  'settings-audit': ClipboardList,
  'settings-about': Server,
};

const PlaceholderPage = ({ page }: PlaceholderPageProps) => {
  const title = pageTitles[page] || page;
  const description = pageDescriptions[page] || '';
  const IconComponent = pageIcons[page] || Server;

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-background-tertiary/50 flex items-center justify-center">
          <IconComponent className="w-10 h-10 text-text-quaternary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-text-primary mb-2">{title}</h2>

        {/* Description */}
        <p className="text-text-tertiary mb-6">{description}</p>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background-tertiary/50 text-text-tertiary text-sm">
          <Timer className="w-4 h-4 text-primary" />
          <span>Coming Soon</span>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;