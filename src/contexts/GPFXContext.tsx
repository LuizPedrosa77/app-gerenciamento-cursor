import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GPFXState, Account, Trade, createAccount, uid } from '@/lib/gpfx-utils';
import accountService, { APIAccount } from '@/services/accountService';
import tradeService, { APITrade } from '@/services/tradeService';
import { api } from '@/services/api';
import { authService } from '@/services/authService';

interface GPFXContextType {
  state: GPFXState;
  activeAcc: Account & { _apiId?: string };
  accountsBootstrapped: boolean;
  accountsLoadError: string | null;
  setState: React.Dispatch<React.SetStateAction<GPFXState>>;
  save: () => void;
  switchAccount: (i: number) => void;
  addAccount: (name?: string) => Promise<APIAccount | null>;
  deleteAccount: (i: number) => void;
  renameAccount: (i: number, name: string) => void;
  updateInitialBalance: (val: number) => void;
  updateNotes: (val: string) => void;
  updateMeta: (val: number) => void;
  updateMonthlyGoal: (accIdx: number, val: number) => void;
  addTrade: (date?: string) => void;
  addNewDay: () => void;
  updateTrade: (id: string, field: string, val: any) => void;
  deleteTrade: (id: string) => void;
  resetAccount: () => void;
  switchYear: (y: number) => void;
  switchMonth: (m: number) => void;
  showSaved: boolean;
  wsConnected: boolean;
}

const GPFXContext = createContext<GPFXContextType | null>(null);

function isAuthenticated(): boolean {
  return authService.isAuthenticated();
}

function getAuthToken(): string | null {
  return authService.getAccessToken();
}

function getWsUrl(): string {
  const envApiBase = import.meta.env.VITE_API_URL?.trim();
  const fallbackApiBase = typeof window !== 'undefined' ? window.location.origin : '';
  const apiBase = (envApiBase || fallbackApiBase).replace(/\/+$/, '');
  return apiBase.replace(/^http/, 'ws') + '/ws/trades';
}

/** Map backend account to local Account shape. Trades are loaded separately. */
function apiAccToLocal(a: APIAccount, existingTrades: Trade[] = []): Account & { _apiId?: string } {
  return {
    _apiId: a.id,
    name: a.name,
    balance: a.balance,
    notes: a.notes || '',
    trades: existingTrades,
    withdrawals: a.withdrawals || {},
    meta: a.meta,
    monthlyGoal: a.monthly_goal,
    initialBalance: (a as any).initial_balance || a.balance,
  } as any;
}

function normalizePair(value?: string): string {
  if (!value) return '';
  const raw = value.toUpperCase().replace(/\s+/g, '').split(':').pop() || '';
  if (raw.includes('/')) {
    const [left, right] = raw.split('/');
    return `${left}/${right}`;
  }
  if (/^[A-Z]{6}$/.test(raw)) {
    return `${raw.slice(0, 3)}/${raw.slice(3)}`;
  }
  if (raw === 'XAUUSD') return 'XAU/USD';
  if (raw === 'XAGUSD') return 'XAG/USD';
  return raw;
}

