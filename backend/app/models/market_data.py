"""
Models: Tick, Candle, ReplaySession, MarketDataSource.
"""
import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ReplayMode(str, enum.Enum):
    """Replay session modes."""
    REAL_TIME = "real_time"
    FAST_FORWARD = "fast_forward"
    STEP_BY_STEP = "step_by_step"
    PAUSED = "paused"


class ReplayStatus(str, enum.Enum):
    """Replay session statuses."""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class MarketDataSourceType(str, enum.Enum):
    """Market data source types."""
    CSV_IMPORT = "csv_import"
    BROKER_API = "broker_api"
    MANUAL_ENTRY = "manual_entry"
    FILE_UPLOAD = "file_upload"


class Tick(Base):
    __tablename__ = "ticks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_symbols.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    bid: Mapped[Decimal] = mapped_column(Numeric(20, 5), nullable=False)
    ask: Mapped[Decimal] = mapped_column(Numeric(20, 5), nullable=False)
    volume: Mapped[int] = mapped_column(Integer, nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("market_data_sources.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    symbol: Mapped["BrokerSymbol"] = relationship("BrokerSymbol")
    source: Mapped["MarketDataSource"] = relationship("MarketDataSource", back_populates="ticks")

    # Unique constraint for symbol + timestamp (no duplicate ticks)
    __table_args__ = (
        UniqueConstraint("symbol_id", "timestamp", name="uq_tick_symbol_timestamp"),
    )


class Candle(Base):
    __tablename__ = "candles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_symbols.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)  # M1, M5, M15, H1, D1, etc.
    open_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    close_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    open_price: Mapped[Decimal] = mapped_column(Numeric(20, 5), nullable=False)
    high_price: Mapped[Decimal] = mapped_column(Numeric(20, 5), nullable=False)
    low_price: Mapped[Decimal] = mapped_column(Numeric(20, 5), nullable=False)
    close_price: Mapped[Decimal] = mapped_column(Numeric(20, 5), nullable=False)
    volume: Mapped[int] = mapped_column(Integer, nullable=True)
    tick_volume: Mapped[int] = mapped_column(Integer, nullable=True)  # Number of ticks in candle
    spread: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Average spread
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("market_data_sources.id", ondelete="SET NULL"), nullable=True
    )
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
    symbol: Mapped["BrokerSymbol"] = relationship("BrokerSymbol")
    source: Mapped["MarketDataSource"] = relationship("MarketDataSource", back_populates="candles")

    # Unique constraint for symbol + timeframe + open_time
    __table_args__ = (
        UniqueConstraint("symbol_id", "timeframe", "open_time", name="uq_candle_symbol_timeframe_time"),
    )


class ReplaySession(Base):
    __tablename__ = "replay_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_symbols.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default=ReplayMode.REAL_TIME, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=ReplayStatus.CREATED, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    speed: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1.0"), nullable=False)  # Speed multiplier
    auto_step: Mapped[bool] = mapped_column(default=True, nullable=False)  # Auto-advance in step mode
    step_interval: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)  # milliseconds between steps
    total_ticks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_ticks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace")
    user: Mapped["User"] = relationship("User")
    symbol: Mapped["BrokerSymbol"] = relationship("BrokerSymbol")


class MarketDataSource(Base):
    __tablename__ = "market_data_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("broker_symbols.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)  # For CSV imports
    broker_connection_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("broker_connections.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    last_import_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_ticks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_candles: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    date_range_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_range_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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
    workspace: Mapped["Workspace"] = relationship("Workspace")
    symbol: Mapped["BrokerSymbol"] = relationship("BrokerSymbol")
    broker_connection: Mapped["BrokerConnection"] = relationship("BrokerConnection")
    ticks: Mapped[list["Tick"]] = relationship("Tick", back_populates="source", cascade="all, delete-orphan")
    candles: Mapped[list["Candle"]] = relationship("Candle", back_populates="source", cascade="all, delete-orphan")
