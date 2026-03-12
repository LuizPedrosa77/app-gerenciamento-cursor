from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.account import Account
from app.models.user import User
from app.schemas.broker import (
    BrokerConnectionCreate,
    BrokerConnectionResponse,
    BrokerInfo,
    BrokerType
)

router = APIRouter()


@router.get("")
def get_brokers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna lista de todas as contas com informações de corretora do workspace do usuário"""
    try:
        accounts = db.query(Account).filter(
            Account.workspace_id == current_user.workspace_id,
            Account.broker_type.isnot(None)
        ).all()
        
        return [
            BrokerConnectionResponse(
                id=str(account.id),
                broker_type=account.broker_type,
                account_name=account.name,
                login=account.broker_login,
                server=account.broker_server,
                notes=account.notes,
                is_active=account.is_active,
                created_at=account.created_at
            )
            for account in accounts
        ]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/connect")
def connect_broker(
    broker_data: BrokerConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cria uma nova conta vinculada à corretora informada"""
    try:
        account = Account(
            workspace_id=current_user.workspace_id,
            name=broker_data.account_name,
            broker_type=broker_data.broker_type.value,
            broker_login=broker_data.login,
            broker_server=broker_data.server,
            notes=broker_data.notes,
            is_active=True
        )
        
        db.add(account)
        db.commit()
        db.refresh(account)
        
        return BrokerConnectionResponse(
            id=str(account.id),
            broker_type=account.broker_type,
            account_name=account.name,
            login=account.broker_login,
            server=account.broker_server,
            notes=account.notes,
            is_active=account.is_active,
            created_at=account.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{account_id}")
def update_broker_connection(
    account_id: str,
    broker_data: BrokerConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualiza dados da conexão"""
    try:
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.workspace_id == current_user.workspace_id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        
        account.name = broker_data.account_name
        account.broker_type = broker_data.broker_type.value
        account.broker_login = broker_data.login
        account.broker_server = broker_data.server
        account.notes = broker_data.notes
        
        db.commit()
        db.refresh(account)
        
        return BrokerConnectionResponse(
            id=str(account.id),
            broker_type=account.broker_type,
            account_name=account.name,
            login=account.broker_login,
            server=account.broker_server,
            notes=account.notes,
            is_active=account.is_active,
            created_at=account.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{account_id}/disconnect")
def disconnect_broker(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove broker_type, broker_login e broker_server da conta"""
    try:
        account = db.query(Account).filter(
            Account.id == account_id,
            Account.workspace_id == current_user.workspace_id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        
        account.broker_type = None
        account.broker_login = None
        account.broker_server = None
        
        db.commit()
        
        return {"message": "Corretora desconectada"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/available")
def get_available_brokers():
    """Retorna lista de corretoras disponíveis"""
    return [
        {
            "type": "MT4",
            "name": "MetaTrader 4",
            "description": "Plataforma clássica de trading"
        },
        {
            "type": "MT5",
            "name": "MetaTrader 5",
            "description": "Plataforma avançada de trading"
        },
        {
            "type": "cTrader",
            "name": "cTrader",
            "description": "Plataforma ECN profissional"
        },
        {
            "type": "Tradovate",
            "name": "Tradovate",
            "description": "Plataforma de futuros"
        },
        {
            "type": "NinjaTrader",
            "name": "NinjaTrader",
            "description": "Plataforma avançada de futuros"
        }
    ]
