"use client";

import { useState, useEffect, useRef } from "react";
import Index from "./pages/Index";
import authService from "./services/authService";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Stat        { value: string; label: string; color?: string }
interface Service     { num: string; title: string; desc: string; tags: string[] }
interface Result      { num: string; label: string }
interface Testimonial { quote: string; name: string; role: string; metric: string }
interface PricingPlan { name: string; price: { monthly: number; annual: number }; desc: string; features: string[]; cta: string; highlight?: boolean }
interface FAQ         { q: string; a: string }

type Page     = "home" | "funcionalidades" | "precos" | "faq" | "empresa";
type AuthView = "login" | "register" | "recover" | "recover-sent";
type RootView = Page | "auth";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const DASHBOARD_STATS: Stat[] = [
  { value: "+$4.280", label: "P&L Mensal",  color: "ok"   },
  { value: "67,4%",   label: "Win Rate"                   },
  { value: "2,3",     label: "RR Médio",    color: "ok"   },
  { value: "86",      label: "GP Score",    color: "gold" },
];
const MARQUEE_ITEMS = ["📊 Dashboard","📈 Evolução da Conta","🔬 Análise das Operações","📅 Calendário","📋 Trade Log","📉 TradingView Chart","🏦 Contas Ativas","🤖 IA do Trade","🔌 APIs","👤 Perfil"];
const SIDEBAR_ITEMS = [
  { icon:"📊", label:"Dashboard",            act:true  },
  { icon:"📈", label:"Evolução da Conta",     act:false },
  { icon:"🔬", label:"Análise das Operações", act:false },
  { icon:"📅", label:"Calendário",            act:false },
  { icon:"📋", label:"Trade Log",             act:false },
  { icon:"📉", label:"TradingView Chart",      act:false },
  { icon:"🏦", label:"Contas Ativas",          act:false },
  { icon:"🤖", label:"IA do Trade",           act:false },
  { icon:"🔌", label:"APIs",                  act:false },
  { icon:"👤", label:"Perfil",                act:false },
];
const CAL_DAYS    = Array.from({ length: 28 }, (_, i) => i + 1);
const CAL_HEADERS = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const SERVICES: Service[] = [
  { num:"01/", title:"Dashboard completo com 8 gráficos",   desc:"Win rate, P&L diário, distribuição por ativo, horário ideal de entrada — tudo em tempo real.",       tags:["Sincronização automática","8 métricas"] },
  { num:"02/", title:"Calendário com GP Score",              desc:"Cada dia recebe uma pontuação baseada em disciplina, risco e resultado. Evolua de forma mensurável.",tags:["Score de disciplina"] },
  { num:"03/", title:"Conexão MT5, MT4 e cTrader",           desc:"Importe todas as suas operações automaticamente. Sem planilhas, sem trabalho manual.",               tags:["Import automático"] },
  { num:"04/", title:"Replay de Mercado",                    desc:"Reviva qualquer operação tick a tick. Treine, identifique padrões e melhore suas entradas.",         tags:["Modo treinamento"] },
  { num:"05/", title:"IA do Trade para análise inteligente", desc:"Nossa IA analisa seus padrões de comportamento e sugere melhorias específicas para o seu estilo.",   tags:["Powered by AI"] },
];
const RESULTS: Result[] = [
  { num:"+67%",   label:"aumento médio no win rate após 60 dias" },
  { num:"2.400+", label:"traders profissionais ativos"           },
  { num:"−45%",   label:"redução no drawdown mensal"             },
  { num:"4.9★",   label:"avaliação média dos usuários"           },
];
const TESTIMONIALS: Testimonial[] = [
  { quote:"O GP Score mudou minha visão sobre disciplina. Os dados mostraram onde eu estava errando.", name:"Rafael Cunha",   role:"Trader Forex · 3 anos", metric:"+34% no win rate em 60 dias"              },
  { quote:"A conexão com MT5 é perfeita. Zero trabalho manual. O replay me ajudou a melhorar muito.", name:"Ana Martins",    role:"Prop Trader · FTMO",    metric:"Passou na avaliação FTMO na 2ª tentativa" },
  { quote:"A IA identificou que perco mais nos primeiros 30 min. Mudei e os resultados melhoraram.",   name:"Lucas Ferreira", role:"Day Trader · Índices",  metric:"Drawdown reduzido em 45%"                },
];
const PRICING_PLANS: PricingPlan[] = [
  { name:"Starter", price:{monthly:0,annual:0},   desc:"Para traders que estão começando a controlar suas métricas.",       features:["Dashboard básico (4 gráficos)","Conexão com 1 corretora","GP Score mensal","Histórico de 30 dias"],                                                                                  cta:"Criar conta agora" },
  { name:"Pro",     price:{monthly:97,annual:77},  desc:"Para traders sérios que querem evoluir de forma consistente.",      features:["Dashboard completo (8 gráficos)","Conexão ilimitada com corretoras","GP Score diário + calendário","IA do Trade","Replay de Mercado","Relatórios automáticos","Histórico ilimitado"], cta:"Começar 7 dias grátis", highlight:true },
  { name:"Elite",   price:{monthly:197,annual:157},desc:"Para prop traders e profissionais que exigem o máximo.",            features:["Tudo do Pro","Análise multi-conta","Relatórios personalizados","Suporte prioritário","API de integração","Onboarding individual"],                                                    cta:"Falar com especialista" },
];
const FAQS: FAQ[] = [
  { q:"Como funciona a conexão com MT5/MT4/cTrader?",          a:"A integração é feita via plugin. Após a instalação, todas as operações são sincronizadas automaticamente em tempo real." },
  { q:"Preciso de cartão de crédito para testar?",             a:"Não. O plano Starter é gratuito para sempre. O período de 7 dias grátis do Pro também não exige cartão." },
  { q:"O que é o GP Score?",                                   a:"GP Score é nossa métrica proprietária que avalia cada dia de trading com uma pontuação de 0 a 100, baseada em disciplina, gestão de risco e resultado." },
  { q:"A IA do Trade funciona com qualquer estilo de trading?", a:"Sim. A IA analisa seus próprios dados e aprende o seu estilo — seja scalping, day trade ou swing trade." },
  { q:"Posso cancelar a qualquer momento?",                    a:"Sim, sem burocracia. Você cancela pela própria plataforma. Seus dados ficam disponíveis por 90 dias após o cancelamento." },
  { q:"A plataforma funciona com corretoras brasileiras?",     a:"Sim. Qualquer corretora que opere com MT5, MT4 ou cTrader é compatível, incluindo as principais do mercado brasileiro." },
];

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); } }),
      { threshold: 0.1 }
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
      if(curRef.current){curRef.current.style.left=mx+"px";curRef.current.style.top=my+"px";}
    };
    const tick = setInterval(()=>{
      rx+=(mx-rx)*.1; ry+=(my-ry)*.1;
      if(ringRef.current){ringRef.current.style.left=rx+"px";ringRef.current.style.top=ry+"px";}
    },16);
    document.addEventListener("mousemove",onMove);
    return ()=>{document.removeEventListener("mousemove",onMove);clearInterval(tick);};
  },[]);
  return { curRef, ringRef };
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Eyebrow  = ({children}:{children:React.ReactNode}) => <span className="eyebrow">{children}</span>;
const SecTitle = ({children}:{children:React.ReactNode}) => <h2 className="sec-title">{children}</h2>;

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
function WhatsAppBtn() {
  const phone = "5581989224862";
  const msg   = encodeURIComponent("Olá! Gostaria de saber mais sobre o GP Trading Suite.");
  return (
    <a href={`https://wa.me/${phone}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="wa-btn" aria-label="WhatsApp">
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

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ cur, go, goAuth }:{ cur:Page; go:(p:Page)=>void; goAuth:(v:AuthView)=>void }) {
  const [mob,setMob]=useState(false);
  const [co,setCo]=useState(false);
  const [mco,setMco]=useState(false);
  useEffect(()=>{const r=()=>{if(window.innerWidth>=768)setMob(false);};window.addEventListener("resize",r);return()=>window.removeEventListener("resize",r);},[]);
  const nav=[{label:"Funcionalidades",page:"funcionalidades" as Page},{label:"Preços",page:"precos" as Page},{label:"FAQ",page:"faq" as Page}];
  return (
    <div className="nav-pill-wrap">
      <header className={`nav-pill${mob?" mobile-open":""}`}>
        <div className="nav-row">
          <button className="logo" onClick={()=>{go("home");setMob(false);}}>
            <div className="logo-icon">GP</div>
            <div><span className="logo-name">Gustavo Pedrosa FX</span><span className="logo-sub">Pro Trading Suite</span></div>
          </button>
          <div className="nav-center-wrap">
            <ul className="nav-inner-pill">
              {nav.map(l=>(
                <li key={l.page}><button className={`nav-link${cur===l.page?" nav-link-active":""}`} onClick={()=>go(l.page)}>{l.label}</button></li>
              ))}
              <li className="nav-dropdown-wrap" onMouseEnter={()=>setCo(true)} onMouseLeave={()=>setCo(false)}>
                <button className={`nav-link nav-link-btn${cur==="empresa"?" nav-link-active":""}`} aria-expanded={co}>
                  <span>Empresa</span>
                  <svg className={`nav-chevron${co?" open":""}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className={`nav-dropdown${co?" visible":""}`}>
                  <div className="nav-dropdown-inner">
                    <button className="nav-dropdown-item" onClick={()=>{go("empresa");setCo(false);}}>Sobre nós</button>
                    <a href="#contato" className="nav-dropdown-item">Contato</a>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div className="nav-cta-wrap">
            <button className="btn-outline" onClick={()=>goAuth("login")}>Entrar</button>
            <button className="btn-nav-gold" onClick={()=>goAuth("register")}>Criar conta agora</button>
          </div>
          <button className="nav-hamburger" onClick={()=>setMob(!mob)} aria-label="Menu">
            {mob?<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>}
          </button>
        </div>
        <div className={`nav-mobile-drawer${mob?" open":""}`}>
          <div className="nav-mobile-divider"/>
          <nav className="nav-mobile-nav">
            {nav.map(l=>(
              <button key={l.page} className={`nav-mobile-link${cur===l.page?" nav-ml-act":""}`} onClick={()=>{go(l.page);setMob(false);}}>{l.label}</button>
            ))}
            <div className="nav-mobile-accordion">
              <button className="nav-mobile-link nav-mobile-accordion-btn" onClick={()=>setMco(!mco)}>
                <span>Empresa</span>
                <svg className={`nav-chevron${mco?" open":""}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {mco&&(<div className="nav-mobile-subnav"><button className="nav-mobile-sublink" onClick={()=>{go("empresa");setMob(false);}}>Sobre nós</button><a href="#contato" className="nav-mobile-sublink">Contato</a></div>)}
            </div>
          </nav>
          <div className="nav-mobile-divider"/>
          <div className="nav-mobile-footer">
            <button className="btn-outline" style={{flex:1,textAlign:"center"}} onClick={()=>{goAuth("login");setMob(false);}}>Entrar</button>
            <button className="btn-nav-gold" style={{flex:1,textAlign:"center"}} onClick={()=>{goAuth("register");setMob(false);}}>Criar conta agora</button>
          </div>
        </div>
      </header>
    </div>
  );
}

// ─── CALENDAR + DASHBOARD MOCKUP ─────────────────────────────────────────────
function CalendarMockup() {
  return (
    <div className="cal-wrap">
      <div className="cal-header-row">{CAL_HEADERS.map(h=><div key={h} className="cal-header-cell">{h}</div>)}</div>
      <div className="cal-grid">{CAL_DAYS.map(d=><div key={d} className="cal-cell"><span className="cal-day-num">{d}</span></div>)}</div>
    </div>
  );
}
function DashMockup() {
  return (
    <div className="dash-wrap"><div className="dash">
      <div className="dash-bar"><div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/><div className="dash-url">app.gustavopedrosafx.com/dashboard</div></div>
      <div className="dash-body">
        <div className="sidebar">{SIDEBAR_ITEMS.map(item=><div key={item.label} className={`si${item.act?" act":""}`}><div className="si-ic">{item.icon}</div><span className="si-lbl">{item.label}</span></div>)}</div>
        <div className="main-content">
          <div className="stats-row">{DASHBOARD_STATS.map(s=><div key={s.label} className="stat-c"><div className={`stat-v${s.color?" "+s.color:""}`}>{s.value}</div><div className="stat-l">{s.label}</div></div>)}</div>
          <div className="charts-row">
            <div className="chart-c"><div className="chart-t">P&L por Dia</div><div className="bars">{[60,25,80,55,30,90,70,20,85,65].map((h,i)=><div key={i} className={`b ${h>40?"b-u":"b-d"}`} style={{height:`${h}%`}}/>)}</div></div>
            <div className="chart-c"><div className="chart-t">Equity Curve</div><svg className="eq-svg" viewBox="0 0 200 44" preserveAspectRatio="none"><defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF6A" stopOpacity=".35"/><stop offset="100%" stopColor="#D4AF6A" stopOpacity="0"/></linearGradient></defs><path d="M0,42 C20,38 40,36 60,30 S90,22 110,16 S150,8 200,3" fill="none" stroke="#D4AF6A" strokeWidth="1.5"/><path d="M0,42 C20,38 40,36 60,30 S90,22 110,16 S150,8 200,3 L200,44 L0,44Z" fill="url(#eg)"/></svg></div>
          </div>
          <div className="dash-calendar-section"><div className="dash-calendar-title"><span className="chart-t" style={{marginBottom:0}}>Calendário · GP Score</span><span className="dash-cal-month">Junho 2025</span></div><CalendarMockup/></div>
        </div>
      </div>
    </div></div>
  );
}

// ─── MARQUEE ─────────────────────────────────────────────────────────────────
function Marquee() {
  const items=[...MARQUEE_ITEMS,...MARQUEE_ITEMS];
  return (
    <div className="marquee-sec"><p className="marquee-lbl">Tudo que você precisa em uma plataforma</p><div style={{overflow:"hidden"}}><div className="marquee-track">{items.map((item,i)=><span key={i} className="m-item">{item}{i<items.length-1&&<span className="m-sep"> · </span>}</span>)}</div></div></div>
  );
}

// ─── REUSABLE BLOCKS ──────────────────────────────────────────────────────────
function ServicesList({onClick}:{onClick?:()=>void}) {
  return (
    <div className="services-list">{SERVICES.map((s,i)=>(
      <div key={s.num} className={`service-row sr d${Math.min(i+1,4)}`}>
        <span className="srv-num">{s.num}</span>
        <div className="srv-body"><div className="srv-title">{s.title}</div><div className="srv-desc">{s.desc}</div><div className="srv-tags">{s.tags.map(t=><span key={t} className="srv-tag">{t}</span>)}</div></div>
        <div className="srv-arrow" onClick={onClick} style={onClick?{cursor:"pointer"}:{}}>→</div>
      </div>
    ))}</div>
  );
}
function PricingBlock({annual,goAuth}:{annual:boolean;goAuth:(v:AuthView)=>void}) {
  return (
    <div className="pricing-grid">{PRICING_PLANS.map((plan,i)=>(
      <div key={plan.name} className={`plan-card sr d${i+1}${plan.highlight?" highlight":""}`}>
        {plan.highlight&&<div className="plan-badge">Mais popular</div>}
        <div className="plan-name">{plan.name}</div>
        <div className="plan-price">{plan.price.monthly===0?<span className="p-val">Grátis</span>:<><span className="p-curr">R$</span><span className="p-val">{annual?plan.price.annual:plan.price.monthly}</span><span className="p-per">/mês</span></>}</div>
        {annual&&plan.price.monthly>0&&<p className="p-annual-note">cobrado anualmente · R${(annual?plan.price.annual:plan.price.monthly)*12}/ano</p>}
        <p className="plan-desc">{plan.desc}</p>
        <button className={`plan-cta${plan.highlight?" plan-cta-p":""}`} onClick={()=>goAuth("register")}>{plan.cta}</button>
        <ul className="plan-features">{plan.features.map(f=><li key={f}><span className="feat-check">✓</span>{f}</li>)}</ul>
      </div>
    ))}</div>
  );
}
function FAQList({items}:{items:FAQ[]}) {
  const [open,setOpen]=useState<number|null>(null);
  return (
    <div className="faq-list">{items.map((item,i)=>(
      <div key={i} className={`faq-item sr d${Math.min(i+1,4)}${open===i?" open":""}`}>
        <button className="faq-q" onClick={()=>setOpen(open===i?null:i)}><span>{item.q}</span><span className="faq-icon">{open===i?"−":"+"}</span></button>
        <div className="faq-a-wrap" style={{maxHeight:open===i?"400px":"0"}}><p className="faq-a">{item.a}</p></div>
      </div>
    ))}</div>
  );
}
function InnerHero({badge,title,sub}:{badge:string;title:React.ReactNode;sub:string}) {
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

// ─── SITE PAGES ───────────────────────────────────────────────────────────────
function HomePage({go,goAuth}:{go:(p:Page)=>void;goAuth:(v:AuthView)=>void}) {
  useScrollReveal();
  return (
    <>
      <section className="hero">
        <div className="h-mesh"/><div className="h-orb-a"/><div className="h-orb-b"/><div className="noise"/>
        <div className="badge"><div className="badge-dot"/> Plataforma #1 para traders profissionais</div>
        <h1 className="hero-title">Gerencie suas operações <b>com inteligência</b></h1>
        <p className="hero-sub">Dashboard completo, GP Score, IA para análise e conexão direta com MT5, MT4 e cTrader.</p>
        <div className="hero-btns">
          <button className="btn-hg btn-hg-p" onClick={()=>goAuth("register")}>Criar conta agora</button>
          <button className="btn-hg btn-hg-s" onClick={()=>go("funcionalidades")}>Ver funcionalidades →</button>
        </div>
        <div className="hero-proof">
          <p className="proof-txt">Usado por <strong>+2.400 traders</strong> profissionais</p>
          <div className="hr-divider"/>
          <p className="proof-txt proof-stars">★★★★★ 4.9</p>
        </div>
        <DashMockup/>
      </section>
      <Marquee/>
      <section className="services" id="features">
        <div className="sec-hd sr"><Eyebrow>Funcionalidades</Eyebrow><SecTitle>Ferramentas que fazem a diferença<br/><b>no seu trading</b></SecTitle></div>
        <ServicesList onClick={()=>go("funcionalidades")}/>
        <div style={{textAlign:"center",marginTop:"40px"}}><button className="btn-see-all" onClick={()=>go("funcionalidades")}>Ver demonstração completa →</button></div>
      </section>
      <section className="results"><div className="results-inner">
        <div className="sec-hd sr"><Eyebrow>Resultados reais</Eyebrow><SecTitle>Números que <b>falam por si</b></SecTitle></div>
        <div className="results-grid">{RESULTS.map((r,i)=><div key={r.num} className={`result-block sr d${i+1}`}><div className="r-num">{r.num}</div><div className="r-divider"/><div className="r-label">{r.label}</div></div>)}</div>
      </div></section>
      <section className="testimonials"><div className="test-inner">
        <div className="sec-hd sr"><Eyebrow>Depoimentos</Eyebrow><SecTitle>O que dizem nossos <b>traders</b></SecTitle></div>
        <div className="test-grid">{TESTIMONIALS.map((t,i)=><div key={t.name} className={`test-card sr d${i+1}`}><div className="t-quote">"</div><p className="t-txt">{t.quote}</p><div className="t-name">{t.name}</div><div className="t-role">{t.role}</div><div className="t-metric">— {t.metric}</div></div>)}</div>
      </div></section>
      <section className="cta"><div className="cta-inner sr">
        <Eyebrow>Comece agora</Eyebrow>
        <h2 className="cta-title">Opere com <b>inteligência real</b></h2>
        <p className="cta-sub">Crie sua conta gratuitamente. Sem cartão de crédito. Conecte sua corretora em menos de 2 minutos.</p>
        <div className="cta-btns">
          <button className="btn-hg btn-hg-p" style={{fontSize:"16px",padding:"15px 38px"}} onClick={()=>goAuth("register")}>Criar conta agora</button>
          <button className="btn-hg btn-hg-s" onClick={()=>go("precos")}>Ver planos →</button>
        </div>
      </div></section>
    </>
  );
}
function FuncPage({goAuth}:{goAuth:(v:AuthView)=>void}) {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero badge="Veja como funciona na prática" title={<>Conheça cada <b>funcionalidade</b><br/>da plataforma</>} sub="Do dashboard ao GP Score, da IA ao Replay — assista ao vídeo e explore o sistema completo."/>
      <section className="video-sec"><div className="video-inner sr"><div className="sec-hd" style={{textAlign:"center",marginBottom:"40px"}}><Eyebrow>Demonstração</Eyebrow><SecTitle>Veja a plataforma <b>em ação</b></SecTitle><p className="sec-sub">Conheça todas as funcionalidades em menos de 3 minutos.</p></div><div className="yt-wrap"><div className="yt-frame"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1" title="GP Trading Suite" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div></div></section>
      <section className="services" style={{paddingTop:"60px"}}><div className="sec-hd sr"><Eyebrow>O que está incluído</Eyebrow><SecTitle>Todas as ferramentas<br/><b>do seu lado</b></SecTitle></div><ServicesList/></section>
      <section className="gallery-sec"><div className="gallery-inner"><div className="sec-hd sr" style={{textAlign:"center"}}><Eyebrow>Screenshots</Eyebrow><SecTitle>Dentro da <b>plataforma</b></SecTitle><p className="sec-sub">As imagens do sistema serão adicionadas em breve.</p></div><div className="gallery-grid sr d1">{[1,2,3,4].map(n=><div key={n} className="gallery-placeholder"><div className="gp-icon">📸</div><p className="gp-txt">Screenshot {n}<br/><span>Aguardando imagem</span></p></div>)}</div></div></section>
      <section className="cta" style={{paddingTop:"60px"}}><div className="cta-inner sr"><Eyebrow>Pronto para começar?</Eyebrow><h2 className="cta-title">Experimente <b>gratuitamente</b></h2><p className="cta-sub">Crie sua conta e conecte sua corretora em menos de 2 minutos.</p><div className="cta-btns"><button className="btn-hg btn-hg-p" style={{fontSize:"16px",padding:"15px 38px"}} onClick={()=>goAuth("register")}>Criar conta agora</button><button className="btn-hg btn-hg-s" onClick={()=>goAuth("login")}>Já tenho conta →</button></div></div></section>
    </main>
  );
}
function PrecosPage({goAuth}:{goAuth:(v:AuthView)=>void}) {
  const [annual,setAnnual]=useState(false); useScrollReveal();
  const priceFaqs:FAQ[]=[{q:"Preciso de cartão para começar?",a:"Não. O plano Starter é gratuito para sempre."},{q:"Posso trocar de plano a qualquer momento?",a:"Sim. Upgrade ou downgrade pela própria plataforma, sem taxas extras."},{q:"O que acontece com meus dados se cancelar?",a:"Ficam disponíveis para exportação por 90 dias após o cancelamento."},{q:"O plano Pro tem trial grátis?",a:"Sim, 7 dias grátis sem cartão."}];
  return (
    <main className="page-main">
      <InnerHero badge="Sem taxa de setup · Cancele quando quiser" title={<>Planos que cabem no seu <b>estilo de trading</b></>} sub="Comece grátis. Faça upgrade quando estiver pronto. Sem cartão de crédito para começar."/>
      <section className="pricing-sec"><div className="pricing-inner"><div className="sec-hd sr" style={{textAlign:"center"}}><Eyebrow>Preços</Eyebrow><SecTitle>Invista no seu <b>desenvolvimento</b></SecTitle><p className="sec-sub">Escolha o plano ideal para o seu momento.</p><div className="billing-toggle"><span className={!annual?"tog-act":""}>Mensal</span><button className={`toggle-btn${annual?" on":""}`} onClick={()=>setAnnual(!annual)}><div className="toggle-knob"/></button><span className={annual?"tog-act":""}>Anual <em className="save-badge">−20%</em></span></div></div><PricingBlock annual={annual} goAuth={goAuth}/></div></section>
      <section className="faq-sec" style={{paddingTop:"60px",paddingBottom:"80px"}}><div className="faq-inner"><div className="sec-hd sr" style={{textAlign:"center"}}><Eyebrow>Dúvidas sobre os planos</Eyebrow><SecTitle>Perguntas sobre <b>preços</b></SecTitle></div><FAQList items={priceFaqs}/></div></section>
    </main>
  );
}
function FAQPage() {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero badge="Respostas rápidas e diretas" title={<>Perguntas <b>frequentes</b></>} sub="Tire todas as suas dúvidas sobre a plataforma, integrações e planos."/>
      <section className="faq-sec" style={{paddingTop:"40px",paddingBottom:"100px",background:"var(--bg)"}}><div className="faq-inner" style={{maxWidth:"860px"}}><FAQList items={FAQS}/><div className="faq-more sr" style={{marginTop:"32px"}}><div className="faq-more-icon">＋</div><p className="faq-more-txt">Mais perguntas serão adicionadas em breve.</p></div></div></section>
    </main>
  );
}
function EmpresaPage() {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero badge="Nossa história" title={<>Por trás da <b>plataforma</b></>} sub="Criada por traders, para traders. Conheça quem construiu o GP Trading Suite."/>
      <section className="empresa-sec"><div className="empresa-inner">
        <div className="empresa-block sr"><div><Eyebrow>Nossa missão</Eyebrow></div><div className="empresa-block-body"><SecTitle>Dados que <b>transformam</b> a forma de operar</SecTitle><p className="empresa-txt">O GP Trading Suite nasceu da frustração de traders que não tinham ferramentas profissionais acessíveis.</p></div></div>
        <div className="empresa-values sr d2">{[{icon:"📊",title:"Dados primeiro",desc:"Toda decisão deve ser baseada em métricas, não em emoção."},{icon:"🎯",title:"Disciplina mensurável",desc:"O GP Score traduz comportamento em números claros e objetivos."},{icon:"🤝",title:"Trader no centro",desc:"Cada funcionalidade foi criada a partir da dor real de quem opera."}].map(v=><div key={v.title} className="empresa-value-card"><div className="empresa-value-icon">{v.icon}</div><div className="empresa-value-title">{v.title}</div><div className="empresa-value-desc">{v.desc}</div></div>)}</div>
      </div></section>
    </main>
  );
}
function Footer({go}:{go:(p:Page)=>void}) {
  return (
    <footer>
      <p>© 2025 Gustavo Pedrosa FX · Pro Trading Suite</p>
      <div className="foot-links">
        <button className="foot-btn" onClick={()=>go("empresa")}>Empresa</button>
        <button className="foot-btn" onClick={()=>go("precos")}>Preços</button>
        <a href="#">Termos</a><a href="#">Privacidade</a><a href="#">Suporte</a>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — layout centralizado (logo acima · card · badges abaixo)
// ══════════════════════════════════════════════════════════════════════════════

// ─── ICONS ───────────────────────────────────────────────────────────────────
const IconEye = ({off}:{off?:boolean}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {off?<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></>:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
  </svg>
);
const IconMail = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconCheck = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconArrowLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;

// ─── AUTH INPUT ───────────────────────────────────────────────────────────────
interface InputProps { label:string; type?:string; placeholder:string; value:string; onChange:(v:string)=>void; icon:React.ReactNode; error?:string; showToggle?:boolean; autoComplete?:string; }
function AuthInput({label,type="text",placeholder,value,onChange,icon,error,showToggle,autoComplete}:InputProps) {
  const [show,setShow]=useState(false);
  return (
    <div className="ai-field">
      <label className="ai-label">{label}</label>
      <div className={`ai-wrap${error?" err":""}`}>
        <span className="ai-icon">{icon}</span>
        <input className="ai-input" type={showToggle?(show?"text":"password"):type} placeholder={placeholder} value={value} autoComplete={autoComplete} onChange={e=>onChange(e.target.value)}/>
        {showToggle&&<button className="ai-eye" type="button" onClick={()=>setShow(!show)} tabIndex={-1}><IconEye off={!show}/></button>}
      </div>
      {error&&<span className="ai-err">{error}</span>}
    </div>
  );
}

// ─── PASSWORD STRENGTH ────────────────────────────────────────────────────────
function PwdStrength({password}:{password:string}) {
  if(!password) return null;
  const checks=[password.length>=8,/[A-Z]/.test(password),/[0-9]/.test(password),/[^A-Za-z0-9]/.test(password)];
  const score=checks.filter(Boolean).length;
  const labels=["Fraca","Regular","Boa","Forte"];
  const colors=["#E85C5C","#E8A85C","#D4AF6A","#5EC987"];
  return (
    <div className="pwd-str">
      <div className="pwd-bars">{[0,1,2,3].map(i=><div key={i} className="pwd-bar" style={{background:i<score?colors[score-1]:"rgba(255,255,255,0.08)"}}/>)}</div>
      <span className="pwd-lbl" style={{color:colors[score-1]||"rgba(255,255,255,0.3)"}}>{labels[score-1]||"Fraca"}</span>
    </div>
  );
}

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
function LoginView({setView,onAuthSuccess}:{setView:(v:AuthView)=>void;onAuthSuccess:()=>void}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false); const [errors,setErrors]=useState<Record<string,string>>({});
  const validate=()=>{const e:Record<string,string>={};if(!email)e.email="Informe seu e-mail";else if(!/\S+@\S+\.\S+/.test(email))e.email="E-mail inválido";if(!password)e.password="Informe sua senha";else if(password.length<6)e.password="Mínimo 6 caracteres";setErrors(e);return Object.keys(e).length===0;};
  const handleSubmit=async (e:React.FormEvent)=>{e.preventDefault();if(!validate())return;setLoading(true);try{await authService.login({email,password});onAuthSuccess();}catch(err){setErrors(prev=>({...prev,password:getApiErrorMessage(err,"Não foi possível entrar. Verifique seus dados.")}));}finally{setLoading(false);}};
  return (
    <div className="av-wrap" key="login">
      <div className="av-header"><div className="av-eyebrow">Bem-vindo de volta</div><h1 className="av-title">Entrar na <b>plataforma</b></h1><p className="av-sub">Acesse seu dashboard e continue evoluindo.</p></div>
      <form className="av-form" onSubmit={handleSubmit} noValidate>
        <AuthInput label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={setEmail} icon={<IconMail/>} error={errors.email} autoComplete="email"/>
        <AuthInput label="Senha" placeholder="Sua senha" value={password} onChange={setPassword} icon={<IconLock/>} error={errors.password} showToggle autoComplete="current-password"/>
        <div className="av-row">
          <label className="av-check-label"><input type="checkbox" className="av-check-hidden"/><span className="av-check-box"/><span>Lembrar de mim</span></label>
          <button type="button" className="av-link" onClick={()=>setView("recover")}>Esqueci minha senha</button>
        </div>
        <button className={`av-submit${loading?" loading":""}`} type="submit">{loading?<span className="av-spinner"/>:"Entrar na plataforma"}</button>
      </form>
      <div className="av-divider"><span>ou</span></div>
      <p className="av-footer-txt">Ainda não tem conta? <button className="av-link av-link-gold" onClick={()=>setView("register")}>Criar conta grátis →</button></p>
    </div>
  );
}

// ─── EXTRA ICONS (register) ───────────────────────────────────────────────────
const IconCPF = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4M14 15h4"/></svg>;
const IconPhone = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconCalendar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
const IconGlobe = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconCity = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3L6 3zM9 21v-6h6v6"/></svg>;
const IconMap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconChevronLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;

// ─── CPF MASK ─────────────────────────────────────────────────────────────────
function maskCPF(v: string): string {
  return v.replace(/\D/g,"").slice(0,11)
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d{1,2})$/,"$1-$2");
}
function maskPhone(v: string): string {
  return v.replace(/\D/g,"").slice(0,11)
    .replace(/(\d{2})(\d)/,"($1) $2")
    .replace(/(\d{5})(\d)/,"$1-$2");
}
function validateCPF(cpf: string): boolean {
  const n = cpf.replace(/\D/g,"");
  if(n.length!==11||/^(\d)\1+$/.test(n)) return false;
  let s=0; for(let i=0;i<9;i++) s+=parseInt(n[i])*(10-i);
  let r=11-(s%11); if(r>=10) r=0; if(r!==parseInt(n[9])) return false;
  s=0; for(let i=0;i<10;i++) s+=parseInt(n[i])*(11-i);
  r=11-(s%11); if(r>=10) r=0; return r===parseInt(n[10]);
}

// ─── REGISTER VIEW — multi-step ───────────────────────────────────────────────
function RegisterView({setView,onAuthSuccess}:{setView:(v:AuthView)=>void;onAuthSuccess:()=>void}) {
  const [step, setStep] = useState<1|2>(1);

  // ── Step 1 — obrigatórios
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [cpf,      setCpf]      = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  // ── Step 2 — opcionais
  const [phone,     setPhone]     = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country,   setCountry]   = useState("");
  const [city,      setCity]      = useState("");
  const [address,   setAddress]   = useState("");

  const [terms,   setTerms]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string,string>>({});

  // ── Valida step 1
  const validateStep1 = () => {
    const e: Record<string,string> = {};
    if (!name.trim())                          e.name     = "Informe seu nome completo";
    if (!email)                                e.email    = "Informe seu e-mail";
    else if (!/\S+@\S+\.\S+/.test(email))      e.email    = "E-mail inválido";
    if (!cpf)                                  e.cpf      = "Informe seu CPF";
    else if (!validateCPF(cpf))                e.cpf      = "CPF inválido";
    if (!password)                             e.password = "Informe uma senha";
    else if (password.length < 6)              e.password = "Mínimo 6 caracteres";
    if (!confirm)                              e.confirm  = "Confirme sua senha";
    else if (confirm !== password)             e.confirm  = "As senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Avança para step 2
  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) { setErrors({}); setStep(2); }
  };

  // ── Valida step 2 e envia
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string,string> = {};
    if (!terms) e2.terms = "Aceite os termos para continuar";
    setErrors(e2);
    if (Object.keys(e2).length > 0) return;
    setLoading(true);
    try {
      await authService.register({
        name,
        email,
        cpf: cpf.replace(/\D/g, ""),
        password,
        phone: phone ? phone.replace(/\D/g, "") : undefined,
        birth_date: birthDate || undefined,
        country: country || undefined,
        city: city || undefined,
        address: address || undefined,
      });
      onAuthSuccess();
    } catch (err) {
      setErrors(prev => ({ ...prev, terms: getApiErrorMessage(err, "Não foi possível criar a conta.") }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="av-wrap" key="register">

      {/* Header */}
      <div className="av-header">
        <div className="av-eyebrow">Comece gratuitamente · 3 dias grátis</div>
        <h1 className="av-title">Criar <b>sua conta</b></h1>
        <p className="av-sub">Sem cartão de crédito. Conecte sua corretora em 2 minutos.</p>
      </div>

      {/* Step indicator */}
      <div className="reg-steps">
        <div className={`reg-step-item${step===1?" active":""}`}>
          <div className="reg-step-circle">{step>1?"✓":"1"}</div>
          <span>Dados obrigatórios</span>
        </div>
        <div className="reg-step-line"/>
        <div className={`reg-step-item${step===2?" active":""}`}>
          <div className="reg-step-circle">2</div>
          <span>Dados opcionais</span>
        </div>
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <form className="av-form" onSubmit={goStep2} noValidate>
          <AuthInput
            label="Nome completo *"
            placeholder="Seu nome completo"
            value={name} onChange={setName}
            icon={<IconUser/>} error={errors.name}
            autoComplete="name"
          />
          <AuthInput
            label="E-mail *"
            type="email" placeholder="seu@email.com"
            value={email} onChange={setEmail}
            icon={<IconMail/>} error={errors.email}
            autoComplete="email"
          />
          <AuthInput
            label="CPF *"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={v => setCpf(maskCPF(v))}
            icon={<IconCPF/>} error={errors.cpf}
            autoComplete="off"
          />
          <AuthInput
            label="Senha * (mín. 6 caracteres)"
            placeholder="Mínimo 6 caracteres"
            value={password} onChange={setPassword}
            icon={<IconLock/>} error={errors.password}
            showToggle autoComplete="new-password"
          />
          <PwdStrength password={password}/>
          <AuthInput
            label="Confirmar senha *"
            placeholder="Repita a senha"
            value={confirm} onChange={setConfirm}
            icon={<IconLock/>} error={errors.confirm}
            showToggle autoComplete="new-password"
          />
          <button className="av-submit" type="submit" style={{marginTop:"8px"}}>
            Continuar <span style={{marginLeft:"6px",display:"inline-flex",alignItems:"center"}}><IconChevronRight/></span>
          </button>
        </form>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <form className="av-form" onSubmit={handleSubmit} noValidate>

          {/* Seção opcional */}
          <div className="reg-optional-label">
            <span>Campos opcionais — preencha agora ou depois no perfil</span>
          </div>

          <AuthInput
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={v => setPhone(maskPhone(v))}
            icon={<IconPhone/>}
            autoComplete="tel"
          />
          <div className="ai-field">
            <label className="ai-label">Data de nascimento</label>
            <div className="ai-wrap">
              <span className="ai-icon"><IconCalendar/></span>
              <input
                className="ai-input"
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                autoComplete="bday"
              />
            </div>
          </div>
          <AuthInput
            label="País"
            placeholder="Ex: Brasil"
            value={country} onChange={setCountry}
            icon={<IconGlobe/>}
            autoComplete="country-name"
          />
          <AuthInput
            label="Cidade"
            placeholder="Ex: São Paulo"
            value={city} onChange={setCity}
            icon={<IconCity/>}
            autoComplete="address-level2"
          />
          <AuthInput
            label="Endereço"
            placeholder="Rua, número, bairro"
            value={address} onChange={setAddress}
            icon={<IconMap/>}
            autoComplete="street-address"
          />

          {/* Termos */}
          <label className="av-check-label" style={{marginTop:"4px"}}>
            <input type="checkbox" className="av-check-hidden" checked={terms} onChange={e=>setTerms(e.target.checked)}/>
            <span className="av-check-box"/>
            <span>Li e aceito os{" "}
              <a href="#" className="av-link av-link-gold">Termos de Uso</a>
              {" "}e a{" "}
              <a href="#" className="av-link av-link-gold">Política de Privacidade</a>
            </span>
          </label>
          {errors.terms && <span className="ai-err">{errors.terms}</span>}

          {/* Botões */}
          <div className="reg-btn-row">
            <button
              type="button"
              className="reg-btn-back"
              onClick={() => { setStep(1); setErrors({}); }}
            >
              <IconChevronLeft/> Voltar
            </button>
            <button className={`av-submit reg-btn-submit${loading?" loading":""}`} type="submit">
              {loading ? <span className="av-spinner"/> : "Criar minha conta grátis"}
            </button>
          </div>
        </form>
      )}

      <div className="av-divider"><span>ou</span></div>
      <p className="av-footer-txt">
        Já tem uma conta?{" "}
        <button className="av-link av-link-gold" onClick={()=>setView("login")}>Entrar →</button>
      </p>
    </div>
  );
}

// ─── RECOVER VIEW ─────────────────────────────────────────────────────────────
function RecoverView({setView}:{setView:(v:AuthView)=>void}) {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const handleSubmit=async (e:React.FormEvent)=>{e.preventDefault();if(!email){setError("Informe seu e-mail");return;}if(!/\S+@\S+\.\S+/.test(email)){setError("E-mail inválido");return;}setError("");setLoading(true);try{await authService.forgotPassword(email);setView("recover-sent");}catch(err){setError(getApiErrorMessage(err,"Não foi possível enviar o e-mail de recuperação."));}finally{setLoading(false);}};
  return (
    <div className="av-wrap" key="recover">
      <button className="av-back" onClick={()=>setView("login")}><IconArrowLeft/> Voltar ao login</button>
      <div className="av-header"><div className="av-eyebrow">Recuperação de acesso</div><h1 className="av-title">Esqueceu sua <b>senha?</b></h1><p className="av-sub">Digite o e-mail da sua conta e enviaremos um link para redefinir sua senha.</p></div>
      <form className="av-form" onSubmit={handleSubmit} noValidate>
        <AuthInput label="E-mail cadastrado" type="email" placeholder="seu@email.com" value={email} onChange={v=>{setEmail(v);setError("");}} icon={<IconMail/>} error={error} autoComplete="email"/>
        <div className="av-info-box"><span style={{fontSize:"14px"}}>🔒</span><span>O link de recuperação expira em 30 minutos por segurança.</span></div>
        <button className={`av-submit${loading?" loading":""}`} type="submit">{loading?<span className="av-spinner"/>:"Enviar link de recuperação"}</button>
      </form>
      <p className="av-footer-txt" style={{marginTop:"24px"}}>Lembrou a senha? <button className="av-link av-link-gold" onClick={()=>setView("login")}>Entrar →</button></p>
    </div>
  );
}

// ─── RECOVER SENT VIEW ────────────────────────────────────────────────────────
function RecoverSentView({setView}:{setView:(v:AuthView)=>void}) {
  return (
    <div className="av-wrap av-success-wrap" key="recover-sent">
      <div className="av-success-icon"><IconCheck/></div>
      <div className="av-header" style={{textAlign:"center"}}><div className="av-eyebrow">E-mail enviado</div><h1 className="av-title" style={{fontSize:"clamp(1.5rem,3vw,2rem)"}}>Verifique sua <b>caixa de entrada</b></h1><p className="av-sub">Enviamos o link de recuperação. Não esqueça de verificar a pasta de spam.</p></div>
      <div className="av-steps">{[{n:"1",t:"Abra seu e-mail"},{n:"2",t:"Clique no link enviado"},{n:"3",t:"Redefina sua senha"}].map(s=><div key={s.n} className="av-step"><div className="av-step-num">{s.n}</div><div className="av-step-txt">{s.t}</div></div>)}</div>
      <button className="av-submit" style={{marginTop:"8px"}} onClick={()=>setView("login")}>Voltar ao login</button>
      <p className="av-footer-txt" style={{marginTop:"20px"}}>Não recebeu? <button className="av-link av-link-gold" onClick={()=>setView("recover")}>Reenviar e-mail →</button></p>
    </div>
  );
}

// ─── AUTH ROOT ────────────────────────────────────────────────────────────────
function AuthRoot({initialView,goSite,onAuthSuccess}:{initialView:AuthView;goSite:()=>void;onAuthSuccess:()=>void}) {
  const [view,setView]=useState<AuthView>(initialView);
  useEffect(()=>{ setView(initialView); },[initialView]);
  const showTabs = view==="login"||view==="register";
  return (
    <div className="auth-page">
      {/* background efeitos */}
      <div className="auth-bg-orb-a"/><div className="auth-bg-orb-b"/><div className="auth-bg-mesh"/><div className="noise"/>

      <div className="auth-center">

        {/* ① LOGO — exatamente como a imagem: ícone GP + "Gustavo Pedrosa FX" + "PRO TRADING SUITE" */}
        <button className="auth-logo" onClick={goSite}>
          <div className="auth-logo-icon">GP</div>
          <div className="auth-logo-text">
            <span className="auth-logo-name">Gustavo Pedrosa FX</span>
            <span className="auth-logo-sub">PRO TRADING SUITE</span>
          </div>
        </button>

        {/* ② CARD */}
        <div className="auth-card">

          {/* Tabs login / criar conta */}
          {showTabs && (
            <div className="auth-tabs">
              <button className={`auth-tab${view==="login"?" active":""}`} onClick={()=>setView("login")}>Entrar</button>
              <button className={`auth-tab${view==="register"?" active":""}`} onClick={()=>setView("register")}>Criar conta</button>
            </div>
          )}

          {view==="login"        && <LoginView       setView={setView} onAuthSuccess={onAuthSuccess}/>}
          {view==="register"     && <RegisterView    setView={setView} onAuthSuccess={onAuthSuccess}/>}
          {view==="recover"      && <RecoverView     setView={setView}/>}
          {view==="recover-sent" && <RecoverSentView setView={setView}/>}
        </div>

        {/* ③ BADGES de plataformas */}
        <div className="auth-platforms">
          {["MT5","MT4","cTrader"].map(p=>(
            <div key={p} className="auth-platform-badge">{p}</div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
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
#cur{position:fixed;width:8px;height:8px;background:var(--gold);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);mix-blend-mode:difference;transition:width .15s,height .15s}
#cur-ring{position:fixed;width:30px;height:30px;border:1px solid rgba(212,175,106,.5);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:all .1s var(--ease)}

/* WHATSAPP */
.wa-btn{position:fixed;bottom:28px;right:28px;z-index:500;display:flex;flex-direction:column;align-items:center;gap:6px;text-decoration:none;cursor:pointer}
.wa-label{background:rgba(18,18,33,.92);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(12px);color:#fff;font-family:var(--fb);font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.4);transition:all .2s var(--ease);letter-spacing:.04em}
.wa-btn:hover .wa-label{background:rgba(37,211,102,.15);border-color:rgba(37,211,102,.4);color:#25D366}
.wa-icon{width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 20px rgba(37,211,102,.45);transition:all .25s var(--ease);animation:waPulse 2.8s ease-in-out infinite}
.wa-btn:hover .wa-icon{transform:scale(1.1)}
@keyframes waPulse{0%,100%{box-shadow:0 4px 20px rgba(37,211,102,.45),0 0 0 0 rgba(37,211,102,.35)}50%{box-shadow:0 4px 20px rgba(37,211,102,.45),0 0 0 10px rgba(37,211,102,.0)}}

/* NAV */
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
.nav-link:hover,.nav-link-active{color:#fff;background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.10)}
.nav-link-btn{background:none;border:1px solid transparent}
.nav-chevron{transition:transform .2s var(--ease);flex-shrink:0}
.nav-chevron.open{transform:rotate(180deg)}
.nav-dropdown-wrap{position:relative;list-style:none}
.nav-dropdown{position:absolute;left:50%;top:calc(100% + 8px);width:210px;transform:translateX(-50%) translateY(4px);opacity:0;visibility:hidden;pointer-events:none;transition:all .18s var(--ease);z-index:50}
.nav-dropdown.visible{opacity:1;visibility:visible;pointer-events:auto;transform:translateX(-50%) translateY(0)}
.nav-dropdown-inner{background:#1A1A29;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:8px}
.nav-dropdown-item{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:8px;font-size:13px;font-family:var(--fb);color:rgba(255,255,255,.7);text-decoration:none;transition:all .15s;background:none;border:none;cursor:pointer}
.nav-dropdown-item:hover{background:rgba(255,255,255,.08);color:#fff}
.nav-cta-wrap{display:flex;align-items:center;gap:8px;flex-shrink:0}
.btn-outline{font-family:var(--fb);font-size:12px;font-weight:500;color:var(--t2);padding:8px 16px;border-radius:8px;border:1px solid rgba(212,175,106,.35);background:transparent;transition:all .2s;letter-spacing:.04em;white-space:nowrap;cursor:pointer}
.btn-outline:hover{background:var(--goldm)}
.btn-nav-gold{font-family:var(--fb);font-size:12px;font-weight:600;color:#fff;padding:9px 18px;border-radius:8px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.10);transition:all .2s;letter-spacing:.04em;white-space:nowrap;cursor:pointer;box-shadow:inset -3px 0 16px rgba(255,255,255,.17),0 4px 10px rgba(0,0,11,.30)}
.btn-nav-gold:hover{background:rgba(255,255,255,.18)}
.nav-hamburger{display:none;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.75);padding:4px;border-radius:8px;transition:all .2s;align-items:center;justify-content:center}
.nav-hamburger:hover{color:#fff;background:rgba(255,255,255,.1)}
.nav-mobile-drawer{max-height:0;overflow:hidden;transition:max-height .3s var(--ease)}
.nav-mobile-drawer.open{max-height:600px}
.nav-mobile-divider{height:1px;background:rgba(255,255,255,.08);margin:0 16px}
.nav-mobile-nav{display:flex;flex-direction:column;gap:2px;padding:12px 12px 0}
.nav-mobile-link{font-size:15px;font-weight:400;color:rgba(255,255,255,.75);display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-radius:8px;transition:all .15s;background:none;border:none;cursor:pointer;font-family:var(--fb);width:100%;text-align:left}
.nav-mobile-link:hover,.nav-ml-act{color:#fff;background:rgba(255,255,255,.10)}
.nav-mobile-accordion{width:100%}
.nav-mobile-accordion-btn{width:100%}
.nav-mobile-subnav{padding:4px 0 4px 12px;display:flex;flex-direction:column;gap:2px}
.nav-mobile-sublink{font-size:13px;color:rgba(255,255,255,.6);padding:7px 10px;border-radius:6px;transition:all .15s;display:block;background:none;border:none;cursor:pointer;font-family:var(--fb);width:100%;text-align:left;text-decoration:none}
.nav-mobile-sublink:hover{color:#fff;background:rgba(255,255,255,.07)}
.nav-mobile-footer{display:flex;gap:8px;padding:12px 12px 16px}
@media(max-width:767px){.nav-center-wrap{display:none}.nav-cta-wrap{display:none}.nav-hamburger{display:flex}.nav-row{padding:10px 14px}}
@media(min-width:768px){.nav-mobile-drawer{display:none !important}.nav-hamburger{display:none !important}}

/* PAGE SHELLS */
.page-main{padding-top:90px}
.inner-hero{position:relative;overflow:hidden;padding:140px 24px 72px;text-align:center;display:flex;flex-direction:column;align-items:center}
.inner-hero-content{position:relative;z-index:1;max-width:760px}
.inner-hero-title{font-family:var(--fd);font-size:clamp(2.2rem,5vw,4.5rem);font-weight:400;line-height:1.05;letter-spacing:-.02em;font-style:italic;margin:20px 0 16px}
.inner-hero-title b{font-family:var(--fb);font-style:normal;font-weight:800;letter-spacing:-.04em;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.inner-hero-sub{font-size:clamp(1rem,2vw,1.15rem);color:var(--t3);line-height:1.7;font-weight:300;max-width:520px;margin:0 auto}

/* HERO */
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
.dash-wrap{margin-top:56px;width:100%;max-width:1080px;position:relative;z-index:1;animation:fU .7s .5s var(--reveal) both}
.dash{background:var(--bg1);border:1px solid var(--bg_line);border-radius:16px;overflow:hidden;box-shadow:var(--sc),var(--sg)}
.dash-bar{display:flex;align-items:center;gap:6px;padding:12px 16px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--b0)}
.dot{width:9px;height:9px;border-radius:50%}.dot-r{background:#FF5F57}.dot-y{background:#FEBC2E}.dot-g{background:#28C840}
.dash-url{flex:1;background:rgba(255,255,255,.04);border-radius:5px;padding:4px 10px;font-size:10px;color:var(--t4);text-align:center;margin:0 16px;letter-spacing:.04em}
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
.dash-calendar-section{background:rgba(255,255,255,.015);border:1px solid var(--b0);border-radius:10px;padding:12px;margin-top:2px}
.dash-calendar-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.dash-cal-month{font-size:10px;font-weight:600;color:var(--gold);letter-spacing:.06em}
.cal-header-row{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px}
.cal-header-cell{font-size:9px;font-weight:600;color:var(--t4);text-align:center;letter-spacing:.08em;padding:2px 0}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-cell{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:7px;min-height:44px;padding:5px 6px;transition:all .2s;cursor:default}
.cal-cell:hover{border-color:rgba(212,175,106,.3);background:rgba(212,175,106,.04)}
.cal-day-num{font-size:9.5px;font-weight:500;color:rgba(255,255,255,.45);line-height:1}
.marquee-sec{padding:28px 0;border-top:1px solid var(--bg_line);border-bottom:1px solid var(--bg_line);background:rgba(212,175,106,.02);overflow:hidden}
.marquee-lbl{text-align:center;font-size:9px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.marquee-track{display:flex;animation:marquee 28s linear infinite;width:max-content}
.m-item{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:400;color:var(--t3);white-space:nowrap;font-style:italic;padding:0 20px}
.m-sep{color:rgba(212,175,106,.3);font-size:16px}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.eyebrow{font-size:9px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:block}
.sec-title{font-family:var(--fd);font-size:clamp(2rem,5vw,4rem);font-weight:400;line-height:1.05;color:var(--t1);font-style:italic}
.sec-title b{font-family:var(--fb);font-style:normal;font-weight:800;letter-spacing:-.03em;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sec-sub{font-size:15px;color:var(--t3);margin-top:12px;font-weight:300;line-height:1.6}
.sec-hd{margin-bottom:64px}
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
.video-sec{padding:60px 0;background:var(--bg1);border-top:1px solid var(--bg_line);border-bottom:1px solid var(--bg_line)}
.video-inner{max-width:900px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.yt-wrap{position:relative}
.yt-wrap::before{content:'';position:absolute;inset:-1px;border-radius:17px;background:var(--ggold);z-index:0;opacity:.5;filter:blur(1px)}
.yt-frame{position:relative;z-index:1;border-radius:16px;overflow:hidden;aspect-ratio:16/9;box-shadow:var(--sc)}
.yt-frame iframe{width:100%;height:100%;border:none;display:block}
.gallery-sec{padding:80px 0}
.gallery-inner{max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.gallery-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:48px}
.gallery-placeholder{background:var(--bg2);border:1px dashed var(--bg_line);border-radius:16px;aspect-ratio:16/9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;transition:all .3s}
.gallery-placeholder:hover{border-color:var(--gold);background:var(--goldm)}
.gp-icon{font-size:32px;opacity:.5}
.gp-txt{font-size:13px;color:var(--t4);text-align:center;line-height:1.5}
.gp-txt span{font-size:11px;opacity:.7}
.results{padding:80px 0;background:var(--bg1);border-top:1px solid var(--bg_line);border-bottom:1px solid var(--bg_line)}
.results-inner{max-width:1200px;margin:0 auto;padding-inline:clamp(1.5rem,4vw,4rem)}
.results-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:48px;border:1px solid var(--bg_line)}
.result-block{padding:40px 28px;text-align:center;background:var(--bg);transition:all .3s}
.result-block:hover{background:var(--bg2)}
.r-num{font-family:var(--fd);font-size:clamp(2.5rem,5vw,4rem);font-weight:400;line-height:1;color:var(--goldl);margin-bottom:6px;font-style:italic}
.r-label{font-size:12px;color:var(--t3);line-height:1.5;font-weight:300}
.r-divider{width:32px;height:1px;background:var(--bg_line);margin:10px auto}
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
.plan-cta{display:block;width:100%;text-align:center;font-family:var(--fb);font-size:13px;font-weight:600;padding:11px 20px;border-radius:7px;border:1px solid var(--bg_line);color:var(--t2);background:transparent;cursor:pointer;transition:all .25s;letter-spacing:.04em;margin-bottom:28px}
.plan-cta:hover{background:var(--goldm);border-color:var(--gold);color:var(--goldl)}
.plan-cta-p{background:var(--ggold);color:var(--inv);border-color:transparent}
.plan-cta-p:hover{transform:translateY(-2px);box-shadow:var(--sg);background:var(--ggold);color:var(--inv)}
.plan-features{list-style:none;display:flex;flex-direction:column;gap:10px}
.plan-features li{font-size:13px;color:var(--t3);font-weight:300;display:flex;align-items:flex-start;gap:8px;line-height:1.4}
.feat-check{color:var(--ok);font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px}
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
.cta{padding:100px 24px;text-align:center;position:relative;overflow:hidden}
.cta::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:500px;background:radial-gradient(ellipse,rgba(212,175,106,.07) 0%,transparent 65%);pointer-events:none}
.cta-inner{max-width:680px;margin:0 auto;position:relative;z-index:1}
.cta-title{font-family:var(--fd);font-size:clamp(2.5rem,6vw,5rem);font-weight:400;line-height:1.05;margin-bottom:16px;font-style:italic}
.cta-title b{font-family:var(--fb);font-style:normal;font-weight:800;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cta-sub{font-size:15px;color:var(--t3);margin-bottom:40px;line-height:1.65;font-weight:300}
.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
footer{padding:32px clamp(1.5rem,4vw,4rem);border-top:1px solid var(--bg_line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;max-width:1200px;margin:0 auto}
footer p{font-size:12px;color:var(--t4);font-style:italic}
.foot-links{display:flex;gap:20px;align-items:center}
.foot-links a{font-size:12px;color:var(--t4);text-decoration:none;transition:color .2s;letter-spacing:.04em}
.foot-links a:hover{color:var(--goldl)}
.foot-btn{font-size:12px;color:var(--t4);background:none;border:none;cursor:pointer;font-family:var(--fb);transition:color .2s;padding:0;letter-spacing:.04em}
.foot-btn:hover{color:var(--goldl)}
.sr{opacity:0;transform:translateY(28px);transition:opacity .6s var(--reveal),transform .6s var(--reveal)}
.sr-l{opacity:0;transform:translateX(-28px);transition:opacity .6s var(--reveal),transform .6s var(--reveal)}
.sr.vis,.sr-l.vis{opacity:1;transform:none}
.d1{transition-delay:.1s}.d2{transition-delay:.2s}.d3{transition-delay:.3s}.d4{transition-delay:.4s}
@keyframes fU{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--bg_line);border-radius:100px}
::-webkit-scrollbar-thumb:hover{background:var(--gold)}
::selection{background:var(--goldm);color:var(--goldl)}

/* ══════════════════════════════════
   AUTH PAGE — layout centralizado
══════════════════════════════════ */
.auth-page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  overflow:hidden;
  padding:40px 20px;
  background:var(--bg);
}
/* orbs de fundo */
.auth-bg-orb-a{position:absolute;width:600px;height:600px;top:-15%;left:-10%;background:rgba(212,175,106,.07);border-radius:50%;filter:blur(130px);pointer-events:none;animation:orbF 10s ease-in-out infinite}
.auth-bg-orb-b{position:absolute;width:500px;height:500px;bottom:-15%;right:-8%;background:rgba(168,180,200,.05);border-radius:50%;filter:blur(110px);pointer-events:none;animation:orbF 14s ease-in-out infinite reverse}
.auth-bg-mesh{position:absolute;inset:0;background:var(--gmesh);pointer-events:none}

/* coluna central */
.auth-center{
  position:relative;z-index:1;
  display:flex;flex-direction:column;align-items:center;
  gap:24px;
  width:100%;max-width:480px;
}

/* ① LOGO — exatamente como a imagem enviada */
.auth-logo{
  display:flex;align-items:center;gap:14px;
  background:none;border:none;cursor:pointer;padding:0;
  transition:opacity .2s;
  text-decoration:none;
}
.auth-logo:hover{opacity:.85}
.auth-logo-icon{
  width:52px;height:52px;border-radius:14px;
  background:var(--ggold);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--fb);font-weight:800;font-size:18px;color:#0A0A0C;
  box-shadow:0 4px 20px rgba(212,175,106,.35);
  flex-shrink:0;
}
.auth-logo-text{display:flex;flex-direction:column;gap:2px}
.auth-logo-name{
  font-family:var(--fd);font-size:20px;font-style:italic;
  color:var(--t1);line-height:1;display:block;white-space:nowrap;
}
.auth-logo-sub{
  font-size:9px;font-weight:700;letter-spacing:.28em;
  text-transform:uppercase;color:var(--gold);display:block;
}

/* ② CARD */
.auth-card{
  width:100%;
  background:var(--bg1);
  border:1px solid rgba(255,255,255,.08);
  border-radius:20px;
  padding:36px 40px;
  box-shadow:0 32px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);
  animation:authCardIn .45s var(--reveal) both;
}
@keyframes authCardIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* tabs */
.auth-tabs{display:flex;gap:4px;background:rgba(255,255,255,.04);border:1px solid var(--b0);border-radius:12px;padding:4px;margin-bottom:28px}
.auth-tab{flex:1;font-family:var(--fb);font-size:13px;font-weight:500;color:var(--t3);background:transparent;border:none;border-radius:8px;padding:9px 12px;cursor:pointer;transition:all .2s var(--ease)}
.auth-tab.active{background:rgba(255,255,255,.1);color:var(--t1);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.auth-tab:hover:not(.active){color:var(--t2)}

/* form views */
.av-wrap{width:100%;animation:authSlideUp .38s var(--reveal) both}
@keyframes authSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.av-header{margin-bottom:24px}
.av-eyebrow{font-size:9px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:block}
.av-title{font-family:var(--fd);font-size:clamp(1.6rem,3vw,2.2rem);font-weight:400;line-height:1.1;color:var(--t1);font-style:italic;margin-bottom:6px}
.av-title b{font-family:var(--fb);font-style:normal;font-weight:800;letter-spacing:-.03em;background:var(--gtext);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.av-sub{font-size:13px;color:var(--t3);line-height:1.6;font-weight:300}
.av-form{display:flex;flex-direction:column;gap:13px}

/* fields */
.ai-field{display:flex;flex-direction:column;gap:5px}
.ai-label{font-size:11px;font-weight:500;color:var(--t3);letter-spacing:.06em;text-transform:uppercase}
.ai-wrap{position:relative;display:flex;align-items:center;background:rgba(255,255,255,.04);border:1px solid var(--b0);border-radius:10px;transition:all .2s var(--ease)}
.ai-wrap:focus-within{border-color:var(--gold);background:rgba(212,175,106,.05);box-shadow:0 0 0 3px rgba(212,175,106,.08)}
.ai-wrap.err{border-color:var(--err);box-shadow:0 0 0 3px rgba(232,92,92,.08)}
.ai-icon{padding:0 10px 0 14px;color:var(--t4);display:flex;align-items:center;flex-shrink:0;transition:color .2s}
.ai-wrap:focus-within .ai-icon{color:var(--gold)}
.ai-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--fb);font-size:14px;font-weight:400;color:var(--t1);padding:13px 14px 13px 0;width:100%}
.ai-input::placeholder{color:var(--t4)}
.ai-input:-webkit-autofill,.ai-input:-webkit-autofill:hover,.ai-input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px #111115 inset !important;-webkit-text-fill-color:var(--t1) !important;caret-color:var(--t1)}
.ai-eye{padding:0 14px;background:none;border:none;cursor:pointer;color:var(--t4);display:flex;align-items:center;transition:color .2s;flex-shrink:0}
.ai-eye:hover{color:var(--t2)}
.ai-err{font-size:11px;color:var(--err);font-weight:500}

/* row */
.av-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:-1px}

/* checkbox */
.av-check-label{display:flex;align-items:flex-start;gap:9px;font-size:12px;color:var(--t3);cursor:pointer;line-height:1.5}
.av-check-hidden{position:absolute;opacity:0;width:0;height:0}
.av-check-box{width:17px;height:17px;border:1px solid var(--b0);border-radius:5px;background:rgba(255,255,255,.04);flex-shrink:0;margin-top:1px;transition:all .2s var(--spring);position:relative;display:inline-block}
.av-check-hidden:checked ~ .av-check-box{background:var(--ggold);border-color:var(--gold)}
.av-check-hidden:checked ~ .av-check-box::after{content:'✓';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:700;color:#0A0A0C}

/* links */
.av-link{font-family:var(--fb);font-size:12px;font-weight:500;color:var(--t3);background:none;border:none;cursor:pointer;padding:0;text-decoration:none;transition:color .2s}
.av-link:hover{color:var(--t1)}
.av-link-gold{color:var(--goldl) !important}
.av-link-gold:hover{color:var(--gold) !important}

/* submit */
.av-submit{width:100%;font-family:var(--fb);font-size:14px;font-weight:600;letter-spacing:.04em;color:#0A0A0C;background:var(--ggold);border:none;border-radius:10px;padding:14px 24px;cursor:pointer;position:relative;overflow:hidden;transition:all .25s var(--ease);box-shadow:0 4px 20px rgba(212,175,106,.25);margin-top:4px;display:flex;align-items:center;justify-content:center;min-height:50px}
.av-submit::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);transition:left .4s}
.av-submit:hover::before{left:100%}
.av-submit:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(212,175,106,.4),0 0 80px rgba(212,175,106,.15)}
.av-submit:active{transform:translateY(0)}
.av-submit.loading{pointer-events:none;opacity:.8}
.av-spinner{width:20px;height:20px;border:2px solid rgba(0,0,0,.25);border-top-color:#0A0A0C;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* divider */
.av-divider{display:flex;align-items:center;gap:16px;margin:20px 0 16px;color:var(--t4);font-size:11px;letter-spacing:.1em}
.av-divider::before,.av-divider::after{content:'';flex:1;height:1px;background:var(--b0)}

/* footer */
.av-footer-txt{font-size:13px;color:var(--t3);text-align:center}

/* info box */
.av-info-box{display:flex;align-items:center;gap:10px;background:rgba(212,175,106,.06);border:1px solid rgba(212,175,106,.2);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--t3);line-height:1.5}

/* pwd strength */
.pwd-str{display:flex;align-items:center;gap:10px;margin-top:-5px}
.pwd-bars{display:flex;gap:4px;flex:1}
.pwd-bar{height:3px;flex:1;border-radius:100px;transition:background .35s var(--ease)}
.pwd-lbl{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;transition:color .35s;min-width:44px;text-align:right}

/* back button */
.av-back{display:inline-flex;align-items:center;gap:8px;font-family:var(--fb);font-size:12px;font-weight:500;color:var(--t4);background:none;border:none;cursor:pointer;padding:0;margin-bottom:24px;transition:color .2s}
.av-back:hover{color:var(--t2)}
.av-back svg{transition:transform .2s var(--ease)}
.av-back:hover svg{transform:translateX(-3px)}

/* success */
.av-success-wrap{text-align:center}
.av-success-icon{width:60px;height:60px;border-radius:50%;background:rgba(94,201,135,.12);border:1px solid rgba(94,201,135,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--ok);animation:successPop .5s var(--spring) both}
@keyframes successPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
.av-steps{display:flex;flex-direction:column;gap:8px;margin:20px 0}
.av-step{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.03);border:1px solid var(--b0);border-radius:10px;padding:11px 14px;text-align:left;transition:border-color .2s}
.av-step:hover{border-color:var(--bg_line)}
.av-step-num{width:24px;height:24px;border-radius:50%;background:var(--goldm);border:1px solid var(--bg_line);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--goldl);flex-shrink:0}
.av-step-txt{font-size:13px;color:var(--t2);font-weight:400}

/* ③ BADGES de plataforma */
.auth-platforms{
  display:flex;gap:10px;align-items:center;justify-content:center;
}
.auth-platform-badge{
  font-family:var(--fb);font-size:12px;font-weight:500;
  color:var(--t3);
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.09);
  border-radius:10px;
  padding:8px 20px;
  letter-spacing:.05em;
  transition:all .2s var(--ease);
}
.auth-platform-badge:hover{color:var(--t2);border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.07)}

/* ── REGISTER MULTI-STEP ── */
.reg-steps{
  display:flex;align-items:center;gap:0;
  margin-bottom:24px;
}
.reg-step-item{
  display:flex;align-items:center;gap:8px;
  font-size:12px;font-weight:500;color:var(--t4);
  transition:color .3s;
  flex-shrink:0;
}
.reg-step-item.active{color:var(--goldl)}
.reg-step-circle{
  width:24px;height:24px;border-radius:50%;
  border:1px solid var(--b0);
  background:rgba(255,255,255,.04);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;color:var(--t4);
  transition:all .3s var(--spring);
  flex-shrink:0;
}
.reg-step-item.active .reg-step-circle{
  background:var(--ggold);border-color:var(--gold);color:#0A0A0C;
  box-shadow:0 0 12px rgba(212,175,106,.35);
}
.reg-step-line{
  flex:1;height:1px;background:var(--b0);margin:0 10px;
}
.reg-optional-label{
  display:flex;align-items:center;gap:8px;
  font-size:11px;color:var(--t4);
  background:rgba(255,255,255,.03);
  border:1px solid var(--b0);
  border-radius:8px;padding:9px 12px;
  margin-bottom:2px;
}
.reg-optional-label span{font-style:italic}
.reg-btn-row{
  display:flex;gap:10px;align-items:stretch;
  margin-top:4px;
}
.reg-btn-back{
  display:flex;align-items:center;gap:6px;
  font-family:var(--fb);font-size:13px;font-weight:500;
  color:var(--t3);
  background:rgba(255,255,255,.05);
  border:1px solid var(--b0);
  border-radius:10px;
  padding:0 18px;cursor:pointer;
  transition:all .2s var(--ease);
  white-space:nowrap;flex-shrink:0;
}
.reg-btn-back:hover{color:var(--t1);background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.14)}
.reg-btn-submit{flex:1;margin-top:0 !important}

/* date input styling */
.ai-input[type="date"]{color-scheme:dark}
.ai-input[type="date"]::-webkit-calendar-picker-indicator{
  filter:invert(.4) sepia(1) saturate(2) hue-rotate(5deg);
  cursor:pointer;opacity:.7;
}
.ai-input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1}

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
  .auth-card{padding:28px 24px}
}
@media(max-width:600px){
  .results-grid{grid-template-columns:1fr}
  .stats-row{grid-template-columns:repeat(2,1fr)}
  .charts-row{grid-template-columns:1fr}
  .service-row{grid-template-columns:1fr auto;row-gap:4px}
  .srv-num{display:none}
  .wa-btn{bottom:16px;right:16px}
  .auth-card{padding:24px 18px}
  .auth-logo-name{font-size:17px}
}
`;

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [authenticated, setAuthenticated] = useState(() => authService.isAuthenticated());
  const [rootView, setRootView] = useState<RootView>("home");
  const [authView, setAuthView] = useState<AuthView>("login");
  const { curRef, ringRef } = useCustomCursor();

  const go = (p: Page) => { setRootView(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goAuth = (v: AuthView) => { setAuthView(v); setRootView("auth"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goSite = () => { setRootView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const onAuthSuccess = () => setAuthenticated(true);

  const isAuth = rootView === "auth";

  const renderPage = () => {
    switch (rootView) {
      case "funcionalidades": return <FuncPage   goAuth={goAuth}/>;
      case "precos":          return <PrecosPage  goAuth={goAuth}/>;
      case "faq":             return <FAQPage/>;
      case "empresa":         return <EmpresaPage/>;
      case "auth":            return <AuthRoot initialView={authView} goSite={goSite} onAuthSuccess={onAuthSuccess}/>;
      default:                return <HomePage   go={go} goAuth={goAuth}/>;
    }
  };

  if (authenticated) return <Index />;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet"/>
      <style dangerouslySetInnerHTML={{ __html: STYLES }}/>
      <div id="cur"      ref={curRef}/>
      <div id="cur-ring" ref={ringRef}/>
      {!isAuth && <Nav cur={rootView as Page} go={go} goAuth={goAuth}/>}
      {renderPage()}
      {!isAuth && <Footer go={go}/>}
      {!isAuth && <WhatsAppBtn/>}
    </>
  );
}
