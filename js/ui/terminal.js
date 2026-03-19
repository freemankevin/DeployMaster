// 终端管理模块
const TerminalManager = (function() {
    let elements = null;
    let currentTerminalHost = null;
    
    // 初始化
    function init(els) {
        elements = els;
    }
    
    // 打开终端
    async function openTerminal(host) {
        currentTerminalHost = host;
        elements.terminalTitle.textContent = `${host.username}@${host.name}`;
        
        // 清空终端内容并显示连接中
        elements.terminalContent.innerHTML = `
            <div class="text-gray-400 mb-2 flex items-center gap-2">
                <i class="fas fa-circle-notch fa-spin"></i>
                正在连接到 ${host.address}...
            </div>
        `;
        
        const modal = elements.terminalModal;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // 添加进入动画
        requestAnimationFrame(() => {
            modal.classList.add('modal-enter');
        });
        
        // 模拟连接过程
        setTimeout(() => {
            elements.terminalContent.innerHTML = `
                <div class="text-emerald-400 mb-2">
                    <i class="fas fa-check-circle mr-2"></i>已连接到 ${host.name} (${host.address})
                </div>
                <div class="text-gray-500 mb-4">输入命令开始操作，输入 'help' 查看帮助</div>
                <div class="mb-2">
                    <span class="text-green-400">${host.username}@${host.name}</span>:<span class="text-blue-400">~</span>$ 
                    <span class="typing-cursor"></span>
                </div>
            `;
        }, 800);
        
        // 聚焦输入框
        setTimeout(() => elements.terminalInput.focus(), 100);
    }
    
    // 关闭终端
    function closeTerminal() {
        const modal = elements.terminalModal;
        modal.classList.add('modal-exit');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex', 'modal-exit', 'modal-enter');
            currentTerminalHost = null;
        }, 300);
    }
    
    // 发送终端命令
    async function sendTerminalCommand(SSHManager) {
        const input = elements.terminalInput;
        const command = input.value.trim();
        if (!command || !currentTerminalHost) return;
        
        // 添加命令到输出
        addTerminalOutput(`<span class="text-green-400">${currentTerminalHost.username}@${currentTerminalHost.name}</span>:<span class="text-blue-400">~</span>$ ${escapeHtml(command)}`);
        
        // 清空输入
        input.value = '';
        
        // 显示加载中
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'text-gray-500 mb-2 flex items-center gap-2';
        loadingDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> 执行中...';
        elements.terminalContent.appendChild(loadingDiv);
        elements.terminalContent.scrollTop = elements.terminalContent.scrollHeight;
        
        try {
            // 执行真实命令
            const result = await SSHManager.executeCommand(currentTerminalHost.id, command);
            
            // 移除加载提示
            loadingDiv.remove();
            
            if (result.success) {
                if (result.stdout) {
                    addTerminalOutput(`<span class="text-gray-300">${escapeHtml(result.stdout)}</span>`);
                }
                if (result.stderr) {
                    addTerminalOutput(`<span class="text-amber-400">${escapeHtml(result.stderr)}</span>`);
                }
            } else {
                addTerminalOutput(`<span class="text-red-400">错误: ${escapeHtml(result.stderr || result.message || '命令执行失败')}</span>`);
            }
        } catch (e) {
            loadingDiv.remove();
            addTerminalOutput(`<span class="text-red-400">错误: ${escapeHtml(e.message)}</span>`);
        }
        
        // 添加新的提示符
        addTerminalOutput(`<span class="text-green-400">${currentTerminalHost.username}@${currentTerminalHost.name}</span>:<span class="text-blue-400">~</span>$ <span class="typing-cursor"></span>`);
        
        // 滚动到底部
        elements.terminalContent.scrollTop = elements.terminalContent.scrollHeight;
    }
    
    // HTML 转义
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 添加终端输出
    function addTerminalOutput(html) {
        const div = document.createElement('div');
        div.className = 'mb-2 whitespace-pre-wrap';
        div.innerHTML = html;
        elements.terminalContent.appendChild(div);
    }
    
    // 获取当前终端主机
    function getCurrentHost() {
        return currentTerminalHost;
    }
    
    // 公开方法
    return {
        init,
        openTerminal,
        closeTerminal,
        sendTerminalCommand,
        getCurrentHost
    };
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalManager;
}