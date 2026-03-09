"""
Market data service for ticks, candles, and replay sessions.
"""
import csv
import io
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    BrokerSymbol,
    Candle,
    MarketDataSource,
    MarketDataSourceType,
    ReplaySession,
    ReplayStatus,
    Tick,
)


async def save_tick(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    timestamp: datetime,
    bid: Decimal,
    ask: Decimal,
    volume: Optional[int] = None,
    source_id: Optional[uuid.UUID] = None,
) -> Tick:
    """Save a single tick to database."""
    tick = Tick(
        symbol_id=symbol_id,
        timestamp=timestamp,
        bid=bid,
        ask=ask,
        volume=volume,
        source_id=source_id,
    )
    
    db.add(tick)
    await db.commit()
    await db.refresh(tick)
    return tick


async def save_candle(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    timeframe: str,
    open_time: datetime,
    close_time: datetime,
    open_price: Decimal,
    high_price: Decimal,
    low_price: Decimal,
    close_price: Decimal,
    volume: Optional[int] = None,
    tick_volume: Optional[int] = None,
    spread: Optional[int] = None,
    source_id: Optional[uuid.UUID] = None,
) -> Candle:
    """Save a single candle to database."""
    candle = Candle(
        symbol_id=symbol_id,
        timeframe=timeframe,
        open_time=open_time,
        close_time=close_time,
        open_price=open_price,
        high_price=high_price,
        low_price=low_price,
        close_price=close_price,
        volume=volume,
        tick_volume=tick_volume,
        spread=spread,
        source_id=source_id,
    )
    
    db.add(candle)
    await db.commit()
    await db.refresh(candle)
    return candle


