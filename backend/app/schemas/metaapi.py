from pydantic import BaseModel
from typing import Optional

class MTConnectRequest(BaseModel):
    login: str
    password: str
    server: str
    platform: str = "mt5"
    account_id: str

class MTSyncResponse(BaseModel):
    success: bool
    message: str
    trades_imported: int = 0
    metaapi_account_id: Optional[str] = None
