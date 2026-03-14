import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plug, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mtconnectService from '@/services/mtconnectService';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ConnectBrokerModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [accountName, setAccountName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const [platform, setPlatform] = useState('MT5');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setAccountName('');
        setLogin('');
        setPassword('');
        setServer('');
        setPlatform('MT5');
        setShowPw(false);
        setLoading(false);
      }, 300);
    }
  }, [open]);

  const canSubmit = accountName.trim() && login.trim() && password.trim() && server.trim();

  const handleConnect = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const connectRes = await mtconnectService.connect({
        login: login.trim(),
        investor_password: password.trim(),
        server: server.trim(),
        platform,
        account_name: accountName.trim(),
      });

      if (!connectRes.success) {
        toast({ title: 'Erro', description: connectRes.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      const syncRes = await mtconnectService.sync(connectRes.account_id);

      toast({
        title: 'Conta conectada!',
        description: `${syncRes.trades_imported} trades importados.`,
      });

      onClose();
      window.location.reload();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao conectar. Tente novamente.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-md w-full border-0 p-0 overflow-hidden"
        style={{
          background: 'var(--gpfx-card, #0d1117)',
          border: '1px solid rgba(0,211,149,0.15)',
          borderRadius: 16,
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--gpfx-text-primary, #e2e8f0)' }}>
            <Plug size={18} style={{ color: '#00d395' }} />
            Conectar Corretora
          </DialogTitle>
          <DialogDescription className="text-xs" style={{ color: 'var(--gpfx-text-muted, #64748b)' }}>
            Sincronize sua conta MT4/MT5 automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Account Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
              Nome da Conta
            </Label>
            <Input
              className="gpfx-input text-xs"
              placeholder="Ex: Conta Principal MT5"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
            />
          </div>

          {/* Login */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
              Login (número da conta)
            </Label>
            <Input
              className="gpfx-input text-xs"
              placeholder="Ex: 51234567"
              value={login}
              onChange={e => setLogin(e.target.value)}
            />
          </div>

          {/* Investor Password */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
              Investor Password
            </Label>
            <div className="relative">
              <Input
                className="gpfx-input text-xs pr-9"
                type={showPw ? 'text' : 'password'}
                placeholder="Senha somente leitura"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: '#64748b' }}
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <span className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Use a Investor Password, não a senha master. No MT5: Ferramentas → Configurações → Servidor → Investor Password
            </span>
          </div>

          {/* Server */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
              Servidor
            </Label>
            <Input
              className="gpfx-input text-xs"
              placeholder="Ex: ICMarkets-Demo"
              value={server}
              onChange={e => setServer(e.target.value)}
            />
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#64748b' }}>
              Plataforma
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="gpfx-input text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MT5">MetaTrader 5 (MT5)</SelectItem>
                <SelectItem value="MT4">MetaTrader 4 (MT4)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,211,149,0.04)', border: '1px solid rgba(0,211,149,0.08)' }}>
            <Shield size={14} style={{ color: '#00d395', marginTop: 1, flexShrink: 0 }} />
            <span className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Suas credenciais são criptografadas e nunca compartilhadas. A Investor Password é somente leitura e não permite realizar operações.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              className="text-xs font-semibold"
              style={{ border: '1px solid var(--gpfx-border, #21262d)', color: 'var(--gpfx-text-secondary, #94a3b8)', background: 'transparent' }}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="ml-auto text-xs font-bold"
              style={{ background: '#00d395', color: '#070b14', opacity: canSubmit && !loading ? 1 : 0.4 }}
              disabled={!canSubmit || loading}
              onClick={handleConnect}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  Conectando e importando...
                </>
              ) : (
                'Conectar e Importar Histórico'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
