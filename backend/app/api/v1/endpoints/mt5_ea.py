from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace
import asyncio
from app.websocket.trade_ws import manager as ws_manager

router = APIRouter()

def verify_internal_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="API key invÃ¡lida")
    return True

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
    trades: List[TradeItem] = []
    positions: List[PositionItem] = []

class OpenRequest(BaseModel):
    email: str
    account_login: str
    account_name: str
    server: str
    ticket: int
    symbol: str
    type: str
    volume: float
    open_price: float
    open_time: str

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

def parse_dt(dt_str: str) -> datetime:
    if not dt_str:
        return datetime.utcnow()
    formats = [
        "%Y.%m.%d %H:%M:%S", 
        "%Y-%m-%d %H:%M:%S",
        "%Y.%m.%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%fZ"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Formato de data inválido recebido do EA: {dt_str}")

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

def get_or_create_account(db, workspace, login, name, server):
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
            balance=0,
            initial_balance=0
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    else:
        account.name = name
        db.commit()
    return account

@router.post("/sync")
async def sync(
    req: SyncRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_internal_api_key)
):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    workspace = get_or_create_workspace(db, user)
    account = get_or_create_account(
        db, workspace, req.account_login,
        req.account_name, req.server
    )
    imported = 0
    updated = 0
    # Evitando N+1 Query buscando as notas existentes de uma vez
    incoming_tickets = [t.ticket for t in req.trades if not t.is_open]
    exact_notes = [f"EA Sync | Ticket:{t}" for t in incoming_tickets]
    
    existing_map = {}
    if exact_notes:
        existing_trades = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.notes.in_(exact_notes)
        ).all()
        for et in existing_trades:
            if et.notes:
                import re
                match = re.search(r"Ticket:(\d+)", et.notes)
                if match:
                    existing_map[int(match.group(1))] = et

    for t in req.trades:
        if t.is_open:
            continue
        try:
            dt = parse_dt(t.close_time or t.open_time)
        except ValueError as e:
            continue  # ignore trades with invalid dates
            
        pnl = float(t.profit)
        result = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BE"
        direction = "BUY" if t.type.upper() == "BUY" else "SELL"
        
        existing = existing_map.get(t.ticket)
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

    # Recalculate balance after sync
    from sqlalchemy.sql import func
    total_pnl = db.query(func.sum(Trade.pnl)).filter(Trade.account_id == account.id).scalar() or 0.0
    total_vm = db.query(func.sum(Trade.vm_pnl)).filter(
        Trade.account_id == account.id, Trade.has_vm == True
    ).scalar() or 0.0
    account.balance = float(account.initial_balance) + float(total_pnl) + float(total_vm)
    db.commit()

    if imported > 0 or updated > 0:
        asyncio.create_task(ws_manager.send_to_user(str(user.id), {
            "type": "trade_synced",
            "account_id": str(account.id),
            "account_name": account.name,
            "imported": imported,
            "updated": updated,
            "balance": float(account.balance),
        }))

    return {
        "success": True,
        "imported": imported,
        "updated": updated,
        "account_id": str(account.id),
        "balance": float(account.balance)
    }

@router.post("/open")
def open_trade(
    req: OpenRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_internal_api_key)
):
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
    db.commit()
    return {"success": True, "message": "Posição aberta registrada", "ticket": req.ticket}

@router.post("/close")
async def close_trade(
    req: CloseRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_internal_api_key)
):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    workspace = get_or_create_workspace(db, user)
    # Bloqueia a conta (Pessimistic Lock) para evitar Race Condition em múltiplos /close simultâneos do EA fast mode
    account = db.query(Account).with_for_update().filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == req.account_login,
        Account.broker_server == req.server
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    try:
        dt_close = parse_dt(req.close_time)
        dt_open = parse_dt(req.open_time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
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
    
    db.flush() # flush para garantir que a transação esteja pronta

    # Recalculate balance com lock garantido e operações atômicas
    from sqlalchemy.sql import func
    total_pnl = db.query(func.sum(Trade.pnl)).filter(Trade.account_id == account.id).scalar() or 0.0
    total_vm = db.query(func.sum(Trade.vm_pnl)).filter(
        Trade.account_id == account.id, Trade.has_vm == True
    ).scalar() or 0.0
    account.balance = float(account.initial_balance) + float(total_pnl) + float(total_vm)
    db.commit()

    trade_id = str(existing.id) if existing else str(trade.id)

    asyncio.create_task(ws_manager.send_to_user(str(user.id), {
        "type": "trade_closed",
        "account_id": str(account.id),
        "account_name": account.name,
        "ticket": req.ticket,
        "symbol": req.symbol,
        "pnl": float(req.profit),
        "result": result,
        "new_balance": float(account.balance),
        "trade": {
            "id": trade_id,
            "date": str(dt_close.date()),
            "pair": req.symbol,
            "direction": direction,
            "pnl": float(req.profit),
            "result": result
        }
    }))

    return {
        "success": True,
        "message": f"Trade {updated_msg} com sucesso",
        "account_id": str(account.id),
        "new_balance": float(account.balance),
    }
