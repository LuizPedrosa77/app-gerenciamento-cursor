from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.withdrawal import Withdrawal
from app.models.account import Account
from app.models.workspace import Workspace
from app.schemas.withdrawal import WithdrawalCreate, WithdrawalResponse

router = APIRouter()


def create_withdrawal_response(withdrawal: Withdrawal) -> WithdrawalResponse:
    """Create WithdrawalResponse from Withdrawal model."""
    return WithdrawalResponse(
        id=str(withdrawal.id),
        amount=float(withdrawal.amount),
        date=withdrawal.date,
        notes=withdrawal.notes,
        account_id=str(withdrawal.account_id),
        created_at=withdrawal.created_at
    )


@router.get("", response_model=List[WithdrawalResponse])
def get_withdrawals(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    """Get withdrawals from user's workspace."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    
    # Build query
    query = db.query(Withdrawal).filter(Withdrawal.workspace_id == workspace.id)
    
    if account_id:
        query = query.filter(Withdrawal.account_id == account_id)
    
    if year and month:
        query = query.filter(
            Withdrawal.date.between(
                date(year, month, 1),
                date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
            )
        )
    elif year:
        query = query.filter(
            Withdrawal.date.between(
                date(year, 1, 1),
                date(year + 1, 1, 1)
            )
        )
    
    withdrawals = query.order_by(Withdrawal.date.desc()).all()
    return [create_withdrawal_response(withdrawal) for withdrawal in withdrawals]


@router.post("", response_model=WithdrawalResponse)
def create_withdrawal(
    withdrawal_data: WithdrawalCreate,
    current_user: CurrentUser,
    db: DbSession
):
    """Create withdrawal and deduct from account balance."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Verify account belongs to workspace
    account = db.query(Account).filter(
        and_(Account.id == withdrawal_data.account_id, Account.workspace_id == workspace.id)
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check if account has sufficient balance
    if account.balance < withdrawal_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Create withdrawal
    withdrawal = Withdrawal(
        amount=withdrawal_data.amount,
        date=withdrawal_data.date,
        notes=withdrawal_data.notes,
        account_id=withdrawal_data.account_id,
        workspace_id=workspace.id
    )
    
    # Deduct from account balance
    account.balance -= withdrawal_data.amount
    
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    
    return create_withdrawal_response(withdrawal)


@router.delete("/{withdrawal_id}")
def delete_withdrawal(
    withdrawal_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Delete withdrawal and return amount to account balance."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get withdrawal
    withdrawal = db.query(Withdrawal).filter(
        and_(Withdrawal.id == withdrawal_id, Withdrawal.workspace_id == workspace.id)
    ).first()
    
    if not withdrawal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Withdrawal not found"
        )
    
    # Return amount to account balance
    account = db.query(Account).filter(
        and_(Account.id == withdrawal.account_id, Account.workspace_id == workspace.id)
    ).first()
    
    if account:
        account.balance += withdrawal.amount
    
    # Delete withdrawal
    db.delete(withdrawal)
    db.commit()
    
    return {"message": "Saque removido"}
