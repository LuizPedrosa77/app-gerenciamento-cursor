from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta, date
from app.dependencies import DbSession, get_current_user
from app.models.user import User
from app.models.trade import Trade
from app.models.account import Account
from app.models.workspace import Workspace

router = APIRouter()

# Per-user calendar events (in-memory; scoped by user id)
_calendar_events: dict[str, list] = {}

def get_workspace(db: Session, user: User) -> Workspace:
    return db.query(Workspace).filter(Workspace.owner_id == user.id).first()

@router.get("/data")
def get_calendar_data(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    year: int = Query(default=None),
    month: int = Query(default=None),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"days": []}
    now = datetime.now()
    if not year:
        year = now.year
    if not month:
        month = now.month
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id,
        Trade.date >= start,
        Trade.date < end
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    days = {}
    for t in trades:
        if t.date:
            day_key = t.date.strftime("%Y-%m-%d")
            if day_key not in days:
                days[day_key] = {"date": day_key, "pnl": 0, "trades": 0, "wins": 0}
            days[day_key]["pnl"] += t.pnl or 0
            days[day_key]["trades"] += 1
            if (t.pnl or 0) > 0:
                days[day_key]["wins"] += 1
    result = []
    for day_key, data in days.items():
        total = data["trades"]
        wins = data["wins"]
        result.append({
            "date": day_key,
            "pnl": round(data["pnl"], 2),
            "trades": total,
            "win_rate": round(wins / total * 100, 2) if total > 0 else 0,
            "result": "win" if data["pnl"] > 0 else "loss" if data["pnl"] < 0 else "neutral"
        })
    return {"days": result}

@router.get("/summary")
def get_calendar_summary(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    year: int = Query(default=None),
    month: int = Query(default=None),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {}
    now = datetime.now()
    if not year:
        year = now.year
    if not month:
        month = now.month
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id,
        Trade.date >= start,
        Trade.date < end
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    total = len(trades)
    wins = len([t for t in trades if (t.pnl or 0) > 0])
    pnl = sum(t.pnl or 0 for t in trades)
    trading_days = len(set(
        t.date.strftime("%Y-%m-%d")
        for t in trades if t.date
    ))
    return {
        "year": year,
        "month": month,
        "total_trades": total,
        "wins": wins,
        "losses": total - wins,
        "win_rate": round(wins / total * 100, 2) if total > 0 else 0,
        "total_pnl": round(pnl, 2),
        "trading_days": trading_days,
        "avg_daily_pnl": round(pnl / trading_days, 2) if trading_days > 0 else 0
    }

@router.get("/streaks")
def get_calendar_streaks(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"current_streak": 0, "best_streak": 0}
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    ).order_by(Trade.date.asc())
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    day_pnl = {}
    for t in trades:
        if t.date:
            day_key = t.date.strftime("%Y-%m-%d")
            day_pnl[day_key] = day_pnl.get(day_key, 0) + (t.pnl or 0)
    sorted_days = sorted(day_pnl.items())
    current = 0
    best = 0
    temp = 0
    for _, pnl in sorted_days:
        if pnl > 0:
            temp += 1
            best = max(best, temp)
        else:
            temp = 0
    if sorted_days and sorted_days[-1][1] > 0:
        current = temp
    return {"current_streak": current, "best_streak": best}

@router.get("/heatmap")
def get_calendar_heatmap(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    year: int = Query(default=None),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"heatmap": []}
    now = datetime.now()
    if not year:
        year = now.year
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id,
        Trade.date >= start,
        Trade.date <= end
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    heatmap = {}
    for t in trades:
        if t.date:
            day_key = t.date.strftime("%Y-%m-%d")
            heatmap[day_key] = heatmap.get(day_key, 0) + (t.pnl or 0)
    result = [
        {"date": k, "pnl": round(v, 2)}
        for k, v in sorted(heatmap.items())
    ]
    return {"heatmap": result}

@router.get("/goals")
def get_calendar_goals(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"goals": []}
    from app.models.account import Account as AccountModel
    accounts = db.query(AccountModel).filter(
        AccountModel.workspace_id == workspace.id
    )
    if account_id:
        accounts = accounts.filter(AccountModel.id == account_id)
    accounts = accounts.all()
    goals = []
    now = datetime.now()
    for acc in accounts:
        if acc.monthly_goal:
            start = date(now.year, now.month, 1)
            trades = db.query(Trade).filter(
                Trade.account_id == acc.id,
                Trade.date >= start
            ).all()
            pnl = sum(t.pnl or 0 for t in trades)
            progress = (pnl / acc.monthly_goal * 100) if acc.monthly_goal > 0 else 0
            goals.append({
                "account_id": str(acc.id),
                "account_name": acc.name,
                "monthly_goal": acc.monthly_goal,
                "current_pnl": round(pnl, 2),
                "progress": round(min(progress, 100), 2),
                "achieved": progress >= 100
            })
    return {"goals": goals}


