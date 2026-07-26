import { Stat, Service, Result, Testimonial, PricingPlan, FAQ } from './types';

// ─── DATA ─────────────────────────────────────────────────────────────────────
export const DASHBOARD_STATS: Stat[] = [
  { value: "+$4.280", label: "P&L Mensal",  color: "ok"   },
  { value: "67,4%",   label: "Win Rate"                   },
  { value: "2,3",     label: "RR Médio",    color: "ok"   },
  { value: "86",      label: "GP Score",    color: "gold" },
];
export const MARQUEE_ITEMS = ["📊 Dashboard","📈 Evolução da Conta","🔬 Análise das Operações","📅 Calendário","📋 Trade Log","📉 TradingView Chart","🏦 Contas Ativas","🤖 IA do Trade","🔌 APIs","👤 Perfil"];
export const SIDEBAR_ITEMS = [
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
export const CAL_DAYS    = Array.from({ length: 28 }, (_, i) => i + 1);
export const CAL_HEADERS = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
export const SERVICES: Service[] = [
  { num:"01/", title:"Dashboard completo com 8 gráficos",   desc:"Win rate, P&L diário, distribuição por ativo, horário ideal de entrada — tudo em tempo real.",       tags:["Sincronização automática","8 métricas"] },
  { num:"02/", title:"Calendário com GP Score",              desc:"Cada dia recebe uma pontuação baseada em disciplina, risco e resultado. Evolua de forma mensurável.",tags:["Score de disciplina"] },
  { num:"03/", title:"Conexão MT5, MT4 e cTrader",           desc:"Importe todas as suas operações automaticamente. Sem planilhas, sem trabalho manual.",               tags:["Import automático"] },
  { num:"04/", title:"Replay de Mercado",                    desc:"Reviva qualquer operação tick a tick. Treine, identifique padrões e melhore suas entradas.",         tags:["Modo treinamento"] },
  { num:"05/", title:"IA do Trade para análise inteligente", desc:"Nossa IA analisa seus padrões de comportamento e sugere melhorias específicas para o seu estilo.",   tags:["Powered by AI"] },
];
export const RESULTS: Result[] = [
  { num:"+67%",   label:"aumento médio no win rate após 60 dias" },
  { num:"2.400+", label:"traders profissionais ativos"           },
  { num:"−45%",   label:"redução no drawdown mensal"             },
  { num:"4.9★",   label:"avaliação média dos usuários"           },
];
export const TESTIMONIALS: Testimonial[] = [
  { quote:"O GP Score mudou minha visão sobre disciplina. Os dados mostraram onde eu estava errando.", name:"Rafael Cunha",   role:"Trader Forex · 3 anos", metric:"+34% no win rate em 60 dias"              },
  { quote:"A conexão com MT5 é perfeita. Zero trabalho manual. O replay me ajudou a melhorar muito.", name:"Ana Martins",    role:"Prop Trader · FTMO",    metric:"Passou na avaliação FTMO na 2ª tentativa" },
  { quote:"A IA identificou que perco mais nos primeiros 30 min. Mudei e os resultados melhoraram.",   name:"Lucas Ferreira", role:"Day Trader · Índices",  metric:"Drawdown reduzido em 45%"                },
];
export const PRICING_PLANS: PricingPlan[] = [
  { name:"Starter", price:{monthly:0,annual:0},   desc:"Para traders que estão começando a controlar suas métricas.",       features:["Dashboard básico (4 gráficos)","Conexão com 1 corretora","GP Score mensal","Histórico de 30 dias"],                                                                                  cta:"Criar conta agora" },
  { name:"Pro",     price:{monthly:97,annual:77},  desc:"Para traders sérios que querem evoluir de forma consistente.",      features:["Dashboard completo (8 gráficos)","Conexão ilimitada com corretoras","GP Score diário + calendário","IA do Trade","Replay de Mercado","Relatórios automáticos","Histórico ilimitado"], cta:"Começar 7 dias grátis", highlight:true },
  { name:"Elite",   price:{monthly:197,annual:157},desc:"Para prop traders e profissionais que exigem o máximo.",            features:["Tudo do Pro","Análise multi-conta","Relatórios personalizados","Suporte prioritário","API de integração","Onboarding individual"],                                                    cta:"Falar com especialista" },
];
export const FAQS: FAQ[] = [
  { q:"Como funciona a conexão com MT5/MT4/cTrader?",          a:"A integração é feita via plugin. Após a instalação, todas as operações são sincronizadas automaticamente em tempo real." },
  { q:"Preciso de cartão de crédito para testar?",             a:"Não. O plano Starter é gratuito para sempre. O período de 7 dias grátis do Pro também não exige cartão." },
  { q:"O que é o GP Score?",                                   a:"GP Score é nossa métrica proprietária que avalia cada dia de trading com uma pontuação de 0 a 100, baseada em disciplina, gestão de risco e resultado." },
  { q:"A IA do Trade funciona com qualquer estilo de trading?", a:"Sim. A IA analisa seus próprios dados e aprende o seu estilo — seja scalping, day trade ou swing trade." },
  { q:"Posso cancelar a qualquer momento?",                    a:"Sim, sem burocracia. Você cancela pela própria plataforma. Seus dados ficam disponíveis por 90 dias após o cancelamento." },
  { q:"A plataforma funciona com corretoras brasileiras?",     a:"Sim. Qualquer corretora que opere com MT5, MT4 ou cTrader é compatível, incluindo as principais do mercado brasileiro." },
];

