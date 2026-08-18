import { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { STATUS_COLORS, type Task } from '../types';
import {
  CheckCircle2, Clock, AlertTriangle, Ban, ListTodo, TrendingUp,
  Activity, LayoutDashboard, PlusCircle, RefreshCw, MessageSquare,
  Users, BarChart3, Flame, Target, Zap, ChevronRight,
} from 'lucide-react';

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

// Animated ring for completion percentage
function DonutRing({ pct, size = 110 }: { pct: number; size?: number }) {
  const sw = 10;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const gap = circ - dash;
  const gradId = 'donut-grad';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={pct >= 100 ? '#4ade80' : '#d6486e'} />
            <stop offset="100%" stopColor={pct >= 100 ? '#22c55e' : '#fb923c'} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        {pct > 0 && (
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={`url(#${gradId})`} strokeWidth={sw}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease', filter: 'drop-shadow(0 0 8px rgba(214,72,110,0.6))' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white tabular-nums">{pct}%</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Complete</span>
      </div>
    </div>
  );
}

// Mini sparkline bar chart
function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all duration-300" style={{
          height: `${(v / max) * 100}%`,
          backgroundColor: color,
          opacity: i === values.length - 1 ? 1 : 0.35 + (i / values.length) * 0.55,
        }} />
      ))}
    </div>
  );
}

