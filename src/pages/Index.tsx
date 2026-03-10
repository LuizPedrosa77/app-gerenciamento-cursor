import { useState, useEffect } from 'react';
import { GPFXProvider, useGPFX } from '@/contexts/GPFXContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import OnboardingWizard, { shouldShowOnboarding } from '@/components/OnboardingWizard';
import { AppSidebar } from '@/components/GPFXSidebar';
import DashboardPage from '@/pages/DashboardPage';
import EvolucaoPage from '@/pages/EvolucaoPage';
import CalendarioPage from '@/pages/CalendarioPage';
import PlanilhaPage from '@/pages/PlanilhaPage';
import AnalisePage from '@/pages/AnalisePage';
import ContasAtivasPage from '@/pages/ContasAtivasPage';
import TradingViewPage from '@/pages/TradingViewPage';
import IADoTradePage from '@/pages/IADoTradePage';
import APIsPage from '@/pages/APIsPage';
import PerfilPage from '@/pages/PerfilPage';
import AuthPage from '@/pages/AuthPage';
import { useIsMobile } from '@/hooks/use-mobile';

function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { state } = useGPFX();
  const [activeView, setActiveView] = useState('planilha');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding(state.accounts));
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('gpfx_sidebar_state');
    if (saved === 'collapsed') return true;
    if (saved === 'expanded') return false;
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    localStorage.setItem('gpfx_sidebar_state', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  const sidebarWidth = isMobile ? 0 : (collapsed ? 68 : 260);

  const renderPage = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardPage />;
      case 'tradingview': return <TradingViewPage />;
      case 'evolucao': return <EvolucaoPage />;
      case 'calendario': return <CalendarioPage onNavigateView={setActiveView} />;
      case 'planilha': return <PlanilhaPage />;
      case 'contas': return <ContasAtivasPage onNavigatePlanilha={() => setActiveView('planilha')} />;
      case 'analise': return <AnalisePage />;
      case 'ia': return <IADoTradePage />;
      case 'apis': return <APIsPage />;
      case 'perfil': return <PerfilPage />;
      default: return <PlanilhaPage />;
    }
  };

  return (
    <div className="min-h-screen w-full">
      <AppSidebar
        activeView={activeView}
        onChangeView={setActiveView}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen(!mobileOpen)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onLogout={onLogout}
      />
      <main
        className="overflow-y-auto main-content-bg transition-all duration-300 page-fade-in"
        style={{
          marginLeft: sidebarWidth,
          minHeight: '100vh',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {renderPage()}
      </main>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} onNavigate={setActiveView} />
      )}
    </div>
  );
}

export default function Index() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('gpfx_authenticated') === 'true';
  });

  const handleLogin = () => {
    localStorage.setItem('gpfx_authenticated', 'true');
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('gpfx_authenticated');
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <ThemeProvider>
        <AuthPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <GPFXProvider>
        <AppLayout onLogout={handleLogout} />
      </GPFXProvider>
    </ThemeProvider>
  );
}
