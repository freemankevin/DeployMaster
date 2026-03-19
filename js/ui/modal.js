// 模态框管理模块
const ModalManager = (function() {
    let elements = null;
    let editingHostId = null;
    
    // 初始化
    function init(els) {
        elements = els;
    }
    
    // 打开添加主机模态框
    async function openAddModal(hostId = null, SSHManager, loadSSHKeys) {
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
    function validateForm(Utils) {
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
    
    // 获取编辑中的主机ID
    function getEditingHostId() {
        return editingHostId;
    }
    
    // 公开方法
    return {
        init,
        openAddModal,
        closeAddModal,
        resetForm,
        switchAuth,
        validateForm,
        clearFormValidation,
        getEditingHostId
    };
})();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}