@router.get("/goals/check")
def check_goals(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    year: int = Query(default=None),
    month: int = Query(default=None),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"monthly": None, "biweekly": None}
    now = datetime.now()
    if not year:
        year = now.year
    if not month:
        month = now.month

    accounts_q = db.query(Account).filter(Account.workspace_id == workspace.id)
    if account_id:
        accounts_q = accounts_q.filter(Account.id == account_id)
    accounts = accounts_q.all()
    if not accounts:
        return {"monthly": None, "biweekly": None}

    # For now, use first matched account
    acc = accounts[0]
    monthly_goal = float(acc.monthly_goal or 0)
    start_month = date(year, month, 1)
    end_month = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    trades_month = db.query(Trade).filter(
        Trade.account_id == acc.id,
        Trade.date >= start_month,
        Trade.date < end_month
    ).all()
    pnl_month = sum(t.pnl or 0 for t in trades_month)
    pct_month = (pnl_month / monthly_goal * 100) if monthly_goal > 0 else 0

    # Biweekly goal: half of monthly goal, current half of month
    half_goal = monthly_goal / 2 if monthly_goal > 0 else 0
    mid_month = date(year, month, 16)
    now_date = now.date()
    if now_date < mid_month:
        half_start = start_month
        half_end = mid_month
    else:
        half_start = mid_month
        half_end = end_month
    trades_half = [t for t in trades_month if t.date >= half_start and t.date < half_end]
    pnl_half = sum(t.pnl or 0 for t in trades_half)
    pct_half = (pnl_half / half_goal * 100) if half_goal > 0 else 0

    return {
        "monthly": {
            "goal": monthly_goal,
            "current_amount": round(pnl_month, 2),
            "percentage": round(pct_month, 2),
            "achieved": pct_month >= 100 if monthly_goal > 0 else False
        },
        "biweekly": {
            "goal": half_goal,
            "current_amount": round(pnl_half, 2),
            "percentage": round(pct_half, 2),
            "achieved": pct_half >= 100 if half_goal > 0 else False
        }
    }


@router.get("/events")
def get_calendar_events(
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    account_id: Optional[str] = Query(default=None)
):
    user_id = str(current_user.id)
    events = list(_calendar_events.get(user_id, []))
    if account_id:
        events = [e for e in events if e.get("account_id") == account_id]
    if year:
        events = [e for e in events if e.get("date", "").startswith(f"{year:04d}-")]
    if month and year:
        events = [e for e in events if e.get("date", "").startswith(f"{year:04d}-{month:02d}")]
    return events


@router.post("/events")
def create_calendar_event(
    event: dict,
    current_user: User = Depends(get_current_user)
):
    user_id = str(current_user.id)
    if user_id not in _calendar_events:
        _calendar_events[user_id] = []
    event_id = str(event.get("id") or f"evt_{len(_calendar_events[user_id]) + 1}")
    payload = {**event, "id": event_id, "user_id": user_id}
    _calendar_events[user_id].append(payload)
    return payload


@router.delete("/events/{event_id}")
def delete_calendar_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    user_id = str(current_user.id)
    events = _calendar_events.get(user_id, [])
    _calendar_events[user_id] = [e for e in events if e.get("id") != event_id]
    return {"message": "Evento removido"}


@router.get("/holidays")
def get_holidays(
    year: Optional[int] = Query(default=None),
    country: Optional[str] = Query(default=None)
):
    return []


@router.get("/export")
def export_calendar(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    year: Optional[int] = Query(default=None),
    format: str = Query(default="json"),
    account_id: Optional[str] = Query(default=None)
):
    heatmap = get_calendar_heatmap(
        db=db,
        current_user=current_user,
        year=year,
        account_id=account_id
    ).get("heatmap", [])
    if format == "csv":
        lines = ["date,pnl"]
        for item in heatmap:
            lines.append(f"{item.get('date')},{item.get('pnl')}")
        csv_data = "\n".join(lines)
        return Response(content=csv_data, media_type="text/csv")
    return {"heatmap": heatmap}
