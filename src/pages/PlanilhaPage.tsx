import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useGPFX, apiTradeToLocal } from '@/contexts/GPFXContext';
import tradeService from '@/services/tradeService';
import dashboardService from '@/services/dashboardService';
import withdrawalService, { Withdrawal } from '@/services/withdrawalService';
import {
  MONTHS, YEARS, PAIRS, DIRECTIONS, RESULTS,
  sumPnl, fmtNum, signedPnl, uid, Trade,
} from '@/lib/gpfx-utils';
import { Download, Upload, Pencil, X, RefreshCw, AlertTriangle, Camera, Plug } from 'lucide-react';
import { ConnectBrokerModal } from '@/components/ConnectBrokerModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbox } from '@/components/Lightbox';
import { ScreenshotModal } from '@/components/ScreenshotModal';
import reportService, { AnnualMonthSummary } from '@/services/reportService';

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
    updateInitialBalance, updateNotes, updateMeta, addTrade, addNewDay, updateTrade,
    deleteTrade, resetAccount, switchYear, switchMonth,
  } = useGPFX();

  const [renameModal, setRenameModal] = useState<{ open: boolean; idx: number; name: string }>({ open: false, idx: 0, name: '' });
  const [resetModal, setResetModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [exportModal, setExportModal] = useState(false);
  const [mt5Modal, setMt5Modal] = useState(false);
  const [brokerModal, setBrokerModal] = useState(false);
  const [exportAccMode, setExportAccMode] = useState('active');
  const [exportPeriod, setExportPeriod] = useState('all');
  const [mt5AccId, setMt5AccId] = useState<string>('');
  const mt5TargetRef = useRef<string | null>(null);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [filterPair, setFilterPair] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [annualSummaries, setAnnualSummaries] = useState<Record<number, AnnualMonthSummary[]>>({});

  // Edit modal state
  const [editModal, setEditModal] = useState<{ open: boolean; trade: Trade | null }>({ open: false, trade: null });
  const [editForm, setEditForm] = useState<Partial<Trade>>({});

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  // Screenshot state
  const [screenshotModal, setScreenshotModal] = useState<{ open: boolean; trade: Trade | null }>({ open: false, trade: null });
  const [lightbox, setLightbox] = useState<{ open: boolean; images: { data: string; caption: string; tradePair?: string }[]; index: number }>({ open: false, images: [], index: 0 });

  // API data state
  const [paginatedTrades, setPaginatedTrades] = useState<Trade[]>([]);
  const [annualGrid, setAnnualGrid] = useState<Record<number, { pnl: number, count: number }>>({});
  const [summaryData, setSummaryData] = useState<any>(null); // from getSummary for totalPnl etc
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalInput, setWithdrawalInput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const year = state.activeYear;
  const month = state.activeMonth;
  const acc = activeAcc;

  const loadData = useCallback(async () => {
    const apiId = (acc as any)._apiId;
    if (!apiId) return;

    setLoading(true);
    try {
       // 1. Fetch trades for current month (limit to 1000 for visual spreadsheet)
       const resTrades = await tradeService.list(apiId, 0, 1000, year, month + 1);
       const trades = (resTrades.items || resTrades).map(apiTradeToLocal);
       setPaginatedTrades(trades);

       // 2. Fetch annual summary month-by-month from reports API
       const annual = await reportService.getAnnualSummary({ year, account_id: apiId });
       const gridMap: Record<number, { pnl: number, count: number }> = {};
       (annual.months || []).forEach(item => {
          gridMap[item.month - 1] = { pnl: item.pnl, count: item.trades };
       });
       setAnnualGrid(gridMap);
       setAnnualSummaries(prev => ({ ...prev, [year]: annual.months || [] }));

       // 3. Account summary over full history (for balance based on initial balance)
       const summary = await dashboardService.getSummary({ account_ids: [apiId] });
       setSummaryData(summary);

       // 4. Withdrawals for all history (for consistent balance calculation)
       const wds = await withdrawalService.list(apiId);
       setWithdrawals(wds);
    } catch(err) {
       console.error("Failed to load spreadsheet data", err);
    } finally {
       setLoading(false);
    }
  }, [acc, year, month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
     const handler = (e: any) => {
        if (e.detail?.account_id === (acc as any)._apiId) {
           void loadData();
        }
     };
     window.addEventListener('gpfx:trade_updated', handler);
     return () => window.removeEventListener('gpfx:trade_updated', handler);
  }, [loadData, acc]);

  let monthTrades = paginatedTrades; // Paginated trades already filtered by year/month from backend

  // Apply filters visually
  if (filterPair) monthTrades = monthTrades.filter(t => t.pair === filterPair);
  if (filterDir) monthTrades = monthTrades.filter(t => t.dir === filterDir);
  if (filterResult) monthTrades = monthTrades.filter(t => t.result === filterResult);

  const withdrawalsByMonth = useMemo(() => {
    const map: Record<number, Withdrawal[]> = {};
    withdrawals.forEach(w => {
      const d = new Date(w.date);
      if (Number.isNaN(d.getTime())) return;
      const m = d.getMonth();
      if (!map[m]) map[m] = [];
      map[m].push(w);
    });
    return map;
  }, [withdrawals]);

  const monthWithdrawals = withdrawalsByMonth[month] || [];
  const monthWithdrawal = monthWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);

  useEffect(() => {
    setWithdrawalInput(monthWithdrawal ? String(monthWithdrawal) : '');
  }, [monthWithdrawal, month]);

  const monthPnl = sumPnl(paginatedTrades);
  const totalPnl = summaryData?.total_pnl || 0; // Use backend aggregated total PnL
  const baseBalance = (acc.initialBalance ?? acc.balance) || 0;
  const allWithdrawals = withdrawals.reduce((s, w) => s + (w.amount || 0), 0);
  const balance = baseBalance + totalPnl - allWithdrawals;
  
  const monthWins = paginatedTrades.filter(t => t.result === 'WIN').length;
  const monthLosses = paginatedTrades.filter(t => t.result === 'LOSS').length;
  const monthTotal = paginatedTrades.length;
  const winRate = monthTotal > 0 ? Math.round((monthWins / monthTotal) * 100) : 0;
  const monthNet = monthPnl - monthWithdrawal;

  // Max win/loss (from current month paginated list)
  const allSignedPnls = paginatedTrades.flatMap(t => {
    const vals = [signedPnl(t.pnl, t.result)];
    if (t.hasVM) vals.push(signedPnl(t.vmPnl, t.vmResult));
    return vals;
  });
  const maxWin = allSignedPnls.length > 0 ? Math.max(0, ...allSignedPnls) : 0;
  const maxLoss = allSignedPnls.length > 0 ? Math.abs(Math.min(0, ...allSignedPnls)) : 0;

  // Group trades by date
  const groups: Record<string, Trade[]> = {};
  const dateOrder: string[] = [];
  monthTrades.forEach(t => {
    const d = t.date || 'Sem data';
    if (!groups[d]) { groups[d] = []; dateOrder.push(d); }
    groups[d].push(t);
  });
  dateOrder.sort();

  // All visible trade IDs
  const allVisibleIds = useMemo(() => monthTrades.map(t => t.id), [monthTrades]);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
  const someSelected = allVisibleIds.some(id => selectedIds.has(id));
  const selectedCount = allVisibleIds.filter(id => selectedIds.has(id)).length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectDay = (dayTradeIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allDaySelected = dayTradeIds.every(id => next.has(id));
      dayTradeIds.forEach(id => { if (allDaySelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allSelected) return new Set();
      return new Set(allVisibleIds);
    });
  };

  const handleBulkDelete = () => {
    const idsToDelete = allVisibleIds.filter(id => selectedIds.has(id));
    idsToDelete.forEach(id => deleteTrade(id));
    setSelectedIds(new Set());
    setBulkDeleteModal(false);
  };

  const saveMonthWithdrawal = useCallback(async () => {
    const apiId = (acc as any)._apiId;
    if (!apiId) return;
    const raw = parseFloat(withdrawalInput);
    const value = Number.isFinite(raw) ? raw : 0;

    try {
      setLoading(true);
      if (value <= 0) {
        await Promise.all(monthWithdrawals.map(w => withdrawalService.remove(w.id)));
      } else {
        if (monthWithdrawals.length === 1 && Math.abs(monthWithdrawals[0].amount - value) < 0.01) {
          return;
        }
        await Promise.all(monthWithdrawals.map(w => withdrawalService.remove(w.id)));
        const date = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        await withdrawalService.create({
          account_id: apiId,
          amount: value,
          date,
        });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to save withdrawal', err);
    } finally {
      setLoading(false);
    }
  }, [acc, loadData, month, monthWithdrawals, withdrawalInput, year]);

  // Screenshot helpers
  const openScreenshotModal = (trade: Trade) => {
    setScreenshotModal({ open: true, trade });
  };

  const handleScreenshotSave = (tradeId: string, screenshot: { data: string; caption: string } | undefined) => {
    updateTrade(tradeId, 'screenshot', screenshot);
  };

  // Edit modal helpers
  const openEditModal = (trade: Trade) => {
    setEditForm({ ...trade });
    setEditModal({ open: true, trade });
  };

  const saveEdit = () => {
    if (!editModal.trade || !editForm) return;
    const id = editModal.trade.id;
    const fields: (keyof Trade)[] = ['pair', 'dir', 'result', 'pnl', 'hasVM', 'vmResult', 'vmPnl', 'lots', 'vmLots'];
    fields.forEach(f => {
      if (editForm[f] !== undefined) {
        updateTrade(id, f, editForm[f]);
      }
    });
    setEditModal({ open: false, trade: null });
  };

  const monthPct = balance > 0 ? ((monthPnl / balance) * 100).toFixed(2) : '0.00';

  // Export CSV
  const handleExport = async () => {
    const accounts = exportAccMode === 'all' ? state.accounts : [acc];
    const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const now = new Date();
    const exportDate = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const periodLabel = exportPeriod === 'month' ? `${MONTHS_FULL[month]} ${year}` : exportPeriod === 'year' ? String(year) : 'Todos os períodos';
    const accLabel = exportAccMode === 'all' ? 'Todas as contas' : acc.name;

    const lines: string[] = [];
    lines.push('Gustavo Pedrosa FX - Relatório de Trades');
    lines.push(`Conta: ${accLabel}`);
    lines.push(`Período: ${periodLabel}`);
    lines.push(`Exportado em: ${exportDate}`);
    lines.push('');

    // Header
    lines.push('#;Data;Par;Direção;Lotes;Resultado;P&L (USD);Virada de Mão;P&L VM (USD);P&L Total (USD);Plataforma;Observações');

    // Collect all trades from API
    let allTradesData: { acc: string; trade: Trade }[] = [];
    setLoading(true);
    try {
      for (const a of accounts) {
        const apiId = (a as any)._apiId;
        if (!apiId) continue;
        
        let targetYear: number | undefined = undefined;
        let targetMonth: number | undefined = undefined;
        
        if (exportPeriod === 'year') { targetYear = year; }
        else if (exportPeriod === 'month') { targetYear = year; targetMonth = month + 1; }

        const resTrades = await tradeService.list(apiId, 0, 10000, targetYear, targetMonth);
        const trades = (resTrades.items || resTrades).map(apiTradeToLocal);
        trades.sort((x: any, y: any) => (x.date || '').localeCompare(y.date || ''));
        trades.forEach((t: any) => allTradesData.push({ acc: a.name, trade: t }));
      }
    } catch(err) {
      console.error("Export falhou", err);
      alert("Falha ao exportar dados.");
      setLoading(false);
      return;
    }
    setLoading(false);

    let totalPnlSum = 0;
    let wins = 0;
    let losses = 0;
    let maxWinTrade = 0;
    let maxLossTrade = 0;

    allTradesData.forEach((item, idx) => {
      const t = item.trade;
      const pnlMain = signedPnl(t.pnl, t.result);
      const pnlVM = t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0;
      const pnlTotal = pnlMain + pnlVM;
      totalPnlSum += pnlTotal;
      if (t.result === 'WIN') wins++; else losses++;
      if (pnlTotal > maxWinTrade) maxWinTrade = pnlTotal;
      if (pnlTotal < maxLossTrade) maxLossTrade = pnlTotal;

      // Format date DD/MM/YYYY
      let dateFormatted = '';
      if (t.date) {
        const parts = t.date.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }

      lines.push([
        idx + 1,
        dateFormatted,
        t.pair || '',
        t.dir || '',
        t.lots != null ? String(t.lots) : '',
        t.result || '',
        pnlMain.toFixed(2),
        t.hasVM ? 'Sim' : 'Não',
        pnlVM !== 0 ? pnlVM.toFixed(2) : '',
        pnlTotal.toFixed(2),
        '',
        '',
      ].join(';'));
    });

    // Summary
    const totalTrades = allTradesData.length;
    const winRateData = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
    lines.push('');
    lines.push('RESUMO DO PERÍODO');
    lines.push(`Total de Trades:;${totalTrades}`);
    lines.push(`Wins:;${wins};Losses:;${losses}`);
    lines.push(`Win Rate:;${winRateData}%`);
    lines.push(`P&L Total:;${totalPnlSum >= 0 ? '' : '-'}$${Math.abs(totalPnlSum).toFixed(2)}`);
    lines.push(`Maior Win:;$${maxWinTrade.toFixed(2)}`);
    lines.push(`Maior Loss:;-$${Math.abs(maxLossTrade).toFixed(2)}`);

    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob);

    // File name: Gustavo_Pedrosa_FX_[Conta]_[Mes-Ano].csv
    const safeAcc = accLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const safePeriod = exportPeriod === 'month' ? `${MONTHS_FULL[month]}_${year}` : exportPeriod === 'year' ? String(year) : 'Completo';
    a2.download = `Gustavo_Pedrosa_FX_${safeAcc}_${safePeriod}.csv`;
    a2.click();
    setExportModal(false);
  };

  const handleMT5ConfirmAndOpen = async () => {
    let targetId = mt5AccId;
    if (mt5AccId === 'new') {
      const name = prompt('Nome da nova conta:');
      if (!name) return;
      const created = await addAccount(name.trim());
      targetId = created?.id || '';
    }
    if (!targetId) {
      alert('Selecione uma conta valida.');
      return;
    }
    mt5TargetRef.current = targetId;
    const idx = state.accounts.findIndex(a => (a as any)._apiId === targetId);
    if (idx >= 0) switchAccount(idx);
    setMt5Modal(false);
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
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
        const normalizedText = allText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const posStart = normalizedText.indexOf('Posicoes');
        if (posStart === -1) { alert('Secao \"Posicoes\" nao encontrada.'); return; }
        const posEnd = normalizedText.indexOf('Ordens', posStart);
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

        const targetApiId = mt5TargetRef.current || (acc as any)._apiId;
        if (!targetApiId) { alert('Conta de destino invalida.'); return; }

        setLoading(true);
        const groupMap = new Map<string, Trade[]>();
        newTrades.forEach(t => {
          const key = `${t.year}-${t.month}`;
          if (!groupMap.has(key)) groupMap.set(key, []);
          groupMap.get(key)!.push(t);
        });

        const existingKeys = new Set<string>();
        for (const [key] of groupMap) {
          const [yrStr, moStr] = key.split('-');
          const yr = parseInt(yrStr);
          const mo = parseInt(moStr);
          const res = await tradeService.list(targetApiId, 0, 10000, yr, mo + 1);
          const existing = (res.items || res).map(apiTradeToLocal);
          existing.forEach(ex => {
            const k = `${ex.date}|${ex.pair}|${Math.abs(ex.pnl)}`;
            existingKeys.add(k);
          });
        }

        let added = 0;
        for (const t of newTrades) {
          const k = `${t.date}|${t.pair}|${Math.abs(t.pnl)}`;
          if (existingKeys.has(k)) continue;
          await tradeService.create({
            account_id: targetApiId,
            year: t.year,
            month: t.month + 1,
            date: t.date,
            pair: t.pair,
            dir: t.dir,
            lots: t.lots,
            result: t.result,
            pnl: t.pnl,
            has_vm: t.hasVM,
            vm_lots: t.vmLots,
            vm_result: t.vmResult,
            vm_pnl: t.vmPnl,
          });
          added++;
        }

        if (newTrades.length > 0) {
          const sorted = newTrades.slice().sort((a, b) => a.date > b.date ? 1 : -1);
          switchYear(sorted[0].year);
          switchMonth(sorted[0].month);
        }
        await loadData();
        alert(`Trades importados com sucesso! (${added} novos)`);
      } catch (err: any) {
        alert('Erro ao importar: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Selected trades for bulk delete modal
  const selectedTrades = useMemo(() => {
    return monthTrades.filter(t => selectedIds.has(t.id));
  }, [monthTrades, selectedIds]);

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
                onClick={e => { e.stopPropagation(); if (!confirm(`Excluir a conta "${a.name}"?`)) return; deleteAccount(i); }}>✕</span>
            )}
          </button>
        ))}
        <button className="px-3 py-2 border-2 border-dashed rounded-md text-base font-bold transition-all" style={{ borderColor: '#484f58', color: '#6e7681' }}
          onClick={() => addAccount()}>＋</button>

        <div className="ml-auto flex items-center gap-2">
          <button className="btn-gpfx btn-gpfx-ghost text-xs" onClick={() => setExportModal(true)}>
            <Download size={14} /> Exportar CSV
          </button>
          <button className="btn-gpfx btn-gpfx-primary text-xs" onClick={() => { setMt5AccId((activeAcc as any)._apiId || ''); setMt5Modal(true); }}>
            <Upload size={14} /> Importar MT5
          </button>
          <button className="btn-gpfx btn-gpfx-primary text-xs" onClick={() => setBrokerModal(true)}>
            <Plug size={14} /> Conectar Corretora
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
              <input
                type="number"
                className="gpfx-input"
                style={{ width: 140 }}
                value={acc.initialBalance ?? acc.balance}
                onChange={e => updateInitialBalance(parseFloat(e.target.value) || 0)}
              />
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
                  const ySummary = annualSummaries[y];
                  const yPnl = ySummary ? ySummary.reduce((s, m) => s + (m.pnl || 0), 0) : null;
                  return (
                    <div key={y}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-semibold transition-colors ${y === year ? 'font-extrabold' : ''}`}
                      style={{ color: y === year ? '#00d395' : '#c9d1d9', background: y === year ? 'rgba(0,211,149,0.15)' : 'transparent', borderBottom: '1px solid #161b22' }}
                      onClick={() => { switchYear(y); setYearPickerOpen(false); }}
                    >
                      <span>{y}</span>
                      <span className="text-[11px] font-bold" style={{ color: yPnl && yPnl > 0 ? '#00d395' : yPnl && yPnl < 0 ? '#ff4d4d' : '#484f58' }}>
                        {yPnl === null ? '-' : (yPnl !== 0 ? (yPnl > 0 ? '+' : '') + '$' + fmtNum(yPnl) : '-')}
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
              const d = annualGrid[mi] || { pnl: 0, count: 0 };
              const w = (withdrawalsByMonth[mi] || []).reduce((s, wd) => s + (wd.amount || 0), 0);
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
                value={withdrawalInput} placeholder="0.00"
                onChange={e => setWithdrawalInput(e.target.value)}
                onBlur={saveMonthWithdrawal}
                onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }} />
            </div>
          </div>
          <MsItem label="Líquido Mês" value={(monthNet >= 0 ? '+' : '') + '$' + fmtNum(monthNet)} cls={monthNet >= 0 ? 'text-gpfx-green' : 'text-gpfx-red'} />
          <MsItem label="Trades" value={String(monthTotal)} />
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

        {/* Batch Action Bar */}
        <div className="flex items-center gap-3 px-5 py-2.5" style={{ background: '#0d1117', borderBottom: '1px solid #21262d' }}>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={toggleSelectAll}
              className="border-[#484f58] data-[state=checked]:bg-[#00d395] data-[state=checked]:border-[#00d395]"
            />
            <span className="text-xs font-semibold" style={{ color: '#8b949e' }}>Selecionar todos</span>
          </div>
          {selectedCount > 0 && (
            <>
              <span className="text-xs font-bold" style={{ color: '#c9d1d9' }}>{selectedCount} trade{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}</span>
              <button
                className="btn-gpfx text-xs font-bold ml-auto flex items-center gap-1.5"
                style={{ background: '#ff4d4d', color: '#fff', border: 'none' }}
                onClick={() => setBulkDeleteModal(true)}
              >
                🗑️ Apagar Selecionados
              </button>
            </>
          )}
        </div>

        {/* Trades List - Compact Mode */}
        <div className="p-4 flex flex-col gap-3">
          {dateOrder.length === 0 && (
            <div className="text-center py-10" style={{ color: '#6e7681' }}>Nenhum trade neste mês. Clique em "<strong>+ Novo Dia</strong>" para começar.</div>
          )}
          {dateOrder.map(date => {
            const dayTrades = groups[date];
            const dayPnl = dayTrades.reduce((s, t) => s + signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0), 0);
            const dayTradeIds = dayTrades.map(t => t.id);
            const allDaySelected = dayTradeIds.every(id => selectedIds.has(id));
            const someDaySelected = dayTradeIds.some(id => selectedIds.has(id));
            const fmtDate = date !== 'Sem data'
              ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
              : 'Sem data';

            return (
              <div key={date} className="mb-1">
                {/* Day Header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-t-lg flex-wrap gap-2"
                  style={{ background: '#161b22', border: '1px solid #30363d', borderBottom: 'none' }}>
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={allDaySelected ? true : someDaySelected ? 'indeterminate' : false}
                      onCheckedChange={() => toggleSelectDay(dayTradeIds)}
                      className="border-[#484f58] data-[state=checked]:bg-[#00d395] data-[state=checked]:border-[#00d395]"
                    />
                    <input type="date" value={date !== 'Sem data' ? date : ''} className="gpfx-input text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #30363d', color: '#c9d1d9', width: 130 }}
                      onChange={e => {
                        const newDate = e.target.value;
                        if (!newDate || date === newDate) return;
                        const d = new Date(newDate + 'T12:00:00');
                        (async () => {
                          try {
                            await Promise.all(dayTrades.map(t => tradeService.update(t.id, {
                              date: newDate,
                              year: d.getFullYear(),
                              month: d.getMonth() + 1,
                            })));
                            switchYear(d.getFullYear());
                            switchMonth(d.getMonth());
                            await loadData();
                          } catch (err) {
                            console.error('Falha ao atualizar data dos trades', err);
                          }
                        })();
                      }} />
                    <span className="text-sm font-bold capitalize" style={{ color: '#e6edf3' }}>{fmtDate}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: '#8b949e', background: '#21262d' }}>{dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn-gpfx text-xs" style={{ background: 'rgba(0,211,149,0.1)', color: '#00d395', border: '1px solid rgba(0,211,149,0.2)' }}
                      onClick={() => addTrade(date)}>+ Trade</button>
                    <span className="text-sm font-extrabold" style={{ color: dayPnl > 0 ? '#00d395' : dayPnl < 0 ? '#ff4d4d' : '#6e7681' }}>
                      {dayPnl !== 0 ? (dayPnl > 0 ? '+' : '') + '$' + fmtNum(dayPnl) : '–'}
                    </span>
                  </div>
                </div>

                {/* Compact Trade Rows */}
                <div className="rounded-b-lg overflow-hidden" style={{ border: '1px solid #30363d', borderTop: 'none' }}>
                  {/* Table Header */}
                  <div className="grid items-center px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      gridTemplateColumns: '28px 36px 1fr 70px 70px 100px 36px 56px 32px 32px',
                      background: '#0d1117',
                      color: '#6e7681',
                      borderBottom: '1px solid #21262d'
                    }}>
                    <span></span>
                    <span>#</span>
                    <span>Par</span>
                    <span>Dir.</span>
                    <span>Result.</span>
                    <span className="text-right">P&L</span>
                    <span className="text-center">VM</span>
                    <span className="text-center">📸</span>
                    <span></span>
                    <span></span>
                  </div>

                  {dayTrades.map((t, ti) => {
                    const totalPnlTrade = signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
                    const isSelected = selectedIds.has(t.id);

                    return (
                      <div
                        key={t.id}
                        className="grid items-center px-3 transition-colors"
                        style={{
                          gridTemplateColumns: '28px 36px 1fr 70px 70px 100px 36px 56px 32px 32px',
                          height: 44,
                          background: isSelected ? 'rgba(0,211,149,0.06)' : ti % 2 === 0 ? '#0d1117' : '#161b22',
                          borderBottom: ti < dayTrades.length - 1 ? '1px solid #21262d' : 'none',
                        }}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(t.id)}
                          className="border-[#484f58] data-[state=checked]:bg-[#00d395] data-[state=checked]:border-[#00d395]"
                        />

                        {/* # */}
                        <span className="text-[11px] font-bold" style={{ color: '#6e7681' }}>#{ti + 1}</span>

                        {/* Par */}
                        <span className="text-xs font-bold px-2 py-0.5 rounded inline-block w-fit" style={{ background: '#21262d', color: '#e6edf3' }}>
                          {t.pair}
                        </span>

                        {/* Direção */}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded inline-block w-fit"
                          style={{
                            background: t.dir === 'BUY' ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)',
                            color: t.dir === 'BUY' ? '#00d395' : '#ff4d4d',
                          }}>
                          {t.dir}
                        </span>

                        {/* Resultado */}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded inline-block w-fit"
                          style={{
                            background: t.result === 'WIN' ? 'rgba(0,211,149,0.15)' : 'rgba(255,77,77,0.15)',
                            color: t.result === 'WIN' ? '#00d395' : '#ff4d4d',
                          }}>
                          {t.result}
                        </span>

                        {/* P&L */}
                        <span className="text-xs font-extrabold text-right" style={{ color: totalPnlTrade > 0 ? '#00d395' : totalPnlTrade < 0 ? '#ff4d4d' : '#6e7681' }}>
                          {totalPnlTrade !== 0 ? (totalPnlTrade > 0 ? '+' : '') + '$' + fmtNum(totalPnlTrade) : '–'}
                        </span>

                        {/* VM indicator */}
                        <span className="text-center">
                          {t.hasVM && <RefreshCw size={14} style={{ color: '#f59e0b', opacity: 0.7 }} />}
                        </span>

                        {/* Screenshot */}
                        <div className="flex items-center justify-center gap-1">
                          {t.screenshot ? (
                            <img
                              src={t.screenshot.data}
                              alt="Screenshot"
                              className="w-8 h-8 rounded object-cover cursor-pointer border"
                              style={{ borderColor: '#00d395' }}
                              onClick={() => setLightbox({ open: true, images: [{ data: t.screenshot!.data, caption: t.screenshot!.caption, tradePair: t.pair }], index: 0 })}
                            />
                          ) : (
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-[#21262d]"
                              onClick={() => openScreenshotModal(t)}
                              title="Adicionar screenshot"
                            >
                              <Camera size={14} style={{ color: '#6e7681' }} />
                            </button>
                          )}
                          {t.screenshot && (
                            <button
                              className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-[#21262d]"
                              onClick={() => openScreenshotModal(t)}
                              title="Editar screenshot"
                            >
                              <Camera size={10} style={{ color: '#00d395' }} />
                            </button>
                          )}
                        </div>

                        {/* Edit */}
                        <button
                          className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-[#21262d]"
                          onClick={() => openEditModal(t)}
                          title="Editar trade"
                        >
                          <Pencil size={14} style={{ color: '#8b949e' }} />
                        </button>

                        {/* Delete */}
                        <button
                          className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-[rgba(255,77,77,0.15)]"
                          onClick={() => setDeleteModal({ open: true, id: t.id })}
                          title="Excluir trade"
                        >
                          <X size={14} style={{ color: '#ff4d4d', opacity: 0.6 }} />
                        </button>
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

      {/* ── Modals ── */}

      {/* Rename Modal */}
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

      {/* Reset Modal */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Resetar Conta"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setResetModal(false)}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-danger" onClick={() => { resetAccount(); setResetModal(false); }}>🗑 Resetar tudo</button>
        </>}>
        <p className="text-sm" style={{ color: '#8b949e' }}>Tem certeza que deseja <strong>apagar todos os trades</strong> desta conta? O saldo inicial será mantido.</p>
      </Modal>

      {/* Single Delete Modal */}
      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, id: '' })} title="Excluir Trade"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setDeleteModal({ open: false, id: '' })}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-danger" onClick={() => { deleteTrade(deleteModal.id); setDeleteModal({ open: false, id: '' }); }}>Excluir</button>
        </>}>
        <p className="text-sm" style={{ color: '#8b949e' }}>Tem certeza que deseja excluir este trade?</p>
      </Modal>

      {/* Edit Trade Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, trade: null })}
        title={`Editar Trade — ${editForm.pair || ''} ${editForm.date || ''}`}
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setEditModal({ open: false, trade: null })}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-primary" onClick={saveEdit}>Salvar alterações</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <TradeField label="Par">
            <select className="gpfx-select w-full text-xs" value={editForm.pair || ''} onChange={e => setEditForm(f => ({ ...f, pair: e.target.value }))}>
              {PAIRS.map(p => <option key={p}>{p}</option>)}
            </select>
          </TradeField>
          <TradeField label="Direção">
            <select className={`gpfx-select w-full text-xs`} value={editForm.dir || ''} onChange={e => setEditForm(f => ({ ...f, dir: e.target.value }))}>
              {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </TradeField>
          <TradeField label="Resultado">
            <select className={`gpfx-select w-full text-xs`} value={editForm.result || ''} onChange={e => setEditForm(f => ({ ...f, result: e.target.value }))}>
              {RESULTS.map(r => <option key={r}>{r}</option>)}
            </select>
          </TradeField>
          <TradeField label="P&L (USD)">
            <input type="number" step="0.01" className="gpfx-input w-full text-xs" value={editForm.pnl || ''} onChange={e => setEditForm(f => ({ ...f, pnl: parseFloat(e.target.value) || 0 }))} />
          </TradeField>
          <TradeField label="Lots">
            <input type="number" step="0.01" className="gpfx-input w-full text-xs" value={editForm.lots || ''} onChange={e => setEditForm(f => ({ ...f, lots: parseFloat(e.target.value) || 0 }))} />
          </TradeField>
        </div>

        {/* VM Section */}
        <div className="mt-3 p-3 rounded-lg" style={{ background: '#161b22', border: '1px solid #21262d' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: editForm.hasVM ? '#f59e0b' : '#6e7681' }}>🔄 Virada de Mão</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={editForm.hasVM || false}
                onChange={e => setEditForm(f => ({ ...f, hasVM: e.target.checked }))}
                style={{ accentColor: '#f59e0b' }} />
              <span className="text-[11px]" style={{ color: '#8b949e' }}>Ativar</span>
            </label>
          </div>
          {editForm.hasVM && (
            <div className="grid grid-cols-2 gap-3">
              <TradeField label="Resultado VM">
                <select className="gpfx-select w-full text-xs" value={editForm.vmResult || 'WIN'} onChange={e => setEditForm(f => ({ ...f, vmResult: e.target.value }))}>
                  {RESULTS.map(r => <option key={r}>{r}</option>)}
                </select>
              </TradeField>
              <TradeField label="P&L VM (USD)">
                <input type="number" step="0.01" className="gpfx-input w-full text-xs" value={editForm.vmPnl || ''} onChange={e => setEditForm(f => ({ ...f, vmPnl: parseFloat(e.target.value) || 0 }))} />
              </TradeField>
              <TradeField label="Lots VM">
                <input type="number" step="0.01" className="gpfx-input w-full text-xs" value={editForm.vmLots || ''} onChange={e => setEditForm(f => ({ ...f, vmLots: parseFloat(e.target.value) || 0 }))} />
              </TradeField>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal open={bulkDeleteModal} onClose={() => setBulkDeleteModal(false)} title="Confirmar exclusão"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setBulkDeleteModal(false)}>Cancelar</button>
          <button className="btn-gpfx" style={{ background: '#ff4d4d', color: '#fff', border: 'none' }} onClick={handleBulkDelete}>Sim, apagar</button>
        </>}>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={28} style={{ color: '#f59e0b' }} />
          <p className="text-sm" style={{ color: '#c9d1d9' }}>
            Você está prestes a apagar <strong>{selectedCount} trade{selectedCount !== 1 ? 's' : ''}</strong>. Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="p-3 rounded-lg text-xs flex flex-col gap-1" style={{ background: '#161b22', color: '#8b949e', maxHeight: 200, overflowY: 'auto' }}>
          {selectedTrades.slice(0, 5).map(t => {
            const pnl = signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
            const dateStr = t.date ? t.date.split('-').slice(1).reverse().join('/') : '??';
            return (
              <div key={t.id}>
                • {dateStr}{t.time ? ` ${t.time}` : ''} {t.pair} {t.dir} {t.result}{' '}
                <span style={{ color: pnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                  {pnl >= 0 ? '+' : ''}${fmtNum(pnl)}
                </span>
              </div>
            );
          })}
          {selectedCount > 5 && (
            <div style={{ color: '#6e7681' }}>+ {selectedCount - 5} outros trades</div>
          )}
        </div>
      </Modal>

      {/* Export Modal */}
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

      {/* MT5 Import Modal */}
      <Modal open={mt5Modal} onClose={() => setMt5Modal(false)} title="📥 Importar Relatório MT5"
        footer={<>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={() => setMt5Modal(false)}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-primary" onClick={handleMT5ConfirmAndOpen}>📂 Selecionar arquivo</button>
        </>}>
        <label className="text-[11px] font-semibold uppercase" style={{ color: '#8b949e' }}>Conta de destino</label>
        <select className="gpfx-select w-full" value={mt5AccId} onChange={e => setMt5AccId(e.target.value)}>
          {state.accounts.map((a, i) => <option key={i} value={(a as any)._apiId || ''}>{a.name}</option>)}
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

      {/* Screenshot Modal */}
      <ScreenshotModal
        open={screenshotModal.open}
        onClose={() => setScreenshotModal({ open: false, trade: null })}
        trade={screenshotModal.trade}
        onSave={handleScreenshotSave}
      />

      {/* Lightbox */}
      <Lightbox open={lightbox.open} onClose={() => setLightbox({ ...lightbox, open: false })} images={lightbox.images} initialIndex={lightbox.index} />
      <ConnectBrokerModal open={brokerModal} onClose={() => setBrokerModal(false)} />
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
