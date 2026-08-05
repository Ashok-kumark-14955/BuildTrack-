import { useMemo } from 'react';
import { useApp } from '../AppContext';
import { STATUS_COLORS } from '../types';
import { CheckCircle2, Clock, AlertTriangle, Ban, ListTodo, TrendingUp, Activity, LayoutDashboard, PlusCircle, RefreshCw, MessageSquare } from 'lucide-react';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function activityIcon(message: string) {
  if (/status changed/i.test(message)) return { Icon: RefreshCw, tint: 'bg-rose-950/60 border-rose-800/50 text-rose-400' };
  if (/comment/i.test(message)) return { Icon: MessageSquare, tint: 'bg-purple-950/60 border-purple-800/50 text-purple-400' };
  if (/created|seeded|auto-created/i.test(message)) return { Icon: PlusCircle, tint: 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400' };
  return { Icon: Activity, tint: 'bg-rose-950/60 border-rose-800/50 text-rose-400' };
}

export default function Dashboard() {
  const { tasksForCurrentDrawing, activity, currentDrawing } = useApp();
  const tasks = tasksForCurrentDrawing;

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const blocked = tasks.filter((t) => t.status === 'Blocked').length;
    const today = new Date();
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'Completed').length;
    const pending = total - completed;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, blocked, overdue, pending, completionPct };
  }, [tasks]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
    return map;
  }, [tasks]);

  const cards = [
    { label: 'Total Tasks',  value: stats.total,           icon: ListTodo,      grad: 'from-rose-700 to-rose-900',   tint: 'bg-rose-900/40 text-rose-300' },
    { label: 'Completed',    value: stats.completed,        icon: CheckCircle2,  grad: 'from-emerald-600 to-emerald-800', tint: 'bg-emerald-900/40 text-emerald-300' },
    { label: 'Pending',      value: stats.pending,          icon: Clock,         grad: 'from-amber-600 to-amber-800', tint: 'bg-amber-900/40 text-amber-300' },
    { label: 'Overdue',      value: stats.overdue,          icon: AlertTriangle, grad: 'from-orange-600 to-orange-800', tint: 'bg-orange-900/40 text-orange-300' },
    { label: 'Blocked',      value: stats.blocked,          icon: Ban,           grad: 'from-red-700 to-red-900',     tint: 'bg-red-900/40 text-red-300' },
    { label: 'Completion',   value: `${stats.completionPct}%`, icon: TrendingUp, grad: 'from-rose-600 to-pink-800',   tint: 'bg-rose-900/40 text-rose-300' },
  ];

  return (
    <div
      className="p-7 overflow-y-auto h-full"
      style={{ background: 'radial-gradient(ellipse 90% 55% at 15% 5%, rgba(190,24,93,0.22) 0%, transparent 60%), #09090b' }}
    >
      {/* Header */}
      <div className="mb-7 flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)', boxShadow: '0 4px 16px rgba(190,24,93,0.35)' }}
        >
          <LayoutDashboard size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-rose-300/70 mt-0.5">{currentDrawing?.name || 'No drawing selected'}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, grad, tint }) => (
          <div
            key={label}
            className="relative p-4 overflow-hidden rounded-2xl border border-rose-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'rgba(20,4,8,0.85)', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
          >
            {/* top color bar */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${grad}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tint}`}>
              <Icon size={18} />
            </div>
            <div className="font-display text-[1.65rem] font-bold text-white leading-none tabular-nums">{value}</div>
            <div className="text-xs text-rose-200/50 mt-1.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Lower Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress by Status */}
        <div
          className="p-5 rounded-2xl border border-rose-900/30"
          style={{ background: 'rgba(20,4,8,0.85)' }}
        >
          <h2 className="font-semibold text-rose-100 mb-5 text-sm flex items-center gap-2">
            <span
              className="w-1.5 h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }}
            />
            Progress by Status
          </h2>
          <div className="space-y-4">
            {Object.entries(STATUS_COLORS).filter(([s]) => s !== 'No Task').map(([status, color]) => {
              const count = byStatus[status] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 text-rose-100/80 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}22` }} />
                      {status}
                    </span>
                    <span className="text-rose-200/50 tabular-nums">{count} · {Math.round(pct)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(190,24,93,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}55` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="p-5 rounded-2xl border border-rose-900/30"
          style={{ background: 'rgba(20,4,8,0.85)' }}
        >
          <h2 className="font-semibold text-rose-100 mb-4 text-sm flex items-center gap-2">
            <span
              className="w-1.5 h-4 rounded-full"
              style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }}
            />
            Recent Activity
          </h2>
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {activity.map((a) => {
              const { Icon, tint } = activityIcon(a.message);
              return (
                <div key={a.id} className="flex gap-3 rounded-xl px-2 py-2.5 -mx-2 transition-colors hover:bg-rose-950/30">
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${tint}`}>
                    <Icon size={12} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-rose-100/90 leading-snug">{a.message}</div>
                    <div className="text-xs text-rose-200/40 mt-0.5">{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            {activity.length === 0 && <div className="text-sm text-rose-200/40 text-center py-6">No activity yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