export function apiTradeToLocal(t: APITrade): Trade {
  const rawDate = t.date ? t.date.toString() : '';
  const normalizedDate = rawDate.replace(/\./g, '-').substring(0, 10);
  const closeOrOpen = t.close_time || t.open_time || '';
  const timePart = closeOrOpen
    ? closeOrOpen.toString().replace('T', ' ').substring(11, 16)
    : (rawDate.length > 10 ? rawDate.replace(/\./g, '-').substring(11, 16) : '');
  const firstScreenshot = (t as any).screenshots && (t as any).screenshots.length > 0 ? (t as any).screenshots[0] : null;
  const normalizedPair = t.symbol_normalized || normalizePair(t.pair || t.symbol_raw);

  return {
    id: t.id,
    year: t.year,
    month: typeof t.month === 'number' ? Math.max(0, t.month - 1) : t.month,
    date: normalizedDate,
    time: timePart,
    openTime: t.open_time,
    closeTime: t.close_time,
    openPrice: t.open_price,
    closePrice: t.close_price,
    ticket: t.ticket,
    symbolRaw: t.symbol_raw,
    symbolNormalized: normalizedPair,
    pair: normalizedPair || t.pair,
    dir: (t as any).direction || t.dir || 'BUY',
    lots: t.lots,
    result: t.result,
    pnl: t.pnl,
    hasVM: t.has_vm || false,
    vmLots: t.vm_lots || 0,
    vmResult: t.vm_result || 'WIN',
    vmPnl: t.vm_pnl || 0,
    screenshot: t.screenshot
      || (firstScreenshot?.url ? { data: firstScreenshot.url, caption: '' } : undefined)
      || ((t as any).screenshot_url ? { data: (t as any).screenshot_url, caption: '' } : undefined),
  };
}

