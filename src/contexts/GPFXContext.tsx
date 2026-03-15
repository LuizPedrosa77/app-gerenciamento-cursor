import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GPFXState, Account, Trade, loadState, saveState, createAccount, uid } from '@/lib/gpfx-utils';
import accountService, { APIAccount } from '@/services/accountService';
import tradeService, { APITrade } from '@/services/tradeService';

interface GPFXContextType {
  state: GPFXState;
  activeAcc: Account;
  setState: React.Dispatch<React.SetStateAction<GPFXState>>;
  save: (newState?: GPFXState) => void;
  switchAccount: (i: number) => void;
  addAccount: () => void;
  deleteAccount: (i: number) => void;
  renameAccount: (i: number, name: string) => void;
  updateBalance: (val: number) => void;
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
  updateWithdrawal: (year: number, month: number, val: number) => void;
  showSaved: boolean;
}

const GPFXContext = createContext<GPFXContextType | null>(null);

// ---------- helpers ----------

function isAuthenticated(): boolean {
  return !!localStorage.getItem('gpfx_auth_token');
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
  } as any;
}

function apiTradeToLocal(t: APITrade): Trade {
  return {
    id: t.id,
    year: t.year,
    month: t.month,
    date: t.date,
    pair: t.pair,
    dir: t.dir,
    lots: t.lots,
    result: t.result,
    pnl: t.pnl,
    hasVM: t.has_vm,
    vmLots: t.vm_lots,
    vmResult: t.vm_result,
    vmPnl: t.vm_pnl,
    screenshot: t.screenshot,
  };
}

function getApiId(acc: any): string | undefined {
  return acc?._apiId;
}

// Fire-and-forget helper – logs errors but never throws into the UI
function fireAndForget(promise: Promise<any>) {
  promise.catch(err => console.warn('[GPFX API]', err?.message || err));
}

// ---------- Provider ----------