// Priority donut segments (simplified radial bar stack)
function PriorityBars({ tasks }: { tasks: Task[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    tasks.forEach((t) => { map[t.priority] = (map[t.priority] || 0) + 1; });
    return map;
  }, [tasks]);

  const total = tasks.length || 1;
  const items = [
    { label: 'Critical', color: '#ef4444', key: 'Critical' },
    { label: 'High', color: '#f97316', key: 'High' },
    { label: 'Medium', color: '#3b82f6', key: 'Medium' },
    { label: 'Low', color: '#64748b', key: 'Low' },
  ];

  return (
    <div className="space-y-2.5">
      {items.map(({ label, color, key }) => {
        const count = counts[key] || 0;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
              <span className="text-white/50 tabular-nums">{count} · {pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}55` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Team member contribution cards
function TeamCard({ name, count, done }: { name: string; count: number; done: number }) {
  const pct = count > 0 ? Math.round((done / count) * 100) : 0;
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#d6486e', '#3b82f6', '#f97316', '#4ade80', '#a78bfa', '#fbbf24'];
  const colorIdx = name.charCodeAt(0) % colors.length;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
        style={{ background: `${colors[colorIdx]}33`, border: `1.5px solid ${colors[colorIdx]}60` }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white/90 truncate">{name}</div>
        <div className="text-[10px] text-white/40">{done}/{count} tasks done</div>
      </div>
      <div className="text-right">
        <span className="text-xs font-extrabold tabular-nums" style={{ color: pct >= 100 ? '#4ade80' : colors[colorIdx] }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

type TabKey = 'overview' | 'priority' | 'team';

export default function Dashboard() {
  const { tasks: allTasks, activity, currentDrawing, drawings, activeProjectId, projects } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Use project-scoped tasks for richer insights
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );
  const projectDrawingIds = useMemo(
    () => new Set(drawings.filter((d) => d.projectId === activeProject?.id).map((d) => d.id)),
    [drawings, activeProject]
  );
  const tasks = useMemo(
    () => allTasks.filter((t) => projectDrawingIds.has(t.drawingId)),
    [allTasks, projectDrawingIds]
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const blocked = tasks.filter((t) => t.status === 'Blocked').length;
    const today = new Date();
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'Completed').length;
    const pending = total - completed;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgProgress = total > 0 ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / total) : 0;
    return { total, completed, inProgress, blocked, overdue, pending, completionPct, avgProgress };
  }, [tasks]);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
    return map;
  }, [tasks]);

  // Sparkline data: tasks completed per week-bucket (last 7 days by day)
  const sparkData = useMemo(() => {
    const now = Date.now();
    const buckets = Array(7).fill(0);
    tasks.forEach((t) => {
      if (t.status === 'Completed' && t.updatedAt) {
        const diff = Math.floor((now - new Date(t.updatedAt).getTime()) / 86400000);
        if (diff >= 0 && diff < 7) buckets[6 - diff]++;
      }
    });
    return buckets;
  }, [tasks]);

  // Team assignments
  const teamData = useMemo(() => {
    const map: Record<string, { count: number; done: number }> = {};
    tasks.forEach((t) => {
      if (!t.assignedTo?.trim()) return;
      if (!map[t.assignedTo]) map[t.assignedTo] = { count: 0, done: 0 };
      map[t.assignedTo].count++;
      if (t.status === 'Completed') map[t.assignedTo].done++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [tasks]);

  const statCards = [
    { label: 'Total Tasks',  value: stats.total,           icon: ListTodo,      color: '#d6486e', glow: 'rgba(214,72,110,0.25)' },
    { label: 'Completed',    value: stats.completed,        icon: CheckCircle2,  color: '#4ade80', glow: 'rgba(74,222,128,0.2)' },
    { label: 'In Progress',  value: stats.inProgress,       icon: Zap,           color: '#0ea5e9', glow: 'rgba(14,165,233,0.2)' },
    { label: 'Overdue',      value: stats.overdue,          icon: AlertTriangle, color: '#f97316', glow: 'rgba(249,115,22,0.2)' },
    { label: 'Blocked',      value: stats.blocked,          icon: Ban,           color: '#ef4444', glow: 'rgba(239,68,68,0.2)' },
    { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: TrendingUp,  color: '#a78bfa', glow: 'rgba(167,139,250,0.2)' },
  ];

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'priority', label: 'Priority Breakdown', icon: Flame },
    { key: 'team', label: 'Team Performance', icon: Users },
  ];

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: 'radial-gradient(ellipse 90% 55% at 15% 5%, rgba(190,24,93,0.22) 0%, transparent 60%), #09090b' }}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)', boxShadow: '0 4px 16px rgba(190,24,93,0.35)' }}
            >
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-sm text-rose-300/70 mt-0.5">
                {activeProject?.name ?? currentDrawing?.name ?? 'No project selected'}
              </p>
            </div>
          </div>

          {/* Summary pills */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
              <CheckCircle2 size={11} /> {stats.completed} Done
            </div>
            {stats.overdue > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }}>
                <AlertTriangle size={11} /> {stats.overdue} Overdue
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(216,72,110,0.12)', border: '1px solid rgba(216,72,110,0.2)', color: '#fb7185' }}>
              <Target size={11} /> {stats.completionPct}% Complete
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map(({ label, value, icon: Icon, color, glow }) => (
            <div
              key={label}
              className="relative p-4 overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group"
              style={{
                background: 'rgba(18,4,8,0.9)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              }}
            >
              {/* Top glow bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-full transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
                style={{ background: `${color}18`, boxShadow: `0 0 16px ${glow}` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="text-[1.75rem] font-black text-white leading-none tabular-nums">{value}</div>
              <div className="text-[10px] text-white/40 mt-1.5 font-semibold uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab navigation ── */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-2xl w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
              style={
                activeTab === key
                  ? { background: 'linear-gradient(135deg, rgba(190,24,93,0.35), rgba(139,10,46,0.25))', color: '#fb7185', border: '1px solid rgba(216,72,110,0.35)' }
                  : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
              }
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Completion ring + sparkline */}
            <div className="p-5 rounded-2xl border border-rose-900/25 flex flex-col gap-5"
              style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }} />
                Completion
              </h2>
              <div className="flex items-center justify-center py-2">
                <DonutRing pct={stats.completionPct} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <div className="text-lg font-black text-emerald-400 tabular-nums">{stats.completed}</div>
                  <div className="text-[10px] text-white/40 font-semibold">Done</div>
                </div>
                <div className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)' }}>
                  <div className="text-lg font-black text-amber-400 tabular-nums">{stats.pending}</div>
                  <div className="text-[10px] text-white/40 font-semibold">Pending</div>
                </div>
              </div>

              {/* 7-day completion sparkline */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Completions (7d)</span>
                  <span className="text-[10px] font-bold text-white/60">{sparkData.reduce((a, b) => a + b, 0)} total</span>
                </div>
                <MiniBarChart values={sparkData} color="#d6486e" />
                <div className="flex justify-between mt-1">
                  {['7d','6d','5d','4d','3d','2d','1d'].map((l) => (
                    <span key={l} className="text-[8px] text-white/20 font-medium">{l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress by Status */}
            <div className="p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-5 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }} />
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
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}55` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick stats */}
              <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                {[
                  { label: 'On Track', value: stats.inProgress, color: '#fb923c' },
                  { label: 'Blocked', value: stats.blocked, color: '#ef4444' },
                  { label: 'Overdue', value: stats.overdue, color: '#f97316' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-2 rounded-lg" style={{ background: `${color}10` }}>
                    <div className="text-base font-black tabular-nums" style={{ color }}>{value}</div>
                    <div className="text-[9px] text-white/40 font-semibold uppercase">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-4 text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }} />
                  Recent Activity
                </span>
                <span className="text-[10px] text-white/30 font-medium">{activity.length} events</span>
              </h2>
              <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                {activity.slice(0, 12).map((a) => {
                  const { Icon, tint } = activityIcon(a.message);
                  return (
                    <div key={a.id} className="flex gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors hover:bg-rose-950/20 group">
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${tint}`}>
                        <Icon size={10} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-rose-100/80 leading-snug line-clamp-2">{a.message}</div>
                        <div className="text-[10px] text-rose-200/35 mt-0.5 flex items-center gap-1">
                          <Clock size={8} /> {timeAgo(a.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activity.length === 0 && (
                  <div className="text-sm text-rose-200/40 text-center py-8 flex flex-col items-center gap-2">
                    <Activity size={20} className="text-rose-900/50" />
                    No activity yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'priority' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Priority breakdown */}
            <div className="p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-5 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }} />
                Priority Distribution
              </h2>
              <PriorityBars tasks={tasks} />
            </div>

            {/* Category breakdown */}
            <div className="p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-5 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }} />
                Category Breakdown
              </h2>
              {(() => {
                const catMap: Record<string, number> = {};
                tasks.forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
                const total = tasks.length || 1;
                const catColors = ['#d6486e','#3b82f6','#f97316','#a78bfa','#fbbf24','#4ade80','#e879f9'];
                return (
                  <div className="space-y-3">
                    {Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => {
                      const pct = Math.round((count / total) * 100);
                      const color = catColors[i % catColors.length];
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 font-medium" style={{ color }}>
                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                              {cat}
                            </span>
                            <span className="text-white/40 tabular-nums">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(catMap).length === 0 && (
                      <div className="text-center text-white/30 text-sm py-8">No category data</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Overdue tasks table */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-4 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #f97316, #ef4444)' }} />
                Overdue Tasks
                {stats.overdue > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}>
                    {stats.overdue}
                  </span>
                )}
              </h2>
              {stats.overdue === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm flex flex-col items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500/50" />
                  No overdue tasks — great job!
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed')
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 6)
                    .map((t) => {
                      const daysOverdue = Math.floor((Date.now() - new Date(t.dueDate).getTime()) / 86400000);
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <AlertTriangle size={13} className="text-red-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white/90 truncate">{t.name}</div>
                            <div className="text-[10px] text-white/40">{t.gridCode} · {t.assignedTo || 'Unassigned'}</div>
                          </div>
                          <span className="text-[10px] font-bold text-red-400 whitespace-nowrap">
                            {daysOverdue}d overdue
                          </span>
                          <ChevronRight size={12} className="text-white/20" />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Team performance */}
            <div className="p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-4 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #be185d, #9f1239)' }} />
                Team Members
                <span className="text-[10px] text-white/30 font-medium">{teamData.length} members</span>
              </h2>
              {teamData.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm flex flex-col items-center gap-2">
                  <Users size={20} className="text-white/10" />
                  No assignments yet
                </div>
              ) : (
                <div className="space-y-1.5">
                  {teamData.map(([name, { count, done }]) => (
                    <TeamCard key={name} name={name} count={count} done={done} />
                  ))}
                </div>
              )}
            </div>

            {/* Workload heatmap (assignment counts by drawing) */}
            <div className="p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-4 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)' }} />
                Workload by Drawing
              </h2>
              {(() => {
                const drawingTasks: Record<string, { name: string; total: number; done: number }> = {};
                tasks.forEach((t) => {
                  const d = drawings.find((dr) => dr.id === t.drawingId);
                  if (!d) return;
                  if (!drawingTasks[d.id]) drawingTasks[d.id] = { name: d.name, total: 0, done: 0 };
                  drawingTasks[d.id].total++;
                  if (t.status === 'Completed') drawingTasks[d.id].done++;
                });
                const entries = Object.values(drawingTasks).sort((a, b) => b.total - a.total);
                const maxTasks = Math.max(...entries.map((e) => e.total), 1);

                return entries.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">No drawing data</div>
                ) : (
                  <div className="space-y-3">
                    {entries.slice(0, 7).map(({ name, total, done }) => {
                      const widthPct = (total / maxTasks) * 100;
                      const donePct = total > 0 ? (done / total) * 100 : 0;
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/70 font-medium truncate max-w-[60%]">{name}</span>
                            <span className="text-white/40 tabular-nums">{done}/{total}</span>
                          </div>
                          <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {/* Total bar */}
                            <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                              style={{ width: `${widthPct}%`, background: 'rgba(59,130,246,0.25)' }} />
                            {/* Done overlay */}
                            <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                              style={{ width: `${(donePct / 100) * widthPct}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Activity summary */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(14,3,6,0.92)' }}>
              <h2 className="font-semibold text-rose-100 mb-4 text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full" style={{ background: 'linear-gradient(180deg, #a78bfa, #7c3aed)' }} />
                Activity Feed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activity.slice(0, 8).map((a) => {
                  const { Icon, tint } = activityIcon(a.message);
                  return (
                    <div key={a.id} className="flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                      style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${tint}`}>
                        <Icon size={11} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-rose-100/80 leading-snug line-clamp-1">{a.message}</div>
                        <div className="text-[10px] text-rose-200/35 mt-0.5">{timeAgo(a.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
