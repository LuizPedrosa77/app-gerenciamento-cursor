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

@router.get("/weekly")
def get_weekly_report(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    year: int = Query(default=None),
    week: int = Query(default=None),
    account_id: Optional[str] = Query(default=None)
):
    from datetime import date
    import math
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"week_pnl": 0, "prev_pnl": 0, "week_win_rate": 0,
                "week_trades_count": 0, "diff_pnl": 0, "chart_data": []}
    now = datetime.now()
    if not year:
        year = now.year
    if not week:
        week = now.isocalendar()[1]
    week_start = datetime.fromisocalendar(year, week, 1)
    week_end = week_start + timedelta(days=6)
    prev_start = week_start - timedelta(days=7)
    prev_end = week_start - timedelta(days=1)
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    week_trades = query.filter(
        Trade.date >= week_start,
        Trade.date <= week_end
    ).all()
    prev_trades = query.filter(
        Trade.date >= prev_start,
        Trade.date <= prev_end
    ).all()
    week_pnl = sum(t.pnl or 0 for t in week_trades)
    prev_pnl = sum(t.pnl or 0 for t in prev_trades)
    wins = len([t for t in week_trades if (t.pnl or 0) > 0])
    total = len(week_trades)
    win_rate = (wins / total * 100) if total > 0 else 0
    diff_pnl = week_pnl - prev_pnl
    chart_data = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_trades = [t for t in week_trades if t.date and t.date.date() == day.date()]
        chart_data.append({
            "day": day.strftime("%a"),
            "date": day.strftime("%Y-%m-%d"),
            "pnl": round(sum(t.pnl or 0 for t in day_trades), 2),
            "trades": len(day_trades)
        })
    return {
        "year": year,
        "week": week,
        "week_start": week_start.strftime("%Y-%m-%d"),
        "week_end": week_end.strftime("%Y-%m-%d"),
        "week_pnl": round(week_pnl, 2),
        "prev_pnl": round(prev_pnl, 2),
        "diff_pnl": round(diff_pnl, 2),
        "week_win_rate": round(win_rate, 2),
        "week_trades_count": total,
        "chart_data": chart_data
    }

@router.get("/gp-score")
def get_gp_score(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"score": 0, "label": "Sem dados", "breakdown": {}}
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    if not trades:
        return {"score": 0, "label": "Sem dados", "breakdown": {}}
    total = len(trades)
    wins = len([t for t in trades if (t.pnl or 0) > 0])
    losses = len([t for t in trades if (t.pnl or 0) < 0])
    win_rate = (wins / total * 100) if total > 0 else 0
    total_pnl = sum(t.pnl or 0 for t in trades)
    pnl_positive = total_pnl > 0
    consistency = min(total / 50 * 100, 100)
    score = (win_rate * 0.4) + (consistency * 0.3) + (30 if pnl_positive else 0)
    score = min(round(score, 1), 100)
    if score >= 75:
        label = "Excelente"
    elif score >= 50:
        label = "Bom"
    elif score >= 25:
        label = "Regular"
    else:
        label = "Iniciante"
    return {
        "score": score,
        "label": label,
        "breakdown": {
            "win_rate": round(win_rate, 2),
            "consistency": round(consistency, 2),
            "profitability": 30 if pnl_positive else 0
        }
    }

