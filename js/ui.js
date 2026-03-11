// UI 管理模块 - 适配后端 API
const UIManager = (function() {
    // DOM 元素
    let elements = {};
    
    // 当前编辑的主机ID
    let editingHostId = null;
    
    // 当前打开终端的主机
    let currentTerminalHost = null;
    
    // 初始化
    async function init() {
        cacheElements();
        bindEvents();
        
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
        elements.closeModalBtn.addEventListener('click', closeAddModal);
        elements.cancelModalBtn.addEventListener('click', closeAddModal);
        elements.saveHostBtn.addEventListener('click', saveHost);
        
        // 认证切换
        elements.authKeyBtn.addEventListener('click', () => switchAuth('key'));
        elements.authPasswordBtn.addEventListener('click', () => switchAuth('password'));
        
        // 终端关闭
        elements.closeTerminalBtn.addEventListener('click', closeTerminal);
        
        // 搜索输入防抖
        elements.searchInput.addEventListener('input', Utils.debounce(searchHosts, 300));
        
        // 标签输入
        elements.tagInput.addEventListener('keydown', handleTagInput);
        
        // 终端命令发送
        elements.sendCommandBtn.addEventListener('click', sendTerminalCommand);
        elements.terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendTerminalCommand();
        });
        
        // 外部点击关闭模态框
        window.addEventListener('click', (e) => {
            if (e.target === elements.addHostModal) closeAddModal();
            if (e.target === elements.terminalModal) closeTerminal();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    // 打开添加主机模态框
    async function openAddModal(hostId = null) {
        editingHostId = hostId;
        const modal = elements.addHostModal;
        const content = document.getElementById('modalContent');
        
        // 加载密钥列表
        await loadSSHKeys();
        
        if (hostId) {
            // 编辑模式
            document.querySelector('#addHostModal h3').textContent = '编辑 SSH 主机';
            const host = await SSHManager.getHost(hostId);
            if (host) {
                elements.hostName.value = host.name;
                elements.hostAddress.value = host.address;
                elements.hostPort.value = host.port;
                elements.hostUsername.value = host.username;
                switchAuth(host.authType);
                if (host.authType === 'key') {
                    elements.hostKey.value = host.privateKey || '';
                } else {
                    elements.hostPassword.value = host.password || '';
                }
            }
        } else {
            // 添加模式
            document.querySelector('#addHostModal h3').textContent = '添加 SSH 主机';
            resetForm();
        }
        
        // 显示模态框
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // 添加动画类
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100', 'modal-enter');
        });
        
        // 聚焦第一个输入框
        setTimeout(() => elements.hostName.focus(), 100);
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
    
    // 关闭添加主机模态框
    function closeAddModal() {
        const modal = elements.addHostModal;
        const content = document.getElementById('modalContent');
        
        // 添加退出动画
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100', 'modal-enter');
        content.classList.add('scale-95', 'modal-exit');
        
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            content.classList.remove('modal-exit');
            editingHostId = null;
        }, 300);
    }
    
    // 重置表单
    function resetForm() {
        elements.hostName.value = '';
        elements.hostAddress.value = '';
        elements.hostPort.value = 22;
        elements.hostUsername.value = 'root';
        switchAuth('password');
        elements.hostKey.selectedIndex = 0;
        elements.hostPassword.value = '';
        elements.tagInput.value = '';
        
        // 清除验证状态
        clearFormValidation();
    }
    
    // 清除表单验证状态
    function clearFormValidation() {
        const inputs = [elements.hostName, elements.hostAddress, elements.hostPort, elements.hostUsername];
        inputs.forEach(input => {
            if (input) {
                input.classList.remove('border-red-500', 'shake');
                input.classList.add('border-gray-200');
            }
        });
    }
    
    // 切换认证方式
    function switchAuth(type) {
        const keyDiv = elements.keyAuth;
        const passDiv = elements.passwordAuth;
        const keyBtn = elements.authKeyBtn;
        const passBtn = elements.authPasswordBtn;
        
        // 更新按钮状态
        keyBtn.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        keyBtn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-600');
        passBtn.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
        passBtn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-600');
        
        if (type === 'key') {
            keyBtn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-600');
            keyBtn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
            
            // 添加切换动画
            passDiv.style.opacity = '0';
            setTimeout(() => {
                passDiv.classList.add('hidden');
                keyDiv.classList.remove('hidden');
                keyDiv.style.opacity = '0';
                requestAnimationFrame(() => {
                    keyDiv.style.transition = 'opacity 0.2s ease';
                    keyDiv.style.opacity = '1';
                });
            }, 150);
        } else {
            passBtn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-600');
            passBtn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-600');
            
            // 添加切换动画
            keyDiv.style.opacity = '0';
            setTimeout(() => {
                keyDiv.classList.add('hidden');
                passDiv.classList.remove('hidden');
                passDiv.style.opacity = '0';
                requestAnimationFrame(() => {
                    passDiv.style.transition = 'opacity 0.2s ease';
                    passDiv.style.opacity = '1';
                });
            }, 150);
        }
    }
    
    // 验证表单
    function validateForm() {
        let isValid = true;
        const errors = [];
        
        // 验证主机名
        if (!elements.hostName.value.trim()) {
            elements.hostName.classList.add('border-red-500', 'shake');
            elements.hostName.classList.remove('border-gray-200');
            errors.push('请填写显示名称');
            isValid = false;
        }
        
        // 验证主机地址
        const address = elements.hostAddress.value.trim();
        if (!address) {
            elements.hostAddress.classList.add('border-red-500', 'shake');
            elements.hostAddress.classList.remove('border-gray-200');
            errors.push('请填写主机地址');
            isValid = false;
        } else if (!Utils.validateHostAddress(address)) {
            elements.hostAddress.classList.add('border-red-500', 'shake');
            elements.hostAddress.classList.remove('border-gray-200');
            errors.push('主机地址格式无效');
            isValid = false;
        }
        
        // 验证端口
        const port = parseInt(elements.hostPort.value, 10);
        if (!Utils.validatePort(port)) {
            elements.hostPort.classList.add('border-red-500', 'shake');
            elements.hostPort.classList.remove('border-gray-200');
            errors.push('端口号无效（1-65535）');
            isValid = false;
        }
        
        // 验证用户名
        if (!elements.hostUsername.value.trim()) {
            elements.hostUsername.classList.add('border-red-500', 'shake');
            elements.hostUsername.classList.remove('border-gray-200');
            errors.push('请填写用户名');
            isValid = false;
        }
        
        // 验证认证信息
        const authType = elements.authKeyBtn.classList.contains('active') ? 'key' : 'password';
        if (authType === 'password' && !elements.hostPassword.value) {
            elements.hostPassword.classList.add('border-red-500', 'shake');
            elements.hostPassword.classList.remove('border-gray-200');
            errors.push('请输入密码');
            isValid = false;
        }
        if (authType === 'key') {
            const keyValue = elements.hostKey.value;
            if (!keyValue || keyValue === '+ 上传新密钥') {
                errors.push('请选择或输入私钥');
                isValid = false;
            }
        }
        
        // 移除 shake 动画
        setTimeout(() => {
            [elements.hostName, elements.hostAddress, elements.hostPort, elements.hostUsername, elements.hostPassword].forEach(input => {
                if (input) input.classList.remove('shake');
            });
        }, 500);
        
        return { isValid, errors };
    }
    
    // 保存主机（添加或更新）
    async function saveHost() {
        // 清除之前的验证状态
        clearFormValidation();
        
        // 验证表单
        const validation = validateForm();
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
            
            if (editingHostId) {
                // 更新现有主机
                await SSHManager.updateHost(editingHostId, hostData);
                Utils.showNotification('主机更新成功', 'success');
            } else {
                // 添加新主机
                await SSHManager.addHost(hostData);
                Utils.showNotification('主机添加成功', 'success');
            }
            
            closeAddModal();
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
        
        const grid = elements.hostsGrid;
        // 清空现有卡片（保留添加按钮）
        const placeholder = elements.addHostPlaceholder;
        grid.innerHTML = '';
        
        // 添加骨架屏效果
        if (hosts.length === 0) {
            grid.appendChild(placeholder);
            return;
        }
        
        // 渲染主机卡片，带交错动画
        hosts.forEach((host, index) => {
            const card = createHostCard(host, index);
            grid.appendChild(card);
        });
        
        // 重新添加添加按钮
        grid.appendChild(placeholder);
    }
    
    // 创建主机卡片DOM
    function createHostCard(host, index = 0) {
        const card = document.createElement('div');
        card.className = `host-card bg-white rounded-xl border ${host.status === 'connected' ? 'border-emerald-200' : host.status === 'warning' ? 'border-amber-200' : 'border-gray-200'} overflow-hidden group card-enter card-stagger-${Math.min(index + 1, 6)}`;
        card.dataset.id = host.id;
        
        // 状态指示灯颜色
        let statusColor = 'bg-gray-400';
        let statusPulse = '';
        let statusBg = 'bg-gray-50';
        if (host.status === 'connected') {
            statusColor = 'bg-emerald-500';
            statusPulse = 'status-pulse';
            statusBg = 'bg-emerald-50';
        } else if (host.status === 'warning') {
            statusColor = 'bg-amber-500';
            statusPulse = 'animate-pulse';
            statusBg = 'bg-amber-50';
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
            testHostConnection(host.id);
        });
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openAddModal(host.id);
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHost(host.id);
        });
        terminalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTerminal(host);
        });
        sftpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            Utils.showNotification('SFTP 功能开发中', 'info');
        });
        
        return card;
    }
    
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
            
            // 刷新显示
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
    async function sendTerminalCommand() {
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
            
            // 数字动画
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
            const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
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
                closeAddModal();
            }
            if (!elements.terminalModal.classList.contains('hidden')) {
                closeTerminal();
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
