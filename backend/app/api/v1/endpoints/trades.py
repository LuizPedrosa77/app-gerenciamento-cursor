import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace
from app.schemas.trade import TradeCreate, TradeUpdate, TradeResponse

router = APIRouter()
 

def normalize_symbol_pair(value: Optional[str]) -> str:
    if not value:
        return ""
    raw = value.upper().replace(" ", "")
    raw = raw.split(":")[-1]
    if "/" in raw:
        left, right = raw.split("/", 1)
        return f"{left}/{right}"
    if len(raw) == 6 and raw[:3].isalpha() and raw[3:].isalpha():
        return f"{raw[:3]}/{raw[3:]}"
    if len(raw) == 7 and raw.startswith("XAU"):
        return "XAU/USD"
    if len(raw) == 7 and raw.startswith("XAG"):
        return "XAG/USD"
    return raw


def create_trade_response(trade: Trade) -> TradeResponse:
    """Create TradeResponse from Trade model."""
    return TradeResponse(
        id=str(trade.id),
        date=trade.date,
        year=trade.year,
        month=trade.month,
        pair=trade.pair,
        symbol_raw=trade.symbol_raw,
        symbol_normalized=trade.symbol_normalized,
        ticket=trade.ticket,
        direction=trade.direction,
        lots=float(trade.lots) if trade.lots else None,
        result=trade.result,
        pnl=float(trade.pnl),
        open_time=trade.open_time,
        close_time=trade.close_time,
        open_price=float(trade.open_price) if trade.open_price is not None else None,
        close_price=float(trade.close_price) if trade.close_price is not None else None,
        has_vm=trade.has_vm,
        vm_lots=float(trade.vm_lots) if trade.vm_lots else None,
        vm_result=trade.vm_result,
        vm_pnl=float(trade.vm_pnl),
        screenshot_url=trade.screenshot_url,
        screenshots=trade.screenshots,
        notes=trade.notes,
        account_id=str(trade.account_id),
        created_at=trade.created_at
    )


def update_account_balance(db: Session, account_id: str):
    """Recalculate account balance based on all trades using DB SUM."""
    from sqlalchemy.sql import func
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return
    
    total_pnl = db.query(func.sum(Trade.pnl)).filter(Trade.account_id == account_id).scalar() or 0.0
    total_vm_pnl = db.query(func.sum(Trade.vm_pnl)).filter(
        Trade.account_id == account_id, Trade.has_vm == True
    ).scalar() or 0.0
    
    # Update balance
    account.balance = float(account.initial_balance) + float(total_pnl) + float(total_vm_pnl)
    account.updated_at = datetime.utcnow()
    db.commit()


class PaginatedTrades(BaseModel):
    items: List[TradeResponse]
    total: int

