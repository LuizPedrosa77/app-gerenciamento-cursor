import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

 
class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    name = Column(String(255))
    balance = Column(Numeric(15, 2), default=0)
    initial_balance = Column(Numeric(15, 2), default=0)
    monthly_goal = Column(Numeric(15, 2), nullable=True)
    meta = Column(Numeric(15, 2), nullable=True)
    notes = Column(Text, nullable=True)
    broker_type = Column(String(50), nullable=True)
    broker_login = Column(String(100), nullable=True)
    broker_server = Column(String(100), nullable=True)
    mt_last_ticket = Column(String(100), nullable=True)
    investor_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace", back_populates="accounts")
    trades = relationship("Trade", back_populates="account")
    withdrawals = relationship("Withdrawal", back_populates="account")
    daily_notes = relationship("DailyNote", back_populates="account")
