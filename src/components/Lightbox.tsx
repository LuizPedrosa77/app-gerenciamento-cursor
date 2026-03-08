import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Trade } from '@/lib/gpfx-utils';

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  images: { data: string; caption: string; tradePair?: string }[];
  initialIndex?: number;
}

export function Lightbox({ open, onClose, images, initialIndex = 0 }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => { setIndex(initialIndex); }, [initialIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex(i => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;
  const img = images[Math.min(index, images.length - 1)];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/10"
        onClick={onClose}
      >
        <X size={24} color="#fff" />
      </button>

      {images.length > 1 && index > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors hover:bg-white/10"
          onClick={() => setIndex(i => i - 1)}
        >
          <ChevronLeft size={28} color="#fff" />
        </button>
      )}

      {images.length > 1 && index < images.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors hover:bg-white/10"
          onClick={() => setIndex(i => i + 1)}
        >
          <ChevronRight size={28} color="#fff" />
        </button>
      )}

      <img
        src={img.data}
        alt={img.caption || 'Screenshot'}
        className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
      />

      <div className="mt-3 text-center max-w-[80vw]">
        {img.tradePair && (
          <div className="text-sm font-bold text-white mb-1">{img.tradePair}</div>
        )}
        {img.caption && (
          <div className="text-xs" style={{ color: '#8b949e' }}>{img.caption}</div>
        )}
        {images.length > 1 && (
          <div className="text-[10px] mt-2" style={{ color: '#484f58' }}>{index + 1} / {images.length}</div>
        )}
      </div>
    </div>
  );
}
