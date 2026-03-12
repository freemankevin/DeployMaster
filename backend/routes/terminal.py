"""
终端路由 (FastAPI 版本)
处理终端连接
"""

from fastapi import APIRouter, HTTPException
from fastapi.websockets import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import asyncio
import json

from database.db_manager import db_manager
from services.ssh_service import SSHService
from models.schemas import MessageResponse
from utils.logger import get_logger

logger = get_logger(__name__)

# 创建路由器
router = APIRouter(prefix="/terminal", tags=["terminal"])


class TabCompletionRequest(BaseModel):
    """Tab 补全请求"""
    command: str
    cursor_position: int = 0


class TabCompletionResponse(BaseModel):
    """Tab 补全响应"""
    success: bool
    completions: list[str]
    common_prefix: str = ""
    message: str = ""


@router.post("/{host_id}/connect", response_model=MessageResponse)
async def connect_terminal(host_id: int):
    """连接终端"""
    logger.info(f"→ POST /api/terminal/{host_id}/connect")
    try:
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"主机不存在: host_id={host_id}")
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 获取终端会话
        channel = SSHService.get_terminal_session(host)
        
        if channel:
            logger.info(f"← POST /api/terminal/{host_id}/connect | 200 | 终端连接成功")
            return MessageResponse(success=True, message="终端连接成功")
        else:
            logger.error(f"← POST /api/terminal/{host_id}/connect | 500 | 无法建立终端连接")
            raise HTTPException(status_code=500, detail="无法建立终端连接")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/terminal/{host_id}/connect | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{host_id}/disconnect", response_model=MessageResponse)
async def disconnect_terminal(host_id: int):
    """断开终端连接"""
    logger.info(f"→ POST /api/terminal/{host_id}/disconnect")
    try:
        SSHService.disconnect_host(host_id)
        logger.info(f"← POST /api/terminal/{host_id}/disconnect | 200 | 终端已断开")
        return MessageResponse(success=True, message="终端已断开")
    except Exception as e:
        logger.error(f"✗ POST /api/terminal/{host_id}/disconnect | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{host_id}/complete", response_model=TabCompletionResponse)
