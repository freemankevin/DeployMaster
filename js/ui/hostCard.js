// 主机卡片渲染模块
const HostCardRenderer = (function() {
    // 获取系统信息
    function getSystemInfo(os) {
        const systems = {
            linux: { icon: 'fab fa-linux', color: 'text-orange-500', name: 'Linux' },
            ubuntu: { icon: 'fab fa-ubuntu', color: 'text-orange-600', name: 'Ubuntu' },
            centos: { icon: 'fab fa-linux', color: 'text-purple-600', name: 'CentOS' },
            debian: { icon: 'fab fa-linux', color: 'text-red-500', name: 'Debian' },
            windows: { icon: 'fab fa-windows', color: 'text-blue-500', name: 'Windows' },
            macos: { icon: 'fab fa-apple', color: 'text-gray-800', name: 'macOS' }
        };
        return systems[os.toLowerCase()] || systems.linux;
    }
    
    // 创建主机卡片DOM
    function createHostCard(host, index, callbacks, Utils) {
        const card = document.createElement('div');
        card.className = `host-card bg-white rounded-xl border ${host.status === 'connected' ? 'border-emerald-200' : host.status === 'warning' ? 'border-amber-200' : 'border-gray-200'} overflow-hidden group card-enter card-stagger-${Math.min(index + 1, 6)}`;
        card.dataset.id = host.id;
        
        // 状态指示灯颜色
        let statusColor = 'bg-gray-400';
        let statusPulse = '';
        if (host.status === 'connected') {
            statusColor = 'bg-emerald-500';
            statusPulse = 'status-pulse';
        } else if (host.status === 'warning') {
            statusColor = 'bg-amber-500';
            statusPulse = 'animate-pulse';
        }
        
        // 认证标签
        const authBadge = host.authType === 'key' 
            ? '<span class="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-xs border border-purple-100 flex items-center gap-1 font-medium"><i class="fas fa-key text-xs"></i>密钥</span>'
            : '<span class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs border border-gray-200 flex items-center gap-1 font-medium"><i class="fas fa-lock text-xs"></i>密码</span>';
        
        // 格式化最后在线时间
        let lastSeenText = '';
        if (host.lastSeen) {
            lastSeenText = Utils.formatRelativeTime(host.lastSeen);
        }
        
        // 获取系统图标和颜色
        const systemInfo = getSystemInfo(host.os || 'linux');
        
        card.innerHTML = `
            <div class="p-4 border-b border-gray-100 flex items-start justify-between">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                            ${host.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 ${statusColor} rounded-full border-2 border-white ${statusPulse} shadow-sm"></div>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">${host.name}</h3>
                        <p class="text-xs text-gray-500 font-mono mt-0.5">${host.address}:${host.port}</p>
                    </div>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button class="test-btn p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-all duration-200 tooltip" data-tooltip="测试连接" title="测试连接">
                        <i class="fas fa-plug text-sm"></i>
                    </button>
                    <button class="edit-btn p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all duration-200 tooltip" data-tooltip="编辑主机" title="编辑">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="delete-btn p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all duration-200 tooltip" data-tooltip="删除主机" title="删除">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
            <div class="p-4 space-y-3">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">系统</span>
                    <span class="text-gray-700 flex items-center gap-2">
                        <i class="${systemInfo.icon} ${systemInfo.color}"></i>
                        ${systemInfo.name}
                    </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">用户</span>
                    <span class="text-gray-700 font-mono bg-gray-50 px-2 py-0.5 rounded">${host.username}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">认证</span>
                    ${authBadge}
                </div>
                ${lastSeenText ? `
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">最后在线</span>
                    <span class="text-gray-400 text-xs">${lastSeenText}</span>
                </div>` : ''}
                <div class="pt-3 border-t border-gray-100 flex gap-2">
                    <button class="terminal-btn flex-1 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-gray-200 hover:border-blue-200 group/btn">
                        <i class="fas fa-terminal text-blue-500 group-hover/btn:scale-110 transition-transform"></i>
                        终端
                    </button>
                    <button class="sftp-btn flex-1 py-2.5 bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-600 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-gray-200 hover:border-amber-200 group/btn">
                        <i class="fas fa-file-upload text-amber-500 group-hover/btn:scale-110 transition-transform"></i>
                        SFTP
                    </button>
                </div>
            </div>
        `;
        
        // 绑定卡片内按钮事件
        const testBtn = card.querySelector('.test-btn');
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        const terminalBtn = card.querySelector('.terminal-btn');
        const sftpBtn = card.querySelector('.sftp-btn');
        
        testBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onTest(host.id);
        });
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onEdit(host.id);
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onDelete(host.id);
        });
        terminalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onTerminal(host);
        });
        sftpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onSFTP(host);
        });
        
        return card;
    }
    
    // 渲染主机列表
    function renderHosts(hosts, grid, placeholder, callbacks, Utils) {
        // 清空现有卡片（保留添加按钮）
        grid.innerHTML = '';
        
        // 添加骨架屏效果
        if (hosts.length === 0) {
            grid.appendChild(placeholder);
            return;
        }
        
        // 渲染主机卡片，带交错动画
        hosts.forEach((host, index) => {
            const card = createHostCard(host, index, callbacks, Utils);
            grid.appendChild(card);
        });
        
        // 重新添加添加按钮
        grid.appendChild(placeholder);
    }
    
    // 公开方法
    return {
        createHostCard,
        renderHosts,
        getSystemInfo
    };
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HostCardRenderer;
}