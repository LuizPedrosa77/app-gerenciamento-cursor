"""
Agregador de routers da API v1.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    accounts,
    auth,
    brokers,
    daily_notes,
    dashboard,
    health,
    replay,
    screenshot,
    trades,
    withdrawals,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(trades.router, prefix="/accounts", tags=["trades"])
api_router.include_router(withdrawals.router, prefix="/accounts", tags=["withdrawals"])
api_router.include_router(daily_notes.router, prefix="/daily-notes", tags=["daily-notes"])
api_router.include_router(screenshot.router, prefix="/trades", tags=["screenshots"])
api_router.include_router(brokers.router, prefix="/api/v1", tags=["brokers"])
api_router.include_router(replay.router, prefix="/api/v1", tags=["replay"])
api_router.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])
