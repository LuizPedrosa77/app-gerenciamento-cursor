import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Text, ForeignKey, Integer, Date, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base
 

class Trade(Base):
    __tablename__ = "trades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"))
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    date = Column(Date, nullable=False)
    year = Column(Integer)
    month = Column(Integer)
    pair = Column(String(20))
    direction = Column(String(10))  # BUY ou SELL
    lots = Column(Numeric(10, 2), nullable=True)
    result = Column(String(10))  # WIN ou LOSS
    pnl = Column(Numeric(15, 2), default=0)
    has_vm = Column(Boolean, default=False)
    vm_lots = Column(Numeric(10, 2), nullable=True)
    vm_result = Column(String(10), nullable=True)
    vm_pnl = Column(Numeric(15, 2), default=0)
    screenshot_url = Column(Text, nullable=True)
    screenshots = Column(JSON, nullable=True, default=[])
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    account = relationship("Account", back_populates="trades")
    workspace = relationship("Workspace", back_populates="trades")
