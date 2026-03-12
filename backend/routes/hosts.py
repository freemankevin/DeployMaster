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
    logger.info("→ GET /api/hosts")
    try:
        hosts = db_manager.get_all_hosts()
        logger.info(f"← GET /api/hosts | 200 | 返回 {len(hosts)} 个主机")
        return HostListResponse(data=hosts)
    except Exception as e:
        logger.error(f"✗ GET /api/hosts | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """获取主机统计信息"""
    logger.info("→ GET /api/hosts/stats")
    try:
        stats = db_manager.get_host_stats()
        logger.info(f"← GET /api/hosts/stats | 200 | {stats}")
        return StatsResponse(data=HostStats(**stats))
    except Exception as e:
        logger.error(f"✗ GET /api/hosts/stats | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=HostListResponse)
async def search_hosts(q: str = Query(default="", description="搜索关键词")):
    """搜索主机"""
    logger.info(f"→ GET /api/hosts/search | q={q}")
    try:
        hosts = db_manager.search_hosts(q)
        logger.info(f"← GET /api/hosts/search | 200 | 找到 {len(hosts)} 个主机")
        return HostListResponse(data=hosts)
    except Exception as e:
        logger.error(f"✗ GET /api/hosts/search | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{host_id}", response_model=HostSingleResponse)
async def get_host(host_id: int):
    """获取单个主机"""
    logger.info(f"→ GET /api/hosts/{host_id}")
    try:
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"← GET /api/hosts/{host_id} | 404 | 主机不存在")
            raise HTTPException(status_code=404, detail="主机不存在")
        logger.info(f"← GET /api/hosts/{host_id} | 200 | {host['name']}")
        return HostSingleResponse(data=host)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ GET /api/hosts/{host_id} | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=HostSingleResponse, status_code=201)
async def add_host(host_data: HostCreate):
    """添加新主机"""
    logger.info(f"→ POST /api/hosts | name={host_data.name}, address={host_data.address}")
    try:
        # 验证认证信息
        if host_data.auth_type == "password" and not host_data.password:
            logger.warning("← POST /api/hosts | 400 | 密码认证需要提供密码")
            raise HTTPException(status_code=400, detail="密码认证需要提供密码")
        elif host_data.auth_type == "key" and not host_data.private_key:
            logger.warning("← POST /api/hosts | 400 | 密钥认证需要提供私钥")
            raise HTTPException(status_code=400, detail="密钥认证需要提供私钥")

        # 添加主机
        host_dict = host_data.model_dump(exclude_none=True)
        host_id = db_manager.add_host(host_dict)
        host = db_manager.get_host(host_id)

        # 自动测试连接并获取系统信息
        if host:
            logger.info(f"正在自动测试新主机 {host['name']} 的连接...")
            try:
                result = SSHService.test_connection(host)
                if result['success']:
                    system_info = result.get('system_info', {})
                    logger.info(f"连接成功: {host['name']} | OS: {system_info.get('os', 'Unknown')}")

                    # 更新主机系统信息
                    update_data = {
                        'status': 'connected',
                        'last_seen': datetime.now().isoformat(),
                        'system_type': system_info.get('os', 'Unknown'),
                        'os_key': system_info.get('os_key', 'unknown'),
                    }

                    # 只在有值时才更新这些字段
                    optional_fields = [
                        ('kernel_version', 'kernel_version'),
                        ('architecture', 'architecture'),
                        ('cpu_cores', 'cpu_cores'),
                        ('memory_gb', 'memory_gb'),
                        ('os_version', 'os_version'),
                        ('system_disk_total', 'system_disk_total'),
                        ('system_disk_used', 'system_disk_used'),
                        ('data_disk_total', 'data_disk_total'),
                        ('data_disk_used', 'data_disk_used'),
                    ]
                    
                    for src_key, dst_key in optional_fields:
                        if system_info.get(src_key) is not None:
                            update_data[dst_key] = system_info[src_key]

                    db_manager.update_host(host_id, update_data)
                    host = db_manager.get_host(host_id)
                else:
                    error_msg = result.get('message', '未知错误')
                    logger.warning(f"自动测试连接失败: {host['name']} | {error_msg}")
                    db_manager.update_host(host_id, {'status': 'disconnected'})
                    host = db_manager.get_host(host_id)
            except Exception as conn_err:
                logger.error(f"自动测试连接时出错: {host['name']} | {conn_err}")
                db_manager.update_host(host_id, {'status': 'disconnected'})
                host = db_manager.get_host(host_id)

        logger.info(f"← POST /api/hosts | 201 | 主机添加成功: {host['name'] if host else 'N/A'}")
        return HostSingleResponse(
            success=True,
            message="主机添加成功",
            data=host
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/hosts | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{host_id}", response_model=HostSingleResponse)
async def update_host(host_id: int, host_data: HostUpdate):
    """更新主机信息"""
    logger.info(f"→ PUT /api/hosts/{host_id}")
    try:
        # 检查主机是否存在
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"← PUT /api/hosts/{host_id} | 404 | 主机不存在")
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 获取更新数据，排除 None 值
        updates = host_data.model_dump(exclude_none=True)
        logger.info(f"更新数据 (原始): {updates}")
        
        # 过滤掉空字符串的敏感字段（密码、私钥等），避免覆盖原值
        sensitive_fields = ['password', 'private_key', 'key_passphrase']
        for field in sensitive_fields:
            if field in updates and updates[field] == '':
                logger.info(f"删除空敏感字段: {field}")
                del updates[field]
        
        logger.info(f"更新数据 (过滤后): {updates}")
        
        # 如果没有要更新的字段，直接返回成功
        if not updates:
            logger.info(f"← PUT /api/hosts/{host_id} | 200 | 无更新数据")
            return HostSingleResponse(
                success=True,
                message="无需更新",
                data=host
            )
        
        success = db_manager.update_host(host_id, updates)
        logger.info(f"数据库更新结果: {success}")
        
        if success:
            updated_host = db_manager.get_host(host_id)
            host_name = updated_host['name'] if updated_host else 'N/A'
            logger.info(f"← PUT /api/hosts/{host_id} | 200 | 主机更新成功: {host_name}")
            return HostSingleResponse(
                success=True,
                message="主机更新成功",
                data=updated_host
            )
        else:
            logger.warning(f"← PUT /api/hosts/{host_id} | 400 | 更新失败")
            raise HTTPException(status_code=400, detail="更新失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ PUT /api/hosts/{host_id} | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{host_id}", response_model=MessageResponse)
async def delete_host(host_id: int):
    """删除主机"""
    logger.info(f"→ DELETE /api/hosts/{host_id}")
    try:
        # 检查主机是否存在
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"← DELETE /api/hosts/{host_id} | 404 | 主机不存在")
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 断开连接
        from services.ssh_service import connection_pool
        connection_pool.close_connection(host_id)
        
        # 删除主机
        success = db_manager.delete_host(host_id)
        if success:
            logger.info(f"← DELETE /api/hosts/{host_id} | 200 | 主机删除成功: {host['name']}")
            return MessageResponse(success=True, message="主机删除成功")
        else:
            logger.warning(f"← DELETE /api/hosts/{host_id} | 400 | 删除失败")
            raise HTTPException(status_code=400, detail="删除失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ DELETE /api/hosts/{host_id} | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{host_id}/test", response_model=ConnectionTestResult)
async def test_connection(host_id: int):
    """测试 SSH 连接"""
    logger.info(f"→ POST /api/hosts/{host_id}/test")
    try:
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"← POST /api/hosts/{host_id}/test | 404 | 主机不存在")
            raise HTTPException(status_code=404, detail="主机不存在")
        
        # 测试连接
        result = SSHService.test_connection(host)
        
        # 更新主机状态
        if result['success']:
            system_info = result.get('system_info', {})
            logger.info(f"连接测试成功: {host['name']} | OS: {system_info.get('os', 'Unknown')}")
            
            # 构建更新数据
            update_data = {
                'status': 'connected',
                'last_seen': datetime.now().isoformat(),
                'system_type': system_info.get('os', 'Unknown'),
                'os_key': system_info.get('os_key', 'unknown'),
            }
            
            # 只在有值时才更新这些字段
            optional_fields = [
                ('kernel_version', 'kernel_version'),
                ('architecture', 'architecture'),
                ('cpu_cores', 'cpu_cores'),
                ('memory_gb', 'memory_gb'),
                ('os_version', 'os_version'),
                ('system_disk_total', 'system_disk_total'),
                ('system_disk_used', 'system_disk_used'),
                ('data_disk_total', 'data_disk_total'),
                ('data_disk_used', 'data_disk_used'),
            ]
            
            for src_key, dst_key in optional_fields:
                if system_info.get(src_key) is not None:
                    update_data[dst_key] = system_info[src_key]
            
            db_manager.update_host(host_id, update_data)
            logger.info(f"← POST /api/hosts/{host_id}/test | 200 | 连接成功")
        else:
            error_msg = result.get('message', '未知错误')
            logger.warning(f"连接测试失败: {host['name']} | {error_msg}")
            db_manager.update_host(host_id, {'status': 'disconnected'})
            logger.info(f"← POST /api/hosts/{host_id}/test | 200 | 连接失败")
        
        return ConnectionTestResult(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/hosts/{host_id}/test | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{host_id}/execute", response_model=CommandResult)
async def execute_command(host_id: int, command_data: CommandExecute):
    """在主机上执行命令"""
    logger.info(f"→ POST /api/hosts/{host_id}/execute | command={command_data.command[:50]}...")
    try:
        host = db_manager.get_host(host_id)
        if not host:
            logger.warning(f"← POST /api/hosts/{host_id}/execute | 404 | 主机不存在")
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
        
        status = "成功" if result['success'] else "失败"
        logger.info(f"← POST /api/hosts/{host_id}/execute | 200 | {status}")
        
        return CommandResult(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/hosts/{host_id}/execute | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
