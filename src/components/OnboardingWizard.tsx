import { useState, useEffect } from 'react';
import { useGPFX } from '@/contexts/GPFXContext';
import { Sparkles, ChevronRight, Check } from 'lucide-react';

const STORAGE_KEY = 'gpfx_onboarding_done';

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all duration-300"
          style={{
            background: i <= current ? '#00d395' : 'rgba(255,255,255,0.15)',
            boxShadow: i === current ? '0 0 8px rgba(0,211,149,0.5)' : 'none',
          }}
        />
      ))}
      <span className="text-[10px] ml-1" style={{ color: 'var(--gpfx-text-muted)' }}>
        {current + 1} de {total}
      </span>
    </div>
  );
}

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
      color: ['#00d395', '#f59e0b', '#3b82f6', '#ff4d4d', '#a855f7'][Math.floor(Math.random() * 5)],
      size: 4 + Math.random() * 6,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: p.x + '%',
            top: '-5%',
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onNavigate: (view: string) => void;
}

export default function OnboardingWizard({ onComplete, onNavigate }: OnboardingWizardProps) {
  const { setState, save } = useGPFX();
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Step 2 fields
  const [accName, setAccName] = useState('Conta Principal');
  const [accBalance, setAccBalance] = useState(50000);
  const [accPlatform, setAccPlatform] = useState('MT5');

  // Step 3 fields
  const [goalBiweekly, setGoalBiweekly] = useState(500);
  const [goalMonthly, setGoalMonthly] = useState(1000);
  const [notifyGoal, setNotifyGoal] = useState(true);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  };

  const handleCreateAccount = () => {
    setState(prev => {
      const accounts = [...prev.accounts];
      accounts[0] = {
        ...accounts[0],
        name: accName || 'Conta Principal',
        balance: accBalance || 50000,
        notes: `Plataforma: ${accPlatform}`,
        trades: [],
        withdrawals: {},
      };
      return { ...prev, accounts };
    });
    save();
    setStep(2);
  };

  const handleFinish = () => {
    setState(prev => {
      const accounts = [...prev.accounts];
      accounts[0] = {
        ...accounts[0],
        monthlyGoal: goalMonthly || 0,
      };
      return { ...prev, accounts };
    });
    save();
    localStorage.setItem(STORAGE_KEY, 'true');
    if (notifyGoal) localStorage.setItem('gpfx_goal_notify', 'true');
    setShowConfetti(true);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      {showConfetti && <Confetti />}
      <div
        className="relative w-full animate-scale-in flex flex-col"
        style={{
          maxWidth: 700,
          background: '#0d1117',
          border: '1px solid rgba(0,211,149,0.2)',
          borderRadius: 16,
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold" style={{ color: '#00d395' }}>Gustavo Pedrosa FX</span>
            {step < 3 && <StepIndicator current={step} total={3} />}
          </div>
          {step < 3 && (
            <button className="text-[11px] font-bold px-3 py-1 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.05)]" style={{ color: 'var(--gpfx-text-muted)' }} onClick={dismiss}>
              Pular
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="flex flex-col items-center text-center gap-5 animate-fade-in">
              <div className="text-5xl" style={{ animation: 'wave 1.5s ease-in-out infinite' }}>👋</div>
              <style>{`@keyframes wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(20deg); } 75% { transform: rotate(-15deg); } }`}</style>
              <h2 className="text-2xl font-black" style={{ color: 'var(--gpfx-text-primary)' }}>Bem-vindo ao Gustavo Pedrosa FX!</h2>
              <p className="text-sm" style={{ color: 'var(--gpfx-text-muted)' }}>Vamos configurar sua conta em menos de 2 minutos</p>
              <div className="flex flex-col gap-3 text-left w-full max-w-sm mt-2">
                {[
                  'Criar sua primeira conta de trading',
                  'Definir sua meta',
                  'Registrar seu primeiro trade',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,211,149,0.06)', border: '1px solid rgba(0,211,149,0.15)' }}>
                    <Check size={16} style={{ color: '#00d395' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--gpfx-text-primary)' }}>{text}</span>
                  </div>
                ))}
              </div>
              <button className="btn-gpfx btn-gpfx-primary text-sm px-8 py-3 mt-3 flex items-center gap-2" onClick={() => setStep(1)}>
                Vamos começar <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="text-center mb-2">
                <h2 className="text-xl font-black" style={{ color: 'var(--gpfx-text-primary)' }}>Crie sua primeira conta</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--gpfx-text-muted)' }}>Uma conta representa sua conta em uma corretora</p>
              </div>
              <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Nome da conta</label>
                  <input className="gpfx-input text-sm" placeholder='Ex: "Conta Principal"' value={accName} onChange={e => setAccName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Saldo inicial ($)</label>
                  <input type="number" className="gpfx-input text-sm" placeholder="50000" value={accBalance || ''} onChange={e => setAccBalance(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Plataforma</label>
                  <select className="gpfx-select text-sm" value={accPlatform} onChange={e => setAccPlatform(e.target.value)}>
                    {['MT5', 'MT4', 'cTrader', 'TradingView', 'Outra'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <button className="btn-gpfx btn-gpfx-primary text-sm px-8 py-3 mt-2 flex items-center gap-2 self-center" onClick={handleCreateAccount}>
                  Criar conta <ChevronRight size={16} />
                </button>
                <button className="text-[11px] font-bold self-center" style={{ color: 'var(--gpfx-text-muted)' }} onClick={() => setStep(2)}>
                  Pular este passo
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5 animate-fade-in">
              <div className="text-center mb-2">
                <h2 className="text-xl font-black" style={{ color: 'var(--gpfx-text-primary)' }}>Defina sua meta</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--gpfx-text-muted)' }}>Metas ajudam a manter o foco e a disciplina</p>
              </div>
              <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Meta Quinzenal ($)</label>
                  <input type="number" className="gpfx-input text-sm" placeholder="Ex: $500" value={goalBiweekly || ''} onChange={e => setGoalBiweekly(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--gpfx-text-muted)' }}>Meta Mensal ($)</label>
                  <input type="number" className="gpfx-input text-sm" placeholder="Ex: $1.000" value={goalMonthly || ''} onChange={e => setGoalMonthly(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xs" style={{ color: 'var(--gpfx-text-primary)' }}>Receber notificação ao atingir</span>
                  <button
                    className="w-10 h-5 rounded-full relative transition-colors"
                    style={{ background: notifyGoal ? '#00d395' : '#30363d' }}
                    onClick={() => setNotifyGoal(!notifyGoal)}
                  >
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: notifyGoal ? 22 : 2 }} />
                  </button>
                </div>
                <button className="btn-gpfx btn-gpfx-primary text-sm px-8 py-3 mt-2 flex items-center gap-2 self-center" onClick={handleFinish}>
                  <Sparkles size={16} /> Salvar e começar!
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center gap-5 animate-fade-in py-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,211,149,0.15)', animation: 'pulse 2s infinite' }}>
                <Check size={40} style={{ color: '#00d395' }} />
              </div>
              <h2 className="text-2xl font-black" style={{ color: 'var(--gpfx-text-primary)' }}>Tudo pronto!</h2>
              <p className="text-sm" style={{ color: 'var(--gpfx-text-muted)' }}>Sua conta foi criada. Adicione seu primeiro trade!</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                <button className="btn-gpfx btn-gpfx-primary text-sm px-6 py-3" onClick={() => { onComplete(); onNavigate('planilha'); }}>
                  Ir para Trade Log
                </button>
                <button
                  className="text-sm px-6 py-3 rounded-lg font-bold transition-colors"
                  style={{ color: '#00d395', border: '1px solid rgba(0,211,149,0.3)', background: 'transparent' }}
                  onClick={() => { onComplete(); onNavigate('dashboard'); }}
                >
                  Explorar o sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(accounts: { trades: any[] }[]): boolean {
  if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
  // Show if all accounts have zero trades (new user)
  return accounts.every(a => !a.trades || a.trades.length === 0);
}
