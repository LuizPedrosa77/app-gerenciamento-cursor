import { useState } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import { sumPnl, getMonthPnl, getAccountBalance, fmtNum, getTradePnl } from '@/lib/gpfx-utils';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';
import { Target } from 'lucide-react';

interface ContasAtivasProps {
  onNavigatePlanilha: (accountIndex: number) => void;
}

function Sparkline({ trades }: { trades: Account['trades'] }) {
  const last7 = trades.slice(-7);
  if (last7.length === 0) return <div className="h-8 flex items-center text-[10px]" style={{ color: 'var(--gpfx-text-muted)' }}>Sem trades</div>;
  const data = last7.map(t => ({ pnl: getTradePnl(t) }));
  return (
    <div className="h-8">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="pnl" radius={[2, 2, 0, 0]}
            shape={(props: any) => {
              const { x, y, width, height } = props;
              return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={props.payload.pnl >= 0 ? '#00d395' : '#ff4d4d'} rx={2} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ContasAtivasPage({ onNavigatePlanilha }: ContasAtivasProps) {
  const { state, switchAccount, updateMonthlyGoal } = useGPFX();
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [goalValue, setGoalValue] = useState('');

  return (
    <div className="page-fade-in flex flex-col gap-5 max-w-[1400px] mx-auto p-6">
      <h1 className="text-xl font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>👛 Contas Ativas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.accounts.map((acc, i) => {
          const isActive = i === state.activeAccount;
          const balance = getAccountBalance(acc);
          const monthPnl = getMonthPnl(acc, curYear, curMonth);
          const hasGoal = (acc.monthlyGoal || 0) > 0;

          return (
            <div
              key={i}
              className="relative rounded-xl p-4 flex flex-col gap-3 transition-all"
              style={{
                background: 'var(--gpfx-card)',
                border: isActive ? '2px solid #00d395' : '1px solid var(--gpfx-border)',
              }}
            >
              {isActive && (
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,211,149,0.15)', color: '#00d395' }}>
                  ● Ativa
                </span>
              )}

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>CONTA {i + 1}</div>
                <div className="text-sm font-extrabold" style={{ color: 'var(--gpfx-text-primary)' }}>{acc.name}</div>
              </div>

              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--gpfx-text-secondary)' }}>Saldo</span>
                <span className="font-bold font-mono" style={{ color: 'var(--gpfx-text-primary)' }}>${fmtNum(balance)}</span>
              </div>

              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--gpfx-text-secondary)' }}>P&L Mês</span>
                <span className="font-bold font-mono" style={{ color: monthPnl >= 0 ? '#00d395' : '#ff4d4d' }}>
                  {monthPnl >= 0 ? '+' : '-'}${fmtNum(Math.abs(monthPnl))}
                </span>
              </div>

              {/* Monthly Goal */}
              <div className="flex flex-col gap-1 pt-1" style={{ borderTop: '1px solid var(--gpfx-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: '#64748b' }}>
                    <Target size={10} /> Meta Mensal
                  </span>
                </div>
                {editingGoal === i ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>$</span>
                    <input
                      type="number"
                      className="gpfx-input text-xs font-bold flex-1"
                      style={{ height: 28 }}
                      value={goalValue}
                      onChange={e => setGoalValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateMonthlyGoal(i, parseFloat(goalValue) || 0);
                          setEditingGoal(null);
                        }
                        if (e.key === 'Escape') setEditingGoal(null);
                      }}
                      autoFocus
                      placeholder="Ex: 5000"
                    />
                    <button className="text-[10px] px-2 py-1 rounded font-bold" style={{ background: 'rgba(0,211,149,0.15)', color: '#00d395' }}
                      onClick={() => { updateMonthlyGoal(i, parseFloat(goalValue) || 0); setEditingGoal(null); }}>✓</button>
                  </div>
                ) : hasGoal ? (
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => { setGoalValue(String(acc.monthlyGoal || '')); setEditingGoal(i); }}>
                    <span className="text-xs font-bold" style={{ color: '#00d395' }}>${fmtNum(acc.monthlyGoal!)}</span>
                    {(() => {
                      const pct = Math.min(100, Math.max(0, (monthPnl / (acc.monthlyGoal || 1)) * 100));
                      const barColor = pct >= 100 ? '#00d395' : pct >= 71 ? '#3b82f6' : pct >= 41 ? '#f59e0b' : '#ff4d4d';
                      return (
                        <div className="flex items-center gap-1.5 flex-1 ml-2">
                          <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ background: '#30363d' }}>
                            <div style={{ width: Math.min(100, Math.max(0, pct)) + '%', background: barColor, transition: 'width 1s ease' }} className="h-full rounded-full" />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <button
                    className="text-[11px] font-bold px-2 py-1 rounded w-full text-center"
                    style={{ background: 'rgba(0,211,149,0.08)', color: '#00d395', border: '1px dashed rgba(0,211,149,0.3)' }}
                    onClick={() => { setGoalValue(''); setEditingGoal(i); }}
                  >
                    + Definir meta
                  </button>
                )}
              </div>

              <Sparkline trades={acc.trades} />

              <button
                onClick={() => {
                  switchAccount(i);
                  onNavigatePlanilha(i);
                }}
                className="w-full py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{
                  background: isActive ? 'rgba(0,211,149,0.15)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#00d395' : 'var(--gpfx-text-secondary)',
                  border: '1px solid ' + (isActive ? 'rgba(0,211,149,0.3)' : 'var(--gpfx-border)'),
                }}
              >
                Acessar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