export function GPFXProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GPFXState>(loadState);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialLoadDone = useRef(false);

  // ---- persist to localStorage + show toast ----
  const flash = useCallback(() => {
    setShowSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
  }, []);

  const save = useCallback((newState?: GPFXState) => {
    const s = newState || state;
    saveState(s);
    flash();
  }, [state, flash]);

  const doSave = useCallback((updater: (prev: GPFXState) => GPFXState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      flash();
      return next;
    });
  }, [flash]);

  // ---- initial load from backend ----
  useEffect(() => {
    if (initialLoadDone.current || !isAuthenticated()) return;
    initialLoadDone.current = true;

    (async () => {
      try {
        const apiAccounts = await accountService.list();
        if (!apiAccounts || apiAccounts.length === 0) return; // keep localStorage data

        const accounts: Account[] = [];
        for (const apiAcc of apiAccounts) {
          let trades: Trade[] = [];
          try {
            const apiTrades = await tradeService.list(apiAcc.id);
            trades = apiTrades.map(apiTradeToLocal);
          } catch { /* use empty trades */ }
          accounts.push(apiAccToLocal(apiAcc, trades));
        }

        setState(prev => {
          const next: GPFXState = {
            ...prev,
            accounts,
            activeAccount: Math.min(prev.activeAccount, accounts.length - 1),
          };
          saveState(next);
          return next;
        });
      } catch (err) {
        console.warn('[GPFX] Backend load failed, using localStorage fallback', err);
      }
    })();
  }, []);

  const activeAcc = state.accounts[state.activeAccount] || state.accounts[0];

  // ---- account operations ----

  const switchAccount = useCallback((i: number) => {
    doSave(s => ({ ...s, activeAccount: i }));
  }, [doSave]);

  const addAccount = useCallback(() => {
    doSave(s => {
      const newAcc = createAccount(s.accounts.length);
      const next = {
        ...s,
        accounts: [...s.accounts, newAcc],
        activeAccount: s.accounts.length,
      };

      if (isAuthenticated()) {
        fireAndForget(
          accountService.create({ name: newAcc.name, balance: newAcc.balance }).then(apiAcc => {
            // Patch the _apiId into state so future ops can reference it
            setState(prev => {
              const accounts = [...prev.accounts];
              const idx = accounts.length - 1;
              if (accounts[idx] && accounts[idx].name === newAcc.name) {
                (accounts[idx] as any)._apiId = apiAcc.id;
              }
              return { ...prev, accounts };
            });
          })
        );
      }

      return next;
    });
  }, [doSave]);

  const deleteAccount = useCallback((i: number) => {
    doSave(s => {
      if (s.accounts.length <= 1) return s;
      const target = s.accounts[i];
      const apiId = getApiId(target);

      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.remove(apiId));
      }

      const accounts = s.accounts.filter((_, idx) => idx !== i);
      return {
        ...s,
        accounts,
        activeAccount: Math.min(s.activeAccount, accounts.length - 1),
      };
    });
  }, [doSave]);

  const renameAccount = useCallback((i: number, name: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[i] = { ...accounts[i], name };

      const apiId = getApiId(accounts[i]);
      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.update(apiId, { name }));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const updateBalance = useCallback((val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = { ...accounts[s.activeAccount], balance: val };

      const apiId = getApiId(accounts[s.activeAccount]);
      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.update(apiId, { balance: val }));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const updateNotes = useCallback((val: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = { ...accounts[s.activeAccount], notes: val };

      const apiId = getApiId(accounts[s.activeAccount]);
      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.update(apiId, { notes: val }));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const updateMeta = useCallback((val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = { ...accounts[s.activeAccount], meta: val };

      const apiId = getApiId(accounts[s.activeAccount]);
      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.update(apiId, { meta: val }));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const updateMonthlyGoal = useCallback((accIdx: number, val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[accIdx] = { ...accounts[accIdx], monthlyGoal: val };

      const apiId = getApiId(accounts[accIdx]);
      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.update(apiId, { monthly_goal: val }));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  // ---- trade operations ----

  const addTrade = useCallback((date?: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount], trades: [...accounts[s.activeAccount].trades] };
      const today = date || new Date().toISOString().split('T')[0];
      const newTrade: Trade = {
        id: uid(), year: s.activeYear, month: s.activeMonth,
        date: today, pair: 'EUR/USD', dir: 'BUY', lots: 0.1,
        result: 'WIN', pnl: 0, hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0,
      };
      acc.trades.push(newTrade);
      accounts[s.activeAccount] = acc;

      const apiId = getApiId(accounts[s.activeAccount]);
      if (isAuthenticated() && apiId) {
        fireAndForget(
          tradeService.create({
            account_id: apiId,
            year: newTrade.year, month: newTrade.month, date: newTrade.date,
            pair: newTrade.pair, dir: newTrade.dir, lots: newTrade.lots,
            result: newTrade.result, pnl: newTrade.pnl,
            has_vm: newTrade.hasVM, vm_lots: newTrade.vmLots,
            vm_result: newTrade.vmResult, vm_pnl: newTrade.vmPnl,
          }).then(apiTrade => {
            // Replace temp id with API id
            setState(prev => {
              const accs = [...prev.accounts];
              const a = { ...accs[prev.activeAccount], trades: accs[prev.activeAccount].trades.map(t =>
                t.id === newTrade.id ? { ...t, id: apiTrade.id } : t
              )};
              accs[prev.activeAccount] = a;
              return { ...prev, accounts: accs };
            });
          })
        );
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const addNewDay = useCallback(() => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount], trades: [...accounts[s.activeAccount].trades] };
      const { activeYear: year, activeMonth: month } = s;
      const monthTrades = acc.trades.filter(t => t.year === year && t.month === month);
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      let nextDay: number;
      if (monthTrades.length > 0) {
        const dates = monthTrades.map(t => t.date).filter(Boolean).sort();
        const lastDate = dates[dates.length - 1];
        nextDay = new Date(lastDate + 'T12:00:00').getDate() + 1;
      } else {
        nextDay = 1;
      }
      const usedDays = new Set(
        acc.trades
          .filter(t => t.year === year && t.month === month && t.date)
          .map(t => new Date(t.date + 'T12:00:00').getDate())
      );
      while (usedDays.has(nextDay) && nextDay <= lastDayOfMonth) nextDay++;
      if (nextDay > lastDayOfMonth) {
        for (let d = 1; d <= lastDayOfMonth; d++) {
          if (!usedDays.has(d)) { nextDay = d; break; }
        }
        if (nextDay > lastDayOfMonth) nextDay = 1;
      }
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(nextDay).padStart(2, '0');
      const newTrade: Trade = {
        id: uid(), year, month, date: `${year}-${mm}-${dd}`,
        pair: 'EUR/USD', dir: 'BUY', result: 'WIN', pnl: 0,
        hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0,
      };
      acc.trades.push(newTrade);
      accounts[s.activeAccount] = acc;

      const apiId = getApiId(accounts[s.activeAccount]);
      if (isAuthenticated() && apiId) {
        fireAndForget(
          tradeService.create({
            account_id: apiId,
            year: newTrade.year, month: newTrade.month, date: newTrade.date,
            pair: newTrade.pair, dir: newTrade.dir,
            result: newTrade.result, pnl: newTrade.pnl,
            has_vm: newTrade.hasVM, vm_lots: newTrade.vmLots,
            vm_result: newTrade.vmResult, vm_pnl: newTrade.vmPnl,
          }).then(apiTrade => {
            setState(prev => {
              const accs = [...prev.accounts];
              const a = { ...accs[prev.activeAccount], trades: accs[prev.activeAccount].trades.map(t =>
                t.id === newTrade.id ? { ...t, id: apiTrade.id } : t
              )};
              accs[prev.activeAccount] = a;
              return { ...prev, accounts: accs };
            });
          })
        );
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const updateTrade = useCallback((id: string, field: string, val: any) => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount], trades: accounts[s.activeAccount].trades.map(t => ({ ...t })) };
      const trade = acc.trades.find(t => t.id === id);
      if (!trade) return s;

      (trade as any)[field] = val;

      if (field === 'date' && val) {
        const d = new Date(val + 'T12:00:00');
        trade.year = d.getFullYear();
        trade.month = d.getMonth();
        accounts[s.activeAccount] = acc;

        if (isAuthenticated()) {
          fireAndForget(tradeService.update(id, { date: val, year: trade.year, month: trade.month }));
        }

        return { ...s, accounts, activeYear: trade.year, activeMonth: trade.month };
      }
      if (field === 'result') {
        if (val === 'LOSS' && trade.pnl > 0) trade.pnl = -trade.pnl;
        if (val === 'WIN' && trade.pnl < 0) trade.pnl = -trade.pnl;
      }
      if (field === 'vmResult') {
        if (val === 'LOSS' && trade.vmPnl > 0) trade.vmPnl = -trade.vmPnl;
        if (val === 'WIN' && trade.vmPnl < 0) trade.vmPnl = -trade.vmPnl;
      }
      if (field === 'pnl') {
        if (trade.result === 'LOSS' && val > 0) trade.pnl = -val;
        if (trade.result === 'WIN' && val < 0) trade.pnl = -val;
      }
      if (field === 'vmPnl') {
        if (trade.vmResult === 'LOSS' && val > 0) trade.vmPnl = -val;
        if (trade.vmResult === 'WIN' && val < 0) trade.vmPnl = -val;
      }

      accounts[s.activeAccount] = acc;

      // Sync the relevant fields to backend
      if (isAuthenticated()) {
        const payload: Partial<APITrade> = {};
        const fieldMap: Record<string, string> = {
          pair: 'pair', dir: 'dir', lots: 'lots', result: 'result', pnl: 'pnl',
          hasVM: 'has_vm', vmLots: 'vm_lots', vmResult: 'vm_result', vmPnl: 'vm_pnl',
          date: 'date', year: 'year', month: 'month',
        };
        // Send the current trade state for the changed field
        if (fieldMap[field]) {
          (payload as any)[fieldMap[field]] = (trade as any)[field];
        }
        // Also sync derived changes (result ↔ pnl sign correction)
        if (field === 'result' || field === 'pnl') {
          payload.result = trade.result;
          payload.pnl = trade.pnl;
        }
        if (field === 'vmResult' || field === 'vmPnl') {
          payload.vm_result = trade.vmResult;
          payload.vm_pnl = trade.vmPnl;
        }
        fireAndForget(tradeService.update(id, payload));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const deleteTrade = useCallback((id: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount] };
      acc.trades = acc.trades.filter(t => t.id !== id);
      accounts[s.activeAccount] = acc;

      if (isAuthenticated()) {
        fireAndForget(tradeService.remove(id));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  const resetAccount = useCallback(() => {
    doSave(s => {
      const accounts = [...s.accounts];
      const apiId = getApiId(accounts[s.activeAccount]);

      accounts[s.activeAccount] = {
        ...accounts[s.activeAccount],
        trades: [],
        withdrawals: {},
        notes: '',
      };

      if (isAuthenticated() && apiId) {
        fireAndForget(
          Promise.all([
            tradeService.bulkDelete(apiId),
            accountService.update(apiId, { withdrawals: {}, notes: '' }),
          ])
        );
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  // ---- navigation (no API calls) ----

  const switchYear = useCallback((y: number) => {
    doSave(s => ({ ...s, activeYear: y }));
  }, [doSave]);

  const switchMonth = useCallback((m: number) => {
    doSave(s => ({ ...s, activeMonth: m }));
  }, [doSave]);

  const updateWithdrawal = useCallback((year: number, month: number, val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount], withdrawals: { ...accounts[s.activeAccount].withdrawals } };
      acc.withdrawals[`${year}-${month}`] = val;
      accounts[s.activeAccount] = acc;

      const apiId = getApiId(accounts[s.activeAccount]);
      if (isAuthenticated() && apiId) {
        fireAndForget(accountService.update(apiId, { withdrawals: acc.withdrawals }));
      }

      return { ...s, accounts };
    });
  }, [doSave]);

  // ---- keyboard navigation ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        doSave(s => {
          let { activeMonth, activeYear } = s;
          if (e.key === 'ArrowLeft') {
            if (activeMonth > 0) activeMonth--;
            else { activeMonth = 11; activeYear--; }
          } else {
            if (activeMonth < 11) activeMonth++;
            else { activeMonth = 0; activeYear++; }
          }
          return { ...s, activeMonth, activeYear };
        });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [doSave]);

  return (
    <GPFXContext.Provider value={{
      state, activeAcc, setState, save,
      switchAccount, addAccount, deleteAccount, renameAccount,
      updateBalance, updateNotes, updateMeta, updateMonthlyGoal,
      addTrade, addNewDay, updateTrade, deleteTrade, resetAccount,
      switchYear, switchMonth, updateWithdrawal,
      showSaved,
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
