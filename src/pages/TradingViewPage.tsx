import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useGPFX } from '@/contexts/GPFXContext';
import { Trade, getTradePnl, fmtNum, sumPnl, getWinRate } from '@/lib/gpfx-utils';
import { ChevronDown, ChevronUp, MapPin, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Lightbox } from '@/components/Lightbox';
import { ScreenshotModal } from '@/components/ScreenshotModal';

const SYMBOLS = [
  { value: '__ALL__', label: '📊 Todos os ativos', pair: '__ALL__' },
  { value: 'FX:EURUSD', label: 'EUR/USD', pair: 'EUR/USD' },
  { value: 'FX:GBPUSD', label: 'GBP/USD', pair: 'GBP/USD' },
  { value: 'FX:USDJPY', label: 'USD/JPY', pair: 'USD/JPY' },
  { value: 'FX:USDCHF', label: 'USD/CHF', pair: 'USD/CHF' },
  { value: 'FX:AUDUSD', label: 'AUD/USD', pair: 'AUD/USD' },
  { value: 'FX:USDCAD', label: 'USD/CAD', pair: 'USD/CAD' },
  { value: 'FX:NZDUSD', label: 'NZD/USD', pair: 'NZD/USD' },
  { value: 'FX:EURGBP', label: 'EUR/GBP', pair: 'EUR/GBP' },
  { value: 'FX:EURJPY', label: 'EUR/JPY', pair: 'EUR/JPY' },
  { value: 'FX:GBPJPY', label: 'GBP/JPY', pair: 'GBP/JPY' },
  { value: 'OANDA:XAUUSD', label: 'Gold (XAU/USD)', pair: 'XAU/USD' },
  { value: 'OANDA:XAGUSD', label: 'Silver (XAG/USD)', pair: 'XAG/USD' },
  { value: 'SP:SPX', label: 'S&P 500', pair: 'US500' },
  { value: 'NASDAQ:NDX', label: 'NASDAQ 100', pair: 'US100' },
  { value: 'DJ:DJI', label: 'Dow Jones', pair: 'US30' },
  { value: 'BINANCE:BTCUSDT', label: 'Bitcoin', pair: 'BTC/USD' },
  { value: 'BINANCE:ETHUSDT', label: 'Ethereum', pair: 'ETH/USD' },
];

const INTERVALS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
];

const TRADE_PERIODS = [
  { value: '1m', label: 'Último mês' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '1y', label: 'Último ano' },
  { value: 'all', label: 'Tudo' },
];

const HEADER_PERIODS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este ano' },
  { value: 'all', label: 'Tudo' },
];

declare global {
  interface Window {
    TradingView: any;
  }
}

function getPairFromSymbol(symbol: string): string {
  const found = SYMBOLS.find(s => s.value === symbol);
  return found?.pair || '';
}

