from typing import Optional, List, Dict
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract, case

from app.dependencies import DbSession, get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.models.account import Account
from app.models.open_position import OpenPosition
from app.models.workspace import Workspace
from app.schemas.dashboard import (
    DashboardSummary,
    MonthlyData,
    PairPerformance,
    WeekdayPerformance,
    TopTrade
)

router = APIRouter()

MONTH_NAMES_PT = {
    1: "Jan",
    2: "Fev",
    3: "Mar",
    4: "Abr",
    5: "Mai",
    6: "Jun",
    7: "Jul",
    8: "Ago",
    9: "Set",
    10: "Out",
    11: "Nov",
    12: "Dez",
}

WEEKDAY_NAMES_PT = {
    0: "Domingo",
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado",
}


@router.get("/open-positions")
def get_open_positions(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(None),
):
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return {"items": [], "open_positions_count": 0, "floating_pnl_total": 0.0}

    query = db.query(OpenPosition).join(Account, Account.id == OpenPosition.account_id).filter(
        OpenPosition.workspace_id == workspace.id
    )
    if account_id:
        query = query.filter(OpenPosition.account_id == account_id)

    positions = query.order_by(OpenPosition.updated_at.desc()).all()
    items = [
        {
            "account_id": str(p.account_id),
            "ticket": p.ticket,
            "symbol": p.symbol_normalized or p.symbol_raw,
            "symbol_raw": p.symbol_raw,
            "direction": p.direction,
            "lots": float(p.lots or 0),
            "open_time": p.open_time.isoformat() if p.open_time else None,
            "open_price": float(p.open_price) if p.open_price is not None else None,
            "floating_pnl": float(p.floating_pnl or 0),
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        for p in positions
    ]

    return {
        "items": items,
        "open_positions_count": len(items),
        "floating_pnl_total": sum(item["floating_pnl"] for item in items),
    }


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
                func.sum(case((Trade.result == "WIN", 1), else_=0)).label('win_trades'),
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
                func.sum(case((Trade.result == "WIN", 1), else_=0)).label('win_trades'),
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
                func.sum(case((Trade.result == "WIN", 1), else_=0)).label('win_trades'),
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
    month: Optional[int] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None)
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
    trade_total_expr = func.coalesce(Trade.pnl, 0) + case(
        (Trade.has_vm == True, func.coalesce(Trade.vm_pnl, 0)),
        else_=0
    )
    if account_id:
        query = query.filter(Account.id == account_id)
    if month:
        query = query.filter(
            Trade.date >= date(year, month, 1),
            Trade.date < (date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1))
        )
    if start_date:
        query = query.filter(Trade.date >= start_date)
    if end_date:
        query = query.filter(Trade.date <= end_date)
    
    # 1. Totals
    totals = query.with_entities(
        func.count(Trade.id).label('total'),
        func.sum(case((trade_total_expr > 0, 1), else_=0)).label('wins'),
        func.sum(trade_total_expr).label('pnl'),
        func.max(trade_total_expr).label('best'),
        func.min(trade_total_expr).label('worst')
    ).first()
    
    total_trades = totals.total or 0
    wins = totals.wins or 0
    losses = total_trades - wins
    pnl = float(totals.pnl or 0)
    best = float(totals.best or 0)
    worst = float(totals.worst or 0)
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    
    # 2. Monthly Data (always 12 months for a stable chart)
    m_stats = query.with_entities(
        extract('month', Trade.date).label('month'),
        func.count(Trade.id).label('trades'),
        func.sum(case((trade_total_expr > 0, 1), else_=0)).label('wins'),
        func.sum(trade_total_expr).label('pnl')
    ).filter(Trade.date != None).group_by(extract('month', Trade.date)).all()

    monthly_data_by_month: Dict[int, dict] = {
        i: {
            "month": i,
            "name": MONTH_NAMES_PT[i],
            "pnl": 0.0,
            "trades": 0,
            "win_rate": 0.0,
        }
        for i in range(1, 13)
    }
    for m in m_stats:
        month_num = int(m.month)
        m_trades = int(m.trades or 0)
        m_wins = int(m.wins or 0)
        monthly_data_by_month[month_num] = {
            "month": month_num,
            "name": MONTH_NAMES_PT.get(month_num, str(month_num)),
            "pnl": round(float(m.pnl or 0), 2),
            "trades": m_trades,
            "win_rate": round(m_wins / m_trades * 100, 2) if m_trades > 0 else 0.0,
        }
    monthly_data = [monthly_data_by_month[i] for i in range(1, 13)]
        
    avg_monthly = round(pnl / len(monthly_data), 2) if monthly_data else 0
    
    # 3. Pair Data
    p_stats = query.with_entities(
        Trade.pair,
        func.count(Trade.id).label('trades'),
        func.sum(case((trade_total_expr > 0, 1), else_=0)).label('wins'),
        func.sum(trade_total_expr).label('pnl')
    ).group_by(Trade.pair).all()
    
    pair_list = []
    for p in p_stats:
        p_trades = p.trades or 0
        p_wins = p.wins or 0
        pair_list.append({
            "pair": p.pair or "N/A",
            "pnl": round(float(p.pnl or 0), 2),
            "trades": p_trades,
            "win_rate": round(p_wins / p_trades * 100, 2) if p_trades > 0 else 0
        })
    
    # 4. Accounts Balance
    accounts_query = db.query(Account).filter(Account.workspace_id == workspace.id)
    if account_id:
        accounts_query = accounts_query.filter(Account.id == account_id)
    accounts = accounts_query.all()
    total_balance = sum(float(a.balance or 0) for a in accounts)

    # 4.1 Account summary cards
    account_summary = []
    for a in accounts:
        account_query = db.query(Trade).filter(Trade.account_id == a.id)
        if month and year:
            month_start = date(year, month, 1)
            month_end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
            account_query = account_query.filter(Trade.date >= month_start, Trade.date < month_end)
        if start_date:
            account_query = account_query.filter(Trade.date >= start_date)
        if end_date:
            account_query = account_query.filter(Trade.date <= end_date)

        acc_totals = account_query.with_entities(
            func.count(Trade.id).label("trades"),
            func.sum(case((trade_total_expr > 0, 1), else_=0)).label("wins"),
            func.sum(trade_total_expr).label("pnl"),
        ).first()

        acc_trades = int(acc_totals.trades or 0)
        acc_wins = int(acc_totals.wins or 0)
        acc_pnl = float(acc_totals.pnl or 0)
        acc_wr = round((acc_wins / acc_trades) * 100, 2) if acc_trades > 0 else 0.0

        account_summary.append({
            "account_id": str(a.id),
            "name": a.name,
            "balance": round(float(a.balance or 0), 2),
            "initial_balance": round(float(a.initial_balance or 0), 2),
            "pnl": round(acc_pnl, 2),
            "trades": acc_trades,
            "win_rate": acc_wr,
        })

    # 4.2 Weekday data for dashboard heat/weekday charts
    dow_stats = query.with_entities(
        extract('dow', Trade.date).label('weekday'),
        func.count(Trade.id).label('trades'),
        func.sum(case((trade_total_expr > 0, 1), else_=0)).label('wins'),
        func.sum(trade_total_expr).label('pnl')
    ).filter(Trade.date != None).group_by(extract('dow', Trade.date)).order_by(extract('dow', Trade.date)).all()

    dow_data = []
    for d in dow_stats:
        weekday = int(d.weekday)
        d_trades = int(d.trades or 0)
        d_wins = int(d.wins or 0)
        dow_data.append({
            "weekday": weekday,
            "weekday_name": WEEKDAY_NAMES_PT.get(weekday, "Desconhecido"),
            "pnl": round(float(d.pnl or 0), 2),
            "trades": d_trades,
            "win_rate": round(d_wins / d_trades * 100, 2) if d_trades > 0 else 0.0,
        })

    # 4.3 Week-of-month bars (S1..S5)
    wom_stats = query.with_entities(
        func.ceil(extract('day', Trade.date) / 7.0).label('week_of_month'),
        func.count(Trade.id).label('trades'),
        func.sum(case((trade_total_expr > 0, 1), else_=0)).label('wins'),
        func.sum(trade_total_expr).label('pnl')
    ).filter(Trade.date != None).group_by(func.ceil(extract('day', Trade.date) / 7.0)).order_by(func.ceil(extract('day', Trade.date) / 7.0)).all()

    week_data_by_slot: Dict[int, dict] = {
        i: {"name": f"S{i}", "week_of_month": i, "pnl": 0.0, "trades": 0, "win_rate": 0.0}
        for i in range(1, 6)
    }
    for w in wom_stats:
        wom = int(w.week_of_month or 0)
        if wom < 1 or wom > 5:
            continue
        w_trades = int(w.trades or 0)
        w_wins = int(w.wins or 0)
        week_data_by_slot[wom] = {
            "name": f"S{wom}",
            "week_of_month": wom,
            "pnl": round(float(w.pnl or 0), 2),
            "trades": w_trades,
            "win_rate": round(w_wins / w_trades * 100, 2) if w_trades > 0 else 0.0,
        }
    week_data = [week_data_by_slot[i] for i in range(1, 6)]

    # 5. Top 5 Best & Worst
    top_best = query.order_by(trade_total_expr.desc()).limit(5).all()
    top_worst = query.order_by(trade_total_expr.asc()).limit(5).all()

    return {
        "total_trades": total_trades,
        "win_trades": wins,
        "loss_trades": losses,
        "win_rate": round(win_rate, 2),
        "total_pnl": round(pnl, 2),
        "best_trade": round(best, 2),
        "worst_trade": round(worst, 2),
        "total_balance": round(total_balance, 2),
        "monthly_data": monthly_data,
        "pair_data": pair_list,
        "dow_data": dow_data,
        "week_data": week_data,
        "avg_monthly": avg_monthly,
        "distribution": [{"name": "WIN", "value": wins}, {"name": "LOSS", "value": losses}],
        "account_summary": account_summary,
        "top5_best": [{"pair": t.pair, "pnl": float(t.pnl or 0) + (float(t.vm_pnl or 0) if t.has_vm else 0.0), "date": t.date.isoformat() if t.date else None} for t in top_best],
        "top5_worst": [{"pair": t.pair, "pnl": float(t.pnl or 0) + (float(t.vm_pnl or 0) if t.has_vm else 0.0), "date": t.date.isoformat() if t.date else None} for t in top_worst]
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
        
    d_stats = query.with_entities(
        Trade.direction,
        func.count(Trade.id).label('trades'),
        func.sum(case([(Trade.pnl > 0, 1)], else_=0)).label('wins'),
        func.sum(Trade.pnl).label('pnl')
    ).group_by(Trade.direction).all()
    
    direction_data = []
    for d in d_stats:
        d_trades = d.trades or 0
        d_wins = d.wins or 0
        direction_data.append({
            "direction": d.direction or "N/A",
            "pnl": round(float(d.pnl or 0), 2),
            "trades": d_trades,
            "win_rate": round(d_wins / d_trades * 100, 2) if d_trades > 0 else 0
        })
    return direction_data

@router.get("/account-evolution")
def get_account_evolution(
    db: DbSession,
    current_user: User = Depends(get_current_user),
    account_id: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None)
):
    workspace = db.query(Workspace).filter(
        Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        return []
    now = datetime.now()
    if not year:
        year = now.year
    query = db.query(Trade).join(Account).filter(Account.workspace_id == workspace.id)
    if account_id:
        query = query.filter(Account.id == account_id)
    if start_date:
        query = query.filter(Trade.date >= start_date)
    else:
        query = query.filter(Trade.date >= date(year, 1, 1))
    if end_date:
        query = query.filter(Trade.date <= end_date)
    else:
        query = query.filter(Trade.date <= date(year, 12, 31))

    trade_total_expr = func.coalesce(Trade.pnl, 0) + case(
        (Trade.has_vm == True, func.coalesce(Trade.vm_pnl, 0)),
        else_=0
    )

    daily_stats = query.with_entities(
        Trade.date,
        func.sum(trade_total_expr).label('pnl')
    ).group_by(Trade.date).order_by(Trade.date.asc()).all()
    
    evolution = []
    # Build true balance evolution: initial balance + cumulative PnL
    accounts_q = db.query(Account).filter(Account.workspace_id == workspace.id)
    if account_id:
        accounts_q = accounts_q.filter(Account.id == account_id)
    base_balance = sum(float(a.initial_balance or 0) for a in accounts_q.all())

    cumulative = base_balance
    for stat in daily_stats:
        cumulative += float(stat.pnl or 0)
        evolution.append({
            "date": stat.date.strftime("%Y-%m-%d") if stat.date else None,
            "pnl": round(float(stat.pnl or 0), 2),
            "cumulative": round(cumulative, 2)
        })
    return evolution
