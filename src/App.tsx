"use client";


import { useState, useEffect, useRef } from "react";
import Index from "./pages/Index";
import authService from "./services/authService";

import { HomePage, FuncPage, PrecosPage, FAQPage, EmpresaPage, Nav, Footer, useCustomCursor } from './pages/Landing';
import { AuthRoot } from './pages/Auth';
import { Toaster } from "sonner";

function WhatsAppBtn() {
  const phone = "5581989224862";
  const msg = encodeURIComponent("Olá! Gostaria de saber mais sobre o GP Trading Suite.");
  return (
    <a href={`https://wa.me/${phone}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="wa-btn" aria-label="WhatsApp">
      <span className="wa-label">Fale conosco!</span>
      <div className="wa-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.85L.057 23.617a.75.75 0 0 0 .918.932l5.919-1.553A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.933 0-3.742-.524-5.29-1.436l-.38-.224-3.936 1.032 1.001-3.85-.247-.395A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      </div>
    </a>
  );
}

function LandingLayout() {
  const { curRef, ringRef } = useCustomCursor();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />
      <div id="cur" ref={curRef} />
      <div id="cur-ring" ref={ringRef} />
      <Nav />
      <Outlet />
      <Footer />
      <WhatsAppBtn />
    </>
  );
}

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
      case "funcionalidades": return <FuncPage goAuth={goAuth} />;
      case "precos": return <PrecosPage goAuth={goAuth} />;
      case "faq": return <FAQPage />;
      case "empresa": return <EmpresaPage />;
      case "auth": return <AuthRoot initialView={authView} goSite={goSite} onAuthSuccess={onAuthSuccess} />;
      default: return <HomePage go={go} goAuth={goAuth} />;
    }
  };

  if (authenticated) return <Index />;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div id="cur" ref={curRef} />
      <div id="cur-ring" ref={ringRef} />
      {!isAuth && <Nav cur={rootView as Page} go={go} goAuth={goAuth} />}
      {renderPage()}
      {!isAuth && <Footer go={go} />}
      {!isAuth && <WhatsAppBtn />}
    </>
  );
}
