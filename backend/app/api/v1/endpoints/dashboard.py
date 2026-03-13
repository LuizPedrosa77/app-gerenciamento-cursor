from typing import Optional, List
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract

from app.dependencies import DbSession, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.models.account import Account
from app.models.workspace import Workspace
from app.schemas.dashboard import (
    DashboardSummary,
    MonthlyData,
    PairPerformance,
    WeekdayPerformance,
    TopTrade
)

router = APIRouter()


def get_account_ids_query(db: Session, workspace_id: str, account_id: Optional[str] = None):
    """Retorna query para filtrar por account_id ou todas as contas do workspace"""
    if account_id:
        return and_(Trade.account_id == account_id, Account.workspace_id == workspace_id)
    return Account.workspace_id == workspace_id


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    try:
        workspace = db.query(Workspace).filter(
            Workspace.owner_id == current_user.id
        ).first()
        
        if not workspace:
            return DashboardSummary(
                total_trades=0,
                win_trades=0,
                loss_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                best_trade=0.0,
                worst_trade=0.0,
                current_balance=0.0,
                initial_balance=0.0,
                monthly_goal=None,
                goal_progress=0.0
            )
        
        workspace_id = str(workspace.id)
        
        # Base query com JOIN e filtros
        if account_id:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id,
                Trade.account_id == account_id
            )
        else:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id
            )
        
        if year:
            base_query = base_query.filter(Trade.year == year)
        if month:
            base_query = base_query.filter(Trade.month == month)
        
        # Contadores
        total_trades = base_query.count()
        
        if total_trades == 0:
            # Retornar dados da conta se não houver trades
            accounts_query = db.query(Account).filter(Account.workspace_id == workspace_id)
            if account_id:
                accounts_query = accounts_query.filter(Account.id == account_id)
            
            accounts = accounts_query.all()
            current_balance = sum(float(acc.balance or 0) for acc in accounts)
            initial_balance = sum(float(acc.initial_balance or 0) for acc in accounts)
            monthly_goal = accounts[0].monthly_goal if accounts else None
            
            return DashboardSummary(
                total_trades=0,
                win_trades=0,
                loss_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                best_trade=0.0,
                worst_trade=0.0,
                current_balance=current_balance,
                initial_balance=initial_balance,
                monthly_goal=float(monthly_goal) if monthly_goal else None,
                goal_progress=0.0
            )
        
        win_trades = base_query.filter(Trade.result == "WIN").count()
        loss_trades = total_trades - win_trades
        win_rate = (win_trades / total_trades * 100) if total_trades > 0 else 0.0
        
        # PNL calculations
        pnl_stats = base_query.with_entities(
            func.sum(Trade.pnl).label('total_pnl'),
            func.max(Trade.pnl).label('best_trade'),
            func.min(Trade.pnl).label('worst_trade')
        ).first()
        
        total_pnl = float(pnl_stats.total_pnl or 0)
        best_trade = float(pnl_stats.best_trade or 0)
        worst_trade = float(pnl_stats.worst_trade or 0)
        
        # Balance da conta
        accounts_query = db.query(Account).filter(Account.workspace_id == workspace_id)
        if account_id:
            accounts_query = accounts_query.filter(Account.id == account_id)
        
        accounts = accounts_query.all()
        current_balance = sum(float(acc.balance or 0) for acc in accounts)
        initial_balance = sum(float(acc.initial_balance or 0) for acc in accounts)
        
        # Meta mensal e progresso
        monthly_goal = None
        goal_progress = 0.0
        
        if month and year:
            account_for_goal = accounts[0] if accounts else None
            if account_for_goal and account_for_goal.monthly_goal:
                monthly_goal = float(account_for_goal.monthly_goal)
                goal_progress = (total_pnl / monthly_goal * 100) if monthly_goal > 0 else 0.0
        
        return DashboardSummary(
            total_trades=total_trades,
            win_trades=win_trades,
            loss_trades=loss_trades,
            win_rate=win_rate,
            total_pnl=total_pnl,
            best_trade=best_trade,
            worst_trade=worst_trade,
            current_balance=current_balance,
            initial_balance=initial_balance,
            monthly_goal=monthly_goal,
            goal_progress=goal_progress
        )
        
    except Exception:
        # Retornar dados vazios em caso de erro
        return DashboardSummary(
            total_trades=0,
            win_trades=0,
            loss_trades=0,
            win_rate=0.0,
            total_pnl=0.0,
            best_trade=0.0,
            worst_trade=0.0,
            current_balance=0.0,
            initial_balance=0.0,
            monthly_goal=None,
            goal_progress=0.0
        )


