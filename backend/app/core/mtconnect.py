import requests
from datetime import datetime
from typing import Optional
from app.core.config import settings


MTCONNECT_BASE = "https://www.mtconnectapi.com"


def fetch_trade_history(
    login: str,
    investor_password: str,
    server: str,
    platform: str = "MT5",
    last_ticket: int = 0
) -> list:
    """
    Busca histórico de trades via MTConnectAPI.
    Usa investor_password (somente leitura) — nunca a senha master.
    last_ticket=0 busca histórico completo. Qualquer valor > 0 busca
    apenas trades a partir daquele ticket (sync incremental).
    """
    url = f"{MTCONNECT_BASE}/"
    params = {
        "a": "getTradeHistory",
        "apikey": settings.MTCONNECT_API_KEY,
        "u": "",
        "an": login,
        "t": server,
        "p": investor_password.encode("utf-8").hex(),
        "s": "",
        "l": last_ticket,
        "pl": platform.upper()
    }
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()

    text = response.text.strip()
    if text.startswith("FAIL"):
        raise ValueError(f"MTConnectAPI retornou erro: {text}")

    import json
    try:
        data = json.loads(text)
    except Exception:
        raise ValueError(f"Resposta inesperada da MTConnectAPI: {text[:200]}")

    if isinstance(data, dict) and "deals" in data:
        return data["deals"]
    if isinstance(data, list):
        return data
    return []


def parse_deal_to_trade(deal: dict, account_id: str) -> Optional[dict]:
    """
    Converte um deal retornado pela MTConnectAPI para o formato
    do model Trade do sistema.
    Ignora deals que não são entradas/saídas reais de posição.
    """
    deal_type = str(deal.get("type", "")).upper()
    if deal_type not in ["BUY", "SELL"]:
        return None

    time_str = deal.get("closeTime") or deal.get("openTime") or deal.get("time", "")
    if not time_str:
        return None

    try:
        if "T" in str(time_str):
            dt = datetime.fromisoformat(str(time_str).replace("Z", "+00:00"))
        else:
            dt = datetime.fromtimestamp(int(time_str))
        trade_date = dt.date()
        year = dt.year
        month = dt.month
    except Exception:
        return None

    pnl = float(deal.get("profit", 0))
    lots = float(deal.get("volume", 0) or deal.get("lots", 0))
    symbol = str(deal.get("symbol", "") or deal.get("pair", "")).strip()
    ticket = str(deal.get("ticket", "") or deal.get("id", ""))

    if not symbol:
        return None

    result = "WIN" if pnl > 0 else "LOSS" if pnl < 0 else "BE"
    direction = "BUY" if deal_type == "BUY" else "SELL"

    return {
        "account_id": account_id,
        "date": trade_date,
        "year": year,
        "month": month,
        "pair": symbol,
        "direction": direction,
        "lots": lots,
        "pnl": pnl,
        "result": result,
        "notes": f"Importado via MTConnectAPI | Ticket: {ticket}"
    }


def get_last_ticket(deals: list) -> int:
    """
    Extrai o maior ticket da lista de deals para uso no próximo sync.
    Permite sync incremental — na próxima vez só busca trades novos.
    """
    tickets = []
    for deal in deals:
        t = deal.get("ticket") or deal.get("id")
        if t:
            try:
                tickets.append(int(t))
            except (ValueError, TypeError):
                pass
    return max(tickets) if tickets else 0
