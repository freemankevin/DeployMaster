#!/usr/bin/env python3
"""
DeployMaster - SSH 管理模块主入口 (FastAPI 版本)
自动化部署平台后端服务
"""

import os
import sys
import argparse
import subprocess
import signal
import time
import json
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

from database.db_manager import db_manager
from routes import hosts_router, keys_router, terminal_router, sftp_router
from utils.logger import get_logger, configure_logging, api_logger

# 配置日志
configure_logging(level=20)  # INFO level

logger = get_logger(__name__)


def kill_existing_process(port: int = 5001) -> None:
    """清理占用指定端口的旧进程"""
    try:
        if sys.platform == 'win32':
            # Windows 系统
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            lines = result.stdout.split('\n')
            pids_to_kill = set()
            
            for line in lines:
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        pid = parts[-1]
                        if pid.isdigit():
                            pids_to_kill.add(pid)
            
            for pid in pids_to_kill:
                try:
                    subprocess.run(
                        ['taskkill', '/F', '/PID', pid],
                        capture_output=True,
                        check=False
                    )
                    logger.info(f"已终止旧进程 (PID: {pid})")
                except Exception:
                    pass
        else:
            # Linux/Mac 系统
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid.isdigit():
                        try:
                            os.kill(int(pid), signal.SIGTERM)
                            logger.info(f"已终止旧进程 (PID: {pid})")
                        except ProcessLookupError:
                            pass
                        except Exception:
                            pass
    except Exception as e:
        logger.warning(f"清理旧进程时出错: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("=" * 60)
    logger.info("DeployMaster 服务启动中...")
    logger.info("=" * 60)
    hosts = db_manager.get_all_hosts()
    logger.info(f"数据库已加载，当前有 {len(hosts)} 个主机记录")
    
    yield
    
    # 关闭时
    logger.info("DeployMaster 服务正在关闭...")


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例"""
    # 设置大文件上传限制 - 通过自定义请求体限制
    # FastAPI/Starlette 默认不限制请求体大小，但需要确保内存足够
    app = FastAPI(
        title="DeployMaster API",
        description="DeployMaster SSH 管理模块 API 接口",
        version="1.0.0",
        lifespan=lifespan,
        # 大文件上传不需要严格的请求体大小限制
    )
    
    # 配置 CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # API 请求日志中间件
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # 排除 WebSocket 请求
        if request.url.path.startswith('/api/terminal/ws'):
            return await call_next(request)
        
        # 记录请求
        start_time = time.time()
        
        # 获取请求体（仅对 POST/PUT/PATCH，且排除文件上传等大请求）
        body = None
        body_bytes = None
        content_type = request.headers.get('content-type', '')
        
        # 排除 multipart/form-data（文件上传）和大的请求体
        is_file_upload = 'multipart/form-data' in content_type
        content_length = int(request.headers.get('content-length', 0))
        max_log_body_size = 10 * 1024  # 只记录小于 10KB 的请求体
        
        if request.method in ['POST', 'PUT', 'PATCH'] and not is_file_upload and content_length < max_log_body_size:
            try:
                # 读取 body 用于日志记录
                body_bytes = await request.body()
                if body_bytes:
                    try:
                        body = json.loads(body_bytes)
                    except:
                        body = None
            except:
                pass
        
        # 记录请求日志
        if is_file_upload:
            # 文件上传只记录基本信息
            api_logger.log_request(
                request.method,
                request.url.path,
                params=dict(request.query_params) if request.query_params else None,
                body={'file_upload': True, 'content_length': content_length}
            )
        else:
            api_logger.log_request(
                request.method,
                request.url.path,
                params=dict(request.query_params) if request.query_params else None,
                body=body
            )
        
        # 如果读取了 body，需要创建一个包装器来恢复 body 供后续使用
        if body_bytes is not None:
            # 创建一个新的 receive 函数，返回缓存的 body
            async def receive() -> dict:
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            # 替换 request 的 _receive 方法
            request._receive = receive
        
        # 执行请求
        try:
            response = await call_next(request)
            
            # 记录响应日志
            duration = (time.time() - start_time) * 1000
            api_logger.log_response(request.method, request.url.path, response.status_code, duration)
            
            return response
        except Exception as e:
            # 记录错误日志
            duration = (time.time() - start_time) * 1000
            api_logger.log_error(request.method, request.url.path, e)
            raise
    
    # 注册路由
    app.include_router(hosts_router, prefix="/api")
    app.include_router(keys_router, prefix="/api")
    app.include_router(terminal_router, prefix="/api")
    app.include_router(sftp_router, prefix="/api")
    
    # 根路径
    @app.get("/")
    async def root():
        return {"message": "DeployMaster API", "version": "1.0.0"}
    
    # 健康检查
    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}
    
    # 全局异常处理
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        logger.error(f"未处理的异常: {type(exc).__name__}: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(exc)}
        )
    
    logger.info("FastAPI 应用初始化完成")
    return app


# 创建应用实例
app = create_app()


def main():
    """主入口函数"""
    parser = argparse.ArgumentParser(description='DeployMaster 后端服务 (FastAPI)')
    parser.add_argument('--host', default='0.0.0.0', help='服务器主机地址 (默认: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=5001, help='服务器端口 (默认: 5001)')
    parser.add_argument('--reload', action='store_true', help='启用热重载模式')
    parser.add_argument('--init-db', action='store_true', help='初始化数据库')
    parser.add_argument('--no-kill', action='store_true', help='不清理旧进程')
    
    args = parser.parse_args()
    
    # 初始化数据库
    if args.init_db:
        logger.info("正在初始化数据库...")
        hosts = db_manager.get_all_hosts()
        logger.info(f"数据库已初始化，当前有 {len(hosts)} 个主机记录")
        return
    
    # 清理旧进程
    if not args.no_kill:
        kill_existing_process(args.port)
    
    # 启动服务
    try:
        logger.info(f"服务器地址: http://{args.host}:{args.port}")
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            log_level="warning",  # 降低 uvicorn 日志级别
            limit_max_requests=None,  # 不限制请求数量
            limit_concurrency=None,   # 不限制并发数
            # 大文件上传支持
            timeout_keep_alive=600,  # 保持连接 10 分钟
            # 移除默认的请求超时限制
            timeout_graceful_shutdown=30,
        )
    except KeyboardInterrupt:
        logger.info("服务已停止")
    except Exception as e:
        logger.error(f"服务启动失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
