import { useState } from 'react';
import { Layers, X } from 'lucide-react';
import { STATUS_COLORS } from '../types';

export default function Legend() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div className="absolute top-3 left-3 z-10">
        <button
          onClick={() => setOpen(true)}
          title="Show legend"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 border border-zinc-700/70 hover:bg-zinc-800/80 transition-all duration-200"
          style={{ background: 'rgba(24,24,27,0.85)', backdropFilter: 'blur(10px)' }}
        >
          <Layers size={11} />
          <span>Legend</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-3 left-3 z-10">
      <div
        className="flex flex-row items-center gap-2.5 px-3 py-1.5 rounded-xl text-[10px] border animate-in fade-in duration-150"
        style={{
          background: 'rgba(24,24,27,0.90)',
          backdropFilter: 'blur(14px)',
          borderColor: 'rgba(63,63,70,0.8)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        }}
      >
        {/* Label */}
        <div className="flex items-center gap-1 text-slate-400 font-bold uppercase tracking-widest text-[9px] shrink-0">
          <Layers size={10} />
          <span>Legend</span>
        </div>

        {/* Divider */}
        <div className="w-px h-3 bg-zinc-600/70 shrink-0" />

        {/* Status items */}
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1 shrink-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color, boxShadow: `0 0 0 2px ${color}22, 0 0 4px ${color}55` }}
            />
            <span className="text-slate-300 font-medium whitespace-nowrap">{status}</span>
          </div>
        ))}

        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="ml-1 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
          title="Hide legend"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
