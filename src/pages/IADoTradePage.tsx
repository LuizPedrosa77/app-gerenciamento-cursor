import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { Bot, Send, Paperclip, X, Target, Zap, Brain, AlertTriangle, TrendingUp, Trophy, BarChart2, CheckCircle2 } from 'lucide-react';

/* ───── Types ───── */
interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  fileName?: string;
  timestamp: Date;
}

/* ───── Sub-components ───── */

function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);

    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const nodes: { x: number; y: number; vx: number; vy: number; displayRadius: number }[] = [];
    for (let i = 0; i < 24; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        displayRadius: 2,
      });
    }

    let raf: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // lines between nodes
      ctx.lineWidth = 0.6;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.globalAlpha = (1 - dist / 180) * 0.15;
            ctx.strokeStyle = '#00ffb4';
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // compute distances to mouse & interpolate node sizes
      const distancesToMouse = nodes.map(n => {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        return Math.sqrt(dx * dx + dy * dy);
      });

      for (let i = 0; i < nodes.length; i++) {
        const d = distancesToMouse[i];
        const targetRadius = d < 80 ? 4 : 2;
        nodes[i].displayRadius += (targetRadius - nodes[i].displayRadius) * 0.15;
      }

      // dots
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const d = distancesToMouse[i];
        const targetAlpha = d < 80 ? 1.0 : 0.4;
        ctx.globalAlpha = 0.4 + (targetAlpha - 0.4) * Math.max(0, 1 - d / 80);
        ctx.fillStyle = '#00ffb4';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.displayRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // mouse interaction: lines to 2 closest nodes
      const indexed = distancesToMouse.map((d, i) => ({ d, i })).filter(v => v.d < 200).sort((a, b) => a.d - b.d).slice(0, 2);
      if (indexed.length > 0) {
        ctx.lineWidth = 1.5;
        for (const { d, i } of indexed) {
          ctx.globalAlpha = (1 - d / 200) * 0.6;
          ctx.strokeStyle = '#00ffb4';
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(nodes[i].x, nodes[i].y);
          ctx.stroke();
        }

        // mouse cursor glow dot
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#00ffb4';
        ctx.shadowColor = '#00ffb4';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,180,0.015) 2px, rgba(0,255,180,0.015) 4px)',
        }}
      />
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4 animate-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0" style={{ background: 'rgba(0,255,180,0.15)' }}>🤖</div>
      <div className="px-4 py-3 rounded-[4px_16px_16px_16px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full inline-block" style={{ background: '#00ffb4', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
      <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

const WEBHOOK_URL = 'https://webhook.hubnexusai.com/webhook/app-gerenciamento-fx';

const SUGGESTIONS = [
  'Analise meu desempenho este mês',
  'Quais são meus melhores pares?',
  'Onde estou errando mais?',
  'Qual meu melhor horário para operar?',
  'Como está minha gestão de risco?',
];

const QUICK_ANALYSES = [
  { icon: Target, label: 'Ver análise do mês', emoji: '🎯' },
  { icon: Zap, label: 'Melhores pares', emoji: '⚡' },
  { icon: Brain, label: 'Padrões detectados', emoji: '🧠' },
  { icon: AlertTriangle, label: 'Riscos identificados', emoji: '⚠️' },
];

/* ───── Main page ───── */
export default function IADoTradePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const sendMessage = useCallback(async (text: string, attachment?: File | null) => {
    if (!text.trim() && !attachment) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: text.trim(), fileName: attachment?.name, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFile(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', text.trim());
      formData.append('timestamp', new Date().toISOString());
      if (attachment) formData.append('file', attachment);

      const res = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
      const data = await res.json();
      const aiText = data.response || data.message || 'Sem resposta do servidor.';
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', text: aiText, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', text: 'Não consegui conectar ao servidor. Verifique o webhook do n8n.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const canSend = input.trim().length > 0 || file !== null;

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0d1117' }}>
      <NeuralBackground />

      {/* HEADER */}
      <header className="relative z-10 px-6 py-4 flex flex-col gap-3" style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bot size={28} style={{ color: '#00ffb4', filter: 'drop-shadow(0 0 8px rgba(0,255,180,0.6))' }} className="animate-pulse" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#e6fff5' }}>IA do Trade</h1>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#00ffb4', boxShadow: '0 0 6px #00ffb4' }} />
              Conectada aos seus dados
            </span>
          </div>
        </div>
        {/* quick metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Win Rate" value="68%" color="#00ffb4" />
          <StatCard label="P&L Mensal" value="+$2.340" color="#00c8ff" />
          <StatCard label="Trades" value="47" color="#a78bfa" />
          <StatCard label="Streak" value="5W" color="#f5c842" />
        </div>
      </header>

      {/* BODY */}
      <div className="relative z-10 flex" style={{ height: 'calc(100vh - 160px)' }}>
        {/* ─── Chat column ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 ia-scrollbar">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(0,255,180,0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>🤖</div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Como posso ajudar no seu trading hoje?</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => sendMessage(s)} className="px-3 py-1.5 rounded-full text-xs transition-colors" style={{ background: 'rgba(0,255,180,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#00ffb4' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,180,0.18)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,180,0.08)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`flex mb-4 animate-fade-in ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 mr-2" style={{ background: 'rgba(0,255,180,0.15)' }}>🤖</div>
                )}
                <div className="max-w-[70%]">
                  <div
                    className="px-4 py-3 text-sm whitespace-pre-wrap"
                    style={{
                      background: m.role === 'user' ? 'rgba(0,255,180,0.08)' : 'rgba(255,255,255,0.04)',
                      border: m.role === 'user' ? '1px solid rgba(0,200,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      color: 'rgba(255,255,255,0.88)',
                    }}
                  >
                    {m.text}
                    {m.fileName && <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>📎 {m.fileName}</p>}
                  </div>
                  <p className="text-[10px] mt-1 px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {m.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* input area */}
          <div className="px-4 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {file && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(0,255,180,0.08)', border: '1px solid rgba(255,255,255,0.08)', color: '#00ffb4' }}>
                📎 {file.name}
                <button onClick={() => setFile(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => fileInputRef.current?.click()} className="shrink-0 p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00ffb4'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}
              >
                <Paperclip size={18} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo sobre seu trading..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm"
                style={{ color: 'rgba(255,255,255,0.88)', maxHeight: 120 }}
              />
              <button
                onClick={() => sendMessage(input, file)}
                disabled={!canSend || loading}
                className="shrink-0 p-2 rounded-lg transition-all"
                style={{
                  background: canSend && !loading ? 'linear-gradient(135deg, #00ffb4, #00c8ff)' : 'rgba(255,255,255,0.06)',
                  color: canSend && !loading ? '#0d1117' : 'rgba(255,255,255,0.2)',
                  cursor: canSend && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-center mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>

        {/* ─── Right panel (hidden on small screens) ─── */}
        <aside className="hidden lg:flex flex-col gap-4 w-[260px] shrink-0 overflow-y-auto px-3 py-4 ia-scrollbar" style={{ background: '#151921', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Métricas */}
          <div>
            <p className="text-[11px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>Métricas Rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Win Rate" value="68%" color="#00ffb4" />
              <MiniStat label="P&L" value="+$2.3k" color="#00c8ff" />
              <MiniStat label="Sequência" value="5W" color="#f5c842" />
              <MiniStat label="Trades" value="47" color="#a78bfa" />
            </div>
          </div>

          {/* Análises rápidas */}
          <div>
            <p className="text-[11px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>Análises Rápidas</p>
            <div className="flex flex-col gap-1.5">
              {QUICK_ANALYSES.map(a => (
                <button
                  key={a.label}
                  onClick={() => sendMessage(a.label)}
                  className="flex items-center gap-2 text-xs text-left px-3 py-2 rounded-lg transition-colors"
                  style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,255,180,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1f2e'; }}
                >
                  <span>{a.emoji}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mt-auto rounded-xl p-3" style={{ background: 'rgba(0,255,180,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#00ffb4' }}>
              <CheckCircle2 size={14} />
              <span>n8n Conectado</span>
            </div>
          </div>
        </aside>
      </div>

      {/* bounce keyframe (injected once) */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .ia-scrollbar::-webkit-scrollbar { width: 4px; }
        .ia-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .ia-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,255,180,0.15); border-radius: 4px; }
      `}</style>
    </div>
  );
}

/* tiny stat for sidebar */
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[10px] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
