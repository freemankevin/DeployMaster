// 实用工具函数
const Utils = (function() {
    // Toast 容器
    let toastContainer = null;
    
    // 初始化 Toast 容器
    function initToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    }
    
    // 生成随机ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 节流函数
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // 格式化日期
    function formatDate(date) {
        const d = new Date(date);
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    // 格式化相对时间
    function formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 30) return `${days}天前`;
        return formatDate(date);
    }
    
    // 复制文本到剪贴板
    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            showNotification('已复制到剪贴板', 'success');
            return true;
        } catch (err) {
            showNotification('复制失败', 'error');
            return false;
        }
    }
    
    // 显示 Toast 通知
    function showNotification(message, type = 'info', options = {}) {
        initToastContainer();
        
        const {
            title = getDefaultTitle(type),
            duration = 3000,
            closable = true,
            onClose = null
        } = options;
        
        const toast = document.createElement('div');
        const toastId = generateId();
        toast.className = `toast ${type}`;
        toast.id = toastId;
        
        const iconMap = {
            success: 'fa-check',
            error: 'fa-times',
            info: 'fa-info',
            warning: 'fa-exclamation'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? `
                <div class="toast-close" onclick="Utils.closeToast('${toastId}')">
                    <i class="fas fa-times"></i>
                </div>
            ` : ''}
            <div class="toast-progress" style="width: 100%;"></div>
        `;
        
        toastContainer.appendChild(toast);
        
        // 触发动画
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // 进度条动画
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
            progressBar.style.transition = `width ${duration}ms linear`;
            requestAnimationFrame(() => {
                progressBar.style.width = '0%';
            });
        }
        
        // 自动关闭
        const autoCloseTimeout = setTimeout(() => {
            closeToast(toastId);
            if (onClose) onClose();
        }, duration);
        
        // 鼠标悬停时暂停
        toast.addEventListener('mouseenter', () => {
            clearTimeout(autoCloseTimeout);
            if (progressBar) {
                progressBar.style.transition = 'none';
            }
        });
        
        toast.addEventListener('mouseleave', () => {
            closeToast(toastId, 1000);
        });
        
        return toastId;
    }
    
    // 关闭指定 Toast
    function closeToast(toastId, delay = 0) {
        setTimeout(() => {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 400);
            }
        }, delay);
    }
    
    // 获取默认标题
    function getDefaultTitle(type) {
        const titles = {
            success: '成功',
            error: '错误',
            info: '提示',
            warning: '警告'
        };
        return titles[type] || '提示';
    }
    
    // 验证IP地址或主机名
    function validateHostAddress(address) {
        const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        const hostnamePattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return ipPattern.test(address) || hostnamePattern.test(address);
    }
    
    // 验证端口
    function validatePort(port) {
        const p = parseInt(port, 10);
        return p >= 1 && p <= 65535;
    }
    
    // 显示确认对话框
    function showConfirm(message, options = {}) {
        return new Promise((resolve) => {
            const {
                title = '确认',
                confirmText = '确定',
                cancelText = '取消',
                type = 'warning'
            } = options;
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center modal-backdrop-enter';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform scale-in overflow-hidden">
                    <div class="p-6">
                        <div class="flex items-start gap-4">
                            <div class="w-12 h-12 rounded-full ${type === 'warning' ? 'bg-amber-100' : type === 'danger' ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0">
                                <i class="fas ${type === 'warning' ? 'fa-exclamation' : type === 'danger' ? 'fa-trash' : 'fa-question'} ${type === 'warning' ? 'text-amber-600' : type === 'danger' ? 'text-red-600' : 'text-blue-600'} text-xl"></i>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
                                <p class="text-gray-600">${message}</p>
                            </div>
                        </div>
                    </div>
                    <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                        <button class="cancel-btn px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-200">
                            ${cancelText}
                        </button>
                        <button class="confirm-btn px-4 py-2 ${type === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            
            confirmBtn.addEventListener('click', () => {
                modal.classList.add('modal-backdrop-exit');
                setTimeout(() => {
                    modal.remove();
                    resolve(true);
                }, 300);
            });
            
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('modal-backdrop-exit');
                setTimeout(() => {
                    modal.remove();
                    resolve(false);
                }, 300);
            });
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cancelBtn.click();
                }
            });
            
            // ESC 关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }
    
    // 显示加载遮罩
    function showLoading(message = '加载中...') {
        const loader = document.createElement('div');
        loader.className = 'fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center';
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="relative">
                <div class="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <i class="fas fa-server text-blue-600 text-lg"></i>
                </div>
            </div>
            <p class="mt-4 text-gray-600 font-medium">${message}</p>
        `;
        document.body.appendChild(loader);
        
        return {
            close: () => {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 300);
            },
            updateMessage: (newMessage) => {
                const p = loader.querySelector('p');
                if (p) p.textContent = newMessage;
            }
        };
    }
    
    // 创建骨架屏
    function createSkeleton(type = 'card', count = 1) {
        const container = document.createElement('div');
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-item';
            
            if (type === 'card') {
                skeleton.innerHTML = `
                    <div class="bg-white rounded-xl p-4 border border-gray-100">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="skeleton w-12 h-12 rounded-lg"></div>
                            <div class="flex-1">
                                <div class="skeleton w-32 h-4 rounded mb-2"></div>
                                <div class="skeleton w-24 h-3 rounded"></div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <div class="skeleton w-full h-3 rounded"></div>
                            <div class="skeleton w-3/4 h-3 rounded"></div>
                        </div>
                    </div>
                `;
            } else if (type === 'text') {
                skeleton.innerHTML = `
                    <div class="skeleton w-full h-4 rounded mb-2"></div>
                `;
            } else if (type === 'avatar') {
                skeleton.innerHTML = `
                    <div class="skeleton w-10 h-10 rounded-full"></div>
                `;
            }
            
            container.appendChild(skeleton);
        }
        
        return container;
    }
    
    // 平滑滚动到元素
    function scrollToElement(element, offset = 80) {
        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
            top,
            behavior: 'smooth'
        });
    }
    
    // 检测元素是否在视口内
    function isInViewport(element, threshold = 0) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= -threshold &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // 导出
    return {
        generateId,
        debounce,
        throttle,
        formatDate,
        formatRelativeTime,
        copyToClipboard,
        showNotification,
        closeToast,
        showConfirm,
        showLoading,
        createSkeleton,
        scrollToElement,
        isInViewport,
        validateHostAddress,
        validatePort
    };
})();
