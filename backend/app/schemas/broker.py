from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class BrokerType(str, Enum):
    mt4 = "MT4"
    mt5 = "MT5"
    ctrader = "cTrader"
    tradovate = "Tradovate"
    ninjatrader = "NinjaTrader"


class BrokerConnectionCreate(BaseModel):
    broker_type: BrokerType
    account_name: str
    login: Optional[str] = None
    server: Optional[str] = None
    notes: Optional[str] = None


class BrokerConnectionResponse(BaseModel):
    id: str
    broker_type: str
    account_name: str
    login: Optional[str]
    server: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BrokerInfo(BaseModel):
    type: str
    name: str
    description: str
