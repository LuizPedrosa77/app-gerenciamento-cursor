import json
import asyncio
import uuid
import random
from datetime import datetime, date, time, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.replay import ReplaySession, ReplayControl, CandleData, ReplayMessage

router = APIRouter()
security = HTTPBearer()

# Armazenamento em memória para sessões de replay
replay_sessions: Dict[str, ReplaySession] = {}
websocket_connections: Dict[str, WebSocket] = {}


def get_current_user_from_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_mock_candles(pair: str, date: date, count: int = 100) -> List[dict]:
    base_prices = {
        "EURUSD": 1.0850,
        "GBPUSD": 1.2650,
        "USDJPY": 149.50,
        "XAUUSD": 2020.0,
    }
    price = base_prices.get(pair, 1.0000)
    dt = datetime.combine(date, time(9, 0))
    candles = []

    for i in range(count):
        change = random.uniform(-0.0010, 0.0010)
        open_p = price
        close_p = price + change
        high_p = max(open_p, close_p) + random.uniform(0, 0.0005)
        low_p = min(open_p, close_p) - random.uniform(0, 0.0005)
        volume = random.randint(500, 2000)
        
        candles.append({
            "time": dt.isoformat(),
            "open": round(open_p, 5),
            "high": round(high_p, 5),
            "low": round(low_p, 5),
            "close": round(close_p, 5),
            "volume": volume
        })
        price = close_p
        dt += timedelta(minutes=5)
    
    return candles


@router.websocket("/ws/{session_id}")
async def websocket_replay(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    await websocket.accept()
    
    # Validar token
    try:
        current_user = get_current_user_from_token(token, db)
    except HTTPException:
        await websocket.close(code=401, reason="Unauthorized")
        return
    
    # Verificar se a sessão existe
    if session_id not in replay_sessions:
        await websocket.close(code=404, reason="Session not found")
        return
    
    session = replay_sessions[session_id]
    candles = generate_mock_candles(session.pair, session.date, session.total_candles)
    
    # Armazenar conexão
    websocket_connections[session_id] = websocket
    
    try:
        while True:
            # Receber mensagem do cliente
            data = await websocket.receive_text()
            control = ReplayControl(**json.loads(data))
            
            if control.action == "start" or control.action == "resume":
                session.status = "running"
                
                # Enviar candles continuamente
                while session.status == "running" and session.current_candle < len(candles):
                    candle = candles[session.current_candle]
                    session.current_candle += 1
                    
                    message = ReplayMessage(
                        type="candle",
                        candle=CandleData(**candle),
                        current=session.current_candle,
                        total=len(candles),
                        progress=round((session.current_candle / len(candles)) * 100, 1)
                    )
                    
                    await websocket.send_text(message.model_dump_json())
                    
                    # Delay baseado na velocidade
                    await asyncio.sleep(1.0 / control.speed)
                
                if session.current_candle >= len(candles):
                    session.status = "finished"
                    
            elif control.action == "pause":
                session.status = "paused"
                
            elif control.action == "stop":
                session.status = "finished"
                break
                
            elif control.action == "next":
                if session.current_candle < len(candles):
                    candle = candles[session.current_candle]
                    session.current_candle += 1
                    
                    message = ReplayMessage(
                        type="candle",
                        candle=CandleData(**candle),
                        current=session.current_candle,
                        total=len(candles),
                        progress=round((session.current_candle / len(candles)) * 100, 1)
                    )
                    
                    await websocket.send_text(message.model_dump_json())
                    
            elif control.action == "prev":
                if session.current_candle > 0:
                    session.current_candle -= 1
                    candle = candles[session.current_candle]
                    
                    message = ReplayMessage(
                        type="candle",
                        candle=CandleData(**candle),
                        current=session.current_candle,
                        total=len(candles),
                        progress=round((session.current_candle / len(candles)) * 100, 1)
                    )
                    
                    await websocket.send_text(message.model_dump_json())
                    
    except WebSocketDisconnect:
        pass
    finally:
        # Limpar conexão
        if session_id in websocket_connections:
            del websocket_connections[session_id]


# Dependência correta para endpoints REST
def get_current_user(
    credentials: dict = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    return get_current_user_from_token(token, db)


@router.get("/sessions")
def get_replay_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Obter workspace do usuário
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return {"sessions": []}
    
    # Filtrar sessões do workspace (simulado - em produção seria no banco)
    user_sessions = [
        session for session in replay_sessions.values()
        if session.account_id in [f"account_{i}" for i in range(1, 4)]  # Simulação
    ]
    
    return {"sessions": user_sessions}


@router.post("/sessions")
def create_replay_session(
    account_id: str,
    pair: str,
    date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validar workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Gerar candles para determinar total
    candles = generate_mock_candles(pair, date)
    
    # Criar nova sessão
    session_id = str(uuid.uuid4())
    session = ReplaySession(
        session_id=session_id,
        account_id=account_id,
        pair=pair,
        date=date,
        status="pending",
        current_candle=0,
        total_candles=len(candles),
        created_at=datetime.utcnow()
    )
    
    # Armazenar sessão
    replay_sessions[session_id] = session
    
    return session


@router.delete("/sessions/{session_id}")
def delete_replay_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validar workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Verificar se sessão existe
    if session_id not in replay_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remover sessão
    del replay_sessions[session_id]
    
    # Fechar conexão WebSocket se existir
    if session_id in websocket_connections:
        try:
            asyncio.create_task(websocket_connections[session_id].close())
        except:
            pass
        del websocket_connections[session_id]
    
    return {"message": "Sessão removida"}
