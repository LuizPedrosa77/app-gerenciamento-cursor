import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.withdrawal import Withdrawal
from app.models.daily_note import DailyNote

from app.core.database import Base
 

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace")
    accounts = relationship("Account", back_populates="workspace")
    trades = relationship("Trade", back_populates="workspace")
    withdrawals = relationship("Withdrawal", back_populates="workspace")
    daily_notes = relationship("DailyNote", back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    role = Column(String(50), default="member")

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_members")
