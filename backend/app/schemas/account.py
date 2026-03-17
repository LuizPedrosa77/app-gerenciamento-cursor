from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1)
    initial_balance: float = 0
    monthly_goal: Optional[float] = None
    meta: Optional[float] = None
    notes: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None
    initial_balance: Optional[float] = None
    monthly_goal: Optional[float] = None
    meta: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    id: str
    name: str
    balance: float
    initial_balance: float
    monthly_goal: Optional[float]
    meta: Optional[float]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
