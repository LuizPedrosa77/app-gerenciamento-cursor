import { useState, useRef, useEffect } from 'react';
import { ImageIcon, Trash2, X } from 'lucide-react';
import { Trade } from '@/lib/gpfx-utils';

interface ScreenshotModalProps {
  open: boolean;
  onClose: () => void;
  trade: Trade | null;
  onSave: (tradeId: string, screenshot: { data: string; caption: string } | undefined) => void;
}

export function ScreenshotModal({ open, onClose, trade, onSave }: ScreenshotModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && trade) {
      setPreview(trade.screenshot?.data || null);
      setCaption(trade.screenshot?.caption || '');
    }
  }, [open, trade]);

  if (!open || !trade) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande. Máximo 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      if (data.length > 2 * 1024 * 1024) {
        if (!confirm('⚠️ A imagem tem mais de 2MB em base64. Isso pode deixar o app mais lento. Continuar?')) return;
      }
      setPreview(data);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (preview) {
      onSave(trade.id, { data: preview, caption });
    } else {
      onSave(trade.id, undefined);
    }
    onClose();
  };

  return (
    <div className="gpfx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gpfx-modal">
        <div className="gpfx-card-header">
          <span className="gpfx-card-title">📸 Screenshot — {trade.pair} {trade.dir} {trade.date}</span>
          <button className="btn-gpfx btn-gpfx-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {!preview ? (
            <div
              className="flex flex-col items-center justify-center p-8 rounded-lg cursor-pointer transition-colors hover:bg-[rgba(0,211,149,0.05)]"
              style={{ border: '2px dashed rgba(0,211,149,0.3)', background: 'rgba(0,211,149,0.02)' }}
              onClick={() => inputRef.current?.click()}
            >
              <ImageIcon size={40} style={{ color: '#00d395', opacity: 0.5 }} />
              <div className="text-sm font-bold mt-3" style={{ color: '#c9d1d9' }}>Arraste a imagem aqui ou clique para selecionar</div>
              <div className="text-[11px] mt-1" style={{ color: '#6e7681' }}>PNG, JPG, WEBP — máximo 5MB</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <img src={preview} alt="Preview" className="w-full rounded-lg object-contain max-h-[300px]" />
              <button
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded self-start"
                style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)' }}
                onClick={() => setPreview(null)}
              >
                <Trash2 size={12} /> Remover imagem
              </button>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b949e' }}>Legenda (opcional)</label>
            <textarea
              className="gpfx-input w-full text-xs"
              style={{ minHeight: 50, resize: 'vertical' }}
              placeholder="Adicione uma nota sobre este setup..."
              maxLength={200}
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <span className="text-[10px] text-right" style={{ color: '#484f58' }}>{caption.length}/200</span>
          </div>
          <input type="file" ref={inputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid #21262d' }}>
          <button className="btn-gpfx btn-gpfx-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-gpfx btn-gpfx-primary" onClick={handleSave}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
