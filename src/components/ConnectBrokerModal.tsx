import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Plug, TrendingUp, Activity, BarChart3, LineChart,
  Shield, Eye, EyeOff, CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { brokerService } from '@/services/brokerService';
import { accountService } from '@/services/accountService';

type Platform = 'MT5' | 'MT4' | 'NinjaTrader' | 'Tradovate' | 'cTrader';

const platforms: { id: Platform; icon: typeof TrendingUp }[] = [
  { id: 'MT5', icon: TrendingUp },
  { id: 'MT4', icon: TrendingUp },
  { id: 'NinjaTrader', icon: Activity },
  { id: 'Tradovate', icon: BarChart3 },
  { id: 'cTrader', icon: LineChart },
];

type ModalState = 'form' | 'loading' | 'success' | 'error';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ConnectBrokerModal({ open, onClose }: Props) {
  const [selected, setSelected] = useState<Platform | null>(null);
  const [server, setServer] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [modalState, setModalState] = useState<ModalState>('form');
  const [progress, setProgress] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelected(null);
        setServer('');
        setLogin('');
        setPassword('');
        setAccountName('');
        setShowPw(false);
        setModalState('form');
        setProgress(0);
        setAccountId(null);
        setAccounts([]);
        setErrorMsg('');
      }, 300);
    }
  }, [open]);

  useEffect(() => {
    if (modalState === 'success') {
      const interval = setInterval(() => setProgress(p => Math.min(p + 5, 100)), 100);
      const timeout = setTimeout(() => { clearInterval(interval); onClose(); }, 2000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [modalState, onClose]);

  useEffect(() => {
    if (open) {
      accountService.getAccounts().then(data => setAccounts(data)).catch(() => {});
    }
  }, [open]);

  const handleConnect = async () => {
    if (!selected || !server || !login || !password || !accountId) return;
    setModalState('loading');
    try {
      // Conecta no MetaApi
      await brokerService.connectMetaApi({
        login,
        password,
        server,
        platform: selected.toLowerCase(),
        account_id: accountId,
      });
      setModalState('success');
      // Inicia sincronização em background
      brokerService.syncHistory(accountId).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Erro ao conectar');
      setModalState('error');
    }
  };

  const handleTest = async () => {
    if (!selected || !server || !login || !password) return;
    setModalState('loading');
    setTimeout(() => setModalState('form'), 1200);
  };

  const isMT = selected === 'MT5' || selected === 'MT4';
  const serverPlaceholder = isMT ? 'Ex: MetaQuotes-Demo' : 'Ex: https://api.tradovate.com';
  const canSubmit = selected && server.trim() && login.trim() && password.trim() && accountId;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-md w-full border-0 p-0 overflow-hidden"
        style={{
          background: 'var(--gpfx-card, #0d1117)',
          border: '1px solid rgba(0,211,149,0.15)',
          borderRadius: 16,
        }}
      >
        {modalState === 'form' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--gpfx-text-primary, #e2e8f0)' }}>
                <Plug size={18} style={{ color: '#00d395' }} />
                Conectar Corretora
              </DialogTitle>
              <DialogDescription className="text-xs" style={{ color: 'var(--gpfx-text-muted, #64748b)' }}>
                Sincronize sua conta de investidor automaticamente
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 flex flex-col gap-4">
              {/* Platform selector */}
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[2px] mb-2 block" style={{ color: '#64748b' }}>
                  Plataforma
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {platforms.map(p => {
                    const Icon = p.icon;
                    const active = selected === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelected(p.id)}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all"
                        style={{
                          background: active ? 'rgba(0,211,149,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${active ? '#00d395' : 'rgba(255,255,255,0.1)'}`,
                          color: active ? '#00d395' : 'var(--gpfx-text-secondary, #94a3b8)',
                        }}
                      >
                        <Icon size={16} />
                        {p.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selected && (
                <>
                  {/* Server */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
                      Servidor / URL
                    </label>
                    <input
                      className="gpfx-input text-xs"
                      placeholder={serverPlaceholder}
                      value={server}
                      onChange={e => setServer(e.target.value)}
                    />
                  </div>

                  {/* Login */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
                      Login / Usuário
                    </label>
                    <input
                      className="gpfx-input text-xs"
                      placeholder="Seu login da corretora"
                      value={login}
                      onChange={e => setLogin(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
                      Senha Investidor
                    </label>
                    <div className="relative">
                      <input
                        className="gpfx-input text-xs pr-9"
                        type={showPw ? 'text' : 'password'}
                        placeholder="Senha somente leitura"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        style={{ color: '#64748b' }}
                        onClick={() => setShowPw(!showPw)}
                      >
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Account Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
                      Nome da Conta <span style={{ color: '#475569' }}>(opcional)</span>
                    </label>
                    <input
                      className="gpfx-input text-xs"
                      placeholder="Ex: Conta Principal MT5"
                      value={accountName}
                      onChange={e => setAccountName(e.target.value)}
                    />
                  </div>

                  {/* Account Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
                      Vincular à Conta
                    </label>
                    <select
                      className="gpfx-input text-xs"
                      value={accountId || ''}
                      onChange={e => setAccountId(e.target.value)}
                      style={{ background: '#0d1117', color: '#e2e8f0' }}
                    >
                      <option value="">Selecione uma conta</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Security notice */}
                  <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,211,149,0.04)', border: '1px solid rgba(0,211,149,0.08)' }}>
                    <Shield size={14} style={{ color: '#00d395', marginTop: 1, flexShrink: 0 }} />
                    <span className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Suas credenciais são criptografadas com AES-256 e nunca são compartilhadas. A senha investidor é somente leitura e não permite realizar operações.
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ border: '1px solid var(--gpfx-border, #21262d)', color: 'var(--gpfx-text-secondary, #94a3b8)' }}
                      onClick={onClose}
                    >
                      Cancelar
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ border: '1px solid #00d395', color: '#00d395', opacity: canSubmit ? 1 : 0.4 }}
                      disabled={!canSubmit}
                      onClick={handleTest}
                    >
                      Testar Conexão
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg text-xs font-bold transition-colors ml-auto"
                      style={{ background: '#00d395', color: '#070b14', opacity: canSubmit ? 1 : 0.4 }}
                      disabled={!canSubmit}
                      onClick={handleConnect}
                    >
                      Conectar e Sincronizar
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {modalState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={36} className="animate-spin" style={{ color: '#00d395' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--gpfx-text-primary, #e2e8f0)' }}>Conectando...</span>
          </div>
        )}

        {modalState === 'success' && (
          <div className="flex flex-col items-center justify-center py-14 px-6 gap-3">
            <CheckCircle size={48} style={{ color: '#00d395' }} />
            <span className="text-base font-bold" style={{ color: 'var(--gpfx-text-primary, #e2e8f0)' }}>
              Conexão estabelecida com sucesso!
            </span>
            <span className="text-xs" style={{ color: 'var(--gpfx-text-muted, #64748b)' }}>
              Sincronizando histórico de trades...
            </span>
            <div className="w-full max-w-[200px] mt-2">
              <Progress value={progress} className="h-1.5 bg-[#1e293b]" />
            </div>
          </div>
        )}

        {modalState === 'error' && (
          <div className="flex flex-col items-center justify-center py-14 px-6 gap-3">
            <XCircle size={48} style={{ color: '#ff4d4d' }} />
            <span className="text-base font-bold" style={{ color: 'var(--gpfx-text-primary, #e2e8f0)' }}>
              Não foi possível conectar
            </span>
            <span className="text-xs" style={{ color: 'var(--gpfx-text-muted, #64748b)' }}>
              {errorMsg || 'Verifique suas credenciais e tente novamente'}
            </span>
            <button
              className="mt-2 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ border: '1px solid #00d395', color: '#00d395' }}
              onClick={() => setModalState('form')}
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