function getApiId(acc: any): string | undefined {
  return acc?._apiId;
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  if (!dataUrl.startsWith('data:')) return null;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const header = parts[0];
  const base64 = parts[1];
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

function fireAndForget(promise: Promise<any>) {
  promise.catch(err => console.warn('[GPFX API]', err?.message || err));
}

export function GPFXProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [state, setState] = useState<GPFXState>({
    accounts: [createAccount(0)],
    activeAccount: 0,
    activeYear: now.getFullYear(),
    activeMonth: now.getMonth(),
  });
  const [showSaved, setShowSaved] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [accountsBootstrapped, setAccountsBootstrapped] = useState(false);
  const [accountsLoadError, setAccountsLoadError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const wsReconnectDelay = useRef(2000);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback(() => {
    setShowSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
  }, []);

  const save = useCallback(() => {
    flash();
  }, [flash]);

  const refreshAccounts = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const apiAccounts = await accountService.list();
      if (!apiAccounts || apiAccounts.length === 0) {
        setState(prev => ({
          ...prev,
          accounts: [createAccount(0)],
          activeAccount: 0,
        }));
        setAccountsLoadError(null);
        setAccountsBootstrapped(true);
        return;
      }
      const accounts: Account[] = [];
      for (const apiAcc of apiAccounts) {
        accounts.push(apiAccToLocal(apiAcc, []));
      }
      setState(prev => ({
        ...prev,
        accounts,
        activeAccount: (() => {
          const prevApiId = (prev.accounts[prev.activeAccount] as any)?._apiId;
          const idx = prevApiId ? accounts.findIndex((a: any) => (a as any)._apiId === prevApiId) : -1;
          if (idx >= 0) return idx;
          return Math.min(prev.activeAccount, accounts.length - 1);
        })(),
      }));
      setAccountsLoadError(null);
      setAccountsBootstrapped(true);
    } catch (err) {
      setAccountsLoadError('Falha ao carregar contas do backend.');
      setAccountsBootstrapped(true);
      console.warn('[GPFX] Backend load failed', err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    const onFocus = () => { void refreshAccounts(); };
    const onOnline = () => { void refreshAccounts(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [refreshAccounts]);

  const activeAcc = state.accounts[state.activeAccount] || state.accounts[0] || createAccount(0);

  const switchAccount = useCallback((i: number) => {
    setState(s => ({ ...s, activeAccount: i }));
  }, []);

  const addAccount = useCallback(async (name?: string) => {
    const newAcc = createAccount(state.accounts.length);
    if (!isAuthenticated()) return null;
    const payload = { name: (name && name.trim()) ? name.trim() : newAcc.name, balance: newAcc.balance };
    try {
      const created = await accountService.create(payload);
      await refreshAccounts();
      return created;
    } catch (err) {
      console.warn('[GPFX] Failed to create account', err);
      return null;
    }
  }, [state.accounts.length, refreshAccounts]);

  const deleteAccount = useCallback((i: number) => {
    if (state.accounts.length <= 1) return;
    const target = state.accounts[i];
    const apiId = getApiId(target);
    if (isAuthenticated() && apiId) {
      fireAndForget(accountService.remove(apiId).then(() => refreshAccounts()));
    }
  }, [state.accounts, refreshAccounts]);

  const renameAccount = useCallback((i: number, name: string) => {
    const apiId = getApiId(state.accounts[i]);
    if (isAuthenticated() && apiId) {
      fireAndForget(accountService.update(apiId, { name }).then(() => refreshAccounts()));
    }
  }, [state.accounts, refreshAccounts]);

  const updateInitialBalance = useCallback((val: number) => {
    const apiId = getApiId(state.accounts[state.activeAccount]);
    if (isAuthenticated() && apiId) {
      fireAndForget(accountService.update(apiId, { initial_balance: val }).then(() => refreshAccounts()));
    }
  }, [state.accounts, state.activeAccount, refreshAccounts]);

  const updateNotes = useCallback((val: string) => {
    const apiId = getApiId(state.accounts[state.activeAccount]);
    if (isAuthenticated() && apiId) {
      fireAndForget(accountService.update(apiId, { notes: val }).then(() => refreshAccounts()));
    }
  }, [state.accounts, state.activeAccount, refreshAccounts]);

  const updateMeta = useCallback((val: number) => {
    const apiId = getApiId(state.accounts[state.activeAccount]);
    if (isAuthenticated() && apiId) {
      fireAndForget(accountService.update(apiId, { meta: val }).then(() => refreshAccounts()));
    }
  }, [state.accounts, state.activeAccount, refreshAccounts]);

  const updateMonthlyGoal = useCallback((accIdx: number, val: number) => {
    const apiId = getApiId(state.accounts[accIdx]);
    if (isAuthenticated() && apiId) {
      fireAndForget(accountService.update(apiId, { monthly_goal: val }).then(() => refreshAccounts()));
    }
  }, [state.accounts, refreshAccounts]);

  const addTrade = useCallback((date?: string) => {
    const acc = state.accounts[state.activeAccount];
    const apiId = getApiId(acc);
    if (!apiId || !isAuthenticated()) return;
    const today = date || new Date().toISOString().split('T')[0];
    const newTrade: Trade = {
      id: uid(), year: state.activeYear, month: state.activeMonth,
      date: today, pair: 'EUR/USD', dir: 'BUY', lots: 0.1,
      result: 'WIN', pnl: 0, hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0,
    };
    fireAndForget(
      tradeService.create({
        account_id: apiId,
        year: newTrade.year,
        month: newTrade.month + 1,
        date: newTrade.date,
        pair: newTrade.pair,
        dir: newTrade.dir,
        lots: newTrade.lots,
        result: newTrade.result,
        pnl: newTrade.pnl,
        has_vm: newTrade.hasVM,
        vm_lots: newTrade.vmLots,
        vm_result: newTrade.vmResult,
        vm_pnl: newTrade.vmPnl,
      }).then(() => {
        window.dispatchEvent(new CustomEvent('gpfx:trade_updated', { detail: { account_id: apiId } }));
      })
    );
  }, [state]);

  const addNewDay = useCallback(() => {
    addTrade();
  }, [addTrade]);

  const updateTrade = useCallback((id: string, field: string, val: any) => {
    if (!isAuthenticated()) return;
    const payload: Partial<APITrade> = {};
    const fieldMap: Record<string, string> = {
      pair: 'pair', dir: 'dir', lots: 'lots', result: 'result', pnl: 'pnl',
      hasVM: 'has_vm', vmLots: 'vm_lots', vmResult: 'vm_result', vmPnl: 'vm_pnl',
      date: 'date', year: 'year', month: 'month',
    };
    if (fieldMap[field]) {
      (payload as any)[fieldMap[field]] = val;
    }
    if (field === 'screenshot') {
      const screenshotData = val?.data;
      if (screenshotData && typeof screenshotData === 'string' && !screenshotData.startsWith('http')) {
        const file = dataUrlToFile(screenshotData, `trade-${id}.png`);
        if (file) {
          fireAndForget(api.upload(`/api/v1/screenshots/upload/${id}`, file));
        }
      }
    }
    fireAndForget(tradeService.update(id, payload).then(() => {
      window.dispatchEvent(new CustomEvent('gpfx:trade_updated', { detail: { trade_id: id } }));
    }));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    if (!isAuthenticated()) return;
    fireAndForget(tradeService.remove(id).then(() => {
      window.dispatchEvent(new CustomEvent('gpfx:trade_updated', { detail: { trade_id: id } }));
    }));
  }, []);

  const resetAccount = useCallback(() => {
    const acc = state.accounts[state.activeAccount];
    const apiId = getApiId(acc);
    if (isAuthenticated() && apiId) {
      fireAndForget(tradeService.bulkDelete(apiId).then(() => {
        window.dispatchEvent(new CustomEvent('gpfx:trade_updated', { detail: { account_id: apiId } }));
      }));
    }
  }, [state.accounts, state.activeAccount]);

  const switchYear = useCallback((y: number) => {
    setState(s => ({ ...s, activeYear: y }));
  }, []);

  const switchMonth = useCallback((m: number) => {
    setState(s => ({ ...s, activeMonth: m }));
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated()) return;
    const token = getAuthToken();
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[GPFX WS] Conectado');
      setWsConnected(true);
      wsReconnectDelay.current = 2000;
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, account_id, account_name, imported, updated, balance, pnl, result, ticket, symbol, new_balance, trade } = msg;

        if (type === 'connected') {
          console.log('[GPFX WS] Handshake OK, user_id:', msg.user_id);
          return;
        }
        if (type === 'pong') return;

        if (type === 'trade_synced') {
          console.log(`[GPFX WS] trade_synced: ${imported} novos, ${updated} atualizados Â· ${account_name}`);
          window.dispatchEvent(new CustomEvent('gpfx:trade_updated', { detail: { account_id } }));
          if (balance !== undefined) await refreshAccounts();
          return;
        }

        if (type === 'trade_closed') {
          console.log(`[GPFX WS] trade_closed: ticket=${ticket} ${symbol} ${result} PnL=${pnl}`);
          window.dispatchEvent(new CustomEvent('gpfx:trade_updated', { detail: { account_id, trade } }));
          if (new_balance !== undefined) await refreshAccounts();
          return;
        }
      } catch (err) {
        console.warn('[GPFX WS] Erro ao processar mensagem', err);
      }
    };

    ws.onerror = () => {
      console.warn('[GPFX WS] Erro de conexÃ£o');
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log(`[GPFX WS] Desconectado. Reconectando em ${wsReconnectDelay.current}ms...`);
      wsReconnectTimer.current = setTimeout(() => {
        wsReconnectDelay.current = Math.min(wsReconnectDelay.current * 2, 30000);
        connectWebSocket();
      }, wsReconnectDelay.current);
    };
  }, [refreshAccounts]);

  useEffect(() => {
    if (!isAuthenticated()) return;
    connectWebSocket();

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(wsReconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  return (
    <GPFXContext.Provider value={{
      state,
      activeAcc: activeAcc as any,
      accountsBootstrapped,
      accountsLoadError,
      setState,
      save,
      switchAccount,
      addAccount,
      deleteAccount,
      renameAccount,
      updateInitialBalance,
      updateNotes,
      updateMeta,
      updateMonthlyGoal,
      addTrade,
      addNewDay,
      updateTrade,
      deleteTrade,
      resetAccount,
      switchYear,
      switchMonth,
      showSaved,
      wsConnected,
    }}>
      {children}
    </GPFXContext.Provider>
  );
}

export function useGPFX() {
  const ctx = useContext(GPFXContext);
  if (!ctx) throw new Error('useGPFX must be used within GPFXProvider');
  return ctx;
}
