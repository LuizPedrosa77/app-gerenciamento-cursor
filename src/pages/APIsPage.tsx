import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Plug, Copy, Check, Shield, ChevronDown, Lock,
  CreditCard, BarChart3, Wallet, CalendarDays, LineChart,
  Cable, Clapperboard, Settings, ExternalLink
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/* ── types ── */
interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'WS';
  path: string;
  description: string;
  n8nExample: string;
  pythonExample: string;
}

interface Section {
  icon: React.ReactNode;
  title: string;
  endpoints: Endpoint[];
}

/* ── data ── */
const BASE_URL = 'https://api.hubnexusai.com/api/v1';

const sections: Section[] = [
  {
    icon: <Lock size={16} />,
    title: 'Autenticação',
    endpoints: [
      { method: 'POST', path: '/auth/register', description: 'Criar conta de usuário', n8nExample: `// HTTP Request Node\nMethod: POST\nURL: ${BASE_URL}/auth/register\nBody (JSON):\n{\n  "email": "user@email.com",\n  "password": "sua_senha"\n}`, pythonExample: `import requests\n\nres = requests.post(\n  "${BASE_URL}/auth/register",\n  json={"email": "user@email.com", "password": "sua_senha"}\n)\nprint(res.json())` },
      { method: 'POST', path: '/auth/login', description: 'Fazer login e obter token JWT', n8nExample: `// HTTP Request Node\nMethod: POST\nURL: ${BASE_URL}/auth/login\nBody (JSON):\n{\n  "email": "user@email.com",\n  "password": "sua_senha"\n}`, pythonExample: `import requests\n\nres = requests.post(\n  "${BASE_URL}/auth/login",\n  json={"email": "user@email.com", "password": "sua_senha"}\n)\ntoken = res.json()["token"]\nprint(token)` },
      { method: 'POST', path: '/auth/refresh', description: 'Renovar token de acesso', n8nExample: `// HTTP Request Node\nMethod: POST\nURL: ${BASE_URL}/auth/refresh\nHeaders:\n  Authorization: Bearer {token}`, pythonExample: `res = requests.post(\n  "${BASE_URL}/auth/refresh",\n  headers={"Authorization": f"Bearer {token}"}\n)\nprint(res.json())` },
      { method: 'GET', path: '/auth/me', description: 'Dados do usuário autenticado', n8nExample: `// HTTP Request Node\nMethod: GET\nURL: ${BASE_URL}/auth/me\nHeaders:\n  Authorization: Bearer {token}`, pythonExample: `res = requests.get(\n  "${BASE_URL}/auth/me",\n  headers={"Authorization": f"Bearer {token}"}\n)\nprint(res.json())` },
    ],
  },
  {
    icon: <CreditCard size={16} />,
    title: 'Contas de Trading',
    endpoints: [
      { method: 'GET', path: '/accounts', description: 'Listar todas as contas', n8nExample: `Method: GET\nURL: ${BASE_URL}/accounts\nHeaders:\n  Authorization: Bearer {token}`, pythonExample: `res = requests.get("${BASE_URL}/accounts", headers=headers)\nprint(res.json())` },
      { method: 'POST', path: '/accounts', description: 'Criar nova conta', n8nExample: `Method: POST\nURL: ${BASE_URL}/accounts\nBody: { "name": "Conta MT5", "broker": "IC Markets" }`, pythonExample: `res = requests.post("${BASE_URL}/accounts",\n  json={"name": "Conta MT5", "broker": "IC Markets"},\n  headers=headers)\nprint(res.json())` },
      { method: 'GET', path: '/accounts/{id}', description: 'Detalhes de uma conta', n8nExample: `Method: GET\nURL: ${BASE_URL}/accounts/{{account_id}}`, pythonExample: `res = requests.get(f"${BASE_URL}/accounts/{account_id}", headers=headers)` },
      { method: 'PATCH', path: '/accounts/{id}', description: 'Atualizar conta', n8nExample: `Method: PATCH\nURL: ${BASE_URL}/accounts/{{account_id}}\nBody: { "name": "Novo Nome" }`, pythonExample: `res = requests.patch(f"${BASE_URL}/accounts/{account_id}",\n  json={"name": "Novo Nome"}, headers=headers)` },
      { method: 'DELETE', path: '/accounts/{id}', description: 'Remover conta', n8nExample: `Method: DELETE\nURL: ${BASE_URL}/accounts/{{account_id}}`, pythonExample: `res = requests.delete(f"${BASE_URL}/accounts/{account_id}", headers=headers)` },
    ],
  },
  {
    icon: <BarChart3 size={16} />,
    title: 'Trades',
    endpoints: [
      { method: 'GET', path: '/accounts/{id}/trades', description: 'Listar trades da conta', n8nExample: `Method: GET\nURL: ${BASE_URL}/accounts/{{id}}/trades`, pythonExample: `res = requests.get(f"${BASE_URL}/accounts/{id}/trades", headers=headers)` },
      { method: 'POST', path: '/accounts/{id}/trades', description: 'Criar novo trade', n8nExample: `Method: POST\nURL: ${BASE_URL}/accounts/{{id}}/trades\nBody: { "pair": "EURUSD", "direction": "BUY", "result": 120.50 }`, pythonExample: `res = requests.post(f"${BASE_URL}/accounts/{id}/trades",\n  json={"pair": "EURUSD", "direction": "BUY", "result": 120.50},\n  headers=headers)` },
      { method: 'PATCH', path: '/accounts/{id}/trades/{id}', description: 'Atualizar trade', n8nExample: `Method: PATCH\nURL: ${BASE_URL}/accounts/{{id}}/trades/{{trade_id}}`, pythonExample: `res = requests.patch(f"${BASE_URL}/accounts/{id}/trades/{trade_id}",\n  json={"result": 150.00}, headers=headers)` },
      { method: 'DELETE', path: '/accounts/{id}/trades/{id}', description: 'Remover trade', n8nExample: `Method: DELETE\nURL: ${BASE_URL}/accounts/{{id}}/trades/{{trade_id}}`, pythonExample: `res = requests.delete(f"${BASE_URL}/accounts/{id}/trades/{trade_id}", headers=headers)` },
      { method: 'POST', path: '/trades/{id}/screenshot', description: 'Upload de imagem do trade', n8nExample: `Method: POST\nURL: ${BASE_URL}/trades/{{id}}/screenshot\nContent-Type: multipart/form-data\nBody: file (binary)`, pythonExample: `with open("trade.png", "rb") as f:\n  res = requests.post(f"${BASE_URL}/trades/{id}/screenshot",\n    files={"file": f}, headers=headers)` },
    ],
  },
  {
    icon: <Wallet size={16} />,
    title: 'Saques e Depósitos',
    endpoints: [
      { method: 'GET', path: '/accounts/{id}/withdrawals', description: 'Listar saques e depósitos', n8nExample: `Method: GET\nURL: ${BASE_URL}/accounts/{{id}}/withdrawals`, pythonExample: `res = requests.get(f"${BASE_URL}/accounts/{id}/withdrawals", headers=headers)` },
      { method: 'POST', path: '/accounts/{id}/withdrawals', description: 'Criar saque ou depósito', n8nExample: `Method: POST\nURL: ${BASE_URL}/accounts/{{id}}/withdrawals\nBody: { "type": "withdrawal", "amount": 500 }`, pythonExample: `res = requests.post(f"${BASE_URL}/accounts/{id}/withdrawals",\n  json={"type": "withdrawal", "amount": 500}, headers=headers)` },
      { method: 'DELETE', path: '/accounts/{id}/withdrawals/{id}', description: 'Remover registro', n8nExample: `Method: DELETE\nURL: ${BASE_URL}/accounts/{{id}}/withdrawals/{{wid}}`, pythonExample: `res = requests.delete(f"${BASE_URL}/accounts/{id}/withdrawals/{wid}", headers=headers)` },
    ],
  },
  {
    icon: <CalendarDays size={16} />,
    title: 'Notas Diárias',
    endpoints: [
      { method: 'GET', path: '/daily-notes', description: 'Listar notas diárias', n8nExample: `Method: GET\nURL: ${BASE_URL}/daily-notes`, pythonExample: `res = requests.get("${BASE_URL}/daily-notes", headers=headers)` },
      { method: 'POST', path: '/daily-notes', description: 'Criar nota diária', n8nExample: `Method: POST\nURL: ${BASE_URL}/daily-notes\nBody: { "date": "2025-01-15", "note": "Mercado volátil" }`, pythonExample: `res = requests.post("${BASE_URL}/daily-notes",\n  json={"date": "2025-01-15", "note": "Mercado volátil"},\n  headers=headers)` },
      { method: 'PATCH', path: '/daily-notes/{id}', description: 'Atualizar nota', n8nExample: `Method: PATCH\nURL: ${BASE_URL}/daily-notes/{{id}}`, pythonExample: `res = requests.patch(f"${BASE_URL}/daily-notes/{id}",\n  json={"note": "Atualizado"}, headers=headers)` },
      { method: 'DELETE', path: '/daily-notes/{id}', description: 'Remover nota', n8nExample: `Method: DELETE\nURL: ${BASE_URL}/daily-notes/{{id}}`, pythonExample: `res = requests.delete(f"${BASE_URL}/daily-notes/{id}", headers=headers)` },
    ],
  },
  {
    icon: <LineChart size={16} />,
    title: 'Dashboard & Relatórios',
    endpoints: [
      { method: 'GET', path: '/dashboard/summary', description: 'Resumo geral do dashboard', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/summary`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/summary", headers=headers)` },
      { method: 'GET', path: '/dashboard/monthly', description: 'P&L mensal detalhado', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/monthly`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/monthly", headers=headers)` },
      { method: 'GET', path: '/dashboard/by-pair', description: 'Estatísticas por ativo/par', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/by-pair`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/by-pair", headers=headers)` },
      { method: 'GET', path: '/dashboard/by-weekday', description: 'Estatísticas por dia da semana', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/by-weekday`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/by-weekday", headers=headers)` },
      { method: 'GET', path: '/dashboard/by-direction', description: 'Comparação BUY vs SELL', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/by-direction`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/by-direction", headers=headers)` },
      { method: 'GET', path: '/dashboard/top-trades', description: 'Melhores trades', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/top-trades`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/top-trades", headers=headers)` },
      { method: 'GET', path: '/dashboard/account-evolution', description: 'Evolução do saldo da conta', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/account-evolution`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/account-evolution", headers=headers)` },
      { method: 'GET', path: '/dashboard/weekly-report', description: 'Relatório semanal', n8nExample: `Method: GET\nURL: ${BASE_URL}/dashboard/weekly-report`, pythonExample: `res = requests.get("${BASE_URL}/dashboard/weekly-report", headers=headers)` },
    ],
  },
  {
    icon: <Cable size={16} />,
    title: 'Corretoras',
    endpoints: [
      { method: 'GET', path: '/brokers/connections', description: 'Listar conexões com corretoras', n8nExample: `Method: GET\nURL: ${BASE_URL}/brokers/connections`, pythonExample: `res = requests.get("${BASE_URL}/brokers/connections", headers=headers)` },
      { method: 'POST', path: '/brokers/connections', description: 'Criar nova conexão', n8nExample: `Method: POST\nURL: ${BASE_URL}/brokers/connections\nBody: { "platform": "MT5", "server": "...", "login": "..." }`, pythonExample: `res = requests.post("${BASE_URL}/brokers/connections",\n  json={"platform": "MT5", "server": "...", "login": "..."},\n  headers=headers)` },
      { method: 'POST', path: '/brokers/connections/{id}/test', description: 'Testar conexão', n8nExample: `Method: POST\nURL: ${BASE_URL}/brokers/connections/{{id}}/test`, pythonExample: `res = requests.post(f"${BASE_URL}/brokers/connections/{id}/test", headers=headers)` },
      { method: 'POST', path: '/brokers/connections/{id}/sync', description: 'Sincronizar trades', n8nExample: `Method: POST\nURL: ${BASE_URL}/brokers/connections/{{id}}/sync`, pythonExample: `res = requests.post(f"${BASE_URL}/brokers/connections/{id}/sync", headers=headers)` },
      { method: 'DELETE', path: '/brokers/connections/{id}', description: 'Remover conexão', n8nExample: `Method: DELETE\nURL: ${BASE_URL}/brokers/connections/{{id}}`, pythonExample: `res = requests.delete(f"${BASE_URL}/brokers/connections/{id}", headers=headers)` },
    ],
  },
  {
    icon: <Clapperboard size={16} />,
    title: 'Replay de Mercado',
    endpoints: [
      { method: 'POST', path: '/replay/sessions', description: 'Criar sessão de replay', n8nExample: `Method: POST\nURL: ${BASE_URL}/replay/sessions\nBody: { "pair": "EURUSD", "date": "2025-01-15" }`, pythonExample: `res = requests.post("${BASE_URL}/replay/sessions",\n  json={"pair": "EURUSD", "date": "2025-01-15"}, headers=headers)` },
      { method: 'GET', path: '/replay/sessions', description: 'Listar sessões de replay', n8nExample: `Method: GET\nURL: ${BASE_URL}/replay/sessions`, pythonExample: `res = requests.get("${BASE_URL}/replay/sessions", headers=headers)` },
      { method: 'POST', path: '/replay/sessions/{id}/start', description: 'Iniciar replay', n8nExample: `Method: POST\nURL: ${BASE_URL}/replay/sessions/{{id}}/start`, pythonExample: `res = requests.post(f"${BASE_URL}/replay/sessions/{id}/start", headers=headers)` },
      { method: 'POST', path: '/replay/sessions/{id}/pause', description: 'Pausar replay', n8nExample: `Method: POST\nURL: ${BASE_URL}/replay/sessions/{{id}}/pause`, pythonExample: `res = requests.post(f"${BASE_URL}/replay/sessions/{id}/pause", headers=headers)` },
      { method: 'POST', path: '/replay/sessions/{id}/stop', description: 'Parar replay', n8nExample: `Method: POST\nURL: ${BASE_URL}/replay/sessions/{{id}}/stop`, pythonExample: `res = requests.post(f"${BASE_URL}/replay/sessions/{id}/stop", headers=headers)` },
      { method: 'WS', path: '/ws/replay/{session_id}', description: 'WebSocket para streaming de dados', n8nExample: `// WebSocket não suportado diretamente no n8n.\n// Use um script Python ou Node.js para conectar.`, pythonExample: `import websockets, asyncio\n\nasync def replay():\n  async with websockets.connect(\n    "wss://api.hubnexusai.com/ws/replay/{session_id}"\n  ) as ws:\n    async for msg in ws:\n      print(msg)\n\nasyncio.run(replay())` },
    ],
  },
  {
    icon: <Settings size={16} />,
    title: 'Automação (n8n / Python)',
    endpoints: [
      { method: 'POST', path: '/internal/sync/account/{id}', description: 'Sincronizar conta específica', n8nExample: `Method: POST\nURL: ${BASE_URL}/internal/sync/account/{{id}}\nHeaders:\n  x-api-key: {sua_api_key}`, pythonExample: `res = requests.post(f"${BASE_URL}/internal/sync/account/{id}",\n  headers={"x-api-key": API_KEY})` },
      { method: 'POST', path: '/internal/sync/workspace/{id}', description: 'Sincronizar workspace inteiro', n8nExample: `Method: POST\nURL: ${BASE_URL}/internal/sync/workspace/{{id}}\nHeaders:\n  x-api-key: {sua_api_key}`, pythonExample: `res = requests.post(f"${BASE_URL}/internal/sync/workspace/{id}",\n  headers={"x-api-key": API_KEY})` },
      { method: 'GET', path: '/internal/health', description: 'Health check do sistema', n8nExample: `Method: GET\nURL: ${BASE_URL}/internal/health`, pythonExample: `res = requests.get("${BASE_URL}/internal/health")` },
      { method: 'GET', path: '/internal/status', description: 'Status detalhado do sistema', n8nExample: `Method: GET\nURL: ${BASE_URL}/internal/status`, pythonExample: `res = requests.get("${BASE_URL}/internal/status")` },
    ],
  },
];

