import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Page, AuthView } from '../../types';
import { SERVICES, RESULTS, TESTIMONIALS, PRICING_PLANS, FAQS, DASHBOARD_STATS, MARQUEE_ITEMS, SIDEBAR_ITEMS, CAL_DAYS, CAL_HEADERS } from '../../constants';

// ─── ATOMS ───────────────────────────────────────────────────────────────────
export const Eyebrow  = ({children}:{children:React.ReactNode}) => <span className="eyebrow">{children}</span>;
export const SecTitle = ({children}:{children:React.ReactNode}) => <h2 className="sec-title">{children}</h2>;


// ─── HOOKS ────────────────────────────────────────────────────────────────────
export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('vis');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.sr').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

export function useCustomCursor() {
  const curRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (curRef.current) {
        curRef.current.style.left = e.clientX + 'px';
        curRef.current.style.top = e.clientY + 'px';
      }
      if (ringRef.current) {
        ringRef.current.style.left = e.clientX + 'px';
        ringRef.current.style.top = e.clientY + 'px';
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return { curRef, ringRef };
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
export function Nav() {
  const navigate = useNavigate();
  const cur = window.location.pathname.replace("/", "") || "home";
  const [mob,setMob]=useState(false);
  const [co,setCo]=useState(false);
  const [mco,setMco]=useState(false);
  useEffect(()=>{const r=()=>{if(window.innerWidth>=768)setMob(false);};window.addEventListener("resize",r);return()=>window.removeEventListener("resize",r);},[]);
  const nav=[{label:"Funcionalidades",page:"funcionalidades" as Page},{label:"Preços",page:"precos" as Page},{label:"FAQ",page:"faq" as Page}];
  return (
    <div className="nav-pill-wrap">
      <header className={`nav-pill${mob?" mobile-open":""}`}>
        <div className="nav-row">
          <button className="logo" onClick={()=>{navigate("/");setMob(false);}}>
            <div className="logo-icon">GP</div>
            <div><span className="logo-name">Gustavo Pedrosa FX</span><span className="logo-sub">Pro Trading Suite</span></div>
          </button>
          <div className="nav-center-wrap">
            <ul className="nav-inner-pill">
              {nav.map(l=>(
                <li key={l.page}><button className={`nav-link${cur===l.page?" nav-link-active":""}`} onClick={()=>navigate("/" + l.page)}>{l.label}</button></li>
              ))}
              <li className="nav-dropdown-wrap" onMouseEnter={()=>setCo(true)} onMouseLeave={()=>setCo(false)}>
                <button className={`nav-link nav-link-btn${cur==="empresa"?" nav-link-active":""}`} aria-expanded={co}>
                  <span>Empresa</span>
                  <svg className={`nav-chevron${co?" open":""}`} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div className={`nav-dropdown${co?" visible":""}`}>
                  <div className="nav-dropdown-inner">
                    <button className="nav-dropdown-item" onClick={()=>{navigate("/empresa");setCo(false);}}>Sobre nós</button>
                    <a href="#contato" className="nav-dropdown-item">Contato</a>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div className="nav-cta-wrap">
            <button className="btn-outline" onClick={()=>navigate("/login")}>Entrar</button>
            <button className="btn-nav-gold" onClick={()=>navigate("/register")}>Criar conta agora</button>
          </div>
          <button className="nav-hamburger" onClick={()=>setMob(!mob)} aria-label="Menu">
            {mob?<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>}
          </button>
        </div>
        <div className={`nav-mobile-drawer${mob?" open":""}`}>
          <div className="nav-mobile-divider"/>
          <nav className="nav-mobile-nav">
            {nav.map(l=>(
              <button key={l.page} className={`nav-mobile-link${cur===l.page?" nav-ml-act":""}`} onClick={()=>{navigate("/" + l.page);setMob(false);}}>{l.label}</button>
            ))}
            <div className="nav-mobile-accordion">
              <button className="nav-mobile-link nav-mobile-accordion-btn" onClick={()=>setMco(!mco)}>
                <span>Empresa</span>
                <svg className={`nav-chevron${mco?" open":""}`} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {mco&&(<div className="nav-mobile-subnav"><button className="nav-mobile-sublink" onClick={()=>{navigate("/empresa");setMob(false);}}>Sobre nós</button><a href="#contato" className="nav-mobile-sublink">Contato</a></div>)}
            </div>
          </nav>
          <div className="nav-mobile-divider"/>
          <div className="nav-mobile-footer">
            <button className="btn-outline" style={{flex:1,textAlign:"center"}} onClick={()=>{navigate("/login");setMob(false);}}>Entrar</button>
            <button className="btn-nav-gold" style={{flex:1,textAlign:"center"}} onClick={()=>{navigate("/register");setMob(false);}}>Criar conta agora</button>
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
function PricingBlock({annual}:{annual:boolean}) {
  const navigate = useNavigate();
  return (
    <div className="pricing-grid">{PRICING_PLANS.map((plan,i)=>(
      <div key={plan.name} className={`plan-card sr d${i+1}${plan.highlight?" highlight":""}`}>
        {plan.highlight&&<div className="plan-badge">Mais popular</div>}
        <div className="plan-name">{plan.name}</div>
        <div className="plan-price">{plan.price.monthly===0?<span className="p-val">Grátis</span>:<><span className="p-curr">R$</span><span className="p-val">{annual?plan.price.annual:plan.price.monthly}</span><span className="p-per">/mês</span></>}</div>
        {annual&&plan.price.monthly>0&&<p className="p-annual-note">cobrado anualmente · R${(annual?plan.price.annual:plan.price.monthly)*12}/ano</p>}
        <p className="plan-desc">{plan.desc}</p>
        <button className={`plan-cta${plan.highlight?" plan-cta-p":""}`} onClick={()=>navigate("/register")}>{plan.cta}</button>
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
export function HomePage() {
  const navigate = useNavigate();
  useScrollReveal();
  return (
    <>
      <section className="hero">
        <div className="h-mesh"/><div className="h-orb-a"/><div className="h-orb-b"/><div className="noise"/>
        <div className="badge"><div className="badge-dot"/> Plataforma #1 para traders profissionais</div>
        <h1 className="hero-title">Gerencie suas operações <b>com inteligência</b></h1>
        <p className="hero-sub">Dashboard completo, GP Score, IA para análise e conexão direta com MT5, MT4 e cTrader.</p>
        <div className="hero-btns">
          <button className="btn-hg btn-hg-p" onClick={()=>navigate("/register")}>Criar conta agora</button>
          <button className="btn-hg btn-hg-s" onClick={()=>navigate("/funcionalidades")}>Ver funcionalidades →</button>
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
        <ServicesList onClick={()=>navigate("/funcionalidades")}/>
        <div style={{textAlign:"center",marginTop:"40px"}}><button className="btn-see-all" onClick={()=>navigate("/funcionalidades")}>Ver demonstração completa →</button></div>
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
          <button className="btn-hg btn-hg-p" style={{fontSize:"16px",padding:"15px 38px"}} onClick={()=>navigate("/register")}>Criar conta agora</button>
          <button className="btn-hg btn-hg-s" onClick={()=>navigate("/precos")}>Ver planos →</button>
        </div>
      </div></section>
    </>
  );
}
export function FuncPage() {
  const navigate = useNavigate();
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero badge="Veja como funciona na prática" title={<>Conheça cada <b>funcionalidade</b><br/>da plataforma</>} sub="Do dashboard ao GP Score, da IA ao Replay — assista ao vídeo e explore o sistema completo."/>
      <section className="video-sec"><div className="video-inner sr"><div className="sec-hd" style={{textAlign:"center",marginBottom:"40px"}}><Eyebrow>Demonstração</Eyebrow><SecTitle>Veja a plataforma <b>em ação</b></SecTitle><p className="sec-sub">Conheça todas as funcionalidades em menos de 3 minutos.</p></div><div className="yt-wrap"><div className="yt-frame"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1" title="GP Trading Suite" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div></div></div></section>
      <section className="services" style={{paddingTop:"60px"}}><div className="sec-hd sr"><Eyebrow>O que está incluído</Eyebrow><SecTitle>Todas as ferramentas<br/><b>do seu lado</b></SecTitle></div><ServicesList/></section>
      <section className="gallery-sec"><div className="gallery-inner"><div className="sec-hd sr" style={{textAlign:"center"}}><Eyebrow>Screenshots</Eyebrow><SecTitle>Dentro da <b>plataforma</b></SecTitle><p className="sec-sub">As imagens do sistema serão adicionadas em breve.</p></div><div className="gallery-grid sr d1">{[1,2,3,4].map(n=><div key={n} className="gallery-placeholder"><div className="gp-icon">📸</div><p className="gp-txt">Screenshot {n}<br/><span>Aguardando imagem</span></p></div>)}</div></div></section>
      <section className="cta" style={{paddingTop:"60px"}}><div className="cta-inner sr"><Eyebrow>Pronto para começar?</Eyebrow><h2 className="cta-title">Experimente <b>gratuitamente</b></h2><p className="cta-sub">Crie sua conta e conecte sua corretora em menos de 2 minutos.</p><div className="cta-btns"><button className="btn-hg btn-hg-p" style={{fontSize:"16px",padding:"15px 38px"}} onClick={()=>navigate("/register")}>Criar conta agora</button><button className="btn-hg btn-hg-s" onClick={()=>navigate("/login")}>Já tenho conta →</button></div></div></section>
    </main>
  );
}
export function PrecosPage() {
  const navigate = useNavigate();
  const [annual,setAnnual]=useState(false); useScrollReveal();
  const priceFaqs:FAQ[]=[{q:"Preciso de cartão para começar?",a:"Não. O plano Starter é gratuito para sempre."},{q:"Posso trocar de plano a qualquer momento?",a:"Sim. Upgrade ou downgrade pela própria plataforma, sem taxas extras."},{q:"O que acontece com meus dados se cancelar?",a:"Ficam disponíveis para exportação por 90 dias após o cancelamento."},{q:"O plano Pro tem trial grátis?",a:"Sim, 7 dias grátis sem cartão."}];
  return (
    <main className="page-main">
      <InnerHero badge="Sem taxa de setup · Cancele quando quiser" title={<>Planos que cabem no seu <b>estilo de trading</b></>} sub="Comece grátis. Faça upgrade quando estiver pronto. Sem cartão de crédito para começar."/>
      <section className="pricing-sec"><div className="pricing-inner"><div className="sec-hd sr" style={{textAlign:"center"}}><Eyebrow>Preços</Eyebrow><SecTitle>Invista no seu <b>desenvolvimento</b></SecTitle><p className="sec-sub">Escolha o plano ideal para o seu momento.</p><div className="billing-toggle"><span className={!annual?"tog-act":""}>Mensal</span><button className={`toggle-btn${annual?" on":""}`} onClick={()=>setAnnual(!annual)}><div className="toggle-knob"/></button><span className={annual?"tog-act":""}>Anual <em className="save-badge">−20%</em></span></div></div><PricingBlock annual={annual}/></div></section>
      <section className="faq-sec" style={{paddingTop:"60px",paddingBottom:"80px"}}><div className="faq-inner"><div className="sec-hd sr" style={{textAlign:"center"}}><Eyebrow>Dúvidas sobre os planos</Eyebrow><SecTitle>Perguntas sobre <b>preços</b></SecTitle></div><FAQList items={priceFaqs}/></div></section>
    </main>
  );
}
export function FAQPage() {
  useScrollReveal();
  return (
    <main className="page-main">
      <InnerHero badge="Respostas rápidas e diretas" title={<>Perguntas <b>frequentes</b></>} sub="Tire todas as suas dúvidas sobre a plataforma, integrações e planos."/>
      <section className="faq-sec" style={{paddingTop:"40px",paddingBottom:"100px",background:"var(--bg)"}}><div className="faq-inner" style={{maxWidth:"860px"}}><FAQList items={FAQS}/><div className="faq-more sr" style={{marginTop:"32px"}}><div className="faq-more-icon">＋</div><p className="faq-more-txt">Mais perguntas serão adicionadas em breve.</p></div></div></section>
    </main>
  );
}
export function EmpresaPage() {
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
export function Footer() {
  const navigate = useNavigate();
  return (
    <footer>
      <p>© 2025 Gustavo Pedrosa FX · Pro Trading Suite</p>
      <div className="foot-links">
        <button className="foot-btn" onClick={()=>navigate("/empresa")}>Empresa</button>
        <button className="foot-btn" onClick={()=>navigate("/precos")}>Preços</button>
        <a href="#">Termos</a><a href="#">Privacidade</a><a href="#">Suporte</a>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH — layout centralizado (logo acima · card · badges abaixo)
// ══════════════════════════════════════════════════════════════════════════════

