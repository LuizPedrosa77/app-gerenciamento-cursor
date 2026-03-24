import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class OpenPosition(Base):
    __tablename__ = "open_positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), index=True, nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), index=True, nullable=False)
    ticket = Column(String(64), index=True, nullable=False)
    symbol_raw = Column(String(40), nullable=True)
    symbol_normalized = Column(String(20), nullable=True, index=True)
    direction = Column(String(10), nullable=True)
    lots = Column(Numeric(10, 2), nullable=True)
    open_time = Column(DateTime, nullable=True)
    open_price = Column(Numeric(18, 8), nullable=True)
    floating_pnl = Column(Numeric(15, 2), nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
