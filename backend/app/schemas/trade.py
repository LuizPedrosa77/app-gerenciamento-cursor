from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class TradeCreate(BaseModel):
    date: date
    pair: str = Field(..., min_length=1)
    direction: str = Field(..., pattern="^(BUY|SELL)$")
    lots: Optional[float] = None
    result: str = Field(..., pattern="^(WIN|LOSS)$")
    pnl: float
    has_vm: bool = False
    vm_lots: Optional[float] = None
    vm_result: Optional[str] = Field(None, pattern="^(WIN|LOSS)$")
    vm_pnl: float = 0
    notes: Optional[str] = None
    account_id: str


class TradeUpdate(BaseModel):
    date: Optional[date] = None
    pair: Optional[str] = None
    direction: Optional[str] = None
    lots: Optional[float] = None
    result: Optional[str] = None
    pnl: Optional[float] = None
    has_vm: Optional[bool] = None
    vm_lots: Optional[float] = None
    vm_result: Optional[str] = None
    vm_pnl: Optional[float] = None
    notes: Optional[str] = None


class TradeResponse(BaseModel):
    id: str
    date: date
    year: int
    month: int
    pair: str
    direction: str
    lots: Optional[float]
    result: str
    pnl: float
    has_vm: bool
    vm_lots: Optional[float]
    vm_result: Optional[str]
    vm_pnl: float
    screenshot_url: Optional[str]
    notes: Optional[str]
    account_id: str
    created_at: datetime
