"use client";

import { useState, useEffect, useRef } from "react";

// â”€â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Stat   { value: string; label: string; color?: string }
interface Service{ num: string; title: string; desc: string; tags: string[] }
interface Result { num: string; label: string }
interface Testimonial { quote: string; name: string; role: string; metric: string }
interface PricingPlan { name: string; price: { monthly: number; annual: number }; desc: string; features: string[]; cta: string; highlight?: boolean }
interface FAQ { q: string; a: string }
type Page = "home" | "funcionalidades" | "precos" | "faq" | "empresa";

// â”€â”€â”€ DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DASHBOARD_STATS: Stat[] = [
  { value: "+$4.280", label: "P&L Mensal",  color: "ok"   },
  { value: "67,4%",   label: "Win Rate"                   },
  { value: "2,3",     label: "RR MÃ©dio",    color: "ok"   },
  { value: "86",      label: "GP Score",    color: "gold" },
];

const MARQUEE_ITEMS = [
  "ðŸ“Š Dashboard","ðŸ“ˆ EvoluÃ§Ã£o da Conta",
  "ðŸ”¬ AnÃ¡lise das OperaÃ§Ãµes","ðŸ“… CalendÃ¡rio",
  "ðŸ“‹ Trade Log","ðŸ“‰ TradingView Chart",
  "ðŸ¦ Contas Ativas","ðŸ¤– IA do Trade",
  "ðŸ”Œ APIs","ðŸ‘¤ Perfil",
];

// â”€â”€â”€ SIDEBAR ITEMS (novo menu atualizado) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SIDEBAR_ITEMS = [
  { icon: "ðŸ“Š", label: "Dashboard",              act: true  },
  { icon: "ðŸ“ˆ", label: "EvoluÃ§Ã£o da Conta",       act: false },
  { icon: "ðŸ”¬", label: "AnÃ¡lise das OperaÃ§Ãµes",   act: false },
  { icon: "ðŸ“…", label: "CalendÃ¡rio",              act: false },
  { icon: "ðŸ“‹", label: "Trade Log",               act: false },
  { icon: "ðŸ“‰", label: "TradingView Chart",        act: false },
  { icon: "ðŸ¦", label: "Contas Ativas",            act: false },
  { icon: "ðŸ¤–", label: "IA do Trade",             act: false },
  { icon: "ðŸ”Œ", label: "APIs",                    act: false },
  { icon: "ðŸ‘¤", label: "Perfil",                  act: false },
];

// Calendar days (28-day month grid)
const CAL_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const CAL_HEADERS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÃB"];

const SERVICES: Service[] = [
  { num:"01/", title:"Dashboard completo com 8 grÃ¡ficos",    desc:"Win rate, P&L diÃ¡rio, distribuiÃ§Ã£o por ativo, horÃ¡rio ideal de entrada â€” tudo em tempo real.",        tags:["SincronizaÃ§Ã£o automÃ¡tica","8 mÃ©tricas"] },
  { num:"02/", title:"CalendÃ¡rio com GP Score",               desc:"Cada dia recebe uma pontuaÃ§Ã£o baseada em disciplina, risco e resultado. Evolua de forma mensurÃ¡vel.", tags:["Score de disciplina"] },
  { num:"03/", title:"ConexÃ£o MT5, MT4 e cTrader",            desc:"Importe todas as suas operaÃ§Ãµes automaticamente. Sem planilhas, sem trabalho manual.",                tags:["Import automÃ¡tico"] },
  { num:"04/", title:"Replay de Mercado",                     desc:"Reviva qualquer operaÃ§Ã£o tick a tick. Treine, identifique padrÃµes e melhore suas entradas.",          tags:["Modo treinamento"] },
  { num:"05/", title:"IA do Trade para anÃ¡lise inteligente",  desc:"Nossa IA analisa seus padrÃµes de comportamento e sugere melhorias especÃ­ficas para o seu estilo.",    tags:["Powered by AI"] },
];

const RESULTS: Result[] = [
  { num:"+67%",   label:"aumento mÃ©dio no win rate apÃ³s 60 dias" },
  { num:"2.400+", label:"traders profissionais ativos"           },
  { num:"âˆ’45%",   label:"reduÃ§Ã£o no drawdown mensal"             },
  { num:"4.9â˜…",   label:"avaliaÃ§Ã£o mÃ©dia dos usuÃ¡rios"           },
];

const TESTIMONIALS: Testimonial[] = [
  { quote:"O GP Score mudou minha visÃ£o sobre disciplina. Os dados mostraram onde eu estava errando.", name:"Rafael Cunha",   role:"Trader Forex Â· 3 anos",  metric:"+34% no win rate em 60 dias" },
  { quote:"A conexÃ£o com MT5 Ã© perfeita. Zero trabalho manual. O replay me ajudou a melhorar muito.", name:"Ana Martins",    role:"Prop Trader Â· FTMO",     metric:"Passou na avaliaÃ§Ã£o FTMO na 2Âª tentativa" },
  { quote:"A IA identificou que perco mais nos primeiros 30 min. Mudei e os resultados melhoraram.",   name:"Lucas Ferreira", role:"Day Trader Â· Ãndices",   metric:"Drawdown reduzido em 45%" },
];

const PRICING_PLANS: PricingPlan[] = [
  { name:"Starter", price:{monthly:0,annual:0},   desc:"Para traders que estÃ£o comeÃ§ando a controlar suas mÃ©tricas.",          features:["Dashboard bÃ¡sico (4 grÃ¡ficos)","ConexÃ£o com 1 corretora","GP Score mensal","HistÃ³rico de 30 dias"], cta:"Criar conta agora" },
  { name:"Pro",     price:{monthly:97,annual:77},  desc:"Para traders sÃ©rios que querem evoluir de forma consistente.",          features:["Dashboard completo (8 grÃ¡ficos)","ConexÃ£o ilimitada com corretoras","GP Score diÃ¡rio + calendÃ¡rio","IA do Trade","Replay de Mercado","RelatÃ³rios automÃ¡ticos","HistÃ³rico ilimitado"], cta:"ComeÃ§ar 7 dias grÃ¡tis", highlight:true },
  { name:"Elite",   price:{monthly:197,annual:157},desc:"Para prop traders e profissionais que exigem o mÃ¡ximo.",                features:["Tudo do Pro","AnÃ¡lise multi-conta","RelatÃ³rios personalizados","Suporte prioritÃ¡rio","API de integraÃ§Ã£o","Onboarding individual"], cta:"Falar com especialista" },
];

const FAQS: FAQ[] = [
  { q:"Como funciona a conexÃ£o com MT5/MT4/cTrader?",           a:"A integraÃ§Ã£o Ã© feita via plugin. ApÃ³s a instalaÃ§Ã£o, todas as operaÃ§Ãµes sÃ£o sincronizadas automaticamente em tempo real." },
  { q:"Preciso de cartÃ£o de crÃ©dito para testar?",              a:"NÃ£o. O plano Starter Ã© gratuito para sempre. O perÃ­odo de 7 dias grÃ¡tis do Pro tambÃ©m nÃ£o exige cartÃ£o." },
  { q:"O que Ã© o GP Score?",                                    a:"GP Score Ã© nossa mÃ©trica proprietÃ¡ria que avalia cada dia de trading com uma pontuaÃ§Ã£o de 0 a 100, baseada em disciplina, gestÃ£o de risco e resultado." },
  { q:"A IA do Trade funciona com qualquer estilo de trading?",  a:"Sim. A IA analisa seus prÃ³prios dados e aprende o seu estilo â€” seja scalping, day trade ou swing trade." },
  { q:"Posso cancelar a qualquer momento?",                     a:"Sim, sem burocracia. VocÃª cancela pela prÃ³pria plataforma. Seus dados ficam disponÃ­veis por 90 dias apÃ³s o cancelamento." },
  { q:"A plataforma funciona com corretoras brasileiras?",      a:"Sim. Qualquer corretora que opere com MT5, MT4 ou cTrader Ã© compatÃ­vel, incluindo as principais do mercado brasileiro." },
];

