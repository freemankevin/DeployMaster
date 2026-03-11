"""
SSH 密钥管理路由 (FastAPI 版本)
"""

from fastapi import APIRouter, HTTPException
import paramiko
import io
import hashlib

from database.db_manager import db_manager
from models.schemas import (
    SSHKeyCreate, SSHKeyGenerate, SSHKeyResponse,
    SSHKeyListResponse, MessageResponse
)
from utils.logger import get_logger

logger = get_logger(__name__)

# 创建路由器
router = APIRouter(prefix="/keys", tags=["keys"])


@router.get("", response_model=SSHKeyListResponse)
async def get_keys():
    """获取所有 SSH 密钥"""
    try:
        keys = db_manager.get_all_ssh_keys()
        # 不返回私钥内容
        safe_keys = []
        for key in keys:
            safe_keys.append({
                'id': key['id'],
                'name': key['name'],
                'key_type': key.get('key_type', 'rsa'),
                'fingerprint': key.get('fingerprint'),
                'created_at': key['created_at']
            })
        return SSHKeyListResponse(data=safe_keys)
    except Exception as e:
        logger.error(f"获取密钥列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=MessageResponse, status_code=201)
async def add_key(key_data: SSHKeyCreate):
    """添加 SSH 密钥"""
    try:
        key_dict = key_data.model_dump()
        key_id = db_manager.add_ssh_key(key_dict)
        
        return MessageResponse(
            success=True,
            message="密钥添加成功"
        )
    except Exception as e:
        logger.error(f"添加密钥失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{key_id}", response_model=MessageResponse)
async def delete_key(key_id: int):
    """删除 SSH 密钥"""
    try:
        success = db_manager.delete_ssh_key(key_id)
        if success:
            return MessageResponse(success=True, message="密钥删除成功")
        else:
            raise HTTPException(status_code=404, detail="密钥不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除密钥失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=MessageResponse, status_code=201)
async def generate_key(key_data: SSHKeyGenerate):
    """生成新的 SSH 密钥对"""
    try:
        key_type = key_data.key_type
        key_name = key_data.name
        
        if key_type == "rsa":
            key = paramiko.RSAKey.generate(4096)
            
            # 导出私钥
            private_key_io = io.StringIO()
            key.write_private_key(private_key_io)
            private_key = private_key_io.getvalue()
            
            # 导出公钥
            public_key = f"{key.get_name()} {key.get_base64()}"
            fingerprint = key.get_fingerprint().hex()
            
        elif key_type == "ed25519":
            # Ed25519 需要使用 cryptography 库生成
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
            from cryptography.hazmat.primitives import serialization
            
            private_key_obj = Ed25519PrivateKey.generate()
            private_bytes = private_key_obj.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.OpenSSH,
                encryption_algorithm=serialization.NoEncryption()
            )
            public_bytes = private_key_obj.public_key().public_bytes(
                encoding=serialization.Encoding.OpenSSH,
                format=serialization.PublicFormat.OpenSSH
            )
            
            private_key = private_bytes.decode()
            public_key = public_bytes.decode()
            
            # 计算指纹
            fingerprint = hashlib.md5(public_bytes).hexdigest()
        else:
            raise HTTPException(status_code=400, detail="不支持的密钥类型")
        
        # 保存到数据库
        key_dict = {
            'name': key_name,
            'key_type': key_type,
            'private_key': private_key,
            'public_key': public_key,
            'fingerprint': fingerprint
        }
        
        key_id = db_manager.add_ssh_key(key_dict)
        
        return MessageResponse(
            success=True,
            message="密钥生成成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成密钥失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
