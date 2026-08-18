import { useState } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { STATUS_COLORS } from '../types';

export default function Legend() {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute top-1.5 left-3 z-10">
      {open ? (
        <div
          className="flex flex-row items-center gap-0 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(24,24,32,0.95) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
          }}
        >
          {/* Brand section */}
          <div
            className="flex items-center gap-1.5 px-3 py-2 shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(190,24,93,0.25) 0%, rgba(159,18,57,0.15) 100%)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Layers size={11} className="text-pink-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-pink-300">Status</span>
          </div>

          {/* Status items */}
          <div className="flex flex-row items-center gap-3 px-3 py-2">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5 shrink-0 group">
                {/* Glowing dot */}
                <span
                  className="relative flex shrink-0"
                  style={{ width: 8, height: 8 }}
                >
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ background: color }}
                  />
                  <span
                    className="relative w-2 h-2 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${color}ff, ${color}aa)`,
                      boxShadow: `0 0 0 1.5px ${color}33, 0 0 6px ${color}88`,
                    }}
                  />
                </span>
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{ color: 'rgba(203,213,225,0.85)' }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setOpen(false)}
            title="Collapse legend"
            className="flex items-center justify-center px-2 py-2 transition-all duration-200 shrink-0"
            style={{
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(148,163,184,0.5)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.5)')}
          >
            <ChevronDown size={11} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          title="Show legend"
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all duration-200 animate-in fade-in duration-150"
          style={{
            background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(24,24,32,0.95) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            color: 'rgba(203,213,225,0.7)',
          }}
        >
          <Layers size={11} className="text-pink-400" />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-pink-300">Status</span>
          <ChevronDown size={10} style={{ transform: 'rotate(-90deg)', opacity: 0.5 }} />
        </button>
      )}
    </div>
  );
}
