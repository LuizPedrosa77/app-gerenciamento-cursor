import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AuthView } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

export function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

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
export function LoginView({setView,onAuthSuccess}:{setView:(v:AuthView)=>void;onAuthSuccess:()=>void}) {
  const { login } = useAuth();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false); const [errors,setErrors]=useState<Record<string,string>>({}); const [formError,setFormError]=useState("");
  const validate=()=>{const e:Record<string,string>={};if(!email)e.email="Informe seu e-mail";else if(!/\S+@\S+\.\S+/.test(email))e.email="E-mail inválido";if(!password)e.password="Informe sua senha";else if(password.length<6)e.password="Mínimo 6 caracteres";setErrors(e);return Object.keys(e).length===0;};
  const handleSubmit=async (e:React.FormEvent)=>{e.preventDefault();setFormError("");if(!validate())return;setLoading(true);try{await login({email,password});if(!authService.isAuthenticated())throw new Error("Sessão não persistida");toast.success("Bem-vindo de volta!"); onAuthSuccess();}catch(err){const msg = getApiErrorMessage(err,"Não foi possível entrar. Verifique seus dados."); setFormError(msg); toast.error(msg);}finally{setLoading(false);}};
  return (
    <div className="av-wrap" key="login">
      <div className="av-header"><div className="av-eyebrow">Bem-vindo de volta</div><h1 className="av-title">Entrar na <b>plataforma</b></h1><p className="av-sub">Acesse seu dashboard e continue evoluindo.</p></div>
      <form className="av-form" onSubmit={handleSubmit} noValidate>
        <AuthInput label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={v=>{setEmail(v);setFormError("");if(errors.email)setErrors(prev=>({...prev,email:""}));}} icon={<IconMail/>} error={errors.email} autoComplete="email"/>
        <AuthInput label="Senha" placeholder="Sua senha" value={password} onChange={v=>{setPassword(v);setFormError("");if(errors.password)setErrors(prev=>({...prev,password:""}));}} icon={<IconLock/>} error={errors.password} showToggle autoComplete="current-password"/>
        <div className="av-row">
          <label className="av-check-label"><input type="checkbox" className="av-check-hidden"/><span className="av-check-box"/><span>Lembrar de mim</span></label>
          <button type="button" className="av-link" onClick={()=>setView("recover")}>Esqueci minha senha</button>
        </div>
        {formError&&<span className="ai-err">{formError}</span>}
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
export function RegisterView({setView,onAuthSuccess}:{setView:(v:AuthView)=>void;onAuthSuccess:()=>void}) {
  const { register } = useAuth();
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
  const [formError,setFormError]=useState("");

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
    setFormError("");
    if (Object.keys(e2).length > 0) return;
    setLoading(true);
    try {
      await register({
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
      if(!authService.isAuthenticated()) throw new Error("Sessão não persistida");
      onAuthSuccess();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Não foi possível criar a conta."); setFormError(msg); toast.error(msg);
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
            value={name} onChange={v=>{setName(v);setFormError("");}}
            icon={<IconUser/>} error={errors.name}
            autoComplete="name"
          />
          <AuthInput
            label="E-mail *"
            type="email" placeholder="seu@email.com"
            value={email} onChange={v=>{setEmail(v);setFormError("");}}
            icon={<IconMail/>} error={errors.email}
            autoComplete="email"
          />
          <AuthInput
            label="CPF *"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={v => {setCpf(maskCPF(v));setFormError("");}}
            icon={<IconCPF/>} error={errors.cpf}
            autoComplete="off"
          />
          <AuthInput
            label="Senha * (mín. 6 caracteres)"
            placeholder="Mínimo 6 caracteres"
            value={password} onChange={v=>{setPassword(v);setFormError("");}}
            icon={<IconLock/>} error={errors.password}
            showToggle autoComplete="new-password"
          />
          <PwdStrength password={password}/>
          <AuthInput
            label="Confirmar senha *"
            placeholder="Repita a senha"
            value={confirm} onChange={v=>{setConfirm(v);setFormError("");}}
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
            onChange={v => {setPhone(maskPhone(v));setFormError("");}}
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
                onChange={e => {setBirthDate(e.target.value);setFormError("");}}
                autoComplete="bday"
              />
            </div>
          </div>
          <AuthInput
            label="País"
            placeholder="Ex: Brasil"
            value={country} onChange={v=>{setCountry(v);setFormError("");}}
            icon={<IconGlobe/>}
            autoComplete="country-name"
          />
          <AuthInput
            label="Cidade"
            placeholder="Ex: São Paulo"
            value={city} onChange={v=>{setCity(v);setFormError("");}}
            icon={<IconCity/>}
            autoComplete="address-level2"
          />
          <AuthInput
            label="Endereço"
            placeholder="Rua, número, bairro"
            value={address} onChange={v=>{setAddress(v);setFormError("");}}
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
          {formError && <span className="ai-err">{formError}</span>}

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
  const handleSubmit=async (e:React.FormEvent)=>{e.preventDefault();if(!email){setError("Informe seu e-mail");return;}if(!/\S+@\S+\.\S+/.test(email)){setError("E-mail inválido");return;}setError("");setLoading(true);try{await authService.forgotPassword(email);toast.success("E-mail de recuperação enviado!"); setView("recover-sent");}catch(err){const msg = getApiErrorMessage(err,"Não foi possível enviar o e-mail de recuperação."); setError(msg); toast.error(msg);}finally{setLoading(false);}};
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
export function AuthRoot({initialView,goSite,onAuthSuccess}:{initialView:AuthView;goSite:()=>void;onAuthSuccess:()=>void}) {
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
