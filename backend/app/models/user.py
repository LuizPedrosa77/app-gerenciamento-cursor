import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

 
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    google_id = Column(String(255), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    plan = Column(String(50), default="basic")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Profile fields
    phone = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    trading_style = Column(String(50), nullable=True)
    experience_level = Column(String(50), nullable=True)
    
    # Preferences fields
    theme = Column(String(20), default="dark")
    language = Column(String(10), default="pt-BR")
    currency = Column(String(10), default="USD")
    timezone = Column(String(50), default="America/Sao_Paulo")
    notifications_email = Column(Boolean, default=True)
    notifications_push = Column(Boolean, default=True)

    # Relationships
    workspaces = relationship("Workspace", back_populates="owner")
    workspace_members = relationship("WorkspaceMember", back_populates="user")
