#!/usr/bin/env python3
"""
DeployMaster - SSH 管理模块主入口 (FastAPI 版本)
自动化部署平台后端服务
"""

import os
import sys
import argparse
from pathlib import Path
from contextlib import asynccontextmanager

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from database.db_manager import db_manager
from routes import hosts_router, keys_router, terminal_router
from utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("正在启动 DeployMaster 服务...")
    hosts = db_manager.get_all_hosts()
    logger.info(f"数据库已加载，当前有 {len(hosts)} 个主机记录")
    
    yield
    
    # 关闭时
    logger.info("正在关闭服务...")


def create_app() -> FastAPI:
    """创建 FastAPI 应用实例"""
    app = FastAPI(
        title="DeployMaster API",
        description="DeployMaster SSH 管理模块 API 接口",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # 配置 CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 注册路由
    app.include_router(hosts_router, prefix="/api")
    app.include_router(keys_router, prefix="/api")
    app.include_router(terminal_router, prefix="/api")
    
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
        logger.error(f"未处理的异常: {exc}")
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
    
    args = parser.parse_args()
    
    # 初始化数据库
    if args.init_db:
        logger.info("正在初始化数据库...")
        hosts = db_manager.get_all_hosts()
        logger.info(f"数据库已初始化，当前有 {len(hosts)} 个主机记录")
        return
    
    # 启动服务
    try:
        logger.info(f"服务器地址: http://{args.host}:{args.port}")
        uvicorn.run(
            "main:app",
            host=args.host,
            port=args.port,
            reload=args.reload
        )
    except KeyboardInterrupt:
        logger.info("服务已停止")
    except Exception as e:
        logger.error(f"服务启动失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
