"""
Dashboard and reporting endpoints.
"""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.dependencies import CurrentUser, CurrentWorkspace, DbSession
from app.services import dashboard_service

router = APIRouter()


# Common query parameters
class DashboardQueryParams(BaseModel):
    account_id: UUID = Field(..., description="Trading account ID")
    year: int | None = Field(None, ge=2020, le=2030, description="Year for filtering")
    month: int | None = Field(None, ge=1, le=12, description="Month for filtering")
    start_date: datetime | None = Field(None, description="Start date for filtering")
    end_date: datetime | None = Field(None, description="End date for filtering")


class TopTradesQueryParams(BaseModel):
    account_id: UUID = Field(..., description="Trading account ID")
    limit: int = Field(10, ge=1, le=100, description="Number of trades to return")
    trade_type: str = Field("profit", regex="^(profit|loss)$", description="Trade type: profit or loss")
    start_date: datetime | None = Field(None, description="Start date for filtering")
    end_date: datetime | None = Field(None, description="End date for filtering")


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    year: int | None = Query(None, ge=2020, le=2030),
    month: int | None = Query(None, ge=1, le=12),
):
    """
    Get trading summary with key metrics.
    
    Returns total trades, wins, losses, win rate, P&L, best/worst trades, etc.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    try:
        summary_data = await dashboard_service.summary(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            year=year,
            month=month,
        )
        
        return {
            "success": True,
            "data": summary_data,
            "filters": {
                "account_id": str(account_id),
                "year": year,
                "month": month,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard summary: {str(e)}",
        )


@router.get("/dashboard/monthly")
async def get_monthly_pnl(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    year: int = Query(..., ge=2020, le=2030, description="Year for monthly breakdown"),
):
    """
    Get P&L breakdown by month for a given year.
    
    Returns monthly data with trades count, P&L, and commission.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    try:
        monthly_data = await dashboard_service.pnl_by_month(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            year=year,
        )
        
        return {
            "success": True,
            "data": monthly_data,
            "filters": {
                "account_id": str(account_id),
                "year": year,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get monthly P&L: {str(e)}",
        )


@router.get("/dashboard/by-pair")
async def get_pnl_by_pair(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    start_date: datetime | None = Query(None, description="Start date for filtering"),
    end_date: datetime | None = Query(None, description="End date for filtering"),
):
    """
    Get P&L breakdown by currency pair.
    
    Returns performance metrics for each traded symbol.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    # Validate date range
    if start_date and end_date and start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date",
        )
    
    try:
        pair_data = await dashboard_service.pnl_by_pair(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            start_date=start_date,
            end_date=end_date,
        )
        
        return {
            "success": True,
            "data": pair_data,
            "filters": {
                "account_id": str(account_id),
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get P&L by pair: {str(e)}",
        )


@router.get("/dashboard/by-weekday")
async def get_pnl_by_weekday(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    start_date: datetime | None = Query(None, description="Start date for filtering"),
    end_date: datetime | None = Query(None, description="End date for filtering"),
):
    """
    Get P&L breakdown by day of week.
    
    Returns performance metrics for Monday through Sunday.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    # Validate date range
    if start_date and end_date and start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date",
        )
    
    try:
        weekday_data = await dashboard_service.pnl_by_weekday(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            start_date=start_date,
            end_date=end_date,
        )
        
        return {
            "success": True,
            "data": weekday_data,
            "filters": {
                "account_id": str(account_id),
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get P&L by weekday: {str(e)}",
        )


@router.get("/dashboard/by-week-of-month")
async def get_pnl_by_week_of_month(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    year: int | None = Query(None, ge=2020, le=2030, description="Year for filtering"),
    month: int | None = Query(None, ge=1, le=12, description="Month for filtering"),
):
    """
    Get P&L breakdown by week of month.
    
    Returns performance metrics for weeks 1-5 of each month.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    try:
        week_data = await dashboard_service.pnl_by_week_of_month(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            year=year,
            month=month,
        )
        
        return {
            "success": True,
            "data": week_data,
            "filters": {
                "account_id": str(account_id),
                "year": year,
                "month": month,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get P&L by week of month: {str(e)}",
        )


@router.get("/dashboard/by-direction")
async def get_pnl_by_direction(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    start_date: datetime | None = Query(None, description="Start date for filtering"),
    end_date: datetime | None = Query(None, description="End date for filtering"),
):
    """
    Get P&L breakdown by trade direction (BUY/SELL).
    
    Returns performance metrics comparing long vs short trades.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    # Validate date range
    if start_date and end_date and start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date",
        )
    
    try:
        direction_data = await dashboard_service.pnl_by_direction(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            start_date=start_date,
            end_date=end_date,
        )
        
        return {
            "success": True,
            "data": direction_data,
            "filters": {
                "account_id": str(account_id),
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get P&L by direction: {str(e)}",
        )


@router.get("/dashboard/top-trades")
async def get_top_trades(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    limit: int = Query(10, ge=1, le=100, description="Number of trades to return"),
    trade_type: str = Query("profit", regex="^(profit|loss)$", description="Trade type: profit or loss"),
    start_date: datetime | None = Query(None, description="Start date for filtering"),
    end_date: datetime | None = Query(None, description="End date for filtering"),
):
    """
    Get top trades by profit or loss.
    
    Returns the best performing trades (highest profit or lowest loss).
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    # Validate date range
    if start_date and end_date and start_date >= end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date",
        )
    
    try:
        trades_data = await dashboard_service.top_trades(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            limit=limit,
            trade_type=trade_type,
            start_date=start_date,
            end_date=end_date,
        )
        
        return {
            "success": True,
            "data": trades_data,
            "filters": {
                "account_id": str(account_id),
                "limit": limit,
                "trade_type": trade_type,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get top trades: {str(e)}",
        )


@router.get("/dashboard/account-evolution")
async def get_account_evolution(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    year: int | None = Query(None, ge=2020, le=2030, description="Year for evolution data"),
):
    """
    Get account balance evolution over time.
    
    Returns daily balance progression with cumulative P&L and trade count.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    try:
        evolution_data = await dashboard_service.account_evolution(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            year=year,
        )
        
        return {
            "success": True,
            "data": evolution_data,
            "filters": {
                "account_id": str(account_id),
                "year": year,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get account evolution: {str(e)}",
        )


@router.get("/dashboard/weekly-report")
async def get_weekly_report(
    db: DbSession,
    current_user: CurrentUser,
    current_workspace: CurrentWorkspace,
    account_id: UUID = Query(..., description="Trading account ID"),
    year: int = Query(..., ge=2020, le=2030, description="Year for weekly report"),
    week: int = Query(..., ge=1, le=53, description="Week number (1-53)"),
):
    """
    Get detailed weekly report for a specific week.
    
    Returns comprehensive weekly analysis with daily breakdown, top trades, and more.
    """
    workspace, _ = current_workspace
    
    # Validate account exists and user has access
    from app.services.account_service import get_account
    account = await get_account(db, account_id, workspace.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trading account not found",
        )
    
    # Validate week number
    if week < 1 or week > 53:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Week number must be between 1 and 53",
        )
    
    try:
        weekly_data = await dashboard_service.weekly_report(
            db=db,
            workspace_id=workspace.id,
            account_id=account_id,
            year=year,
            week=week,
        )
        
        return {
            "success": True,
            "data": weekly_data,
            "filters": {
                "account_id": str(account_id),
                "year": year,
                "week": week,
            },
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get weekly report: {str(e)}",
        )
