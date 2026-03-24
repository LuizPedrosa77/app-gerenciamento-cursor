from datetime import datetime
from typing import List, Optional
import asyncio
import re

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.account import Account
from app.models.open_position import OpenPosition
from app.models.trade import Trade
from app.models.user import User
from app.models.workspace import Workspace
from app.websocket.trade_ws import manager as ws_manager

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


def verify_internal_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="API key invalida")
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
        "%Y-%m-%dT%H:%M:%S.%fZ",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Formato de data invalido recebido do EA: {dt_str}")


def get_or_create_workspace(db: Session, user: User) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.owner_id == user.id).first()
    if not workspace:
        workspace = Workspace(name="Workspace Padrao", owner_id=user.id)
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    return workspace


def get_or_create_account(db: Session, workspace: Workspace, login: str, name: str, server: str) -> Account:
    account = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == login,
        Account.broker_server == server,
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
            initial_balance=0,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    else:
        account.name = name
        db.commit()
    return account


def serialize_open_position(pos: OpenPosition) -> dict:
    return {
        "account_id": str(pos.account_id),
        "ticket": pos.ticket,
        "symbol": pos.symbol_normalized or pos.symbol_raw,
        "symbol_raw": pos.symbol_raw,
        "direction": pos.direction,
        "lots": float(pos.lots or 0),
        "open_time": pos.open_time.isoformat() if pos.open_time else None,
        "open_price": float(pos.open_price) if pos.open_price is not None else None,
        "floating_pnl": float(pos.floating_pnl or 0),
        "updated_at": pos.updated_at.isoformat() if pos.updated_at else None,
    }


def emit_positions_update(user_id: str, account: Account, positions: List[OpenPosition]) -> None:
    asyncio.create_task(
        ws_manager.send_to_user(
            str(user_id),
            {
                "type": "positions_update",
                "account_id": str(account.id),
                "account_name": account.name,
                "open_positions_count": len(positions),
                "floating_pnl_total": sum(float(p.floating_pnl or 0) for p in positions),
                "positions": [serialize_open_position(p) for p in positions],
            },
        )
    )


def upsert_open_positions(
    db: Session,
    account: Account,
    workspace: Workspace,
    positions: List[PositionItem],
) -> List[OpenPosition]:
    now = datetime.utcnow()
    incoming_tickets = {str(p.ticket) for p in positions}

    if incoming_tickets:
        db.query(OpenPosition).filter(
            OpenPosition.account_id == account.id,
            ~OpenPosition.ticket.in_(incoming_tickets),
        ).delete(synchronize_session=False)
    else:
        db.query(OpenPosition).filter(OpenPosition.account_id == account.id).delete(synchronize_session=False)

    existing = db.query(OpenPosition).filter(OpenPosition.account_id == account.id).all()
    existing_by_ticket = {row.ticket: row for row in existing}

    for p in positions:
        ticket = str(p.ticket)
        pos = existing_by_ticket.get(ticket)
        if pos is None:
            pos = OpenPosition(
                account_id=account.id,
                workspace_id=workspace.id,
                ticket=ticket,
                created_at=now,
            )
            db.add(pos)
            existing_by_ticket[ticket] = pos

        try:
            open_dt = parse_dt(p.open_time)
        except ValueError:
            open_dt = now

        pos.symbol_raw = p.symbol
        pos.symbol_normalized = normalize_symbol_pair(p.symbol)
        pos.direction = "BUY" if p.type.upper() == "BUY" else "SELL"
        pos.lots = float(p.volume)
        pos.open_time = open_dt
        pos.open_price = float(p.open_price)
        pos.floating_pnl = float(p.profit)
        pos.updated_at = now

    db.flush()
    return list(existing_by_ticket.values())


@router.post("/sync")
async def sync(
    req: SyncRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_internal_api_key),
):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    workspace = get_or_create_workspace(db, user)
    account = get_or_create_account(db, workspace, req.account_login, req.account_name, req.server)

    imported = 0
    updated = 0

    incoming_tickets = [t.ticket for t in req.trades if not t.is_open]
    exact_notes = [f"EA Sync | Ticket:{t}" for t in incoming_tickets]

    existing_map = {}
    if exact_notes:
        existing_trades = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.notes.in_(exact_notes),
        ).all()
        for et in existing_trades:
            if et.notes:
                match = re.search(r"Ticket:(\d+)", et.notes)
                if match:
                    existing_map[int(match.group(1))] = et

    for t in req.trades:
        if t.is_open:
            continue

        try:
            dt = parse_dt(t.close_time or t.open_time)
        except ValueError:
            continue

        pnl = float(t.profit)
        result = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BE"
        direction = "BUY" if t.type.upper() == "BUY" else "SELL"
        symbol_norm = normalize_symbol_pair(t.symbol)

        try:
            open_dt = parse_dt(t.open_time) if t.open_time else dt
        except ValueError:
            open_dt = dt

        existing = existing_map.get(t.ticket)
        if existing:
            existing.pnl = pnl
            existing.result = result
            existing.ticket = existing.ticket or str(t.ticket)
            existing.close_time = dt
            existing.open_time = existing.open_time or open_dt
            existing.open_price = t.open_price
            existing.close_price = t.close_price
            existing.symbol_raw = t.symbol
            existing.symbol_normalized = symbol_norm
            updated += 1
        else:
            trade = Trade(
                account_id=account.id,
                workspace_id=workspace.id,
                date=dt.date(),
                year=dt.year,
                month=dt.month,
                pair=symbol_norm,
                symbol_raw=t.symbol,
                symbol_normalized=symbol_norm,
                ticket=str(t.ticket),
                direction=direction,
                lots=float(t.volume),
                pnl=pnl,
                result=result,
                open_time=open_dt,
                close_time=dt,
                open_price=t.open_price,
                close_price=t.close_price,
                notes=f"EA Sync | Ticket:{t.ticket}",
            )
            db.add(trade)
            imported += 1

    open_positions = upsert_open_positions(db, account, workspace, req.positions)

    from sqlalchemy.sql import func

    total_pnl = db.query(func.sum(Trade.pnl)).filter(Trade.account_id == account.id).scalar() or 0.0
    total_vm = db.query(func.sum(Trade.vm_pnl)).filter(
        Trade.account_id == account.id,
        Trade.has_vm == True,
    ).scalar() or 0.0
    account.balance = float(account.initial_balance) + float(total_pnl) + float(total_vm)

    db.commit()

    if imported > 0 or updated > 0:
        asyncio.create_task(
            ws_manager.send_to_user(
                str(user.id),
                {
                    "type": "trade_synced",
                    "account_id": str(account.id),
                    "account_name": account.name,
                    "imported": imported,
                    "updated": updated,
                    "balance": float(account.balance),
                },
            )
        )

    emit_positions_update(str(user.id), account, open_positions)

    return {
        "success": True,
        "imported": imported,
        "updated": updated,
        "account_id": str(account.id),
        "balance": float(account.balance),
        "open_positions_count": len(open_positions),
    }


