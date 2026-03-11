"""
Pydantic 数据模型定义
用于 FastAPI 请求和响应验证
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class AuthType(str, Enum):
    """认证类型枚举"""
    PASSWORD = "password"
    KEY = "key"


class HostStatus(str, Enum):
    """主机状态枚举"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    WARNING = "warning"


# ==================== SSH 主机模型 ====================

class HostBase(BaseModel):
    """主机基础模型"""
    name: str = Field(..., description="主机显示名称")
    address: str = Field(..., description="主机地址(IP或域名)")
    port: int = Field(default=22, ge=1, le=65535, description="SSH端口")
    username: str = Field(..., description="登录用户名")
    auth_type: AuthType = Field(default=AuthType.PASSWORD, description="认证类型")
    tags: List[str] = Field(default_factory=list, description="标签列表")


class HostCreate(HostBase):
    """创建主机请求模型"""
    password: Optional[str] = Field(None, description="密码(密码认证时必填)")
    private_key: Optional[str] = Field(None, description="私钥内容(密钥认证时必填)")
    key_passphrase: Optional[str] = Field(None, description="私钥密码")
    system_type: Optional[str] = Field(None, description="系统类型")


class HostUpdate(BaseModel):
    """更新主机请求模型"""
    name: Optional[str] = None
    address: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    username: Optional[str] = None
    auth_type: Optional[AuthType] = None
    password: Optional[str] = None
    private_key: Optional[str] = None
    key_passphrase: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[HostStatus] = None
    system_type: Optional[str] = None
    os_key: Optional[str] = None
    kernel_version: Optional[str] = None
    architecture: Optional[str] = None
    cpu_cores: Optional[int] = None
    memory_gb: Optional[float] = None
    last_seen: Optional[str] = None


class HostResponse(HostBase):
    """主机响应模型"""
    id: int
    status: HostStatus = HostStatus.DISCONNECTED
    system_type: Optional[str] = None
    os_key: Optional[str] = None
    kernel_version: Optional[str] = None
    architecture: Optional[str] = None
    cpu_cores: Optional[int] = None
    memory_gb: Optional[float] = None
    last_seen: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class HostListResponse(BaseModel):
    """主机列表响应"""
    success: bool = True
    data: List[HostResponse]


class HostSingleResponse(BaseModel):
    """单个主机响应"""
    success: bool = True
    data: HostResponse


# ==================== SSH 密钥模型 ====================

class KeyType(str, Enum):
    """密钥类型枚举"""
    RSA = "rsa"
    ED25519 = "ed25519"


class SSHKeyBase(BaseModel):
    """SSH密钥基础模型"""
    name: str = Field(..., description="密钥名称")
    key_type: KeyType = Field(default=KeyType.RSA, description="密钥类型")


class SSHKeyCreate(SSHKeyBase):
    """创建SSH密钥请求模型"""
    private_key: str = Field(..., description="私钥内容")
    public_key: Optional[str] = Field(None, description="公钥内容")
    fingerprint: Optional[str] = Field(None, description="密钥指纹")


class SSHKeyGenerate(BaseModel):
    """生成SSH密钥请求模型"""
    name: str = Field(..., description="密钥名称")
    key_type: KeyType = Field(default=KeyType.RSA, description="密钥类型")


class SSHKeyResponse(BaseModel):
    """SSH密钥响应模型"""
    id: int
    name: str
    key_type: str
    fingerprint: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class SSHKeyListResponse(BaseModel):
    """SSH密钥列表响应"""
    success: bool = True
    data: List[SSHKeyResponse]


# ==================== 命令执行模型 ====================

class CommandExecute(BaseModel):
    """执行命令请求模型"""
    command: str = Field(..., description="要执行的命令")


class CommandResult(BaseModel):
    """命令执行结果"""
    success: bool
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    message: Optional[str] = None


# ==================== 连接测试模型 ====================

class ConnectionTestResult(BaseModel):
    """连接测试结果"""
    success: bool
    message: Optional[str] = None
    system_info: Optional[dict] = None


# ==================== 统计信息模型 ====================

class HostStats(BaseModel):
    """主机统计信息"""
    total: int = 0
    online: int = 0
    offline: int = 0
    key_count: int = 0


class StatsResponse(BaseModel):
    """统计信息响应"""
    success: bool = True
    data: HostStats


# ==================== 通用响应模型 ====================

class MessageResponse(BaseModel):
    """通用消息响应"""
    success: bool
    message: str


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    message: str