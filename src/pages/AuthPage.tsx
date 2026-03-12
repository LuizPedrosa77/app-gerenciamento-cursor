import { useState, useCallback, useMemo } from 'react';
import { Mail, Lock, User, CreditCard, Eye, EyeOff, ArrowLeft, Check, LayoutDashboard, Calendar, Plug, Play, Bot, FileText } from 'lucide-react';
import { authService, LoginCredentials, RegisterData } from '../services/authService';

type AuthView = 'login' | 'signup' | 'forgot';

function cpfMask(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: '', width: '0%' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Fraca', color: '#ff4d4d', width: '33%' };
  if (score <= 3) return { label: 'Média', color: '#f0ad4e', width: '66%' };
  return { label: 'Forte', color: '#00d395', width: '100%' };
}

const features = [
  { text: 'Dashboard completo com 8 gráficos', icon: LayoutDashboard },
  { text: 'Calendário de trades com GP Score', icon: Calendar },
  { text: 'Conexão direta com MT5, MT4 e cTrader', icon: Plug },
  { text: 'Replay de mercado para treinamento', icon: Play },
  { text: 'IA do Trade para análise inteligente', icon: Bot },
  { text: 'Relatórios semanais automáticos', icon: FileText },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function LeftPanel() {
  return (
    <div className="hidden md:flex w-1/2 relative flex-col justify-between p-10 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a0f1a 0%, #0d1117 50%, #0a0f1a 100%)',
      }}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,211,149,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,211,149,0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Orbs */}
      <div className="absolute -top-10 -right-10 rounded-full" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,211,149,0.06) 0%, transparent 70%)' }} />
      <div className="absolute -bottom-20 -left-20 rounded-full" style={{ width: 250, height: 250, background: 'radial-gradient(circle, rgba(0,211,149,0.04) 0%, transparent 70%)' }} />
      <div className="absolute top-1/2 right-10 rounded-full" style={{ width: 150, height: 150, background: 'radial-gradient(circle, rgba(0,211,149,0.08) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-extrabold" style={{ background: '#00d395', color: '#0a0f1a' }}>GP</div>
          <span className="text-lg font-bold" style={{ color: '#e2e8f0' }}>Gustavo Pedrosa FX</span>
        </div>
        <span className="text-[10px] font-bold tracking-[3px] uppercase ml-[46px]" style={{ color: '#00d395' }}>Pro Trading Suite</span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <h1 className="font-bold leading-[1.15] mb-4" style={{ color: '#e2e8f0', fontSize: 42 }}>
          Gerencie suas operações<br />com inteligência
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 380 }}>
          A plataforma completa para traders profissionais acompanharem, analisarem e evoluírem seus resultados.
        </p>
        <div className="flex flex-col" style={{ gap: 14 }}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,211,149,0.1)', border: '1px solid rgba(0,211,149,0.15)' }}>
                  <Icon size={15} style={{ color: '#00d395' }} />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          <div className="w-7 h-7 rounded-full border-2" style={{ background: '#00d395', borderColor: '#0a0f1a' }} />
          <div className="w-7 h-7 rounded-full border-2" style={{ background: '#3b82f6', borderColor: '#0a0f1a' }} />
          <div className="w-7 h-7 rounded-full border-2" style={{ background: '#8b5cf6', borderColor: '#0a0f1a' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs" style={{ color: '#f0ad4e' }}>★★★★★</span>
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Usado por traders profissionais</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage({ onLogin }: { onLogin: () => void }) {
  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [terms, setTerms] = useState(false);
  const [signupPw, setSignupPw] = useState('');

  const strength = useMemo(() => passwordStrength(signupPw), [signupPw]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const credentials: LoginCredentials = {
        email,
        password
      };
      
      await authService.login(credentials);
      onLogin();
    } catch (error: any) {
      console.error('Login error:', error);
      // O erro já é tratado pelo toast no interceptor do api.ts
    } finally {
      setLoading(false);
    }
  }, [email, password, onLogin]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userData: RegisterData = {
        name,
        email,
        cpf,
        password: signupPw
      };
      
      await authService.register(userData);
      onLogin();
    } catch (error: any) {
      console.error('Signup error:', error);
      // O erro já é tratado pelo toast no interceptor do api.ts
    } finally {
      setLoading(false);
    }
  }, [name, email, cpf, signupPw, onLogin]);

  const handleForgot = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await authService.forgotPassword(email);
      setForgotSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      // O erro já é tratado pelo toast no interceptor do api.ts
    } finally {
      setLoading(false);
    }
  }, [email]);

  const switchView = (v: AuthView) => {
    setView(v);
    setLoading(false);
    setForgotSent(false);
    setShowPw(false);
    setShowPwConfirm(false);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    borderRadius: 8,
    padding: '10px 12px 10px 40px',
    width: '100%',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const btnPrimary: React.CSSProperties = {
    background: '#00d395',
    color: '#0d1117',
    border: 'none',
    borderRadius: 8,
    padding: '11px 0',
    width: '100%',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const googleBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '11px 0',
    width: '100%',
    color: '#e2e8f0',
    fontWeight: 500,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-sm">
      <div className="text-center mb-2">
        <div className="md:hidden flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#00d395', color: '#0d1117' }}>GP</div>
          <span className="text-base font-bold" style={{ color: '#e2e8f0' }}>Gustavo Pedrosa FX</span>
        </div>
        <h2 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>Bem-vindo de volta</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Entre na sua conta para continuar</p>
      </div>

      <button type="button" style={googleBtn}><GoogleIcon /> Continuar com Google</button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>ou entre com email</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div className="relative">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
      </div>

      <div>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input type={showPw ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPw(!showPw)} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="text-right mt-1.5">
          <button type="button" className="text-xs font-medium" style={{ color: '#00d395', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => switchView('forgot')}>
            Esqueci minha senha
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
        {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Entrar'}
      </button>

      <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Não tem conta?{' '}
        <button type="button" className="font-semibold underline" style={{ color: '#00d395', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => switchView('signup')}>
          Criar conta grátis
        </button>
      </p>
    </form>
  );

  const renderSignup = () => (
    <form onSubmit={handleSignup} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="text-center mb-1">
        <div className="md:hidden flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#00d395', color: '#0d1117' }}>GP</div>
          <span className="text-base font-bold" style={{ color: '#e2e8f0' }}>Gustavo Pedrosa FX</span>
        </div>
        <h2 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>Criar sua conta</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Comece a gerenciar seus trades</p>
      </div>

      <button type="button" style={googleBtn}><GoogleIcon /> Cadastrar com Google</button>
      <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>Ao cadastrar com Google, você ainda precisará informar seu CPF</p>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>ou cadastre com email</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div className="relative">
        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input type="text" placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
      </div>

      <div className="relative">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
      </div>

      <div className="relative">
        <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input type="text" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(cpfMask(e.target.value))} required style={inputStyle} />
      </div>

      <div>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input type={showPw ? 'text' : 'password'} placeholder="Senha" value={signupPw} onChange={e => setSignupPw(e.target.value)} required style={inputStyle} />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPw(!showPw)} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {signupPw && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.color }} />
            </div>
            <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
          </div>
        )}
      </div>

      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input type={showPwConfirm ? 'text' : 'password'} placeholder="Confirmar senha" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required style={inputStyle} />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPwConfirm(!showPwConfirm)} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-0.5 accent-[#00d395]" />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Concordo com os{' '}
          <span className="underline" style={{ color: '#00d395', cursor: 'pointer' }}>Termos de Uso</span>
          {' '}e{' '}
          <span className="underline" style={{ color: '#00d395', cursor: 'pointer' }}>Política de Privacidade</span>
        </span>
      </label>

      <button type="submit" disabled={loading || !terms} style={{ ...btnPrimary, opacity: (loading || !terms) ? 0.5 : 1 }}>
        {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Criar Conta'}
      </button>

      <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Já tem conta?{' '}
        <button type="button" className="font-semibold underline" style={{ color: '#00d395', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => switchView('login')}>
          Fazer login
        </button>
      </p>
    </form>
  );

  const renderForgot = () => (
    <div className="flex flex-col gap-5 w-full max-w-sm items-center">
      <button type="button" className="self-start flex items-center gap-1 text-sm" style={{ color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => switchView('login')}>
        <ArrowLeft size={16} /> Voltar
      </button>

      {forgotSent ? (
        <div className="flex flex-col items-center gap-4 text-center mt-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,211,149,0.15)' }}>
            <Check size={32} style={{ color: '#00d395' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>E-mail enviado!</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 280 }}>
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha
          </p>
          <button type="button" className="font-semibold underline text-sm mt-2" style={{ color: '#00d395', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => switchView('login')}>
            Voltar para o login
          </button>
        </div>
      ) : (
        <form onSubmit={handleForgot} className="flex flex-col gap-5 w-full items-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,211,149,0.15)' }}>
            <Mail size={32} style={{ color: '#00d395' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>Recuperar senha</h2>
          <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 280 }}>
            Digite seu e-mail e enviaremos as instruções de recuperação
          </p>
          <div className="relative w-full">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Enviar instruções'}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full" style={{ background: '#0d1117' }}>
      <LeftPanel />
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12"
        style={{ background: 'rgba(13,17,23,0.95)' }}
      >
        {view === 'login' && renderLogin()}
        {view === 'signup' && renderSignup()}
        {view === 'forgot' && renderForgot()}
      </div>
    </div>
  );
}
