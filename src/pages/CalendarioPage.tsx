import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import {
  MONTHS_FULL, WEEKDAYS, PAIRS, DIRECTIONS, RESULTS,
  sumPnl, fmtNum, signedPnl, getWinRate, getTradePnl, uid, Trade,
} from '@/lib/gpfx-utils';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Lightbox } from '@/components/Lightbox';

/* ── Modal ── */
function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="gpfx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gpfx-modal" style={{ maxWidth: 600 }}>
        <div className="gpfx-card-header">
          <span className="gpfx-card-title">{title}</span>
          <button className="btn-gpfx btn-gpfx-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }} onClick={onClose}>✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--gpfx-border)' }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ── Add Trade Modal ── */
function AddTradeModal({ open, onClose, onSave, defaultDate }: {
  open: boolean; onClose: () => void; onSave: (t: Partial<Trade>) => void; defaultDate: string;
}) {
  const [pair, setPair] = useState('EUR/USD');
  const [dir, setDir] = useState('BUY');
  const [result, setResult] = useState('WIN');
  const [pnl, setPnl] = useState(0);
  const [lots, setLots] = useState(0.1);
  const [date, setDate] = useState(defaultDate);

  useEffect(() => { setDate(defaultDate); }, [defaultDate]);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="+ Novo Trade"
      footer={<>
        <button className="btn-gpfx btn-gpfx-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-gpfx btn-gpfx-primary" onClick={() => {
          onSave({ date, pair, dir, result, pnl: Math.abs(pnl), lots, hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0 });
          onClose();
        }}>Salvar Trade</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Data</label>
          <input type="date" className="gpfx-input text-xs" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Par</label>
          <select className="gpfx-select text-xs" value={pair} onChange={e => setPair(e.target.value)}>
            {PAIRS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Direção</label>
          <select className="gpfx-select text-xs" value={dir} onChange={e => setDir(e.target.value)}>
            {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Resultado</label>
          <select className={`gpfx-select text-xs ${result === 'WIN' ? 'result-win' : 'result-loss'}`} value={result} onChange={e => setResult(e.target.value)}>
            {RESULTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>P&L (USD)</label>
          <input type="number" step="0.01" className="gpfx-input text-xs" value={pnl || ''} onChange={e => setPnl(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Lots</label>
          <input type="number" step="0.01" className="gpfx-input text-xs" value={lots || ''} onChange={e => setLots(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
    </Modal>
  );
}

/* ── Pair to TradingView symbol ── */
function pairToSymbol(pair: string): string {
  const map: Record<string, string> = {
    'EUR/USD': 'FX:EURUSD', 'GBP/USD': 'FX:GBPUSD', 'USD/JPY': 'FX:USDJPY',
    'USD/CHF': 'FX:USDCHF', 'AUD/USD': 'FX:AUDUSD', 'USD/CAD': 'FX:USDCAD',
    'NZD/USD': 'FX:NZDUSD', 'EUR/GBP': 'FX:EURGBP', 'EUR/JPY': 'FX:EURJPY',
    'GBP/JPY': 'FX:GBPJPY', 'XAU/USD': 'OANDA:XAUUSD', 'XAG/USD': 'OANDA:XAGUSD',
    'BTC/USD': 'BINANCE:BTCUSDT', 'ETH/USD': 'BINANCE:ETHUSDT',
  };
  return map[pair] || 'FX:' + pair.replace('/', '');
}

interface CalendarioPageProps {
  onNavigateView: (view: string) => void;
}

export default function CalendarioPage({ onNavigateView }: CalendarioPageProps) {
  const { state, activeAcc, addTrade, setState, save } = useGPFX();
  const acc = activeAcc;
  const now = new Date();

  const [calYear, setCalYear] = useState(state.activeYear);
  const [calMonth, setCalMonth] = useState(state.activeMonth);
  const [dayModal, setDayModal] = useState<string | null>(null);
  const [addTradeModal, setAddTradeModal] = useState(false);
  const [addTradeDate, setAddTradeDate] = useState('');
  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gpfx_daily_notes') || '{}'); } catch { return {}; }
  });
  const [noteTimer, setNoteTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lightbox, setLightbox] = useState<{ open: boolean; images: { data: string; caption: string; tradePair?: string }[]; index: number }>({ open: false, images: [], index: 0 });

  // Review day: default to yesterday
  const [reviewDate, setReviewDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

  const saveNote = useCallback((date: string, text: string) => {
    setDailyNotes(prev => {
      const next = { ...prev, [date]: text };
      if (noteTimer) clearTimeout(noteTimer);
      const t = setTimeout(() => localStorage.setItem('gpfx_daily_notes', JSON.stringify(next)), 1000);
      setNoteTimer(t);
      return next;
    });
  }, [noteTimer]);

  // Month trades
  const monthTrades = useMemo(() =>
    acc.trades.filter(t => t.year === calYear && t.month === calMonth),
    [acc.trades, calYear, calMonth]
  );

  const monthPnl = sumPnl(monthTrades);
  const daysOperated = new Set(monthTrades.map(t => t.date)).size;

  // Build calendar grid
  const calendarData = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: Array<{ day: number; date: string; trades: Trade[]; pnl: number; winRate: number } | null> = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(calMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${calYear}-${mm}-${dd}`;
      const dayTrades = monthTrades.filter(t => t.date === dateStr);
      const pnl = sumPnl(dayTrades);
      const winRate = getWinRate(dayTrades);
      cells.push({ day: d, date: dateStr, trades: dayTrades, pnl, winRate });
    }
    return cells;
  }, [calYear, calMonth, monthTrades]);

  // Weekly summary
  const weeklySummary = useMemo(() => {
    const weeks: Array<{ label: string; pnl: number; days: number }> = [];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    for (let w = 0; w < 5; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, daysInMonth);
      if (startDay > daysInMonth) break;
      let pnl = 0;
      const daysSet = new Set<string>();
      for (let d = startDay; d <= endDay; d++) {
        const mm = String(calMonth + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateStr = `${calYear}-${mm}-${dd}`;
        const dayTrades = monthTrades.filter(t => t.date === dateStr);
        if (dayTrades.length > 0) {
          pnl += sumPnl(dayTrades);
          daysSet.add(dateStr);
        }
      }
      weeks.push({ label: `Semana ${w + 1}`, pnl, days: daysSet.size });
    }
    return weeks;
  }, [calYear, calMonth, monthTrades]);

  // GP Score
  const gpScore = useMemo(() => {
    const trades = monthTrades;
    if (trades.length === 0) return { axes: [], score: 0 };
    const wins = trades.filter(t => t.result === 'WIN');
    const losses = trades.filter(t => t.result === 'LOSS');
    const hitRate = Math.min(100, (wins.length / trades.length) * 100);
    const totalWinPnl = wins.reduce((s, t) => s + getTradePnl(t), 0);
    const totalLossPnl = Math.abs(losses.reduce((s, t) => s + getTradePnl(t), 0));
    const profitFactor = totalLossPnl > 0 ? Math.min(100, (totalWinPnl / totalLossPnl) * 25) : (totalWinPnl > 0 ? 100 : 0);
    const avgWin = wins.length > 0 ? totalWinPnl / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossPnl / losses.length : 0;
    const winLossRatio = avgLoss > 0 ? Math.min(100, (avgWin / avgLoss) * 33) : (avgWin > 0 ? 100 : 0);

    // Consistency: std deviation of daily P&Ls
    const dailyPnls: number[] = [];
    const dates = new Set(trades.map(t => t.date));
    dates.forEach(d => {
      const dt = trades.filter(t => t.date === d);
      dailyPnls.push(sumPnl(dt));
    });
    const mean = dailyPnls.reduce((s, v) => s + v, 0) / dailyPnls.length;
    const variance = dailyPnls.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyPnls.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / (Math.abs(mean) || 1)) * 20));

    // Drawdown
    let peak = 0, maxDD = 0, running = 0;
    const sortedDates = [...dates].sort();
    sortedDates.forEach(d => {
      const dt = trades.filter(t => t.date === d);
      running += sumPnl(dt);
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });
    const ddScore = Math.max(0, Math.min(100, 100 - (maxDD / (acc.balance || 1)) * 200));

    // Recovery factor
    const totalPnl = sumPnl(trades);
    const recoveryFactor = maxDD > 0 ? Math.min(100, (totalPnl / maxDD) * 33) : (totalPnl > 0 ? 100 : 0);

    const axes = [
      { axis: 'Taxa de Acerto', value: Math.round(hitRate) },
      { axis: 'Fator de Lucro', value: Math.round(profitFactor) },
      { axis: 'Consistência', value: Math.round(consistency) },
      { axis: 'Drawdown Máx.', value: Math.round(ddScore) },
      { axis: 'Média Win/Loss', value: Math.round(winLossRatio) },
      { axis: 'Fator de Recuperação', value: Math.round(recoveryFactor) },
    ];
    const score = Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length);
    return { axes, score };
  }, [monthTrades, acc.balance]);

  // Cumulative P&L chart
  const cumPnlData = useMemo(() => {
    const dateMap = new Map<string, number>();
    monthTrades.forEach(t => {
      dateMap.set(t.date, (dateMap.get(t.date) || 0) + getTradePnl(t));
    });
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cum = 0;
    return sorted.map(([date, pnl]) => {
      cum += pnl;
      return { date: date.slice(5), pnl: parseFloat(cum.toFixed(2)) };
    });
  }, [monthTrades]);

  // Review day data
  const reviewTrades = useMemo(() =>
    acc.trades.filter(t => t.date === reviewDate),
    [acc.trades, reviewDate]
  );
  const reviewPnl = sumPnl(reviewTrades);
  const reviewWinRate = getWinRate(reviewTrades);
  const reviewWins = reviewTrades.filter(t => t.result === 'WIN').length;

  const bestTrade = useMemo(() => {
    if (reviewTrades.length === 0) return null;
    return reviewTrades.reduce((best, t) => getTradePnl(t) > getTradePnl(best) ? t : best);
  }, [reviewTrades]);
  const worstTrade = useMemo(() => {
    if (reviewTrades.length === 0) return null;
    return reviewTrades.reduce((worst, t) => getTradePnl(t) < getTradePnl(worst) ? t : worst);
  }, [reviewTrades]);

  // Avg last 7 days
  const avg7d = useMemo(() => {
    const allDates = [...new Set(acc.trades.map(t => t.date))].sort().filter(d => d < reviewDate);
    const last7 = allDates.slice(-7);
    if (last7.length === 0) return 0;
    const total = last7.reduce((s, d) => s + sumPnl(acc.trades.filter(t => t.date === d)), 0);
    return total / last7.length;
  }, [acc.trades, reviewDate]);

  const reviewDateObj = new Date(reviewDate + 'T12:00:00');
  const reviewDateFormatted = reviewDateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });

  const reviewBadge = reviewTrades.length === 0
    ? { emoji: '⚪', label: 'Sem Operações', color: 'var(--gpfx-text-muted)' }
    : reviewWinRate > 70
      ? { emoji: '🟢', label: 'Dia Excelente', color: '#00d395' }
      : reviewWinRate >= 40
        ? { emoji: '🟡', label: 'Dia Regular', color: '#f59e0b' }
        : { emoji: '🔴', label: 'Dia Difícil', color: '#ff4d4d' };

  const goToChart = (trade: Trade) => {
    localStorage.setItem('gpfx_chart_goto', JSON.stringify({
      symbol: pairToSymbol(trade.pair),
      date: trade.date,
      tradeId: trade.id,
    }));
    onNavigateView('tradingview');
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };
  const goThisMonth = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); };

  const prevReviewDay = () => {
    const d = new Date(reviewDate + 'T12:00:00'); d.setDate(d.getDate() - 1);
    setReviewDate(d.toISOString().split('T')[0]);
  };
  const nextReviewDay = () => {
    const d = new Date(reviewDate + 'T12:00:00'); d.setDate(d.getDate() + 1);
    setReviewDate(d.toISOString().split('T')[0]);
  };

  const handleAddTrade = (data: Partial<Trade>) => {
    setState(prev => {
      const accounts = [...prev.accounts];
      const accCopy = { ...accounts[prev.activeAccount], trades: [...accounts[prev.activeAccount].trades] };
      const d = new Date((data.date || '') + 'T12:00:00');
      accCopy.trades.push({
        id: uid(), year: d.getFullYear(), month: d.getMonth(),
        date: data.date || '', pair: data.pair || 'EUR/USD', dir: data.dir || 'BUY',
        lots: data.lots || 0.1, result: data.result || 'WIN', pnl: data.pnl || 0,
        hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0,
      });
      accounts[prev.activeAccount] = accCopy;
      return { ...prev, accounts };
    });
    save();
  };

  const todayStr = now.toISOString().split('T')[0];
  const scoreColor = gpScore.score >= 71 ? '#00d395' : gpScore.score >= 41 ? '#f59e0b' : '#ff4d4d';

  const tooltipStyle = { background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)', borderRadius: 8, color: 'var(--gpfx-text-primary)' };

  // Day modal data
  const dayModalTrades = dayModal ? monthTrades.filter(t => t.date === dayModal) : [];
  const dayModalPnl = sumPnl(dayModalTrades);
  const dayModalDate = dayModal ? new Date(dayModal + 'T12:00:00') : null;

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1600px] mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>📅 Calendário</h1>
          <div className="flex items-center gap-1">
            <button className="btn-gpfx btn-gpfx-ghost p-1" onClick={prevMonth}><ChevronLeft size={18} /></button>
            <span className="text-sm font-bold min-w-[160px] text-center" style={{ color: 'var(--gpfx-text-primary)' }}>
              {MONTHS_FULL[calMonth]} {calYear}
            </span>
            <button className="btn-gpfx btn-gpfx-ghost p-1" onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>
          <button className="text-[11px] px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(0,211,149,0.15)', color: '#00d395', border: '1px solid rgba(0,211,149,0.3)' }}
            onClick={goThisMonth}>Este mês</button>
          <span className="text-sm font-bold" style={{ color: monthPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
            {monthPnl >= 0 ? '+' : ''}${fmtNum(monthPnl)}
          </span>
          <span className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>{daysOperated} dias operados</span>
          {(() => {
            const goal = acc.monthlyGoal || 0;
            if (goal <= 0) return null;
            const pct = Math.min(100, Math.max(0, (monthPnl / goal) * 100));
            const pillColor = pct >= 100 ? '#00d395' : pct >= 71 ? '#3b82f6' : pct >= 41 ? '#f59e0b' : '#ff4d4d';
            return (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: pillColor + '20', color: pillColor }}>
                🎯 {pct.toFixed(0)}%
              </span>
            );
          })()}
        </div>
        <button className="btn-gpfx btn-gpfx-primary text-xs" onClick={() => {
          const mm = String(calMonth + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          setAddTradeDate(`${calYear}-${mm}-${dd}`);
          setAddTradeModal(true);
        }}>
          <Plus size={14} /> Novo Trade
        </button>
      </div>

      {/* Main grid: Calendar + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Calendar Grid */}
        <div className="gpfx-card">
          <div className="gpfx-card-body p-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: 'var(--gpfx-text-muted)' }}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((cell, i) => {
                if (!cell) return <div key={`empty-${i}`} className="aspect-square" />;
                const isToday = cell.date === todayStr;
                const hasTrades = cell.trades.length > 0;
                const bg = !hasTrades ? 'transparent' : cell.pnl >= 0 ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)';
                const border = isToday ? '2px solid #00d395' : hasTrades ? (cell.pnl >= 0 ? '1px solid rgba(0,211,149,0.3)' : '1px solid rgba(255,77,77,0.3)') : '1px solid var(--gpfx-border)';
                const boxShadow = isToday ? '0 0 8px rgba(0,211,149,0.3)' : 'none';

                return (
                  <div key={cell.date}
                    className={`rounded-lg p-1.5 flex flex-col min-h-[70px] ${hasTrades ? 'cursor-pointer hover:opacity-80' : ''}`}
                    style={{ background: bg, border, boxShadow, transition: 'all 0.2s' }}
                    onClick={() => { if (hasTrades) setDayModal(cell.date); }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>{cell.day}</span>
                    {hasTrades && (
                      <>
                        <span className="text-xs font-extrabold mt-auto" style={{ color: cell.pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                          {cell.pnl >= 0 ? '+' : ''}${fmtNum(cell.pnl)}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--gpfx-text-muted)' }}>{cell.trades.length} trades</span>
                        <span className="text-[9px]" style={{ color: 'var(--gpfx-text-muted)' }}>{cell.winRate}%</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Weekly Summary */}
          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title text-sm">Resumo por Semana</span></div>
            <div className="gpfx-card-body p-3 flex flex-col gap-2">
              {weeklySummary.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{w.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: 'var(--gpfx-text-muted)' }}>{w.days}d</span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full" style={{
                      color: w.pnl > 0 ? '#00d395' : w.pnl < 0 ? '#ff4d4d' : 'var(--gpfx-text-muted)',
                      background: w.pnl > 0 ? 'rgba(0,211,149,0.15)' : w.pnl < 0 ? 'rgba(255,77,77,0.15)' : 'transparent',
                    }}>
                      {w.pnl !== 0 ? (w.pnl > 0 ? '+' : '') + '$' + fmtNum(w.pnl) : '–'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GP Score */}
          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title text-sm">GP Score</span></div>
            <div className="gpfx-card-body p-3">
              <div className="flex items-center justify-center mb-2">
                <span className="text-3xl font-black" style={{ color: scoreColor }}>{gpScore.score}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--gpfx-text-muted)' }}>/100</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--gpfx-border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: gpScore.score + '%', background: scoreColor }} />
              </div>
              {gpScore.axes.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={gpScore.axes}>
                    <PolarGrid stroke="var(--gpfx-border)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 9 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#00d395" fill="rgba(0,211,149,0.15)" fillOpacity={1} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Cumulative P&L */}
          <div className="gpfx-card">
            <div className="gpfx-card-header"><span className="gpfx-card-title text-sm">P&L Líquido Acumulado</span></div>
            <div className="gpfx-card-body p-3" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumPnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gpfx-border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--gpfx-border)' }} />
                  <YAxis tick={{ fill: 'var(--gpfx-text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--gpfx-border)' }} tickFormatter={v => '$' + fmtNum(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => ['$' + fmtNum(v), 'Acumulado']} />
                  <Area type="monotone" dataKey="pnl" stroke="#00d395" fill="rgba(0,211,149,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Day Review Panel */}
      <div className="gpfx-card">
        <div className="gpfx-card-header flex-wrap">
          <div className="flex items-center gap-3">
            <span className="gpfx-card-title text-sm">📋 Revisão do Dia</span>
            <div className="flex items-center gap-1">
              <button className="btn-gpfx btn-gpfx-ghost p-1" onClick={prevReviewDay}><ChevronLeft size={16} /></button>
              <span className="text-xs font-bold min-w-[200px] text-center capitalize" style={{ color: 'var(--gpfx-text-primary)' }}>
                {reviewDateFormatted}
              </span>
              <button className="btn-gpfx btn-gpfx-ghost p-1" onClick={nextReviewDay}><ChevronRight size={16} /></button>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: reviewBadge.color, background: reviewBadge.color + '22' }}>
            {reviewBadge.emoji} {reviewBadge.label}
          </span>
        </div>

        <div className="gpfx-card-body p-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <MiniCard label="P&L Total" value={(reviewPnl >= 0 ? '+' : '') + '$' + fmtNum(reviewPnl)} color={reviewPnl >= 0 ? '#00d395' : '#ff4d4d'} />
            <MiniCard label="Win Rate" value={reviewTrades.length > 0 ? reviewWinRate + '%' : '—'} color="#f59e0b" />
            <MiniCard label="Total Trades" value={String(reviewTrades.length)} color="var(--gpfx-text-primary)" />
            <MiniCard label="Melhor Trade" value={bestTrade ? bestTrade.pair + ' +$' + fmtNum(getTradePnl(bestTrade)) : '—'} color="#00d395" />
            <MiniCard label="Pior Trade" value={worstTrade ? worstTrade.pair + ' ' + (getTradePnl(worstTrade) >= 0 ? '+' : '') + '$' + fmtNum(getTradePnl(worstTrade)) : '—'} color="#ff4d4d" />
            <MiniCard label="vs Média 7d" value={
              avg7d === 0 ? '—' :
              ((reviewPnl - avg7d) >= 0 ? '+' : '') + '$' + fmtNum(reviewPnl - avg7d)
            } color={reviewPnl >= avg7d ? '#00d395' : '#ff4d4d'} />
          </div>

          {/* Trades table */}
          {reviewTrades.length > 0 ? (
            <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--gpfx-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--gpfx-input-bg)' }}>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>#</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>📸</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>Par</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>Direção</th>
                    <th className="px-3 py-2 text-left font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>Resultado</th>
                    <th className="px-3 py-2 text-right font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>P&L</th>
                    <th className="px-3 py-2 text-center font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewTrades.map((t, i) => {
                    const pnl = getTradePnl(t);
                    return (
                      <tr key={t.id} style={{ background: t.result === 'WIN' ? 'rgba(0,211,149,0.05)' : 'rgba(255,77,77,0.05)', borderBottom: '1px solid var(--gpfx-border)' }}>
                        <td className="px-3 py-2 font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>{i + 1}</td>
                        <td className="px-3 py-2">
                          {t.screenshot ? (
                            <img
                              src={t.screenshot.data}
                              alt="Screenshot"
                              className="w-12 h-12 rounded object-cover cursor-pointer border"
                              style={{ borderColor: '#00d395' }}
                              onClick={() => {
                                const imgs = reviewTrades.filter(tr => tr.screenshot).map(tr => ({ data: tr.screenshot!.data, caption: tr.screenshot!.caption, tradePair: tr.pair }));
                                const idx = imgs.findIndex(im => im.data === t.screenshot!.data);
                                setLightbox({ open: true, images: imgs, index: Math.max(0, idx) });
                              }}
                            />
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--gpfx-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{t.pair}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                            color: t.dir === 'BUY' ? '#00d395' : '#ff4d4d',
                            background: t.dir === 'BUY' ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)',
                          }}>{t.dir}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                            color: t.result === 'WIN' ? '#00d395' : '#ff4d4d',
                            background: t.result === 'WIN' ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)',
                          }}>{t.result}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-extrabold" style={{ color: pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                          {pnl >= 0 ? '+' : ''}${fmtNum(pnl)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button className="text-[10px] font-bold px-2 py-1 rounded" style={{ color: '#00d395', background: 'rgba(0,211,149,0.1)' }}
                            onClick={() => goToChart(t)}>📈 Ver no gráfico</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 flex flex-col items-center gap-2" style={{ color: 'var(--gpfx-text-muted)' }}>
              <Calendar size={32} />
              <span className="text-sm">Nenhuma operação neste dia</span>
            </div>
          )}

          {/* Daily Note */}
          <div className="mt-4">
            <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--gpfx-text-primary)' }}>📝 Nota do Dia</h3>
            <textarea
              className="gpfx-input w-full text-xs"
              style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="O que você aprendeu hoje? Como foi sua disciplina e emocional?"
              value={dailyNotes[reviewDate] || ''}
              onChange={e => saveNote(reviewDate, e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      <Modal open={!!dayModal} onClose={() => setDayModal(null)}
        title={dayModalDate ? `Trades — ${dayModalDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}` : ''}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-extrabold" style={{ color: dayModalPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
              P&L: {dayModalPnl >= 0 ? '+' : ''}${fmtNum(dayModalPnl)}
            </span>
            <div className="flex gap-2">
              <button className="btn-gpfx btn-gpfx-primary text-xs" onClick={() => {
                if (dayModal) { setAddTradeDate(dayModal); setAddTradeModal(true); setDayModal(null); }
              }}>+ Adicionar trade neste dia</button>
            </div>
          </div>
        }>
        {dayModalTrades.map((t, i) => {
          const pnl = getTradePnl(t);
          return (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg" style={{
              background: t.result === 'WIN' ? 'rgba(0,211,149,0.08)' : 'rgba(255,77,77,0.08)',
              border: '1px solid var(--gpfx-border)',
            }}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--gpfx-text-muted)', background: 'var(--gpfx-border)' }}>#{i + 1}</span>
                {t.screenshot && (
                  <img
                    src={t.screenshot.data}
                    alt="Screenshot"
                    className="w-10 h-10 rounded object-cover cursor-pointer border"
                    style={{ borderColor: '#00d395' }}
                    onClick={() => {
                      const imgs = dayModalTrades.filter(tr => tr.screenshot).map(tr => ({ data: tr.screenshot!.data, caption: tr.screenshot!.caption, tradePair: tr.pair }));
                      const idx = imgs.findIndex(im => im.data === t.screenshot!.data);
                      setLightbox({ open: true, images: imgs, index: Math.max(0, idx) });
                    }}
                  />
                )}
                <span className="text-xs font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{t.pair}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                  color: t.dir === 'BUY' ? '#00d395' : '#ff4d4d',
                  background: t.dir === 'BUY' ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)',
                }}>{t.dir}</span>
                <span className="text-[10px] font-bold" style={{ color: t.result === 'WIN' ? '#00d395' : '#ff4d4d' }}>{t.result}</span>
                {t.lots && <span className="text-[10px]" style={{ color: 'var(--gpfx-text-muted)' }}>{t.lots} lots</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold" style={{ color: pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                  {pnl >= 0 ? '+' : ''}${fmtNum(pnl)}
                </span>
                <button className="text-[10px] font-bold px-2 py-1 rounded" style={{ color: '#00d395', background: 'rgba(0,211,149,0.1)' }}
                  onClick={() => { setDayModal(null); goToChart(t); }}>📈 Ver no gráfico</button>
              </div>
            </div>
          );
        })}
      </Modal>

      {/* Add Trade Modal */}
      <AddTradeModal open={addTradeModal} onClose={() => setAddTradeModal(false)} onSave={handleAddTrade} defaultDate={addTradeDate} />

      {/* Lightbox */}
      <Lightbox open={lightbox.open} onClose={() => setLightbox({ ...lightbox, open: false })} images={lightbox.images} initialIndex={lightbox.index} />
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)' }}>
      <div className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--gpfx-text-muted)' }}>{label}</div>
      <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}