/* ── helpers ── */
const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  POST: { bg: 'rgba(0,211,149,0.15)', text: '#00d395' },
  PATCH: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  DELETE: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  WS: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className="p-1.5 rounded-md transition-colors"
      style={{ background: 'rgba(255,255,255,0.05)' }}
      title="Copiar"
    >
      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative rounded-lg border border-border overflow-hidden mt-2">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-3 text-xs overflow-x-auto font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const mc = methodColors[ep.method];
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2 transition-colors hover:border-primary/20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: open ? 'rgba(0,211,149,0.03)' : 'transparent' }}
      >
        <span
          className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide shrink-0"
          style={{ background: mc.bg, color: mc.text, minWidth: 52, textAlign: 'center' }}
        >
          {ep.method}
        </span>
        <code className="text-sm font-mono text-foreground/90 truncate">{ep.path}</code>
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">{ep.description}</span>
        <ChevronDown
          size={14}
          className="text-muted-foreground shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <p className="text-sm text-muted-foreground sm:hidden">{ep.description}</p>
          <CodeBlock code={ep.n8nExample} lang="n8n — HTTP Request" />
          <CodeBlock code={ep.pythonExample} lang="Python — requests" />
        </div>
      )}
    </div>
  );
}

/* ── main page ── */
export default function APIsPage() {
  const { theme } = useTheme();
  const [baseUrlCopied, setBaseUrlCopied] = useState(false);

  const copyBaseUrl = () => {
    navigator.clipboard.writeText(BASE_URL);
    setBaseUrlCopied(true);
    setTimeout(() => setBaseUrlCopied(false), 1500);
  };

  return (
    <div className="w-full min-h-screen main-content-bg p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(0,211,149,0.1)' }}>
              <Plug size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">APIs & Automação</h1>
              <p className="text-sm text-muted-foreground">Integre o Gustavo Pedrosa FX com qualquer sistema externo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full sm:ml-auto shrink-0 w-fit" style={{ background: 'rgba(0,211,149,0.1)', border: '1px solid rgba(0,211,149,0.25)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse bg-primary" />
            <span className="text-xs font-semibold text-primary">API v1.0 — Online</span>
          </div>
        </div>

        {/* ── Base URL ── */}
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
            onClick={copyBaseUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(0,211,149,0.12)', color: '#00d395' }}
          >
            {baseUrlCopied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
          </button>
        </div>

        {/* ── Auth Card ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border p-5 bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Autenticação</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Todas as requisições autenticadas devem incluir o header:
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border font-mono text-xs text-foreground/80 bg-background">
              <span className="break-all">Authorization: Bearer {'{'}<span className="text-primary">seu_token</span>{'}'}</span>
              <CopyButton text="Authorization: Bearer {seu_token}" />
            </div>
            <a
              href="https://api.hubnexusai.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
            >
              Ver documentação completa <ExternalLink size={12} />
            </a>
          </div>

          {/* n8n quick start */}
          <div className="rounded-xl border border-border p-5 bg-card space-y-3">
            <h3 className="text-sm font-bold text-foreground">⚡ Quick Start — n8n</h3>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Obtenha seu API Key em configurações</li>
              <li>No n8n, use o node <strong>HTTP Request</strong></li>
              <li>Header: <code className="text-primary">Authorization: Bearer {'{'} token {'}'}</code></li>
              <li>Base URL: <code className="text-foreground/80">{BASE_URL}</code></li>
            </ol>
          </div>
        </div>

        {/* Python quick start */}
        <div className="rounded-xl border border-border p-5 bg-card space-y-3">
          <h3 className="text-sm font-bold text-foreground">🐍 Quick Start — Python</h3>
          <CodeBlock
            lang="python"
            code={`import requests

BASE = "${BASE_URL}"
TOKEN = "seu_token_aqui"
headers = {"Authorization": f"Bearer {TOKEN}"}

# Exemplo: listar contas
contas = requests.get(f"{BASE}/accounts", headers=headers)
print(contas.json())`}
          />
        </div>

        {/* ── Endpoint Sections ── */}
        <Accordion type="multiple" className="space-y-3">
          {sections.map((sec, i) => (
            <AccordionItem
              key={i}
              value={`section-${i}`}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-accent/30 [&[data-state=open]]:border-b [&[data-state=open]]:border-border">
                <div className="flex items-center gap-3">
                  <span className="text-primary">{sec.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{sec.title}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(0,211,149,0.1)', color: '#00d395' }}
                  >
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
