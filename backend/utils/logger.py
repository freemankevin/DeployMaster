"""
日志工具模块
"""

import logging
import sys
from pathlib import Path


class UTF8StreamHandler(logging.StreamHandler):
    """支持 UTF-8 编码的流处理器，用于处理中文字符"""
    
    def emit(self, record):
        """重写 emit 方法以处理编码问题"""
        try:
            msg = self.format(record)
            # 尝试使用 UTF-8 编码输出
            stream = self.stream
            if hasattr(stream, 'buffer'):
                # 对于支持 buffer 的流，使用 UTF-8 编码写入
                stream.buffer.write((msg + self.terminator).encode('utf-8', errors='replace'))
                stream.flush()
            else:
                # 否则使用 replace 错误处理
                stream.write(msg + self.terminator)
                stream.flush()
        except Exception:
            self.handleError(record)


def get_logger(name: str) -> logging.Logger:
    """获取配置好的日志记录器"""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        
        # 控制台处理器（使用 UTF-8 编码）
        console_handler = UTF8StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        
        # 格式化
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
    
    return logger
