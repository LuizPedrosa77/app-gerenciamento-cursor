import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import { Trade, fmtNum, getTradePnl, getWinRate, sumPnl } from '@/lib/gpfx-utils';
import jsPDF from 'jspdf';

interface WeeklyReportProps {
  trades: Trade[];
  accountName: string;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtDateFull(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtDateFile(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function getWeekTrades(trades: Trade[], monday: Date): Trade[] {
  const sun = getSunday(monday);
  const monStr = monday.toISOString().split('T')[0];
  const sunStr = sun.toISOString().split('T')[0];
  return trades.filter(t => t.date && t.date >= monStr && t.date <= sunStr);
}

function weeksAgo(monday: Date): number {
  const now = getMonday(new Date());
  const diff = Math.round((now.getTime() - monday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff;
}

const tooltipStyle = { background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)', borderRadius: 8, color: 'var(--gpfx-text-primary)' };

export default function WeeklyReport({ trades, accountName }: WeeklyReportProps) {
  // Default to previous week
  const [weekOffset, setWeekOffset] = useState(-1);

  const currentMonday = useMemo(() => {
    const m = getMonday(new Date());
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const currentSunday = getSunday(currentMonday);
  const weeksAgoN = weeksAgo(currentMonday);
  const weekLabel = weeksAgoN === 0 ? 'Semana atual' : weeksAgoN === 1 ? 'Semana passada' : `${weeksAgoN} semanas atrás`;

  const weekTrades = useMemo(() => getWeekTrades(trades, currentMonday), [trades, currentMonday]);

  const prevMonday = useMemo(() => {
    const m = new Date(currentMonday);
    m.setDate(m.getDate() - 7);
    return m;
  }, [currentMonday]);
  const prevWeekTrades = useMemo(() => getWeekTrades(trades, prevMonday), [trades, prevMonday]);

  const weekPnl = sumPnl(weekTrades);
  const prevPnl = sumPnl(prevWeekTrades);
  const weekWinRate = getWinRate(weekTrades);
  const diffPnl = weekPnl - prevPnl;

  // Highlights
  const highlights = useMemo(() => {
    if (weekTrades.length === 0) return null;
    const sorted = weekTrades.map(t => ({ ...t, totalPnl: getTradePnl(t) })).sort((a, b) => b.totalPnl - a.totalPnl);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const pairCount: Record<string, { count: number; wins: number }> = {};
    weekTrades.forEach(t => {
      if (!pairCount[t.pair]) pairCount[t.pair] = { count: 0, wins: 0 };
      pairCount[t.pair].count++;
      if (t.result === 'WIN') pairCount[t.pair].wins++;
    });
    const topPairEntry = Object.entries(pairCount).sort((a, b) => b[1].count - a[1].count)[0];
    const topPair = topPairEntry ? { pair: topPairEntry[0], count: topPairEntry[1].count, wr: topPairEntry[1].count > 0 ? Math.round((topPairEntry[1].wins / topPairEntry[1].count) * 100) : 0 } : null;

    return { best, worst, topPair };
  }, [weekTrades]);

  // Chart data: P&L per weekday (Mon-Fri)
  const chartData = useMemo(() => {
    const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const dayMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const dayHasTrades: Record<number, boolean> = { 1: false, 2: false, 3: false, 4: false, 5: false };
    weekTrades.forEach(t => {
      if (t.date) {
        const dow = new Date(t.date + 'T12:00:00').getDay();
        if (dow >= 1 && dow <= 5) {
          dayMap[dow] += getTradePnl(t);
          dayHasTrades[dow] = true;
        }
      }
    });
    return dayNames.map((name, i) => ({
      name,
      pnl: parseFloat(dayMap[i + 1].toFixed(2)),
      hasTrades: dayHasTrades[i + 1],
    }));
  }, [weekTrades]);

  // History: last 4 weeks
  const history = useMemo(() => {
    const rows = [];
    for (let w = 0; w < 4; w++) {
      const m = new Date(currentMonday);
      m.setDate(m.getDate() - w * 7);
      const s = getSunday(m);
      const wt = getWeekTrades(trades, m);
      const pnl = sumPnl(wt);

      const pm = new Date(m);
      pm.setDate(pm.getDate() - 7);
      const prevPnlW = sumPnl(getWeekTrades(trades, pm));
      const variation = prevPnlW !== 0 ? ((pnl - prevPnlW) / Math.abs(prevPnlW)) * 100 : 0;

      rows.push({
        label: `${fmtDate(m)} – ${fmtDate(s)}`,
        pnl,
        trades: wt.length,
        winRate: getWinRate(wt),
        variation,
        isCurrent: w === 0,
      });
    }
    return rows;
  }, [trades, currentMonday]);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const lm = 20;
    let y = 20;

    doc.setFontSize(16);
    doc.text('Gustavo Pedrosa FX — Relatório Semanal', lm, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Conta: ${accountName}`, lm, y);
    y += 7;
    doc.text(`Período: ${fmtDateFull(currentMonday)} a ${fmtDateFull(currentSunday)}`, lm, y);
    y += 10;

    doc.setFontSize(13);
    doc.text('Resumo', lm, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`P&L Total: ${weekPnl >= 0 ? '+' : ''}$${fmtNum(weekPnl)}`, lm, y); y += 6;
    doc.text(`Win Rate: ${weekWinRate}%`, lm, y); y += 6;
    doc.text(`Trades: ${weekTrades.length}`, lm, y); y += 6;
    doc.text(`vs Semana anterior: ${diffPnl >= 0 ? '+' : ''}$${fmtNum(diffPnl)}`, lm, y); y += 10;

    if (highlights) {
      doc.setFontSize(13);
      doc.text('Destaques', lm, y); y += 8;
      doc.setFontSize(10);
      if (highlights.best) {
        doc.text(`Melhor Trade: ${highlights.best.pair} ${highlights.best.dir} ${highlights.best.date || ''} → $${fmtNum(highlights.best.totalPnl)}`, lm, y);
        y += 6;
      }
      if (highlights.worst) {
        doc.text(`Pior Trade: ${highlights.worst.pair} ${highlights.worst.dir} ${highlights.worst.date || ''} → $${fmtNum(Math.abs(highlights.worst.totalPnl))}`, lm, y);
        y += 6;
      }
      if (highlights.topPair) {
        doc.text(`Par mais operado: ${highlights.topPair.pair} (${highlights.topPair.count} trades, WR ${highlights.topPair.wr}%)`, lm, y);
        y += 10;
      }
    }

    doc.setFontSize(13);
    doc.text('P&L por Dia', lm, y); y += 8;
    doc.setFontSize(10);
    chartData.forEach(d => {
      doc.text(`${d.name}: ${d.pnl >= 0 ? '+' : ''}$${fmtNum(d.pnl)}${!d.hasTrades ? ' (sem trades)' : ''}`, lm, y);
      y += 6;
    });
    y += 4;

    doc.setFontSize(13);
    doc.text('Histórico (últimas 4 semanas)', lm, y); y += 8;
    doc.setFontSize(10);
    history.forEach(h => {
      doc.text(`${h.label} | P&L: ${h.pnl >= 0 ? '+' : ''}$${fmtNum(h.pnl)} | ${h.trades} trades | WR ${h.winRate}%`, lm, y);
      y += 6;
    });
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, lm, y);

    doc.save(`GPFX_Relatorio_Semana_${fmtDateFile(currentMonday)}.pdf`);
  };

  return (
    <div className="gpfx-card">
      <div className="gpfx-card-header flex-wrap gap-3">
        <span className="gpfx-card-title">📋 Relatório Semanal</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: weeksAgoN === 0 ? 'rgba(0,211,149,0.15)' : 'rgba(255,255,255,0.06)', color: weeksAgoN === 0 ? '#00d395' : 'var(--gpfx-text-muted)' }}>
            {weekLabel}
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-white/10 transition-colors" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={16} style={{ color: 'var(--gpfx-text-muted)' }} />
            </button>
            <span className="text-xs font-bold" style={{ color: 'var(--gpfx-text-secondary)' }}>
              Semana de {fmtDate(currentMonday)} a {fmtDateFull(currentSunday)}
            </span>
            <button className="p-1 rounded hover:bg-white/10 transition-colors" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={16} style={{ color: 'var(--gpfx-text-muted)' }} />
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(0,211,149,0.12)', color: '#00d395' }}
            onClick={exportPDF}
          >
            <FileText size={14} /> Exportar Relatório
          </button>
        </div>
      </div>

      <div className="gpfx-card-body p-5 flex flex-col gap-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--gpfx-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>P&L Semanal</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: weekPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
              {weekPnl >= 0 ? '+' : ''}${fmtNum(weekPnl)}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--gpfx-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>Win Rate</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: '#f59e0b' }}>
              {weekWinRate}%
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--gpfx-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>Total Trades</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: '#60a5fa' }}>
              {weekTrades.length}
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--gpfx-border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>vs Semana Anterior</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: diffPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
              {diffPnl >= 0 ? '↑' : '↓'} {diffPnl >= 0 ? '+' : ''}${fmtNum(diffPnl)}
            </div>
          </div>
        </div>

        {/* Highlights */}
        {highlights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Best Trade */}
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,211,149,0.06)', border: '1px solid rgba(0,211,149,0.2)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>🏆 Melhor Trade</div>
              <div className="text-sm font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>
                {highlights.best.pair} <span className={highlights.best.dir === 'BUY' ? 'dir-buy' : 'dir-sell'} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>{highlights.best.dir}</span>
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--gpfx-text-muted)' }}>{highlights.best.date || '—'}</div>
              <div className="text-lg font-extrabold mt-1" style={{ color: '#00d395' }}>+${fmtNum(highlights.best.totalPnl)}</div>
            </div>

            {/* Worst Trade */}
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>⚠️ Pior Trade</div>
              <div className="text-sm font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>
                {highlights.worst.pair} <span className={highlights.worst.dir === 'BUY' ? 'dir-buy' : 'dir-sell'} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4 }}>{highlights.worst.dir}</span>
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--gpfx-text-muted)' }}>{highlights.worst.date || '—'}</div>
              <div className="text-lg font-extrabold mt-1" style={{ color: '#ff4d4d' }}>{highlights.worst.totalPnl >= 0 ? '+' : ''}${fmtNum(highlights.worst.totalPnl)}</div>
            </div>

            {/* Top Pair */}
            {highlights.topPair && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>📊 Par Mais Operado</div>
                <div className="text-sm font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>{highlights.topPair.pair}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--gpfx-text-muted)' }}>{highlights.topPair.count} trades</div>
                <div className="text-lg font-extrabold mt-1" style={{ color: '#60a5fa' }}>WR {highlights.topPair.wr}%</div>
              </div>
            )}
          </div>
        )}

        {weekTrades.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--gpfx-text-muted)' }}>
            Nenhum trade registrado nesta semana.
          </div>
        )}

        {/* Bar Chart */}
        {weekTrades.length > 0 && (
          <div style={{ height: 260 }}>
            <div className="text-xs font-bold mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>P&L por Dia da Semana</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={(v: number) => '$' + fmtNum(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'P&L']} />
                <ReferenceLine y={0} stroke="var(--gpfx-border)" />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={!d.hasTrades ? '#484f58' : d.pnl >= 0 ? '#00d395' : '#ff4d4d'}
                      strokeDasharray={!d.hasTrades ? '4 4' : undefined}
                      stroke={!d.hasTrades ? '#484f58' : undefined}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History Table */}
        <div>
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>Histórico — Últimas 4 Semanas</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--gpfx-text-muted)' }}>
                  <th className="text-left py-2 text-[10px] font-bold uppercase">Semana</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase">P&L</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase">Trades</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase">Win Rate</th>
                  <th className="text-right py-2 text-[10px] font-bold uppercase">vs Anterior</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--gpfx-border)',
                      background: h.isCurrent ? 'rgba(0,211,149,0.06)' : undefined,
                    }}
                  >
                    <td className="py-2 text-xs font-bold" style={{ color: h.isCurrent ? '#00d395' : 'var(--gpfx-text-secondary)' }}>{h.label}</td>
                    <td className="py-2 text-xs font-bold text-right" style={{ color: h.pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                      {h.pnl >= 0 ? '+' : ''}${fmtNum(h.pnl)}
                    </td>
                    <td className="py-2 text-xs text-right" style={{ color: 'var(--gpfx-text-secondary)' }}>{h.trades}</td>
                    <td className="py-2 text-xs text-right" style={{ color: '#f59e0b' }}>{h.winRate}%</td>
                    <td className="py-2 text-xs font-bold text-right" style={{ color: h.variation >= 0 ? '#00d395' : '#ff4d4d' }}>
                      {h.variation >= 0 ? '↑' : '↓'} {Math.abs(h.variation).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
