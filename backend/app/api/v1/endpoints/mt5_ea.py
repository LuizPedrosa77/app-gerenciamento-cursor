from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace

router = APIRouter()

class TradeItem(BaseModel):
    ticket: int
    symbol: str
    type: str
    volume: float
    profit: float
    open_time: str
    close_time: Optional[str] = None
    open_price: float
    close_price: Optional[float] = None
    is_open: bool = False

class PositionItem(BaseModel):
    ticket: int
    symbol: str
    type: str
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
    equity: float
    trades: List[TradeItem] = []
    positions: List[PositionItem] = []

class OpenRequest(BaseModel):
    email: str
    account_login: str
    server: str
    ticket: int
    symbol: str
    type: str
    volume: float
    open_price: float
    open_time: str
    balance: float
    equity: float

class CloseRequest(BaseModel):
    email: str
    account_login: str
    server: str
    ticket: int
    symbol: str
    type: str
    volume: float
    profit: float
    open_time: str
    close_time: str
    open_price: float
    close_price: float
    balance: float
    equity: float

def parse_dt(dt_str: str) -> datetime:
    for fmt in ["%Y.%m.%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(dt_str, fmt)
        except:
            continue
    return datetime.utcnow()

def get_or_create_workspace(db: Session, user: User) -> Workspace:
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == user.id
    ).first()
    if not workspace:
        workspace = Workspace(
            name="Workspace Padrão",
            owner_id=user.id
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    return workspace

def get_or_create_account(db, workspace, login, name, server, balance):
    account = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == login,
        Account.broker_server == server
    ).first()
    if not account:
        account = Account(
            workspace_id=workspace.id,
            name=name,
            broker_login=login,
            broker_server=server,
            broker_type="MT5",
            is_active=True,
            balance=balance,
            initial_balance=balance
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    else:
        account.balance = balance
        db.commit()
    return account

@router.post("/sync")
def sync(req: SyncRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    workspace = get_or_create_workspace(db, user)
    account = get_or_create_account(
        db, workspace, req.account_login,
        req.account_name, req.server, req.balance
    )
    imported = 0
    updated = 0
    for t in req.trades:
        if t.is_open:
            continue
        dt = parse_dt(t.close_time or t.open_time)
        pnl = float(t.profit)
        result = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BE"
        direction = "BUY" if t.type.upper() == "BUY" else "SELL"
        existing = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.notes.contains(f"Ticket:{t.ticket}")
        ).first()
        if existing:
            existing.pnl = pnl
            existing.result = result
            updated += 1
        else:
            trade = Trade(
                account_id=account.id,
                workspace_id=workspace.id,
                date=dt.date(),
                year=dt.year,
                month=dt.month,
                pair=t.symbol,
                direction=direction,
                lots=float(t.volume),
                pnl=pnl,
                result=result,
                notes=f"EA Sync | Ticket:{t.ticket}"
            )
            db.add(trade)
            imported += 1
    db.commit()
    return {
        "success": True,
        "imported": imported,
        "updated": updated,
        "account_id": str(account.id),
        "balance": float(account.balance)
    }

@router.post("/open")
def open_trade(req: OpenRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    workspace = get_or_create_workspace(db, user)
    account = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == req.account_login,
        Account.broker_server == req.server
    ).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail="Conta não encontrada. Execute o sync primeiro."
        )
    account.balance = req.balance
    db.commit()
    return {"success": True, "message": "Posição aberta registrada", "ticket": req.ticket}

@router.post("/close")
def close_trade(req: CloseRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    workspace = get_or_create_workspace(db, user)
    account = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == req.account_login,
        Account.broker_server == req.server
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    dt_close = parse_dt(req.close_time)
    dt_open = parse_dt(req.open_time)
    pnl = float(req.profit)
    result = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BE"
    direction = "BUY" if req.type.upper() == "BUY" else "SELL"
    existing = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.notes.contains(f"Ticket:{req.ticket}")
    ).first()
    if existing:
        existing.pnl = pnl
        existing.result = result
        updated_msg = "atualizado"
    else:
        trade = Trade(
            account_id=account.id,
            workspace_id=workspace.id,
            date=dt_close.date(),
            year=dt_close.year,
            month=dt_close.month,
            pair=req.symbol,
            direction=direction,
            lots=float(req.volume),
            pnl=pnl,
            result=result,
            notes=f"EA Sync | Ticket:{req.ticket}"
        )
        db.add(trade)
        updated_msg = "criado"
    account.balance = req.balance
    db.commit()
    return {
        "success": True,
        "message": f"Trade {updated_msg} com sucesso",
        "account_id": str(account.id),
        "new_balance": float(account.balance)
    }
