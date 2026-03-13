from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace
from app.schemas.metaapi import MTConnectRequest, MTSyncResponse
from app.core.metaapi import (
    create_mt_account, wait_account_deployed,
    get_trade_history, parse_deal_to_trade,
    delete_mt_account, get_mt_account
)

router = APIRouter()

@router.post("/connect")
def connect_mt_account(
    request: MTConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    account = db.query(Account).filter(
        Account.id == request.account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    try:
        mt_account = create_mt_account(
            login=request.login,
            password=request.password,
            server=request.server,
            platform=request.platform
        )
        metaapi_id = mt_account.get("id")
        account.broker_login = request.login
        account.broker_server = request.server
        account.broker_type = request.platform.upper()
        account.metaapi_account_id = metaapi_id
        db.commit()
        return {
            "success": True,
            "message": "Conta conectada! Sincronizando histórico...",
            "metaapi_account_id": metaapi_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao conectar: {str(e)}")

@router.post("/sync/{account_id}")
def sync_mt_history(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if not account.metaapi_account_id:
        raise HTTPException(status_code=400, detail="Conta não conectada ao MetaApi")
    try:
        deployed = wait_account_deployed(account.metaapi_account_id)
        if not deployed:
            raise HTTPException(status_code=400, detail="Conta não pôde ser conectada à corretora")
        deals = get_trade_history(account.metaapi_account_id)
        imported = 0
        for deal in deals:
            trade_data = parse_deal_to_trade(deal, account_id)
            if not trade_data:
                continue
            deal_id = str(deal.get("id", ""))
            existing = db.query(Trade).filter(
                Trade.account_id == account_id,
                Trade.notes.contains(deal_id)
            ).first()
            if existing:
                continue
            trade = Trade(**trade_data)
            db.add(trade)
            imported += 1
        db.commit()
        return {
            "success": True,
            "message": f"Sincronização concluída!",
            "trades_imported": imported
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao sincronizar: {str(e)}")

@router.get("/status/{account_id}")
def get_sync_status(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if not account.metaapi_account_id:
        return {"connected": False, "status": "not_connected"}
    try:
        mt_account = get_mt_account(account.metaapi_account_id)
        return {
            "connected": True,
            "status": mt_account.get("state", "UNKNOWN"),
            "login": account.broker_login,
            "server": account.broker_server,
            "platform": account.broker_type,
            "metaapi_account_id": account.metaapi_account_id
        }
    except:
        return {"connected": False, "status": "error"}

@router.delete("/disconnect/{account_id}")
def disconnect_mt_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if account.metaapi_account_id:
        delete_mt_account(account.metaapi_account_id)
        account.metaapi_account_id = None
        account.broker_login = None
        account.broker_server = None
        db.commit()
    return {"success": True, "message": "Conta desconectada"}