function getHeaderPeriodCutoff(period: string): string | null {
  if (period === 'all') return null;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  switch (period) {
    case 'today': return todayStr;
    case 'week': {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return monday.toISOString().split('T')[0];
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
    case 'year': return `${now.getFullYear()}-01-01`;
    default: return null;
  }
}

export default function TradingViewPage() {
  const { theme } = useTheme();
  const { state, updateTrade } = useGPFX();
  const [symbol, setSymbol] = useState('FX:EURUSD');
  const [interval, setInterval] = useState('D');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tradePeriod, setTradePeriod] = useState('all');
  const [showMarkers, setShowMarkers] = useState(() => localStorage.getItem('gpfx_show_markers') !== 'false');
  const [screenshotModal, setScreenshotModal] = useState<{ open: boolean; trade: Trade | null }>({ open: false, trade: null });
  const [lightbox, setLightbox] = useState<{ open: boolean; images: { data: string; caption: string; tradePair?: string }[]; index: number }>({ open: false, images: [], index: 0 });

  // New filters
  const [accountFilter, setAccountFilter] = useState(() => localStorage.getItem('gpfx_tv_account') || 'all');
  const [headerPeriod, setHeaderPeriod] = useState(() => localStorage.getItem('gpfx_tv_period') || 'all');

  // Track last real symbol for chart (when "all assets" is selected)
  const lastRealSymbol = useRef('FX:EURUSD');
  const isAllAssets = symbol === '__ALL__';
  const chartSymbol = isAllAssets ? lastRealSymbol.current : symbol;

  // Keep track of last real symbol
  useEffect(() => {
    if (!isAllAssets) lastRealSymbol.current = symbol;
  }, [symbol, isAllAssets]);

  // Persist filter preferences
  useEffect(() => { localStorage.setItem('gpfx_tv_account', accountFilter); }, [accountFilter]);
  useEffect(() => { localStorage.setItem('gpfx_tv_period', headerPeriod); }, [headerPeriod]);

  // Read gpfx_chart_goto on mount
  useEffect(() => {
    const raw = localStorage.getItem('gpfx_chart_goto');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.symbol) {
          setSymbol(data.symbol);
          setInterval('D');
          toast({
            title: `📍 Mostrando ${getPairFromSymbol(data.symbol) || data.symbol}`,
            description: data.date ? `Trade de ${data.date}` : undefined,
          });
        }
      } catch { /* ignore */ }
      localStorage.removeItem('gpfx_chart_goto');
    }
  }, []);

  // Save marker preference
  useEffect(() => {
    localStorage.setItem('gpfx_show_markers', String(showMarkers));
  }, [showMarkers]);

  // Get all trades filtered by account, pair, and header period
  const currentPair = getPairFromSymbol(symbol);

  const allPairTrades = useMemo(() => {
    const trades: Trade[] = [];
    const headerCutoff = getHeaderPeriodCutoff(headerPeriod);

    state.accounts.forEach((acc, accIdx) => {
      if (accountFilter !== 'all' && String(accIdx) !== accountFilter) return;
      acc.trades.forEach(t => {
        if (!isAllAssets && t.pair !== currentPair) return;
        if (headerCutoff && t.date && t.date < headerCutoff) return;
        trades.push(t);
      });
    });
    return trades.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [state, currentPair, isAllAssets, accountFilter, headerPeriod]);

  const filteredPairTrades = useMemo(() => {
    if (tradePeriod === 'all') return allPairTrades;
    const now = new Date();
    let cutoff: Date;
    if (tradePeriod === '1m') { cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); }
    else if (tradePeriod === '3m') { cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()); }
    else { cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); }
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allPairTrades.filter(t => t.date && t.date >= cutoffStr);
  }, [allPairTrades, tradePeriod]);

  // Pair stats
  const pairStats = useMemo(() => {
    const trades = allPairTrades;
    const total = trades.length;
    const winRate = getWinRate(trades);
    const pnl = sumPnl(trades);
    let best: Trade | null = null, worst: Trade | null = null;
    trades.forEach(t => {
      const p = getTradePnl(t);
      if (!best || p > getTradePnl(best)) best = t;
      if (!worst || p < getTradePnl(worst)) worst = t;
    });
    return { total, winRate, pnl, best, worst };
  }, [allPairTrades]);

  // Chart widget
  useEffect(() => {
    const createWidget = () => {
      if (!containerRef.current || !window.TradingView) return;
      containerRef.current.innerHTML = '';
      const chartDiv = document.createElement('div');
      chartDiv.id = 'tradingview_chart_' + Date.now();
      chartDiv.style.height = '100%';
      chartDiv.style.width = '100%';
      containerRef.current.appendChild(chartDiv);

      new window.TradingView.widget({
        autosize: true,
        symbol: chartSymbol,
        interval,
        timezone: 'America/Sao_Paulo',
        theme: theme === 'dark' ? 'dark' : 'light',
        style: '1',
        locale: 'br',
        toolbar_bg: '#161b22',
        enable_publishing: false,
        allow_symbol_change: true,
        save_image: true,
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        container_id: chartDiv.id,
        withdateranges: true,
        hide_side_toolbar: false,
        studies: ['Volume@tv-basicstudies'],
      });
    };

    if (scriptLoaded.current) { createWidget(); return; }
    const existing = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
    if (existing) { scriptLoaded.current = true; createWidget(); return; }
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => { scriptLoaded.current = true; createWidget(); };
    document.head.appendChild(script);
  }, [chartSymbol, interval, theme]);

  const selectStyle: React.CSSProperties = {
    background: '#0d1117',
    color: '#e6edf3',
    border: '1px solid rgba(0,211,149,0.2)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  };

  const totalPnl = sumPnl(filteredPairTrades);
  const totalWinRate = getWinRate(filteredPairTrades);
  const panelTitle = isAllAssets
    ? `Todos os trades registrados (${filteredPairTrades.length})`
    : `Trades registrados em ${currentPair || 'este par'} (${filteredPairTrades.length})`;

  return (
    <div className="p-3 flex flex-col gap-3 h-[calc(100vh-16px)] overflow-y-auto">
      {/* Header filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={symbol} onChange={e => setSymbol(e.target.value)} style={selectStyle}>
          {SYMBOLS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={selectStyle}>
          <option value="all">📊 Todas as contas</option>
          {state.accounts.map((a, i) => (
            <option key={i} value={String(i)}>{a.name}</option>
          ))}
        </select>
        <select value={headerPeriod} onChange={e => setHeaderPeriod(e.target.value)} style={selectStyle}>
          {HEADER_PERIODS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select value={interval} onChange={e => setInterval(e.target.value)} style={selectStyle}>
          {INTERVALS.map(i => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer ml-auto" style={{ color: showMarkers ? '#00d395' : '#6e7681' }}>
          <input type="checkbox" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)} style={{ accentColor: '#00d395' }} />
          <MapPin size={12} /> Mostrar trades
        </label>
      </div>

      {/* Stats Bar */}
      <div
        className="flex items-center gap-6 overflow-x-auto shrink-0"
        style={{
          background: 'rgba(0,211,149,0.04)',
          borderBottom: '1px solid rgba(0,211,149,0.1)',
          padding: '8px 16px',
          scrollbarWidth: 'thin',
        }}
      >
        <div className="flex flex-col whitespace-nowrap">
          <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>TRADES</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{pairStats.total}</span>
        </div>
        <div className="flex flex-col whitespace-nowrap">
          <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>WIN RATE</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#00d395' }}>{pairStats.winRate}%</span>
        </div>
        <div className="flex flex-col whitespace-nowrap">
          <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>P&L TOTAL</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: pairStats.pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
            {pairStats.pnl >= 0 ? '+' : ''}${fmtNum(pairStats.pnl)}
          </span>
        </div>
        {pairStats.best && (
          <div className="flex flex-col whitespace-nowrap">
            <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>MELHOR</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00d395' }}>
              {pairStats.best.pair} {pairStats.best.date} +${fmtNum(getTradePnl(pairStats.best))}
            </span>
          </div>
        )}
        {pairStats.worst && (
          <div className="flex flex-col whitespace-nowrap">
            <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>PIOR</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: getTradePnl(pairStats.worst) < 0 ? '#ff4d4d' : '#00d395' }}>
              {pairStats.worst.pair} {pairStats.worst.date} {getTradePnl(pairStats.worst) >= 0 ? '+' : ''}${fmtNum(getTradePnl(pairStats.worst))}
            </span>
          </div>
        )}
      </div>

      {/* Chart with markers overlay — fixed height */}
      <div className="relative shrink-0" style={{ height: 'calc(100vh - 220px)', minHeight: 500 }}>
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            inset: 0,
            border: '1px solid rgba(0,211,149,0.2)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        />
        {/* Trade markers overlay */}
        {showMarkers && allPairTrades.length > 0 && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {allPairTrades.slice(0, 20).map((t) => {
              const pnl = getTradePnl(t);
              const isBuy = t.dir === 'BUY';
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold cursor-default"
                  style={{
                    background: 'rgba(13,17,23,0.9)',
                    border: `1px solid ${isBuy ? 'rgba(0,211,149,0.3)' : 'rgba(255,77,77,0.3)'}`,
                    backdropFilter: 'blur(4px)',
                  }}
                  title={`${t.pair} ${t.dir} ${t.result} ${pnl >= 0 ? '+' : ''}$${fmtNum(pnl)} — ${t.date}`}
                >
                  <span style={{ color: isBuy ? '#00d395' : '#ff4d4d' }}>
                    {isBuy ? '↑' : '↓'}
                  </span>
                  <span style={{ color: '#8b949e' }}>{t.date?.slice(5)}</span>
                  <span style={{ color: t.result === 'WIN' ? '#00d395' : '#ff4d4d' }}>
                    {pnl >= 0 ? '+' : ''}${fmtNum(pnl)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible Trade Panel */}
      <div className="rounded-lg overflow-hidden shrink-0" style={{ background: '#161b22', border: '1px solid rgba(0,211,149,0.15)' }}>
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold"
          style={{ color: '#e6edf3' }}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <span>📋 {panelTitle}</span>
          {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {panelOpen && (
          <div>
            {/* Period filter */}
            <div className="flex items-center gap-2 px-4 py-2 flex-wrap" style={{ borderTop: '1px solid #21262d' }}>
              {TRADE_PERIODS.map(p => (
                <button
                  key={p.value}
                  className="text-[10px] font-bold px-3 py-1 rounded-full"
                  style={{
                    background: tradePeriod === p.value ? '#00d395' : 'rgba(0,211,149,0.1)',
                    color: tradePeriod === p.value ? '#0d1117' : '#00d395',
                    border: `1px solid ${tradePeriod === p.value ? '#00d395' : 'rgba(0,211,149,0.2)'}`,
                  }}
                  onClick={() => setTradePeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Trade table */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr style={{ background: '#0d1117' }}>
                    <th className="text-left px-4 py-2 font-bold" style={{ color: '#6e7681' }}>Data</th>
                    {isAllAssets && <th className="text-left px-4 py-2 font-bold" style={{ color: '#6e7681' }}>Par</th>}
                    <th className="text-left px-4 py-2 font-bold" style={{ color: '#6e7681' }}>Direção</th>
                    <th className="text-left px-4 py-2 font-bold" style={{ color: '#6e7681' }}>Lots</th>
                    <th className="text-left px-4 py-2 font-bold" style={{ color: '#6e7681' }}>Resultado</th>
                    <th className="text-center px-4 py-2 font-bold" style={{ color: '#6e7681' }}>📸</th>
                    <th className="text-right px-4 py-2 font-bold" style={{ color: '#6e7681' }}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPairTrades.map(t => {
                    const pnl = getTradePnl(t);
                    return (
                      <tr key={t.id} style={{
                        background: t.result === 'WIN' ? 'rgba(0,211,149,0.05)' : 'rgba(255,77,77,0.05)',
                        borderBottom: '1px solid #21262d',
                      }}>
                        <td className="px-4 py-2" style={{ color: '#8b949e' }}>{t.date || '—'}</td>
                        {isAllAssets && <td className="px-4 py-2 font-bold" style={{ color: '#e6edf3' }}>{t.pair}</td>}
                        <td className="px-4 py-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                            color: t.dir === 'BUY' ? '#00d395' : '#ff4d4d',
                            background: t.dir === 'BUY' ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)',
                          }}>{t.dir}</span>
                        </td>
                        <td className="px-4 py-2" style={{ color: '#8b949e' }}>{t.lots || '—'}</td>
                        <td className="px-4 py-2">
                          <span className="text-[10px] font-bold" style={{ color: t.result === 'WIN' ? '#00d395' : '#ff4d4d' }}>{t.result}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {t.screenshot ? (
                            <img
                              src={t.screenshot.data}
                              alt="Screenshot"
                              className="w-8 h-8 rounded object-cover cursor-pointer border inline-block"
                              style={{ borderColor: '#00d395' }}
                              onClick={() => {
                                const imgs = filteredPairTrades.filter(tr => tr.screenshot).map(tr => ({ data: tr.screenshot!.data, caption: tr.screenshot!.caption, tradePair: tr.pair }));
                                const idx = imgs.findIndex(im => im.data === t.screenshot!.data);
                                setLightbox({ open: true, images: imgs, index: Math.max(0, idx) });
                              }}
                            />
                          ) : (
                            <button
                              className="inline-flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-[rgba(0,211,149,0.1)]"
                              onClick={() => setScreenshotModal({ open: true, trade: t })}
                              title="Adicionar screenshot"
                            >
                              <Camera size={14} style={{ color: '#6e7681' }} />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-extrabold" style={{ color: pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                          {pnl >= 0 ? '+' : ''}${fmtNum(pnl)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPairTrades.length === 0 && (
                    <tr><td colSpan={isAllAssets ? 7 : 6} className="px-4 py-6 text-center" style={{ color: '#6e7681' }}>
                      Nenhum trade registrado{isAllAssets ? '' : ` neste par`}.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer totals */}
            {filteredPairTrades.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-3" style={{ borderTop: '1px solid #21262d', background: '#0d1117' }}>
                <span className="text-xs font-bold" style={{ color: '#6e7681' }}>{filteredPairTrades.length} trades</span>
                <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                  Win Rate: {totalWinRate}%
                </span>
                <span className="text-xs font-extrabold" style={{ color: totalPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                  P&L: {totalPnl >= 0 ? '+' : ''}${fmtNum(totalPnl)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox open={lightbox.open} onClose={() => setLightbox({ ...lightbox, open: false })} images={lightbox.images} initialIndex={lightbox.index} />

      {/* Screenshot Modal */}
      <ScreenshotModal
        open={screenshotModal.open}
        onClose={() => setScreenshotModal({ open: false, trade: null })}
        trade={screenshotModal.trade}
        onSave={(tradeId, screenshot) => updateTrade(tradeId, 'screenshot', screenshot)}
      />
    </div>
  );
}
