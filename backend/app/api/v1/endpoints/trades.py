import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace
from app.schemas.trade import TradeCreate, TradeUpdate, TradeResponse

router = APIRouter()


def create_trade_response(trade: Trade) -> TradeResponse:
    """Create TradeResponse from Trade model."""
    return TradeResponse(
        id=str(trade.id),
        date=trade.date,
        year=trade.year,
        month=trade.month,
        pair=trade.pair,
        direction=trade.direction,
        lots=float(trade.lots) if trade.lots else None,
        result=trade.result,
        pnl=float(trade.pnl),
        has_vm=trade.has_vm,
        vm_lots=float(trade.vm_lots) if trade.vm_lots else None,
        vm_result=trade.vm_result,
        vm_pnl=float(trade.vm_pnl),
        screenshot_url=trade.screenshot_url,
        notes=trade.notes,
        account_id=str(trade.account_id),
        created_at=trade.created_at
    )


def update_account_balance(db: Session, account_id: str):
    """Recalculate account balance based on all trades."""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return
    
    # Calculate total PnL from all trades
    trades = db.query(Trade).filter(Trade.account_id == account_id).all()
    total_pnl = 0.0
    
    for trade in trades:
        trade_pnl = float(trade.pnl)
        if trade.has_vm and trade.vm_pnl:
            trade_pnl += float(trade.vm_pnl)
        total_pnl += trade_pnl
    
    # Update balance
    account.balance = float(account.initial_balance) + total_pnl
    account.updated_at = datetime.utcnow()
    db.commit()


@router.get("", response_model=List[TradeResponse])
def get_trades(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get trades with optional filters."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    
    # Build query
    query = db.query(Trade).filter(Trade.workspace_id == workspace.id)
    
    # Apply filters
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    
    if year:
        query = query.filter(Trade.year == year)
    
    if month:
        query = query.filter(Trade.month == month)
    
    # Apply pagination
    trades = query.offset(skip).limit(limit).all()
    
    return [create_trade_response(trade) for trade in trades]


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
        direction=trade_data.direction,
        lots=trade_data.lots,
        result=trade_data.result,
        pnl=trade_data.pnl,
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


@router.get("/{trade_id}", response_model=TradeResponse)
def get_trade(
    trade_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Get specific trade."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Find trade
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
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Find trade
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
    
    # Store old PnL to check if balance needs recalculation
    old_pnl = float(trade.pnl)
    old_vm_pnl = float(trade.vm_pnl) if trade.vm_pnl else 0.0
    
    # Update fields
    update_data = trade_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trade, field, value)
    
    # Update year/month if date changed
    if update_data.get("date"):
        trade.year = trade.date.year
        trade.month = trade.date.month
    
    trade.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(trade)
    
    # Check if PnL changed and recalculate balance
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
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Find trade
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
    
    # Update account balance
    update_account_balance(db, account_id)
    
    return {"message": "Trade removido"}


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
