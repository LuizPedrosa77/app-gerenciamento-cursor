import { useMemo, useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { useGPFX, apiTradeToLocal } from '@/contexts/GPFXContext';
import {
  MONTHS, sumPnl, fmtNum, Trade,
} from '@/lib/gpfx-utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, ReferenceLine, LabelList,
} from 'recharts';
import { AccountSelector, DateRangeFilter, DateRange } from '@/components/GPFXFilters';
import WeeklyReport from '@/components/WeeklyReport';
import dashboardService from '@/services/dashboardService';
import tradeService from '@/services/tradeService';

function normalizeRectSize(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.abs(value)) : 0;
}

function buildSafeRect(props: any, fill: string, stroke?: string, strokeWidth?: number) {
  const x = Number(props?.x ?? 0);
  const y = Number(props?.y ?? 0);
  const rawWidth = Number(props?.width ?? 0);
  const rawHeight = Number(props?.height ?? 0);

  const width = normalizeRectSize(rawWidth);
  const height = normalizeRectSize(rawHeight);
  const safeX = rawWidth < 0 ? x + rawWidth : x;
  const safeY = rawHeight < 0 ? y + rawHeight : y;

  return (
    <rect
      x={safeX}
      y={safeY}
      width={width}
      height={height}
      fill={fill}
      rx={4}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

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
  const [monthPnl, setMonthPnl] = useState(0);
  const [daysOperated, setDaysOperated] = useState(0);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // If "all accounts", use active account's goal; otherwise use selected
  const accIdx = accFilter === 'all' ? state.activeAccount : parseInt(accFilter);
  const acc = state.accounts[accIdx];
  if (!acc) return null;
  const goal = acc.monthlyGoal || 0;
  if (goal <= 0) return null;

  useEffect(() => {
    const load = async () => {
      const apiId = (acc as any)._apiId;
      if (!apiId) {
        setMonthPnl(0);
        setDaysOperated(0);
        return;
      }
      try {
        const start = new Date(curYear, curMonth, 1).toISOString().split('T')[0];
        const end = new Date().toISOString().split('T')[0];
        const res = await tradeService.list(apiId, 0, 10000, undefined, undefined, start, end);
        const trades = (res.items || res).map(apiTradeToLocal);
        setMonthPnl(sumPnl(trades));
        setDaysOperated(new Set(trades.filter(t => t.date).map(t => t.date)).size);
      } catch (err) {
        console.error('Failed to load monthly goal stats', err);
      }
    };
    load();
  }, [acc, curYear, curMonth]);

  const pct = (monthPnl / goal) * 100;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const barColor = pct >= 100 ? '#00d395' : pct >= 71 ? '#3b82f6' : pct >= 41 ? '#f59e0b' : '#ff4d4d';
  const isAchieved = pct >= 100;

  // Days remaining
  const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
  const daysRemaining = Math.max(0, lastDay - now.getDate());

  // Pace
  const rateNeeded = daysRemaining > 0 ? Math.max(0, (goal - monthPnl) / daysRemaining) : 0;
  const rateActual = daysOperated > 0 ? monthPnl / daysOperated : 0;

  // Status badge
  let badge: { emoji: string; text: string; color: string };
  if (monthPnl < 0) badge = { emoji: '', text: 'Atencao - Revise sua estrategia', color: '#ff4d4d' };
  else if (pct >= 100) badge = { emoji: '', text: 'Meta Atingida!', color: '#00d395' };
  else if (pct >= 71) badge = { emoji: '', text: 'Quase la!', color: '#3b82f6' };
  else if (pct >= 41) badge = { emoji: '', text: 'No caminho certo', color: '#f59e0b' };
  else badge = { emoji: '', text: 'Abaixo do esperado', color: '#f97316' };

  const diff = monthPnl - goal;

  return (
    <div className="gpfx-card overflow-hidden" style={{ border: isAchieved ? '1px solid rgba(0,211,149,0.4)' : undefined }}>
      <div className="gpfx-card-body p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-base font-extrabold flex items-center gap-2" style={{ color: 'var(--gpfx-text-primary)' }}>
              Meta Mensal - {acc.name}
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
              {isAchieved ? `Meta superada em $${fmtNum(diff)}` : `Faltam $${fmtNum(Math.abs(diff))} para atingir a meta`}
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
              <span style={{ color: 'var(--gpfx-text-muted)' }}>Ritmo necessario</span>
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
  const { state, wsConnected } = useGPFX();
  const [accFilter, setAccFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>({
    totalBalance: 0, totalPnl: 0, totalTrades: 0, winRate: 0, monthlyData: [], avgMonthly: 0, pnlVariation: 0,
    balCum: [], pairData: [], dowData: [], bestDow: {name:'', pnl:0}, weekData: [], distribution: [],
    balanceEvoSampled: [], heatmapData: [], top5Best: [], top5Worst: [],
    accountSummary: [], weekTrades: [], weekPnlTotal: 0, wrSpark: [], monthlyPnls: []
  });
  const [weeklyTrades, setWeeklyTrades] = useState<Trade[]>([]);

  // Call the robust, scalable backend aggregation APIs!
  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (accFilter !== 'all') {
        const acc = state.accounts[parseInt(accFilter)];
        if (acc && (acc as any)._apiId) {
          filters.account_ids = [(acc as any)._apiId];
        }
      }
      if (dateRange.start) filters.start_date = dateRange.start;
      if (dateRange.end) filters.end_date = dateRange.end;

      const year = new Date().getFullYear();

      const [sum, evoRaw] = await Promise.all([
        dashboardService.getSummary(filters),
        dashboardService.getAccountEvolution(year, filters)
      ]);

      const dist = [
        { name: 'WIN', value: sum.win_trades || 0 },
        { name: 'LOSS', value: sum.loss_trades || 0 }
      ];

      const pairData = (sum.pair_data || []).sort((a: any, b: any) => b.pnl - a.pnl);
      const dowDataSource = (sum.dow_data && sum.dow_data.length > 0) ? sum.dow_data : [];
      const dowDataParsed = dowDataSource
        .map((d: any) => ({
          weekday: Number(d.weekday),
          name: d.weekday_name || d.name || '',
          pnl: d.total_pnl ?? d.pnl ?? 0,
        }))
        .filter((d: any) => d.weekday !== 0 && d.weekday !== 6)
        .map((d: any) => ({ name: d.name, pnl: d.pnl }));
      const bestDowObj = dowDataParsed.length > 0
        ? dowDataParsed.reduce((best: any, d: any) => d.pnl > best.pnl ? d : best, dowDataParsed[0])
        : { name: '', pnl: 0 };

      const heatmapData = [{
        year,
        months: MONTHS.map((_, mi) => {
          const mData = (sum.monthly_data || []).find((m: any) => m.month === mi + 1);
          return mData ? Number(mData.pnl || 0) : 0;
        })
      }];

      const evolutionMapped = evoRaw.map(e => ({ date: e.date, balance: e.cumulative }));
      const monthlyPnls = heatmapData[0].months;
      const wrSpark = (sum.monthly_data || []).map((m: any) => Number(m.win_rate || 0));
      const monthlyWithTrades = (sum.monthly_data || []).filter((m: any) => Number(m.trades || 0) > 0);
      const pnlVariation = monthlyWithTrades.length >= 2
        ? (() => {
            const current = Number(monthlyWithTrades[monthlyWithTrades.length - 1]?.pnl || 0);
            const previous = Number(monthlyWithTrades[monthlyWithTrades.length - 2]?.pnl || 0);
            if (previous === 0) return current === 0 ? 0 : 100;
            return ((current - previous) / Math.abs(previous)) * 100;
          })()
        : 0;

      const allAccountIds = state.accounts.map(a => (a as any)._apiId).filter(Boolean) as string[];
      const filteredAccountIds = (filters.account_ids && filters.account_ids.length > 0)
        ? filters.account_ids
        : allAccountIds;

      const accountSummary = (sum.account_summary || []).map((a: any) => ({
        apiId: a.account_id,
        name: a.name,
        balance: Number(a.balance || 0),
        pnl: Number(a.pnl || 0),
        winRate: Number(a.win_rate || 0),
        trades: Number(a.trades || 0),
      }));

      // Weekly trades for report (last 90 days)
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 90);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const weeklyChunks = await Promise.all(
        filteredAccountIds.map(async (id) => {
          const res = await tradeService.list(id, 0, 10000, undefined, undefined, startStr, endStr);
          return (res.items || res).map(apiTradeToLocal);
        })
      );
      const weeklyAgg = weeklyChunks.flat();
      setWeeklyTrades(weeklyAgg);

      setStats({
        totalBalance: sum.current_balance || sum.total_balance || 0,
        totalPnl: sum.total_pnl || 0,
        totalTrades: sum.total_trades || 0,
        winRate: sum.win_rate || 0,
        monthlyData: (sum.monthly_data || []).map((m: any) => ({ name: m.name || MONTHS[m.month - 1] || 'Mes', pnl: Number(m.pnl || 0) })),
        avgMonthly: sum.avg_monthly || 0,
        pnlVariation: Number.isFinite(pnlVariation) ? pnlVariation : 0,
        balCum: [],
        pairData,
        dowData: dowDataParsed,
        bestDow: bestDowObj,
        weekData: (sum.week_data || []).map((w: any) => ({ name: w.name, pnl: Number(w.pnl || 0) })),
        distribution: (sum.distribution && sum.distribution.length > 0) ? sum.distribution : dist,
        balanceEvoSampled: evolutionMapped,
        heatmapData,
        top5Best: sum.top5_best || [],
        top5Worst: sum.top5_worst || [],
        accountSummary,
        weekTrades: [],
        weekPnlTotal: 0,
        wrSpark,
        monthlyPnls,
      });

    } catch(err) {
      console.error('Dashboard fetch falhou', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.accounts, state.activeAccount, accFilter, dateRange.start, dateRange.end]);

  const weekTrades = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monStr = monday.toISOString().split('T')[0];
    const sunStr = sunday.toISOString().split('T')[0];
    return weeklyTrades.filter(t => t.date && t.date >= monStr && t.date <= sunStr);
  }, [weeklyTrades]);

  const weekPnlTotal = sumPnl(weekTrades);

  const selectedAcc = accFilter === 'all' ? null : state.accounts[parseInt(accFilter)];
  const selectedAccApiId = selectedAcc ? (selectedAcc as any)._apiId : null;
  const selectedAccSummary = selectedAcc
    ? stats.accountSummary.find((a: any) => a.apiId === selectedAccApiId)
    : null;
  const totalBalanceDisplay = accFilter === 'all'
    ? stats.totalBalance
    : (selectedAccSummary?.balance ?? selectedAcc?.balance ?? stats.totalBalance);

  const tooltipStyle = { background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)', borderRadius: 8, color: 'var(--gpfx-text-primary)' };

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1400px] mx-auto p-6">
      {/* Indicador WebSocket */}
      <div className="flex items-center justify-end px-6 pt-4 pb-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
          background: wsConnected ? 'rgba(0,211,149,0.08)' : 'rgba(255,77,77,0.08)',
          border: `1px solid ${wsConnected ? 'rgba(0,211,149,0.2)' : 'rgba(255,77,77,0.2)'}`,
        }}>
          <span
            className={wsConnected ? 'animate-pulse' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: wsConnected ? '#00d395' : '#ff4d4d',
              display: 'inline-block',
            }}
          />
          <span className="text-[11px] font-semibold" style={{
            color: wsConnected ? '#00d395' : '#ff4d4d',
          }}>
            {wsConnected ? 'Tempo real ativo' : 'Sem conexão em tempo real'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {loading && (
            <span className="text-[11px] font-semibold" style={{ color: 'var(--gpfx-text-muted)' }}>
              Atualizando...
            </span>
          )}
          <AccountSelector value={accFilter} onChange={setAccFilter} accounts={state.accounts} />
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Monthly Goal Card */}
      <MonthlyGoalCard accFilter={accFilter} />

      {/* Saldo Total Card — Destaque */}
      <div
        className="gpfx-card p-5 flex flex-col gap-2"
        style={{
          border: '1px solid rgba(0,211,149,0.25)',
          background: 'rgba(0,211,149,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(0,211,149,0.12)' }}>
            <Wallet size={22} style={{ color: '#00d395' }} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>Saldo Total</div>
            <div className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>Soma de todas as contas ativas</div>
          </div>
        </div>
        <div className="text-3xl font-black" style={{ color: 'var(--gpfx-text-primary)' }}>
          ${fmtNum(totalBalanceDisplay)}
        </div>
        {state.accounts.length > 1 && accFilter === 'all' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--gpfx-text-muted)', opacity: 0.7 }}>
            {state.accounts.map((acc, i) => (
              <span key={i}>{acc.name}: <span className="font-semibold" style={{ color: 'var(--gpfx-text-secondary)' }}>${fmtNum(acc.balance || 0)}</span></span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="P&L Total" value={(stats.totalPnl >= 0 ? '+' : '') + '$' + fmtNum(stats.totalPnl)} color={stats.totalPnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} sparkData={stats.monthlyPnls.slice(-7)} variation={{ pct: stats.pnlVariation, label: 'vs mês ant.' }} />
        <KpiCard label="Win Rate Geral" value={stats.winRate + '%'} color="var(--gpfx-amber)" sparkData={stats.wrSpark} variation={{ pct: stats.wrSpark.length >= 2 ? stats.wrSpark[stats.wrSpark.length - 1] - stats.wrSpark[stats.wrSpark.length - 2] : 0, label: 'vs mês ant.' }} />
        <KpiCard label="Total de Trades" value={String(stats.totalTrades)} color="#60a5fa" />
      </div>

      {/* Weekly Report */}
      <WeeklyReport
        trades={weeklyTrades}
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
                    const fill = props.payload?.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)';
                    return buildSafeRect(props, fill);
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
                    const fill = props.payload?.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)';
                    return buildSafeRect(props, fill);
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
                    const isBest = props.payload?.name === stats.bestDow?.name;
                    const fill = props.payload?.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)';
                    return buildSafeRect(props, fill, isBest ? '#00d395' : undefined, isBest ? 2 : 0);
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
                    const fill = props.payload?.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)';
                    return buildSafeRect(props, fill);
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
            <span className="text-xs font-bold" style={{ color: weekPnlTotal >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)' }}>
              Total: {weekPnlTotal >= 0 ? '+' : ''}${fmtNum(weekPnlTotal)}
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
                {weekTrades.map((t, i) => (
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
                {weekTrades.length === 0 && (
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
