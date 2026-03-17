import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

from app.api.router import api_router
from app.websocket import trade_ws
from app.websocket.trade_ws import websocket_trades
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Redis client (optional)
    listener_task = None
    try:
        trade_ws.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await trade_ws.redis_client.ping()
        # Start the Redis listener background task
        listener_task = asyncio.create_task(trade_ws.redis_listener())
    except Exception as exc:
        trade_ws.redis_client = None
        listener_task = None
        print(f"[WS] Redis unavailable, running without PubSub: {exc}")
    
    yield
    
    # Shutdown: Clean up background task and Redis connection
    if listener_task:
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass
        
    if trade_ws.redis_client:
        await trade_ws.redis_client.aclose()


app = FastAPI(title="Gustavo Pedrosa FX API", redirect_slashes=False, lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://fx.hubnexusai.com",
        "https://fx.painelzap.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

app.add_api_websocket_route("/ws/trades", websocket_trades)


@app.get("/")
def health_check():
    return {"status": "ok"}
