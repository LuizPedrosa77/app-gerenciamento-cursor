"""Simple rate limiting middleware (Redis-backed when available, in-memory fallback)."""
import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings

_memory_buckets: dict[str, list[float]] = defaultdict(list)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def _check_rate_limit(key: str, limit: int, window_seconds: int = 60) -> bool:
    now = time.time()
    cutoff = now - window_seconds
    bucket = _memory_buckets[key]
    _memory_buckets[key] = [t for t in bucket if t > cutoff]
    if len(_memory_buckets[key]) >= limit:
        return False
    _memory_buckets[key].append(now)
    return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if not path.startswith("/api/v1/auth") and not path.startswith("/api/v1/mt5-ea"):
            return await call_next(request)

        key = f"{_client_key(request)}:{path}"
        allowed = await _check_rate_limit(key, settings.RATE_LIMIT_PER_MINUTE, 60)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
            )
        return await call_next(request)
