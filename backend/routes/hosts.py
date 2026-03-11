"""
主机管理路由 (FastAPI 版本)
处理 SSH 主机的 CRUD 操作
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional

from database.db_manager import db_manager
from services.ssh_service import SSHService
from models.schemas import (
    HostCreate, HostUpdate, HostResponse, HostListResponse,
    HostSingleResponse, MessageResponse, CommandExecute,
    CommandResult, ConnectionTestResult, StatsResponse, HostStats
)
from utils.logger import get_logger

logger = get_logger(__name__)

# 创建路由器
router = APIRouter(prefix="/hosts", tags=["hosts"])


@router.get("", response_model=HostListResponse)
async def get_hosts():
    """获取所有主机"""
    try:
        hosts = db_manager.get_all_hosts()
        return HostListResponse(data=hosts)
    except Exception as e:
        logger.error(f"获取主机列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """获取主机统计信息"""
    try:
        stats = db_manager.get_host_stats()
        return StatsResponse(data=HostStats(**stats))
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=HostListResponse)
async def search_hosts(q: str = Query(default="", description="搜索关键词")):
    """搜索主机"""
    try:
        hosts = db_manager.search_hosts(q)
        return HostListResponse(data=hosts)
    except Exception as e:
        logger.error(f"搜索主机失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{host_id}", response_model=HostSingleResponse)
async def get_host(host_id: int):
    """获取单个主机"""
    try:
        host = db_manager.get_host(host_id)
        if not host:
            raise HTTPException(status_code=404, detail="主机不存在")
        return HostSingleResponse(data=host)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取主机失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=HostSingleResponse, status_code=201)
async def add_host(host_data: HostCreate):
    """添加新主机"""
    try:
        # 验证认证信息
        if host_data.auth_type == "password" and not host_data.password:
            raise HTTPException(status_code=400, detail="密码认证需要提供密码")
        elif host_data.auth_type == "key" and not host_data.private_key:
            raise HTTPException(status_code=400, detail="密钥认证需要提供私钥")

        # 添加主机
        host_dict = host_data.model_dump(exclude_none=True)
        host_id = db_manager.add_host(host_dict)
        host = db_manager.get_host(host_id)

        # 自动测试连接并获取系统信息
        if host:
            try:
                logger.info(f"正在自动测试新主机 {host['name']} 的连接...")
                result = SSHService.test_connection(host)
                if result['success']:
                    system_info = result.get('system_info', {})
                    logger.info(f"连接成功，获取到系统信息: {system_info}")

                    # 更新主机系统信息
                    update_data = {
                        'status': 'connected',
                        'last_seen': datetime.now().isoformat(),
                        'system_type': system_info.get('os', 'Unknown'),
                        'os_key': system_info.get('os_key', 'unknown'),
                    }

                    # 只在有值时才更新这些字段
                    if system_info.get('kernel_version'):
                        update_data['kernel_version'] = system_info['kernel_version']
                    if system_info.get('architecture'):
                        update_data['architecture'] = system_info['architecture']
                    if system_info.get('cpu_cores') is not None:
                        update_data['cpu_cores'] = system_info['cpu_cores']
                    if system_info.get('memory_gb') is not None:
                        update_data['memory_gb'] = system_info['memory_gb']

                    db_manager.update_host(host_id, update_data)
                    # 重新获取更新后的主机信息
                    host = db_manager.get_host(host_id)
                else:
                    logger.warning(f"自动测试连接失败: {result.get('message', '未知错误')}")
                    db_manager.update_host(host_id, {'status': 'disconnected'})
                    host = db_manager.get_host(host_id)
            except Exception as conn_err:
                logger.error(f"自动测试连接时出错: {conn_err}")
                db_manager.update_host(host_id, {'status': 'disconnected'})
                host = db_manager.get_host(host_id)

        return HostSingleResponse(
            success=True,
            message="主机添加成功",
            data=host
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加主机失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{host_id}", response_model=HostSingleResponse)
async def update_host(host_id: int, host_data: HostUpdate):
    """更新主机信息"""
    try:
        # 检查主机是否存在
        host = db_manager.get_host(host_id)
        if not host:
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 更新主机
        updates = host_data.model_dump(exclude_none=True)
        success = db_manager.update_host(host_id, updates)
        
        if success:
            updated_host = db_manager.get_host(host_id)
            return HostSingleResponse(
                success=True,
                message="主机更新成功",
                data=updated_host
            )
        else:
            raise HTTPException(status_code=400, detail="更新失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新主机失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{host_id}", response_model=MessageResponse)
async def delete_host(host_id: int):
    """删除主机"""
    try:
        # 检查主机是否存在
        host = db_manager.get_host(host_id)
        if not host:
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 断开连接
        from services.ssh_service import connection_pool
        connection_pool.close_connection(host_id)
        
        # 删除主机
        success = db_manager.delete_host(host_id)
        if success:
            return MessageResponse(success=True, message="主机删除成功")
        else:
            raise HTTPException(status_code=400, detail="删除失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除主机失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{host_id}/test", response_model=ConnectionTestResult)
async def test_connection(host_id: int):
    """测试 SSH 连接"""
    try:
        host = db_manager.get_host(host_id)
        if not host:
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 测试连接
        result = SSHService.test_connection(host)
        
        # 更新主机状态
        if result['success']:
            system_info = result.get('system_info', {})
            logger.info(f"测试连接成功，系统信息: {system_info}")
            
            # 构建更新数据，过滤掉 None 值以保留数据库中的旧值
            update_data = {
                'status': 'connected',
                'last_seen': datetime.now().isoformat(),
                'system_type': system_info.get('os', 'Unknown'),
                'os_key': system_info.get('os_key', 'unknown'),
            }
            
            # 只在有值时才更新这些字段
            if system_info.get('kernel_version'):
                update_data['kernel_version'] = system_info['kernel_version']
            if system_info.get('architecture'):
                update_data['architecture'] = system_info['architecture']
            if system_info.get('cpu_cores') is not None:
                update_data['cpu_cores'] = system_info['cpu_cores']
            if system_info.get('memory_gb') is not None:
                update_data['memory_gb'] = system_info['memory_gb']
            
            logger.info(f"更新主机数据: {update_data}")
            db_manager.update_host(host_id, update_data)
        else:
            db_manager.update_host(host_id, {
                'status': 'disconnected'
            })
        
        return ConnectionTestResult(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"测试连接失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{host_id}/execute", response_model=CommandResult)
async def execute_command(host_id: int, command_data: CommandExecute):
    """在主机上执行命令"""
    try:
        host = db_manager.get_host(host_id)
        if not host:
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 执行命令
        result = SSHService.execute_on_host(host, command_data.command)
        
        # 记录部署历史
        db_manager.add_deployment_record({
            'host_id': host_id,
            'action': f'执行命令: {command_data.command}',
            'status': 'success' if result['success'] else 'failed',
            'output': result.get('stdout', ''),
            'error_message': result.get('stderr', '')
        })
        
        return CommandResult(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行命令失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