async def get_candles(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    timeframe: str,
    start_time: datetime,
    end_time: datetime,
    limit: int = 1000,
) -> List[Candle]:
    """Get candles for a symbol and timeframe within date range."""
    result = await db.execute(
        select(Candle)
        .where(
            and_(
                Candle.symbol_id == symbol_id,
                Candle.timeframe == timeframe,
                Candle.open_time >= start_time,
                Candle.open_time <= end_time,
            )
        )
        .order_by(Candle.open_time.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_ticks(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    start_time: datetime,
    end_time: datetime,
    limit: int = 10000,
) -> List[Tick]:
    """Get ticks for a symbol within date range."""
    result = await db.execute(
        select(Tick)
        .where(
            and_(
                Tick.symbol_id == symbol_id,
                Tick.timestamp >= start_time,
                Tick.timestamp <= end_time,
            )
        )
        .order_by(Tick.timestamp.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_market_data_source(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    name: str,
    source_type: MarketDataSourceType,
    symbol_id: uuid.UUID,
    description: Optional[str] = None,
    file_path: Optional[str] = None,
    broker_connection_id: Optional[uuid.UUID] = None,
) -> MarketDataSource:
    """Create a new market data source."""
    source = MarketDataSource(
        workspace_id=workspace_id,
        name=name,
        description=description,
        source_type=source_type,
        symbol_id=symbol_id,
        file_path=file_path,
        broker_connection_id=broker_connection_id,
    )
    
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


async def import_from_csv(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    symbol_id: uuid.UUID,
    csv_content: str,
    source_name: str,
    csv_format: str = "mt5",  # mt5, mt4, generic
) -> MarketDataSource:
    """Import market data from CSV file."""
    
    # Create data source
    source = await create_market_data_source(
        db=db,
        workspace_id=workspace_id,
        name=source_name,
        source_type=MarketDataSourceType.CSV_IMPORT,
        symbol_id=symbol_id,
        description=f"CSV import: {source_name}",
    )
    
    # Parse CSV based on format
    if csv_format == "mt5":
        await _import_mt5_csv(db, symbol_id, csv_content, source.id)
    elif csv_format == "mt4":
        await _import_mt4_csv(db, symbol_id, csv_content, source.id)
    else:
        await _import_generic_csv(db, symbol_id, csv_content, source.id)
    
    # Update source statistics
    await _update_source_stats(db, source.id)
    
    await db.refresh(source)
    return source


async def _import_mt5_csv(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    csv_content: str,
    source_id: uuid.UUID,
) -> None:
    """Import MT5 format CSV (Date,Time,Open,High,Low,Close,Volume,TickVol,Spread)."""
    reader = csv.DictReader(io.StringIO(csv_content))
    
    for row in reader:
        try:
            # Parse timestamp (MT5 format: "2023.01.01", "00:00")
            date_str = row["Date"]
            time_str = row["Time"]
            timestamp = datetime.strptime(f"{date_str} {time_str}", "%Y.%m.%d %H:%M")
            timestamp = timestamp.replace(tzinfo=timezone.utc)
            
            # Calculate close_time (next candle or 1 period later)
            close_time = timestamp  # Will be updated based on timeframe
            
            # Parse prices
            open_price = Decimal(row["Open"])
            high_price = Decimal(row["High"])
            low_price = Decimal(row["Low"])
            close_price = Decimal(row["Close"])
            volume = int(row["Volume"]) if row["Volume"] else None
            tick_volume = int(row["TickVol"]) if row["TickVol"] else None
            spread = int(row["Spread"]) if row["Spread"] else None
            
            # Save as M1 candle by default
            candle = Candle(
                symbol_id=symbol_id,
                timeframe="M1",
                open_time=timestamp,
                close_time=close_time,
                open_price=open_price,
                high_price=high_price,
                low_price=low_price,
                close_price=close_price,
                volume=volume,
                tick_volume=tick_volume,
                spread=spread,
                source_id=source_id,
            )
            db.add(candle)
            
        except (ValueError, KeyError) as e:
            # Skip invalid rows
            continue
    
    await db.commit()


async def _import_mt4_csv(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    csv_content: str,
    source_id: uuid.UUID,
) -> None:
    """Import MT4 format CSV (Date,Time,Open,High,Low,Close,Volume)."""
    reader = csv.DictReader(io.StringIO(csv_content))
    
    for row in reader:
        try:
            # Parse timestamp (MT4 format: "2023.01.01", "00:00")
            date_str = row["Date"]
            time_str = row["Time"]
            timestamp = datetime.strptime(f"{date_str} {time_str}", "%Y.%m.%d %H:%M")
            timestamp = timestamp.replace(tzinfo=timezone.utc)
            
            # Parse prices
            open_price = Decimal(row["Open"])
            high_price = Decimal(row["High"])
            low_price = Decimal(row["Low"])
            close_price = Decimal(row["Close"])
            volume = int(row["Volume"]) if row["Volume"] else None
            
            # Save as M1 candle
            candle = Candle(
                symbol_id=symbol_id,
                timeframe="M1",
                open_time=timestamp,
                close_time=timestamp,
                open_price=open_price,
                high_price=high_price,
                low_price=low_price,
                close_price=close_price,
                volume=volume,
                source_id=source_id,
            )
            db.add(candle)
            
        except (ValueError, KeyError) as e:
            # Skip invalid rows
            continue
    
    await db.commit()


async def _import_generic_csv(
    db: AsyncSession,
    symbol_id: uuid.UUID,
    csv_content: str,
    source_id: uuid.UUID,
) -> None:
    """Import generic CSV format (timestamp,open,high,low,close,volume)."""
    reader = csv.DictReader(io.StringIO(csv_content))
    
    for row in reader:
        try:
            # Try different timestamp formats
            timestamp_str = row.get("timestamp") or row.get("time") or row.get("date")
            if not timestamp_str:
                continue
                
            # Try common timestamp formats
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d"):
                try:
                    timestamp = datetime.strptime(timestamp_str, fmt)
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue
            else:
                continue  # Skip if no format matched
            
            # Parse prices
            open_price = Decimal(row["open"])
            high_price = Decimal(row["high"])
            low_price = Decimal(row["low"])
            close_price = Decimal(row["close"])
            volume = int(row["volume"]) if row.get("volume") else None
            
            # Save as M1 candle
            candle = Candle(
                symbol_id=symbol_id,
                timeframe="M1",
                open_time=timestamp,
                close_time=timestamp,
                open_price=open_price,
                high_price=high_price,
                low_price=low_price,
                close_price=close_price,
                volume=volume,
                source_id=source_id,
            )
            db.add(candle)
            
        except (ValueError, KeyError) as e:
            # Skip invalid rows
            continue
    
    await db.commit()


async def _update_source_stats(
    db: AsyncSession,
    source_id: uuid.UUID,
) -> None:
    """Update market data source statistics."""
    
    # Count candles
    candle_result = await db.execute(
        select(func.count(Candle.id))
        .where(Candle.source_id == source_id)
    )
    total_candles = candle_result.scalar() or 0
    
    # Count ticks
    tick_result = await db.execute(
        select(func.count(Tick.id))
        .where(Tick.source_id == source_id)
    )
    total_ticks = tick_result.scalar() or 0
    
    # Get date range
    date_result = await db.execute(
        select(
            func.min(Candle.open_time).label("min_time"),
            func.max(Candle.open_time).label("max_time"),
        )
        .where(Candle.source_id == source_id)
    )
    date_row = date_result.first()
    
    # Update source
    source = await db.get(MarketDataSource, source_id)
    if source:
        source.total_candles = total_candles
        source.total_ticks = total_ticks
        source.date_range_start = date_row.min_time if date_row else None
        source.date_range_end = date_row.max_time if date_row else None
        source.last_import_at = datetime.now(timezone.utc)
        await db.commit()


async def create_replay_session(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    symbol_id: uuid.UUID,
    timeframe: str,
    start_time: datetime,
    end_time: datetime,
    mode: str = "real_time",
    speed: Decimal = Decimal("1.0"),
) -> ReplaySession:
    """Create a new replay session."""
    
    # Count available ticks/candles for the period
    tick_count = await db.execute(
        select(func.count(Tick.id))
        .where(
            and_(
                Tick.symbol_id == symbol_id,
                Tick.timestamp >= start_time,
                Tick.timestamp <= end_time,
            )
        )
    )
    total_ticks = tick_count.scalar() or 0
    
    session = ReplaySession(
        workspace_id=workspace_id,
        user_id=user_id,
        symbol_id=symbol_id,
        timeframe=timeframe,
        mode=mode,
        status=ReplayStatus.CREATED,
        start_time=start_time,
        end_time=end_time,
        current_time=start_time,
        speed=speed,
        total_ticks=total_ticks,
        processed_ticks=0,
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_replay_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    workspace_id: uuid.UUID,
) -> Optional[ReplaySession]:
    """Get replay session by ID."""
    result = await db.execute(
        select(ReplaySession)
        .where(
            and_(
                ReplaySession.id == session_id,
                ReplaySession.workspace_id == workspace_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def list_replay_sessions(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    user_id: Optional[uuid.UUID] = None,
) -> List[ReplaySession]:
    """List replay sessions for workspace."""
    query = select(ReplaySession).where(ReplaySession.workspace_id == workspace_id)
    
    if user_id:
        query = query.where(ReplaySession.user_id == user_id)
    
    query = query.order_by(ReplaySession.created_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_replay_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    workspace_id: uuid.UUID,
    **kwargs: Any,
) -> Optional[ReplaySession]:
    """Update replay session."""
    session = await get_replay_session(db, session_id, workspace_id)
    if not session:
        return None
    
    for key, value in kwargs.items():
        if hasattr(session, key):
            setattr(session, key, value)
    
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


async def delete_replay_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    workspace_id: uuid.UUID,
) -> bool:
    """Delete replay session."""
    session = await get_replay_session(db, session_id, workspace_id)
    if not session:
        return False
    
    await db.delete(session)
    await db.commit()
    return True


async def get_market_data_sources(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    symbol_id: Optional[uuid.UUID] = None,
) -> List[MarketDataSource]:
    """Get market data sources for workspace."""
    query = select(MarketDataSource).where(
        and_(
            MarketDataSource.workspace_id == workspace_id,
            MarketDataSource.is_active == True,
        )
    )
    
    if symbol_id:
        query = query.where(MarketDataSource.symbol_id == symbol_id)
    
    query = query.order_by(MarketDataSource.created_at.desc())
    
    result = await db.execute(query)
    return list(result.scalars().all())
