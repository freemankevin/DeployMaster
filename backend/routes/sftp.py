"""
SFTP 路由
处理 SFTP 文件管理相关请求
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import io
import tempfile
import os
import zipfile
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

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


def format_size(size) -> str:
    """格式化文件大小"""
    size_float = float(size)
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_float < 1024:
            return f"{size_float:.2f} {unit}" if unit != 'B' else f"{int(size_float)} {unit}"
        size_float /= 1024
    return f"{size_float:.2f} PB"


# 进度追踪存储（用于 WebSocket 推送）
upload_progress_store: dict = {}  # {upload_id: {stage, progress, bytes_sent, total_bytes, speed}}
progress_lock = threading.Lock()  # 线程锁，确保进度更新的线程安全

# 线程池执行器，用于执行阻塞的SFTP操作
sftp_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="sftp_upload")


def get_upload_progress(upload_id: str) -> dict:
    """获取上传进度"""
    with progress_lock:
        return upload_progress_store.get(upload_id, {"status": "not_found"})


def update_upload_progress(upload_id: str, **kwargs):
    """更新上传进度（线程安全）"""
    with progress_lock:
        if upload_id not in upload_progress_store:
            upload_progress_store[upload_id] = {
                "stage": "init",
                "progress": 0,
                "bytes_sent": 0,
                "total_bytes": 0,
                "speed": "0 B/s",
                "message": ""
            }
        upload_progress_store[upload_id].update(kwargs)


def clear_upload_progress(upload_id: str):
    """清除上传进度"""
    with progress_lock:
        if upload_id in upload_progress_store:
            del upload_progress_store[upload_id]


@router.get("/upload-progress/{upload_id}")
async def get_upload_progress_endpoint(upload_id: str):
    """获取上传进度的 HTTP 端点（轮询方式）"""
    progress = get_upload_progress(upload_id)
    return {"success": True, "progress": progress}


@router.post("/upload")
async def upload_file(
    host_id: str = Form(...),
    remote_path: str = Form(...),
    file: UploadFile = File(...),
    upload_id: str = Form(default="")
):
    """
    上传文件 - 流式传输，实时进度追踪
    
    进度阶段定义（参考 FileZilla/Tabby）：
    - 阶段1 (0-50%): 浏览器 → 后端服务器
    - 阶段2 (50-100%): 后端服务器 → SSH服务器
    
    upload_id: 可选的上传ID，用于轮询进度
    """
    import uuid
    import time as time_module
    
    # 生成唯一上传ID
    if not upload_id:
        upload_id = str(uuid.uuid4())[:8]
    
    filename = file.filename if file else None
    total_size = file.size if hasattr(file, 'size') and file.size else 0
    
    logger.info(f"→ POST /api/sftp/upload | upload_id={upload_id}")
    logger.info(f"  ├─ 主机ID: {host_id}")
    logger.info(f"  ├─ 目标路径: {remote_path}")
    logger.info(f"  ├─ 文件名: {filename}")
    logger.info(f"  └─ 文件大小: {format_size(total_size) if total_size else '未知'}")

    # 初始化进度
    update_upload_progress(upload_id, stage="init", progress=0, total_bytes=total_size, message="准备上传...")

    try:
        # 转换 host_id 为整数
        try:
            host_id_int = int(host_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="host_id 必须是整数")
        
        if host_id_int not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        if not file or not filename:
            raise HTTPException(status_code=422, detail="未提供文件")

        sftp = sftp_connections[host_id_int]

        # ========== 阶段1: 接收前端上传 (进度 0% - 50%) ==========
        update_upload_progress(upload_id, stage="receiving", message="正在接收文件...")
        
        chunk_size = 256 * 1024  # 256KB chunks
        tmp_path = None
        last_progress_update = time_module.time()
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, prefix='sftp_upload_') as tmp:
                tmp_path = tmp.name
                bytes_written = 0
                start_time = time_module.time()
                
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    tmp.write(chunk)
                    bytes_written += len(chunk)
                    
                    # 更新进度（阶段1占50%）
                    current_time = time_module.time()
                    if current_time - last_progress_update >= 0.5:  # 每0.5秒更新一次
                        elapsed = current_time - start_time
                        speed = bytes_written / elapsed if elapsed > 0 else 0
                        
                        if total_size > 0:
                            # 阶段1进度：0-50%
                            receive_percent = int((bytes_written / total_size) * 50)
                            update_upload_progress(
                                upload_id,
                                stage="receiving",
                                progress=receive_percent,
                                bytes_sent=bytes_written,
                                speed=f"{format_size(int(speed))}/s",
                                message=f"接收中 {receive_percent}%"
                            )
                        else:
                            # 未知大小时，阶段1固定显示25%
                            update_upload_progress(
                                upload_id,
                                stage="receiving",
                                progress=25,
                                bytes_sent=bytes_written,
                                speed=f"{format_size(int(speed))}/s",
                                message=f"已接收 {format_size(bytes_written)}"
                            )
                        
                        last_progress_update = current_time
                
                # 确保所有数据写入磁盘
                tmp.flush()
                os.fsync(tmp.fileno())
                
                elapsed = time_module.time() - start_time
                avg_speed = bytes_written / elapsed if elapsed > 0 else 0
                
                # 阶段1完成，进度50%
                update_upload_progress(
                    upload_id,
                    stage="received",
                    progress=50,
                    bytes_sent=bytes_written,
                    speed=f"{format_size(int(avg_speed))}/s",
                    message="接收完成，开始传输..."
                )
                logger.info(f"[阶段1/2] ✓ 接收完成: {format_size(bytes_written)}，耗时 {elapsed:.1f}秒")
            
        except Exception as e:
            update_upload_progress(upload_id, stage="error", message=f"接收失败: {str(e)}")
            logger.error(f"✗ 保存临时文件失败: {e}")
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise HTTPException(status_code=500, detail=f"保存临时文件失败: {str(e)}")

        # ========== 阶段2: SFTP上传 (进度 50% - 100%) ==========
        update_upload_progress(upload_id, stage="transferring", message="正在传输到服务器...")
        
        # 构建远程文件路径
        if '/' in filename or '\\' in filename:
            relative_path = filename.replace('\\', '/')
            if relative_path.startswith('./'):
                relative_path = relative_path[2:]
            remote_file_path = f"{remote_path}/{relative_path}".replace('//', '/')
            
            dir_path = os.path.dirname(remote_file_path)
            if dir_path and dir_path != remote_file_path:
                try:
                    if sftp.ssh_conn and sftp.ssh_conn.client:
                        sftp.ssh_conn.client.exec_command(f'mkdir -p "{dir_path}"')
                except:
                    pass
        else:
            remote_file_path = f"{remote_path}/{filename}".replace('//', '/')
        
        logger.info(f"[阶段2/2] 开始SFTP传输 → {remote_file_path}")
        
        sftp_start_time = time_module.time()
        actual_file_size = os.path.getsize(tmp_path) if tmp_path else 0
        
        # 定义在线程中执行的SFTP上传函数
        def run_sftp_upload():
            """在线程池中执行的SFTP上传"""
            last_sftp_update = [time_module.time()]
            
            def sftp_callback(sent: int, total: int):
                """SFTP 传输进度回调"""
                current_time = time_module.time()
                
                # 每0.3秒更新一次进度（更频繁的更新）
                if current_time - last_sftp_update[0] >= 0.3:
                    elapsed = current_time - sftp_start_time
                    speed = sent / elapsed if elapsed > 0 else 0
                    
                    # 阶段2进度：50-100%
                    sftp_percent = int((sent / total) * 50) if total > 0 else 0
                    overall_progress = 50 + sftp_percent
                    
                    update_upload_progress(
                        upload_id,
                        stage="transferring",
                        progress=overall_progress,
                        bytes_sent=sent,
                        total_bytes=total,
                        speed=f"{format_size(int(speed))}/s",
                        message=f"传输中 {sftp_percent}%"
                    )
                    last_sftp_update[0] = current_time
            
            return sftp.upload_file(tmp_path, remote_file_path, progress_callback=sftp_callback)
        
        try:
            # 使用线程池执行SFTP上传，避免阻塞事件循环
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(sftp_executor, run_sftp_upload)
            sftp_elapsed = time_module.time() - sftp_start_time

            if result["success"]:
                total_elapsed = time_module.time() - start_time
                
                # 完成
                update_upload_progress(
                    upload_id,
                    stage="completed",
                    progress=100,
                    bytes_sent=actual_file_size,
                    total_bytes=actual_file_size,
                    speed="",
                    message="上传完成"
                )
                
                logger.info(f"[阶段2/2] ✓ SFTP传输完成，耗时 {sftp_elapsed:.1f}秒")
                logger.info(f"← POST /api/sftp/upload | 200 | 总耗时 {total_elapsed:.1f}秒")
                
                return MessageResponse(
                    success=True,
                    message=f"文件上传成功 ({result.get('size_formatted', '未知大小')})"
                )
            else:
                update_upload_progress(upload_id, stage="error", message=f"传输失败: {result.get('error', '未知错误')}")
                logger.error(f"✗ SFTP上传失败: {result.get('error', '未知错误')}")
                raise HTTPException(status_code=500, detail=result.get("error", "上传失败"))
                
        finally:
            # 清理临时文件
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    logger.warning(f"删除临时文件失败: {e}")
            
            # 延迟清除进度（让前端有时间获取最终状态）
            asyncio.create_task(clear_progress_delayed(upload_id, 30))

    except HTTPException:
        raise
    except Exception as e:
        update_upload_progress(upload_id, stage="error", message=str(e))
        logger.error(f"✗ POST /api/sftp/upload | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def clear_progress_delayed(upload_id: str, delay_seconds: int):
    """延迟清除进度"""
    import asyncio
    await asyncio.sleep(delay_seconds)
    clear_upload_progress(upload_id)


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
            # 处理中文文件名编码
            from urllib.parse import quote
            encoded_filename = quote(filename, safe='')
            file_size = len(file_content)
            return StreamingResponse(
                io.BytesIO(file_content),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                    "Content-Length": str(file_size)
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


@router.post("/download-folder")
async def download_folder(request: PathRequest):
    """下载目录为ZIP文件"""
    logger.info(f"→ POST /api/sftp/download-folder | host_id={request.host_id}, path={request.path}")

    try:
        if request.host_id not in sftp_connections:
            raise HTTPException(status_code=400, detail="SFTP 未连接")

        sftp = sftp_connections[request.host_id]
        folder_name = os.path.basename(request.path) or "download"

        # 创建临时目录存放下载的文件
        with tempfile.TemporaryDirectory() as tmp_dir:
            zip_path = os.path.join(tmp_dir, f"{folder_name}.zip")
            
            # 递归下载目录并打包为ZIP
            import zipfile
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                await _add_folder_to_zip(sftp, request.path, "", zipf)
            
            # 读取ZIP文件并返回
            with open(zip_path, 'rb') as f:
                zip_content = f.read()
            
            logger.info(f"← POST /api/sftp/download-folder | 200 | 下载成功")
            from urllib.parse import quote
            encoded_filename = quote(f"{folder_name}.zip", safe='')
            return StreamingResponse(
                io.BytesIO(zip_content),
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"✗ POST /api/sftp/download-folder | Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _add_folder_to_zip(sftp: SFTPService, remote_path: str, arcname: str, zipf: zipfile.ZipFile):
    """递归添加目录内容到ZIP文件"""
    result = sftp.list_directory(remote_path)
    if not result["success"]:
        return
    
    for file_info in result.get("files", []):
        file_path = file_info["path"]
        file_arcname = f"{arcname}/{file_info['name']}" if arcname else file_info["name"]
        
        if file_info["is_dir"]:
            # 递归处理子目录
            await _add_folder_to_zip(sftp, file_path, file_arcname, zipf)
        else:
            # 下载文件到临时位置并添加到ZIP
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp_path = tmp.name
            try:
                download_result = sftp.download_file(file_path, tmp_path)
                if download_result["success"]:
                    zipf.write(tmp_path, file_arcname)
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)


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
