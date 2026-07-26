import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis

from app.api.router import api_router
from app.websocket import trade_ws
from app.websocket.trade_ws import websocket_trades
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.logging_config import setup_logging, get_logger

# Initialize logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application...")
    listener_task = None
    try:
        trade_ws.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await trade_ws.redis_client.ping()
        listener_task = asyncio.create_task(trade_ws.redis_listener())
        logger.info("Redis PubSub connected successfully")
    except Exception as exc:
        trade_ws.redis_client = None
        listener_task = None
        logger.warning(f"Redis unavailable, running without PubSub: {exc}")

    yield

    logger.info("Shutting down application...")
    if listener_task:
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

    if trade_ws.redis_client:
        await trade_ws.redis_client.aclose()
        logger.info("Redis connection closed")


app = FastAPI(title="Gustavo Pedrosa FX API", redirect_slashes=False, lifespan=lifespan)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "x-api-key"],
)

app.include_router(api_router, prefix="/api/v1")
app.add_api_websocket_route("/ws/trades", websocket_trades)


@app.get("/")
def health_check():
    return {"status": "ok"}
