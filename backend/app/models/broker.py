"""
Models: BrokerConnection, BrokerSymbol.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BrokerConnection(Base):
    __tablename__ = "broker_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    broker_type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    environment: Mapped[str] = mapped_column(String(20), default="live", nullable=False)
    encrypted_credentials: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    trading_accounts: Mapped[list["TradingAccount"]] = relationship(
        "TradingAccount", back_populates="broker_connection", cascade="all, delete-orphan"
    )
    symbols: Mapped[list["BrokerSymbol"]] = relationship(
        "BrokerSymbol", back_populates="broker_connection", cascade="all, delete-orphan"
    )


class BrokerSymbol(Base):
    __tablename__ = "broker_symbols"
    __table_args__ = (UniqueConstraint("broker_connection_id", "symbol", name="uq_broker_connection_symbol"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    broker_connection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_connections.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    digits: Mapped[int] = mapped_column(nullable=False)
    point: Mapped[Decimal] = mapped_column(Numeric(20, 10), nullable=False)
    tick_size: Mapped[Decimal] = mapped_column(Numeric(20, 10), nullable=False)
    contract_size: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    min_lot: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    max_lot: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    lot_step: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    spread: Mapped[int | None] = mapped_column(nullable=True)
    is_tradeable: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    broker_connection: Mapped["BrokerConnection"] = relationship(
        "BrokerConnection", back_populates="symbols"
    )
