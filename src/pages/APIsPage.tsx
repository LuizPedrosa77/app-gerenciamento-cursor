import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Plug, Copy, Check, ChevronDown, Lock, CreditCard, BarChart3, Wallet, CalendarDays, LineChart, Cable, Clapperboard, Settings, ExternalLink } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'WS';
  path: string;
  description: string;
}

interface Section {
  icon: React.ReactNode;
  title: string;
  endpoints: Endpoint[];
}

const ENV_API_ROOT = import.meta.env.VITE_API_URL?.trim();
const FALLBACK_API_ROOT = typeof window !== 'undefined' ? window.location.origin : '';
const API_ROOT = (ENV_API_ROOT || FALLBACK_API_ROOT).replace(/\/+$/, '');
const BASE_URL = `${API_ROOT}/api/v1`;
const WS_BASE = API_ROOT.replace(/^http/, 'ws');

const sections: Section[] = [
  {
    icon: <Lock size={16} />,
    title: 'Autenticação',
    endpoints: [
      { method: 'POST', path: '/auth/register', description: 'Criar conta' },
      { method: 'POST', path: '/auth/login', description: 'Login e JWT' },
      { method: 'POST', path: '/auth/refresh', description: 'Renovar token' },
      { method: 'GET', path: '/auth/me', description: 'Usuário autenticado' },
      { method: 'POST', path: '/auth/logout', description: 'Logout' },
      { method: 'POST', path: '/auth/change-password', description: 'Alterar senha' },
      { method: 'POST', path: '/auth/forgot-password', description: 'Recuperação de senha' },
    ],
  },
  {
    icon: <CreditCard size={16} />,
    title: 'Contas',
    endpoints: [
      { method: 'GET', path: '/accounts', description: 'Listar contas' },
      { method: 'POST', path: '/accounts', description: 'Criar conta' },
      { method: 'GET', path: '/accounts/{id}', description: 'Detalhe da conta' },
      { method: 'PATCH', path: '/accounts/{id}', description: 'Atualizar conta' },
      { method: 'DELETE', path: '/accounts/{id}', description: 'Excluir conta' },
      { method: 'GET', path: '/accounts/total-balance', description: 'Saldo consolidado' },
    ],
  },
  {
    icon: <BarChart3 size={16} />,
    title: 'Trades & Screenshots',
    endpoints: [
      { method: 'GET', path: '/trades', description: 'Listar trades' },
      { method: 'GET', path: '/trades/chart-data', description: 'Trades para TradingView' },
      { method: 'POST', path: '/trades', description: 'Criar trade' },
      { method: 'PATCH', path: '/trades/{id}', description: 'Atualizar trade' },
      { method: 'DELETE', path: '/trades/{id}', description: 'Excluir trade' },
      { method: 'DELETE', path: '/trades/bulk?account_id={id}', description: 'Excluir todos os trades da conta' },
      { method: 'POST', path: '/screenshots/upload/{trade_id}', description: 'Upload screenshot' },
      { method: 'GET', path: '/screenshots/{trade_id}', description: 'Listar screenshots' },
      { method: 'DELETE', path: '/screenshots/{trade_id}/{filename}', description: 'Excluir screenshot' },
    ],
  },
  {
    icon: <Wallet size={16} />,
    title: 'Saques',
    endpoints: [
      { method: 'GET', path: '/withdrawals', description: 'Listar saques' },
      { method: 'POST', path: '/withdrawals', description: 'Criar saque' },
      { method: 'DELETE', path: '/withdrawals/{id}', description: 'Excluir saque' },
    ],
  },
  {
    icon: <CalendarDays size={16} />,
    title: 'Calendário & Notas',
    endpoints: [
      { method: 'GET', path: '/daily-notes', description: 'Listar notas diárias' },
      { method: 'POST', path: '/daily-notes', description: 'Criar/atualizar nota diária' },
      { method: 'PATCH', path: '/daily-notes/{id}', description: 'Editar nota diária' },
      { method: 'DELETE', path: '/daily-notes/{id}', description: 'Excluir nota diária' },
      { method: 'GET', path: '/calendar/data', description: 'Dados mensais' },
      { method: 'GET', path: '/calendar/summary', description: 'Resumo mensal' },
      { method: 'GET', path: '/calendar/streaks', description: 'Streaks' },
      { method: 'GET', path: '/calendar/heatmap', description: 'Heatmap anual' },
      { method: 'GET', path: '/calendar/goals', description: 'Metas' },
      { method: 'GET', path: '/calendar/goals/check', description: 'Status da meta' },
      { method: 'GET', path: '/calendar/events', description: 'Listar eventos' },
      { method: 'POST', path: '/calendar/events', description: 'Criar evento' },
      { method: 'DELETE', path: '/calendar/events/{event_id}', description: 'Excluir evento' },
      { method: 'GET', path: '/calendar/holidays', description: 'Feriados' },
      { method: 'GET', path: '/calendar/export', description: 'Exportação do calendário' },
    ],
  },
  {
    icon: <LineChart size={16} />,
    title: 'Dashboard & Relatórios',
    endpoints: [
      { method: 'GET', path: '/dashboard/stats', description: 'Resumo consolidado' },
      { method: 'GET', path: '/dashboard/monthly', description: 'Dados mensais' },
      { method: 'GET', path: '/dashboard/by-pair', description: 'Performance por par' },
      { method: 'GET', path: '/dashboard/by-weekday', description: 'Performance por dia' },
      { method: 'GET', path: '/dashboard/by-direction', description: 'BUY vs SELL' },
      { method: 'GET', path: '/dashboard/top-trades', description: 'Top trades' },
      { method: 'GET', path: '/dashboard/account-evolution', description: 'Evolução da conta' },
      { method: 'GET', path: '/reports/weekly', description: 'Relatório semanal' },
      { method: 'GET', path: '/reports/gp-score', description: 'GP Score' },
      { method: 'GET', path: '/reports/gp-score/history', description: 'Histórico GP Score' },
      { method: 'GET', path: '/reports/streaks', description: 'Streaks' },
      { method: 'GET', path: '/reports/best-day', description: 'Melhor dia' },
      { method: 'GET', path: '/reports/monthly-summary', description: 'Resumo mensal' },
      { method: 'GET', path: '/reports/risk-metrics', description: 'Métricas de risco' },
      { method: 'GET', path: '/reports/annual-summary', description: 'Resumo anual' },
      { method: 'GET', path: '/reports/notifications/goals', description: 'Notificações de metas' },
      { method: 'POST', path: '/reports/notifications/goals/{goal_id}/dismiss', description: 'Dispensar notificação' },
    ],
  },
  {
    icon: <Cable size={16} />,
    title: 'Corretoras & MetaApi',
    endpoints: [
      { method: 'GET', path: '/brokers', description: 'Listar conexões' },
      { method: 'POST', path: '/brokers/connect', description: 'Criar conexão' },
      { method: 'GET', path: '/brokers/{id}', description: 'Detalhe da conexão' },
      { method: 'PATCH', path: '/brokers/{id}', description: 'Atualizar conexão' },
      { method: 'DELETE', path: '/brokers/{id}/disconnect', description: 'Desconectar' },
      { method: 'GET', path: '/brokers/available', description: 'Corretoras disponíveis' },
      { method: 'POST', path: '/metaapi/connect', description: 'Conectar MetaApi' },
      { method: 'POST', path: '/metaapi/sync/{account_id}', description: 'Sync MetaApi' },
      { method: 'GET', path: '/metaapi/status/{account_id}', description: 'Status MetaApi' },
      { method: 'DELETE', path: '/metaapi/disconnect/{account_id}', description: 'Desconectar MetaApi' },
    ],
  },
  {
    icon: <Clapperboard size={16} />,
    title: 'Replay de Mercado',
    endpoints: [
      { method: 'POST', path: '/replay/sessions', description: 'Criar sessão de replay' },
      { method: 'GET', path: '/replay/sessions', description: 'Listar sessões' },
      { method: 'GET', path: '/replay/sessions/{id}', description: 'Detalhar sessão' },
      { method: 'DELETE', path: '/replay/sessions/{id}', description: 'Remover sessão' },
      { method: 'WS', path: '/replay/ws/{session_id}', description: 'Streaming do replay' },
    ],
  },
  {
    icon: <Cable size={16} />,
    title: 'Tempo Real',
    endpoints: [
      { method: 'WS', path: '/ws/trades?token={jwt}', description: 'Eventos trade_synced e trade_closed' },
    ],
  },
  {
    icon: <Settings size={16} />,
    title: 'MT5 EA',
    endpoints: [
      { method: 'POST', path: '/mt5-ea/sync', description: 'Sincronizar trades/posições do EA' },
      { method: 'POST', path: '/mt5-ea/open', description: 'Notificar abertura de posição' },
      { method: 'POST', path: '/mt5-ea/close', description: 'Notificar fechamento de posição' },
    ],
  },
];

