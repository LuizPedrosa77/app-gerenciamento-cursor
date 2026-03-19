import { useEffect, useState } from 'react';
import { useGPFX, apiTradeToLocal } from '@/contexts/GPFXContext';
import tradeService from '@/services/tradeService';
import { sumPnl, fmtNum, Trade, getTradePnl } from '@/lib/gpfx-utils';

interface SparklineProps {
  trades: Trade[];
}

function Sparkline({ trades }: SparklineProps) {
  const last7 = trades.slice(-7);
  if (last7.length === 0) return null;
  const values = last7.map(t => getTradePnl(t));
  const max = Math.max(...values.map(Math.abs), 1);

  return (
    <div className="sparkline-container">
      {values.map((v, i) => (
        <div
          key={i}
          className="sparkline-bar"
          style={{
            height: `${Math.max(4, (Math.abs(v) / max) * 18)}px`,
            background: v >= 0 ? '#00d395' : '#ff4d4d',
          }}
        />
      ))}
    </div>
  );
}

export function ActiveAccountCard() {
  const { state, activeAcc, dataRefreshTick } = useGPFX();
  const [monthTrades, setMonthTrades] = useState<Trade[]>([]);
  const balance = activeAcc.balance || 0;
  const monthPnl = sumPnl(monthTrades);
  const goal = activeAcc.monthlyGoal || 0;
  const hasGoal = goal > 0;
  const goalPct = hasGoal ? Math.min(100, Math.max(0, (monthPnl / goal) * 100)) : 0;
  const goalBarColor = goalPct >= 100 ? '#00d395' : goalPct >= 71 ? '#3b82f6' : goalPct >= 41 ? '#f59e0b' : '#ff4d4d';

  useEffect(() => {
    const load = async () => {
      const apiId = (activeAcc as any)._apiId;
      if (!apiId) {
        setMonthTrades([]);
        return;
      }
      try {
        const res = await tradeService.list(apiId, 0, 2000, state.activeYear, state.activeMonth + 1);
        const trades = (res.items || res).map(apiTradeToLocal);
        setMonthTrades(trades);
      } catch (err) {
        console.error('Failed to load account trades for card', err);
      }
    };
    load();
  }, [activeAcc, state.activeYear, state.activeMonth, dataRefreshTick]);

  return (
    <div className="mx-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
        Conta Ativa
      </div>
      <div className="text-sm font-bold mb-1" style={{ color: '#e6edf3' }}>
        {activeAcc.name}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: '#8b949e' }}>Saldo</span>
        <span className="text-xs font-bold" style={{ color: '#e6edf3' }}>${fmtNum(balance)}</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: '#8b949e' }}>P&L Mês</span>
        <span className="text-xs font-bold" style={{ color: monthPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
          {monthPnl >= 0 ? '+' : ''}${fmtNum(monthPnl)}
        </span>
      </div>

      {/* Mini Meta Bar */}
      {hasGoal && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] font-bold" style={{ color: '#475569' }}>Meta do mês</span>
            <span className="text-[10px] font-bold" style={{ color: goalBarColor }}>{goalPct.toFixed(0)}% atingido</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#30363d' }}>
            <div style={{ width: goalPct + '%', background: goalBarColor, transition: 'width 1s ease' }} className="h-full rounded-full" />
          </div>
        </div>
      )}

      <Sparkline trades={monthTrades} />
    </div>
  );
}