@router.post("/open")
def open_trade(
    req: OpenRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_internal_api_key),
):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    workspace = get_or_create_workspace(db, user)
    account = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == req.account_login,
        Account.broker_server == req.server,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta nao encontrada. Execute o sync primeiro.")

    position = db.query(OpenPosition).filter(
        OpenPosition.account_id == account.id,
        OpenPosition.ticket == str(req.ticket),
    ).first()

    if not position:
        position = OpenPosition(
            account_id=account.id,
            workspace_id=workspace.id,
            ticket=str(req.ticket),
            created_at=datetime.utcnow(),
        )
        db.add(position)

    try:
        dt_open = parse_dt(req.open_time)
    except ValueError:
        dt_open = datetime.utcnow()

    position.symbol_raw = req.symbol
    position.symbol_normalized = normalize_symbol_pair(req.symbol)
    position.direction = "BUY" if req.type.upper() == "BUY" else "SELL"
    position.lots = float(req.volume)
    position.open_time = dt_open
    position.open_price = float(req.open_price)
    position.floating_pnl = 0
    position.updated_at = datetime.utcnow()

    db.commit()

    open_positions = db.query(OpenPosition).filter(OpenPosition.account_id == account.id).all()
    emit_positions_update(str(user.id), account, open_positions)

    return {"success": True, "message": "Posicao aberta registrada", "ticket": req.ticket}


@router.post("/close")
async def close_trade(
    req: CloseRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_internal_api_key),
):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")

    workspace = get_or_create_workspace(db, user)
    account = db.query(Account).with_for_update().filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == req.account_login,
        Account.broker_server == req.server,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")

    try:
        dt_close = parse_dt(req.close_time)
        dt_open = parse_dt(req.open_time)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    pnl = float(req.profit)
    result = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BE"
    direction = "BUY" if req.type.upper() == "BUY" else "SELL"
    symbol_norm = normalize_symbol_pair(req.symbol)

    existing = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.notes.contains(f"Ticket:{req.ticket}"),
    ).first()

    if existing:
        existing.pnl = pnl
        existing.result = result
        existing.close_time = dt_close
        existing.open_time = existing.open_time or dt_open
        existing.open_price = req.open_price
        existing.close_price = req.close_price
        existing.symbol_raw = req.symbol
        existing.symbol_normalized = symbol_norm
        existing.pair = symbol_norm
        existing.ticket = existing.ticket or str(req.ticket)
        updated_msg = "atualizado"
    else:
        trade = Trade(
            account_id=account.id,
            workspace_id=workspace.id,
            date=dt_close.date(),
            year=dt_close.year,
            month=dt_close.month,
            pair=symbol_norm,
            symbol_raw=req.symbol,
            symbol_normalized=symbol_norm,
            ticket=str(req.ticket),
            direction=direction,
            lots=float(req.volume),
            pnl=pnl,
            result=result,
            open_time=dt_open,
            close_time=dt_close,
            open_price=req.open_price,
            close_price=req.close_price,
            notes=f"EA Sync | Ticket:{req.ticket}",
        )
        db.add(trade)
        updated_msg = "criado"

    db.query(OpenPosition).filter(
        OpenPosition.account_id == account.id,
        OpenPosition.ticket == str(req.ticket),
    ).delete(synchronize_session=False)

    db.flush()

    from sqlalchemy.sql import func

    total_pnl = db.query(func.sum(Trade.pnl)).filter(Trade.account_id == account.id).scalar() or 0.0
    total_vm = db.query(func.sum(Trade.vm_pnl)).filter(
        Trade.account_id == account.id,
        Trade.has_vm == True,
    ).scalar() or 0.0
    account.balance = float(account.initial_balance) + float(total_pnl) + float(total_vm)

    db.commit()

    trade_id = str(existing.id) if existing else str(trade.id)

    asyncio.create_task(
        ws_manager.send_to_user(
            str(user.id),
            {
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
                    "result": result,
                },
            },
        )
    )

    remaining_positions = db.query(OpenPosition).filter(OpenPosition.account_id == account.id).all()
    emit_positions_update(str(user.id), account, remaining_positions)

    return {
        "success": True,
        "message": f"Trade {updated_msg} com sucesso",
        "account_id": str(account.id),
        "new_balance": float(account.balance),
    }