const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  POST: { bg: 'rgba(0,211,149,0.15)', text: '#00d395' },
  PATCH: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  DELETE: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  WS: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1.5 rounded-md transition-colors"
      style={{ background: 'rgba(255,255,255,0.05)' }}
      title="Copiar"
    >
      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
    </button>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const mc = methodColors[ep.method];
  const fullUrl = ep.method === 'WS'
    ? `${WS_BASE}${ep.path.startsWith('/ws') ? '' : '/api/v1'}${ep.path}`
    : `${BASE_URL}${ep.path}`;
  const curl = ep.method === 'WS'
    ? `# WebSocket endpoint\n${fullUrl}`
    : `curl -X ${ep.method} "${fullUrl}"`;

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2 transition-colors hover:border-primary/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: open ? 'rgba(0,211,149,0.03)' : 'transparent' }}
      >
        <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide shrink-0" style={{ background: mc.bg, color: mc.text, minWidth: 52, textAlign: 'center' }}>
          {ep.method}
        </span>
        <code className="text-sm font-mono text-foreground/90 truncate">{ep.path}</code>
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">{ep.description}</span>
        <ChevronDown size={14} className="text-muted-foreground shrink-0 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <p className="text-sm text-muted-foreground">{ep.description}</p>
          <div className="flex items-start gap-2 p-2.5 rounded border border-border bg-background">
            <code className="text-xs break-all flex-1">{fullUrl}</code>
            <CopyButton text={fullUrl} />
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded border border-border bg-background">
            <code className="text-xs break-all flex-1 whitespace-pre-wrap">{curl}</code>
            <CopyButton text={curl} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function APIsPage() {
  const { theme } = useTheme();
  const [baseUrlCopied, setBaseUrlCopied] = useState(false);

  return (
    <div className="w-full min-h-screen main-content-bg p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(0,211,149,0.1)' }}>
              <Plug size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">APIs & Automação</h1>
              <p className="text-sm text-muted-foreground">Endpoints realmente usados hoje no sistema</p>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border"
          style={{
            background: theme === 'dark' ? 'rgba(0,211,149,0.04)' : 'rgba(0,211,149,0.06)',
            borderColor: 'rgba(0,211,149,0.2)',
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">BASE URL</span>
          <code className="text-sm font-mono text-foreground flex-1 break-all">{BASE_URL}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(BASE_URL);
              setBaseUrlCopied(true);
              setTimeout(() => setBaseUrlCopied(false), 1500);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(0,211,149,0.12)', color: '#00d395' }}
          >
            {baseUrlCopied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
          </button>
        </div>

        <div className="rounded-xl border border-border p-5 bg-card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-foreground">Autenticação padrão</span>
            <a href={`${API_ROOT}/docs`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              OpenAPI <ExternalLink size={12} />
            </a>
          </div>
          <div className="p-2.5 rounded border border-border bg-background text-xs font-mono">
            Authorization: Bearer {'{'}seu_token{'}'}
          </div>
        </div>

        <Accordion type="multiple" className="space-y-3">
          {sections.map((sec, i) => (
            <AccordionItem key={i} value={`section-${i}`} className="rounded-xl border border-border bg-card overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-accent/30 [&[data-state=open]]:border-b [&[data-state=open]]:border-border">
                <div className="flex items-center gap-3">
                  <span className="text-primary">{sec.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{sec.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,211,149,0.1)', color: '#00d395' }}>
                    {sec.endpoints.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pt-3 pb-4 space-y-2">
                {sec.endpoints.map((ep, j) => (
                  <EndpointCard key={j} ep={ep} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
