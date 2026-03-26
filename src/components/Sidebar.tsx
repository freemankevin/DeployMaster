import { FC, useState } from 'react';

interface SidebarProps {
  hostCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar = ({ hostCount = 0, collapsed = false, onToggleCollapse }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('Hosts');

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
    onToggleCollapse?.();
  };

  // 简化的菜单项 - 参考 Railway 风格，使用单个单词
  const mainItems = [
    { id: 'Hosts', icon: 'fa-solid fa-server', badge: hostCount > 0 ? String(hostCount) : undefined },
    { id: 'Git', icon: 'fa-solid fa-code-branch' },
    { id: 'Containers', icon: 'fa-solid fa-box' },
    { id: 'Databases', icon: 'fa-solid fa-database' },
    { id: 'History', icon: 'fa-solid fa-clock-rotate-left' },
    { id: 'Settings', icon: 'fa-solid fa-gear' },
  ];

  // 收起后保留 48px 图标窄栏
  const collapsedClass = isCollapsed ? 'w-12 min-w-[48px]' : 'w-52';

  return (
    <aside
      className={`${collapsedClass} h-full bg-background-secondary/80 backdrop-blur-sm border-r border-border-primary flex flex-col relative
                  transition-[width] duration-200 ease-out overflow-visible shrink-0`}
    >
      {/* Logo Section */}
      <div className={`p-3 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
        <img
          src="/favicon-32x32.png"
          alt="DeployMaster"
          className="w-7 h-7 rounded-lg shadow-macos-button shrink-0 object-contain"
        />
        {!isCollapsed && (
          <h1 className="font-semibold text-[14px] text-text-primary tracking-tight whitespace-nowrap ml-2">DeployMaster</h1>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className={`px-2 pb-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={handleToggle}
          className={`flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200
                     ${isCollapsed
                       ? 'w-8 h-8 hover:bg-background-hover'
                       : 'w-full py-1.5 hover:bg-background-hover'
                     }`}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <i className={`fa-solid ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-xs text-text-tertiary`}></i>
          {!isCollapsed && <span className="text-xs text-text-tertiary">Collapse</span>}
        </button>
      </div>

      {/* Main Navigation - Railway 风格：无分组标题，简洁单词 */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {mainItems.map((item) => (
          <a
            key={item.id}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveItem(item.id);
            }}
            title={isCollapsed ? item.id : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
              transition-all duration-150
              ${isCollapsed ? 'justify-center' : ''}
              ${activeItem === item.id
                ? 'bg-macos-blue/15 text-macos-blue'
                : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
              }`}
          >
            <i className={`${item.icon} w-[18px] h-[18px] text-center shrink-0
              ${activeItem === item.id ? 'text-macos-blue' : 'text-text-tertiary'}`}></i>
            {!isCollapsed && (
              <>
                <span className="flex-1 truncate">{item.id}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 bg-macos-blue/20 text-macos-blue text-[10px] font-semibold rounded-md shrink-0">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </a>
        ))}
      </nav>

      {/* Bottom Links - 参考 Railway 的外链风格 */}
      {!isCollapsed && (
        <div className="px-2 py-3 border-t border-border-primary space-y-0.5">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[12px] text-text-tertiary
                       hover:text-text-secondary transition-colors duration-150"
          >
            <i className="fa-solid fa-book w-[18px] text-center"></i>
            <span>Docs</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-auto opacity-60"></i>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[12px] text-text-tertiary
                       hover:text-text-secondary transition-colors duration-150"
          >
            <i className="fa-solid fa-headset w-[18px] text-center"></i>
            <span>Support</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-auto opacity-60"></i>
          </a>
        </div>
      )}

      {/* User Profile */}
      <div className={`p-2 border-t border-border-primary shrink-0 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <button
            className="w-8 h-8 rounded-full bg-macos-blue/20 flex items-center justify-center
                      hover:bg-macos-blue/30 transition-colors duration-200"
            title="Admin"
          >
            <i className="fa-solid fa-user text-sm text-macos-blue"></i>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background-tertiary/50
                        hover:bg-background-tertiary transition-all duration-200 cursor-pointer group">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-macos-blue to-macos-purple flex items-center justify-center">
                <span className="text-white text-xs font-semibold">A</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-macos-green rounded-full border-2 border-background-tertiary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-text-primary truncate">Admin</p>
              <p className="text-[11px] text-text-tertiary truncate">admin@deploymaster.io</p>
            </div>

            <button className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-background-elevated rounded-lg
                             transition-all duration-200 opacity-0 group-hover:opacity-100">
              <i className="fa-solid fa-right-from-bracket w-4 h-4"></i>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
