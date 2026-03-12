import { Search, Plus, Activity } from 'lucide-react';
import type { HostStats } from '@/types';

interface HeaderProps {
  stats: HostStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddHost: () => void;
}

const Header = ({ stats, searchQuery, onSearchChange, onAddHost }: HeaderProps) => {
  return (
    <header className="h-16 glass-macos border-b border-gray-200/60 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <h2 className="text-[17px] font-semibold text-gray-900 tracking-tight">SSH 连接管理</h2>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 border border-emerald-200/60 rounded-full">
          <div className="relative">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
          </div>
          <span className="text-[12px] font-medium text-emerald-700">
            {stats.online} 个活跃连接
          </span>
        </div>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 
                           group-focus-within:text-blue-500 transition-colors duration-200" />
          <input 
            type="text" 
            placeholder="搜索主机..." 
            className="pl-9 pr-4 py-2 w-64 bg-gray-100/80 border border-transparent 
                     rounded-lg text-[13px] text-gray-900 placeholder-gray-500
                     transition-all duration-200 ease-macos
                     focus:bg-white focus:border-blue-500/30 focus:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]
                     hover:bg-gray-100"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {/* Keyboard shortcut hint */}
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 
                         bg-gray-200/80 text-gray-500 text-[10px] font-medium rounded 
                         hidden group-focus-within:hidden">
            ⌘K
          </kbd>
        </div>

        {/* Add Host Button */}
        <button 
          onClick={onAddHost}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 
                   text-white rounded-lg text-[13px] font-medium
                   transition-all duration-200 ease-macos
                   shadow-[0_0.5px_1px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                   hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.25)]
                   hover:brightness-105 active:scale-[0.98] active:shadow-[inset_0_0.5px_2px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span>添加主机</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
