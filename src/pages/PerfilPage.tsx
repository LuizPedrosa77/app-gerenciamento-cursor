import { useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import {
  UserCircle, Camera, Mail, Lock, Phone, MapPin, Globe, Calendar,
  Copy, Eye, EyeOff, QrCode, Monitor, Smartphone, Trash2,
  Crown, Check, Shield, Palette, Languages,
  Clock, DollarSign, X, ChevronDown, ExternalLink, Music, Play, Facebook
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Helpers ───
const phoneMask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const passwordStrength = (p: string) => {
  if (p.length < 6) return { label: 'Fraca', pct: 25, color: '#ff4d4d' };
  if (p.length < 10 || !/[A-Z]/.test(p) || !/\d/.test(p)) return { label: 'Média', pct: 55, color: '#f59e0b' };
  return { label: 'Forte', pct: 100, color: '#00d395' };
};

// Social network config
const socialNetworks = [
  { id: 'twitter', name: 'X (Twitter)', icon: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  )},
  { id: 'instagram', name: 'Instagram', icon: <Camera size={20} /> },
  { id: 'tiktok', name: 'TikTok', icon: <Music size={20} /> },
  { id: 'youtube', name: 'YouTube', icon: <Play size={20} /> },
  { id: 'facebook', name: 'Facebook', icon: <Facebook size={20} /> },
];

// ─── Tab: Perfil ───
function TabPerfil() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [form, setForm] = useState({
    nome: 'Gustavo Pedrosa', email: 'gustavo@email.com', cpf: '123.456.789-00',
    telefone: '', nascimento: '', pais: 'Brasil', cidade: '',
    twitter: '', instagram: '', tiktok: '', youtube: '', facebook: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast({ title: 'Perfil atualizado!' }); }, 1200);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type)) { toast({ title: 'Formato inválido', description: 'Apenas JPG e PNG', variant: 'destructive' }); return; }
    if (f.size > 2 * 1024 * 1024) { toast({ title: 'Arquivo muito grande', description: 'Máximo 2MB', variant: 'destructive' }); return; }
    const r = new FileReader(); r.onload = () => setAvatar(r.result as string); r.readAsDataURL(f);
  };

  const initials = form.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar card */}
      <div className="gpfx-card p-6 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center text-2xl font-bold"
            style={{ borderColor: 'var(--gpfx-green)', background: avatar ? 'transparent' : 'rgba(0,211,149,0.15)', color: 'var(--gpfx-green)' }}>
            {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : initials}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--gpfx-green)', color: '#0d1117' }}>
            <Camera size={14} />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFile} />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{form.nome}</h3>
          <p className="text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>{form.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'rgba(0,211,149,0.15)', color: 'var(--gpfx-green)' }}>Pro</span>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="gpfx-card p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>Dados Pessoais</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome Completo" value={form.nome} onChange={v => set('nome', v)} icon={<UserCircle size={14} />} required />
          <Field label="E-mail" value={form.email} onChange={v => set('email', v)} icon={<Mail size={14} />} required />
          <Field label="CPF (não editável)" value={form.cpf} readOnly icon={<Shield size={14} />} />
          <Field label="Telefone" value={form.telefone} onChange={v => set('telefone', phoneMask(v))} icon={<Phone size={14} />} placeholder="(00) 00000-0000" />
          <Field label="Data de nascimento" value={form.nascimento} onChange={v => set('nascimento', v)} type="date" icon={<Calendar size={14} />} />
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--gpfx-text-muted)' }}>País</label>
            <select value={form.pais} onChange={e => set('pais', e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm outline-none"
              style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)', color: 'var(--gpfx-text-primary)' }}>
              {['Brasil', 'Portugal', 'Estados Unidos', 'Reino Unido', 'Espanha', 'Alemanha', 'França', 'Japão', 'Outro'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Field label="Cidade" value={form.cidade} onChange={v => set('cidade', v)} icon={<MapPin size={14} />} />
        </div>
      </div>

      {/* Redes Sociais */}
      <div className="gpfx-card p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>REDES SOCIAIS</h4>
        <p className="text-xs" style={{ color: 'var(--gpfx-text-secondary)' }}>Clique para acessar seu perfil</p>

        <TooltipProvider delayDuration={200}>
          <div className="flex gap-3 flex-wrap">
            {socialNetworks.map(sn => {
              const url = form[sn.id as keyof typeof form];
              return (
                <Tooltip key={sn.id}>
                  <TooltipTrigger asChild>
                    <a
                      href={url || '#'}
                      target={url ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      onClick={e => { if (!url) e.preventDefault(); }}
                      className="flex items-center justify-center transition-all"
                      style={{
                        width: 44, height: 44,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        padding: 10,
                        color: 'var(--gpfx-text-secondary)',
                        cursor: url ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#00d395';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(0,211,149,0.1)';
                        (e.currentTarget as HTMLElement).style.color = '#00d395';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--gpfx-text-secondary)';
                      }}
                    >
                      {sn.icon}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent><span className="text-xs">{sn.name}</span></TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <button
          onClick={() => setShowLinks(!showLinks)}
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--gpfx-green)' }}
        >
          <ChevronDown size={14} className="transition-transform" style={{ transform: showLinks ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          {showLinks ? 'Fechar links' : 'Editar links'}
        </button>

        {showLinks && (
          <div className="space-y-3 pt-2">
            {socialNetworks.map(sn => (
              <Field
                key={sn.id}
                label={sn.name}
                value={form[sn.id as keyof typeof form]}
                onChange={v => set(sn.id, v)}
                placeholder="Cole o link do seu perfil"
                icon={<ExternalLink size={14} />}
              />
            ))}
            <button
              onClick={() => { setShowLinks(false); toast({ title: 'Links salvos!' }); }}
              className="px-6 h-9 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--gpfx-green)', color: '#0d1117' }}
            >
              Salvar links
            </button>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full md:w-auto px-8 h-11 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
        style={{ background: 'var(--gpfx-green)', color: '#0d1117', opacity: saving ? 0.7 : 1 }}>
        {saving && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
        Salvar Alterações
      </button>
    </div>
  );
}

// ─── Tab: Plano & Indicações ───
function TabPlano() {
  const { toast } = useToast();
  const currentPlan = 'basico';
  const code = 'GPFX-GUSTAVO';
  const referrals = [
    { nome: 'João Silva', data: '05/03/2026', status: 'Ativo', desconto: '10%' },
    { nome: 'Maria Costa', data: '20/02/2026', status: 'Pendente', desconto: '—' },
    { nome: 'Carlos Souza', data: '10/01/2026', status: 'Cancelado', desconto: '—' },
  ];

  const shareMsg = encodeURIComponent(`Use meu código ${code} e ganhe desconto no Gustavo Pedrosa FX! Acesse: fx.hubnexusai.com`);
  const copyCode = () => { navigator.clipboard.writeText(code); toast({ title: 'Código copiado!' }); };

  const plans = [
    {
      id: 'basico', title: 'Plano Básico', price: 'R$49,90', period: '/mês',
      features: ['Máximo 2 contas', 'Dashboard', 'Calendário', 'Trade Log', 'Contas Ativas'],
    },
    {
      id: 'intermediario', title: 'Plano Intermediário', price: 'R$69,90', period: '/mês', popular: true,
      features: ['Máximo 4 contas', 'Tudo do Básico', 'Evolução da Conta', 'TradingView Chart', 'Replay de Mercado'],
    },
    {
      id: 'avancado', title: 'Plano Avançado', price: 'R$99,00', period: '/mês',
      features: ['Máximo 10 contas', 'Tudo do Intermediário', 'Análise das Operações', 'IA do Trade', 'APIs & Automação'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Plano Atual */}
      <div className="gpfx-card p-6">
        <div className="flex items-center gap-3">
          <Crown size={24} style={{ color: 'var(--gpfx-green)' }} />
          <div>
            <h4 className="text-lg font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>Plano Atual</h4>
            <span className="inline-block px-3 py-1 rounded text-xs font-bold uppercase" style={{ background: 'rgba(0,211,149,0.15)', color: 'var(--gpfx-green)' }}>
              {plans.find(p => p.id === currentPlan)?.title ?? 'Básico'}
            </span>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isActive = plan.id === currentPlan;
          const isUpgrade = plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentPlan);
          const isDowngrade = plans.findIndex(p => p.id === plan.id) < plans.findIndex(p => p.id === currentPlan);

          return (
            <div key={plan.id} className="relative p-5 rounded-xl space-y-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: isActive ? '2px solid var(--gpfx-green)' : '1px solid var(--gpfx-border)',
                boxShadow: isActive ? '0 0 20px rgba(0,211,149,0.1)' : 'none',
              }}>
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                  style={{ background: 'var(--gpfx-green)', color: '#0d1117' }}>
                  Mais Popular
                </span>
              )}
              <h5 className="text-base font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>{plan.title}</h5>
              <p className="text-2xl font-extrabold" style={{ color: isActive ? 'var(--gpfx-green)' : 'var(--gpfx-text-primary)' }}>
                {plan.price}<span className="text-sm font-normal" style={{ color: 'var(--gpfx-text-muted)' }}>{plan.period}</span>
              </p>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2"><Check size={14} style={{ color: 'var(--gpfx-green)' }} />{f}</li>
                ))}
              </ul>
              {isActive ? (
                <button className="w-full h-10 rounded-lg text-sm font-semibold cursor-default"
                  style={{ background: 'rgba(0,211,149,0.15)', color: 'var(--gpfx-green)', border: '1px solid var(--gpfx-green)' }}>
                  Plano Atual
                </button>
              ) : isUpgrade ? (
                <button className="w-full h-10 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gpfx-green)', color: '#0d1117' }}>
                  Assinar
                </button>
              ) : (
                <button className="w-full h-10 rounded-lg text-sm font-semibold"
                  style={{ color: 'var(--gpfx-text-muted)', border: '1px solid var(--gpfx-border)' }}>
                  Fazer Downgrade
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Cupom de Indicação */}
      <div className="gpfx-card p-6 space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>SEU CÓDIGO DE INDICAÇÃO</h4>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ border: '1px solid var(--gpfx-green)', background: 'rgba(0,211,149,0.05)' }}>
          <code className="flex-1 text-lg font-mono font-bold" style={{ color: 'var(--gpfx-green)' }}>{code}</code>
          <button onClick={copyCode} className="p-2 rounded hover:opacity-80" style={{ color: 'var(--gpfx-green)' }}><Copy size={18} /></button>
        </div>

        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>Compartilhar</h5>
          <div className="flex gap-2 flex-wrap">
            <ShareBtn label="WhatsApp" bg="#25D366" href={`https://wa.me/?text=${shareMsg}`} />
            <ShareBtn label="𝕏 Twitter" bg="rgba(255,255,255,0.1)" textColor="var(--gpfx-text-secondary)" href={`https://twitter.com/intent/tweet?text=${shareMsg}`} />
            <ShareBtn label="Telegram" bg="#0088cc" href={`https://t.me/share/url?url=fx.hubnexusai.com&text=${shareMsg}`} />
            <button onClick={() => { navigator.clipboard.writeText(`fx.hubnexusai.com?ref=${code}`); toast({ title: 'Link copiado!' }); }}
              className="px-3 h-8 rounded text-xs font-semibold flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--gpfx-text-secondary)' }}>
              <Copy size={12} /> Copiar link
            </button>
          </div>
        </div>

        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--gpfx-text-muted)' }}>SEU DESCONTO ATUAL</h5>
          <Progress value={20} className="h-2 mb-2" />
          <p className="text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>2 indicações · 20% de desconto</p>
          <p className="text-xs mt-1" style={{ color: 'var(--gpfx-text-muted)' }}>
            Cada indicação = 10% de desconto. Máximo 100% com 10 indicações. Não acumulativo com outras promoções.
          </p>
        </div>

        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--gpfx-text-muted)' }}>Histórico de Indicações</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: 'var(--gpfx-text-muted)' }}>
                <th className="pb-2 font-medium">Nome</th><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Desconto</th>
              </tr></thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={i} style={{ color: 'var(--gpfx-text-secondary)', borderTop: '1px solid var(--gpfx-border)' }}>
                    <td className="py-2">{r.nome}</td><td className="py-2">{r.data}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                        background: r.status === 'Ativo' ? 'rgba(0,211,149,0.15)' : r.status === 'Pendente' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: r.status === 'Ativo' ? 'var(--gpfx-green)' : r.status === 'Pendente' ? 'var(--gpfx-amber)' : '#ff4d4d',
                      }}>{r.status}</span>
                    </td>
                    <td className="py-2">{r.desconto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Preferências ───
function TabPreferencias() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({ idioma: 'pt-BR', fuso: 'UTC-3', moeda: 'USD' });

  const handleSave = () => { setSaving(true); setTimeout(() => { setSaving(false); toast({ title: 'Preferências salvas!' }); }, 1000); };

  return (
    <div className="space-y-6">
      <div className="gpfx-card p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>Aparência</h4>
        <ToggleRow label={theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'} icon={<Palette size={16} />} checked={theme === 'dark'} onChange={toggleTheme} />
      </div>

      <div className="gpfx-card p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>Localização</h4>
        <SelectRow label="Idioma" icon={<Languages size={16} />} value={prefs.idioma} options={['pt-BR', 'en', 'es']} labels={['Português (BR)', 'English', 'Español']} onChange={v => setPrefs(p => ({ ...p, idioma: v }))} />
        <SelectRow label="Fuso Horário" icon={<Clock size={16} />} value={prefs.fuso}
          options={['UTC-12','UTC-11','UTC-10','UTC-9','UTC-8','UTC-7','UTC-6','UTC-5','UTC-4','UTC-3','UTC-2','UTC-1','UTC+0','UTC+1','UTC+2','UTC+3','UTC+4','UTC+5','UTC+6','UTC+7','UTC+8','UTC+9','UTC+10','UTC+11','UTC+12']}
          onChange={v => setPrefs(p => ({ ...p, fuso: v }))} />
        <SelectRow label="Moeda Padrão" icon={<DollarSign size={16} />} value={prefs.moeda} options={['USD', 'BRL', 'EUR', 'GBP']} onChange={v => setPrefs(p => ({ ...p, moeda: v }))} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full md:w-auto px-8 h-11 rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
        style={{ background: 'var(--gpfx-green)', color: '#0d1117', opacity: saving ? 0.7 : 1 }}>
        {saving && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
        Salvar Preferências
      </button>
    </div>
  );
}

// ─── Tab: Segurança ───
function TabSeguranca() {
  const { toast } = useToast();
  const [showPw, setShowPw] = useState({ current: false, new_: false, confirm: false });
  const [pw, setPw] = useState({ current: '', new_: '', confirm: '' });
  const [twofa, setTwofa] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const str = passwordStrength(pw.new_);

  const sessions = [
    { device: 'Chrome · Windows', local: 'Recife, BR', time: 'Agora', icon: <Monitor size={16} /> },
    { device: 'Safari · iPhone', local: 'Recife, BR', time: 'Há 2 dias', icon: <Smartphone size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Alterar Senha */}
      <div className="gpfx-card p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>Alterar Senha</h4>
        <PwField label="Senha Atual" value={pw.current} onChange={v => setPw(p => ({ ...p, current: v }))} show={showPw.current} toggle={() => setShowPw(p => ({ ...p, current: !p.current }))} />
        <div>
          <PwField label="Nova Senha" value={pw.new_} onChange={v => setPw(p => ({ ...p, new_: v }))} show={showPw.new_} toggle={() => setShowPw(p => ({ ...p, new_: !p.new_ }))} />
          {pw.new_ && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${str.pct}%`, background: str.color }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: str.color }}>{str.label}</span>
            </div>
          )}
        </div>
        <PwField label="Confirmar Nova Senha" value={pw.confirm} onChange={v => setPw(p => ({ ...p, confirm: v }))} show={showPw.confirm} toggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
        <button onClick={() => toast({ title: 'Senha alterada!' })}
          className="w-full md:w-auto px-6 h-10 rounded-lg font-semibold text-sm" style={{ background: 'var(--gpfx-green)', color: '#0d1117' }}>
          Alterar Senha
        </button>
      </div>

      {/* 2FA */}
      <div className="gpfx-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>Autenticação em 2 Fatores</h4>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(0,211,149,0.15)', color: 'var(--gpfx-green)' }}>Recomendado</span>
        </div>
        <ToggleRow label={twofa ? '2FA Ativado' : '2FA Desativado'} icon={<Shield size={16} />} checked={twofa} onChange={() => setTwofa(!twofa)} />
        {twofa && (
          <div className="space-y-3 p-4 rounded-lg" style={{ background: 'rgba(0,211,149,0.05)', border: '1px solid rgba(0,211,149,0.15)' }}>
            <div className="w-32 h-32 mx-auto rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <QrCode size={64} style={{ color: 'var(--gpfx-text-muted)' }} />
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--gpfx-text-muted)' }}>Use Google Authenticator ou Authy para escanear o QR Code</p>
            <input placeholder="Código do app" className="w-full h-10 rounded-lg px-3 text-sm text-center outline-none"
              style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)', color: 'var(--gpfx-text-primary)' }} />
          </div>
        )}
      </div>

      {/* Sessões Ativas */}
      <div className="gpfx-card p-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpfx-text-muted)' }}>Sessões Ativas</h4>
        <div className="space-y-3">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--gpfx-border)' }}>
              <span style={{ color: 'var(--gpfx-text-muted)' }}>{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--gpfx-text-primary)' }}>{s.device}</p>
                <p className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>{s.local} · {s.time}</p>
              </div>
              {i > 0 && <button className="px-2 py-1 rounded text-[10px] font-semibold" style={{ color: '#ff4d4d', border: '1px solid rgba(239,68,68,0.3)' }}>Encerrar</button>}
            </div>
          ))}
        </div>
        <button className="text-xs font-semibold" style={{ color: '#ff4d4d' }}>Encerrar todas as outras sessões</button>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-xl space-y-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <h4 className="text-sm font-bold" style={{ color: '#ff4d4d' }}>Zona de Perigo</h4>
        <p className="text-xs" style={{ color: 'var(--gpfx-text-muted)' }}>Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.</p>
        <button onClick={() => setShowDeleteModal(true)}
          className="w-full md:w-auto px-4 h-9 rounded-lg text-sm font-semibold" style={{ color: '#ff4d4d', border: '1px solid rgba(239,68,68,0.4)' }}>
          Excluir minha conta
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 space-y-4" style={{ background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)' }}>
            <h3 className="text-lg font-bold" style={{ color: '#ff4d4d' }}>Excluir conta</h3>
            <p className="text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>Digite <strong>EXCLUIR</strong> para confirmar</p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm outline-none"
              style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)', color: 'var(--gpfx-text-primary)' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-10 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--gpfx-text-secondary)' }}>Cancelar</button>
              <button disabled={deleteConfirm !== 'EXCLUIR'} className="flex-1 h-10 rounded-lg text-sm font-semibold disabled:opacity-30" style={{ background: '#ff4d4d', color: '#fff' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable pieces ───
function Field({ label, value, onChange, icon, placeholder, type = 'text', readOnly = false, required = false }: {
  label: string; value: string; onChange?: (v: string) => void; icon?: React.ReactNode; placeholder?: string; type?: string; readOnly?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: readOnly ? 'rgba(255,255,255,0.3)' : 'var(--gpfx-text-muted)' }}>
        {label}{required && <span style={{ color: 'var(--gpfx-red)' }}> *</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gpfx-text-muted)' }}>{icon}</span>}
        <input type={type} value={value} readOnly={readOnly} placeholder={placeholder}
          onChange={e => onChange?.(e.target.value)}
          className="w-full h-10 rounded-lg text-sm outline-none transition-colors"
          style={{
            paddingLeft: icon ? 34 : 12, paddingRight: 12,
            background: readOnly ? 'rgba(255,255,255,0.02)' : 'var(--gpfx-input-bg)',
            border: '1px solid var(--gpfx-border)', color: readOnly ? 'rgba(255,255,255,0.3)' : 'var(--gpfx-text-primary)',
            cursor: readOnly ? 'not-allowed' : 'text',
          }} />
      </div>
    </div>
  );
}

function PwField({ label, value, onChange, show, toggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--gpfx-text-muted)' }}>{label}</label>
      <div className="relative">
        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gpfx-text-muted)' }} />
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          className="w-full h-10 rounded-lg text-sm outline-none"
          style={{ paddingLeft: 34, paddingRight: 40, background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)', color: 'var(--gpfx-text-primary)' }} />
        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--gpfx-text-muted)' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, icon, checked, onChange }: { label: string; icon: React.ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2" style={{ color: 'var(--gpfx-text-secondary)' }}>{icon}<span className="text-sm">{label}</span></div>
      <button onClick={onChange} className="w-10 h-5 rounded-full relative transition-colors"
        style={{ background: checked ? 'var(--gpfx-green)' : 'rgba(255,255,255,0.15)' }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: checked ? 20 : 2 }} />
      </button>
    </div>
  );
}

function SelectRow({ label, icon, value, options, labels, onChange }: { label: string; icon: React.ReactNode; value: string; options: string[]; labels?: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2" style={{ color: 'var(--gpfx-text-secondary)' }}>{icon}<span className="text-sm">{label}</span></div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 rounded-lg px-2 text-sm outline-none"
        style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)', color: 'var(--gpfx-text-primary)' }}>
        {options.map((o, i) => <option key={o} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </div>
  );
}

function ShareBtn({ label, bg, href, textColor }: { label: string; bg: string; href: string; textColor?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="px-3 h-8 rounded text-xs font-semibold flex items-center gap-1" style={{ background: bg, color: textColor || '#fff' }}>
      {label}
    </a>
  );
}

// ─── Main Page ───
export default function PerfilPage() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('perfil');

  const tabs = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'plano', label: 'Plano & Indicações' },
    { id: 'preferencias', label: 'Preferências' },
    { id: 'seguranca', label: 'Segurança' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <UserCircle size={28} style={{ color: 'var(--gpfx-green)' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>Meu Perfil</h1>
          <p className="text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>Gerencie suas informações e preferências</p>
        </div>
      </div>

      {isMobile ? (
        <select value={activeTab} onChange={e => setActiveTab(e.target.value)}
          className="w-full h-10 rounded-lg px-3 text-sm outline-none"
          style={{ background: 'var(--gpfx-input-bg)', border: '1px solid var(--gpfx-border)', color: 'var(--gpfx-text-primary)' }}>
          {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: activeTab === t.id ? 'rgba(0,211,149,0.15)' : 'transparent',
                color: activeTab === t.id ? 'var(--gpfx-green)' : 'var(--gpfx-text-muted)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'perfil' && <TabPerfil />}
      {activeTab === 'plano' && <TabPlano />}
      {activeTab === 'preferencias' && <TabPreferencias />}
      {activeTab === 'seguranca' && <TabSeguranca />}
    </div>
  );
}
