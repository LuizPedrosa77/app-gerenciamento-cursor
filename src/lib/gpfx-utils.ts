export const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/NZD',
  'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/NZD',
  'AUD/CAD', 'AUD/CHF', 'AUD/JPY', 'AUD/NZD',
  'CAD/CHF', 'CAD/JPY', 'CHF/JPY', 'NZD/CAD', 'NZD/CHF', 'NZD/JPY',
  'XAU/USD', 'XAG/USD', 'US30', 'US100', 'US500', 'GER40', 'JPN225',
  'BTC/USD', 'ETH/USD',
  'Outro',
];
export const DIRECTIONS = ['BUY', 'SELL'];
export const RESULTS = ['WIN', 'LOSS'];
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface TradeScreenshot {
  data: string;
  caption: string;
}

export interface Trade {
  id: string;
  year: number;
  month: number;
  date: string;
  pair: string;
  dir: string;
  lots?: number;
  result: string;
  pnl: number;
  hasVM: boolean;
  vmLots?: number;
  vmResult: string;
  vmPnl: number;
  screenshot?: TradeScreenshot;
}

export interface Account {
  name: string;
  balance: number;
  notes: string;
  trades: Trade[];
  withdrawals: Record<string, number>;
  meta?: number;
  monthlyGoal?: number;
}

export interface GPFXState {
  accounts: Account[];
  activeAccount: number;
  activeYear: number;
  activeMonth: number;
}

export function createAccount(i: number): Account {
  return {
    name: 'Conta ' + (i + 1),
    balance: 50000,
    notes: '',
    trades: [],
    withdrawals: {},
  };
}

export function signedPnl(pnl: number, result: string): number {
  const v = Math.abs(pnl || 0);
  return result === 'LOSS' ? -v : v;
}

export function sumPnl(trades: Trade[]): number {
  return trades.reduce((s, t) => {
    return s + signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
  }, 0);
}

export function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '0.00';
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getAccountBalance(acc: Account): number {
  const totalPnl = sumPnl(acc.trades);
  const allWithdrawals = Object.values(acc.withdrawals || {}).reduce((s, v) => s + v, 0);
  return acc.balance + totalPnl - allWithdrawals;
}

export function getMonthPnl(acc: Account, year: number, month: number): number {
  const monthTrades = acc.trades.filter(t => t.year === year && t.month === month);
  return sumPnl(monthTrades);
}

export function getWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter(t => t.result === 'WIN').length;
  return Math.round((wins / trades.length) * 100);
}

export function getTradePnl(t: Trade): number {
  return signedPnl(t.pnl, t.result) + (t.hasVM ? signedPnl(t.vmPnl, t.vmResult) : 0);
}

export function getWeekOfMonth(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  return Math.ceil(day / 7);
}

export function loadState(): GPFXState {
  const saved = localStorage.getItem('gustavoPedrosaFX_v1');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (!state.accounts || state.accounts.length === 0) {
        state.accounts = [createAccount(0)];
      }
      if (state.activeAccount >= state.accounts.length) state.activeAccount = 0;
      return state;
    } catch (e) { /* fall through */ }
  }
  const oldSaved = localStorage.getItem('forexTrackerPro_v2');
  if (oldSaved) {
    try {
      const old = JSON.parse(oldSaved);
      const withTrades = old.accounts.filter((a: Account) => a.trades && a.trades.length > 0);
      const state: GPFXState = {
        ...old,
        accounts: withTrades.length > 0 ? withTrades : [createAccount(0)],
        activeAccount: 0,
      };
      localStorage.setItem('gustavoPedrosaFX_v1', JSON.stringify(state));
      return state;
    } catch (e) { /* fall through */ }
  }
  const now = new Date();
  return {
    accounts: [createAccount(0)],
    activeAccount: 0,
    activeYear: now.getFullYear(),
    activeMonth: now.getMonth(),
  };
}

export function saveState(state: GPFXState): void {
  localStorage.setItem('gustavoPedrosaFX_v1', JSON.stringify(state));
}
