from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class ReplaySession(BaseModel):
    session_id: str
    account_id: str
    pair: str
    date: date
    status: str  # pending, running, paused, finished
    current_candle: int = 0
    total_candles: int = 0
    created_at: datetime


class ReplayControl(BaseModel):
    action: str  # start, pause, resume, stop, next, prev
    speed: Optional[float] = 1.0


class CandleData(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class ReplayMessage(BaseModel):
    type: str
    candle: Optional[CandleData] = None
    current: Optional[int] = None
    total: Optional[int] = None
    progress: Optional[float] = None