@router.get("/gp-score/history")
def get_gp_score_history(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    months: int = Query(default=6),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return []
    now = datetime.now()
    history = []
    for i in range(months - 1, -1, -1):
        month_date = now.replace(day=1) - timedelta(days=i * 30)
        query = db.query(Trade).join(Account).filter(
            Account.workspace_id == workspace.id,
            Trade.date >= month_date.replace(day=1),
            Trade.date < (month_date.replace(day=28) + timedelta(days=4)).replace(day=1)
        )
        if account_id:
            query = query.filter(Account.id == account_id)
        trades = query.all()
        total = len(trades)
        wins = len([t for t in trades if (t.pnl or 0) > 0])
        win_rate = (wins / total * 100) if total > 0 else 0
        pnl_positive = sum(t.pnl or 0 for t in trades) > 0
        consistency = min(total / 50 * 100, 100)
        score = (win_rate * 0.4) + (consistency * 0.3) + (30 if pnl_positive else 0)
        history.append({
            "month": month_date.strftime("%b/%y"),
            "score": round(min(score, 100), 1),
            "trades": total
        })
    return history

@router.get("/streaks")
def get_streaks(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"current_streak": 0, "current_type": None,
                "best_win_streak": 0, "best_loss_streak": 0}
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    ).order_by(Trade.date.asc())
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    if not trades:
        return {"current_streak": 0, "current_type": None,
                "best_win_streak": 0, "best_loss_streak": 0}
    current_streak = 0
    current_type = None
    best_win = 0
    best_loss = 0
    temp_win = 0
    temp_loss = 0
    for t in trades:
        if (t.pnl or 0) > 0:
            temp_win += 1
            temp_loss = 0
            best_win = max(best_win, temp_win)
        else:
            temp_loss += 1
            temp_win = 0
            best_loss = max(best_loss, temp_loss)
    last = trades[-1]
    if (last.pnl or 0) > 0:
        current_streak = temp_win
        current_type = "win"
    else:
        current_streak = temp_loss
        current_type = "loss"
    return {
        "current_streak": current_streak,
        "current_type": current_type,
        "best_win_streak": best_win,
        "best_loss_streak": best_loss
    }

@router.get("/best-day")
def get_best_day(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"best_day": None, "worst_day": None, "by_weekday": []}
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    day_data = {i: {"pnl": 0, "trades": 0, "wins": 0} for i in range(7)}
    for t in trades:
        if t.date:
            wd = t.date.weekday()
            day_data[wd]["pnl"] += t.pnl or 0
            day_data[wd]["trades"] += 1
            if (t.pnl or 0) > 0:
                day_data[wd]["wins"] += 1
    by_weekday = []
    for i, name in enumerate(days):
        d = day_data[i]
        wr = (d["wins"] / d["trades"] * 100) if d["trades"] > 0 else 0
        by_weekday.append({
            "day": name,
            "pnl": round(d["pnl"], 2),
            "trades": d["trades"],
            "win_rate": round(wr, 2)
        })
    best = max(by_weekday, key=lambda x: x["pnl"]) if by_weekday else None
    worst = min(by_weekday, key=lambda x: x["pnl"]) if by_weekday else None
    return {"best_day": best, "worst_day": worst, "by_weekday": by_weekday}

@router.get("/monthly-summary")
def get_monthly_summary(
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
    losses = total - wins
    pnl = sum(t.pnl or 0 for t in trades)
    win_rate = (wins / total * 100) if total > 0 else 0
    return {
        "year": year,
        "month": month,
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(pnl, 2),
        "avg_pnl": round(pnl / total, 2) if total > 0 else 0
    }

@router.get("/risk-metrics")
def get_risk_metrics(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    workspace = get_workspace(db, current_user)
    if not workspace:
        return {"max_drawdown": 0, "sharpe_ratio": 0, "profit_factor": 0}
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    ).order_by(Trade.date.asc())
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    if not trades:
        return {"max_drawdown": 0, "sharpe_ratio": 0, "profit_factor": 0}
    pnls = [t.pnl or 0 for t in trades]
    gross_profit = sum(p for p in pnls if p > 0)
    gross_loss = abs(sum(p for p in pnls if p < 0))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else 0
    cumulative = []
    total = 0
    for p in pnls:
        total += p
        cumulative.append(total)
    peak = cumulative[0]
    max_drawdown = 0
    for val in cumulative:
        if val > peak:
            peak = val
        dd = peak - val
        if dd > max_drawdown:
            max_drawdown = dd
    import statistics
    avg = statistics.mean(pnls) if pnls else 0
    std = statistics.stdev(pnls) if len(pnls) > 1 else 0
    sharpe = (avg / std) if std > 0 else 0
    return {
        "max_drawdown": round(max_drawdown, 2),
        "sharpe_ratio": round(sharpe, 4),
        "profit_factor": round(profit_factor, 2),
        "gross_profit": round(gross_profit, 2),
        "gross_loss": round(gross_loss, 2)
    }

@router.get("/notifications/goals")
def get_goal_notifications(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None)
):
    return []

@router.post("/notifications/goals/{goal_id}/dismiss")
def dismiss_goal_notification(
    goal_id: str,
    db: DbSession,
    current_user: User = Depends(get_current_user)
):
    return {"message": "Notificação dispensada"}
