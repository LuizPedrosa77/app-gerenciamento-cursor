from fastapi import APIRouter

# Create main API router
api_router = APIRouter()

# Import and include auth router
from app.api.v1.endpoints import auth
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"]
)

# Import and include accounts router
from app.api.v1.endpoints import accounts
api_router.include_router(
    accounts.router,
    prefix="/accounts",
    tags=["accounts"]
)

# Import and include trades router
from app.api.v1.endpoints import trades
api_router.include_router(
    trades.router,
    prefix="/trades",
    tags=["trades"]
)

# Import and include dashboard router
from app.api.v1.endpoints import dashboard
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"]
)

# Import and include daily notes router
from app.api.v1.endpoints import daily_notes
api_router.include_router(
    daily_notes.router,
    prefix="/daily-notes",
    tags=["daily-notes"]
)

# Import and include withdrawals router
from app.api.v1.endpoints import withdrawals
api_router.include_router(
    withdrawals.router,
    prefix="/withdrawals",
    tags=["withdrawals"]
)

# Import and include goals router
from app.api.v1.endpoints import goals
api_router.include_router(
    goals.router,
    prefix="/goals",
    tags=["goals"]
)

# Import and include profile router
from app.api.v1.endpoints import profile
api_router.include_router(
    profile.router,
    prefix="/profile",
    tags=["profile"]
)

# Import and include brokers router
from app.api.v1.endpoints import brokers
api_router.include_router(
    brokers.router,
    prefix="/brokers",
    tags=["brokers"]
)

# Import and include screenshots router
from app.api.v1.endpoints import screenshots
api_router.include_router(
    screenshots.router,
    prefix="/screenshots",
    tags=["screenshots"]
)

# Import and include AI router
from app.api.v1.endpoints import ai
api_router.include_router(
    ai.router,
    prefix="/ai",
    tags=["ai"]
)

# Import and include import MT5 router
from app.api.v1.endpoints import import_mt5
api_router.include_router(
    import_mt5.router,
    prefix="/import",
    tags=["import"]
)

# Import and include replay router
from app.api.v1.endpoints import replay
api_router.include_router(
    replay.router,
    prefix="/replay",
    tags=["replay"]
)

# Add endpoint routers here when they are created
# Example:
# from app.api.v1.endpoints.analytics import router as analytics_router
# api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
