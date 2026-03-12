import os
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from openai import OpenAI

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.trade import Trade
from app.models.account import Account
from app.models.workspace import Workspace
from app.schemas.ai import AIAnalysisRequest, AIAnalysisResponse

router = APIRouter()

# System prompt para a IA
SYSTEM_PROMPT = """Você é um assistente especializado em trading forex e futuros. Analise os dados fornecidos e forneça insights práticos e objetivos em português brasileiro. Seja direto e conciso. Foque em padrões, riscos e oportunidades. Responda sempre em JSON com os campos: analysis (string), suggestions (array de strings), score (número de 0 a 10 ou null)."""

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key não configurada")
    return OpenAI(api_key=api_key)

def call_openai(client: OpenAI, context: str, question: Optional[str] = None) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Contexto: {context}"}
    ]
    
    if question:
        messages.append({"role": "user", "content": f"Pergunta: {question}"})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na chamada OpenAI: {str(e)}")

def get_workspace_context(db: Session, current_user: User) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")
    return workspace

def get_trade_context(db: Session, trade_id: str, workspace_id: str) -> str:
    trade = db.query(Trade).join(Account).filter(
        Trade.id == trade_id,
        Account.workspace_id == workspace_id
    ).first()
    
    if not trade:
        raise HTTPException(status_code=404, detail="Trade não encontrado")
    
    context = f"""
    Trade ID: {trade.id}
    Par: {trade.pair}
    Direção: {trade.direction}
    Lotes: {trade.lots}
    Resultado: {trade.result}
    PnL: {trade.pnl}
    Data: {trade.date}
    Possui VM: {trade.has_vm}
    """
    
    if trade.has_vm:
        context += f"""
        VM Lotes: {trade.vm_lots}
        VM Resultado: {trade.vm_result}
        VM PnL: {trade.vm_pnl}
        """
    
    if trade.notes:
        context += f"\nNotas: {trade.notes}"
    
    return context

def get_account_context(db: Session, account_id: str, workspace_id: str) -> str:
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace_id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    trades = db.query(Trade).filter(Trade.account_id == account_id).all()
    
    total_trades = len(trades)
    wins = sum(1 for t in trades if t.result == "WIN")
    losses = sum(1 for t in trades if t.result == "LOSS")
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    total_pnl = sum(float(t.pnl) for t in trades)
    
    context = f"""
    Conta ID: {account.id}
    Nome: {account.name}
    Saldo: {account.balance}
    Saldo Inicial: {account.initial_balance}
    Meta Mensal: {account.monthly_goal}
    Total de Trades: {total_trades}
    Wins: {wins}
    Losses: {losses}
    Win Rate: {win_rate:.2f}%
    PnL Total: {total_pnl}
    """
    
    if account.notes:
        context += f"\nNotas: {account.notes}"
    
    return context

def get_last_30_trades_context(db: Session, workspace_id: str, account_id: Optional[str] = None) -> str:
    query = db.query(Trade).join(Account).filter(Account.workspace_id == workspace_id)
    
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    
    trades = query.order_by(Trade.date.desc()).limit(30).all()
    
    if not trades:
        return "Não há trades suficientes para análise (menos de 30 trades)."
    
    total_trades = len(trades)
    wins = sum(1 for t in trades if t.result == "WIN")
    losses = sum(1 for t in trades if t.result == "LOSS")
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    total_pnl = sum(float(t.pnl) for t in trades)
    
    # Análise por pares
    pairs = {}
    for trade in trades:
        if trade.pair not in pairs:
            pairs[trade.pair] = {"wins": 0, "losses": 0, "pnl": 0}
        if trade.result == "WIN":
            pairs[trade.pair]["wins"] += 1
        else:
            pairs[trade.pair]["losses"] += 1
        pairs[trade.pair]["pnl"] += float(trade.pnl)
    
    context = f"""
    Análise dos últimos {total_trades} trades:
    Win Rate: {win_rate:.2f}% ({wins} wins, {losses} losses)
    PnL Total: {total_pnl:.2f}
    
    Desempenho por par:
    """
    
    for pair, data in pairs.items():
        wins = data["wins"]
        losses = data["losses"]
        pnl = data["pnl"]
        pair_win_rate = (wins / (wins + losses) * 100) if (wins + losses) > 0 else 0
        context += f"\n{pair}: {wins}W/{losses}L ({pair_win_rate:.1f}%) - PnL: {pnl:.2f}"
    
    return context

@router.post("/analyze", response_model=AIAnalysisResponse)
def analyze_trading(
    request: AIAnalysisRequest,
    db: DbSession,
    current_user: CurrentUser
):
    client = get_openai_client()
    workspace = get_workspace_context(db, current_user)
    
    context = ""
    
    if request.analysis_type == "trade" and request.trade_id:
        context = get_trade_context(db, request.trade_id, str(workspace.id))
    elif request.analysis_type == "account" and request.account_id:
        context = get_account_context(db, request.account_id, str(workspace.id))
    elif request.analysis_type == "predict" and request.trade_id:
        context = f"Análise preditiva para o trade:\n{get_trade_context(db, request.trade_id, str(workspace.id))}"
    else:
        context = "Análise geral de trading forex e futuros."
    
    ai_response = call_openai(client, context, request.question)
    
    return AIAnalysisResponse(
        analysis=ai_response.get("analysis", ""),
        suggestions=ai_response.get("suggestions", []),
        score=ai_response.get("score"),
        created_at=datetime.utcnow()
    )

@router.get("/insights", response_model=AIAnalysisResponse)
def get_insights(
    db: DbSession,
    current_user: CurrentUser,
    account_id: Optional[str] = Query(None)
):
    client = get_openai_client()
    workspace = get_workspace_context(db, current_user)
    
    context = get_last_30_trades_context(db, str(workspace.id), account_id)
    question = "Forneça insights gerais sobre o desempenho do trader com base nestes dados"
    
    ai_response = call_openai(client, context, question)
    
    return AIAnalysisResponse(
        analysis=ai_response.get("analysis", ""),
        suggestions=ai_response.get("suggestions", []),
        score=ai_response.get("score"),
        created_at=datetime.utcnow()
    )

@router.post("/predict", response_model=AIAnalysisResponse)
def predict_outcome(
    request: AIAnalysisRequest,
    db: DbSession,
    current_user: CurrentUser
):
    if not request.trade_id:
        raise HTTPException(status_code=400, detail="trade_id é obrigatório para previsão")
    
    client = get_openai_client()
    workspace = get_workspace_context(db, current_user)
    
    context = get_trade_context(db, request.trade_id, str(workspace.id))
    question = "Com base neste trade, faça uma previsão do resultado e sugira melhorias"
    
    ai_response = call_openai(client, context, question)
    
    return AIAnalysisResponse(
        analysis=ai_response.get("analysis", ""),
        suggestions=ai_response.get("suggestions", []),
        score=ai_response.get("score"),
        created_at=datetime.utcnow()
    )
