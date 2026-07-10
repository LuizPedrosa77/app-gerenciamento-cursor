"""JWT token blacklist (Redis + in-memory fallback)."""
import time
from typing import Optional

import redis

from app.core.config import settings

_memory_blacklist: dict[str, float] = {}
_redis_client: Optional[redis.Redis] = None


def _get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception:
            _redis_client = None
    return _redis_client


def _ttl_seconds(exp: Optional[int]) -> int:
    if not exp:
        return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    remaining = int(exp) - int(time.time())
    return max(remaining, 60)


def blacklist_token(token: str, exp: Optional[int] = None) -> None:
    ttl = _ttl_seconds(exp)
    r = _get_redis()
    if r:
        try:
            r.setex(f"jwt:blacklist:{token}", ttl, "1")
        except Exception:
            pass
    _memory_blacklist[token] = time.time() + ttl


def is_token_blacklisted(token: str) -> bool:
    r = _get_redis()
    if r:
        try:
            if r.get(f"jwt:blacklist:{token}"):
                return True
        except Exception:
            pass
    expiry = _memory_blacklist.get(token)
    if not expiry:
        return False
    if expiry < time.time():
        _memory_blacklist.pop(token, None)
        return False
    return True
