from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.account import Account
from app.models.workspace import Workspace
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter()


def create_account_response(account: Account) -> AccountResponse:
    """Create AccountResponse from Account model."""
    return AccountResponse(
        id=str(account.id),
        name=account.name,
        balance=float(account.balance),
        initial_balance=float(account.initial_balance),
        monthly_goal=float(account.monthly_goal) if account.monthly_goal else None,
        meta=float(account.meta) if account.meta else None,
        notes=account.notes,
        is_active=account.is_active,
        created_at=account.created_at
    )


@router.get("", response_model=List[AccountResponse])
def get_accounts(
    current_user: CurrentUser,
    db: DbSession
):
    """Get all accounts from user's workspace."""
    # Get user's workspace (assuming single workspace for now)
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    
    accounts = db.query(Account).filter(Account.workspace_id == workspace.id).all()
    return [create_account_response(account) for account in accounts]


@router.post("", response_model=AccountResponse)
def create_account(
    account_data: AccountCreate,
    current_user: CurrentUser,
    db: DbSession
):
    """Create new account."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Create account
    account = Account(
        workspace_id=workspace.id,
        name=account_data.name,
        balance=account_data.initial_balance,
        initial_balance=account_data.initial_balance,
        monthly_goal=account_data.monthly_goal,
        meta=account_data.meta,
        notes=account_data.notes
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return create_account_response(account)


@router.get("/total-balance")
def get_total_balance(
    current_user: CurrentUser,
    db: DbSession
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return {"total_balance": 0, "accounts": []}
    accounts = db.query(Account).filter(
        Account.workspace_id == workspace.id,
        Account.is_active == True
    ).all()
    total = sum(a.balance or 0 for a in accounts)
    return {
        "total_balance": round(float(total), 2),
        "accounts": [
            {
                "id": str(a.id),
                "name": a.name,
                "balance": round(float(a.balance or 0), 2),
                "broker": a.broker_type
            }
            for a in accounts
        ]
    }


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Get specific account."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Find account
    account = db.query(Account).filter(
        and_(
            Account.id == account_id,
            Account.workspace_id == workspace.id
        )
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    return create_account_response(account)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: str,
    account_data: AccountUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """Update account."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Find account
    account = db.query(Account).filter(
        and_(
            Account.id == account_id,
            Account.workspace_id == workspace.id
        )
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    # Update fields
    update_data = account_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    account.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(account)
    
    return create_account_response(account)


@router.delete("/{account_id}")
def delete_account(
    account_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Delete account."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace não encontrado"
        )
    
    # Find account
    account = db.query(Account).filter(
        and_(
            Account.id == account_id,
            Account.workspace_id == workspace.id
        )
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    db.delete(account)
    db.commit()
    
    return {"message": "Conta removida"}


@router.get("/{account_id}/metrics")
def get_account_metrics(
    account_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return {}
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    if not account:
        return {}
    from app.models.trade import Trade
    trades = db.query(Trade).filter(
        Trade.account_id == account.id
    ).all()
    total = len(trades)
    wins = len([t for t in trades if float(t.pnl or 0) > 0])
    losses = total - wins
    pnl = sum(float(t.pnl or 0) for t in trades)
    win_rate = (wins / total * 100) if total > 0 else 0
    best = max((float(t.pnl or 0) for t in trades), default=0)
    worst = min((float(t.pnl or 0) for t in trades), default=0)
    return {
        "account_id": account_id,
        "account_name": account.name,
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(pnl, 2),
        "best_trade": round(best, 2),
        "worst_trade": round(worst, 2),
        "balance": round(float(account.balance or 0), 2)
    }