@router.get("", response_model=PaginatedTrades)
def get_trades(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50)
):
    """Get trades with optional filters and pagination."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return {"items": [], "total": 0}
    
    # Build query
    query = db.query(Trade).filter(Trade.workspace_id == workspace.id)
    
    # Apply filters
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    
    if year and month:
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)
        # Prefer date-based filtering to avoid legacy month field inconsistencies.
        query = query.filter(Trade.date >= start, Trade.date < end)
    else:
        if year:
            query = query.filter(Trade.year == year)
        if month:
            query = query.filter(Trade.month == month)

    if start_date:
        query = query.filter(Trade.date >= start_date)
    if end_date:
        query = query.filter(Trade.date <= end_date)
        
    total = query.count()
    
    trades = query.order_by(Trade.date.desc()).offset(skip).limit(limit).all()
    return {
        "items": [create_trade_response(trade) for trade in trades],
        "total": total
    }


@router.post("", response_model=TradeResponse)
def create_trade(
    trade_data: TradeCreate,
    current_user: CurrentUser,
    db: DbSession
):
    """Create new trade."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Verify account belongs to workspace
    account = db.query(Account).filter(
        and_(
            Account.id == trade_data.account_id,
            Account.workspace_id == workspace.id
        )
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Create trade
    trade = Trade(
        account_id=trade_data.account_id,
        workspace_id=workspace.id,
        date=trade_data.date,
        year=trade_data.date.year,
        month=trade_data.date.month,
        pair=trade_data.pair,
        symbol_raw=trade_data.symbol_raw or trade_data.pair,
        symbol_normalized=trade_data.symbol_normalized or normalize_symbol_pair(trade_data.pair),
        ticket=trade_data.ticket,
        direction=trade_data.direction,
        lots=trade_data.lots,
        result=trade_data.result,
        pnl=trade_data.pnl,
        open_time=trade_data.open_time,
        close_time=trade_data.close_time,
        open_price=trade_data.open_price,
        close_price=trade_data.close_price,
        has_vm=trade_data.has_vm,
        vm_lots=trade_data.vm_lots,
        vm_result=trade_data.vm_result,
        vm_pnl=trade_data.vm_pnl,
        notes=trade_data.notes
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    
    # Update account balance
    update_account_balance(db, trade_data.account_id)
    
    return create_trade_response(trade)


@router.get("/chart-data")
def get_trades_chart_data(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(None),
    pair: Optional[str] = Query(None, description="Paridade (ex: XAU/USD ou XAUUSD)"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(3000, ge=1, le=20000),
):
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return {"items": [], "total": 0}

    query = db.query(Trade).filter(Trade.workspace_id == workspace.id)
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    if start_date:
        query = query.filter(Trade.date >= start_date)
    if end_date:
        query = query.filter(Trade.date <= end_date)
    if pair:
        normalized = normalize_symbol_pair(pair)
        query = query.filter(
            (Trade.pair == pair)
            | (Trade.symbol_raw == pair)
            | (Trade.symbol_normalized == normalized)
            | (Trade.pair == normalized)
        )

    total = query.count()
    items = query.order_by(Trade.close_time.desc(), Trade.date.desc()).limit(limit).all()
    return {"items": [create_trade_response(t) for t in items], "total": total}


@router.delete("/bulk")
def bulk_delete_trades(
    current_user: CurrentUser,
    db: DbSession,
    account_id: str = Query(..., description="ID da conta para deletar todos os trades")
):
    """Deleta todos os trades de uma conta específica."""
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )

    deleted = db.query(Trade).filter(
        Trade.account_id == account_id
    ).delete(synchronize_session=False)

    db.commit()

    # Recalculate account balance after bulk delete
    update_account_balance(db, account_id)

    return {"message": f"{deleted} trades removidos", "deleted": deleted}


@router.delete("")
def delete_trades(
    trade_ids: dict,
    current_user: CurrentUser,
    db: DbSession
):
    """Delete multiple trades."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    ids_to_delete = trade_ids.get("trade_ids", [])
    if not ids_to_delete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum trade ID fornecido"
        )
    
    # Find trades to delete
    trades = db.query(Trade).filter(
        and_(
            Trade.id.in_(ids_to_delete),
            Trade.workspace_id == workspace.id
        )
    ).all()
    
    if not trades:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum trade encontrado"
        )
    
    # Get unique account IDs for balance recalculation
    account_ids = set(str(trade.account_id) for trade in trades)
    
    # Delete trades
    for trade in trades:
        db.delete(trade)
    
    db.commit()
    
    # Update balances for all affected accounts
    for account_id in account_ids:
        update_account_balance(db, account_id)
    
    return {"message": f"{len(trades)} trades removidos"}


@router.get("/stats")
def get_trades_stats(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return {}
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    if year:
        query = query.filter(Trade.year == year)
    if month:
        query = query.filter(Trade.month == month)
    trades = query.all()
    total = len(trades)
    wins = len([t for t in trades if float(t.pnl or 0) > 0])
    losses = total - wins
    pnl = sum(float(t.pnl or 0) for t in trades)
    win_rate = (wins / total * 100) if total > 0 else 0
    best = max((float(t.pnl or 0) for t in trades), default=0)
    worst = min((float(t.pnl or 0) for t in trades), default=0)
    avg = pnl / total if total > 0 else 0
    return {
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(pnl, 2),
        "avg_pnl": round(avg, 2),
        "best_trade": round(best, 2),
        "worst_trade": round(worst, 2)
    }


@router.get("/by-pair")
def get_trades_by_pair(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    if year:
        query = query.filter(Trade.year == year)
    if month:
        query = query.filter(Trade.month == month)
    trades = query.all()
    data = {}
    for t in trades:
        p = t.pair or "N/A"
        if p not in data:
            data[p] = {"pnl": 0, "trades": 0, "wins": 0}
        data[p]["pnl"] += float(t.pnl or 0)
        data[p]["trades"] += 1
        if float(t.pnl or 0) > 0:
            data[p]["wins"] += 1
    return [
        {
            "pair": k,
            "pnl": round(v["pnl"], 2),
            "trades": v["trades"],
            "win_rate": round(v["wins"] / v["trades"] * 100, 2) if v["trades"] > 0 else 0
        }
        for k, v in sorted(data.items(), key=lambda x: x[1]["pnl"], reverse=True)
    ]


@router.get("/by-weekday")
def get_trades_by_weekday(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    if year:
        query = query.filter(Trade.year == year)
    if month:
        query = query.filter(Trade.month == month)
    trades = query.all()
    days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    data = {i: {"pnl": 0, "trades": 0, "wins": 0} for i in range(7)}
    for t in trades:
        if t.date:
            wd = t.date.weekday()
            data[wd]["pnl"] += float(t.pnl or 0)
            data[wd]["trades"] += 1
            if float(t.pnl or 0) > 0:
                data[wd]["wins"] += 1
    return [
        {
            "weekday": i,
            "weekday_name": days[i],
            "pnl": round(data[i]["pnl"], 2),
            "trades": data[i]["trades"],
            "win_rate": round(data[i]["wins"] / data[i]["trades"] * 100, 2) if data[i]["trades"] > 0 else 0
        }
        for i in range(7)
    ]


@router.get("/by-direction")
def get_trades_by_direction(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    trades = query.all()
    data = {}
    for t in trades:
        d = t.direction or "N/A"
        if d not in data:
            data[d] = {"pnl": 0, "trades": 0, "wins": 0}
        data[d]["pnl"] += float(t.pnl or 0)
        data[d]["trades"] += 1
        if float(t.pnl or 0) > 0:
            data[d]["wins"] += 1
    return [
        {
            "direction": k,
            "pnl": round(v["pnl"], 2),
            "trades": v["trades"],
            "win_rate": round(v["wins"] / v["trades"] * 100, 2) if v["trades"] > 0 else 0
        }
        for k, v in data.items()
    ]


@router.get("/top")
def get_top_trades(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(default=None),
    limit: int = Query(default=5)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    trades = query.order_by(Trade.pnl.desc()).limit(limit).all()
    return [
        {
            "id": str(t.id),
            "date": str(t.date),
            "pair": t.pair,
            "direction": t.direction,
            "pnl": round(float(t.pnl or 0), 2),
            "result": t.result
        }
        for t in trades
    ]


@router.get("/worst")
def get_worst_trades(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(default=None),
    limit: int = Query(default=5)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Trade.account_id == account_id)
        for t in trades
    ]


@router.get("/{trade_id}", response_model=TradeResponse)
def get_trade(
    trade_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Get specific trade."""
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )

    trade = db.query(Trade).filter(
        and_(
            Trade.id == trade_id,
            Trade.workspace_id == workspace.id
        )
    ).first()

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade não encontrado"
        )

    return create_trade_response(trade)


