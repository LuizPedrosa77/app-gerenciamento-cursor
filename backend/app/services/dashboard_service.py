"""
Dashboard and reporting service for trading analytics.
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, case, cast, Date, extract, func, literal, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models import Trade, TradingAccount


async def summary(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Get trading summary with key metrics.
    
    Returns:
        - total_trades: Total number of trades
        - wins: Number of winning trades
        - losses: Number of losing trades
        - win_rate: Win rate percentage
        - gross_pnl: Gross P&L (without commissions)
        - net_pnl: Net P&L (with commissions)
        - total_commission: Total commission paid
        - best_trade: Best trade (highest profit)
        - worst_trade: Worst trade (highest loss)
        - avg_trade: Average trade P&L
    """
    # Build date filter
    date_filter = _build_date_filter(year, month)
    
    # Base query for trades
    trades_query = (
        select(Trade)
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
    )
    
    # Execute query
    result = await db.execute(trades_query)
    trades = result.scalars().all()
    
    if not trades:
        return {
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "gross_pnl": 0.0,
            "net_pnl": 0.0,
            "total_commission": 0.0,
            "best_trade": 0.0,
            "worst_trade": 0.0,
            "avg_trade": 0.0,
        }
    
    # Calculate metrics
    total_trades = len(trades)
    wins = sum(1 for trade in trades if trade.profit > 0)
    losses = total_trades - wins
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0.0
    
    gross_pnl = sum(float(trade.profit) for trade in trades)
    total_commission = sum(float(trade.commission or 0) for trade in trades)
    net_pnl = gross_pnl - total_commission
    
    profits = [float(trade.profit) for trade in trades if trade.profit > 0]
    losses_list = [float(trade.profit) for trade in trades if trade.profit < 0]
    
    best_trade = max(profits) if profits else 0.0
    worst_trade = min(losses_list) if losses_list else 0.0
    avg_trade = net_pnl / total_trades if total_trades > 0 else 0.0
    
    return {
        "total_trades": total_trades,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 2),
        "gross_pnl": round(gross_pnl, 2),
        "net_pnl": round(net_pnl, 2),
        "total_commission": round(total_commission, 2),
        "best_trade": round(best_trade, 2),
        "worst_trade": round(worst_trade, 2),
        "avg_trade": round(avg_trade, 2),
    }


async def pnl_by_month(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    year: int,
) -> List[Dict[str, Any]]:
    """
    Get P&L breakdown by month for a given year.
    
    Returns list of months with:
        - month: Month number (1-12)
        - month_name: Month name
        - trades: Number of trades
        - pnl: Net P&L for the month
        - commission: Total commission
    """
    # Query monthly P&L
    monthly_query = (
        select(
            extract('month', Trade.open_time).label('month'),
            func.count(Trade.id).label('trades'),
            func.sum(Trade.profit).label('pnl'),
            func.sum(Trade.commission).label('commission'),
        )
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                extract('year', Trade.open_time) == year,
            )
        )
        .group_by(extract('month', Trade.open_time))
        .order_by('month')
    )
    
    result = await db.execute(monthly_query)
    monthly_data = result.all()
    
    # Format response with all months
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    
    response = []
    for month_num in range(1, 13):
        month_data = next(
            (row for row in monthly_data if row.month == month_num),
            None
        )
        
        response.append({
            "month": month_num,
            "month_name": month_names[month_num - 1],
            "trades": month_data.trades if month_data else 0,
            "pnl": float(month_data.pnl) if month_data else 0.0,
            "commission": float(month_data.commission or 0) if month_data else 0.0,
        })
    
    return response


