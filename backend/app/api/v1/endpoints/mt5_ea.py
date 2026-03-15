import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace

router = APIRouter()


# Pydantic models for request/response
class TradeData(BaseModel):
    ticket: int
    symbol: str
    type: str  # BUY ou SELL
    volume: float
    profit: float
    open_time: str
    close_time: Optional[str] = None
    open_price: float
    close_price: Optional[float] = None
    is_open: bool = False


class PositionData(BaseModel):
    ticket: int
    symbol: str
    type: str  # BUY ou SELL
    volume: float
    profit: float
    open_time: str
    open_price: float


class SyncRequest(BaseModel):
    email: str
    account_login: str
    account_name: str
    server: str
    balance: float
    equity: Optional[float] = None
    trades: List[TradeData]
    positions: List[PositionData]


class OpenRequest(BaseModel):
    email: str
    account_login: str
    server: str
    ticket: int
    symbol: str
    type: str  # BUY ou SELL
    volume: float
    open_price: float
    open_time: str
    balance: float
    equity: Optional[float] = None


class CloseRequest(BaseModel):
    email: str
    account_login: str
    server: str
    ticket: int
    symbol: str
    type: str  # BUY ou SELL
    volume: float
    profit: float
    open_time: str
    close_time: str
    open_price: float
    close_price: float
    balance: float
    equity: Optional[float] = None


def parse_datetime(dt_str: str) -> datetime:
    """Parse datetime string from MT5 format (YYYY.MM.DD HH:MM:SS)"""
    try:
        return datetime.strptime(dt_str, "%Y.%m.%d %H:%M:%S")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de data inválido: {dt_str}. Use formato: YYYY.MM.DD HH:MM:SS"
        )


