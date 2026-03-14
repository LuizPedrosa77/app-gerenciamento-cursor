from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace
from app.schemas.metaapi import (
    MTConnectRequest,
    MTConnectResponse,
    MTSyncResponse,
    MTStatusResponse
)
from app.core.mtconnect import (
    fetch_trade_history,
    parse_deal_to_trade,
    get_last_ticket
)
from app.core.security import hash_password
import uuid

router = APIRouter()


def get_or_create_workspace(db: Session, user_id) -> Workspace:
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == user_id
    ).first()
    if not workspace:
        workspace = Workspace(
            name="Workspace Padrão",
            owner_id=user_id
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    return workspace


@router.post("/connect", response_model=MTConnectResponse)
def connect_mt_account(
    request: MTConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Conecta uma conta MT4/MT5 via MTConnectAPI e importa todo
    o histórico de trades automaticamente.
    Usa investor_password (somente leitura) — nunca a senha master.
    """
    workspace = get_or_create_workspace(db, current_user.id)

    try:
        deals = fetch_trade_history(
            login=request.login,
            investor_password=request.investor_password,
            server=request.server,
            platform=request.platform
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erro ao conectar com a corretora: {str(e)}"
        )

    account = Account(
        workspace_id=workspace.id,
        name=request.account_name,
        broker_type=request.platform.upper(),
        broker_login=request.login,
        broker_server=request.server,
        investor_password=hash_password(request.investor_password),
        is_active=True,
        balance=0,
        initial_balance=0
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    imported = 0
    for deal in deals:
        trade_data = parse_deal_to_trade(deal, str(account.id))
        if not trade_data:
            continue

        existing = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.date == trade_data["date"],
            Trade.pair == trade_data["pair"],
            Trade.pnl == trade_data["pnl"],
            Trade.lots == trade_data["lots"]
        ).first()
        if existing:
            continue

        trade = Trade(
            workspace_id=workspace.id,
            **trade_data
        )
        db.add(trade)
        imported += 1

    last_ticket = get_last_ticket(deals)
    if last_ticket > 0:
        account.mt_last_ticket = str(last_ticket)

    if imported > 0:
        total_pnl = sum(
            float(t.pnl) for t in db.query(Trade).filter(
                Trade.account_id == account.id
            ).all()
        )
        account.balance = account.initial_balance + total_pnl

    db.commit()

    return MTConnectResponse(
        success=True,
        message=f"Conta conectada! {imported} trades importados.",
        account_id=str(account.id)
    )


@router.post("/sync/{account_id}", response_model=MTSyncResponse)
def sync_mt_history(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sincroniza trades novos de uma conta já conectada.
    Usa mt_last_ticket para buscar apenas trades novos (incremental).
    """
    workspace = get_or_create_workspace(db, current_user.id)

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail="Conta não encontrada"
        )
    if not account.broker_login or not account.broker_server:
        raise HTTPException(
            status_code=400,
            detail="Conta não possui credenciais de corretora configuradas"
        )
    if not account.investor_password:
        raise HTTPException(
            status_code=400,
            detail="Investor password não configurada. Reconecte a conta."
        )

    last_ticket = int(account.mt_last_ticket) if account.mt_last_ticket else 0

    try:
        deals = fetch_trade_history(
            login=account.broker_login,
            investor_password=account.investor_password,
            server=account.broker_server,
            platform=account.broker_type or "MT5",
            last_ticket=last_ticket
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erro ao sincronizar: {str(e)}"
        )

    imported = 0
    for deal in deals:
        trade_data = parse_deal_to_trade(deal, account_id)
        if not trade_data:
            continue

        existing = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.date == trade_data["date"],
            Trade.pair == trade_data["pair"],
            Trade.pnl == trade_data["pnl"],
            Trade.lots == trade_data["lots"]
        ).first()
        if existing:
            continue

        trade = Trade(
            workspace_id=workspace.id,
            **trade_data
        )
        db.add(trade)
        imported += 1

    new_last_ticket = get_last_ticket(deals)
    if new_last_ticket > last_ticket:
        account.mt_last_ticket = str(new_last_ticket)

    if imported > 0:
        total_pnl = sum(
            float(t.pnl) for t in db.query(Trade).filter(
                Trade.account_id == account.id
            ).all()
        )
        account.balance = account.initial_balance + total_pnl

    db.commit()

    return MTSyncResponse(
        success=True,
        message=f"Sincronização concluída! {imported} trades novos importados.",
        trades_imported=imported
    )


@router.get("/status/{account_id}", response_model=MTStatusResponse)
def get_mt_status(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna o status de conexão de uma conta MT.
    """
    workspace = get_or_create_workspace(db, current_user.id)

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail="Conta não encontrada"
        )

    connected = bool(
        account.broker_login and
        account.broker_server and
        account.investor_password
    )

    return MTStatusResponse(
        connected=connected,
        status="connected" if connected else "not_connected",
        login=account.broker_login,
        server=account.broker_server,
        platform=account.broker_type
    )


@router.delete("/disconnect/{account_id}")
def disconnect_mt_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Desconecta uma conta MT removendo as credenciais salvas.
    Os trades importados são mantidos.
    """
    workspace = get_or_create_workspace(db, current_user.id)

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(
            status_code=404,
            detail="Conta não encontrada"
        )

    account.broker_login = None
    account.broker_server = None
    account.broker_type = None
    account.investor_password = None
    account.mt_last_ticket = None
    db.commit()

    return {"success": True, "message": "Conta desconectada. Trades mantidos."}
