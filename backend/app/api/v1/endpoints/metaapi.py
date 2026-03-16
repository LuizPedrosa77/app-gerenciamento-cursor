from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
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
from app.core.config import settings

router = APIRouter()

METAAPI_BASE = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai"

# Configuração mais barata — G1 + regular + sem extras
METAAPI_ACCOUNT_CONFIG = {
    "type": "cloud-g1",
    "reliability": "regular",
    "resourceSlots": 1,
    "metastatsApiEnabled": False,
    "riskManagementApiEnabled": False,
}


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


def get_metaapi_headers() -> dict:
    if not settings.METAAPI_KEY:
        raise HTTPException(
            status_code=400,
            detail="MetaAPI key não configurada. Adicione METAAPI_KEY no .env"
        )
    return {
        "auth-token": settings.METAAPI_KEY,
        "Content-Type": "application/json"
    }


@router.post("/connect", response_model=MTConnectResponse)
def connect_mt_account(
    request: MTConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Conecta conta MT4/MT5 via MetaAPI.
    Usa configuração mais barata: cloud-g1 + regular + sem extras.
    Se METAAPI_KEY não estiver configurada, salva conta localmente
    para uso com o EA.
    """
    workspace = get_or_create_workspace(db, current_user.id)

    # Verifica se conta já existe localmente
    existing = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.broker_login == request.login,
        Account.broker_server == request.server
    ).first()

    if existing:
        return MTConnectResponse(
            success=True,
            message="Conta já conectada.",
            account_id=str(existing.id)
        )

    # Cria conta local primeiro
    account = Account(
        workspace_id=workspace.id,
        name=request.account_name,
        broker_type=request.platform.upper(),
        broker_login=request.login,
        broker_server=request.server,
        is_active=True,
        balance=0,
        initial_balance=0
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    # Se MetaAPI key configurada, registra na MetaAPI também
    if settings.METAAPI_KEY:
        try:
            payload = {
                **METAAPI_ACCOUNT_CONFIG,
                "login": request.login,
                "password": request.investor_password,
                "server": request.server,
                "platform": request.platform.lower(),
                "name": request.account_name,
            }

            response = httpx.post(
                f"{METAAPI_BASE}/users/current/accounts",
                json=payload,
                headers=get_metaapi_headers(),
                timeout=30
            )

            if response.status_code in [200, 201]:
                metaapi_data = response.json()
                metaapi_id = metaapi_data.get("id")
                # Salva o ID da MetaAPI na conta local
                account.mt_last_ticket = f"metaapi:{metaapi_id}"
                db.commit()

                return MTConnectResponse(
                    success=True,
                    message=f"Conta conectada via MetaAPI! ID: {metaapi_id}",
                    account_id=str(account.id)
                )
            else:
                # MetaAPI falhou mas conta local foi criada
                return MTConnectResponse(
                    success=True,
                    message=f"Conta salva localmente. MetaAPI retornou: {response.text[:100]}",
                    account_id=str(account.id)
                )

        except Exception as e:
            # Não falha — conta local foi criada, MetaAPI pode ser tentada depois
            return MTConnectResponse(
                success=True,
                message=f"Conta salva localmente. Erro MetaAPI: {str(e)[:100]}",
                account_id=str(account.id)
            )

    return MTConnectResponse(
        success=True,
        message=f"Conta {request.account_name} salva. Configure METAAPI_KEY para sync automático.",
        account_id=str(account.id)
    )


@router.post("/sync/{account_id}", response_model=MTSyncResponse)
def sync_mt_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sincroniza trades via MetaAPI.
    Se key não configurada, orienta uso do EA.
    """
    workspace = get_or_create_workspace(db, current_user.id)

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    if not settings.METAAPI_KEY:
        return MTSyncResponse(
            success=False,
            message="MetaAPI key não configurada. Use o EA GPFX para sincronização automática.",
            trades_imported=0
        )

    # Busca MetaAPI account ID
    metaapi_id = None
    if account.mt_last_ticket and account.mt_last_ticket.startswith("metaapi:"):
        metaapi_id = account.mt_last_ticket.replace("metaapi:", "")

    if not metaapi_id:
        return MTSyncResponse(
            success=False,
            message="Conta não registrada na MetaAPI. Reconecte a conta.",
            trades_imported=0
        )

    try:
        # Busca histórico de deals via MetaAPI
        response = httpx.get(
            f"https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai"
            f"/users/current/accounts/{metaapi_id}/history-deals/time",
            headers=get_metaapi_headers(),
            params={
                "startTime": "2020-01-01T00:00:00.000Z",
                "endTime": "2099-12-31T23:59:59.000Z",
                "offset": 0,
                "limit": 1000
            },
            timeout=30
        )

        if response.status_code != 200:
            return MTSyncResponse(
                success=False,
                message=f"Erro ao buscar histórico: {response.text[:100]}",
                trades_imported=0
            )

        deals = response.json()
        imported = 0

        for deal in deals:
            # Só processa deals de saída com lucro/perda
            if deal.get("entryType") != "out":
                continue
            if deal.get("type") not in ["DEAL_TYPE_BUY", "DEAL_TYPE_SELL"]:
                continue

            ticket = str(deal.get("id", ""))

            # Verifica duplicata
            existing_trade = db.query(Trade).filter(
                Trade.account_id == account.id,
                Trade.notes.contains(f"MetaAPI:{ticket}")
            ).first()
            if existing_trade:
                continue

            from datetime import datetime
            close_time_str = deal.get("time", "")
            try:
                dt = datetime.fromisoformat(close_time_str.replace("Z", "+00:00"))
            except Exception:
                dt = datetime.utcnow()

            profit = float(deal.get("profit", 0))
            commission = float(deal.get("commission", 0))
            swap = float(deal.get("swap", 0))
            net_profit = profit + commission + swap

            direction = "BUY" if deal.get("type") == "DEAL_TYPE_BUY" else "SELL"
            result = "WIN" if net_profit > 0 else "LOSS" if net_profit < 0 else "BE"

            trade = Trade(
                account_id=account.id,
                workspace_id=workspace.id,
                date=dt.date(),
                year=dt.year,
                month=dt.month - 1,  # JS 0-indexed
                pair=deal.get("symbol", ""),
                direction=direction,
                lots=float(deal.get("volume", 0)),
                pnl=net_profit,
                result=result,
                notes=f"MetaAPI:{ticket}"
            )
            db.add(trade)
            imported += 1

        db.commit()

        return MTSyncResponse(
            success=True,
            message=f"Sync concluído! {imported} trades importados.",
            trades_imported=imported
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no sync MetaAPI: {str(e)}"
        )


@router.get("/status/{account_id}", response_model=MTStatusResponse)
def get_mt_status(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna status de conexão da conta MT."""
    workspace = get_or_create_workspace(db, current_user.id)

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    connected = bool(account.broker_login and account.broker_server)
    has_metaapi = bool(
        account.mt_last_ticket and
        account.mt_last_ticket.startswith("metaapi:")
    )

    return MTStatusResponse(
        connected=connected,
        status="connected_metaapi" if has_metaapi else "connected_ea" if connected else "not_connected",
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
    Desconecta conta MT.
    Remove da MetaAPI se estiver registrada.
    Trades são mantidos.
    """
    workspace = get_or_create_workspace(db, current_user.id)

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    # Remove da MetaAPI se estiver registrada
    if settings.METAAPI_KEY and account.mt_last_ticket and \
       account.mt_last_ticket.startswith("metaapi:"):
        metaapi_id = account.mt_last_ticket.replace("metaapi:", "")
        try:
            httpx.delete(
                f"{METAAPI_BASE}/users/current/accounts/{metaapi_id}",
                headers=get_metaapi_headers(),
                timeout=30
            )
        except Exception:
            pass  # Ignora erro — remove localmente de qualquer forma

    account.broker_login = None
    account.broker_server = None
    account.broker_type = None
    account.investor_password = None
    account.mt_last_ticket = None
    db.commit()

    return {"success": True, "message": "Conta desconectada. Trades mantidos."}
