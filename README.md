# DeployMaster

🚀 **DeployMaster** 是一个现代化的自动化部署平台，提供 SSH 主机管理、终端连接、密钥管理等功能。

## 技术栈

### 前端
- ⚛️ **React 18** - 现代化的 React 框架
- 📘 **TypeScript** - 类型安全的 JavaScript
- 🎨 **Tailwind CSS** - 实用优先的 CSS 框架
- ⚡ **Vite** - 下一代前端构建工具
- 🌐 **Axios** - HTTP 客户端
- 🎯 **Lucide React** - 精美的图标库

### 后端
- 🐍 **Python 3.8+**
- ⚡ **FastAPI** - 现代化的 Python Web 框架
- 🔐 **Paramiko** - SSH 连接库
- 🗄️ **SQLite** - 轻量级数据库
- 📝 **Pydantic** - 数据验证

## 功能特性

- ✅ SSH 主机管理 (CRUD)
- ✅ 实时终端连接
- ✅ SSH 密钥管理
- ✅ 主机状态监控
- ✅ 命令执行
- ✅ 连接测试
- ✅ 响应式设计
- ✅ 深色终端主题

## 项目结构

```
DeployMaster/
├── backend/                 # 后端代码
│   ├── main.py             # FastAPI 主入口
│   ├── requirements.txt    # Python 依赖
│   ├── database/           # 数据库管理
│   │   └── db_manager.py   # SQLite 数据库管理器
│   ├── models/             # 数据模型
│   │   └── schemas.py      # Pydantic 模型
│   ├── routes/             # API 路由
│   │   ├── hosts.py        # 主机管理路由
│   │   ├── keys.py         # 密钥管理路由
│   │   └── terminal.py     # 终端路由
│   ├── services/           # 业务服务
│   │   └── ssh_service.py  # SSH 连接服务
│   ├── utils/              # 工具函数
│   │   └── logger.py       # 日志配置
│   └── data/               # 数据库文件目录
│       └── deploymaster.db # SQLite 数据库
├── src/                    # React 前端代码
│   ├── main.tsx           # React 入口
│   ├── App.tsx            # 主应用组件
│   ├── index.css          # 全局样式
│   ├── components/        # React 组件
│   │   ├── Sidebar.tsx    # 侧边栏
│   │   ├── Header.tsx     # 顶部栏
│   │   ├── HostsGrid.tsx  # 主机网格
│   │   ├── AddHostModal.tsx # 添加主机模态框
│   │   └── TerminalModal.tsx # 终端模态框
│   ├── services/          # API 服务
│   │   └── api.ts         # Axios API 封装
│   └── types/             # TypeScript 类型
│       └── index.ts       # 类型定义
├── public/                # 静态资源
├── package.json           # npm 配置
├── vite.config.ts         # Vite 配置
├── tailwind.config.js     # Tailwind 配置
├── tsconfig.json          # TypeScript 配置
├── start.bat              # Windows 启动脚本
└── start.sh               # Linux/Mac 启动脚本
```

## 快速开始

### 前置要求

- **Node.js** >= 16.0.0
- **Python** >= 3.8
- **pip**

### 安装与运行

#### Windows
```bash
# 双击运行 start.bat 或在终端执行
.\start.bat
```

#### Linux/Mac
```bash
# 添加执行权限
chmod +x start.sh

# 运行
./start.sh
```

#### 手动启动

1. **安装后端依赖**
```bash
cd backend
pip install -r requirements.txt
```

2. **安装前端依赖**
```bash
npm install
```

3. **启动后端服务** (终端 1)
```bash
cd backend
python main.py
```

4. **启动前端开发服务器** (终端 2)
```bash
npm run dev
```

5. **访问应用**
- 前端: http://localhost:3000
- 后端 API: http://localhost:5000
- API 文档: http://localhost:5000/docs

## API 接口

### 主机管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/hosts` | 获取所有主机 |
| GET | `/api/hosts/{id}` | 获取单个主机 |
| POST | `/api/hosts` | 添加主机 |
| PUT | `/api/hosts/{id}` | 更新主机 |
| DELETE | `/api/hosts/{id}` | 删除主机 |
| POST | `/api/hosts/{id}/test` | 测试连接 |
| POST | `/api/hosts/{id}/execute` | 执行命令 |
| GET | `/api/hosts/search?q=` | 搜索主机 |
| GET | `/api/hosts/stats` | 获取统计 |

### 密钥管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/keys` | 获取所有密钥 |
| POST | `/api/keys` | 添加密钥 |
| DELETE | `/api/keys/{id}` | 删除密钥 |
| POST | `/api/keys/generate` | 生成密钥对 |

### 终端

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/terminal/{id}/connect` | 连接终端 |
| POST | `/api/terminal/{id}/disconnect` | 断开终端 |
| WebSocket | `/api/terminal/ws/{id}` | WebSocket 终端 |

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 初始化数据库
npm run init-db
```

## 环境配置

### 后端环境变量

创建 `backend/.env` 文件：

```env
DATABASE_URL=sqlite:///./data/deploymaster.db
SECRET_KEY=your-secret-key
DEBUG=false
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
