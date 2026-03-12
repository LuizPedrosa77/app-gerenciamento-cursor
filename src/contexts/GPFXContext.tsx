import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GPFXState, Account, Trade, loadState, saveState, createAccount, uid } from '@/lib/gpfx-utils';

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

export function GPFXProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GPFXState>(loadState);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  const save = useCallback((newState?: GPFXState) => {
    const s = newState || state;
    saveState(s);
    setShowSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
  }, [state]);

  const doSave = useCallback((updater: (prev: GPFXState) => GPFXState) => {
    setState(prev => {
      const next = updater(prev);
      saveState(next);
      setShowSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
      return next;
    });
  }, []);

  const activeAcc = state.accounts[state.activeAccount] || state.accounts[0];

  const switchAccount = useCallback((i: number) => {
    doSave(s => ({ ...s, activeAccount: i }));
  }, [doSave]);

  const addAccount = useCallback(() => {
    doSave(s => {
      const newAcc = createAccount(s.accounts.length);
      return {
        ...s,
        accounts: [...s.accounts, newAcc],
        activeAccount: s.accounts.length,
      };
    });
  }, [doSave]);

  const deleteAccount = useCallback((i: number) => {
    doSave(s => {
      if (s.accounts.length <= 1) return s;
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
      return { ...s, accounts };
    });
  }, [doSave]);

  const updateBalance = useCallback((val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = { ...accounts[s.activeAccount], balance: val };
      return { ...s, accounts };
    });
  }, [doSave]);

  const updateNotes = useCallback((val: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = { ...accounts[s.activeAccount], notes: val };
      return { ...s, accounts };
    });
  }, [doSave]);

  const updateMeta = useCallback((val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = { ...accounts[s.activeAccount], meta: val };
      return { ...s, accounts };
    });
  }, [doSave]);

  const updateMonthlyGoal = useCallback((accIdx: number, val: number) => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[accIdx] = { ...accounts[accIdx], monthlyGoal: val };
      return { ...s, accounts };
    });
  }, [doSave]);

  const addTrade = useCallback((date?: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount], trades: [...accounts[s.activeAccount].trades] };
      const today = date || new Date().toISOString().split('T')[0];
      acc.trades.push({
        id: uid(), year: s.activeYear, month: s.activeMonth,
        date: today, pair: 'EUR/USD', dir: 'BUY', lots: 0.1,
        result: 'WIN', pnl: 0, hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0,
      });
      accounts[s.activeAccount] = acc;
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
      acc.trades.push({
        id: uid(), year, month, date: `${year}-${mm}-${dd}`,
        pair: 'EUR/USD', dir: 'BUY', result: 'WIN', pnl: 0,
        hasVM: false, vmLots: 0, vmResult: 'WIN', vmPnl: 0,
      });
      accounts[s.activeAccount] = acc;
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
      return { ...s, accounts };
    });
  }, [doSave]);

  const deleteTrade = useCallback((id: string) => {
    doSave(s => {
      const accounts = [...s.accounts];
      const acc = { ...accounts[s.activeAccount] };
      acc.trades = acc.trades.filter(t => t.id !== id);
      accounts[s.activeAccount] = acc;
      return { ...s, accounts };
    });
  }, [doSave]);

  const resetAccount = useCallback(() => {
    doSave(s => {
      const accounts = [...s.accounts];
      accounts[s.activeAccount] = {
        ...accounts[s.activeAccount],
        trades: [],
        withdrawals: {},
        notes: '',
      };
      return { ...s, accounts };
    });
  }, [doSave]);

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
      return { ...s, accounts };
    });
  }, [doSave]);

  // Keyboard navigation
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