// â”€â”€â”€ HOOKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add("vis"); io.unobserve(e.target); } }),
      { threshold:0.1 }
    );
    document.querySelectorAll(".sr,.sr-l").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useCustomCursor() {
  const curRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mx=0,my=0,rx=0,ry=0;
    const onMove = (e:MouseEvent) => {
      mx=e.clientX; my=e.clientY;
      if(curRef.current){ curRef.current.style.left=mx+"px"; curRef.current.style.top=my+"px"; }
    };
    const tick = setInterval(() => {
      rx+=(mx-rx)*.1; ry+=(my-ry)*.1;
      if(ringRef.current){ ringRef.current.style.left=rx+"px"; ringRef.current.style.top=ry+"px"; }
    },16);
    document.addEventListener("mousemove",onMove);
    return () => { document.removeEventListener("mousemove",onMove); clearInterval(tick); };
  },[]);
  return { curRef, ringRef };
}

// â”€â”€â”€ ATOMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Eyebrow  = ({ children }: { children: React.ReactNode }) => <span className="eyebrow">{children}</span>;
const SecTitle = ({ children }: { children: React.ReactNode }) => <h2 className="sec-title">{children}</h2>;

// â”€â”€â”€ WHATSAPP BUTTON â€” global, appears on all pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WhatsAppBtn() {
  const phone = "5581989224862";
  const msg   = encodeURIComponent("OlÃ¡! Gostaria de saber mais sobre o GP Trading Suite.");
  return (
    <a
      href={`https://wa.me/${phone}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-btn"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <span className="wa-label">Fale conosco!</span>
      <div className="wa-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.85L.057 23.617a.75.75 0 0 0 .918.932l5.919-1.553A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.933 0-3.742-.524-5.29-1.436l-.38-.224-3.936 1.032 1.001-3.85-.247-.395A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </div>
    </a>
  );
}

// â”€â”€â”€ NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Nav({ cur, go, onOpenLogin }: { cur:Page; go:(p:Page)=>void; onOpenLogin: ()=>void }) {
  const [mob, setMob] = useState(false);
  const [co,  setCo]  = useState(false);
  const [mco, setMco] = useState(false);

  useEffect(() => {
    const r = () => { if(window.innerWidth>=768) setMob(false); };
    window.addEventListener("resize",r);
    return () => window.removeEventListener("resize",r);
  },[]);

  const nav = [
    { label:"Funcionalidades", page:"funcionalidades" as Page },
    { label:"PreÃ§os",          page:"precos"          as Page },
    { label:"FAQ",             page:"faq"             as Page },
  ];

  return (
    <div className="nav-pill-wrap">
      <header className={`nav-pill${mob?" mobile-open":""}`}>
        <div className="nav-row">

          {/* Logo */}
          <button className="logo" onClick={() => { go("home"); setMob(false); }}>
            <div className="logo-icon">GP</div>
            <div>
              <span className="logo-name">Gustavo Pedrosa FX</span>
              <span className="logo-sub">Pro Trading Suite</span>
            </div>
          </button>

          {/* Desktop inner pill */}
          <div className="nav-center-wrap">
            <ul className="nav-inner-pill">
              {nav.map(l => (
                <li key={l.page}>
                  <button className={`nav-link${cur===l.page?" nav-link-active":""}`} onClick={() => go(l.page)}>
                    {l.label}
                  </button>
                </li>
              ))}
              {/* Empresa dropdown */}
              <li className="nav-dropdown-wrap" onMouseEnter={()=>setCo(true)} onMouseLeave={()=>setCo(false)}>
                <button className={`nav-link nav-link-btn${cur==="empresa"?" nav-link-active":""}`} aria-expanded={co}>
                  <span>Empresa</span>
                  <svg className={`nav-chevron${co?" open":""}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className={`nav-dropdown${co?" visible":""}`}>
                  <div className="nav-dropdown-inner">
                    <button className="nav-dropdown-item" onClick={()=>{ go("empresa"); setCo(false); }}>Sobre nÃ³s</button>
                    <a href="#contato" className="nav-dropdown-item">Contato</a>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="nav-cta-wrap">
            <button className="btn-outline" onClick={onOpenLogin}>Entrar</button>
            {/* â‘  "Criar conta agora" em todo o nav */}
            <a href="/register" className="btn-nav-gold">Criar conta agora</a>
          </div>

          {/* Hamburger */}
          <button className="nav-hamburger" onClick={()=>setMob(!mob)} aria-label="Menu">
            {mob
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
        </div>

        {/* Mobile drawer */}
        <div className={`nav-mobile-drawer${mob?" open":""}`}>
          <div className="nav-mobile-divider"/>
          <nav className="nav-mobile-nav">
            {nav.map(l => (
              <button key={l.page} className={`nav-mobile-link${cur===l.page?" nav-ml-act":""}`} onClick={()=>{ go(l.page); setMob(false); }}>
                {l.label}
              </button>
            ))}
            <div className="nav-mobile-accordion">
              <button className="nav-mobile-link nav-mobile-accordion-btn" onClick={()=>setMco(!mco)}>
                <span>Empresa</span>
                <svg className={`nav-chevron${mco?" open":""}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {mco && (
                <div className="nav-mobile-subnav">
                  <button className="nav-mobile-sublink" onClick={()=>{ go("empresa"); setMob(false); }}>Sobre nÃ³s</button>
                  <a href="#contato" className="nav-mobile-sublink">Contato</a>
                </div>
              )}
            </div>
          </nav>
          <div className="nav-mobile-divider"/>
          <div className="nav-mobile-footer">
            <button className="btn-outline" style={{flex:1,textAlign:"center"}} onClick={onOpenLogin}>Entrar</button>
            {/* â‘  mobile "Criar conta agora" */}
            <a href="/register" className="btn-nav-gold" style={{flex:1,textAlign:"center"}}>Criar conta agora</a>
          </div>
        </div>
      </header>
    </div>
  );
}

// â”€â”€â”€ CALENDAR MOCKUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â‘¡ CalendÃ¡rio recriado fiel Ã  imagem enviada
function CalendarMockup() {
  return (
    <div className="cal-wrap">
      <div className="cal-header-row">
        {CAL_HEADERS.map(h => <div key={h} className="cal-header-cell">{h}</div>)}
      </div>
      <div className="cal-grid">
        {CAL_DAYS.map(d => (
          <div key={d} className="cal-cell">
            <span className="cal-day-num">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ DASHBOARD MOCKUP â€” expanded + calendar below charts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DashMockup() {
  return (
    <div className="dash-wrap">
      <div className="dash">
        {/* Browser chrome bar */}
        <div className="dash-bar">
          <div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/>
          <div className="dash-url">app.gustavopedrosafx.com/dashboard</div>
        </div>

        <div className="dash-body">
          {/* â‘¢ Sidebar with updated menu items */}
          <div className="sidebar">
            {SIDEBAR_ITEMS.map(item => (
              <div key={item.label} className={`si${item.act?" act":""}`}>
                <div className="si-ic">{item.icon}</div>
                <span className="si-lbl">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="main-content">
            {/* Stats row */}
            <div className="stats-row">
              {DASHBOARD_STATS.map(s=>(
                <div key={s.label} className="stat-c">
                  <div className={`stat-v${s.color?" "+s.color:""}`}>{s.value}</div>
                  <div className="stat-l">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="charts-row">
              <div className="chart-c">
                <div className="chart-t">P&L por Dia</div>
                <div className="bars">
                  {[60,25,80,55,30,90,70,20,85,65].map((h,i)=>(
                    <div key={i} className={`b ${h>40?"b-u":"b-d"}`} style={{height:`${h}%`}}/>
                  ))}
                </div>
              </div>
              <div className="chart-c">
                <div className="chart-t">Equity Curve</div>
                <svg className="eq-svg" viewBox="0 0 200 44" preserveAspectRatio="none">
                  <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF6A" stopOpacity=".35"/><stop offset="100%" stopColor="#D4AF6A" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0,42 C20,38 40,36 60,30 S90,22 110,16 S150,8 200,3" fill="none" stroke="#D4AF6A" strokeWidth="1.5"/>
                  <path d="M0,42 C20,38 40,36 60,30 S90,22 110,16 S150,8 200,3 L200,44 L0,44Z" fill="url(#eg)"/>
                </svg>
              </div>
            </div>

            {/* â‘¡ Calendar below the two charts */}
            <div className="dash-calendar-section">
              <div className="dash-calendar-title">
                <span className="chart-t" style={{marginBottom:0}}>CalendÃ¡rio Â· GP Score</span>
                <span className="dash-cal-month">Junho 2025</span>
              </div>
              <CalendarMockup/>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ MARQUEE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Marquee() {
  const items = [...MARQUEE_ITEMS,...MARQUEE_ITEMS];
  return (
    <div className="marquee-sec">
      <p className="marquee-lbl">Tudo que vocÃª precisa em uma plataforma</p>
      <div style={{overflow:"hidden"}}>
        <div className="marquee-track">
          {items.map((item,i)=>(
            <span key={i} className="m-item">{item}{i<items.length-1&&<span className="m-sep"> Â· </span>}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ REUSABLE BLOCKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ServicesList({ onClick }: { onClick?: ()=>void }) {
  return (
    <div className="services-list">
      {SERVICES.map((s,i)=>(
        <div key={s.num} className={`service-row sr d${Math.min(i+1,4)}`}>
          <span className="srv-num">{s.num}</span>
          <div className="srv-body">
            <div className="srv-title">{s.title}</div>
            <div className="srv-desc">{s.desc}</div>
            <div className="srv-tags">{s.tags.map(t=><span key={t} className="srv-tag">{t}</span>)}</div>
          </div>
          <div className="srv-arrow" onClick={onClick} style={onClick?{cursor:"pointer"}:{}}>â†’</div>
        </div>
      ))}
    </div>
  );
}

function PricingBlock({ annual }: { annual: boolean }) {
  return (
    <div className="pricing-grid">
      {PRICING_PLANS.map((plan,i)=>(
        <div key={plan.name} className={`plan-card sr d${i+1}${plan.highlight?" highlight":""}`}>
          {plan.highlight && <div className="plan-badge">Mais popular</div>}
          <div className="plan-name">{plan.name}</div>
          <div className="plan-price">
            {plan.price.monthly===0
              ? <span className="p-val">GrÃ¡tis</span>
              : <><span className="p-curr">R$</span><span className="p-val">{annual?plan.price.annual:plan.price.monthly}</span><span className="p-per">/mÃªs</span></>
            }
          </div>
          {annual && plan.price.monthly>0 && (
            <p className="p-annual-note">cobrado anualmente Â· R${(annual?plan.price.annual:plan.price.monthly)*12}/ano</p>
          )}
          <p className="plan-desc">{plan.desc}</p>
          <a href="/register" className={`plan-cta${plan.highlight?" plan-cta-p":""}`}>{plan.cta}</a>
          <ul className="plan-features">
            {plan.features.map(f=><li key={f}><span className="feat-check">âœ“</span>{f}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function FAQList({ items }: { items: FAQ[] }) {
  const [open, setOpen] = useState<number|null>(null);
  return (
    <div className="faq-list">
      {items.map((item,i)=>(
        <div key={i} className={`faq-item sr d${Math.min(i+1,4)}${open===i?" open":""}`}>
          <button className="faq-q" onClick={()=>setOpen(open===i?null:i)}>
            <span>{item.q}</span>
            <span className="faq-icon">{open===i?"âˆ’":"+"}</span>
          </button>
          <div className="faq-a-wrap" style={{maxHeight:open===i?"400px":"0"}}>
            <p className="faq-a">{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InnerHero({ badge, title, sub }: { badge:string; title:React.ReactNode; sub:string }) {
  return (
    <section className="inner-hero">
      <div className="h-mesh"/><div className="h-orb-a" style={{opacity:.4}}/><div className="noise"/>
      <div className="inner-hero-content">
        <div className="badge sr"><div className="badge-dot"/>{badge}</div>
        <h1 className="inner-hero-title sr d1">{title}</h1>
        <p className="inner-hero-sub sr d2">{sub}</p>
      </div>
    </section>
  );
}

// â”€â”€â”€ HOME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HomePage({ go }: { go:(p:Page)=>void }) {
  useScrollReveal();
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="h-mesh"/><div className="h-orb-a"/><div className="h-orb-b"/><div className="noise"/>
        <div className="badge"><div className="badge-dot"/> Plataforma #1 para traders profissionais</div>
        <h1 className="hero-title">Gerencie suas operaÃ§Ãµes <b>com inteligÃªncia</b></h1>
        <p className="hero-sub">Dashboard completo, GP Score, IA para anÃ¡lise e conexÃ£o direta com MT5, MT4 e cTrader.</p>
        <div className="hero-btns">
          {/* â‘  "Criar conta agora" */}
          <a href="/register" className="btn-hg btn-hg-p">Criar conta agora</a>
          <button className="btn-hg btn-hg-s" onClick={()=>go("funcionalidades")}>Ver funcionalidades â†’</button>
        </div>
        <div className="hero-proof">
          <p className="proof-txt">Usado por <strong>+2.400 traders</strong> profissionais</p>
          <div className="hr-divider"/>
          <p className="proof-txt proof-stars">â˜…â˜…â˜…â˜…â˜… 4.9</p>
        </div>
        {/* â‘¡ Expanded DashMockup with calendar below */}
        <DashMockup/>
      </section>

      <Marquee/>

      {/* FEATURES PREVIEW */}
      <section className="services" id="features">
        <div className="sec-hd sr">
          <Eyebrow>Funcionalidades</Eyebrow>
          <SecTitle>Ferramentas que fazem a diferenÃ§a<br/><b>no seu trading</b></SecTitle>
        </div>
        <ServicesList onClick={()=>go("funcionalidades")}/>
        <div style={{textAlign:"center",marginTop:"40px"}}>
          <button className="btn-see-all" onClick={()=>go("funcionalidades")}>
            Ver demonstraÃ§Ã£o completa â†’
          </button>
        </div>
      </section>

      {/* RESULTS */}
      <section className="results">
        <div className="results-inner">
          <div className="sec-hd sr">
            <Eyebrow>Resultados reais</Eyebrow>
            <SecTitle>NÃºmeros que <b>falam por si</b></SecTitle>
          </div>
          <div className="results-grid">
            {RESULTS.map((r,i)=>(
              <div key={r.num} className={`result-block sr d${i+1}`}>
                <div className="r-num">{r.num}</div>
                <div className="r-divider"/>
                <div className="r-label">{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="test-inner">
          <div className="sec-hd sr">
            <Eyebrow>Depoimentos</Eyebrow>
            <SecTitle>O que dizem nossos <b>traders</b></SecTitle>
          </div>
          <div className="test-grid">
            {TESTIMONIALS.map((t,i)=>(
              <div key={t.name} className={`test-card sr d${i+1}`}>
                <div className="t-quote">"</div>
                <p className="t-txt">{t.quote}</p>
                <div className="t-name">{t.name}</div>
                <div className="t-role">{t.role}</div>
                <div className="t-metric">â€” {t.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner sr">
          <Eyebrow>Comece agora</Eyebrow>
          <h2 className="cta-title">Opere com <b>inteligÃªncia real</b></h2>
          <p className="cta-sub">Crie sua conta gratuitamente. Sem cartÃ£o de crÃ©dito. Conecte sua corretora em menos de 2 minutos.</p>
          <div className="cta-btns">
            {/* â‘  "Criar conta agora" */}
            <a href="/register" className="btn-hg btn-hg-p" style={{fontSize:"16px",padding:"15px 38px"}}>Criar conta agora</a>
            <button className="btn-hg btn-hg-s" onClick={()=>go("precos")}>Ver planos â†’</button>
          </div>
        </div>
      </section>
    </>
  );
}

// â”€â”€â”€ PAGE: FUNCIONALIDADES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FuncPage({ onOpenLogin }: { onOpenLogin: ()=>void }) {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero
        badge="Veja como funciona na prÃ¡tica"
        title={<>ConheÃ§a cada <b>funcionalidade</b><br/>da plataforma</>}
        sub="Do dashboard ao GP Score, da IA ao Replay â€” assista ao vÃ­deo e explore o sistema completo."
      />

      {/* VIDEO DEMO */}
      <section className="video-sec" id="demo">
        <div className="video-inner sr">
          <div className="sec-hd" style={{textAlign:"center",marginBottom:"40px"}}>
            <Eyebrow>DemonstraÃ§Ã£o</Eyebrow>
            <SecTitle>Veja a plataforma <b>em aÃ§Ã£o</b></SecTitle>
            <p className="sec-sub">ConheÃ§a todas as funcionalidades em menos de 3 minutos.</p>
          </div>
          <div className="yt-wrap">
            <div className="yt-frame">
              {/* âš ï¸ Substitua pelo seu ID do YouTube */}
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title="GP Trading Suite â€” DemonstraÃ§Ã£o"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* LISTA COMPLETA */}
      <section className="services" style={{paddingTop:"60px"}}>
        <div className="sec-hd sr">
          <Eyebrow>O que estÃ¡ incluÃ­do</Eyebrow>
          <SecTitle>Todas as ferramentas<br/><b>do seu lado</b></SecTitle>
        </div>
        <ServicesList/>
      </section>

      {/* GALERIA â€” placeholders */}
      <section className="gallery-sec">
        <div className="gallery-inner">
          <div className="sec-hd sr" style={{textAlign:"center"}}>
            <Eyebrow>Screenshots</Eyebrow>
            <SecTitle>Dentro da <b>plataforma</b></SecTitle>
            <p className="sec-sub">As imagens do sistema serÃ£o adicionadas em breve.</p>
          </div>
          <div className="gallery-grid sr d1">
            {[1,2,3,4].map(n=>(
              <div key={n} className="gallery-placeholder">
                <div className="gp-icon">ðŸ“¸</div>
                <p className="gp-txt">Screenshot {n}<br/><span>Aguardando imagem</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta" style={{paddingTop:"60px"}}>
        <div className="cta-inner sr">
          <Eyebrow>Pronto para comeÃ§ar?</Eyebrow>
          <h2 className="cta-title">Experimente <b>gratuitamente</b></h2>
          <p className="cta-sub">Crie sua conta e conecte sua corretora em menos de 2 minutos.</p>
          <div className="cta-btns">
            {/* â‘  "Criar conta agora" */}
            <a href="/register" className="btn-hg btn-hg-p" style={{fontSize:"16px",padding:"15px 38px"}}>Criar conta agora</a>
            <button className="btn-hg btn-hg-s" onClick={onOpenLogin}>JÃ¡ tenho conta â†’</button>
          </div>
        </div>
      </section>
    </main>
  );
}

// â”€â”€â”€ PAGE: PREÃ‡OS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PrecosPage() {
  const [annual, setAnnual] = useState(false);
  useScrollReveal();
  const priceFaqs: FAQ[] = [
    { q:"Preciso de cartÃ£o para comeÃ§ar?",           a:"NÃ£o. O plano Starter Ã© gratuito para sempre. Upgrade sÃ³ exige cartÃ£o se vocÃª decidir avanÃ§ar." },
    { q:"Posso trocar de plano a qualquer momento?", a:"Sim. Upgrade ou downgrade pela prÃ³pria plataforma, sem taxas extras." },
    { q:"O que acontece com meus dados se cancelar?",a:"Ficam disponÃ­veis para exportaÃ§Ã£o por 90 dias apÃ³s o cancelamento." },
    { q:"O plano Pro tem trial grÃ¡tis?",             a:"Sim, 7 dias grÃ¡tis sem cartÃ£o. Se nÃ£o gostar, simplesmente nÃ£o continue â€” sem cobranÃ§as." },
  ];
  return (
    <main className="page-main">
      <InnerHero
        badge="Sem taxa de setup Â· Cancele quando quiser"
        title={<>Planos que cabem no seu <b>estilo de trading</b></>}
        sub="Comece grÃ¡tis. FaÃ§a upgrade quando estiver pronto. Sem cartÃ£o de crÃ©dito para comeÃ§ar."
      />

      <section className="pricing-sec" id="precos" style={{paddingTop:"20px"}}>
        <div className="pricing-inner">
          <div className="sec-hd sr" style={{textAlign:"center"}}>
            <Eyebrow>PreÃ§os</Eyebrow>
            <SecTitle>Invista no seu <b>desenvolvimento</b></SecTitle>
            <p className="sec-sub">Escolha o plano ideal para o seu momento.</p>
            <div className="billing-toggle">
              <span className={!annual?"tog-act":""}>Mensal</span>
              <button className={`toggle-btn${annual?" on":""}`} onClick={()=>setAnnual(!annual)} aria-label="Anual">
                <div className="toggle-knob"/>
              </button>
              <span className={annual?"tog-act":""}>Anual <em className="save-badge">âˆ’20%</em></span>
            </div>
          </div>
          <PricingBlock annual={annual}/>
        </div>
      </section>

      <section className="faq-sec" style={{paddingTop:"60px",paddingBottom:"80px"}}>
        <div className="faq-inner">
          <div className="sec-hd sr" style={{textAlign:"center"}}>
            <Eyebrow>DÃºvidas sobre os planos</Eyebrow>
            <SecTitle>Perguntas sobre <b>preÃ§os</b></SecTitle>
          </div>
          <FAQList items={priceFaqs}/>
        </div>
      </section>
    </main>
  );
}

// â”€â”€â”€ PAGE: FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FAQPage() {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero
        badge="Respostas rÃ¡pidas e diretas"
        title={<>Perguntas <b>frequentes</b></>}
        sub="Tire todas as suas dÃºvidas sobre a plataforma, integraÃ§Ãµes e planos."
      />
      <section className="faq-sec" style={{paddingTop:"40px",paddingBottom:"100px",background:"var(--bg)"}}>
        <div className="faq-inner" style={{maxWidth:"860px"}}>
          <FAQList items={FAQS}/>
          <div className="faq-more sr" style={{marginTop:"32px"}}>
            <div className="faq-more-icon">ï¼‹</div>
            <p className="faq-more-txt">Mais perguntas serÃ£o adicionadas em breve.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

// â”€â”€â”€ PAGE: EMPRESA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmpresaPage() {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero
        badge="Nossa histÃ³ria"
        title={<>Por trÃ¡s da <b>plataforma</b></>}
        sub="Criada por traders, para traders. ConheÃ§a quem construiu o GP Trading Suite."
      />
      <section className="empresa-sec">
        <div className="empresa-inner">
          <div className="empresa-block sr">
            <div><Eyebrow>Nossa missÃ£o</Eyebrow></div>
            <div className="empresa-block-body">
              <SecTitle>Dados que <b>transformam</b> a forma de operar</SecTitle>
              <p className="empresa-txt">O GP Trading Suite nasceu da frustraÃ§Ã£o de traders que nÃ£o tinham ferramentas profissionais acessÃ­veis. Nossa missÃ£o Ã© dar a qualquer trader o mesmo arsenal analÃ­tico das mesas proprietÃ¡rias.</p>
              <p className="empresa-txt" style={{marginTop:"12px",opacity:.6}}>Este bloco serÃ¡ expandido com a histÃ³ria completa, fotos e informaÃ§Ãµes da equipe.</p>
            </div>
          </div>
          <div className="empresa-values sr d2">
            {[
              { icon:"ðŸ“Š", title:"Dados primeiro",        desc:"Toda decisÃ£o deve ser baseada em mÃ©tricas, nÃ£o em emoÃ§Ã£o." },
              { icon:"ðŸŽ¯", title:"Disciplina mensurÃ¡vel", desc:"O GP Score traduz comportamento em nÃºmeros claros e objetivos." },
              { icon:"ðŸ¤", title:"Trader no centro",      desc:"Cada funcionalidade foi criada a partir da dor real de quem opera." },
            ].map(v=>(
              <div key={v.title} className="empresa-value-card">
                <div className="empresa-value-icon">{v.icon}</div>
                <div className="empresa-value-title">{v.title}</div>
                <div className="empresa-value-desc">{v.desc}</div>
              </div>
            ))}
          </div>
          <div className="empresa-link-placeholder sr d3">
            <div style={{fontSize:"28px",opacity:.5}}>ðŸ”—</div>
            <p style={{fontSize:"13px",color:"var(--t4)",textAlign:"center",lineHeight:1.6,maxWidth:"480px"}}>
              Em breve: bloco na pÃ¡gina principal com link para esta seÃ§Ã£o "Empresa".
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

// â”€â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Footer({ go }: { go:(p:Page)=>void }) {
  return (
    <footer>
      <p>Â© 2025 Gustavo Pedrosa FX Â· Pro Trading Suite</p>
      <div className="foot-links">
        <button className="foot-btn" onClick={()=>go("empresa")}>Empresa</button>
        <button className="foot-btn" onClick={()=>go("precos")}>PreÃ§os</button>
        <a href="#">Termos</a>
        <a href="#">Privacidade</a>
        <a href="#">Suporte</a>
      </div>
    </footer>
  );
}

function LoginModal({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  if (!open) return null;
  return (
    <div
      className="login-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Login"
    >
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-head">
          <h3>Entrar</h3>
          <button className="login-close-btn" onClick={onClose} aria-label="Fechar">Ã—</button>
        </div>
        <p className="login-modal-sub">Acesse sua conta para continuar.</p>
        <div className="login-form">
          <label className="login-label">E-mail</label>
          <input type="email" className="login-input" placeholder="voce@email.com" />
          <label className="login-label">Senha</label>
          <input type="password" className="login-input" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
          <button className="login-submit-btn" onClick={onClose}>Entrar</button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ STYLES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
:root{
  --bg:#0A0A0C;--bg1:#111115;--bg2:#18181E;--bg3:#222228;
  --gold:#D4AF6A;--goldl:#E8CC90;--goldd:#B8952E;--goldm:rgba(212,175,106,.1);
  --ok:#5EC987;--err:#E85C5C;
  --t1:#F2F0EC;--t2:#C8C4BC;--t3:#807A72;--t4:#484440;--inv:#0A0A0C;
  --b0:rgba(255,255,255,.06);
  --bg_line:rgba(212,175,106,.35);
  --ggold:linear-gradient(135deg,#D4AF6A,#E8CC90,#B8952E);
  --gtext:linear-gradient(135deg,#E8CC90,#A8B4C8);
  --gmesh:radial-gradient(ellipse 70% 50% at 20% 35%,rgba(212,175,106,.1) 0%,transparent 55%),
          radial-gradient(ellipse 55% 40% at 80% 70%,rgba(168,180,200,.07) 0%,transparent 55%);
  --sc:0 24px 64px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.06);
  --sg:0 0 40px rgba(212,175,106,.28),0 0 80px rgba(212,175,106,.1);
  --ease:cubic-bezier(.25,.46,.45,.94);
  --spring:cubic-bezier(.34,1.56,.64,1);
  --reveal:cubic-bezier(.16,1,.3,1);
  --fd:'DM Serif Display',Georgia,serif;
  --fb:'DM Sans',sans-serif;
}
body{background:var(--bg);color:var(--t1);font-family:var(--fb);overflow-x:hidden;cursor:none}

/* â”€â”€ CURSOR â”€â”€ */
#cur{position:fixed;width:8px;height:8px;background:var(--gold);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);mix-blend-mode:difference;transition:width .15s,height .15s}
#cur-ring{position:fixed;width:30px;height:30px;border:1px solid rgba(212,175,106,.5);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:all .1s var(--ease)}
body.hov #cur{width:16px;height:16px}
body.hov #cur-ring{width:46px;height:46px;opacity:.35}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   â‘£ WHATSAPP FLOATING BUTTON
   â€” appears on all pages, bottom-right
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.wa-btn{
  position:fixed;bottom:28px;right:28px;z-index:500;
  display:flex;flex-direction:column;align-items:center;gap:6px;
  text-decoration:none;cursor:pointer;
}
.wa-label{
  background:rgba(18,18,33,.92);
  border:1px solid rgba(255,255,255,.12);
  backdrop-filter:blur(12px);
  color:#fff;font-family:var(--fb);font-size:11px;font-weight:600;
  padding:5px 12px;border-radius:20px;
  white-space:nowrap;
  box-shadow:0 4px 16px rgba(0,0,0,.4);
  transition:all .2s var(--ease);
  letter-spacing:.04em;
}
.wa-btn:hover .wa-label{background:rgba(37,211,102,.15);border-color:rgba(37,211,102,.4);color:#25D366}
.wa-icon{
  width:56px;height:56px;border-radius:50%;
  background:#25D366;
  display:flex;align-items:center;justify-content:center;
  color:#fff;
  box-shadow:0 4px 20px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.4);
  transition:all .25s var(--ease);
  animation:waPulse 2.8s ease-in-out infinite;
}
.wa-btn:hover .wa-icon{transform:scale(1.1);box-shadow:0 6px 28px rgba(37,211,102,.6),0 0 0 8px rgba(37,211,102,.15)}
@keyframes waPulse{
  0%,100%{box-shadow:0 4px 20px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.35)}
  50%{box-shadow:0 4px 20px rgba(37,211,102,.45),0 0 0 10px rgba(37,211,102,.0)}
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NAV PILL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.nav-pill-wrap{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:center;padding:16px clamp(.75rem,2vw,1.5rem) 0}
.nav-pill{width:100%;max-width:1152px;background:rgba(18,18,33,.95);backdrop-filter:blur(25px);border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden}
.nav-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;background:none;border:none;cursor:pointer;padding:0;flex-shrink:0}
.logo-icon{width:36px;height:36px;border-radius:8px;background:var(--ggold);display:flex;align-items:center;justify-content:center;font-family:var(--fb);font-weight:800;font-size:12px;color:var(--inv);flex-shrink:0}
.logo-name{font-family:var(--fd);font-size:15px;color:var(--t1);font-style:italic;display:block;white-space:nowrap}
.logo-sub{font-size:7.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);display:block}
.nav-center-wrap{display:flex;flex:1;justify-content:center;min-width:0}
.nav-inner-pill{display:flex;align-items:center;gap:2px;list-style:none;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:12px;box-shadow:inset 0 0 17px rgba(255,255,255,.04),0 5px 13px rgba(3,3,11,.12);padding:6px}
.nav-link{font-size:13.5px;font-weight:400;color:rgba(255,255,255,.72);text-decoration:none;white-space:nowrap;padding:7px 13px;border-radius:8px;border:1px solid transparent;transition:all .2s var(--ease);display:flex;align-items:center;gap:5px;background:transparent;cursor:pointer;font-family:var(--fb)}
.nav-link:hover,.nav-link-active{color:#fff;background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.10);box-shadow:inset -3px 0 16px rgba(255,255,255,.17),0 4px 10px rgba(0,0,11,.30)}
.nav-link-btn{background:none;border:1px solid transparent}
.nav-chevron{transition:transform .2s var(--ease);flex-shrink:0}
.nav-chevron.open{transform:rotate(180deg)}
.nav-dropdown-wrap{position:relative;list-style:none}
.nav-dropdown{position:absolute;left:50%;top:calc(100% + 8px);width:210px;transform:translateX(-50%) translateY(4px);opacity:0;visibility:hidden;pointer-events:none;transition:all .18s var(--ease);z-index:50}
.nav-dropdown.visible{opacity:1;visibility:visible;pointer-events:auto;transform:translateX(-50%) translateY(0)}
.nav-dropdown-inner{background:#1A1A29;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:8px;box-shadow:inset 0 0 17px rgba(255,255,255,.04),0 5px 13px rgba(3,3,11,.12)}
.nav-dropdown-item{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:8px;font-size:13px;font-family:var(--fb);color:rgba(255,255,255,.7);text-decoration:none;transition:all .15s;background:none;border:none;cursor:pointer}
.nav-dropdown-item:hover{background:rgba(255,255,255,.08);color:#fff}
.nav-cta-wrap{display:flex;align-items:center;gap:8px;flex-shrink:0}
.btn-outline{font-family:var(--fb);font-size:12px;font-weight:500;color:var(--t2);padding:8px 16px;border-radius:8px;border:1px solid rgba(212,175,106,.35);background:transparent;text-decoration:none;transition:all .2s;letter-spacing:.04em;white-space:nowrap;cursor:pointer}
.btn-outline:hover{background:var(--goldm)}
.btn-nav-gold{font-family:var(--fb);font-size:12px;font-weight:600;color:#fff;padding:9px 18px;border-radius:8px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.10);text-decoration:none;transition:all .2s;letter-spacing:.04em;white-space:nowrap;position:relative;overflow:hidden;cursor:pointer;box-shadow:inset -3px 0 16px rgba(255,255,255,.17),0 4px 10px rgba(0,0,11,.30)}
.btn-nav-gold:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.18)}
.nav-hamburger{display:none;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.75);padding:4px;border-radius:8px;transition:all .2s;align-items:center;justify-content:center}
.nav-hamburger:hover{color:#fff;background:rgba(255,255,255,.1)}
.nav-mobile-drawer{max-height:0;overflow:hidden;transition:max-height .3s var(--ease)}
.nav-mobile-drawer.open{max-height:600px}
.nav-mobile-divider{height:1px;background:rgba(255,255,255,.08);margin:0 16px}
.nav-mobile-nav{display:flex;flex-direction:column;gap:2px;padding:12px 12px 0}
.nav-mobile-link{font-size:15px;font-weight:400;color:rgba(255,255,255,.75);text-decoration:none;display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-radius:8px;transition:all .15s;background:none;border:none;cursor:pointer;font-family:var(--fb);width:100%;text-align:left}
.nav-mobile-link:hover,.nav-ml-act{color:#fff;background:rgba(255,255,255,.10);box-shadow:inset -3px 0 16px rgba(255,255,255,.10)}
.nav-mobile-accordion{width:100%}
.nav-mobile-accordion-btn{width:100%}
.nav-mobile-subnav{padding:4px 0 4px 12px;display:flex;flex-direction:column;gap:2px}
.nav-mobile-sublink{font-size:13px;color:rgba(255,255,255,.6);text-decoration:none;padding:7px 10px;border-radius:6px;transition:all .15s;display:block;background:none;border:none;cursor:pointer;font-family:var(--fb);width:100%;text-align:left}
.nav-mobile-sublink:hover{color:#fff;background:rgba(255,255,255,.07)}
.nav-mobile-footer{display:flex;gap:8px;padding:12px 12px 16px}
@media(max-width:767px){.nav-center-wrap{display:none}.nav-cta-wrap{display:none}.nav-hamburger{display:flex}.nav-row{padding:10px 14px}}
@media(min-width:768px){.nav-mobile-drawer{display:none !important}.nav-hamburger{display:none !important}}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PAGE SHELLS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.page-main{padding-top:90px}
.inner-hero{position:relative;overflow:hidden;padding:140px 24px 72px;text-align:center;display:flex;flex-direction:column;align-items:center}
.inner-hero-content{position:relative;z-index:1;max-width:760px}
.inner-hero-title{font-family:var(--fd);font-size:clamp(2.2rem,5vw,4.5rem);font-weight:400;line-height:1.05;letter-spacing:-.02em;font-style:italic;margin:20px 0 16px}
.inner-hero-title b{font-family:var(--fb);font-style:normal;font-weight:800;letter-spacing:-.04em;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.inner-hero-sub{font-size:clamp(1rem,2vw,1.15rem);color:var(--t3);line-height:1.7;font-weight:300;max-width:520px;margin:0 auto}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HERO
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:148px 24px 80px;position:relative;overflow:hidden}
.h-mesh{position:absolute;inset:0;background:var(--gmesh);pointer-events:none}
.h-orb-a{position:absolute;width:500px;height:500px;top:-20%;left:-5%;background:rgba(212,175,106,.07);border-radius:50%;filter:blur(120px);animation:orbF 9s ease-in-out infinite}
.h-orb-b{position:absolute;width:400px;height:400px;bottom:-15%;right:0%;background:rgba(168,180,200,.06);border-radius:50%;filter:blur(100px);animation:orbF 12s ease-in-out infinite reverse}
@keyframes orbF{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-15px)}}
.noise{position:absolute;inset:0;opacity:.45;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E")}
.badge{display:inline-flex;align-items:center;gap:8px;background:var(--goldm);border:1px solid var(--bg_line);border-radius:100px;padding:6px 14px 6px 10px;font-size:11px;font-weight:500;color:var(--goldl);margin-bottom:32px;position:relative;z-index:1;animation:fU .6s var(--reveal) both;letter-spacing:.05em}
.badge-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.hero-title{font-family:var(--fd);font-size:clamp(2.75rem,7vw,6rem);font-weight:400;line-height:1.04;letter-spacing:-.02em;max-width:860px;position:relative;z-index:1;margin-bottom:16px;animation:fU .6s .1s var(--reveal) both;font-style:italic}
.hero-title b{font-family:var(--fb);font-style:normal;font-weight:800;letter-spacing:-.04em;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:clamp(.95rem,2vw,1.2rem);color:var(--t3);max-width:560px;line-height:1.7;margin-bottom:40px;position:relative;z-index:1;font-weight:300;animation:fU .6s .2s var(--reveal) both}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;animation:fU .6s .3s var(--reveal) both}
.btn-hg{font-family:var(--fb);font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;transition:all .25s var(--ease);overflow:hidden;position:relative;cursor:pointer;display:inline-block;border:none}
.btn-hg::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);transition:left .4s}
.btn-hg:hover::before{left:100%}
.btn-hg-p{background:var(--ggold);color:var(--inv);box-shadow:0 4px 20px rgba(212,175,106,.3)}
.btn-hg-p:hover{transform:translateY(-3px);box-shadow:var(--sg)}
.btn-hg-s{background:rgba(255,255,255,.05);color:var(--t1);border:1px solid var(--bg_line)}
.btn-hg-s:hover{background:rgba(255,255,255,.09);transform:translateY(-2px)}
.hero-proof{display:flex;align-items:center;gap:12px;margin-top:40px;position:relative;z-index:1;animation:fU .6s .4s var(--reveal) both}
.hr-divider{width:1px;height:20px;background:var(--bg_line)}
.proof-txt{font-size:12px;color:var(--t3);font-style:italic}
.proof-txt strong{color:var(--goldl);font-style:normal}
.proof-stars{color:var(--goldl) !important}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DASHBOARD MOCKUP â€” expanded
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.dash-wrap{margin-top:56px;width:100%;max-width:1080px;position:relative;z-index:1;animation:fU .7s .5s var(--reveal) both}
.dash{background:var(--bg1);border:1px solid var(--bg_line);border-radius:16px;overflow:hidden;box-shadow:var(--sc),var(--sg)}
.dash-bar{display:flex;align-items:center;gap:6px;padding:12px 16px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--b0)}
.dot{width:9px;height:9px;border-radius:50%}.dot-r{background:#FF5F57}.dot-y{background:#FEBC2E}.dot-g{background:#28C840}
.dash-url{flex:1;background:rgba(255,255,255,.04);border-radius:5px;padding:4px 10px;font-size:10px;color:var(--t4);text-align:center;margin:0 16px;letter-spacing:.04em}
/* â‘¢ wider sidebar to fit new longer labels */
.dash-body{display:grid;grid-template-columns:172px 1fr;min-height:auto}
.sidebar{border-right:1px solid var(--b0);padding:12px 8px;display:flex;flex-direction:column;gap:2px}
.si{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:7px;font-size:10.5px;color:var(--t3);transition:all .2s;cursor:default;line-height:1.2}
.si.act{background:var(--goldm);color:var(--goldl)}
.si-ic{width:18px;height:18px;border-radius:4px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0}
.si.act .si-ic{background:rgba(212,175,106,.15)}
.si-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}
.main-content{padding:14px;display:flex;flex-direction:column;gap:10px}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.stat-c{background:rgba(255,255,255,.02);border:1px solid var(--b0);border-radius:8px;padding:10px 12px;transition:all .3s}
.stat-c:hover{border-color:var(--bg_line);transform:translateY(-2px)}
.stat-v{font-family:var(--fb);font-size:14px;font-weight:700;line-height:1;margin-bottom:3px;color:var(--t1)}
.stat-v.ok{color:var(--ok)}.stat-v.gold{color:var(--goldl);font-size:16px}
.stat-l{font-size:8.5px;color:var(--t4);font-weight:500;letter-spacing:.07em;text-transform:uppercase}
.charts-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.chart-c{background:rgba(255,255,255,.02);border:1px solid var(--b0);border-radius:8px;padding:10px 12px;height:100px;position:relative;overflow:hidden}
.chart-t{font-size:8.5px;color:var(--t4);font-weight:500;letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px;display:block}
.bars{display:flex;align-items:flex-end;gap:3px;height:58px}
.b{border-radius:2px 2px 0 0;flex:1;opacity:.8}.b-u{background:var(--ok)}.b-d{background:var(--err)}
.eq-svg{position:absolute;bottom:8px;left:12px;right:12px;height:44px}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   â‘¡ CALENDAR MOCKUP
   (fiel Ã  imagem enviada)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.dash-calendar-section{background:rgba(255,255,255,.015);border:1px solid var(--b0);border-radius:10px;padding:12px;margin-top:2px}
.dash-calendar-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.dash-cal-month{font-size:10px;font-weight:600;color:var(--gold);letter-spacing:.06em}
.cal-header-row{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px}
.cal-header-cell{font-size:9px;font-weight:600;color:var(--t4);text-align:center;letter-spacing:.08em;padding:2px 0}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-cell{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:7px;min-height:44px;padding:5px 6px;position:relative;transition:all .2s;cursor:default}
.cal-cell:hover{border-color:rgba(212,175,106,.3);background:rgba(212,175,106,.04)}
.cal-day-num{font-size:9.5px;font-weight:500;color:rgba(255,255,255,.45);line-height:1}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MARQUEE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.marquee-sec{padding:28px 0;border-top:1px solid var(--bg_line);border-bottom:1px solid var(--bg_line);background:rgba(212,175,106,.02);overflow:hidden}
.marquee-lbl{text-align:center;font-size:9px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.marquee-track{display:flex;gap:0;animation:marquee 28s linear infinite;width:max-content}
.m-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:400;color:var(--t3);white-space:nowrap;font-style:italic;padding:0 20px}
.m-sep{color:rgba(212,175,106,.3);font-size:16px}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* SHARED TYPOGRAPHY */
.eyebrow{font-size:9px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:block}
.sec-title{font-family:var(--fd);font-size:clamp(2rem,5vw,4rem);font-weight:400;line-height:1.05;color:var(--t1);font-style:italic}
.sec-title b{font-family:var(--fb);font-style:normal;font-weight:800;letter-spacing:-.03em;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sec-sub{font-size:15px;color:var(--t3);margin-top:12px;font-weight:300;line-height:1.6}
.sec-hd{margin-bottom:64px}

/* SERVICES */
.services{padding:100px 0;max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.services-list{display:flex;flex-direction:column}
.service-row{display:grid;grid-template-columns:80px 1fr auto;align-items:center;gap:24px;padding:28px 0;border-bottom:1px solid var(--b0);transition:all .25s var(--ease);cursor:default}
.service-row:first-child{border-top:1px solid var(--b0)}
.service-row:hover{padding-left:12px;border-color:var(--bg_line)}
.srv-num{font-family:var(--fb);font-size:11px;font-weight:600;color:var(--gold);letter-spacing:.1em}
.srv-title{font-family:var(--fb);font-size:18px;font-weight:700;color:var(--t1);margin-bottom:4px;letter-spacing:-.01em;transition:color .2s}
.service-row:hover .srv-title{color:var(--goldl)}
.srv-desc{font-size:13px;color:var(--t3);line-height:1.5;font-weight:300}
.srv-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.srv-tag{font-size:10px;font-weight:500;color:var(--gold);background:var(--goldm);border:1px solid var(--bg_line);border-radius:4px;padding:2px 7px;letter-spacing:.05em}
.srv-arrow{width:40px;height:40px;border-radius:50%;border:1px solid var(--bg_line);display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:16px;transition:all .25s var(--spring);flex-shrink:0}
.service-row:hover .srv-arrow{background:var(--gold);color:var(--inv);border-color:var(--gold);transform:rotate(45deg)}
.btn-see-all{font-family:var(--fb);font-size:14px;font-weight:500;color:var(--goldl);padding:10px 24px;border-radius:8px;border:1px solid var(--bg_line);background:var(--goldm);cursor:pointer;transition:all .2s}
.btn-see-all:hover{background:rgba(212,175,106,.18);transform:translateY(-2px)}

/* VIDEO */
.video-sec{padding:60px 0;background:var(--bg1);border-top:1px solid var(--bg_line);border-bottom:1px solid var(--bg_line)}
.video-inner{max-width:900px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.yt-wrap{position:relative}
.yt-wrap::before{content:'';position:absolute;inset:-1px;border-radius:17px;background:var(--ggold);z-index:0;opacity:.5;filter:blur(1px)}
.yt-frame{position:relative;z-index:1;border-radius:16px;overflow:hidden;aspect-ratio:16/9;box-shadow:var(--sc)}
.yt-frame iframe{width:100%;height:100%;border:none;display:block}

/* GALLERY */
.gallery-sec{padding:80px 0}
.gallery-inner{max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.gallery-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:48px}
.gallery-placeholder{background:var(--bg2);border:1px dashed var(--bg_line);border-radius:16px;aspect-ratio:16/9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;transition:all .3s}
.gallery-placeholder:hover{border-color:var(--gold);background:var(--goldm)}
.gp-icon{font-size:32px;opacity:.5}
.gp-txt{font-size:13px;color:var(--t4);text-align:center;line-height:1.5}
.gp-txt span{font-size:11px;opacity:.7}

/* RESULTS */
.results{padding:80px 0;background:var(--bg1);border-top:1px solid var(--bg_line);border-bottom:1px solid var(--bg_line)}
.results-inner{max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.results-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:48px;border:1px solid var(--bg_line)}
.result-block{padding:40px 28px;text-align:center;background:var(--bg);transition:all .3s}
.result-block:hover{background:var(--bg2)}
.r-num{font-family:var(--fd);font-size:clamp(2.5rem,5vw,4rem);font-weight:400;line-height:1;color:var(--goldl);margin-bottom:6px;font-style:italic}
.r-label{font-size:12px;color:var(--t3);line-height:1.5;font-weight:300}
.r-divider{width:32px;height:1px;background:var(--bg_line);margin:10px auto}

/* TESTIMONIALS */
.testimonials{padding:100px 0}
.test-inner{max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.test-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:48px;border:1px solid var(--b0)}
.test-card{background:var(--bg);padding:32px;transition:all .3s}
.test-card:hover{background:var(--bg2)}
.t-quote{font-family:var(--fd);font-size:40px;color:rgba(212,175,106,.2);line-height:1;margin-bottom:8px;font-style:italic}
.t-name{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:2px}
.t-role{font-size:11px;color:var(--gold);font-weight:500;letter-spacing:.05em;margin-bottom:12px}
.t-txt{font-size:13px;color:var(--t3);line-height:1.75;font-weight:300;font-style:italic;margin-bottom:16px}
.t-metric{font-size:12px;font-weight:700;color:var(--goldl)}

/* PRICING */
.pricing-sec{padding:80px 0}
.pricing-inner{max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.billing-toggle{display:flex;align-items:center;gap:12px;justify-content:center;margin-top:24px;font-size:13px;color:var(--t3)}
.tog-act{color:var(--t1);font-weight:600}
.toggle-btn{width:44px;height:24px;border-radius:100px;border:1px solid var(--bg_line);background:var(--bg2);cursor:pointer;position:relative;transition:background .25s;padding:0}
.toggle-btn.on{background:var(--goldm);border-color:var(--gold)}
.toggle-knob{width:16px;height:16px;border-radius:50%;background:var(--t3);position:absolute;top:3px;left:3px;transition:all .25s var(--spring)}
.toggle-btn.on .toggle-knob{left:23px;background:var(--gold)}
.save-badge{font-style:normal;font-size:10px;font-weight:700;background:var(--goldm);color:var(--goldl);border:1px solid var(--bg_line);border-radius:4px;padding:1px 6px;margin-left:4px}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:48px;border:1px solid var(--bg_line)}
.plan-card{background:var(--bg);padding:36px 32px;position:relative;transition:all .3s}
.plan-card:hover{background:var(--bg2)}.plan-card.highlight{background:var(--bg2)}
.plan-badge{position:absolute;top:20px;right:20px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--inv);background:var(--ggold);border-radius:4px;padding:3px 9px}
.plan-name{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.plan-price{display:flex;align-items:baseline;gap:2px;margin-bottom:4px}
.p-curr{font-size:16px;font-weight:600;color:var(--t2);margin-right:2px}
.p-val{font-family:var(--fd);font-size:clamp(2rem,4vw,3rem);font-weight:400;color:var(--t1);font-style:italic}
.p-per{font-size:13px;color:var(--t3);margin-left:4px}
.p-annual-note{font-size:11px;color:var(--t4);margin-bottom:4px;font-style:italic}
.plan-desc{font-size:13px;color:var(--t3);line-height:1.55;font-weight:300;margin-bottom:24px;min-height:48px}
.plan-cta{display:block;text-align:center;font-family:var(--fb);font-size:13px;font-weight:600;padding:11px 20px;border-radius:7px;border:1px solid var(--bg_line);color:var(--t2);background:transparent;text-decoration:none;transition:all .25s;letter-spacing:.04em;margin-bottom:28px}
.plan-cta:hover{background:var(--goldm);border-color:var(--gold);color:var(--goldl)}
.plan-cta-p{background:var(--ggold);color:var(--inv);border-color:transparent}
.plan-cta-p:hover{transform:translateY(-2px);box-shadow:var(--sg);background:var(--ggold);color:var(--inv)}
.plan-features{list-style:none;display:flex;flex-direction:column;gap:10px}
.plan-features li{font-size:13px;color:var(--t3);font-weight:300;display:flex;align-items:flex-start;gap:8px;line-height:1.4}
.feat-check{color:var(--ok);font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px}

/* FAQ */
.faq-sec{padding:80px 0;background:var(--bg1);border-top:1px solid var(--bg_line)}
.faq-inner{max-width:800px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.faq-list{display:flex;flex-direction:column}
.faq-item{border-bottom:1px solid var(--b0);transition:border-color .2s}.faq-item.open{border-color:var(--bg_line)}
.faq-q{width:100%;background:none;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:22px 0;gap:16px;text-align:left;color:var(--t1);font-family:var(--fb);font-size:15px;font-weight:500;transition:color .2s}
.faq-q:hover{color:var(--goldl)}.faq-item.open .faq-q{color:var(--goldl)}
.faq-icon{font-size:20px;font-weight:300;color:var(--gold);flex-shrink:0;transition:transform .25s var(--spring)}
.faq-item.open .faq-icon{transform:rotate(45deg)}
.faq-a-wrap{overflow:hidden;transition:max-height .35s var(--ease)}
.faq-a{font-size:14px;color:var(--t3);line-height:1.75;font-weight:300;padding-bottom:22px}
.faq-more{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px;background:var(--bg2);border:1px dashed var(--bg_line);border-radius:12px;text-align:center}
.faq-more-icon{font-size:28px;color:var(--gold);opacity:.6}
.faq-more-txt{font-size:13px;color:var(--t4)}

/* EMPRESA */
.empresa-sec{padding:80px 0 100px}
.empresa-inner{max-width:1100px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem);display:flex;flex-direction:column;gap:64px}
.empresa-block{display:grid;grid-template-columns:200px 1fr;gap:48px;align-items:start}
.empresa-block-body{display:flex;flex-direction:column;gap:16px}
.empresa-txt{font-size:15px;color:var(--t3);line-height:1.75;font-weight:300}
.empresa-values{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.empresa-value-card{background:var(--bg2);border:1px solid var(--b0);border-radius:14px;padding:28px;transition:all .3s}
.empresa-value-card:hover{border-color:var(--bg_line);transform:translateY(-4px)}
.empresa-value-icon{font-size:28px;margin-bottom:12px}
.empresa-value-title{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:6px}
.empresa-value-desc{font-size:13px;color:var(--t3);line-height:1.55;font-weight:300}
.empresa-link-placeholder{display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px;background:var(--bg2);border:1px dashed var(--bg_line);border-radius:16px}

/* CTA */
.cta{padding:100px 24px;text-align:center;position:relative;overflow:hidden}
.cta::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:500px;background:radial-gradient(ellipse,rgba(212,175,106,.07) 0%,transparent 65%);pointer-events:none}
.cta-inner{max-width:680px;margin:0 auto;position:relative;z-index:1}
.cta-title{font-family:var(--fd);font-size:clamp(2.5rem,6vw,5rem);font-weight:400;line-height:1.05;margin-bottom:16px;font-style:italic}
.cta-title b{font-family:var(--fb);font-style:normal;font-weight:800;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cta-sub{font-size:15px;color:var(--t3);margin-bottom:40px;line-height:1.65;font-weight:300}
.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

/* FOOTER */
footer{padding:32px clamp(1.5rem,4vw,4rem);border-top:1px solid var(--bg_line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;max-width:1200px;margin:0 auto}
footer p{font-size:12px;color:var(--t4);font-style:italic}
.foot-links{display:flex;gap:20px;align-items:center}
.foot-links a{font-size:12px;color:var(--t4);text-decoration:none;transition:color .2s;letter-spacing:.04em}
.foot-links a:hover{color:var(--goldl)}
.foot-btn{font-size:12px;color:var(--t4);background:none;border:none;cursor:pointer;font-family:var(--fb);transition:color .2s;padding:0;letter-spacing:.04em}
.foot-btn:hover{color:var(--goldl)}

.login-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.68);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1200;padding:16px}
.login-modal-card{width:100%;max-width:420px;background:rgba(17,17,21,.95);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:20px;box-shadow:0 24px 64px rgba(0,0,0,.55)}
.login-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.login-modal-head h3{font-size:22px;font-weight:700;color:var(--t1)}
.login-close-btn{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:transparent;color:var(--t2);cursor:pointer;font-size:20px;line-height:1}
.login-close-btn:hover{background:rgba(255,255,255,.08)}
.login-modal-sub{font-size:13px;color:var(--t3);margin-bottom:16px}
.login-form{display:flex;flex-direction:column;gap:8px}
.login-label{font-size:12px;color:var(--t2)}
.login-input{height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);padding:0 12px;color:var(--t1);outline:none}
.login-input:focus{border-color:var(--bg_line)}
.login-submit-btn{margin-top:8px;height:42px;border:none;border-radius:8px;background:var(--ggold);color:var(--inv);font-weight:700;cursor:pointer}
.login-submit-btn:hover{filter:brightness(1.04)}

/* SCROLL REVEAL */
.sr{opacity:0;transform:translateY(28px);transition:opacity .6s var(--reveal),transform .6s var(--reveal)}
.sr-l{opacity:0;transform:translateX(-28px);transition:opacity .6s var(--reveal),transform .6s var(--reveal)}
.sr.vis,.sr-l.vis{opacity:1;transform:none}
.d1{transition-delay:.1s}.d2{transition-delay:.2s}.d3{transition-delay:.3s}.d4{transition-delay:.4s}
@keyframes fU{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--bg_line);border-radius:100px}
::-webkit-scrollbar-thumb:hover{background:var(--gold)}
::selection{background:var(--goldm);color:var(--goldl)}

/* RESPONSIVE */
@media(max-width:900px){
  .dash-body{grid-template-columns:1fr}.sidebar{display:none}
  .results-grid{grid-template-columns:repeat(2,1fr)}
  .test-grid{grid-template-columns:1fr}
  .pricing-grid{grid-template-columns:1fr}
  .empresa-block{grid-template-columns:1fr}
  .empresa-values{grid-template-columns:1fr}
  .gallery-grid{grid-template-columns:1fr}
  .cal-cell{min-height:32px}
}
@media(max-width:600px){
  .results-grid{grid-template-columns:1fr}
  .stats-row{grid-template-columns:repeat(2,1fr)}
  .charts-row{grid-template-columns:1fr}
  .service-row{grid-template-columns:1fr auto;row-gap:4px}
  .srv-num{display:none}
  .wa-btn{bottom:16px;right:16px}
}
`;

// â”€â”€â”€ ROOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [loginOpen, setLoginOpen] = useState(false);
  const { curRef, ringRef } = useCustomCursor();

  const go = (p: Page) => {
    setPage(p);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const renderPage = () => {
    switch (page) {
      case "funcionalidades": return <FuncPage onOpenLogin={() => setLoginOpen(true)} />;
      case "precos":          return <PrecosPage />;
      case "faq":             return <FAQPage />;
      case "empresa":         return <EmpresaPage />;
      default:                return <HomePage go={go} />;
    }
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div id="cur"      ref={curRef}  />
      <div id="cur-ring" ref={ringRef} />

      <Nav cur={page} go={go} onOpenLogin={() => setLoginOpen(true)} />
      {renderPage()}
      <Footer go={go} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* â‘£ WhatsApp button â€” global, visible on all pages */}
      <WhatsAppBtn />
    </>
  );
}



