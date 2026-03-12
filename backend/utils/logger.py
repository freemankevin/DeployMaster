"""
日志工具模块
提供统一的日志配置和管理
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


# 日志颜色代码
class LogColors:
    """终端日志颜色"""
    RESET = '\033[0m'
    RED = '\033[91m'      # ERROR
    YELLOW = '\033[93m'   # WARNING
    GREEN = '\033[92m'    # INFO
    CYAN = '\033[96m'     # DEBUG
    BLUE = '\033[94m'     # 其他
    BOLD = '\033[1m'


class ColoredFormatter(logging.Formatter):
    """带颜色的日志格式化器"""
    
    LEVEL_COLORS = {
        'DEBUG': LogColors.CYAN,
        'INFO': LogColors.GREEN,
        'WARNING': LogColors.YELLOW,
        'ERROR': LogColors.RED,
        'CRITICAL': LogColors.RED + LogColors.BOLD,
    }
    
    def format(self, record):
        # 获取颜色
        color = self.LEVEL_COLORS.get(record.levelname, LogColors.RESET)
        
        # 格式化时间
        record.asctime = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 构建日志前缀
        level_display = f"{color}{record.levelname:8s}{LogColors.RESET}"
        
        # 模块名简化（只取最后两部分）
        module_parts = record.name.split('.')
        if len(module_parts) > 2:
            module_display = '.'.join(module_parts[-2:])
        else:
            module_display = record.name
        
        # 构建完整日志行
        log_line = f"{LogColors.BLUE}[{record.asctime}]{LogColors.RESET} {level_display} {LogColors.CYAN}[{module_display}]{LogColors.RESET} {record.getMessage()}"
        
        # 添加异常信息
        if record.exc_info:
            log_line += '\n' + self.formatException(record.exc_info)
        
        return log_line


class UTF8StreamHandler(logging.StreamHandler):
    """支持 UTF-8 编码的流处理器"""
    
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            if hasattr(stream, 'buffer'):
                stream.buffer.write((msg + self.terminator).encode('utf-8', errors='replace'))
                stream.flush()
            else:
                stream.write(msg + self.terminator)
                stream.flush()
        except Exception:
            self.handleError(record)


# 全局日志配置标志
_loggers_configured = False


def configure_logging(level: int = logging.INFO, log_file: Optional[str] = None):
    """
    配置全局日志设置
    
    Args:
        level: 日志级别
        log_file: 日志文件路径（可选）
    """
    global _loggers_configured
    
    if _loggers_configured:
        return
    
    # 配置根日志记录器
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # 清除现有处理器
    root_logger.handlers.clear()
    
    # 控制台处理器
    console_handler = UTF8StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(ColoredFormatter())
    root_logger.addHandler(console_handler)
    
    # 文件处理器（如果指定）
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        root_logger.addHandler(file_handler)
    
    # 降低第三方库的日志级别
    logging.getLogger('paramiko').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    
    _loggers_configured = True


def get_logger(name: str, level: Optional[int] = None) -> logging.Logger:
    """
    获取配置好的日志记录器
    
    Args:
        name: 日志记录器名称
        level: 可选的日志级别
    
    Returns:
        配置好的 Logger 实例
    """
    # 确保全局日志已配置
    if not _loggers_configured:
        configure_logging()
    
    logger = logging.getLogger(name)
    
    if level is not None:
        logger.setLevel(level)
    
    return logger


class APILogger:
    """API 请求日志记录器"""
    
    def __init__(self, logger_name: str = 'api'):
        self.logger = get_logger(logger_name)
    
    def log_request(self, method: str, path: str, params: Optional[dict] = None, body: Optional[dict] = None):
        """记录 API 请求"""
        msg = f"→ {method} {path}"
        if params:
            msg += f" | params: {params}"
        if body:
            # 隐藏敏感信息
            safe_body = self._sanitize_body(body)
            msg += f" | body: {safe_body}"
        self.logger.info(msg)
    
    def log_response(self, method: str, path: str, status_code: int, duration_ms: float):
        """记录 API 响应"""
        status_emoji = "✓" if 200 <= status_code < 300 else "✗"
        self.logger.info(f"← {method} {path} | {status_code} | {duration_ms:.1f}ms {status_emoji}")
    
    def log_error(self, method: str, path: str, error: Exception):
        """记录 API 错误"""
        self.logger.error(f"✗ {method} {path} | Error: {type(error).__name__}: {str(error)}")
    
    def _sanitize_body(self, body: dict) -> dict:
        """隐藏敏感信息"""
        sensitive_keys = {'password', 'private_key', 'key_passphrase', 'token', 'secret'}
        sanitized = {}
        for key, value in body.items():
            if key.lower() in sensitive_keys:
                sanitized[key] = '***'
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_body(value)
            else:
                sanitized[key] = value
        return sanitized


# 创建全局 API 日志记录器
api_logger = APILogger()
