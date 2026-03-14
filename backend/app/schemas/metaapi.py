from pydantic import BaseModel
from typing import Optional


class MTConnectRequest(BaseModel):
    login: str
    investor_password: str
    server: str
    platform: str = "mt5"
    account_name: str


class MTSyncResponse(BaseModel):
    success: bool
    message: str
    trades_imported: int = 0


class MTStatusResponse(BaseModel):
    connected: bool
    status: str
    login: Optional[str] = None
    server: Optional[str] = None
    platform: Optional[str] = None


class MTConnectResponse(BaseModel):
    success: bool
    message: str
    account_id: str
