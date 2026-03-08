import { Bot } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function IADoTradePage() {
  const { theme } = useTheme();
  
  return (
    <div className="w-full h-screen flex items-center justify-center main-content-bg p-4">
      <div className="flex flex-col items-center justify-center max-w-md">
        {/* Icon */}
        <Bot size={64} color="#00d395" style={{ marginBottom: 24 }} />
        
        {/* Main text */}
        <h1 
          className="text-[28px] font-bold text-center mb-3"
          style={{ color: '#e2e8f0' }}
        >
          🚧 Em Construção
        </h1>
        
        {/* Secondary text */}
        <p 
          className="text-[14px] text-center mb-6"
          style={{ 
            color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            maxWidth: 440
          }}
        >
          A IA do Trade está sendo desenvolvida e em breve estará disponível para analisar seu histórico e responder suas dúvidas em tempo real.
        </p>
        
        {/* Badge */}
        <div 
          className="flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            background: 'rgba(0,211,149,0.1)',
            border: '1px solid rgba(0,211,149,0.25)',
          }}
        >
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#00d395' }}
          />
          <span 
            className="text-xs font-medium"
            style={{ color: '#00d395' }}
          >
            Em desenvolvimento
          </span>
        </div>
      </div>
    </div>
  );
}
