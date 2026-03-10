import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutDashboard, TrendingUp, ClipboardList, BarChart3, Wallet,
  Menu, Moon, Sun, LineChart, ChevronLeft,
  CandlestickChart, CheckCircle, CalendarDays, Bot, Plug, UserCircle, LogOut
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useGPFX } from '@/contexts/GPFXContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  activeView: string;
  onChangeView: (view: string) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'evolucao', label: 'Evolução da Conta', icon: TrendingUp },
  { id: 'analise', label: 'Análise das Operações', icon: BarChart3 },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
  { id: 'planilha', label: 'Trade Log', icon: ClipboardList },
  { id: 'tradingview', label: 'TradingView Chart', icon: LineChart },
  { id: 'contas', label: 'Contas Ativas', icon: Wallet },
  { id: 'ia', label: 'IA do Trade', icon: Bot },
  { id: 'apis', label: 'APIs', icon: Plug },
  { id: 'perfil', label: 'Perfil', icon: UserCircle },
];

export function AppSidebar({ activeView, onChangeView, mobileOpen, onToggleMobile, collapsed, onToggleCollapse, onLogout }: SidebarProps) {
  const { showSaved } = useGPFX();
  const isMobile = useIsMobile();
  const effectiveCollapsed = isMobile ? false : collapsed;
  const { theme, toggleTheme } = useTheme();
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const [showScanLine, setShowScanLine] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleClick = (id: string) => {
    if (id === activeView) return;
    setClickedItem(id);
    setTimeout(() => setClickedItem(null), 300);
    setShowScanLine(true);
    setTimeout(() => setShowScanLine(false), 400);
    onChangeView(id);
    if (mobileOpen) onToggleMobile();
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    onLogout?.();
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[997] md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onToggleMobile}
        />
      )}

      {/* Mobile hamburger */}
      {!mobileOpen && (
        <button
          className="fixed top-4 left-4 z-[999] md:hidden p-2 rounded-lg"
          style={{
            background: 'rgba(0,211,149,0.1)',
            border: '1px solid rgba(0,211,149,0.2)',
          }}
          onClick={onToggleMobile}
        >
          <Menu size={20} color="#00d395" />
        </button>
      )}

      {/* Scan line effect */}
      {showScanLine && <div className="sidebar-scan-line" />}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-[998] h-screen flex-shrink-0 flex flex-col
          sidebar-glass transition-all duration-300
          ${effectiveCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          width: effectiveCollapsed ? 68 : 260,
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Grid background */}
        <div className="sidebar-grid-bg" />
        <div className="sidebar-orb sidebar-orb-1" />
        <div className="sidebar-orb sidebar-orb-2" />

        {/* Logo Section */}
        <div className="relative z-10 flex items-center justify-between" style={{ height: 72, padding: effectiveCollapsed ? '0 12px' : '0 20px' }}>
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${effectiveCollapsed ? 'justify-center w-full' : ''}`}>
            <CandlestickChart
              size={effectiveCollapsed ? 24 : 28}
              color="#00d395"
              className={`flex-shrink-0 transition-all duration-300 ${effectiveCollapsed ? 'sidebar-logo-glow' : ''}`}
            />
            {!effectiveCollapsed && (
               <div className="flex flex-col min-w-0">
                 <div className="flex items-center gap-1">
                   <span className="text-[15px] font-extrabold text-white whitespace-nowrap">Gustavo Pedrosa</span>
                   <span className="text-[17px] font-black whitespace-nowrap" style={{ color: '#00d395' }}>FX</span>
                 </div>
                 <span className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                   Pro Trading Suite
                 </span>
               </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden md:flex sidebar-toggle-btn"
          >
            <ChevronLeft
              size={14}
              color="#00d395"
              className="transition-transform duration-300"
              style={{ transform: effectiveCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
        </div>

        <div className="sidebar-separator mx-3" />

        {!effectiveCollapsed && (
          <div className="px-5 pt-5 pb-2">
            <span className="text-[9px] font-bold uppercase tracking-[3px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Navegação
            </span>
          </div>
        )}

        {/* Menu items */}
        <nav className="flex-1 flex flex-col gap-0.5 mt-2 overflow-y-auto overflow-x-hidden" style={{ padding: effectiveCollapsed ? '0 4px' : '0' }}>
          {menuItems.map(item => {
            const isActive = activeView === item.id;
            const isPinging = clickedItem === item.id;

            const button = (
              <button
                key={item.id}
                className={`
                  sidebar-menu-item
                  ${isActive ? 'sidebar-menu-active' : ''}
                  ${effectiveCollapsed ? 'sidebar-menu-collapsed' : ''}
                `}
                onClick={() => handleClick(item.id)}
              >
                <item.icon
                   className={`
                     sidebar-menu-icon flex-shrink-0
                     ${isActive ? 'sidebar-icon-active' : ''}
                     ${isPinging ? 'sidebar-icon-ping' : ''}
                   `}
                   size={18}
                   style={{ color: isActive ? '#00d395' : 'rgba(255,255,255,0.55)' }}
                 />
                {!effectiveCollapsed && (
                   <span className={`sidebar-menu-label ${isActive ? 'sidebar-label-active' : ''}`} style={{ color: isActive ? '#00d395' : 'rgba(255,255,255,0.65)' }}>
                     {item.label}
                   </span>
                 )}
              </button>
            );

            if (effectiveCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Footer separator */}
        <div className="sidebar-separator mx-3" />

        {/* Logout button */}
        <div className="relative z-10 px-3 py-2">
          {effectiveCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="w-[44px] h-[44px] mx-auto rounded-xl flex items-center justify-center transition-all hover:bg-[rgba(239,68,68,0.1)]"
                  style={{ border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <LogOut size={18} color="#ff4d4d" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Sair da conta</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-[rgba(239,68,68,0.1)]"
              style={{ color: '#ff4d4d' }}
            >
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center px-3 py-3" style={{ justifyContent: effectiveCollapsed ? 'center' : 'space-between' }}>
          {!effectiveCollapsed && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: showSaved ? '#00d395' : '#1e3a2e' }}>
              <CheckCircle size={12} />
              <span>{showSaved ? 'Salvo' : 'Sincronizado'}</span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="sidebar-theme-btn"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Moon size={14} color="#8b949e" /> : <Sun size={14} color="#f59e0b" />}
          </button>

          {effectiveCollapsed && (
            <div className="flex items-center" style={{ color: showSaved ? '#00d395' : '#1e3a2e' }}>
              <CheckCircle size={12} />
            </div>
          )}
        </div>

        {!effectiveCollapsed && (
          <div className="relative z-10 px-4 pb-3 text-center">
            <span className="text-[9px] font-medium" style={{ color: '#1e3a2e' }}>Gustavo Pedrosa FX v2.0</span>
          </div>
        )}
      </aside>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 space-y-4" style={{ background: 'var(--gpfx-card)', border: '1px solid var(--gpfx-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <LogOut size={20} color="#ff4d4d" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--gpfx-text-primary)' }}>Sair da conta</h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--gpfx-text-secondary)' }}>Deseja realmente sair da conta?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-10 rounded-lg text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--gpfx-text-secondary)', border: '1px solid var(--gpfx-border)' }}>
                Cancelar
              </button>
              <button onClick={handleLogoutConfirm}
                className="flex-1 h-10 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#ff4d4d' }}>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
