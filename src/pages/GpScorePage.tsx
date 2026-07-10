import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Target } from 'lucide-react';
import dashboardService from '@/services/dashboardService';
import { useGPFX } from '@/contexts/GPFXContext';

export default function GpScorePage() {
  const { state } = useGPFX();
  const accountId = state.accounts[state.activeAccountIndex]?._apiId;
  const [score, setScore] = useState<{ score?: number; breakdown?: Record<string, number> } | null>(null);
  const [history, setHistory] = useState<Array<{ period: string; score: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getGPScore(accountId ? { account_id: accountId } : undefined),
      dashboardService.getGPScoreHistory('monthly', 6, accountId ? { account_id: accountId } : undefined),
    ])
      .then(([current, hist]) => {
        setScore(current);
        setHistory(Array.isArray(hist) ? hist : []);
      })
      .catch(() => {
        setScore(null);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  if (loading) {
    return (
      <div className="p-8 text-sm" style={{ color: 'var(--gpfx-text-muted)' }}>
        Carregando GP Score...
      </div>
    );
  }

  const currentScore = score?.score ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy size={28} style={{ color: 'var(--gpfx-green)' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>GP Score</h1>
          <p className="text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>
            Pontuação de disciplina, risco e performance
          </p>
        </div>
      </div>

      <div className="gpfx-card p-8 text-center">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>
          Score Atual
        </p>
        <p className="text-6xl font-extrabold" style={{ color: 'var(--gpfx-green)' }}>
          {currentScore.toFixed(0)}
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--gpfx-text-secondary)' }}>/ 100</p>
      </div>

      {score?.breakdown && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(score.breakdown).map(([key, value]) => (
            <div key={key} className="gpfx-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} style={{ color: 'var(--gpfx-green)' }} />
                <span className="text-xs uppercase font-bold" style={{ color: 'var(--gpfx-text-muted)' }}>
                  {key.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>
                {Number(value).toFixed(0)}
              </p>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="gpfx-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: 'var(--gpfx-green)' }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--gpfx-text-muted)' }}>
              Histórico Mensal
            </h2>
          </div>
          <div className="space-y-2">
            {history.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-[var(--gpfx-border)]">
                <span style={{ color: 'var(--gpfx-text-secondary)' }}>{item.period}</span>
                <span className="font-bold" style={{ color: 'var(--gpfx-green)' }}>{item.score?.toFixed?.(0) ?? item.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
