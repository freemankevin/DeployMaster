import { Search, Plus } from 'lucide-react';
import type { HostStats } from '@/types';

interface HeaderProps {
  stats: HostStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddHost: () => void;
}

const Header = ({ stats, searchQuery, onSearchChange, onAddHost }: HeaderProps) => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">SSH 连接管理</h2>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs border border-emerald-100 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
          {stats.online} 个活跃连接
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索主机..." 
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-64 transition-all duration-200"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button 
          onClick={onAddHost}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          添加主机
        </button>
      </div>
    </header>
  );
};

export default Header;