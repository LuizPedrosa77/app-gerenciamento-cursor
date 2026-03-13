from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from app.dependencies import DbSession, get_current_user
from app.models.user import User
from app.models.trade import Trade
from app.models.account import Account
from app.models.workspace import Workspace

router = APIRouter()

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
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
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
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
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
    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31)
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
            start = now.replace(day=1, hour=0, minute=0, second=0)
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
