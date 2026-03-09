"""
Modelos ORM. Importar aqui para que Alembic descubra todas as tabelas.
"""
from app.core.database import Base
from app.models.account import AccountSnapshot, TradingAccount
from app.models.broker import BrokerConnection, BrokerSymbol
from app.models.market_data import (
    Candle,
    MarketDataSource,
    MarketDataSourceType,
    ReplayMode,
    ReplaySession,
    ReplayStatus,
    Tick,
)
from app.models.note import DailyNote
from app.models.trade import Trade, TradeTag, TradeTagLink, Withdrawal
from app.models.user import User, Workspace, WorkspaceMember, WorkspaceRole

__all__ = [
    "Base",
    "User",
    "Workspace",
    "WorkspaceMember",
    "WorkspaceRole",
    "TradingAccount",
    "AccountSnapshot",
    "Trade",
    "TradeTag",
    "TradeTagLink",
    "Withdrawal",
    "DailyNote",
    "BrokerConnection",
    "BrokerSymbol",
    "Tick",
    "Candle",
    "ReplaySession",
    "MarketDataSource",
    "MarketDataSourceType",
    "ReplayMode",
    "ReplayStatus",
]