def get_or_create_workspace(db: Session, user_id: str) -> Workspace:
    """Get or create workspace for user"""
    workspace = db.query(Workspace).filter(Workspace.owner_id == user_id).first()
    if not workspace:
        workspace = Workspace(
            name=f"Workspace {datetime.now().strftime('%Y-%m-%d')}",
            owner_id=user_id
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    return workspace


def get_account_by_credentials(db: Session, workspace_id: str, broker_login: str, broker_server: str) -> Optional[Account]:
    """Get account by broker login and server"""
    return db.query(Account).filter(
        and_(
            Account.broker_login == broker_login,
            Account.broker_server == broker_server,
            Account.workspace_id == workspace_id
        )
    ).first()


def create_trade_from_data(db: Session, account_id: str, workspace_id: str, trade_data: TradeData) -> Trade:
    """Create trade from trade data"""
    close_dt = parse_datetime(trade_data.close_time) if trade_data.close_time else None
    open_dt = parse_datetime(trade_data.open_time)
    
    # Calculate year and month from close time or open time
    if close_dt:
        year = close_dt.year
        month = close_dt.month
        trade_date = close_dt.date()
    else:
        year = open_dt.year
        month = open_dt.month
        trade_date = open_dt.date()
    
    # Determine result
    result = "WIN" if trade_data.profit > 0 else "LOSS" if trade_data.profit < 0 else "BE"
    
    trade = Trade(
        account_id=account_id,
        workspace_id=workspace_id,
        date=trade_date,
        year=year,
        month=month,
        pair=trade_data.symbol,
        direction=trade_data.type,
        lots=trade_data.volume,
        result=result,
        pnl=trade_data.profit,
        notes=f"Ticket: {trade_data.ticket}"
    )
    
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def find_trade_by_ticket(db: Session, account_id: str, ticket: int) -> Optional[Trade]:
    """Find trade by ticket in notes"""
    return db.query(Trade).filter(
        and_(
            Trade.account_id == account_id,
            Trade.notes.like(f"%Ticket: {ticket}%")
        )
    ).first()


@router.post("/sync")
def sync_account(
    sync_data: SyncRequest,
    db: Session = Depends(get_db)
):
    """Sync account data from MT5 EA"""
    
    # 1. Find user by email
    user = db.query(User).filter(User.email == sync_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # 2. Get or create workspace
    workspace = get_or_create_workspace(db, str(user.id))
    
    # 3. Find or create account
    account = get_account_by_credentials(db, str(workspace.id), sync_data.account_login, sync_data.server)
    
    if not account:
        # Create new account
        account = Account(
            workspace_id=workspace.id,
            name=sync_data.account_name,
            broker_type="MT5",
            broker_login=sync_data.account_login,
            broker_server=sync_data.server,
            initial_balance=sync_data.balance,
            balance=sync_data.balance
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        created_new_account = True
    else:
        # Update existing account
        account.balance = sync_data.balance
        if sync_data.equity is not None:
            # Note: Account model doesn't have equity field, but we can store it in notes
            current_notes = account.notes or ""
            if "equity:" in current_notes:
                # Update existing equity
                parts = current_notes.split(";")
                new_parts = []
                for part in parts:
                    if not part.startswith("equity:"):
                        new_parts.append(part)
                new_parts.append(f"equity:{sync_data.equity}")
                account.notes = ";".join(new_parts)
            else:
                account.notes = f"{current_notes};equity:{sync_data.equity}" if current_notes else f"equity:{sync_data.equity}"
        
        account.updated_at = datetime.utcnow()
        db.commit()
        created_new_account = False
    
    # 4. Process trades
    imported_count = 0
    updated_count = 0
    
    for trade_data in sync_data.trades:
        if not trade_data.is_open:  # Only process closed trades
            # Check for duplicate
            existing_trade = find_trade_by_ticket(db, str(account.id), trade_data.ticket)
            
            if not existing_trade:
                # Create new trade
                create_trade_from_data(db, str(account.id), str(workspace.id), trade_data)
                imported_count += 1
            else:
                # Update existing trade
                existing_trade.pnl = trade_data.profit
                existing_trade.result = "WIN" if trade_data.profit > 0 else "LOSS" if trade_data.profit < 0 else "BE"
                existing_trade.updated_at = datetime.utcnow()
                db.commit()
                updated_count += 1
    
    return {
        "success": True,
        "imported": imported_count,
        "updated": updated_count,
        "account_id": str(account.id),
        "balance": float(account.balance),
        "new_account_created": created_new_account
    }


@router.post("/open")
def open_position(
    open_data: OpenRequest,
    db: Session = Depends(get_db)
):
    """Handle position opening from MT5 EA"""
    
    # 1. Find user by email
    user = db.query(User).filter(User.email == open_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # 2. Get workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # 3. Find account
    account = get_account_by_credentials(db, str(workspace.id), open_data.account_login, open_data.server)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada. Execute o sync primeiro."
        )
    
    # 4. Update account balance
    account.balance = open_data.balance
    account.updated_at = datetime.utcnow()
    if open_data.equity is not None:
        current_notes = account.notes or ""
        if "equity:" in current_notes:
            parts = current_notes.split(";")
            new_parts = []
            for part in parts:
                if not part.startswith("equity:"):
                    new_parts.append(part)
            new_parts.append(f"equity:{open_data.equity}")
            account.notes = ";".join(new_parts)
        else:
            account.notes = f"{current_notes};equity:{open_data.equity}" if current_notes else f"equity:{open_data.equity}"
    
    db.commit()
    
    return {
        "success": True,
        "message": "Posição aberta registrada",
        "ticket": open_data.ticket,
        "account_id": str(account.id)
    }


@router.post("/close")
def close_position(
    close_data: CloseRequest,
    db: Session = Depends(get_db)
):
    """Handle position closing from MT5 EA"""
    
    # 1. Find user by email
    user = db.query(User).filter(User.email == close_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # 2. Get workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # 3. Find account
    account = get_account_by_credentials(db, str(workspace.id), close_data.account_login, close_data.server)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # 4. Check if trade already exists
    existing_trade = find_trade_by_ticket(db, str(account.id), close_data.ticket)
    
    if not existing_trade:
        # Create new trade
        close_dt = parse_datetime(close_data.close_time)
        open_dt = parse_datetime(close_data.open_time)
        
        trade = Trade(
            account_id=str(account.id),
            workspace_id=str(workspace.id),
            date=close_dt.date(),
            year=close_dt.year,
            month=close_dt.month,
            pair=close_data.symbol,
            direction=close_data.type,
            lots=close_data.volume,
            result="WIN" if close_data.profit > 0 else "LOSS" if close_data.profit < 0 else "BE",
            pnl=close_data.profit,
            notes=f"Ticket: {close_data.ticket}"
        )
        
        db.add(trade)
        db.commit()
        db.refresh(trade)
        created_new = True
    else:
        # Update existing trade
        existing_trade.pnl = close_data.profit
        existing_trade.result = "WIN" if close_data.profit > 0 else "LOSS" if close_data.profit < 0 else "BE"
        existing_trade.updated_at = datetime.utcnow()
        
        # Update date if close time is available
        if close_data.close_time:
            close_dt = parse_datetime(close_data.close_time)
            existing_trade.date = close_dt.date()
            existing_trade.year = close_dt.year
            existing_trade.month = close_dt.month
        
        db.commit()
        created_new = False
    
    # 5. Update account balance
    account.balance = close_data.balance
    account.updated_at = datetime.utcnow()
    if close_data.equity is not None:
        current_notes = account.notes or ""
        if "equity:" in current_notes:
            parts = current_notes.split(";")
            new_parts = []
            for part in parts:
                if not part.startswith("equity:"):
                    new_parts.append(part)
            new_parts.append(f"equity:{close_data.equity}")
            account.notes = ";".join(new_parts)
        else:
            account.notes = f"{current_notes};equity:{close_data.equity}" if current_notes else f"equity:{close_data.equity}"
    
    db.commit()
    
    return {
        "success": True,
        "message": "Posição fechada registrada" if created_new else "Posição fechada atualizada",
        "account_id": str(account.id),
        "new_balance": float(account.balance),
        "trade_created": created_new
    }
