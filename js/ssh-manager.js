// SSH 主机管理模块 - 连接后端 API
const SSHManager = (function() {
    // API 基础 URL
    const API_BASE_URL = 'http://localhost:5000/api';
    
    // 主机数据模型
    class SSHHost {
        constructor(data) {
            this.id = data.id;
            this.name = data.name;
            this.address = data.address;
            this.port = data.port || 22;
            this.username = data.username;
            this.authType = data.auth_type || 'password';
            this.password = data.password || '';
            this.privateKey = data.private_key || '';
            this.keyPassphrase = data.key_passphrase || '';
            this.tags = data.tags || [];
            this.status = data.status || 'disconnected';
            this.lastSeen = data.last_seen;
            this.systemType = data.system_type || 'Linux';
            this.createdAt = data.created_at;
            this.updatedAt = data.updated_at;
        }
        
        getIcon() {
            const icons = {
                'Ubuntu': 'fab fa-ubuntu',
                'CentOS': 'fab fa-centos',
                'CentOS/RHEL': 'fab fa-centos',
                'Debian': 'fab fa-debian',
                'Windows': 'fab fa-windows',
                'macOS': 'fab fa-apple',
                'Linux': 'fab fa-linux'
            };
            return icons[this.systemType] || 'fas fa-server';
        }
        
        getColor() {
            const colors = {
                'Ubuntu': 'text-orange-400',
                'CentOS': 'text-purple-400',
                'CentOS/RHEL': 'text-purple-400',
                'Debian': 'text-red-400',
                'Windows': 'text-blue-400',
                'macOS': 'text-gray-400',
                'Linux': 'text-yellow-400'
            };
            return colors[this.systemType] || 'text-slate-400';
        }
        
        getSystemName() {
            return this.systemType || 'Unknown';
        }
    }
    
    // 状态
    let hosts = [];
    
    // ==================== API 请求方法 ====================
    
    async function apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API 请求失败:', error);
            throw error;
        }
    }
    
    // ==================== 主机管理方法 ====================
    
    async function init() {
        try {
            await loadHosts();
            updateStats();
            return hosts;
        } catch (e) {
            console.error('初始化失败:', e);
            Utils.showNotification('无法连接到服务器', 'error');
            return [];
        }
    }
    
    async function loadHosts() {
        try {
            const response = await apiRequest('/hosts');
            if (response.success) {
                hosts = response.data.map(h => new SSHHost(h));
            }
        } catch (e) {
            console.error('加载主机失败:', e);
            hosts = [];
        }
        return hosts;
    }
    
    async function getAllHosts() {
        if (hosts.length === 0) {
            await loadHosts();
        }
        return hosts;
    }
    
    async function getHost(id) {
        try {
            const response = await apiRequest(`/hosts/${id}`);
            if (response.success) {
                return new SSHHost(response.data);
            }
        } catch (e) {
            console.error('获取主机失败:', e);
        }
        return null;
    }
    
    async function addHost(hostData) {
        try {
            const response = await apiRequest('/hosts', {
                method: 'POST',
                body: JSON.stringify(hostData)
            });
            
            if (response.success) {
                const host = new SSHHost(response.data);
                hosts.push(host);
                updateStats();
                return host;
            }
        } catch (e) {
            console.error('添加主机失败:', e);
            throw e;
        }
        return null;
    }
    
    async function updateHost(id, updates) {
        try {
            const response = await apiRequest(`/hosts/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            if (response.success) {
                const index = hosts.findIndex(h => h.id === id);
                if (index !== -1) {
                    hosts[index] = new SSHHost(response.data);
                }
                updateStats();
                return hosts[index];
            }
        } catch (e) {
            console.error('更新主机失败:', e);
            throw e;
        }
        return null;
    }
    
    async function deleteHost(id) {
        try {
            const response = await apiRequest(`/hosts/${id}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                const index = hosts.findIndex(h => h.id === id);
                if (index !== -1) {
                    hosts.splice(index, 1);
                }
                updateStats();
                return true;
            }
        } catch (e) {
            console.error('删除主机失败:', e);
            throw e;
        }
        return false;
    }
    
    // ==================== 连接和命令 ====================
    
    async function testConnection(hostId) {
        try {
            const response = await apiRequest(`/hosts/${hostId}/test`, {
                method: 'POST'
            });
            
            if (response.success) {
                // 更新本地状态
                const index = hosts.findIndex(h => h.id === hostId);
                if (index !== -1) {
                    hosts[index].status = 'connected';
                    hosts[index].lastSeen = new Date().toISOString();
                    if (response.system_info) {
                        hosts[index].systemType = response.system_info.os || 'Linux';
                    }
                }
                updateStats();
            } else {
                // 更新本地状态为断开
                const index = hosts.findIndex(h => h.id === hostId);
                if (index !== -1) {
                    hosts[index].status = 'disconnected';
                }
            }
            
            return response;
        } catch (e) {
            console.error('测试连接失败:', e);
            throw e;
        }
    }
    
    async function executeCommand(hostId, command) {
        try {
            const response = await apiRequest(`/hosts/${hostId}/execute`, {
                method: 'POST',
                body: JSON.stringify({ command })
            });
            return response;
        } catch (e) {
            console.error('执行命令失败:', e);
            throw e;
        }
    }
    
    // ==================== 搜索和统计 ====================
    
    async function searchHosts(query) {
        if (!query.trim()) {
            return hosts;
        }
        
        try {
            const response = await apiRequest(`/hosts/search?q=${encodeURIComponent(query)}`);
            if (response.success) {
                return response.data.map(h => new SSHHost(h));
            }
        } catch (e) {
            console.error('搜索主机失败:', e);
        }
        
        // 本地搜索作为后备
        const q = query.toLowerCase();
        return hosts.filter(h => 
            h.name.toLowerCase().includes(q) || 
            h.address.toLowerCase().includes(q) ||
            h.username.toLowerCase().includes(q) ||
            h.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }
    
    async function getStats() {
        try {
            const response = await apiRequest('/hosts/stats');
            if (response.success) {
                return response.data;
            }
        } catch (e) {
            console.error('获取统计信息失败:', e);
        }
        
        // 本地计算作为后备
        const total = hosts.length;
        const online = hosts.filter(h => h.status === 'connected').length;
        const keyCount = hosts.filter(h => h.authType === 'key').length;
        
        return {
            total,
            online,
            offline: total - online,
            key_count: keyCount
        };
    }
    
    function updateStats() {
        // 触发统计更新事件
        const event = new CustomEvent('statsUpdated');
        document.dispatchEvent(event);
    }
    
    // ==================== SSH 密钥管理 ====================
    
    async function getSSHKeys() {
        try {
            const response = await apiRequest('/keys');
            if (response.success) {
                return response.data;
            }
        } catch (e) {
            console.error('获取密钥失败:', e);
        }
        return [];
    }
    
    async function addSSHKey(keyData) {
        try {
            const response = await apiRequest('/keys', {
                method: 'POST',
                body: JSON.stringify(keyData)
            });
            return response;
        } catch (e) {
            console.error('添加密钥失败:', e);
            throw e;
        }
    }
    
    async function generateSSHKey(keyType, name) {
        try {
            const response = await apiRequest('/keys/generate', {
                method: 'POST',
                body: JSON.stringify({ key_type: keyType, name })
            });
            return response;
        } catch (e) {
            console.error('生成密钥失败:', e);
            throw e;
        }
    }
    
    async function deleteSSHKey(keyId) {
        try {
            const response = await apiRequest(`/keys/${keyId}`, {
                method: 'DELETE'
            });
            return response.success;
        } catch (e) {
            console.error('删除密钥失败:', e);
            throw e;
        }
    }
    
    // 导出公共方法
    return {
        init,
        getAllHosts,
        getHost,
        addHost,
        updateHost,
        deleteHost,
        testConnection,
        executeCommand,
        searchHosts,
        getStats,
        updateStats,
        getSSHKeys,
        addSSHKey,
        generateSSHKey,
        deleteSSHKey,
        SSHHost
    };
})();
