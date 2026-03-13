"""
SFTP 路由
处理 SFTP 文件管理相关请求
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import io
import tempfile
import os

from database.db_manager import db_manager
from services.ssh_service.sftp import create_sftp_service, SFTPService
from models.schemas import MessageResponse
from utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/sftp", tags=["sftp"])


# 存储活跃的 SFTP 连接
sftp_connections: dict[int, SFTPService] = {}


class ConnectRequest(BaseModel):
    """连接请求"""
    host_id: int


class PathRequest(BaseModel):
    """路径请求"""
    host_id: int
    path: str = "."


class RenameRequest(BaseModel):
    """重命名请求"""
    host_id: int
    old_path: str
    new_path: str


class FileContentRequest(BaseModel):
    """文件内容请求"""
    host_id: int
    path: str
    content: str


@router.post("/connect", response_model=MessageResponse)
async def connect_sftp(request: ConnectRequest):
    """建立 SFTP 连接"""
    logger.info(f"→ POST /api/sftp/connect | host_id={request.host_id}")

    try:
        host = db_manager.get_host(request.host_id)
        if not host:
            raise HTTPException(status_code=404, detail="主机不存在")

        # 关闭现有连接
        if request.host_id in sftp_connections:
            sftp_connections[request.host_id].disconnect()

        # 创建新连接
        sftp = create_sftp_service(host)
        if not sftp.connect():
            raise HTTPException(status_code=500, detail="SFTP 连接失败")

        sftp_connections[request.host_id] = sftp
        logger.info(f"← POST /api/sftp/connect | 200 | SFTP 连接成功")
        return MessageResponse(success=True, message="SFTP 连接成功")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/connect | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class DisconnectRequest(BaseModel):
    """断开连接请求"""
    host_id: int


@router.post("/disconnect", response_model=MessageResponse)
async def disconnect_sftp(request: DisconnectRequest):
    """断开 SFTP 连接"""
    logger.info(f"→ POST /api/sftp/disconnect | host_id={request.host_id}")

    try:
        if request.host_id in sftp_connections:
            sftp_connections[request.host_id].disconnect()
            del sftp_connections[request.host_id]
            logger.info(f"← POST /api/sftp/disconnect | 200 | SFTP 已断开")
            return MessageResponse(success=True, message="SFTP 已断开")
        else:
            return MessageResponse(success=True, message="没有活动的 SFTP 连接")

    except Exception as e:
        logger.error(f"✗ POST /api/sftp/disconnect | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/list")
async def list_directory(request: PathRequest):
    """列出目录内容"""
    logger.info(f"→ POST /api/sftp/list | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        result = sftp.list_directory(request.path)

        if result["success"]:
            logger.info(f"← POST /api/sftp/list | 200 | {len(result.get('files', []))} 个文件")
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "列出目录失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/list | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mkdir", response_model=MessageResponse)
async def create_directory(request: PathRequest):
    """创建目录"""
    logger.info(f"→ POST /api/sftp/mkdir | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        result = sftp.create_directory(request.path)

        if result["success"]:
            logger.info(f"← POST /api/sftp/mkdir | 200 | 目录创建成功")
            return MessageResponse(success=True, message=result.get("message", "目录创建成功"))
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "创建目录失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/mkdir | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class RemoveRequest(BaseModel):
    """删除请求"""
    host_id: int
    path: str
    recursive: bool = False


@router.post("/remove", response_model=MessageResponse)
async def remove_file(request: RemoveRequest):
    """删除文件或目录"""
    logger.info(f"→ POST /api/sftp/remove | host_id={request.host_id}, path={request.path}, recursive={request.recursive}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]

        # 先检查是文件还是目录
        list_result = sftp.list_directory(request.path)
        if list_result["success"]:
            # 是目录
            result = sftp.remove_directory(request.path, recursive=request.recursive)
        else:
            # 是文件
            result = sftp.remove_file(request.path)

        if result["success"]:
            logger.info(f"← POST /api/sftp/remove | 200 | 删除成功")
            return MessageResponse(success=True, message=result.get("message", "删除成功"))
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "删除失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/remove | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename", response_model=MessageResponse)
async def rename_file(request: RenameRequest):
    """重命名文件或目录"""
    logger.info(f"→ POST /api/sftp/rename | host_id={request.host_id}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        result = sftp.rename(request.old_path, request.new_path)

        if result["success"]:
            logger.info(f"← POST /api/sftp/rename | 200 | 重命名成功")
            return MessageResponse(success=True, message=result.get("message", "重命名成功"))
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "重命名失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/rename | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    host_id: int = Form(...),
    remote_path: str = Form(...),
    file: UploadFile = File(...)
):
    """上传文件"""
    logger.info(f"→ POST /api/sftp/upload | host_id={host_id}, path={remote_path}, file={file.filename}")

    try:
        if host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[host_id]

        # 保存上传的文件到临时位置
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            # 构建远程文件路径
            # file.filename 可能包含相对路径（如 folder/subfolder/file.txt）
            # 我们需要保留目录结构
            if file.filename:
                # 检查是否包含目录路径
                if '/' in file.filename or '\\' in file.filename:
                    # 标准化路径分隔符
                    relative_path = file.filename.replace('\\', '/')
                    # 移除开头的 ./ 或其他相对路径标记
                    if relative_path.startswith('./'):
                        relative_path = relative_path[2:]
                    # 构建完整的远程路径
                    remote_file_path = f"{remote_path}/{relative_path}".replace('//', '/')
                    
                    # 确保目标目录存在
                    dir_path = os.path.dirname(remote_file_path)
                    if dir_path and dir_path != remote_path:
                        # 递归创建目录
                        try:
                            if sftp.ssh_conn and sftp.ssh_conn.client:
                                sftp.ssh_conn.client.exec_command(f'mkdir -p "{dir_path}"')
                        except:
                            pass  # 目录可能已存在
                else:
                    # 普通文件上传，只使用文件名
                    remote_file_path = f"{remote_path}/{file.filename}".replace('//', '/')
            else:
                remote_file_path = f"{remote_path}/unnamed".replace('//', '/')
            
            result = sftp.upload_file(tmp_path, remote_file_path)

            if result["success"]:
                logger.info(f"← POST /api/sftp/upload | 200 | 上传成功")
                return MessageResponse(
                    success=True,
                    message=f"文件上传成功 ({result.get('size_formatted', '未知大小')})"
                )
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "上传失败"))
        finally:
            os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/upload | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/download")
async def download_file(request: PathRequest):
    """下载文件"""
    logger.info(f"→ POST /api/sftp/download | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]

        # 获取文件名
        filename = os.path.basename(request.path)

        # 下载到临时文件
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp_path = tmp.name

        try:
            result = sftp.download_file(request.path, tmp_path)

            if not result["success"]:
                raise HTTPException(status_code=500, detail=result.get("error", "下载失败"))

            # 读取文件并返回
            with open(tmp_path, 'rb') as f:
                file_content = f.read()

            logger.info(f"← POST /api/sftp/download | 200 | 下载成功")
            return StreamingResponse(
                io.BytesIO(file_content),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/download | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/read")
async def read_file(request: PathRequest):
    """读取文件内容（用于文本编辑）"""
    logger.info(f"→ POST /api/sftp/read | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        result = sftp.get_file_content(request.path)

        if result["success"]:
            logger.info(f"← POST /api/sftp/read | 200 | 读取成功")
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "读取失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/read | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/write", response_model=MessageResponse)
async def write_file(request: FileContentRequest):
    """写入文件内容"""
    logger.info(f"→ POST /api/sftp/write | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        result = sftp.write_file_content(request.path, request.content)

        if result["success"]:
            logger.info(f"← POST /api/sftp/write | 200 | 写入成功")
            return MessageResponse(success=True, message=result.get("message", "文件保存成功"))
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "写入失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/write | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disk-usage")
async def get_disk_usage(request: PathRequest):
    """获取磁盘使用情况"""
    logger.info(f"→ POST /api/sftp/disk-usage | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        result = sftp.get_disk_usage(request.path)

        if result["success"]:
            logger.info(f"← POST /api/sftp/disk-usage | 200 | 获取成功")
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "获取磁盘使用情况失败"))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/disk-usage | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
