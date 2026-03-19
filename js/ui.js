// UI 管理模块 - 适配后端 API
// 注意：此文件依赖 modal.js, terminal.js, hostCard.js

const UIManager = (function() {
    // DOM 元素
    let elements = {};
    
    // 初始化
    async function init() {
        cacheElements();
        bindEvents();
        
        // 初始化子模块
        ModalManager.init(elements);
        TerminalManager.init(elements);
        
        // 初始化 SSH 管理器并加载数据
        await SSHManager.init();
        
        // 显示加载动画
        const loader = Utils.showLoading('正在加载主机列表...');
        
        try {
            await renderHosts();
            await updateStatsDisplay();
        } finally {
            loader.close();
        }
        
        // 监听统计更新事件
        document.addEventListener('statsUpdated', updateStatsDisplay);
        
        // 页面加载完成动画
        document.body.classList.add('fade-in');
    }
    
    // 缓存 DOM 元素
    function cacheElements() {
        elements = {
            hostsGrid: document.getElementById('hostsGrid'),
            addHostBtn: document.getElementById('addHostBtn'),
            addHostPlaceholder: document.getElementById('addHostPlaceholder'),
            addHostModal: document.getElementById('addHostModal'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            cancelModalBtn: document.getElementById('cancelModalBtn'),
            saveHostBtn: document.getElementById('saveHostBtn'),
            terminalModal: document.getElementById('terminalModal'),
            closeTerminalBtn: document.getElementById('closeTerminalBtn'),
            searchInput: document.querySelector('input[placeholder="搜索主机..."]'),
            totalHosts: document.getElementById('totalHosts'),
            onlineHosts: document.getElementById('onlineHosts'),
            activeSessions: document.getElementById('activeSessions'),
            keyCount: document.getElementById('keyCount'),
            
            // 表单字段
            hostName: document.getElementById('hostName'),
            hostAddress: document.getElementById('hostAddress'),
            hostPort: document.getElementById('hostPort'),
            hostUsername: document.getElementById('hostUsername'),
            authKeyBtn: document.getElementById('authKeyBtn'),
            authPasswordBtn: document.getElementById('authPasswordBtn'),
            keyAuth: document.getElementById('keyAuth'),
            passwordAuth: document.getElementById('passwordAuth'),
            hostKey: document.getElementById('hostKey'),
            hostPassword: document.getElementById('hostPassword'),
            tagInput: document.getElementById('tagInput'),
            
            // 终端元素
            terminalTitle: document.getElementById('terminalTitle'),
            terminalContent: document.getElementById('terminalContent'),
            terminalInput: document.getElementById('terminalInput'),
            sendCommandBtn: document.getElementById('sendCommandBtn')
        };
    }
    
    // 绑定事件
    function bindEvents() {
        // 添加主机按钮
        elements.addHostBtn.addEventListener('click', () => openAddModal());
        elements.addHostPlaceholder.addEventListener('click', () => openAddModal());
        
        // 模态框按钮
        elements.closeModalBtn.addEventListener('click', ModalManager.closeAddModal);
        elements.cancelModalBtn.addEventListener('click', ModalManager.closeAddModal);
        elements.saveHostBtn.addEventListener('click', saveHost);
        
        // 认证切换
        elements.authKeyBtn.addEventListener('click', () => ModalManager.switchAuth('key'));
        elements.authPasswordBtn.addEventListener('click', () => ModalManager.switchAuth('password'));
        
        // 终端关闭
        elements.closeTerminalBtn.addEventListener('click', TerminalManager.closeTerminal);
        
        // 搜索输入防抖
        elements.searchInput.addEventListener('input', Utils.debounce(searchHosts, 300));
        
        // 标签输入
        elements.tagInput.addEventListener('keydown', handleTagInput);
        
        // 终端命令发送
        elements.sendCommandBtn.addEventListener('click', () => TerminalManager.sendTerminalCommand(SSHManager));
        elements.terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') TerminalManager.sendTerminalCommand(SSHManager);
        });
        
        // 外部点击关闭模态框
        window.addEventListener('click', (e) => {
            if (e.target === elements.addHostModal) ModalManager.closeAddModal();
            if (e.target === elements.terminalModal) TerminalManager.closeTerminal();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    // 打开添加模态框
    function openAddModal(hostId = null) {
        ModalManager.openAddModal(hostId, SSHManager, loadSSHKeys);
    }
    
    // 加载 SSH 密钥列表
    async function loadSSHKeys() {
        try {
            const keys = await SSHManager.getSSHKeys();
            const select = elements.hostKey;
            
            // 保留第一个选项和上传选项
            const defaultOptions = Array.from(select.options).slice(0, 2);
            select.innerHTML = '';
            
            defaultOptions.forEach(opt => select.add(opt));
            
            // 添加数据库中的密钥
            keys.forEach(key => {
                const option = document.createElement('option');
                option.value = key.id;
                option.textContent = key.name;
                select.insertBefore(option, select.lastElementChild);
            });
        } catch (e) {
            console.error('加载密钥失败:', e);
        }
    }
    
    // 保存主机
    async function saveHost() {
        // 清除之前的验证状态
        ModalManager.clearFormValidation();
        
        // 验证表单
        const validation = ModalManager.validateForm(Utils);
        if (!validation.isValid) {
            Utils.showNotification(validation.errors[0], 'error');
            return;
        }
        
        const name = elements.hostName.value.trim();
        const address = elements.hostAddress.value.trim();
        const port = parseInt(elements.hostPort.value, 10);
        const username = elements.hostUsername.value.trim();
        const authType = elements.authKeyBtn.classList.contains('active') ? 'key' : 'password';
        
        let password = '';
        let privateKey = '';
        
        if (authType === 'key') {
            const keyValue = elements.hostKey.value;
            if (keyValue && keyValue !== '+ 上传新密钥') {
                privateKey = keyValue;
            }
        } else {
            password = elements.hostPassword.value;
        }
        
        const hostData = {
            name,
            address,
            port,
            username,
            auth_type: authType,
            password: password || undefined,
            private_key: privateKey || undefined,
            tags: []
        };
        
        try {
            // 显示加载状态
            const originalText = elements.saveHostBtn.innerHTML;
            elements.saveHostBtn.disabled = true;
            elements.saveHostBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>保存中...';
            
            const editingHostId = ModalManager.getEditingHostId();
            if (editingHostId) {
                await SSHManager.updateHost(editingHostId, hostData);
                Utils.showNotification('主机更新成功', 'success');
            } else {
                await SSHManager.addHost(hostData);
                Utils.showNotification('主机添加成功', 'success');
            }
            
            ModalManager.closeAddModal();
            await renderHosts();
            await updateStatsDisplay();
        } catch (e) {
            Utils.showNotification(e.message || '保存失败', 'error');
        } finally {
            elements.saveHostBtn.disabled = false;
            elements.saveHostBtn.innerHTML = '<i class="fas fa-plug mr-2"></i>测试并保存';
        }
    }
    
    // 渲染主机列表
    async function renderHosts(hosts = null) {
        if (!hosts) {
            hosts = await SSHManager.getAllHosts();
        }
        
        const callbacks = {
            onTest: testHostConnection,
            onEdit: openAddModal,
            onDelete: deleteHost,
            onTerminal: TerminalManager.openTerminal,
            onSFTP: (host) => Utils.showNotification('SFTP 功能开发中', 'info')
        };
        
        HostCardRenderer.renderHosts(hosts, elements.hostsGrid, elements.addHostPlaceholder, callbacks, Utils);
    }
    
    // 测试主机连接
    async function testHostConnection(hostId) {
        try {
            const toastId = Utils.showNotification('正在测试连接...', 'info', { duration: 10000 });
            const result = await SSHManager.testConnection(hostId);
            
            Utils.closeToast(toastId);
            
            if (result.success) {
                Utils.showNotification('连接成功！', 'success');
            } else {
                Utils.showNotification(result.message || '连接失败', 'error');
            }
            
            await renderHosts();
            await updateStatsDisplay();
        } catch (e) {
            Utils.showNotification(e.message || '测试连接失败', 'error');
        }
    }
    
    // 删除主机
    async function deleteHost(id) {
        const confirmed = await Utils.showConfirm('确定要删除此主机吗？此操作不可恢复。', {
            title: '删除主机',
            confirmText: '删除',
            cancelText: '取消',
            type: 'danger'
        });
        
        if (confirmed) {
            try {
                await SSHManager.deleteHost(id);
                Utils.showNotification('主机已删除', 'success');
                await renderHosts();
                await updateStatsDisplay();
            } catch (e) {
                Utils.showNotification(e.message || '删除失败', 'error');
            }
        }
    }
    
    // 搜索主机
    async function searchHosts() {
        const query = elements.searchInput.value.trim();
        const results = await SSHManager.searchHosts(query);
        await renderHosts(results);
    }
    
    // 处理标签输入
    function handleTagInput(e) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            Utils.showNotification('标签功能开发中', 'info');
            e.target.value = '';
            e.preventDefault();
        }
    }
    
    // 更新统计显示
    async function updateStatsDisplay() {
        try {
            const stats = await SSHManager.getStats();
            
            animateNumber(elements.totalHosts, stats.total || 0);
            animateNumber(elements.onlineHosts, stats.online || 0);
            animateNumber(elements.activeSessions, 0);
            animateNumber(elements.keyCount, stats.key_count || 0);
        } catch (e) {
            console.error('更新统计失败:', e);
        }
    }
    
    // 数字动画
    function animateNumber(element, target) {
        if (!element) return;
        const current = parseInt(element.textContent, 10) || 0;
        if (current === target) return;
        
        const duration = 600;
        const start = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const value = Math.round(current + (target - current) * easeProgress);
            
            element.textContent = value;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    // 键盘快捷键
    function handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N 添加主机
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openAddModal();
        }
        // Esc 关闭模态框
        if (e.key === 'Escape') {
            if (!elements.addHostModal.classList.contains('hidden')) {
                ModalManager.closeAddModal();
            }
            if (!elements.terminalModal.classList.contains('hidden')) {
                TerminalManager.closeTerminal();
            }
        }
        // Ctrl/Cmd + F 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            elements.searchInput.focus();
        }
        // Ctrl/Cmd + K 清空搜索
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.searchInput.value = '';
            searchHosts();
        }
    }
    
    // 公开方法
    return {
        init,
        renderHosts,
        updateStatsDisplay
    };
})();

// 当 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    UIManager.init();
});