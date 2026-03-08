import { useState, useRef, useEffect } from 'react';
import { CalendarDays, X, ChevronDown } from 'lucide-react';

/* ── Account Selector ── */
export function AccountSelector({ value, onChange, accounts }: {
  value: string; onChange: (v: string) => void; accounts: { name: string }[];
}) {
  return (
    <select
      className="text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer"
      style={{
        background: '#0d1117',
        color: '#e6edf3',
        border: '1px solid rgba(0,211,149,0.2)',
        minWidth: 180,
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="all">📊 Todas as contas</option>
      {accounts.map((a, i) => (
        <option key={i} value={String(i)}>{a.name}</option>
      ))}
    </select>
  );
}

/* ── Date Range Filter ── */
export interface DateRange {
  start: string | null;
  end: string | null;
}

const CHIPS = [
  { label: 'Hoje', id: 'today' },
  { label: 'Esta semana', id: 'week' },
  { label: 'Este mês', id: 'month' },
  { label: 'Este ano', id: 'year' },
  { label: 'Tudo', id: 'all' },
] as const;

function getChipRange(id: string): DateRange {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  switch (id) {
    case 'today':
      return { start: todayStr, end: todayStr };
    case 'week': {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: monday.toISOString().split('T')[0], end: todayStr };
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: first.toISOString().split('T')[0], end: todayStr };
    }
    case 'year': {
      return { start: `${now.getFullYear()}-01-01`, end: todayStr };
    }
    default:
      return { start: null, end: null };
  }
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function DateRangeFilter({ value, onChange }: {
  value: DateRange; onChange: (v: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeChip, setActiveChip] = useState<string>('all');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChip = (id: string) => {
    setActiveChip(id);
    onChange(getChipRange(id));
    if (id === 'all') setOpen(false);
  };

  const handleCustomDate = (field: 'start' | 'end', val: string) => {
    setActiveChip('');
    onChange({ ...value, [field]: val || null });
  };

  const handleClear = () => {
    setActiveChip('all');
    onChange({ start: null, end: null });
    setOpen(false);
  };

  const hasRange = value.start || value.end;
  const label = hasRange && value.start && value.end
    ? `${formatDateBR(value.start)} → ${formatDateBR(value.end)}`
    : hasRange && value.start
      ? `A partir de ${formatDateBR(value.start)}`
      : 'Todo período';

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2"
        style={{
          background: '#0d1117',
          color: hasRange ? '#00d395' : '#e6edf3',
          border: '1px solid rgba(0,211,149,0.2)',
        }}
        onClick={() => setOpen(!open)}
      >
        <CalendarDays size={14} />
        <span>{label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: '#0d1117',
            border: '1px solid rgba(0,211,149,0.2)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            minWidth: 320,
          }}
        >
          {/* Chips */}
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map(c => (
              <button
                key={c.id}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: activeChip === c.id ? '#00d395' : 'rgba(0,211,149,0.1)',
                  color: activeChip === c.id ? '#0d1117' : '#00d395',
                  border: `1px solid ${activeChip === c.id ? '#00d395' : 'rgba(0,211,149,0.2)'}`,
                }}
                onClick={() => handleChip(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase" style={{ color: '#6e7681' }}>Início</label>
              <input
                type="date"
                className="rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: '#161b22', color: '#e6edf3', border: '1px solid #30363d' }}
                value={value.start || ''}
                onChange={e => handleCustomDate('start', e.target.value)}
              />
            </div>
            <span className="text-xs mt-4" style={{ color: '#6e7681' }}>→</span>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-bold uppercase" style={{ color: '#6e7681' }}>Fim</label>
              <input
                type="date"
                className="rounded-lg px-2 py-1.5 text-xs outline-none"
                style={{ background: '#161b22', color: '#e6edf3', border: '1px solid #30363d' }}
                value={value.end || ''}
                onChange={e => handleCustomDate('end', e.target.value)}
              />
            </div>
          </div>

          {/* Clear */}
          {hasRange && (
            <button
              className="text-[11px] font-bold flex items-center gap-1 self-end"
              style={{ color: '#ff4d4d' }}
              onClick={handleClear}
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Utility: filter trades by date range ── */
export function filterTradesByRange<T extends { date?: string }>(trades: T[], range: DateRange): T[] {
  if (!range.start && !range.end) return trades;
  return trades.filter(t => {
    if (!t.date) return false;
    if (range.start && t.date < range.start) return false;
    if (range.end && t.date > range.end) return false;
    return true;
  });
}