@router.get("/monthly", response_model=List[MonthlyData])
def get_monthly_data(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(None),
    year: int = Query(default=datetime.now().year)
):
    try:
        workspace = db.query(Workspace).filter(
            Workspace.owner_id == current_user.id
        ).first()
        
        if not workspace:
            return []
        
        workspace_id = str(workspace.id)
        
        # Base query com JOIN e filtros
        if account_id:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id,
                Trade.account_id == account_id
            )
        else:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id
            )
        
        monthly_stats = (
            base_query.with_entities(
                Trade.month,
                Trade.year,
                func.count(Trade.id).label('total_trades'),
                func.sum(func.case([(Trade.result == "WIN", 1)], else_=0)).label('win_trades'),
                func.sum(Trade.pnl).label('total_pnl')
            )
            .filter(Trade.year == year)
            .group_by(Trade.month, Trade.year)
            .order_by(Trade.month)
            .all()
        )
        
        result = []
        for stat in monthly_stats:
            loss_trades = stat.total_trades - stat.win_trades
            win_rate = (stat.win_trades / stat.total_trades * 100) if stat.total_trades > 0 else 0.0
            
            result.append(MonthlyData(
                month=stat.month,
                year=stat.year,
                total_trades=stat.total_trades,
                win_trades=stat.win_trades,
                loss_trades=loss_trades,
                win_rate=win_rate,
                total_pnl=float(stat.total_pnl or 0)
            ))
        
        return result
        
    except Exception:
        return []


@router.get("/by-pair", response_model=List[PairPerformance])
def get_pair_performance(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    try:
        workspace = db.query(Workspace).filter(
            Workspace.owner_id == current_user.id
        ).first()
        
        if not workspace:
            return []
        
        workspace_id = str(workspace.id)
        
        # Base query com JOIN e filtros
        if account_id:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id,
                Trade.account_id == account_id
            )
        else:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id
            )
        
        if year:
            base_query = base_query.filter(Trade.year == year)
        if month:
            base_query = base_query.filter(Trade.month == month)
        
        pair_stats = (
            base_query.with_entities(
                Trade.pair,
                func.count(Trade.id).label('total_trades'),
                func.sum(func.case([(Trade.result == "WIN", 1)], else_=0)).label('win_trades'),
                func.sum(Trade.pnl).label('total_pnl')
            )
            .group_by(Trade.pair)
            .order_by(func.sum(Trade.pnl).desc())
            .all()
        )
        
        result = []
        for stat in pair_stats:
            loss_trades = stat.total_trades - stat.win_trades
            win_rate = (stat.win_trades / stat.total_trades * 100) if stat.total_trades > 0 else 0.0
            
            result.append(PairPerformance(
                pair=stat.pair,
                total_trades=stat.total_trades,
                win_trades=stat.win_trades,
                win_rate=win_rate,
                total_pnl=float(stat.total_pnl or 0)
            ))
        
        return result
        
    except Exception:
        return []


@router.get("/by-weekday", response_model=List[WeekdayPerformance])
def get_weekday_performance(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    try:
        workspace = db.query(Workspace).filter(
            Workspace.owner_id == current_user.id
        ).first()
        
        if not workspace:
            return []
        
        workspace_id = str(workspace.id)
        
        # Base query com JOIN e filtros
        if account_id:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id,
                Trade.account_id == account_id
            )
        else:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id
            )
        
        if year:
            base_query = base_query.filter(Trade.year == year)
        if month:
            base_query = base_query.filter(Trade.month == month)
        
        # Usar extract para obter o dia da semana (0=Sunday, 1=Monday, etc.)
        weekday_stats = (
            base_query.with_entities(
                extract('dow', Trade.date).label('weekday'),
                func.count(Trade.id).label('total_trades'),
                func.sum(func.case([(Trade.result == "WIN", 1)], else_=0)).label('win_trades'),
                func.sum(Trade.pnl).label('total_pnl')
            )
            .group_by(extract('dow', Trade.date))
            .order_by(extract('dow', Trade.date))
            .all()
        )
        
        weekday_names = {
            0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
            4: "Quinta", 5: "Sexta", 6: "Sábado"
        }
        
        result = []
        for stat in weekday_stats:
            weekday_num = int(stat.weekday)
            win_rate = (stat.win_trades / stat.total_trades * 100) if stat.total_trades > 0 else 0.0
            
            result.append(WeekdayPerformance(
                weekday=weekday_num,
                weekday_name=weekday_names.get(weekday_num, "Desconhecido"),
                total_trades=stat.total_trades,
                win_rate=win_rate,
                total_pnl=float(stat.total_pnl or 0)
            ))
        
        return result
        
    except Exception:
        return []


@router.get("/top-trades", response_model=List[TopTrade])
def get_top_trades(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(None),
    trade_type: str = Query(default="profit", pattern="^(profit|loss)$"),
    limit: int = Query(default=5, ge=1, le=50)
):
    try:
        workspace = db.query(Workspace).filter(
            Workspace.owner_id == current_user.id
        ).first()
        
        if not workspace:
            return []
        
        workspace_id = str(workspace.id)
        
        # Base query com JOIN e filtros
        if account_id:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id,
                Trade.account_id == account_id
            )
        else:
            base_query = db.query(Trade).join(Account).filter(
                Account.workspace_id == workspace_id
            )
        
        if trade_type == "profit":
            trades = base_query.order_by(Trade.pnl.desc()).limit(limit).all()
        else:  # loss
            trades = base_query.order_by(Trade.pnl.asc()).limit(limit).all()
        
        result = []
        for trade in trades:
            result.append(TopTrade(
                id=str(trade.id),
                date=trade.date,
                pair=trade.pair,
                direction=trade.direction,
                pnl=float(trade.pnl),
                result=trade.result
            ))
        
        return result
        
    except Exception:
        return []


