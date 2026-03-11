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

# Add endpoint routers here when they are created
# Example:
# from app.api.v1.endpoints.accounts import router as accounts_router
# api_router.include_router(accounts_router, prefix="/accounts", tags=["accounts"])
