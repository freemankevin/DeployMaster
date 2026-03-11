import { Server, GitBranch, Box, Database, History, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900 tracking-tight">DeployMaster</h1>
            <p className="text-xs text-gray-500">自动化部署平台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">部署功能</div>
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all duration-200">
          <Server className="w-5 h-5" />
          <span className="font-medium">SSH 管理</span>
          <span className="ml-auto bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">12</span>
        </a>
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
          <GitBranch className="w-5 h-5" />
          <span>版本控制</span>
        </a>
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
          <Box className="w-5 h-5" />
          <span>容器管理</span>
        </a>
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
          <Database className="w-5 h-5" />
          <span>数据库部署</span>
        </a>

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-3">系统</div>
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
          <History className="w-5 h-5" />
          <span>部署历史</span>
        </a>
        
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
          <Settings className="w-5 h-5" />
          <span>设置</span>
        </a>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
          <img 
            src="https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff" 
            className="w-8 h-8 rounded-full shadow-sm"
            alt="Admin"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">管理员</p>
            <p className="text-xs text-gray-500 truncate">admin@deploymaster.io</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;