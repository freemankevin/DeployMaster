"""
路由模块初始化
导出所有 FastAPI 路由
"""

from routes.hosts import router as hosts_router
from routes.keys import router as keys_router
from routes.terminal import router as terminal_router

__all__ = ['hosts_router', 'keys_router', 'terminal_router']
