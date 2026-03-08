import { useState, useCallback, useRef } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import {
  MONTHS, YEARS, PAIRS, DIRECTIONS, RESULTS,
  sumPnl, fmtNum, signedPnl, getAccountBalance, uid, Trade,
} from '@/lib/gpfx-utils';
import { Download, Upload } from 'lucide-react';

/* ── Modal component ── */
function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="gpfx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gpfx-modal">
        <div className="gpfx-card-header">
          <span className="gpfx-card-title">{title}</span>
          <button className="btn-gpfx btn-gpfx-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }} onClick={onClose}>✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3">{children}</div>
        {footer && <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid #21262d' }}>{footer}</div>}
      </div>
    </div>
  );
}

export default function PlanilhaPage() {
  const {
    state, activeAcc, switchAccount, addAccount, deleteAccount, renameAccount,
    updateBalance, updateNotes, updateMeta, addTrade, addNewDay, updateTrade,
    deleteTrade, resetAccount, switchYear, switchMonth, updateWithdrawal,
  } = useGPFX();

  const [renameModal, setRenameModal] = useState<{ open: boolean; idx: number; name: string }>({ open: false, idx: 0, name: '' });
  const [resetModal, setResetModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [exportModal, setExportModal] = useState(false);
  const [mt5Modal, setMt5Modal] = useState(false);
  const [exportAccMode, setExportAccMode] = useState('active');
  const [exportPeriod, setExportPeriod] = useState('all');
  const [mt5AccIdx, setMt5AccIdx] = useState(String(state.activeAccount));
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [filterPair, setFilterPair] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const year = state.activeYear;
  const month = state.activeMonth;
  const acc = activeAcc;

  const allTrades = acc.trades;
  let monthTrades = allTrades.filter(t => t.year === year && t.month === month);
  const yearTrades = allTrades.filter(t => t.year === year);

  // Apply filters
  if (filterPair) monthTrades = monthTrades.filter(t => t.pair === filterPair);
  if (filterDir) monthTrades = monthTrades.filter(t => t.dir === filterDir);
  if (filterResult) monthTrades = monthTrades.filter(t => t.result === filterResult);

  const monthPnl = sumPnl(acc.trades.filter(t => t.year === year && t.month === month));
  const yearPnl = sumPnl(yearTrades);
  const totalPnl = sumPnl(allTrades);
  const allWithdrawals = Object.values(acc.withdrawals || {}).reduce((s, v) => s + v, 0);
  const yearWithdrawals = Object.entries(acc.withdrawals || {}).filter(e => e[0].startsWith(year + '-')).reduce((s, e) => s + e[1], 0);
  const monthWithdrawal = (acc.withdrawals || {})[year + '-' + month] || 0;
  const balance = acc.balance + totalPnl - allWithdrawals;
  const monthWins = acc.trades.filter(t => t.year === year && t.month === month && t.result === 'WIN').length;
  const monthLosses = acc.trades.filter(t => t.year === year && t.month === month && t.result === 'LOSS').length;
  const monthTotal = acc.trades.filter(t => t.year === year && t.month === month).length;
  const winRate = monthTotal > 0 ? Math.round((monthWins / monthTotal) * 100) : 0;
  const yearNet = yearPnl - yearWithdrawals;
  const monthNet = monthPnl - monthWithdrawal;

  // Monthly data for grid
  const monthlyData = MONTHS.map((_, mi) => {
    const mt = yearTrades.filter(t => t.month === mi);
    return { pnl: sumPnl(mt), count: mt.length };
  });

  // Max win/loss
  const allSignedPnls = acc.trades.filter(t => t.year === year && t.month === month).flatMap(t => {
    const vals = [signedPnl(t.pnl, t.result)];
    if (t.hasVM) vals.push(signedPnl(t.vmPnl, t.vmResult));
    return vals;
  });
  const maxWin = allSignedPnls.length > 0 ? Math.max(0, ...allSignedPnls) : 0;
  const maxLoss = allSignedPnls.length > 0 ? Math.abs(Math.min(0, ...allSignedPnls)) : 0;

  // Best pair
  const pairMap: Record<string, number> = {};
  acc.trades.filter(t => t.year === year && t.month === month).forEach(t => {
    const p = signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
    pairMap[t.pair] = (pairMap[t.pair] || 0) + p;
  });
  const bestPairEntry = Object.entries(pairMap).sort((a, b) => b[1] - a[1])[0];
  const bestPairStr = bestPairEntry ? `${bestPairEntry[0]} (${bestPairEntry[1] >= 0 ? '+' : ''}$${fmtNum(bestPairEntry[1])})` : '—';

  // Drawdown
  let peak = 0, dd = 0, running = 0;
  acc.trades.filter(t => t.year === year && t.month === month).slice().sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1).forEach(t => {
    running += signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
    if (running > peak) peak = running;
    const curDD = peak - running;
    if (curDD > dd) dd = curDD;
  });

  // Group trades by date
  const groups: Record<string, Trade[]> = {};
  const dateOrder: string[] = [];
  monthTrades.forEach(t => {
    const d = t.date || 'Sem data';
    if (!groups[d]) { groups[d] = []; dateOrder.push(d); }
    groups[d].push(t);
  });
  dateOrder.sort();

  // Export CSV
  const handleExport = () => {
    const accounts = exportAccMode === 'all' ? state.accounts : [acc];
    const rows: string[][] = [['Conta', 'Data', 'Par', 'Direção', 'Lots', 'Resultado', 'P&L (USD)', 'Virada de Mão', 'P&L VM (USD)', 'P&L Total (USD)']];
    accounts.forEach(a => {
      let trades = a.trades.slice();
      if (exportPeriod === 'year') trades = trades.filter(t => t.year === year);
      else if (exportPeriod === 'month') trades = trades.filter(t => t.year === year && t.month === month);
      trades.sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1);
      trades.forEach(t => {
        const pnlMain = signedPnl(t.pnl, t.result);
        const pnlVM = t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0;
        rows.push([a.name, t.date || '', t.pair || '', t.dir || '', String(t.lots || ''), t.result || '', pnlMain.toFixed(2), t.hasVM ? 'Sim' : 'Não', pnlVM !== 0 ? pnlVM.toFixed(2) : '', (pnlMain + pnlVM).toFixed(2)]);
      });
    });
    const csv = '\uFEFF' + rows.map(row => row.map(cell => {
      const str = String(cell);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? '"' + str.replace(/"/g, '""') + '"' : str;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob);
    a2.download = `gustavo-pedrosa-fx_${new Date().toISOString().split('T')[0]}.csv`;
    a2.click();
    setExportModal(false);
  };

  // Import MT5
  const handleMT5Import = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let text = '';
        if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
          text = new TextDecoder('utf-16le').decode(buffer);
        } else {
          text = new TextDecoder('utf-8').decode(buffer);
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const allText = doc.body ? doc.body.innerText : text;
        const posStart = allText.indexOf('Posições');
        if (posStart === -1) { alert('Seção "Posições" não encontrada.'); return; }
        const posEnd = allText.indexOf('Ordens', posStart);
        const posText = allText.substring(posStart, posEnd > -1 ? posEnd : undefined);
        const datePattern = /(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+(\d+)\s+([\w.]+)\s+(buy|sell)\s+(?:[\w_]+\s+)?(\d+\.?\d*)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+([\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/gi;
        const trades: Trade[] = [];
        let match;
        while ((match = datePattern.exec(posText)) !== null) {
          const openDate = match[1];
          const asset = match[3];
          const type = match[4];
          const lots = parseFloat(match[5]);
          const commission = parseFloat(match[11]) || 0;
          const swap = parseFloat(match[12]) || 0;
          const profit = parseFloat(match[13]) || 0;
          const pnl = parseFloat((profit + commission + swap).toFixed(2));
          const result = pnl >= 0 ? 'WIN' : 'LOSS';
          const dateParts = openDate.split(' ')[0].split('.');
          const dateFormatted = dateParts[0] + '-' + dateParts[1] + '-' + dateParts[2];
          const yr = parseInt(dateParts[0]);
          const mo = parseInt(dateParts[1]) - 1;
          const pair = asset.replace(/\.x$/i, '');
          trades.push({ id: uid(), year: yr, month: mo, date: dateFormatted, pair, dir: type.toUpperCase(), lots, result, pnl: Math.abs(pnl), hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0 });
        }
        if (trades.length === 0) { alert('Nenhum trade encontrado.'); return; }
        // Add to state via context — we need to use the raw setState for bulk import
        const { setState } = useGPFXCtx;
        alert(`✅ ${trades.length} trades importados!`);
      } catch (err: any) {
        alert('Erro ao importar: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };
  // We need a ref to the context for the import function
  const useGPFXCtx = useGPFX();

  const handleMT5ConfirmAndOpen = () => {
    if (mt5AccIdx === 'new') {
      const name = prompt('Nome da nova conta:');
      if (!name) return;
      addAccount();
      // The newly created account is auto-selected
    } else {
      switchAccount(parseInt(mt5AccIdx));
    }
    setMt5Modal(false);
    fileInputRef.current?.click();
  };

  // Actual MT5 import via context
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        let text = '';
        if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
          text = new TextDecoder('utf-16le').decode(buffer);
        } else {
          text = new TextDecoder('utf-8').decode(buffer);
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const allText = doc.body ? doc.body.innerText : text;
        const posStart = allText.indexOf('Posições');
        if (posStart === -1) { alert('Seção "Posições" não encontrada.'); return; }
        const posEnd = allText.indexOf('Ordens', posStart);
        const posText = allText.substring(posStart, posEnd > -1 ? posEnd : undefined);
        const datePattern = /(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+(\d+)\s+([\w.]+)\s+(buy|sell)\s+(?:[\w_]+\s+)?(\d+\.?\d*)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+([\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)/gi;
        const newTrades: Trade[] = [];
        let match;
        while ((match = datePattern.exec(posText)) !== null) {
          const openDate = match[1];
          const asset = match[3];
          const type = match[4];
          const lots = parseFloat(match[5]);
          const commission = parseFloat(match[11]) || 0;
          const swap = parseFloat(match[12]) || 0;
          const profit = parseFloat(match[13]) || 0;
          const pnl = parseFloat((profit + commission + swap).toFixed(2));
          const result = pnl >= 0 ? 'WIN' : 'LOSS';
          const dateParts = openDate.split(' ')[0].split('.');
          const dateFormatted = dateParts[0] + '-' + dateParts[1] + '-' + dateParts[2];
          const yr = parseInt(dateParts[0]);
          const mo = parseInt(dateParts[1]) - 1;
          const pair = asset.replace(/\.x$/i, '');
          newTrades.push({ id: uid(), year: yr, month: mo, date: dateFormatted, pair, dir: type.toUpperCase(), lots, result, pnl: Math.abs(pnl), hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0 });
        }
        if (newTrades.length === 0) { alert('Nenhum trade encontrado.'); return; }

        useGPFXCtx.setState(prev => {
          const accounts = [...prev.accounts];
          const accCopy = { ...accounts[prev.activeAccount], trades: [...accounts[prev.activeAccount].trades] };
          let added = 0;
          newTrades.forEach(t => {
            const isDup = accCopy.trades.some(ex => ex.date === t.date && ex.pair === t.pair && Math.abs(ex.pnl) === Math.abs(t.pnl));
            if (!isDup) { accCopy.trades.push(t); added++; }
          });
          accounts[prev.activeAccount] = accCopy;
          const next = { ...prev, accounts };
          if (newTrades.length > 0) {
            const sorted = newTrades.slice().sort((a, b) => a.date > b.date ? 1 : -1);
            next.activeYear = sorted[0].year;
            next.activeMonth = sorted[0].month;
          }
          return next;
        });
        useGPFXCtx.save();
        alert(`✅ Trades importados com sucesso!`);
      } catch (err: any) {
        alert('Erro ao importar: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const monthPct = balance > 0 ? ((monthPnl / balance) * 100).toFixed(2) : '0.00';

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1400px] mx-auto p-6">
      {/* Account Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {state.accounts.map((a, i) => (
          <button
            key={i}
            className={`acc-tab-btn ${i === state.activeAccount ? 'active' : ''}`}
            onClick={() => switchAccount(i)}
          >
            {a.name}
            <span className="ml-1 text-[11px] cursor-pointer opacity-50 hover:opacity-100" onClick={e => { e.stopPropagation(); setRenameModal({ open: true, idx: i, name: a.name }); }}>✎</span>
            {state.accounts.length > 1 && (
              <span className="ml-0.5 text-[11px] cursor-pointer hover:opacity-100" style={{ color: '#ff4d4d', opacity: 0.5 }}
                onClick={e => { e.stopPropagation(); if (a.trades.length > 0 && !confirm(`A conta "${a.name}" tem ${a.trades.length} trades. Excluir?`)) return; deleteAccount(i); }}>✕</span>
            )}
          </button>
        ))}
        <button className="px-3 py-2 border-2 border-dashed rounded-md text-base font-bold transition-all" style={{ borderColor: '#484f58', color: '#6e7681' }}
          onClick={addAccount}>＋</button>

        <div className="ml-auto flex items-center gap-2">
          <button className="btn-gpfx btn-gpfx-ghost text-xs" onClick={() => setExportModal(true)}>
            <Download size={14} /> Exportar CSV
          </button>
          <button className="btn-gpfx btn-gpfx-primary text-xs" onClick={() => { setMt5AccIdx(String(state.activeAccount)); setMt5Modal(true); }}>
            <Upload size={14} /> Importar MT5
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <div className="gpfx-card">
        <div className="gpfx-card-header">
          <span className="gpfx-card-title">{acc.name} — Configurações</span>
          <button className="btn-gpfx btn-gpfx-danger text-xs" onClick={() => setResetModal(true)}>🗑 Resetar Conta</button>
        </div>
        <div className="gpfx-card-body">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>Saldo Inicial (USD)</label>
              <input type="number" className="gpfx-input" style={{ width: 140 }} value={acc.balance} onChange={e => updateBalance(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>Anotações da Conta</label>
              <textarea className="gpfx-input w-full mt-1" style={{ minHeight: 60, resize: 'vertical' }} placeholder="Regras, estratégias..." value={acc.notes} onChange={e => updateNotes(e.target.value)} />
            </div>
          </div>
        </div>
      </div>


      {/* Annual Grid */}
      <div className="gpfx-card">
        <div className="gpfx-card-header">
          <span className="gpfx-card-title">Resumo Anual</span>
          <div className="relative">
            <button className="btn-gpfx btn-gpfx-primary text-xs font-extrabold" onClick={() => setYearPickerOpen(!yearPickerOpen)}>
              📅 {year} <span className="text-[10px] ml-1">▼</span>
            </button>
            {yearPickerOpen && (
              <div className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50" style={{ background: '#161b22', border: '1px solid #30363d', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', minWidth: 200, maxHeight: 400, overflowY: 'auto' }}>
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6e7681', borderBottom: '1px solid #21262d' }}>Selecionar Ano</div>
                {YEARS.map(y => {
                  const yTrades = acc.trades.filter(t => t.year === y);
                  const yPnl = sumPnl(yTrades);
                  return (
                    <div key={y}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold transition-colors ${y === year ? 'font-extrabold' : ''}`}
                      style={{ color: y === year ? '#00d395' : '#c9d1d9', background: y === year ? 'rgba(0,211,149,0.15)' : 'transparent', borderBottom: '1px solid #161b22' }}
                      onClick={() => { switchYear(y); setYearPickerOpen(false); }}
                    >
                      <span>{y}</span>
                      <span className="text-[11px] font-bold" style={{ color: yPnl > 0 ? '#00d395' : yPnl < 0 ? '#ff4d4d' : '#484f58' }}>
                        {yPnl !== 0 ? (yPnl > 0 ? '+' : '') + '$' + fmtNum(yPnl) : '–'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="gpfx-card-body">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {MONTHS.map((m, mi) => {
              const d = monthlyData[mi];
              const w = (acc.withdrawals || {})[year + '-' + mi] || 0;
              return (
                <div
                  key={mi}
                  className={`month-card-item ${mi === month ? 'active' : ''}`}
                  onClick={() => switchMonth(mi)}
                >
                  <div className="text-[10px] font-semibold uppercase" style={{ color: '#8b949e' }}>{m}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: d.pnl > 0 ? '#00d395' : d.pnl < 0 ? '#ff4d4d' : '#6e7681' }}>
                    {d.pnl !== 0 ? (d.pnl > 0 ? '+' : '') + '$' + fmtNum(d.pnl) : '–'}
                  </div>
                  <div className="text-[10px]" style={{ color: w > 0 ? '#ff4d4d' : '#6e7681' }}>
                    {w > 0 ? `-$${fmtNum(w)}` : `${d.count} trade${d.count !== 1 ? 's' : ''}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trades Section */}
      <div className="gpfx-card">
        <div className="gpfx-card-header flex-wrap">
          <span className="gpfx-card-title">Trades — {MONTHS[month]} {year}</span>
          <div className="flex gap-2 items-center flex-wrap">
            <select className="gpfx-select text-xs" value={filterPair} onChange={e => setFilterPair(e.target.value)}>
              <option value="">Todos os pares</option>
              {PAIRS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="gpfx-select text-xs" value={filterDir} onChange={e => setFilterDir(e.target.value)}>
              <option value="">BUY + SELL</option>
              <option>BUY</option><option>SELL</option>
            </select>
            <select className="gpfx-select text-xs" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
              <option value="">WIN + LOSS</option>
              <option>WIN</option><option>LOSS</option>
            </select>
            <button className="btn-gpfx btn-gpfx-primary text-xs" onClick={() => addNewDay()}>+ Novo Dia</button>
          </div>
        </div>

        {/* Month Summary */}
        <div className="flex items-center gap-5 px-5 py-3 flex-wrap" style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
          <MsItem label="P&L Mês" value={(monthPnl >= 0 ? '+' : '') + '$' + fmtNum(monthPnl)} cls={monthPnl >= 0 ? 'text-gpfx-green' : 'text-gpfx-red'} extra={monthPnl !== 0 ? `(${monthPnl > 0 ? '+' : ''}${monthPct}%)` : ''} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase" style={{ color: '#6e7681' }}>Saque do Mês</span>
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: '#6e7681' }}>$</span>
              <input type="number" step="0.01" min="0" className="gpfx-input text-xs font-bold" style={{ width: 90, color: '#ff4d4d' }}
                value={monthWithdrawal || ''} placeholder="0.00"
                onChange={e => updateWithdrawal(year, month, parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <MsItem label="Líquido Mês" value={(monthNet >= 0 ? '+' : '') + '$' + fmtNum(monthNet)} cls={monthNet >= 0 ? 'text-gpfx-green' : 'text-gpfx-red'} />
          <MsItem label="Trades" value={String(monthTotal)} />
          {/* Meta */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase" style={{ color: '#6e7681' }}>Meta Mensal</span>
            <input type="number" step="100" className="gpfx-input text-xs font-bold" style={{ width: 110, color: '#00d395' }}
              placeholder="Definir meta $" value={acc.meta || ''} onChange={e => updateMeta(parseFloat(e.target.value) || 0)} />
            {(acc.meta || 0) > 0 && (() => {
              const pct = Math.min(100, Math.max(0, (monthPnl / (acc.meta || 1)) * 100));
              const barColor = pct >= 100 ? '#00d395' : pct >= 50 ? '#f59e0b' : '#ff4d4d';
              return (
                <div className="mt-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#30363d' }}>
                    <div style={{ width: pct + '%', background: barColor }} className="h-full rounded-full transition-all" />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                </div>
              );
            })()}
          </div>
          <MsItem label="Wins" value={String(monthWins)} cls="text-gpfx-green" />
          <MsItem label="Losses" value={String(monthLosses)} cls="text-gpfx-red" />
          <MsItem label="Win Rate" value={winRate + '%'} />
          <MsItem label="Maior Win" value={'$' + fmtNum(maxWin)} cls="text-gpfx-green" />
          <MsItem label="Maior Loss" value={'$' + fmtNum(maxLoss)} cls="text-gpfx-red" />
        </div>

        {/* Trades List */}
        <div className="p-4 flex flex-col gap-3">
          {dateOrder.length === 0 && (
            <div className="text-center py-10" style={{ color: '#6e7681' }}>Nenhum trade neste mês. Clique em "<strong>+ Novo Dia</strong>" para começar.</div>
          )}
          {dateOrder.map(date => {
            const dayTrades = groups[date];
            const dayPnl = dayTrades.reduce((s, t) => s + signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0), 0);
            const dayPct = balance > 0 ? ((dayPnl / balance) * 100).toFixed(2) : '0.00';
            const fmtDate = date !== 'Sem data'
              ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
              : 'Sem data';

            return (
              <div key={date} className="mb-2">
                {/* Day Header */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-t-lg flex-wrap gap-2"
                  style={{ background: '#e6edf3', border: '2px solid #c9d1d9', borderBottom: 'none' }}>
                  <div className="flex items-center gap-2.5">
                    <input type="date" value={date !== 'Sem data' ? date : ''} className="gpfx-input text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.4)', color: '#0d1117' }}
                      onChange={e => {
                        const newDate = e.target.value;
                        if (!newDate || date === newDate) return;
                        const d = new Date(newDate + 'T12:00:00');
                        // Rename all trades on this date
                        useGPFXCtx.setState(prev => {
                          const accounts = [...prev.accounts];
                          const accCopy = { ...accounts[prev.activeAccount], trades: accounts[prev.activeAccount].trades.map(t => ({ ...t })) };
                          accCopy.trades.forEach(t => {
                            if (t.date === date) { t.date = newDate; t.year = d.getFullYear(); t.month = d.getMonth(); }
                          });
                          accounts[prev.activeAccount] = accCopy;
                          return { ...prev, accounts, activeYear: d.getFullYear(), activeMonth: d.getMonth() };
                        });
                        useGPFXCtx.save();
                      }} />
                    <span className="text-sm font-bold capitalize" style={{ color: '#161b22' }}>{fmtDate}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: '#6e7681', background: '#c9d1d9' }}>{dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn-gpfx text-xs" style={{ background: 'rgba(255,255,255,0.15)', color: '#161b22', border: '1px solid rgba(255,255,255,0.2)' }}
                      onClick={() => addTrade(date)}>+ Trade neste dia</button>
                    <div className="text-right">
                      <div className="text-sm font-extrabold" style={{ color: dayPnl > 0 ? '#4ade80' : dayPnl < 0 ? '#f87171' : '#9ca3af' }}>
                        {dayPnl !== 0 ? (dayPnl > 0 ? '+' : '') + '$' + fmtNum(dayPnl) : '–'}
                      </div>
                      {dayPnl !== 0 && <div className="text-[11px] font-bold" style={{ color: dayPnl > 0 ? '#4ade80' : '#f87171', opacity: 0.85 }}>{dayPnl > 0 ? '+' : ''}{dayPct}% da conta</div>}
                    </div>
                  </div>
                </div>
                {/* Day Trades */}
                <div className="rounded-b-lg overflow-hidden" style={{ border: '2px solid #c9d1d9', borderTop: 'none' }}>
                  {dayTrades.map((t, ti) => {
                    const totalPnlTrade = signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
                    const tradePct = balance > 0 ? ((totalPnlTrade / balance) * 100).toFixed(2) : '0.00';
                    return (
                      <div key={t.id} className="trade-card-wrapper" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: ti > 0 ? '2px solid #30363d' : 'none', borderBottom: 'none', boxShadow: 'none' }}>
                        {/* Trade Header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap" style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#6e7681', background: '#30363d' }}>#{ti + 1}</span>
                          <select className="text-sm font-bold gpfx-select" value={t.pair}
                            onChange={e => updateTrade(t.id, 'pair', e.target.value)}>
                            {PAIRS.map(p => <option key={p}>{p}</option>)}
                          </select>
                          <select className={`text-[11px] font-bold px-2 py-0.5 rounded gpfx-select ${t.dir === 'BUY' ? 'dir-buy' : 'dir-sell'}`}
                            value={t.dir} onChange={e => updateTrade(t.id, 'dir', e.target.value)}>
                            {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
                          </select>
                          <div className="ml-auto flex flex-col items-end gap-0.5">
                            <span className="text-base font-extrabold" style={{ color: totalPnlTrade > 0 ? '#00d395' : totalPnlTrade < 0 ? '#ff4d4d' : '#6e7681' }}>
                              {totalPnlTrade !== 0 ? (totalPnlTrade > 0 ? '+' : '') + '$' + fmtNum(totalPnlTrade) : '–'} total
                            </span>
                            {totalPnlTrade !== 0 && <span className="text-[11px] font-semibold" style={{ opacity: 0.75, color: totalPnlTrade > 0 ? '#00d395' : '#ff4d4d' }}>{totalPnlTrade > 0 ? '+' : ''}{tradePct}% da conta</span>}
                          </div>
                          <button className="btn-gpfx btn-gpfx-danger text-xs ml-2" onClick={() => setDeleteModal({ open: true, id: t.id })}>✕ Excluir</button>
                        </div>
                        {/* Trade Body */}
                        <div className="grid grid-cols-1 md:grid-cols-2">
                          {/* Main Entry */}
                          <div className="p-3.5">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider mb-3 pb-1.5 flex items-center gap-1.5" style={{ color: '#00d395', borderBottom: '2px solid #00d395' }}>
                              📈 Entrada Principal
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <TradeField label="Resultado">
                                <select className={`gpfx-select w-full text-xs ${t.result === 'WIN' ? 'result-win' : 'result-loss'}`}
                                  value={t.result} onChange={e => updateTrade(t.id, 'result', e.target.value)}>
                                  {RESULTS.map(r => <option key={r}>{r}</option>)}
                                </select>
                              </TradeField>
                              <TradeField label="P&L (USD)">
                                <input type="number" step="0.01" className="gpfx-input w-full text-xs" placeholder="Ex: +600"
                                  style={{ color: (t.pnl || 0) > 0 ? '#00d395' : (t.pnl || 0) < 0 ? '#ff4d4d' : undefined, fontWeight: t.pnl ? 700 : 400 }}
                                  value={t.pnl || ''} onChange={e => updateTrade(t.id, 'pnl', parseFloat(e.target.value) || 0)} />
                              </TradeField>
                            </div>
                          </div>
                          {/* VM Section */}
                          <div className="p-3.5" style={{ borderLeft: '1px solid #21262d', background: t.hasVM ? 'rgba(245,158,11,0.03)' : undefined }}>
                            <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-3 pb-1.5 flex items-center gap-1.5 justify-between`}
                              style={{ color: t.hasVM ? '#f59e0b' : '#6e7681', borderBottom: `2px solid ${t.hasVM ? '#f59e0b' : '#30363d'}` }}>
                              <span>🔄 Virada de Mão</span>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={t.hasVM} onChange={e => updateTrade(t.id, 'hasVM', e.target.checked)}
                                  style={{ accentColor: '#f59e0b' }} />
                                <span className="text-[11px] font-semibold" style={{ color: '#8b949e' }}>Ativar</span>
                              </label>
                            </div>
                            {t.hasVM ? (
                              <div className="grid grid-cols-2 gap-2.5">
                                <TradeField label="Resultado">
                                  <select className={`gpfx-select w-full text-xs ${t.vmResult === 'WIN' ? 'result-win' : 'result-loss'}`}
                                    value={t.vmResult} onChange={e => updateTrade(t.id, 'vmResult', e.target.value)}>
                                    {RESULTS.map(r => <option key={r}>{r}</option>)}
                                  </select>
                                </TradeField>
                                <TradeField label="P&L (USD)">
                                  <input type="number" step="0.01" className="gpfx-input w-full text-xs" placeholder="Ex: +800"
                                    style={{ color: (t.vmPnl || 0) > 0 ? '#00d395' : (t.vmPnl || 0) < 0 ? '#ff4d4d' : undefined, fontWeight: t.vmPnl ? 700 : 400 }}
                                    value={t.vmPnl || ''} onChange={e => updateTrade(t.id, 'vmPnl', parseFloat(e.target.value) || 0)} />
                                </TradeField>
                              </div>
                            ) : (
                              <div className="text-xs italic py-2" style={{ color: '#6e7681' }}>Ative se a 1ª entrada deu Loss e você virou a mão.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} accept=".html,.htm" style={{ display: 'none' }} onChange={handleFileImport} />

      {/* Modals */}
      <Modal open={renameModal.open} onClose={() => setRenameModal({ ...renameModal, open: false })} title="Renomear Conta"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setRenameModal({ ...renameModal, open: false })}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-primary" onClick={() => { if (renameModal.name.trim()) { renameAccount(renameModal.idx, renameModal.name.trim()); } setRenameModal({ ...renameModal, open: false }); }}>Salvar</button>
        </>}>
        <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>Nome da Conta</label>
        <input className="gpfx-input w-full" value={renameModal.name} onChange={e => setRenameModal({ ...renameModal, name: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') { if (renameModal.name.trim()) renameAccount(renameModal.idx, renameModal.name.trim()); setRenameModal({ ...renameModal, open: false }); } }}
          autoFocus />
      </Modal>

      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Resetar Conta"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setResetModal(false)}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-danger" onClick={() => { resetAccount(); setResetModal(false); }}>🗑 Resetar tudo</button>
        </>}>
        <p className="text-sm" style={{ color: '#8b949e' }}>Tem certeza que deseja <strong>apagar todos os trades</strong> desta conta? O saldo inicial será mantido.</p>
      </Modal>

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: '' })} title="Excluir Trade"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setDeleteModal({ open: false, id: '' })}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-danger" onClick={() => { deleteTrade(deleteModal.id); setDeleteModal({ open: false, id: '' }); }}>Excluir</button>
        </>}>
        <p className="text-sm" style={{ color: '#8b949e' }}>Tem certeza que deseja excluir este trade?</p>
      </Modal>

      <Modal open={exportModal} onClose={() => setExportModal(false)} title="⬇ Exportar para CSV"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setExportModal(false)}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-primary" onClick={handleExport}>⬇ Baixar CSV</button>
        </>}>
        <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>O que exportar?</label>
        <select className="gpfx-select w-full" value={exportAccMode} onChange={e => setExportAccMode(e.target.value)}>
          <option value="active">Apenas: {acc.name}</option>
          <option value="all">Todas as contas ({state.accounts.length})</option>
        </select>
        <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>Período</label>
        <select className="gpfx-select w-full" value={exportPeriod} onChange={e => setExportPeriod(e.target.value)}>
          <option value="all">Todos os trades</option>
          <option value="year">Ano atual</option>
          <option value="month">Mês atual</option>
        </select>
        <div className="p-3 rounded-lg text-xs" style={{ background: '#21262d', color: '#8b949e', lineHeight: 1.6 }}>
          O arquivo CSV pode ser aberto no <strong>Excel</strong> ou <strong>Google Sheets</strong>.
        </div>
      </Modal>

      <Modal open={mt5Modal} onClose={() => setMt5Modal(false)} title="📥 Importar Relatório MT5"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setMt5Modal(false)}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-primary" onClick={handleMT5ConfirmAndOpen}>📂 Selecionar arquivo</button>
        </>}>
        <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>Conta de destino</label>
        <select className="gpfx-select w-full" value={mt5AccIdx} onChange={e => setMt5AccIdx(e.target.value)}>
          {state.accounts.map((a, i) => <option key={i} value={i}>{a.name} ({a.trades.length} trades)</option>)}
          <option value="new">➕ Nova conta...</option>
        </select>
        <div className="p-3 rounded-lg text-xs" style={{ background: '#21262d', color: '#8b949e', lineHeight: 1.6 }}>
          <strong style={{ color: '#c9d1d9' }}>Como exportar do MT5:</strong><br />
          1. Abra o MT5 → aba Histórico<br />
          2. Botão direito → Salvar como relatório detalhado<br />
          3. Salve como <strong>.html</strong><br />
          4. Selecione o arquivo abaixo
        </div>
      </Modal>
    </div>
  );
}

function StatBox({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className={`stat-value text-base ${cls || ''}`}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: '#6e7681' }}>{sub}</div>}
    </div>
  );
}

function MsItem({ label, value, cls, extra }: { label: string; value: string; cls?: string; extra?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase" style={{ color: '#6e7681' }}>{label}</span>
      <span className={`text-sm font-bold ${cls || ''}`} style={!cls ? { color: '#e6edf3' } : undefined}>
        {value} {extra && <span className="text-[11px] font-semibold opacity-80">{extra}</span>}
      </span>
    </div>
  );
}

function TradeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b949e' }}>{label}</label>
      {children}
    </div>
  );
}
