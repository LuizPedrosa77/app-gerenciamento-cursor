import React, { useEffect, useState } from 'react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { authService } from '@/services/authService';

function AppLayout({ onLogout }: { onLogout: () => void }) {
  const { state } = useGPFX();
  const [activeView, setActiveView] = useState('planilha');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding(state.accounts));
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(() => {
    return window.innerWidth < 1024;
  });

  const sidebarWidth = isMobile ? 0 : collapsed ? 68 : 260;

  const renderPage = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'tradingview':
        return <TradingViewPage />;
      case 'evolucao':
        return <EvolucaoPage />;
      case 'calendario':
        return <CalendarioPage onNavigateView={setActiveView} />;
      case 'planilha':
        return <PlanilhaPage />;
      case 'contas':
        return <ContasAtivasPage onNavigatePlanilha={() => setActiveView('planilha')} />;
      case 'analise':
        return <AnalisePage />;
      case 'ia':
        return <IADoTradePage />;
      case 'apis':
        return <APIsPage />;
      case 'perfil':
        return <PerfilPage />;
      default:
        return <PlanilhaPage />;
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117' }}>
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-bold mb-2" style={{ color: '#e2e8f0' }}>
              Algo deu errado
            </div>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Carregando seus dados...
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold mt-4"
              style={{ background: '#00d395', color: '#0d1117' }}
            >
              Tentar novamente
            </button>
            <button
              onClick={() => {
                authService.logout();
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold mt-4 ml-2"
              style={{ background: 'rgba(255,77,77,0.2)', color: '#ff4d4d' }}
            >
              Sair e limpar dados
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Index() {
  const [authenticated, setAuthenticated] = useState(() => authService.isAuthenticated());

  useEffect(() => {
    if (!authenticated) {
      window.location.replace('/');
    }
  }, [authenticated]);

  const handleLogout = () => {
    authService.logout();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d1117', color: '#e2e8f0' }}>
        <div className="text-center">
          <div className="text-lg font-bold mb-2">Redirecionando...</div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Sua sessão não está ativa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <GPFXProvider>
          <AppLayout onLogout={handleLogout} />
        </GPFXProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
