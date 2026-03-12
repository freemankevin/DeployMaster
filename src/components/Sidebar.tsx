import {
  Server,
  GitBranch,
  Container,
  Database,
  History,
  Settings,
  LogOut,
  ChevronRight,
  Layers
} from 'lucide-react';

interface SidebarProps {
  hostCount?: number;
}

const Sidebar = ({ hostCount = 0 }: SidebarProps) => {
  const menuItems = [
    { icon: Server, label: 'SSH 管理', active: true, badge: hostCount > 0 ? String(hostCount) : undefined },
    { icon: GitBranch, label: '版本控制', active: false },
    { icon: Container, label: '容器管理', active: false },
    { icon: Database, label: '数据库部署', active: false },
  ];

  const systemItems = [
    { icon: History, label: '部署历史', active: false },
    { icon: Settings, label: '设置', active: false },
  ];

  return (
    <aside className="w-64 bg-[#F5F5F7] border-r border-gray-200/60 flex flex-col">
      {/* Logo Section */}
      <div className="p-5">
        <div className="flex items-center gap-3 group cursor-pointer">
          {/* Logo */}
          <img 
            src="/favicon-32x32.png" 
            alt="DeployMaster Logo" 
            className="w-10 h-10 rounded-lg"
          />
          <h1 className="font-semibold text-[15px] text-gray-900 tracking-tight">DeployMaster</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-6 overflow-y-auto">
        {/* Deploy Section */}
        <div>
          <div className="px-3 mb-2 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">部署功能</span>
          </div>
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-200 ease-macos group
                  ${item.active 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50' 
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
              >
                <item.icon className={`w-[18px] h-[18px] transition-colors duration-200
                  ${item.active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}`} 
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-semibold rounded-md">
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                )}
              </a>
            ))}
          </div>
        </div>

        {/* System Section */}
        <div>
          <div className="px-3 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">系统</span>
          </div>
          <div className="space-y-0.5">
            {systemItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-200 ease-macos group
                  ${item.active 
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50' 
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                  }`}
              >
                <item.icon className={`w-[18px] h-[18px] transition-colors duration-200
                  ${item.active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}`} 
                />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-200/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-gray-200/50 shadow-sm
                      hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group">
          {/* Avatar */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center
                          shadow-sm group-hover:shadow-md transition-shadow duration-200">
              <span className="text-white text-xs font-semibold">A</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate">管理员</p>
            <p className="text-[11px] text-gray-500 truncate">admin@deploymaster.io</p>
          </div>
          
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg 
                           transition-all duration-200 opacity-0 group-hover:opacity-100">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
