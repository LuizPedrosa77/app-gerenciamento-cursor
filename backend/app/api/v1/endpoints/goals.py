from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.account import Account
from app.models.trade import Trade
from app.models.workspace import Workspace
from app.schemas.goal import GoalUpdate, GoalResponse

router = APIRouter()


def calculate_monthly_pnl(db: Session, account_id: str, year: int, month: int) -> float:
    """Calculate monthly PnL for an account."""
    monthly_pnl = db.query(func.sum(Trade.pnl)).filter(
        and_(
            Trade.account_id == account_id,
            Trade.year == year,
            Trade.month == month
        )
    ).scalar()
    
    return float(monthly_pnl) if monthly_pnl else 0.0


def calculate_progress(current: float, goal: Optional[float]) -> float:
    """Calculate progress percentage."""
    if not goal or goal <= 0:
        return 0.0
    return min((current / goal) * 100, 100.0)


@router.get("", response_model=List[GoalResponse])
def get_goals(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    """Get goals with progress for accounts."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    
    # Default to current year and month if not provided
    if not year:
        year = datetime.now().year
    if not month:
        month = datetime.now().month
    
    # Build query for accounts
    query = db.query(Account).filter(Account.workspace_id == workspace.id)
    
    if account_id:
        query = query.filter(Account.id == account_id)
    
    accounts = query.all()
    goals_response = []
    
    for account in accounts:
        # Calculate monthly PnL
        monthly_pnl = calculate_monthly_pnl(db, str(account.id), year, month)
        
        # Calculate total PnL (all time)
        total_pnl = db.query(func.sum(Trade.pnl)).filter(
            Trade.account_id == account.id
        ).scalar()
        total_pnl = float(total_pnl) if total_pnl else 0.0
        
        # Calculate progress
        monthly_progress = calculate_progress(monthly_pnl, account.monthly_goal)
        total_progress = calculate_progress(
            float(account.balance) - float(account.initial_balance) + total_pnl,
            account.meta
        )
        
        goals_response.append(GoalResponse(
            account_id=str(account.id),
            account_name=account.name,
            monthly_goal=float(account.monthly_goal) if account.monthly_goal else None,
            meta=float(account.meta) if account.meta else None,
            current_balance=float(account.balance),
            monthly_pnl=monthly_pnl,
            monthly_progress=monthly_progress,
            total_progress=total_progress
        ))
    
    return goals_response


@router.patch("/{account_id}", response_model=GoalResponse)
def update_goal(
    account_id: str,
    goal_data: GoalUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """Update monthly goal and/or meta for an account."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get account
    account = db.query(Account).filter(
        and_(Account.id == account_id, Account.workspace_id == workspace.id)
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Update goals
    if goal_data.monthly_goal is not None:
        account.monthly_goal = goal_data.monthly_goal
    if goal_data.meta is not None:
        account.meta = goal_data.meta
    
    account.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(account)
    
    # Calculate current progress
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    monthly_pnl = calculate_monthly_pnl(db, account_id, current_year, current_month)
    
    # Calculate total PnL (all time)
    total_pnl = db.query(func.sum(Trade.pnl)).filter(
        Trade.account_id == account.id
    ).scalar()
    total_pnl = float(total_pnl) if total_pnl else 0.0
    
    # Calculate progress
    monthly_progress = calculate_progress(monthly_pnl, account.monthly_goal)
    total_progress = calculate_progress(
        float(account.balance) - float(account.initial_balance) + total_pnl,
        account.meta
    )
    
    return GoalResponse(
        account_id=str(account.id),
        account_name=account.name,
        monthly_goal=float(account.monthly_goal) if account.monthly_goal else None,
        meta=float(account.meta) if account.meta else None,
        current_balance=float(account.balance),
        monthly_pnl=monthly_pnl,
        monthly_progress=monthly_progress,
        total_progress=total_progress
    )