@router.patch("/{trade_id}", response_model=TradeResponse)
def update_trade(
    trade_id: str,
    trade_data: TradeUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """Update trade."""
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )

    trade = db.query(Trade).filter(
        and_(
            Trade.id == trade_id,
            Trade.workspace_id == workspace.id
        )
    ).first()

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade não encontrado"
        )

    old_pnl = float(trade.pnl)
    old_vm_pnl = float(trade.vm_pnl) if trade.vm_pnl else 0.0

    update_data = trade_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trade, field, value)

    if update_data.get("date"):
        trade.year = trade.date.year
        trade.month = trade.date.month

    trade.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trade)

    new_pnl = float(trade.pnl)
    new_vm_pnl = float(trade.vm_pnl) if trade.vm_pnl else 0.0

    if old_pnl != new_pnl or old_vm_pnl != new_vm_pnl:
        update_account_balance(db, str(trade.account_id))

    return create_trade_response(trade)


@router.delete("/{trade_id}")
def delete_trade(
    trade_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Delete trade."""
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )

    trade = db.query(Trade).filter(
        and_(
            Trade.id == trade_id,
            Trade.workspace_id == workspace.id
        )
    ).first()

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade não encontrado"
        )

    account_id = str(trade.account_id)
    db.delete(trade)
    db.commit()
    update_account_balance(db, account_id)

    return {"message": "Trade removido"}
