import { useState } from 'react';
import type { User } from '../types';
import type { LucideIcon } from 'lucide-react';
import {
  Server,
  Store,
  Box,
  Gauge,
  FileText,
  Bell,
  Award,
  Shield,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

// Page types - all available pages
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

// Navigation item interface
interface NavItem {
  id: PageType;
  label: string;
  icon?: LucideIcon;
  adminOnly?: boolean;
  isSubItem?: boolean;
}

// Navigation group interface
interface NavGroup {
  items: NavItem[];
  subItems?: NavItem[];
  expandKey?: PageType;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  currentPage?: PageType;
  onPageChange?: (page: PageType) => void;
  currentUser?: User | null;
}

// Navigation structure
const navigationGroups: NavGroup[] = [
  {
    items: [
      { id: 'hosts', label: 'Hosts', icon: Server },
      { id: 'appstore', label: 'App Store', icon: Store },
    ],
  },
  {
    items: [
      { id: 'containers', label: 'Containers', icon: Box },
    ],
    subItems: [
      { id: 'container-install', label: 'Install', isSubItem: true },
      { id: 'container-images', label: 'Images', isSubItem: true },
      { id: 'container-services', label: 'Services', isSubItem: true },
      { id: 'container-compose', label: 'Compose', isSubItem: true },
      { id: 'container-repo', label: 'Registry', isSubItem: true },
    ],
    expandKey: 'containers',
  },
  {
    items: [
      { id: 'monitor', label: 'Monitor', icon: Gauge },
      { id: 'logs', label: 'Logs', icon: FileText },
      { id: 'alerts', label: 'Alerts', icon: Bell },
    ],
  },
  {
    items: [
      { id: 'certificates', label: 'Certificates', icon: Award },
      { id: 'firewall', label: 'Firewall', icon: Shield },
    ],
  },
  {
    items: [
      { id: 'cronjob', label: 'Cron Jobs', icon: Clock },
    ],
  },
  {
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    subItems: [
      { id: 'settings-audit', label: 'Audit', isSubItem: true, adminOnly: true },
      { id: 'settings-about', label: 'About', isSubItem: true },
    ],
    expandKey: 'settings',
  },
];

const Sidebar = ({
  collapsed = false,
  onToggleCollapse,
  currentPage = 'hosts',
  onPageChange,
  currentUser,
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<PageType>>(new Set());

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    onToggleCollapse?.();
  };

  const toggleExpand = (key: PageType) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const isParentActive = (parentId: PageType, subItems?: NavItem[]): boolean => {
    if (currentPage === parentId) return true;
    if (subItems) {
      return subItems.some(item => item.id === currentPage);
    }
    return false;
  };

  // Filter groups based on user role
  const filteredGroups = navigationGroups.map(group => {
    const filteredSubItems = group.subItems?.filter(item => {
      if (item.adminOnly && currentUser?.role !== 'admin') {
        return false;
      }
      return true;
    });
    return {
      ...group,
      subItems: filteredSubItems,
    };
  }).filter(group => group.items.length > 0);

  const collapsedClass = isCollapsed ? 'w-12 min-w-[48px]' : 'w-52';

  return (
    <aside
      className={`${collapsedClass} h-full flex flex-col relative
                  transition-[width] duration-200 ease-out overflow-visible shrink-0`}
      style={{
        background: 'var(--bg-surface)',
        borderRight: '0.5px solid var(--border-subtle)',
      }}
    >
      {/* Logo Section */}
      <div className={`p-3 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        <img
          src="/favicon-32x32.png"
          alt="Cockpit"
          className="w-7 h-7 rounded-lg shrink-0 object-contain"
        />
        {!isCollapsed && (
          <h1 
            className="font-semibold text-[16px] tracking-tight whitespace-nowrap ml-2"
            style={{ 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              color: 'var(--text-primary)',
            }}
          >
            Cockpit
          </h1>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className={`px-2 pb-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={handleToggle}
          className={`flex items-center justify-center gap-1.5 rounded-lg transition-all duration-150
                     ${isCollapsed
                       ? 'w-8 h-8'
                       : 'w-full py-1.5'
                      }`}
          style={{
            background: 'transparent',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <>
              <ChevronLeft className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 mt-1 mb-3" style={{ borderTop: '0.5px solid var(--border-subtle)' }} />

      {/* Main Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden">
        {filteredGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Group Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = currentPage === item.id;
                const hasSubItems = group.subItems && group.subItems.length > 0;
                const isExpanded = expandedMenus.has(item.id);
                const parentActive = isParentActive(item.id, group.subItems);
                const IconComponent = item.icon;

                return (
                  <div key={item.id}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (hasSubItems) {
                          toggleExpand(item.id);
                        } else {
                          onPageChange?.(item.id);
                        }
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium
                        transition-all duration-150
                        ${isCollapsed ? 'justify-center' : ''}`}
                      style={{
                        background: parentActive ? 'var(--accent-muted)' : 'transparent',
                        color: parentActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        if (!parentActive) {
                          e.currentTarget.style.background = 'var(--bg-elevated)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!parentActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {IconComponent && (
                        <IconComponent 
                          className="w-[18px] h-[18px] shrink-0"
                          style={{ color: parentActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                        />
                      )}
                      {!isCollapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {hasSubItems && (
                            <ChevronDown 
                              className="w-3 h-3 shrink-0 ml-1 transition-transform duration-200"
                              style={{ 
                                color: 'var(--text-tertiary)',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              }}
                            />
                          )}
                        </>
                      )}
                    </a>

                    {/* Sub Items */}
                    {hasSubItems && !isCollapsed && (
                      <div
                        className={`overflow-hidden transition-all duration-200 ease-out
                          ${isExpanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}`}
                      >
                        <div className="relative ml-4 pl-3 py-1">
                          {/* Left border line */}
                          <div 
                            className="absolute left-0 top-2 bottom-2 w-px"
                            style={{ background: 'var(--border-subtle)' }}
                          />
                          
                          <div className="space-y-0.5">
                            {group.subItems!.map((subItem) => {
                              const subIsActive = currentPage === subItem.id;
                              return (
                                <a
                                  key={subItem.id}
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onPageChange?.(subItem.id);
                                  }}
                                  className="flex items-center px-3 py-1.5 rounded-md text-[14px] font-medium
                                    transition-all duration-150"
                                  style={{
                                    background: subIsActive ? 'var(--accent-muted)' : 'transparent',
                                    color: subIsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!subIsActive) {
                                      e.currentTarget.style.background = 'var(--bg-elevated)';
                                      e.currentTarget.style.color = 'var(--text-primary)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!subIsActive) {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = 'var(--text-secondary)';
                                    }
                                  }}
                                >
                                  <span className="truncate">{subItem.label}</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Group Divider */}
            {groupIndex < filteredGroups.length - 1 && (
              <div className="mx-3 my-3" style={{ borderTop: '0.5px solid var(--border-subtle)' }} />
            )}
          </div>
        ))}
      </nav>

    </aside>
  );
};

export default Sidebar;