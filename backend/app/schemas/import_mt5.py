from typing import Optional, List
from pydantic import BaseModel


class MT5TradeRow(BaseModel):
    ticket: Optional[str] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    symbol: Optional[str] = None
    type: Optional[str] = None
    volume: Optional[float] = None
    price_open: Optional[float] = None
    price_close: Optional[float] = None
    profit: Optional[float] = None
    comment: Optional[str] = None


class ImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: List[str]
