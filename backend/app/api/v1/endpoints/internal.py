"""
Internal API endpoints for n8n integration.
Protected by API Key authentication.
"""
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.database import get_async_session
from app.dependencies import DbSession
from app.tasks.sync_jobs import (
    cleanup_old_sync_logs,
    sync_account_history,
    sync_all_accounts,
    sync_market_data,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# API Key authentication dependency
async def verify_api_key(api_key: str = Query(..., description="Internal API Key")):
    """Verify API Key for internal endpoints."""
    if not settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal API Key not configured",
        )
    
    if api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return api_key


# Request/Response schemas
class SyncAccountRequest(BaseModel):
    days_back: int = Field(30, ge=1, le=365, description="Number of days to sync back")
    force_sync: bool = Field(False, description="Force sync even if recently synced")


class SyncWorkspaceRequest(BaseModel):
    days_back: int = Field(30, ge=1, le=365, description="Number of days to sync back")
    force_sync: bool = Field(False, description="Force sync even if recently synced")


class MarketDataSyncRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20, description="Symbol to sync")
    timeframe: str = Field(..., min_length=1, max_length=10, description="Timeframe (M1, M5, H1, D1, etc.)")
    days_back: int = Field(30, ge=1, le=365, description="Number of days of historical data")
    workspace_id: UUID | None = Field(None, description="Workspace ID (optional)")


class CleanupRequest(BaseModel):
    days_to_keep: int = Field(30, ge=1, le=365, description="Number of days to keep logs")


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    services: dict
    database: str


@router.post("/internal/sync/account/{account_id}")
async def sync_account(
    account_id: UUID,
    request: SyncAccountRequest,
    api_key: str = Depends(verify_api_key),
    db: DbSession = None,
):
    """
    Sync trade history for a specific account.
    
    This endpoint is called by n8n to sync individual accounts.
    """
    try:
        logger.info(f"Starting account sync for {account_id} (days_back={request.days_back}, force={request.force_sync})")
        
        result = await sync_account_history(
            account_id=str(account_id),
            workspace_id=None,  # Will be determined from account
            days_back=request.days_back,
            force_sync=request.force_sync,
        )
        
        # Log the result
        if result["success"]:
            logger.info(f"Account sync completed for {account_id}: {result.get('results', {})}")
        else:
            logger.error(f"Account sync failed for {account_id}: {result.get('error')}")
        
        return result
    
    except Exception as e:
        logger.error(f"Unexpected error in account sync for {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post("/internal/sync/workspace/{workspace_id}")
async def sync_workspace(
    workspace_id: UUID,
    request: SyncWorkspaceRequest,
    api_key: str = Depends(verify_api_key),
    db: DbSession = None,
):
    """
    Sync all active accounts in a workspace.
    
    This endpoint is called by n8n to sync entire workspaces.
    """
    try:
        logger.info(f"Starting workspace sync for {workspace_id} (days_back={request.days_back}, force={request.force_sync})")
        
        result = await sync_all_accounts(
            workspace_id=str(workspace_id),
            days_back=request.days_back,
            force_sync=request.force_sync,
        )
        
        # Log the result
        if result["success"]:
            summary = result.get("results", {})
            logger.info(f"Workspace sync completed for {workspace_id}: {summary.get('synced')}/{summary.get('total_accounts')} synced")
        else:
            logger.error(f"Workspace sync failed for {workspace_id}: {result.get('error')}")
        
        return result
    
    except Exception as e:
        logger.error(f"Unexpected error in workspace sync for {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/internal/health", response_model=HealthResponse)
async def health_check(api_key: str = Depends(verify_api_key)):
    """
    Health check endpoint for n8n monitoring.
    
    Returns system status and health indicators.
    """
    try:
        # Basic health checks
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc),
            "version": settings.VERSION,
            "services": {
                "database": "unknown",
                "broker_adapters": "available",
                "sync_jobs": "available",
                "websocket": "available",
            },
            "database": "connected",  # Would check actual DB connection
        }
        
        # Could add more sophisticated health checks here:
        # - Database connectivity
        # - External service availability
        # - Memory usage
        # - Disk space
        
        return health_status
    
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unavailable: {str(e)}",
        )


@router.post("/internal/market-data/import")
async def import_market_data(
    request: MarketDataSyncRequest,
    api_key: str = Depends(verify_api_key),
    db: DbSession = None,
):
    """
    Import historical market data for a symbol.
    
    This endpoint is called by n8n to import market data.
    """
    try:
        logger.info(f"Starting market data import for {request.symbol} {request.timeframe} ({request.days_back} days)")
        
        result = await sync_market_data(
            symbol=request.symbol,
            timeframe=request.timeframe,
            days_back=request.days_back,
            workspace_id=str(request.workspace_id) if request.workspace_id else None,
        )
        
        # Log the result
        if result["success"]:
            logger.info(f"Market data import completed for {request.symbol}: {result.get('results', {})}")
        else:
            logger.error(f"Market data import failed for {request.symbol}: {result.get('error')}")
        
        return result
    
    except Exception as e:
        logger.error(f"Unexpected error in market data import for {request.symbol}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post("/internal/cleanup")
async def cleanup_system(
    request: CleanupRequest,
    api_key: str = Depends(verify_api_key),
    db: DbSession = None,
):
    """
    Clean up old logs and temporary data.
    
    This endpoint is called by n8n for maintenance tasks.
    """
    try:
        logger.info(f"Starting system cleanup (keeping {request.days_to_keep} days)")
        
        result = await cleanup_old_sync_logs(days_to_keep=request.days_to_keep)
        
        # Log the result
        if result["success"]:
            logger.info(f"System cleanup completed: {result.get('results', {})}")
        else:
            logger.error(f"System cleanup failed: {result.get('error')}")
        
        return result
    
    except Exception as e:
        logger.error(f"Unexpected error in system cleanup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.get("/internal/status")
async def get_system_status(api_key: str = Depends(verify_api_key)):
    """
    Get detailed system status for monitoring.
    
    Returns information about active connections, recent syncs, etc.
    """
    try:
        # This would typically query the database for:
        # - Active broker connections
        # - Recent sync activities
        # - System metrics
        # - Error rates
        
        status = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system": {
                "uptime": "unknown",  # Would calculate from process start time
                "version": settings.VERSION,
                "environment": "development" if settings.DEBUG else "production",
            },
            "connections": {
                "active_workspaces": 0,  # Would query DB
                "broker_connections": 0,  # Would query DB
                "websocket_connections": 0,  # Would check WebSocket manager
            },
            "sync_activity": {
                "last_24h": {
                    "accounts_synced": 0,
                    "trades_imported": 0,
                    "errors": 0,
                },
                "last_week": {
                    "accounts_synced": 0,
                    "trades_imported": 0,
                    "errors": 0,
                },
            },
            "health": "healthy",
        }
        
        return status
    
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )


@router.post("/internal/test/webhook")
async def test_webhook(
    webhook_data: dict,
    api_key: str = Depends(verify_api_key),
):
    """
    Test endpoint for n8n webhook configuration.
    
    Simply echoes back the received data for testing.
    """
    try:
        logger.info(f"Webhook test received: {webhook_data}")
        
        return {
            "success": True,
            "message": "Webhook received successfully",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "received_data": webhook_data,
        }
    
    except Exception as e:
        logger.error(f"Webhook test failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
