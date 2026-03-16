import json
import logging
import asyncio
from typing import Dict, Set, Optional

from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import redis.asyncio as redis

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Global redis client variable to be initialized on startup
redis_client: Optional[redis.Redis] = None


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            if user_id not in self.connections:
                self.connections[user_id] = set()
            self.connections[user_id].add(websocket)
        logger.info(f"[WS] connected user={user_id}")

    async def disconnect(self, user_id: str, websocket: WebSocket):
        async with self.lock:
            if user_id in self.connections:
                self.connections[user_id].discard(websocket)
                if not self.connections[user_id]:
                    del self.connections[user_id]
        logger.info(f"[WS] disconnected user={user_id}")

    async def send_personal_message(self, user_id: str, event: dict):
        """Sends a message ONLY to the physical websockets connected to THIS worker."""
        payload = json.dumps(event)
        async with self.lock:
            sockets = self.connections.get(user_id, set()).copy()

        dead = []
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        if dead:
            async with self.lock:
                for ws in dead:
                    self.connections[user_id].discard(ws)

    async def send_to_user(self, user_id: str, event: dict):
        """
        Public API: Publishes the event to Redis so ALL workers receive it.
        This is what endpoints (like MT5 sync) should call.
        """
        if redis_client is None:
            logger.warning("Redis client not initialized. Cannot publish.")
            return

        # Add routing info to the payload
        event["_target_user_id"] = str(user_id)
        payload = json.dumps(event, default=str)
        try:
            await redis_client.publish("trade_events", payload)
        except Exception as e:
            logger.error(f"[WS] Error publishing to Redis: {e}")

    async def broadcast(self, event: dict):
        """Publish broadcast event to Redis for all users."""
        if redis_client is None:
            return
        
        event["_target_user_id"] = "ALL"
        payload = json.dumps(event, default=str)
        await redis_client.publish("trade_events", payload)


manager = ConnectionManager()


# JWT AUTH
def get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != "access":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True
        ).first()
        return user
    except JWTError as e:
        logger.error(f"JWT error {e}")
        return None


# REDIS LISTENER
async def redis_listener():
    """Background task to listen for Redis PubSub events and forward to local WS."""
    if redis_client is None:
        logger.error("Redis client is None in listener.")
        return

    pubsub = redis_client.pubsub()
    await pubsub.subscribe("trade_events")
    logger.info("[WS] Subscribed to Redis channel 'trade_events'")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            try:
                data = json.loads(message["data"])
                target_user = data.pop("_target_user_id", None)

                if target_user == "ALL":
                    # Send to everyone locally
                    async with manager.lock:
                        local_users = list(manager.connections.keys())
                    for uid in local_users:
                        await manager.send_personal_message(uid, data)
                elif target_user:
                    # Check if target_user is connected to THIS worker
                    is_local = False
                    async with manager.lock:
                        is_local = target_user in manager.connections
                    
                    if is_local:
                        await manager.send_personal_message(target_user, data)

            except Exception as e:
                logger.error(f"[WS] redis message processing error {e}")
    except asyncio.CancelledError:
        logger.info("[WS] Redis listener cancelled")
        await pubsub.unsubscribe("trade_events")
        await pubsub.close()


# HEARTBEAT
async def heartbeat(websocket: WebSocket):
    while True:
        try:
            await websocket.send_text(json.dumps({"type": "ping"}))
        except Exception:
            break
        await asyncio.sleep(30)


# WEBSOCKET ENDPOINT
async def websocket_trades(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    if not token:
        await websocket.close(code=4001, reason="Token missing")
        return

    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001, reason="Token inválido")
        return

    user_id = str(user.id)
    await manager.connect(user_id, websocket)

    heartbeat_task = asyncio.create_task(heartbeat(websocket))

    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "user_id": user_id
        }))

        while True:
            message = await websocket.receive_text()
            try:
                data = json.loads(message)
                if data.get("type") == "pong":
                    continue
            except Exception:
                pass

    except WebSocketDisconnect:
        pass
    finally:
        heartbeat_task.cancel()
        await manager.disconnect(user_id, websocket)
