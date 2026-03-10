import { useMemo, useState } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import { MONTHS_FULL, WEEKDAYS, Trade, sumPnl, fmtNum, getWinRate, getTradePnl, getWeekOfMonth } from '@/lib/gpfx-utils';
import { AccountSelector, DateRangeFilter, DateRange, filterTradesByRange } from '@/components/GPFXFilters';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';

const GREEN = '#00d395';
const RED = '#ff4d4d';
const AMBER = '#f59e0b';
const BLUE = '#60a5fa';

const tooltipStyle = { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e6edf3' };

function pnlColor(v: number) { return v >= 0 ? GREEN : RED; }
function pnlSign(v: number) { return (v >= 0 ? '+$' : '-$') + fmtNum(Math.abs(v)); }

// ── Reusable bar shape that colors by pnl ──
function PnlBarShape(props: any) {
  const { x, y, width, height, payload } = props;
  return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={pnlColor(payload.pnl)} rx={4} />;
}

// ── Reusable Best/Worst card ──
function BestWorstCard({ icon, label, name, pnl, color }: { icon: string; label: string; name: string; pnl: number; color: string }) {
  return (
    <div className="kpi-card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="kpi-label">{icon} {label}</div>
      <div className="text-base font-extrabold" style={{ color }}>{name}</div>
      <div className="kpi-sub">{pnlSign(pnl)}</div>
    </div>
  );
}

// ── Section wrapper ──
function Section({ title, children, fullWidth }: { title: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`gpfx-card ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div className="gpfx-card-header"><span className="gpfx-card-title">{title}</span></div>
      <div className="gpfx-card-body">{children}</div>
    </div>
  );
}

export default function AnalisePage() {
  const { state } = useGPFX();
  const [accFilter, setAccFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });

  const filteredTrades = useMemo(() => {
    let trades: Trade[] = [];
    if (accFilter === 'all') {
      state.accounts.forEach(acc => trades.push(...acc.trades));
    } else {
      const idx = parseInt(accFilter);
      if (state.accounts[idx]) trades = [...state.accounts[idx].trades];
    }
    return filterTradesByRange(trades, dateRange);
  }, [state, accFilter, dateRange]);

  const analytics = useMemo(() => {
    const trades = filteredTrades;
    const sorted = trades.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // ─── 1. POR DIA DA SEMANA ───
    const dowMap: Record<number, number> = {};
    trades.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date + 'T12:00:00').getDay();
      dowMap[d] = (dowMap[d] || 0) + getTradePnl(t);
    });
    const dowData = [1, 2, 3, 4, 5].map(i => ({ name: WEEKDAYS[i], pnl: parseFloat((dowMap[i] || 0).toFixed(2)) }));
    const bestDay = dowData.reduce((a, b) => b.pnl > a.pnl ? b : a, dowData[0] || { name: '—', pnl: 0 });
    const worstDay = dowData.reduce((a, b) => b.pnl < a.pnl ? b : a, dowData[0] || { name: '—', pnl: 0 });

    // ─── 2. POR SEMANA DO MÊS ───
    const weekMap: Record<number, number> = {};
    trades.forEach(t => {
      if (!t.date) return;
      const w = getWeekOfMonth(t.date);
      weekMap[w] = (weekMap[w] || 0) + getTradePnl(t);
    });
    const weekData = [1, 2, 3, 4, 5].map(w => ({ name: `S${w}`, pnl: parseFloat((weekMap[w] || 0).toFixed(2)) }));
    const bestWeek = weekData.reduce((a, b) => b.pnl > a.pnl ? b : a, weekData[0]);
    const worstWeek = weekData.reduce((a, b) => b.pnl < a.pnl ? b : a, weekData[0]);

    // ─── 3. POR MÊS ───
    const monthMap: Record<string, number> = {};
    trades.forEach(t => {
      const key = `${MONTHS_FULL[t.month]} ${t.year}`;
      monthMap[key] = (monthMap[key] || 0) + getTradePnl(t);
    });
    const monthData = Object.entries(monthMap).map(([name, pnl]) => ({ name, pnl: parseFloat(pnl.toFixed(2)) })).sort((a, b) => b.pnl - a.pnl);
    const bestMonth = monthData[0] || { name: '—', pnl: 0 };
    const worstMonth = monthData[monthData.length - 1] || { name: '—', pnl: 0 };

    // ─── 4. POR ANO ───
    const yearMap: Record<number, number> = {};
    trades.forEach(t => { yearMap[t.year] = (yearMap[t.year] || 0) + getTradePnl(t); });
    const yearData = Object.entries(yearMap).map(([y, pnl]) => ({ name: y, pnl: parseFloat(pnl.toFixed(2)) })).sort((a, b) => Number(a.name) - Number(b.name));
    const bestYear = yearData.reduce((a, b) => b.pnl > a.pnl ? b : a, yearData[0] || { name: '—', pnl: 0 });
    const worstYear = yearData.reduce((a, b) => b.pnl < a.pnl ? b : a, yearData[0] || { name: '—', pnl: 0 });

    // ─── 5. POR ATIVO ───
    const pairMap: Record<string, { trades: number; wins: number; pnl: number }> = {};
    trades.forEach(t => {
      if (!pairMap[t.pair]) pairMap[t.pair] = { trades: 0, wins: 0, pnl: 0 };
      pairMap[t.pair].trades++;
      if (t.result === 'WIN') pairMap[t.pair].wins++;
      pairMap[t.pair].pnl += getTradePnl(t);
    });
    const pairData = Object.entries(pairMap)
      .map(([pair, s]) => ({
        pair, trades: s.trades,
        winRate: s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0,
        pnl: parseFloat(s.pnl.toFixed(2)),
        avgPnl: s.trades > 0 ? parseFloat((s.pnl / s.trades).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);
    const bestPair = pairData[0] || { pair: '—', pnl: 0 };
    const worstPair = pairData[pairData.length - 1] || { pair: '—', pnl: 0 };

    // ─── 7. RANKING DE TRADES ───
    const tradesByPnl = trades.map(t => ({ ...t, totalPnl: getTradePnl(t) })).sort((a, b) => b.totalPnl - a.totalPnl);
    const top5Gains = tradesByPnl.slice(0, 5);
    const top5Losses = tradesByPnl.slice(-5).reverse();

    // ─── 8. ESTATÍSTICAS COMPARATIVAS ───
    const winTrades = trades.filter(t => t.result === 'WIN');
    const lossTrades = trades.filter(t => t.result === 'LOSS');
    const overallWinRate = getWinRate(trades);
    const vmTrades = trades.filter(t => t.hasVM);
    const noVmTrades = trades.filter(t => !t.hasVM);
    const vmWinRate = getWinRate(vmTrades);

    const avgWinPnl = winTrades.length > 0 ? winTrades.reduce((s, t) => s + Math.abs(getTradePnl(t)), 0) / winTrades.length : 0;
    const avgLossPnl = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + Math.abs(getTradePnl(t)), 0) / lossTrades.length : 0;

    // Streaks
    let maxWinStreak = 0, maxLossStreak = 0, curStreak = 0, curType = '';
    sorted.forEach(t => {
      if (t.result === curType) { curStreak++; }
      else { curStreak = 1; curType = t.result; }
      if (curType === 'WIN' && curStreak > maxWinStreak) maxWinStreak = curStreak;
      if (curType === 'LOSS' && curStreak > maxLossStreak) maxLossStreak = curStreak;
    });

    const maxGain = trades.length > 0 ? Math.max(...trades.map(t => getTradePnl(t))) : 0;
    const maxLoss = trades.length > 0 ? Math.min(...trades.map(t => getTradePnl(t))) : 0;

    // Averages per period
    const uniqueDays = new Set(trades.map(t => t.date).filter(Boolean)).size;
    const uniqueWeeks = new Set(trades.filter(t => t.date).map(t => {
      const d = new Date(t.date + 'T12:00:00');
      const y = d.getFullYear();
      const w = Math.ceil((((d.getTime() - new Date(y, 0, 1).getTime()) / 86400000) + new Date(y, 0, 1).getDay() + 1) / 7);
      return `${y}-W${w}`;
    })).size;
    const uniqueMonths = new Set(trades.map(t => `${t.year}-${t.month}`)).size;
    const avgPerDay = uniqueDays > 0 ? (trades.length / uniqueDays).toFixed(1) : '0';
    const avgPerWeek = uniqueWeeks > 0 ? (trades.length / uniqueWeeks).toFixed(1) : '0';
    const avgPerMonth = uniqueMonths > 0 ? (trades.length / uniqueMonths).toFixed(1) : '0';

    // ─── 9. VM ANALYSIS ───
    const vmPnlTotal = sumPnl(vmTrades);
    const noVmPnlTotal = sumPnl(noVmTrades);
    const vmAvgPnl = vmTrades.length > 0 ? vmPnlTotal / vmTrades.length : 0;
    const noVmAvgPnl = noVmTrades.length > 0 ? noVmPnlTotal / noVmTrades.length : 0;
    const noVmWinRate = getWinRate(noVmTrades);
    const vmCompareData = [
      { name: 'Win Rate (%)', semVM: noVmWinRate, comVM: vmWinRate },
      { name: 'P&L Total', semVM: parseFloat(noVmPnlTotal.toFixed(2)), comVM: parseFloat(vmPnlTotal.toFixed(2)) },
      { name: 'P&L Médio', semVM: parseFloat(noVmAvgPnl.toFixed(2)), comVM: parseFloat(vmAvgPnl.toFixed(2)) },
    ];

    return {
      dowData, bestDay, worstDay,
      weekData, bestWeek, worstWeek,
      monthData, bestMonth, worstMonth,
      yearData, bestYear, worstYear,
      pairData, bestPair, worstPair,
      top5Gains, top5Losses,
      overallWinRate, vmWinRate, avgWinPnl, avgLossPnl,
      maxWinStreak, maxLossStreak, maxGain, maxLoss,
      avgPerDay, avgPerWeek, avgPerMonth,
      vmCompareData, vmPnlTotal, noVmPnlTotal, vmAvgPnl, noVmAvgPnl, noVmWinRate,
      vmCount: vmTrades.length, noVmCount: noVmTrades.length,
    };
  }, [filteredTrades]);

  const noTrades = filteredTrades.length === 0;

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1400px] mx-auto p-6">
      {/* FILTROS */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>🔍 Análise Comparativa</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <AccountSelector value={accFilter} onChange={setAccFilter} accounts={state.accounts} />
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {noTrades && (
        <div className="gpfx-card p-8 text-center" style={{ color: 'var(--gpfx-text-muted)' }}>
          Nenhum trade encontrado para os filtros selecionados.
        </div>
      )}

      {!noTrades && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ═══ 1. POR DIA DA SEMANA ═══ */}
          <Section title="📅 P&L por Dia da Semana">
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} tickFormatter={v => '$' + fmtNum(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [pnlSign(v), 'P&L']} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]} shape={PnlBarShape} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <BestWorstCard icon="🏆" label="Melhor Dia" name={analytics.bestDay?.name || '—'} pnl={analytics.bestDay?.pnl || 0} color={GREEN} />
              <BestWorstCard icon="⚠️" label="Pior Dia" name={analytics.worstDay?.name || '—'} pnl={analytics.worstDay?.pnl || 0} color={RED} />
            </div>
          </Section>

          {/* ═══ 2. POR SEMANA DO MÊS ═══ */}
          <Section title="📆 P&L por Semana do Mês">
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} tickFormatter={v => '$' + fmtNum(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [pnlSign(v), 'P&L']} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]} shape={PnlBarShape} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <BestWorstCard icon="🏆" label="Melhor Semana" name={analytics.bestWeek?.name || '—'} pnl={analytics.bestWeek?.pnl || 0} color={GREEN} />
              <BestWorstCard icon="⚠️" label="Pior Semana" name={analytics.worstWeek?.name || '—'} pnl={analytics.worstWeek?.pnl || 0} color={RED} />
            </div>
          </Section>

          {/* ═══ 3. POR MÊS ═══ */}
          <Section title="📊 P&L por Mês">
            <div style={{ height: Math.max(250, analytics.monthData.length * 35) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} tickFormatter={v => '$' + fmtNum(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={{ stroke: '#21262d' }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [pnlSign(v), 'P&L']} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props;
                      return <rect x={x} y={y} width={Math.abs(width)} height={height} fill={pnlColor(payload.pnl)} rx={4} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <BestWorstCard icon="🏆" label="Melhor Mês" name={analytics.bestMonth.name} pnl={analytics.bestMonth.pnl} color={GREEN} />
              <BestWorstCard icon="⚠️" label="Pior Mês" name={analytics.worstMonth.name} pnl={analytics.worstMonth.pnl} color={RED} />
            </div>
          </Section>

          {/* ═══ 4. POR ANO ═══ */}
          <Section title="📈 P&L por Ano">
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                {analytics.yearData.length > 1 ? (
                  <LineChart data={analytics.yearData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} />
                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} tickFormatter={v => '$' + fmtNum(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [pnlSign(v), 'P&L']} />
                    <Line type="monotone" dataKey="pnl" stroke={GREEN} strokeWidth={2} dot={{ fill: GREEN, r: 4 }} />
                  </LineChart>
                ) : (
                  <BarChart data={analytics.yearData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} />
                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} tickFormatter={v => '$' + fmtNum(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [pnlSign(v), 'P&L']} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]} shape={PnlBarShape} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <BestWorstCard icon="🏆" label="Melhor Ano" name={String(analytics.bestYear?.name || '—')} pnl={analytics.bestYear?.pnl || 0} color={GREEN} />
              <BestWorstCard icon="⚠️" label="Pior Ano" name={String(analytics.worstYear?.name || '—')} pnl={analytics.worstYear?.pnl || 0} color={RED} />
            </div>
          </Section>

          {/* ═══ 5. POR ATIVO ═══ */}
          <Section title="💱 P&L por Ativo" fullWidth>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <div style={{ height: Math.max(250, analytics.pairData.length * 30) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.pairData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                      <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} tickFormatter={v => '$' + fmtNum(v)} />
                      <YAxis type="category" dataKey="pair" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={{ stroke: '#21262d' }} width={80} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [pnlSign(v), 'P&L']} />
                      <Bar dataKey="pnl" radius={[0, 4, 4, 0]}
                        shape={(props: any) => {
                          const { x, y, width, height, payload } = props;
                          return <rect x={x} y={y} width={Math.abs(width)} height={height} fill={pnlColor(payload.pnl)} rx={4} />;
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <BestWorstCard icon="🏆" label="Melhor Ativo" name={analytics.bestPair.pair} pnl={analytics.bestPair.pnl} color={GREEN} />
                  <BestWorstCard icon="⚠️" label="Pior Ativo" name={analytics.worstPair.pair} pnl={analytics.worstPair.pnl} color={RED} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="gpfx-table w-full text-xs">
                  <thead>
                    <tr>
                      <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-left p-2">Ativo</th>
                      <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-center p-2">Trades</th>
                      <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-center p-2">Win Rate</th>
                      <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-right p-2">P&L Total</th>
                      <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-right p-2">P&L Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.pairData.map(p => (
                      <tr key={p.pair} style={{ borderBottom: '1px solid var(--gpfx-border)' }}>
                        <td className="p-2 font-semibold" style={{ color: 'var(--gpfx-text-primary)' }}>{p.pair}</td>
                        <td className="p-2 text-center" style={{ color: 'var(--gpfx-text-secondary)' }}>{p.trades}</td>
                        <td className="p-2 text-center" style={{ color: p.winRate >= 50 ? GREEN : RED }}>{p.winRate}%</td>
                        <td className="p-2 text-right font-mono" style={{ color: pnlColor(p.pnl) }}>{pnlSign(p.pnl)}</td>
                        <td className="p-2 text-right font-mono" style={{ color: pnlColor(p.avgPnl) }}>{pnlSign(p.avgPnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* ═══ 6. POR HORÁRIO ═══ */}
          <Section title="🕐 P&L por Horário" fullWidth>
            <div className="p-4 text-center text-sm" style={{ color: 'var(--gpfx-text-muted)' }}>
              ⏰ Adicione o horário nos trades para ver esta análise.
            </div>
          </Section>

          {/* ═══ 7. RANKING DE TRADES ═══ */}
          <Section title="🏆 Top 5 Maiores Ganhos">
            <table className="gpfx-table w-full text-xs">
              <thead>
                <tr>
                  <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-left p-2">Data</th>
                  <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-left p-2">Par</th>
                  <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-right p-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top5Gains.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gpfx-border)' }}>
                    <td className="p-2" style={{ color: 'var(--gpfx-text-primary)' }}>{t.date || '—'}</td>
                    <td className="p-2" style={{ color: 'var(--gpfx-text-secondary)' }}>{t.pair}</td>
                    <td className="p-2 text-right font-mono font-bold" style={{ color: GREEN }}>{pnlSign(t.totalPnl)}</td>
                  </tr>
                ))}
                {analytics.top5Gains.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center" style={{ color: 'var(--gpfx-text-muted)' }}>Sem dados</td></tr>
                )}
              </tbody>
            </table>
          </Section>

          <Section title="⚠️ Top 5 Maiores Perdas">
            <table className="gpfx-table w-full text-xs">
              <thead>
                <tr>
                  <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-left p-2">Data</th>
                  <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-left p-2">Par</th>
                  <th style={{ color: 'var(--gpfx-text-secondary)' }} className="text-right p-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {analytics.top5Losses.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gpfx-border)' }}>
                    <td className="p-2" style={{ color: 'var(--gpfx-text-primary)' }}>{t.date || '—'}</td>
                    <td className="p-2" style={{ color: 'var(--gpfx-text-secondary)' }}>{t.pair}</td>
                    <td className="p-2 text-right font-mono font-bold" style={{ color: RED }}>{pnlSign(t.totalPnl)}</td>
                  </tr>
                ))}
                {analytics.top5Losses.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center" style={{ color: 'var(--gpfx-text-muted)' }}>Sem dados</td></tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* ═══ 8. ESTATÍSTICAS COMPARATIVAS ═══ */}
          <Section title="📊 Estatísticas Comparativas" fullWidth>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Win Rate Geral" value={`${analytics.overallWinRate}%`} color={analytics.overallWinRate >= 50 ? GREEN : RED} />
              <StatCard label="Win Rate com VM" value={`${analytics.vmWinRate}%`} color={analytics.vmWinRate >= 50 ? GREEN : RED} />
              <StatCard label="P&L Médio WIN" value={`$${fmtNum(analytics.avgWinPnl)}`} color={GREEN} />
              <StatCard label="P&L Médio LOSS" value={`$${fmtNum(analytics.avgLossPnl)}`} color={RED} />
              <StatCard label="Maior Ganho" value={pnlSign(analytics.maxGain)} color={GREEN} />
              <StatCard label="Maior Perda" value={pnlSign(analytics.maxLoss)} color={RED} />
              <StatCard label="Sequência Wins" value={`${analytics.maxWinStreak}`} color={GREEN} />
              <StatCard label="Sequência Losses" value={`${analytics.maxLossStreak}`} color={RED} />
              <StatCard label="Média/Dia" value={analytics.avgPerDay} color={BLUE} />
              <StatCard label="Média/Semana" value={analytics.avgPerWeek} color={BLUE} />
              <StatCard label="Média/Mês" value={analytics.avgPerMonth} color={BLUE} />
            </div>
          </Section>

          {/* ═══ 9. ANÁLISE VM ═══ */}
          <Section title="🔄 Análise VM — Sem VM vs Com VM" fullWidth>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-bold mb-2" style={{ color: BLUE }}>Sem VM ({analytics.noVmCount} trades)</h3>
                  <div className="space-y-2">
                    <MiniStat label="Win Rate" value={`${analytics.noVmWinRate}%`} color={analytics.noVmWinRate >= 50 ? GREEN : RED} />
                    <MiniStat label="P&L Total" value={pnlSign(analytics.noVmPnlTotal)} color={pnlColor(analytics.noVmPnlTotal)} />
                    <MiniStat label="P&L Médio" value={pnlSign(analytics.noVmAvgPnl)} color={pnlColor(analytics.noVmAvgPnl)} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold mb-2" style={{ color: AMBER }}>Com VM ({analytics.vmCount} trades)</h3>
                  <div className="space-y-2">
                    <MiniStat label="Win Rate" value={`${analytics.vmWinRate}%`} color={analytics.vmWinRate >= 50 ? GREEN : RED} />
                    <MiniStat label="P&L Total" value={pnlSign(analytics.vmPnlTotal)} color={pnlColor(analytics.vmPnlTotal)} />
                    <MiniStat label="P&L Médio" value={pnlSign(analytics.vmAvgPnl)} color={pnlColor(analytics.vmAvgPnl)} />
                  </div>
                </div>
              </div>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.vmCompareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={{ stroke: '#21262d' }} />
                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#21262d' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="semVM" name="Sem VM" fill={BLUE} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comVM" name="Com VM" fill={AMBER} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>

        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="kpi-card text-center">
      <div className="kpi-label">{label}</div>
      <div className="text-lg font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="kpi-card py-2 px-3">
      <div className="kpi-label text-[10px]">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
