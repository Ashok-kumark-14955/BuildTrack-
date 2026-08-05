import { useState } from 'react';
import { Layers } from 'lucide-react';
import { STATUS_COLORS } from '../types';

export default function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-10">
      {/* Toggle button — always visible, small footprint */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Hide legend' : 'Show legend'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm border transition-all duration-200 ${
          open
            ? 'text-white border-transparent shadow-md'
            : 'text-slate-400 hover:text-slate-200 border-zinc-700/70 hover:bg-zinc-800/80'
        }`}
        style={
          open
            ? { background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)', boxShadow: '0 2px 10px rgba(190,24,93,0.35)' }
            : { background: 'rgba(24,24,27,0.85)', backdropFilter: 'blur(10px)' }
        }
      >
        <Layers size={13} />
        <span>Legend</span>
        <span
          className={`w-1.5 h-1.5 rounded-full transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid currentColor', display: 'inline-block', width: 0, height: 0, borderRadius: 0 }}
        />
      </button>

      {/* Expandable panel */}
      {open && (
        <div
          className="mt-1.5 rounded-2xl shadow-lg border px-4 py-3 flex flex-col gap-1.5 text-xs min-w-[150px] animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ background: 'rgba(24,24,27,0.92)', backdropFilter: 'blur(14px)', borderColor: 'rgba(63,63,70,0.8)' }}
        >
          <div className="text-[9.5px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Status</div>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: color, boxShadow: `0 0 0 3px ${color}22, 0 0 6px ${color}66` }}
              />
              <span className="text-slate-300 font-medium">{status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
