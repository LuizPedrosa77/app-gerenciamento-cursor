import { useMemo, useState } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import { MONTHS, YEARS, sumPnl, fmtNum, getWinRate, getAccountBalance, Trade, getTradePnl } from '@/lib/gpfx-utils';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart, Legend,
} from 'recharts';
import { AccountSelector, DateRangeFilter, DateRange, filterTradesByRange } from '@/components/GPFXFilters';

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

export default function EvolucaoPage() {
  const { state } = useGPFX();
  const [accFilter, setAccFilter] = useState<string>(String(state.activeAccount));
  const [yearFilter, setYearFilter] = useState<string>(String(state.activeYear));
  const [tab, setTab] = useState<'overview' | 'monthly'>('overview');

  const data = useMemo(() => {
    const isAll = accFilter === 'all';
    const accounts = isAll ? state.accounts : [state.accounts[parseInt(accFilter)]];
    const allTrades: Trade[] = [];
    accounts.forEach(a => allTrades.push(...a.trades));
    const baseBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const filterYear = yearFilter === 'all' ? null : parseInt(yearFilter);
    const trades = allTrades;

    const years = filterYear
      ? [filterYear]
      : [...new Set(trades.map(t => t.year))].sort();

    if (years.length === 0 && filterYear) {
      return {
        labels: MONTHS, monthPnls: MONTHS.map(() => 0), monthPcts: MONTHS.map(() => 0),
        cumPcts: [], balanceEvo: [], winRates: MONTHS.map(() => 0),
        monthWins: MONTHS.map(() => 0), monthLosses: MONTHS.map(() => 0),
        monthCounts: MONTHS.map(() => 0), baseBalance,
      };
    }

    const labels: string[] = [];
    const monthPnls: number[] = [];
    const monthPcts: number[] = [];
    const monthWins: number[] = [];
    const monthLosses: number[] = [];
    const monthCounts: number[] = [];
    let runBal = baseBalance;

    (years.length > 0 ? years : [state.activeYear]).forEach(y => {
      MONTHS.forEach((mName, mi) => {
        const mt = trades.filter(t => t.year === y && t.month === mi);
        const show = filterYear || mt.length > 0;
        if (show) {
          labels.push(filterYear ? mName : `${mName} '${String(y).slice(2)}`);
          const pnl = parseFloat(sumPnl(mt).toFixed(2));
          const pct = runBal > 0 ? parseFloat(((pnl / runBal) * 100).toFixed(2)) : 0;
          const wins = mt.filter(t => t.result === 'WIN').length;
          const losses = mt.filter(t => t.result === 'LOSS').length;
          monthPnls.push(pnl);
          monthPcts.push(pct);
          monthWins.push(wins);
          monthLosses.push(losses);
          monthCounts.push(mt.length);
          runBal = parseFloat((runBal + pnl).toFixed(2));
        }
      });
    });

    let cum = 0;
    const cumPcts = monthPnls.map(v => {
      cum += v;
      return baseBalance > 0 ? parseFloat(((cum / baseBalance) * 100).toFixed(2)) : 0;
    });
    const balanceEvo = monthPnls.reduce<number[]>((arr, v) => {
      const last = arr.length ? arr[arr.length - 1] : baseBalance;
      arr.push(parseFloat((last + v).toFixed(2)));
      return arr;
    }, []);
    const winRates = monthCounts.map((cnt, i) => cnt > 0 ? parseFloat(((monthWins[i] / cnt) * 100).toFixed(1)) : 0);

    return { labels, monthPnls, monthPcts, cumPcts, balanceEvo, winRates, monthWins, monthLosses, monthCounts, baseBalance };
  }, [state, accFilter, yearFilter]);

  const totalPnl = data.monthPnls.reduce((s, v) => s + v, 0);
  const totalTrades = data.monthCounts.reduce((s, v) => s + v, 0);
  const totalWins = data.monthWins.reduce((s, v) => s + v, 0);
  const totalLosses = data.monthLosses.reduce((s, v) => s + v, 0);
  const finalBalance = data.baseBalance + totalPnl;
  const growthPct = data.baseBalance > 0 ? (((finalBalance - data.baseBalance) / data.baseBalance) * 100).toFixed(2) : '0.00';
  const overallWR = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : '0.0';
  const posMonths = data.monthPnls.filter(v => v > 0).length;
  const bestPnl = data.monthPnls.length > 0 ? Math.max(...data.monthPnls) : 0;
  const worstPnl = data.monthPnls.length > 0 ? Math.min(...data.monthPnls) : 0;

  const chartData = data.labels.map((label, i) => ({
    name: label, pnl: data.monthPnls[i], pct: data.monthPcts[i],
    cumPct: data.cumPcts[i], balance: data.balanceEvo[i],
    winRate: data.winRates[i], wins: data.monthWins[i],
    losses: data.monthLosses[i], trades: data.monthCounts[i],
  }));

  const accName = accFilter === 'all' ? 'Todas as contas' : state.accounts[parseInt(accFilter)]?.name || '';

  const tooltipStyle = { background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)', borderRadius: 8, color: 'var(--gpfx-text-primary)' };

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1400px] mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>📈 Evolução da Conta</h1>
          <span className="text-xs px-3 py-1 rounded-full" style={{ color: 'var(--gpfx-text-secondary)', background: 'rgba(0,0,0,0.07)' }}>{accName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)' }}>
            <button onClick={() => setTab('overview')} className="px-4 py-1.5 text-xs font-bold"
              style={{ background: tab === 'overview' ? '#00d395' : 'transparent', color: tab === 'overview' ? '#fff' : 'var(--gpfx-text-muted)' }}>Visão Geral</button>
            <button onClick={() => setTab('monthly')} className="px-4 py-1.5 text-xs font-bold"
              style={{ background: tab === 'monthly' ? '#00d395' : 'transparent', color: tab === 'monthly' ? '#fff' : 'var(--gpfx-text-muted)' }}>Detalhe Mensal</button>
          </div>
          <AccountFilter value={accFilter} onChange={setAccFilter} accounts={state.accounts} />
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="gpfx-select text-xs font-semibold">
            <option value="all">Todos os anos</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard label="P&L Total" value={(totalPnl >= 0 ? '+' : '') + '$' + fmtNum(totalPnl)} sub={(totalPnl >= 0 ? '+' : '') + ((data.baseBalance > 0 ? ((totalPnl / data.baseBalance) * 100).toFixed(2) : '0.00')) + '%'} color={totalPnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} />
        <KpiCard label="Crescimento" value={(parseFloat(growthPct) >= 0 ? '+' : '') + growthPct + '%'} sub={'$' + fmtNum(data.baseBalance) + ' → $' + fmtNum(finalBalance)} color={parseFloat(growthPct) >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} />
        <KpiCard label="Win Rate" value={overallWR + '%'} sub={totalWins + 'W / ' + totalLosses + 'L'} color="var(--gpfx-amber)" />
        <KpiCard label="Meses +" value={posMonths + ' / ' + data.labels.length} sub={Math.round(data.labels.length > 0 ? (posMonths / data.labels.length) * 100 : 0) + '% dos meses'} color={posMonths >= data.labels.length / 2 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} />
        <KpiCard label="Melhor Mês" value={(bestPnl >= 0 ? '+' : '') + '$' + fmtNum(bestPnl)} sub="" color="var(--gpfx-green)" />
        <KpiCard label="Pior Mês" value={(worstPnl >= 0 ? '+' : '-') + '$' + fmtNum(Math.abs(worstPnl))} sub="" color={worstPnl < 0 ? 'var(--gpfx-red)' : 'var(--gpfx-green)'} />
        <KpiCard label="Média/Mês" value={data.labels.length > 0 ? ((totalPnl / data.labels.length >= 0 ? '+' : '') + '$' + fmtNum(totalPnl / data.labels.length)) : '$0.00'} sub="" color={totalPnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)'} />
        <KpiCard label="Saldo Base" value={'$' + fmtNum(data.baseBalance)} sub="Saldo inicial" color="#60a5fa" />
      </div>

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">📈 P&L Acumulado — %</span></div>
            <div className="gpfx-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => v + '%'} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v + '%', 'Acumulado']} />
                  <Area type="monotone" dataKey="cumPct" stroke="var(--gpfx-green)" fill="rgba(0,211,149,0.15)" strokeWidth={2} dot={{ r: 3, fill: '#00d395' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">📊 P&L por Mês — %</span></div>
            <div className="gpfx-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => v + '%'} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v + '%', 'P&L']} />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}
                    // @ts-ignore
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props;
                      return <rect x={x} y={y} width={width} height={height} fill={payload.pct >= 0 ? 'rgba(0,211,149,0.75)' : 'rgba(255,77,77,0.75)'} rx={4} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">💰 Evolução do Saldo (USD)</span></div>
            <div className="gpfx-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'Saldo']} />
                  <Area type="monotone" dataKey="balance" stroke="#60a5fa" fill="rgba(96,165,250,0.15)" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">🎯 Win Rate por Mês (%)</span></div>
            <div className="gpfx-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} domain={[0, 100]} tickFormatter={v => v + '%'} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v + '%', 'Win Rate']} />
                  <Area type="monotone" dataKey="winRate" stroke="#f59e0b" fill="rgba(245,158,11,0.15)" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">📋 Trades por Mês</span></div>
            <div className="gpfx-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="trades" fill="rgba(167,139,250,0.75)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">⚔️ Wins vs Losses</span></div>
            <div className="gpfx-card-body" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: 'var(--gpfx-text-secondary)', fontSize: 11 }} />
                  <Bar dataKey="wins" name="Wins" stackId="a" fill="rgba(0,211,149,0.8)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="losses" name="Losses" stackId="a" fill="rgba(255,77,77,0.8)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title">📊 P&L por Mês (USD)</span></div>
            <div className="gpfx-card-body" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'P&L']} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}
                    // @ts-ignore
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props;
                      return <rect x={x} y={y} width={width} height={height} fill={payload.pnl >= 0 ? 'rgba(0,211,149,0.75)' : 'rgba(255,77,77,0.75)'} rx={4} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chartData.map((d, i) => {
              const wr = d.trades > 0 ? ((d.wins / d.trades) * 100).toFixed(1) : '0.0';
              const pnlColor = d.pnl >= 0 ? 'var(--gpfx-green)' : 'var(--gpfx-red)';
              return (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--gpfx-card)', border: `1px solid var(--gpfx-border)` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>{d.name}</span>
                    <span className="text-sm font-extrabold" style={{ color: pnlColor }}>{d.pnl >= 0 ? '+' : ''}${fmtNum(d.pnl)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gpfx-border)' }}>
                      <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Trades</div>
                      <div className="text-sm font-extrabold" style={{ color: '#a78bfa' }}>{d.trades}</div>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--gpfx-border)' }}>
                      <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Win Rate</div>
                      <div className="text-sm font-extrabold" style={{ color: parseFloat(wr) >= 50 ? 'var(--gpfx-green)' : 'var(--gpfx-red)' }}>{wr}%</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(0,0,0,0.05)' }}>
                    <div style={{ width: wr + '%', background: 'var(--gpfx-green)' }} className="rounded-full" />
                    <div style={{ width: (100 - parseFloat(wr)) + '%', background: 'rgba(255,77,77,0.35)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
