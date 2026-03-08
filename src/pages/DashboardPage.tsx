import { useMemo, useState, useEffect } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import {
  MONTHS, WEEKDAYS, sumPnl, fmtNum, getAccountBalance, getWinRate, getTradePnl, Trade, signedPnl, getWeekOfMonth, getMonthPnl,
} from '@/lib/gpfx-utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, ReferenceLine, LabelList,
} from 'recharts';
import { AccountSelector, DateRangeFilter, DateRange, filterTradesByRange } from '@/components/GPFXFilters';
import WeeklyReport from '@/components/WeeklyReport';

/* ── Mini Sparkline for KPI cards ── */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(Math.abs), 1);
  const h = 24;
  const w = data.length * 8;
  const points = data.map((v, i) => `${i * 8},${h / 2 - (v / max) * (h / 2 - 2)}`).join(' ');
  return (
    <svg width={w} height={h} className="mt-1">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/* ── KPI Card with sparkline and variation ── */
function KpiCard({ label, value, color, sparkData, variation }: {
  label: string; value: string; color: string; sparkData?: number[]; variation?: { pct: number; label: string };
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="flex items-center justify-between gap-2">
        {variation && (
          <div className="kpi-sub flex items-center gap-1">
            <span style={{ color: variation.pct >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)' }}>
              {variation.pct >= 0 ? '↑' : '↓'} {Math.abs(variation.pct).toFixed(1)}%
            </span>
            <span style={{ color: 'var(--gpfx-text-muted)' }}>{variation.label}</span>
          </div>
        )}
        {sparkData && sparkData.length > 1 && <MiniSparkline data={sparkData} color={color} />}
      </div>
    </div>
  );
}

/* ── Monthly Goal Card ── */
function MonthlyGoalCard({ accFilter }: { accFilter: string }) {
  const { state } = useGPFX();
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // If "all accounts", use active account's goal; otherwise use selected
  const accIdx = accFilter === 'all' ? state.activeAccount : parseInt(accFilter);
  const acc = state.accounts[accIdx];
  if (!acc) return null;
  const goal = acc.monthlyGoal || 0;
  if (goal <= 0) return null;

  const monthPnl = getMonthPnl(acc, curYear, curMonth);
  const pct = (monthPnl / goal) * 100;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barColor = pct >= 100 ? '#00d395' : pct >= 71 ? '#3b82f6' : pct >= 41 ? '#f59e0b' : '#ff4d4d';
  const isAchieved = pct >= 100;

  // Days remaining
  const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
  const daysRemaining = Math.max(0, lastDay - now.getDate());

  // Days operated this month
  const monthTrades = acc.trades.filter(t => t.year === curYear && t.month === curMonth);
  const daysOperated = new Set(monthTrades.filter(t => t.date).map(t => t.date)).size;

  // Pace
  const rateNeeded = daysRemaining > 0 ? Math.max(0, (goal - monthPnl) / daysRemaining) : 0;
  const rateActual = daysOperated > 0 ? monthPnl / daysOperated : 0;

  // Status badge
  let badge: { emoji: string; text: string; color: string };
  if (monthPnl < 0) badge = { emoji: '🔴', text: 'Atenção — Revise sua estratégia', color: '#ff4d4d' };
  else if (pct >= 100) badge = { emoji: '🟢', text: 'Meta Atingida!', color: '#00d395' };
  else if (pct >= 71) badge = { emoji: '🔵', text: 'Quase lá!', color: '#3b82f6' };
  else if (pct >= 41) badge = { emoji: '🟡', text: 'No caminho certo', color: '#f59e0b' };
  else badge = { emoji: '🟠', text: 'Abaixo do esperado', color: '#f97316' };

  const diff = monthPnl - goal;

  return (
    <div className="gpfx-card overflow-hidden" style={{ border: isAchieved ? '1px solid rgba(0,211,149,0.4)' : undefined }}>
      <div className="gpfx-card-body p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--gpfx-text-primary)' }}>
              🎯 Meta Mensal — {acc.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--gpfx-text-muted)' }}>
              {MONTHS_FULL[curMonth]} {curYear}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: barColor + '20', color: barColor }}>
              {badge.emoji} {badge.text}
            </span>
          </div>
        </div>

        <div className="flex items-end gap-6 flex-wrap mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>P&L Atual</div>
            <div className="text-2xl font-extrabold" style={{ color: monthPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
              {monthPnl >= 0 ? '+' : ''}${fmtNum(monthPnl)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>Meta</div>
            <div className="text-lg font-bold" style={{ color: 'var(--gpfx-text-secondary)' }}>${fmtNum(goal)}</div>
          </div>
          <div className="text-3xl font-black" style={{ color: barColor }}>{clampedPct.toFixed(0)}%</div>
          <div className="flex-1 text-right">
            <div className="text-xs font-bold" style={{ color: isAchieved ? '#00d395' : '#ff4d4d' }}>
              {isAchieved ? `Meta superada em $${fmtNum(diff)} 🎉` : `Faltam $${fmtNum(Math.abs(diff))} para atingir a meta`}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-4">
          <div className="h-3 rounded-full overflow-hidden" style={{ background: '#21262d' }}>
            <div
              className={`h-full rounded-full ${isAchieved ? 'animate-pulse' : ''}`}
              style={{
                width: clampedPct + '%',
                background: barColor,
                transition: 'width 1s ease',
                boxShadow: isAchieved ? `0 0 12px ${barColor}80` : 'none',
              }}
            />
          </div>
          {/* Markers */}
          <div className="relative h-3 -mt-3">
            {[25, 50, 75, 100].map(m => (
              <div key={m} className="absolute top-0 flex flex-col items-center" style={{ left: m + '%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {[25, 50, 75, 100].map(m => (
              <span key={m} className="text-[9px] font-bold" style={{ color: '#484f58', width: '25%', textAlign: 'center' }}>{m}%</span>
            ))}
          </div>
        </div>

        {/* Pace info */}
        <div className="flex items-center gap-5 flex-wrap text-xs">
          <div className="flex flex-col">
            <span style={{ color: 'var(--gpfx-text-muted)' }}>Dias restantes</span>
            <span className="font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{daysRemaining} dias</span>
          </div>
          {!isAchieved && daysRemaining > 0 && (
            <div className="flex flex-col">
              <span style={{ color: 'var(--gpfx-text-muted)' }}>Ritmo necessário</span>
              <span className="font-bold" style={{ color: '#f59e0b' }}>${fmtNum(rateNeeded)}/dia</span>
            </div>
          )}
          <div className="flex flex-col">
            <span style={{ color: 'var(--gpfx-text-muted)' }}>Ritmo atual</span>
            <span className="font-bold" style={{ color: rateActual >= 0 ? '#00d395' : '#ff4d4d' }}>${fmtNum(rateActual)}/dia operado</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { state } = useGPFX();
  const [accFilter, setAccFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });

  const stats = useMemo(() => {
    const accounts = accFilter === 'all' ? state.accounts : [state.accounts[parseInt(accFilter)]];
    let allTradesRaw: Trade[] = [];
    accounts.forEach(acc => allTradesRaw.push(...acc.trades));
    const allTrades = filterTradesByRange(allTradesRaw, dateRange);
    let totalBalance = 0;
    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0;

    accounts.forEach(acc => {
      totalBalance += getAccountBalance(acc);
    });
    totalPnl = sumPnl(allTrades);
    totalTrades = allTrades.length;
    totalWins = allTrades.filter(t => t.result === 'WIN').length;

    const winRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;

    // Monthly P&L for last 12 months
    const now = new Date();
    const monthlyData = [];
    const monthlyPnls: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mt = allTrades.filter(t => t.year === y && t.month === m);
      const pnl = parseFloat(sumPnl(mt).toFixed(2));
      monthlyData.push({ name: MONTHS[m] + ' ' + String(y).slice(2), pnl });
      monthlyPnls.push(pnl);
    }
    const avgMonthly = monthlyPnls.length > 0 ? monthlyPnls.reduce((s, v) => s + v, 0) / monthlyPnls.length : 0;

    // Current month vs previous month variation
    const curMonthPnl = monthlyPnls[monthlyPnls.length - 1] || 0;
    const prevMonthPnl = monthlyPnls[monthlyPnls.length - 2] || 0;
    const pnlVariation = prevMonthPnl !== 0 ? ((curMonthPnl - prevMonthPnl) / Math.abs(prevMonthPnl)) * 100 : 0;

    // Balance sparkline (last 7 months of cumulative balance)
    const balSparkline = monthlyPnls.slice(-7);
    let cum = 0;
    const balCum = balSparkline.map(v => { cum += v; return cum; });

    // P&L by pair (horizontal bars)
    const pairMap: Record<string, number> = {};
    allTrades.forEach(t => { pairMap[t.pair] = (pairMap[t.pair] || 0) + getTradePnl(t); });
    const pairData = Object.entries(pairMap).map(([pair, pnl]) => ({ pair, pnl: parseFloat(pnl.toFixed(2)) })).sort((a, b) => b.pnl - a.pnl);

    // P&L by day of week
    const dowPnl: number[] = [0, 0, 0, 0, 0, 0, 0];
    allTrades.forEach(t => {
      if (t.date) {
        const d = new Date(t.date + 'T12:00:00').getDay();
        dowPnl[d] += getTradePnl(t);
      }
    });
    const dowData = WEEKDAYS.map((name, i) => ({ name, pnl: parseFloat(dowPnl[i].toFixed(2)) })).filter(d => d.name !== 'Dom' && d.name !== 'Sáb');
    const bestDow = dowData.reduce((best, d) => d.pnl > best.pnl ? d : best, dowData[0] || { name: '', pnl: 0 });

    // P&L by week of month
    const weekPnl: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    allTrades.forEach(t => {
      if (t.date) {
        const w = Math.min(getWeekOfMonth(t.date), 4);
        weekPnl[w] = (weekPnl[w] || 0) + getTradePnl(t);
      }
    });
    const weekData = [1, 2, 3, 4].map(w => ({ name: `Semana ${w}`, pnl: parseFloat((weekPnl[w] || 0).toFixed(2)) }));

    // WIN/LOSS distribution
    const totalLosses = totalTrades - totalWins;
    const distribution = [{ name: 'WIN', value: totalWins }, { name: 'LOSS', value: totalLosses }];

    // Balance evolution (cumulative curve)
    const sortedTrades = allTrades.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const baseBalance = accounts.reduce((s, a) => s + a.balance, 0);
    let runBal = baseBalance;
    const balanceEvo = sortedTrades.map(t => {
      runBal += getTradePnl(t);
      return { date: t.date || '', balance: parseFloat(runBal.toFixed(2)) };
    });
    // Limit to ~100 points max for performance
    const step = Math.max(1, Math.floor(balanceEvo.length / 100));
    const balanceEvoSampled = balanceEvo.filter((_, i) => i % step === 0 || i === balanceEvo.length - 1);

    // Heatmap: month × year
    const yearsInData = [...new Set(allTrades.map(t => t.year))].sort();
    const heatmapData = yearsInData.map(y => {
      const months = MONTHS.map((_, mi) => {
        const mt = allTrades.filter(t => t.year === y && t.month === mi);
        return sumPnl(mt);
      });
      return { year: y, months };
    });

    // Top 5 best / worst trades
    const tradesSorted = allTrades.map(t => ({ date: t.date, pair: t.pair, pnl: getTradePnl(t) })).sort((a, b) => b.pnl - a.pnl);
    const top5Best = tradesSorted.slice(0, 5);
    const top5Worst = tradesSorted.slice(-5).reverse();

    // Account summary
    const accountSummary = state.accounts.map(acc => ({
      name: acc.name,
      balance: getAccountBalance(acc),
      pnl: sumPnl(acc.trades),
      winRate: getWinRate(acc.trades),
      trades: acc.trades.length,
    }));

    // Trades da semana atual
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const weekTrades = allTrades
      .filter(t => t.date && t.date >= mondayStr && t.date <= todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(t => ({ date: t.date, pair: t.pair, dir: t.dir, result: t.result, pnl: getTradePnl(t) }));
    const weekPnlTotal = weekTrades.reduce((s, t) => s + t.pnl, 0);

    // Win rate sparkline (last 7 months)
    const wrSpark: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mt = allTrades.filter(t => t.year === d.getFullYear() && t.month === d.getMonth());
      wrSpark.push(mt.length > 0 ? getWinRate(mt) : 0);
    }

    return {
      totalBalance, totalPnl, totalTrades, winRate, monthlyData, avgMonthly, pnlVariation,
      balCum, pairData, dowData, bestDow, weekData, distribution,
      balanceEvoSampled, heatmapData, top5Best, top5Worst,
      accountSummary, weekTrades, weekPnlTotal, wrSpark, monthlyPnls,
    };
  }, [state, accFilter, dateRange]);

  const tooltipStyle = { background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)', borderRadius: 8, color: 'var(--gpfx-text-primary)' };

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1400px] mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <AccountSelector value={accFilter} onChange={setAccFilter} accounts={state.accounts} />
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Monthly Goal Card */}
      <MonthlyGoalCard accFilter={accFilter} />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Saldo Total" value={'$' + fmtNum(stats.totalBalance)} color="var(--gpfx-text-primary)" sparkData={stats.balCum} />
        <KpiCard label="P&L Total" value={(stats.totalPnl >= 0 ? '+' : '') + '$' + fmtNum(stats.totalPnl)} color={stats.totalPnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} sparkData={stats.monthlyPnls.slice(-7)} variation={{ pct: stats.pnlVariation, label: 'vs mês ant.' }} />
        <KpiCard label="Win Rate Geral" value={stats.winRate + '%'} color="var(--gpfx-amber)" sparkData={stats.wrSpark} variation={{ pct: stats.wrSpark.length >= 2 ? stats.wrSpark[stats.wrSpark.length - 1] - stats.wrSpark[stats.wrSpark.length - 2] : 0, label: 'vs mês ant.' }} />
        <KpiCard label="Total de Trades" value={String(stats.totalTrades)} color="#60a5fa" />
      </div>

      {/* Weekly Report */}
      <WeeklyReport
        trades={accFilter === 'all' ? state.accounts.flatMap(a => a.trades) : (state.accounts[parseInt(accFilter)]?.trades || [])}
        accountName={accFilter === 'all' ? 'Todas as contas' : (state.accounts[parseInt(accFilter)]?.name || '')}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1 — Resultado Mensal (vertical bars with labels + avg line) */}
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Resultado Mensal</span></div>
          <div className="gpfx-card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'P&L']} />
                <ReferenceLine y={stats.avgMonthly} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Média', fill: '#f59e0b', fontSize: 10 }} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}
                  // @ts-ignore
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    return <rect x={x} y={y} width={width} height={height} fill={payload.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} rx={4} />;
                  }}
                >
                  <LabelList dataKey="pnl" position="top" formatter={(v: number) => (v >= 0 ? '+' : '') + '$' + fmtNum(v)} style={{ fill: 'var(--gpfx-text-muted)', fontSize: 9, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 — P&L por Ativo (horizontal bars) */}
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">P&L por Ativo</span></div>
          <div className="gpfx-card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pairData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                <XAxis type="number" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                <YAxis type="category" dataKey="pair" tick={{ fill: 'var(--gpfx-text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'P&L']} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}
                  // @ts-ignore
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    return <rect x={x} y={y} width={width} height={height} fill={payload.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} rx={4} />;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 — Resultado por Dia da Semana */}
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Resultado por Dia da Semana</span></div>
          <div className="gpfx-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'P&L']} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}
                  // @ts-ignore
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    const isBest = payload.name === stats.bestDow?.name;
                    return <rect x={x} y={y} width={width} height={height} fill={payload.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} rx={4} stroke={isBest ? '#00d395' : 'none'} strokeWidth={isBest ? 2 : 0} />;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4 — Resultado por Semana do Mês */}
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Resultado por Semana do Mês</span></div>
          <div className="gpfx-card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'P&L']} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}
                  // @ts-ignore
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    return <rect x={x} y={y} width={width} height={height} fill={payload.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} rx={4} />;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5 — Taxa de Acerto (Donut) */}
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Taxa de Acerto</span></div>
          <div className="gpfx-card-body flex flex-col items-center justify-center" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill="var(--gpfx-green)" />
                  <Cell fill="var(--gpfx-red)" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-2xl font-extrabold -mt-4" style={{ color: 'var(--gpfx-green)' }}>{stats.winRate}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--gpfx-text-muted)' }}>
              ✓ {stats.distribution[0]?.value || 0} Wins &nbsp;|&nbsp; ✗ {stats.distribution[1]?.value || 0} Losses
            </div>
          </div>
        </div>

        {/* Chart 6 — Evolução do Saldo (area) */}
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Evolução do Saldo</span></div>
          <div className="gpfx-card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.balanceEvoSampled}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d395" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d395" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 9 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'Saldo']} />
                <Area type="monotone" dataKey="balance" stroke="#00d395" fill="url(#balGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 7 — Heatmap */}
      {stats.heatmapData.length > 0 && (
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Mapa de Calor — Resultado Mensal</span></div>
          <div className="gpfx-card-body overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold uppercase py-2 px-1" style={{ color: 'var(--gpfx-text-muted)' }}>Ano</th>
                  {MONTHS.map(m => <th key={m} className="text-center text-[10px] font-bold uppercase py-2 px-1" style={{ color: 'var(--gpfx-text-muted)' }}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {stats.heatmapData.map(row => {
                  const maxVal = Math.max(...row.months.map(Math.abs), 1);
                  return (
                    <tr key={row.year}>
                      <td className="text-xs font-bold py-1 px-1" style={{ color: 'var(--gpfx-text-secondary)' }}>{row.year}</td>
                      {row.months.map((v, mi) => {
                        const intensity = Math.min(1, Math.abs(v) / maxVal);
                        let bg: string;
                        if (v > 0) bg = `rgba(0, 211, 149, ${0.1 + intensity * 0.5})`;
                        else if (v < 0) bg = `rgba(255, 77, 77, ${0.1 + intensity * 0.5})`;
                        else bg = 'rgba(128,128,128,0.1)';
                        return (
                          <td key={mi} className="py-1 px-0.5">
                            <div className="heatmap-cell" style={{ background: bg, color: v !== 0 ? (v > 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)') : 'var(--gpfx-text-muted)' }}
                              title={`${MONTHS[mi]} ${row.year}: ${v >= 0 ? '+' : ''}$${fmtNum(v)}`}>
                              {v !== 0 ? (v > 0 ? '+' : '') + '$' + fmtNum(v) : '–'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart 8 — Top 5 Best & Worst */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">🏆 Top 5 Melhores Trades</span></div>
          <div className="gpfx-card-body">
            {stats.top5Best.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--gpfx-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,211,149,0.15)', color: 'var(--gpfx-green)' }}>#{i + 1}</span>
                  <span className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>{t.date || '—'}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{t.pair}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--gpfx-green)' }}>+${fmtNum(t.pnl)}</span>
              </div>
            ))}
            {stats.top5Best.length === 0 && <div className="text-xs text-center py-4" style={{ color: 'var(--gpfx-text-muted)' }}>Sem dados</div>}
          </div>
        </div>

        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">⚠️ Top 5 Piores Trades</span></div>
          <div className="gpfx-card-body">
            {stats.top5Worst.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--gpfx-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,77,77,0.15)', color: 'var(--gpfx-red)' }}>#{i + 1}</span>
                  <span className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>{t.date || '—'}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{t.pair}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--gpfx-red)' }}>{t.pnl >= 0 ? '+' : ''}{fmtNum(t.pnl)}</span>
              </div>
            ))}
            {stats.top5Worst.length === 0 && <div className="text-xs text-center py-4" style={{ color: 'var(--gpfx-text-muted)' }}>Sem dados</div>}
          </div>
        </div>
      </div>

      {/* Footer: Resumo por Conta + Trades da Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="gpfx-card">
          <div className="gpfx-card-header"><span className="gpfx-card-title">Resumo por Conta</span></div>
          <div className="gpfx-card-body">
            <div className="flex flex-col gap-3">
              {stats.accountSummary.map((acc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gpfx-border)' }}>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{acc.name}</div>
                    <div className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>{acc.trades} trades · WR {acc.winRate}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>${fmtNum(acc.balance)}</div>
                    <div className="text-xs font-bold" style={{ color: acc.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)' }}>
                      {acc.pnl >= 0 ? '+' : ''}${fmtNum(acc.pnl)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="gpfx-card">
          <div className="gpfx-card-header">
            <span className="gpfx-card-title">Trades da Semana</span>
            <span className="text-xs font-bold" style={{ color: stats.weekPnlTotal >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)' }}>
              Total: {stats.weekPnlTotal >= 0 ? '+' : ''}${fmtNum(stats.weekPnlTotal)}
            </span>
          </div>
          <div className="gpfx-card-body overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--gpfx-text-muted)' }}>
                  <th className="text-left py-2 text-xs font-bold uppercase">Data</th>
                  <th className="text-left py-2 text-xs font-bold uppercase">Par</th>
                  <th className="text-left py-2 text-xs font-bold uppercase">Dir</th>
                  <th className="text-left py-2 text-xs font-bold uppercase">Resultado</th>
                  <th className="text-right py-2 text-xs font-bold uppercase">P&L</th>
                </tr>
              </thead>
              <tbody>
                {stats.weekTrades.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gpfx-border)' }}>
                    <td className="py-2 text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>{t.date || '—'}</td>
                    <td className="py-2 text-xs font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{t.pair}</td>
                    <td className="py-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${t.dir === 'BUY' ? 'dir-buy' : 'dir-sell'}`}>{t.dir}</span>
                    </td>
                    <td className="py-2">
                      <span className={`text-[11px] font-bold ${t.result === 'WIN' ? 'text-gpfx-green' : 'text-gpfx-red'}`}>{t.result}</span>
                    </td>
                    <td className="py-2 text-right text-xs font-bold" style={{ color: t.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)' }}>
                      {t.pnl >= 0 ? '+' : ''}${fmtNum(t.pnl)}
                    </td>
                  </tr>
                ))}
                {stats.weekTrades.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>Nenhum trade esta semana.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