async def pnl_by_pair(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Get P&L breakdown by currency pair.
    
    Returns list of pairs with:
        - symbol: Currency pair (EUR/USD, GBP/JPY, etc.)
        - trades: Number of trades
        - pnl: Net P&L for the pair
        - win_rate: Win rate for the pair
    """
    # Build date filter
    date_filter = _build_date_range_filter(start_date, end_date)
    
    # Query by symbol
    symbol_query = (
        select(
            Trade.symbol,
            func.count(Trade.id).label('trades'),
            func.sum(Trade.profit).label('pnl'),
            func.sum(Trade.commission).label('commission'),
        )
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
        .group_by(Trade.symbol)
        .order_by(func.sum(Trade.profit).desc())
    )
    
    result = await db.execute(symbol_query)
    symbol_data = result.all()
    
    response = []
    for row in symbol_data:
        # Calculate win rate for this symbol
        win_rate_query = (
            select(
                func.count(
                    case(
                        (Trade.profit > 0, 1),
                        else_=None
                    )
                ).label('wins')
            )
            .where(
                and_(
                    Trade.workspace_id == workspace_id,
                    Trade.account_id == account_id,
                    Trade.symbol == row.symbol,
                    date_filter
                )
            )
        )
        
        win_rate_result = await db.execute(win_rate_query)
        wins = win_rate_result.scalar() or 0
        win_rate = (wins / row.trades * 100) if row.trades > 0 else 0.0
        
        response.append({
            "symbol": row.symbol,
            "trades": row.trades,
            "pnl": float(row.pnl) - float(row.commission or 0),
            "win_rate": round(win_rate, 2),
        })
    
    return response


async def pnl_by_weekday(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Get P&L breakdown by day of week.
    
    Returns list of weekdays (0=Monday to 6=Sunday) with:
        - weekday: Day number (0-6)
        - weekday_name: Day name
        - trades: Number of trades
        - pnl: Net P&L for the weekday
        - win_rate: Win rate for the weekday
    """
    # Build date filter
    date_filter = _build_date_range_filter(start_date, end_date)
    
    # Query by weekday
    weekday_query = (
        select(
            extract('dow', Trade.open_time).label('weekday'),
            func.count(Trade.id).label('trades'),
            func.sum(Trade.profit).label('pnl'),
            func.sum(Trade.commission).label('commission'),
        )
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
        .group_by(extract('dow', Trade.open_time))
        .order_by('weekday')
    )
    
    result = await db.execute(weekday_query)
    weekday_data = result.all()
    
    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    response = []
    for day_num in range(7):
        day_data = next(
            (row for row in weekday_data if row.weekday == day_num),
            None
        )
        
        response.append({
            "weekday": day_num,
            "weekday_name": weekday_names[day_num],
            "trades": day_data.trades if day_data else 0,
            "pnl": float(day_data.pnl) - float(day_data.commission or 0) if day_data else 0.0,
        })
    
    return response


async def pnl_by_week_of_month(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Get P&L breakdown by week of month.
    
    Returns list of weeks (1-5) with:
        - week: Week number (1-5)
        - trades: Number of trades
        - pnl: Net P&L for the week
    """
    # Build date filter
    date_filter = _build_date_filter(year, month)
    
    # Query by week of month
    week_query = (
        select(
            (extract('day', Trade.open_time) / 7 + 1).label('week'),
            func.count(Trade.id).label('trades'),
            func.sum(Trade.profit).label('pnl'),
            func.sum(Trade.commission).label('commission'),
        )
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
        .group_by((extract('day', Trade.open_time) / 7 + 1))
        .order_by('week')
    )
    
    result = await db.execute(week_query)
    week_data = result.all()
    
    response = []
    for week_num in range(1, 6):
        week_data_row = next(
            (row for row in week_data if int(row.week) == week_num),
            None
        )
        
        response.append({
            "week": week_num,
            "trades": week_data_row.trades if week_data_row else 0,
            "pnl": float(week_data_row.pnl) - float(week_data_row.commission or 0) if week_data_row else 0.0,
        })
    
    return response


async def pnl_by_direction(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Get P&L breakdown by trade direction (BUY/SELL).
    
    Returns list with:
        - direction: 'BUY' or 'SELL'
        - trades: Number of trades
        - pnl: Net P&L for the direction
        - win_rate: Win rate for the direction
    """
    # Build date filter
    date_filter = _build_date_range_filter(start_date, end_date)
    
    # Query by direction
    direction_query = (
        select(
            Trade.side,
            func.count(Trade.id).label('trades'),
            func.sum(Trade.profit).label('pnl'),
            func.sum(Trade.commission).label('commission'),
        )
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
        .group_by(Trade.side)
        .order_by(Trade.side)
    )
    
    result = await db.execute(direction_query)
    direction_data = result.all()
    
    response = []
    for row in direction_data:
        # Calculate win rate for this direction
        win_rate_query = (
            select(
                func.count(
                    case(
                        (Trade.profit > 0, 1),
                        else_=None
                    )
                ).label('wins')
            )
            .where(
                and_(
                    Trade.workspace_id == workspace_id,
                    Trade.account_id == account_id,
                    Trade.side == row.side,
                    date_filter
                )
            )
        )
        
        win_rate_result = await db.execute(win_rate_query)
        wins = win_rate_result.scalar() or 0
        win_rate = (wins / row.trades * 100) if row.trades > 0 else 0.0
        
        response.append({
            "direction": row.side,
            "trades": row.trades,
            "pnl": float(row.pnl) - float(row.commission or 0),
            "win_rate": round(win_rate, 2),
        })
    
    # Ensure both directions are present
    directions = [r["direction"] for r in response]
    if "BUY" not in directions:
        response.append({"direction": "BUY", "trades": 0, "pnl": 0.0, "win_rate": 0.0})
    if "SELL" not in directions:
        response.append({"direction": "SELL", "trades": 0, "pnl": 0.0, "win_rate": 0.0})
    
    return response


async def top_trades(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    limit: int = 10,
    trade_type: str = "profit",  # "profit" or "loss"
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Get top trades by profit or loss.
    
    Returns list of trades with:
        - id: Trade ID
        - symbol: Currency pair
        - side: BUY or SELL
        - open_time: Trade open time
        - close_time: Trade close time
        - profit: Trade profit
        - commission: Trade commission
        - net_pnl: Net P&L (profit - commission)
    """
    # Build date filter
    date_filter = _build_date_range_filter(start_date, end_date)
    
    # Determine order direction
    order_column = Trade.profit.desc() if trade_type == "profit" else Trade.profit.asc()
    
    # Query top trades
    trades_query = (
        select(Trade)
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
        .order_by(order_column)
        .limit(limit)
    )
    
    result = await db.execute(trades_query)
    trades = result.scalars().all()
    
    response = []
    for trade in trades:
        response.append({
            "id": str(trade.id),
            "symbol": trade.symbol,
            "side": trade.side,
            "open_time": trade.open_time,
            "close_time": trade.close_time,
            "profit": float(trade.profit),
            "commission": float(trade.commission or 0),
            "net_pnl": float(trade.profit) - float(trade.commission or 0),
        })
    
    return response


async def account_evolution(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    year: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Get account balance evolution over time.
    
    Returns list of daily snapshots with:
        - date: Date
        - balance: Account balance
        - cumulative_pnl: Cumulative P&L for the period
        - trades: Cumulative number of trades
    """
    # Build date filter
    date_filter = _build_date_filter(year)
    
    # Get trades ordered by date
    trades_query = (
        select(Trade)
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                date_filter
            )
        )
        .order_by(Trade.open_time)
    )
    
    result = await db.execute(trades_query)
    trades = result.scalars().all()
    
    # Get initial balance
    account_query = select(TradingAccount).where(
        and_(
            TradingAccount.workspace_id == workspace_id,
            TradingAccount.id == account_id,
        )
    )
    account_result = await db.execute(account_query)
    account = account_result.scalar_one_or_none()
    
    initial_balance = float(account.initial_balance) if account else 0.0
    
    # Build daily evolution
    daily_data = {}
    cumulative_pnl = 0.0
    cumulative_trades = 0
    
    for trade in trades:
        trade_date = trade.open_time.date()
        pnl = float(trade.profit) - float(trade.commission or 0)
        
        if trade_date not in daily_data:
            daily_data[trade_date] = {
                "date": trade_date.isoformat(),
                "balance": initial_balance + cumulative_pnl,
                "cumulative_pnl": cumulative_pnl,
                "trades": cumulative_trades,
            }
        
        cumulative_pnl += pnl
        cumulative_trades += 1
        
        # Update end of day balance
        daily_data[trade_date]["balance"] = initial_balance + cumulative_pnl
        daily_data[trade_date]["cumulative_pnl"] = cumulative_pnl
        daily_data[trade_date]["trades"] = cumulative_trades
    
    # Sort by date and convert to list
    response = sorted(daily_data.values(), key=lambda x: x["date"])
    
    return response


async def weekly_report(
    db: AsyncSession,
    workspace_id: str,
    account_id: str,
    year: int,
    week: int,
) -> Dict[str, Any]:
    """
    Get detailed weekly report for a specific week.
    
    Returns comprehensive weekly data including:
        - week_info: Week number and date range
        - summary: Weekly summary metrics
        - daily_breakdown: Daily P&L for the week
        - top_trades: Top 5 trades for the week
        - by_pair: P&L by pair for the week
    """
    # Calculate week date range
    start_date = datetime.strptime(f"{year}-W{week:02d}-1", "%Y-W%W-%w")
    end_date = start_date + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Get weekly summary
    summary_data = await summary(db, workspace_id, account_id, year, None)
    
    # Get daily breakdown for the week
    daily_query = (
        select(
            cast(Trade.open_time, Date).label('date'),
            func.count(Trade.id).label('trades'),
            func.sum(Trade.profit).label('pnl'),
            func.sum(Trade.commission).label('commission'),
        )
        .where(
            and_(
                Trade.workspace_id == workspace_id,
                Trade.account_id == account_id,
                Trade.open_time >= start_date,
                Trade.open_time <= end_date,
            )
        )
        .group_by(cast(Trade.open_time, Date))
        .order_by('date')
    )
    
    daily_result = await db.execute(daily_query)
    daily_data = []
    
    for row in daily_result:
        daily_data.append({
            "date": row.date.isoformat(),
            "trades": row.trades,
            "pnl": float(row.pnl) - float(row.commission or 0),
        })
    
    # Get top trades for the week
    top_trades_data = await top_trades(
        db, workspace_id, account_id, 5, "profit", start_date, end_date
    )
    
    # Get P&L by pair for the week
    pair_data = await pnl_by_pair(db, workspace_id, account_id, start_date, end_date)
    
    return {
        "week_info": {
            "year": year,
            "week": week,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "summary": summary_data,
        "daily_breakdown": daily_data,
        "top_trades": top_trades_data,
        "by_pair": pair_data,
    }


def _build_date_filter(
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> Any:
    """Build date filter for year/month combination."""
    if year and month:
        return and_(
            extract('year', Trade.open_time) == year,
            extract('month', Trade.open_time) == month,
        )
    elif year:
        return extract('year', Trade.open_time) == year
    else:
        return literal(True)


def _build_date_range_filter(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Any:
    """Build date filter for date range."""
    conditions = []
    
    if start_date:
        conditions.append(Trade.open_time >= start_date)
    
    if end_date:
        conditions.append(Trade.open_time <= end_date)
    
    if conditions:
        return and_(*conditions)
    else:
        return literal(True)