@router.get("/stats")
def get_dashboard_stats(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return {}
    now = datetime.now()
    if not year:
        year = now.year
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    if month:
        query = query.filter(
            Trade.date >= datetime(year, month, 1),
            Trade.date < datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        )
    trades = query.all()
    total = len(trades)
    wins = len([t for t in trades if (t.pnl or 0) > 0])
    losses = total - wins
    pnl = sum(t.pnl or 0 for t in trades)
    win_rate = (wins / total * 100) if total > 0 else 0
    best = max((t.pnl or 0 for t in trades), default=0)
    worst = min((t.pnl or 0 for t in trades), default=0)
    monthly = {}
    for t in trades:
        if t.date:
            key = t.date.month
            if key not in monthly:
                monthly[key] = {"pnl": 0, "trades": 0, "wins": 0}
            monthly[key]["pnl"] += t.pnl or 0
            monthly[key]["trades"] += 1
            if (t.pnl or 0) > 0:
                monthly[key]["wins"] += 1
    monthly_data = [
        {
            "month": m,
            "pnl": round(d["pnl"], 2),
            "trades": d["trades"],
            "win_rate": round(d["wins"] / d["trades"] * 100, 2) if d["trades"] > 0 else 0
        }
        for m, d in sorted(monthly.items())
    ]
    pair_data = {}
    for t in trades:
        p = t.pair or "N/A"
        if p not in pair_data:
            pair_data[p] = {"pnl": 0, "trades": 0, "wins": 0}
        pair_data[p]["pnl"] += t.pnl or 0
        pair_data[p]["trades"] += 1
        if (t.pnl or 0) > 0:
            pair_data[p]["wins"] += 1
    pair_list = [
        {
            "pair": k,
            "pnl": round(v["pnl"], 2),
            "trades": v["trades"],
            "win_rate": round(v["wins"] / v["trades"] * 100, 2) if v["trades"] > 0 else 0
        }
        for k, v in pair_data.items()
    ]
    accounts = db.query(Account).filter(
        Account.workspace_id == workspace.id
    ).all()
    total_balance = sum(a.balance or 0 for a in accounts)
    return {
        "total_trades": total,
        "win_trades": wins,
        "loss_trades": losses,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(pnl, 2),
        "best_trade": round(best, 2),
        "worst_trade": round(worst, 2),
        "total_balance": round(total_balance, 2),
        "monthly_data": monthly_data,
        "pair_data": pair_list,
        "avg_monthly": round(pnl / len(monthly_data), 2) if monthly_data else 0,
        "top5_best": sorted(
            [{"pair": t.pair, "pnl": t.pnl, "date": str(t.date)} for t in trades],
            key=lambda x: x["pnl"] or 0, reverse=True
        )[:5],
        "top5_worst": sorted(
            [{"pair": t.pair, "pnl": t.pnl, "date": str(t.date)} for t in trades],
            key=lambda x: x["pnl"] or 0
        )[:5]
    }

@router.get("/by-direction")
def get_by_direction(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    direction_data = {}
    for t in trades:
        d = t.direction or "N/A"
        if d not in direction_data:
            direction_data[d] = {"pnl": 0, "trades": 0, "wins": 0}
        direction_data[d]["pnl"] += t.pnl or 0
        direction_data[d]["trades"] += 1
        if (t.pnl or 0) > 0:
            direction_data[d]["wins"] += 1
    return [
        {
            "direction": k,
            "pnl": round(v["pnl"], 2),
            "trades": v["trades"],
            "win_rate": round(v["wins"] / v["trades"] * 100, 2) if v["trades"] > 0 else 0
        }
        for k, v in direction_data.items()
    ]

@router.get("/account-evolution")
def get_account_evolution(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    now = datetime.now()
    if not year:
        year = now.year
    query = db.query(Trade).join(Account).filter(
        Account.workspace_id == workspace.id,
        Trade.date >= datetime(year, 1, 1),
        Trade.date <= datetime(year, 12, 31)
    ).order_by(Trade.date.asc())
    if account_id:
        query = query.filter(Account.id == account_id)
    trades = query.all()
    evolution = []
    cumulative = 0
    for t in trades:
        cumulative += t.pnl or 0
        evolution.append({
            "date": t.date.strftime("%Y-%m-%d") if t.date else None,
            "pnl": round(t.pnl or 0, 2),
            "cumulative": round(cumulative, 2)
        })
    return evolution