async def tab_completion(host_id: int, request: TabCompletionRequest):
    """Tab 补全 - 通过 SSH 在远程服务器上执行补全"""
    logger.info(f"→ POST /api/terminal/{host_id}/complete | command={request.command[:20]}...")
    try:
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"主机不存在: host_id={host_id}")
            raise HTTPException(status_code=404, detail="主机不存在")
        
        command = request.command
        cursor_pos = request.cursor_position if request.cursor_position > 0 else len(command)
        
        # 获取当前输入的部分（光标前的内容）
        current_input = command[:cursor_pos]
        
        # 使用 compgen 命令在远程服务器上获取补全建议
        completions = []
        common_prefix = ""
        
        try:
            # 构建补全命令
            if ' ' in current_input:
                parts = current_input.rsplit(' ', 1)
                if len(parts) == 2:
                    partial = parts[1]
                    compgen_cmd = f'compgen -o bashdefault -o default -A file -- "{partial}" 2>/dev/null || echo ""'
                else:
                    compgen_cmd = f'compgen -c -- "{current_input}" 2>/dev/null || echo ""'
            else:
                compgen_cmd = f'compgen -c -- "{current_input}" 2>/dev/null || compgen -b -- "{current_input}" 2>/dev/null || echo ""'
            
            # 执行补全命令
            result = SSHService.execute_on_host(host, compgen_cmd)
            
            if result['success']:
                output = result['stdout'].strip()
                if output:
                    completions = [line.strip() for line in output.split('\n') if line.strip()]
                    
                    # 去重并保持顺序
                    seen = set()
                    unique_completions = []
                    for comp in completions:
                        if comp not in seen:
                            seen.add(comp)
                            unique_completions.append(comp)
                    completions = unique_completions
                    
                    # 计算公共前缀
                    if completions:
                        common_prefix = completions[0]
                        for comp in completions[1:]:
                            i = 0
                            while i < len(common_prefix) and i < len(comp) and common_prefix[i] == comp[i]:
                                i += 1
                            common_prefix = common_prefix[:i]
                            if not common_prefix:
                                break
            
            # 如果没有找到补全，尝试使用 ls 进行路径补全
            if not completions and ('/' in current_input or current_input.startswith('~')):
                dir_path = current_input.rsplit('/', 1)[0] if '/' in current_input else '.'
                file_prefix = current_input.rsplit('/', 1)[1] if '/' in current_input else current_input
                
                if dir_path == '':
                    dir_path = '/'
                
                ls_cmd = f'ls -d {dir_path}/{file_prefix}* 2>/dev/null || echo ""'
                result = SSHService.execute_on_host(host, ls_cmd)
                
                if result['success'] and result['stdout'].strip():
                    completions = [line.strip() for line in result['stdout'].strip().split('\n') if line.strip()]
                    if completions:
                        common_prefix = completions[0]
        
        except Exception as e:
            logger.warning(f"补全命令执行失败: {e}")
        
        logger.info(f"← POST /api/terminal/{host_id}/complete | 200 | {len(completions)} 个补全建议")
        return TabCompletionResponse(
            success=True,
            completions=completions,
            common_prefix=common_prefix,
            message="补全成功" if completions else "无补全建议"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/terminal/{host_id}/complete | Error: {e}")
        return TabCompletionResponse(
            success=False,
            completions=[],
            common_prefix="",
            message=str(e)
        )


@router.websocket("/ws/{host_id}")
async def websocket_terminal(websocket: WebSocket, host_id: int):
    """WebSocket 终端连接"""
    logger.info(f"[WS] 收到 WebSocket 连接请求: host_id={host_id}")
    
    try:
        await websocket.accept()
        logger.info(f"[WS] WebSocket 已接受: host_id={host_id}")
    except Exception as e:
        logger.error(f"[WS] WebSocket 接受失败: {e}")
        return
    
    host = db_manager.get_host(host_id)
    if not host:
        logger.error(f"[WS] 主机不存在: host_id={host_id}")
        try:
            await websocket.send_text(json.dumps({"error": "主机不存在"}))
            await websocket.close()
        except:
            pass
        return
    
    channel = None
    ssh_conn = None
    connection_active = True
    
    try:
        # 建立 SSH 连接
        from services.ssh_service import SSHConnection, SSHConnectionConfig
        
        host_addr = host['address']
        host_port = host.get('port', 22)
        logger.info(f"[WS] 正在建立 SSH 连接: {host['name']} ({host_addr}:{host_port})")
        
        config = SSHConnectionConfig(
            host=host_addr,
            port=host_port,
            username=host['username'],
            password=host.get('password'),
            private_key=host.get('private_key'),
            key_passphrase=host.get('key_passphrase')
        )
        
        ssh_conn = SSHConnection(config)
        if not ssh_conn.connect():
            error_msg = f"无法建立SSH连接: {ssh_conn.last_error}"
            logger.error(f"[WS] {error_msg}")
            try:
                await websocket.send_text(json.dumps({"error": error_msg}))
                await websocket.close()
            except:
                pass
            return
        
        logger.info(f"[WS] SSH 连接成功，正在获取 shell...")
        channel = ssh_conn.get_shell()
        if not channel:
            logger.error(f"[WS] 无法打开终端会话")
            try:
                await websocket.send_text(json.dumps({"error": "无法打开终端会话"}))
                await websocket.close()
            except:
                pass
            return
        
        # 设置终端大小
        channel.resize_pty(width=80, height=24)
        
        # 发送连接成功消息
        logger.info(f"[WS] 终端会话已建立: {host['name']}")
        try:
            await websocket.send_text(json.dumps({
                "type": "connected",
                "message": f"已连接到 {host['name']}"
            }))
        except Exception as e:
            logger.error(f"[WS] 发送连接消息失败: {e}")
            return
        
        # 发送换行触发提示符
        await asyncio.sleep(0.1)
        channel.send(b'\r')
        
        async def read_from_ssh():
            """从 SSH 读取数据并发送到 WebSocket"""
            nonlocal connection_active
            while connection_active:
                try:
                    if channel and channel.recv_ready():
                        data = channel.recv(4096)
                        if data:
                            try:
                                await websocket.send_text(json.dumps({
                                    "type": "data",
                                    "data": data.decode('utf-8', errors='replace')
                                }))
                            except Exception as e:
                                logger.debug(f"[WS] 发送数据失败，连接可能已关闭: {e}")
                                connection_active = False
                                break
                    await asyncio.sleep(0.01)
                except Exception as e:
                    logger.debug(f"[WS] 读取 SSH 数据错误: {e}")
                    connection_active = False
                    break
        
        async def write_to_ssh():
            """从 WebSocket 接收数据并发送到 SSH"""
            nonlocal connection_active
            while connection_active:
                try:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    if message.get("type") == "data":
                        command = message.get("data", "")
                        if channel:
                            channel.send(command.encode('utf-8'))
                    elif message.get("type") == "resize":
                        cols = message.get("cols", 80)
                        rows = message.get("rows", 24)
                        if channel:
                            channel.resize_pty(width=cols, height=rows)
                    
                except WebSocketDisconnect:
                    logger.info(f"[WS] 客户端断开连接: host_id={host_id}")
                    connection_active = False
                    break
                except Exception as e:
                    logger.debug(f"[WS] 接收数据错误: {e}")
                    connection_active = False
                    break
        
        # 并行运行读写任务
        await asyncio.gather(read_from_ssh(), write_to_ssh())
        
    except WebSocketDisconnect:
        logger.info(f"[WS] WebSocket 断开: host_id={host_id}")
    except Exception as e:
        logger.error(f"[WS] WebSocket 错误: {e}")
    finally:
        connection_active = False
        if channel:
            try:
                channel.close()
            except:
                pass
        if ssh_conn:
            try:
                ssh_conn.close()
            except:
                pass
        logger.info(f"[WS] 终端会话已关闭: {host['name']} (host_id={host_id})")
