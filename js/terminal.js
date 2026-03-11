// 终端模拟器
const Terminal = (function() {
    let currentHost = null;
    let commandHistory = [];
    let historyIndex = -1;
    let currentInput = '';
    
    // 可用命令
    const commands = {
        'help': '显示可用命令列表',
        'ls': '列出当前目录内容',
        'pwd': '显示当前工作目录',
        'whoami': '显示当前用户',
        'date': '显示当前日期时间',
        'echo': '回显参数',
        'clear': '清除终端屏幕',
        'ping': '模拟 ping 命令',
        'ssh': '连接到其他主机（模拟）',
        'top': '显示系统进程（模拟）',
        'exit': '退出终端'
    };
    
    // 初始化
    function init(host) {
        currentHost = host;
        commandHistory = [];
        historyIndex = -1;
        
        // 清空终端内容
        const content = document.getElementById('terminalContent');
        content.innerHTML = '';
        
        // 显示欢迎信息
        addOutput(`<div class="text-slate-500">连接到 ${host.name} (${host.address})</div>`);
        addOutput(`<div class="text-slate-500">使用 'help' 查看可用命令</div>`);
        addOutput(`<div class="text-slate-500">Last login: ${new Date().toLocaleString('zh-CN')}</div>`);
        showPrompt();
        
        // 绑定事件
        const input = document.getElementById('terminalInput');
        input.addEventListener('keydown', handleTerminalKeydown);
        input.focus();
    }
    
    // 处理终端按键
    function handleTerminalKeydown(e) {
        const input = e.target;
        
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                executeCommand(input.value.trim());
                input.value = '';
                historyIndex = -1;
                currentInput = '';
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (commandHistory.length > 0) {
                    if (historyIndex < commandHistory.length - 1) {
                        historyIndex++;
                        input.value = commandHistory[historyIndex];
                    } else if (historyIndex === -1) {
                        currentInput = input.value;
                        historyIndex = 0;
                        input.value = commandHistory[0];
                    }
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    input.value = commandHistory[historyIndex];
                } else if (historyIndex === 0) {
                    historyIndex = -1;
                    input.value = currentInput;
                }
                break;
            case 'Tab':
                e.preventDefault();
                // 简单的自动补全（此处省略）
                break;
        }
    }
    
    // 执行命令
    function executeCommand(cmd) {
        if (!cmd) {
            showPrompt();
            return;
        }
        
        // 添加到历史记录
        commandHistory.unshift(cmd);
        if (commandHistory.length > 50) commandHistory.pop();
        
        // 显示命令
        addOutput(`<span class="text-green-400">${currentHost.username}@${currentHost.name}</span>:<span class="text-blue-400">~</span>$ ${cmd}`);
        
        // 处理命令
        const args = cmd.split(' ');
        const baseCmd = args[0].toLowerCase();
        
        let output = '';
        switch (baseCmd) {
            case 'help':
                output = '<div class="space-y-1">';
                for (const [cmd, desc] of Object.entries(commands)) {
                    output += `<div><span class="text-cyan-400">${cmd.padEnd(10)}</span> - ${desc}</div>`;
                }
                output += '</div>';
                break;
            case 'ls':
                output = 'nginx.conf  app.log  deploy.sh  src/  docs/  README.md';
                break;
            case 'pwd':
                output = `/home/${currentHost.username}`;
                break;
            case 'whoami':
                output = currentHost.username;
                break;
            case 'date':
                output = new Date().toLocaleString('zh-CN');
                break;
            case 'echo':
                output = args.slice(1).join(' ');
                break;
            case 'clear':
                document.getElementById('terminalContent').innerHTML = '';
                return;
            case 'ping':
                output = `PING google.com (8.8.8.8) 56(84) bytes of data.<br>
64 bytes from 8.8.8.8: icmp_seq=1 ttl=117 time=15.3 ms<br>
64 bytes from 8.8.8.8: icmp_seq=2 ttl=117 time=14.8 ms<br>
--- google.com ping statistics ---<br>
2 packets transmitted, 2 received, 0% packet loss, time 1001ms`;
                break;
            case 'ssh':
                output = '模拟 SSH 连接功能，请使用主界面进行连接。';
                break;
            case 'top':
                output = `top - 15:30:21 up 10 days,  2:15,  1 user,  load average: 0.08, 0.03, 0.01<br>
Tasks: 125 total,   1 running, 124 sleeping,   0 stopped,   0 zombie<br>
%Cpu(s):  0.3 us,  0.2 sy,  0.0 ni, 99.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st<br>
MiB Mem :   3940.2 total,    102.4 free,   2500.8 used,   1337.0 buff/cache<br>
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   1200.2 avail Mem`;
                break;
            case 'exit':
                addOutput('<span class="text-slate-500">断开连接...</span>');
                setTimeout(() => {
                    document.getElementById('terminalModal').classList.add('hidden');
                    document.getElementById('terminalModal').classList.remove('flex');
                }, 500);
                return;
            default:
                output = `<span class="text-amber-400">${baseCmd}: 命令未找到。输入 'help' 查看可用命令。</span>`;
        }
        
        addOutput(output);
        showPrompt();
        
        // 滚动到底部
        const content = document.getElementById('terminalContent');
        content.scrollTop = content.scrollHeight;
    }
    
    // 显示提示符
    function showPrompt() {
        const content = document.getElementById('terminalContent');
        const prompt = document.createElement('div');
        prompt.className = 'flex items-center';
        prompt.innerHTML = `
            <span class="text-green-400">${currentHost.username}@${currentHost.name}</span>:<span class="text-blue-400">~</span>$ 
            <span class="ml-1 cursor-blink">_</span>
        `;
        content.appendChild(prompt);
        content.scrollTop = content.scrollHeight;
    }
    
    // 添加输出
    function addOutput(html) {
        const content = document.getElementById('terminalContent');
        const div = document.createElement('div');
        div.className = 'mb-2';
        div.innerHTML = html;
        content.appendChild(div);
    }
    
    // 公开方法
    return {
        init,
        executeCommand
    };
})();