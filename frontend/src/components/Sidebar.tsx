import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileImage,
  ListChecks,
  HardHat,
  FolderKanban,
  Pencil,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Milestone,
  Activity,
  BarChart2,
  Package,
  Settings,
  GripVertical,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import ProjectFormModal from './ProjectFormModal';
import toast from 'react-hot-toast';
import type { Drawing, Task } from '../types';
import { DrawingsAPI, TasksAPI } from '../api';

const navItems = [
  { to: '/', label: 'Drawing & Task Tracker', icon: FileImage, accent: '#60a5fa', accentBg: 'rgba(96,165,250,0.14)', accentBorder: 'rgba(96,165,250,0.35)' },
  { to: '/tasks', label: 'Task Management', icon: ListChecks, accent: '#4ade80', accentBg: 'rgba(74,222,128,0.14)', accentBorder: 'rgba(74,222,128,0.35)' },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#fb923c', accentBg: 'rgba(251,146,60,0.14)', accentBorder: 'rgba(251,146,60,0.35)' },
  { to: '/zoho-modules', label: 'Workforce & Safety', icon: Package, accent: '#a78bfa', accentBg: 'rgba(167,139,250,0.14)', accentBorder: 'rgba(167,139,250,0.35)' },
  { to: '/settings', label: 'Settings', icon: Settings, accent: '#94a3b8', accentBg: 'rgba(148,163,184,0.14)', accentBorder: 'rgba(148,163,184,0.35)' },
];

// Enhanced progress ring — maroon arc, white center text
function ProgressRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const sw = 5;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const gap = circ - dash;

  // Arc colours — maroon palette; green when 100%
  const arcStart = pct >= 100 ? '#4ade80' : '#8b0a2e';
  const arcEnd   = pct >= 100 ? '#22c55e' : '#d6486e';
  const glowCol  = pct >= 100 ? '#4ade80' : '#8b0a2e';
  const gradId = `pr-grad-${size}`;

  // Tip dot position: arc starts at top (-π/2), rotated by pct fraction of circle
  // The SVG is NOT rotated via CSS; instead we use a transform on the arc group.
  const tipAngle = -Math.PI / 2 + (pct / 100) * 2 * Math.PI;
  const dotX = cx + r * Math.cos(tipAngle);
  const dotY = cy + r * Math.sin(tipAngle);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowCol}30 30%, transparent 75%)`, filter: 'blur(7px)' }} />

      <svg width={size} height={size} className="absolute inset-0" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={arcStart} />
            <stop offset="100%" stopColor={arcEnd} />
          </linearGradient>
        </defs>

        {/* Dark track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />

        {/* Halo arc */}
        {pct > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={arcEnd} strokeWidth={sw + 5}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
            opacity={0.2}
            style={{ transition: 'stroke-dasharray 0.9s ease' }} />
        )}

        {/* Main gradient arc */}
        {pct > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={`url(#${gradId})`} strokeWidth={sw}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.9s ease', filter: `drop-shadow(0 0 5px ${glowCol}cc)` }} />
        )}

        {/* Tip dot — positioned at the end of the arc */}
        {pct > 3 && pct < 100 && (
          <circle cx={dotX} cy={dotY} r={sw * 0.75} fill={arcEnd}
            style={{ filter: `drop-shadow(0 0 6px ${arcEnd})` }} />
        )}
      </svg>

      {/* Center label — always white */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-black tabular-nums leading-none text-white"
          style={{ textShadow: '0 0 8px rgba(255,255,255,0.35)' }}>
          {pct}%
        </span>
        <span className="text-[6.5px] font-bold uppercase tracking-wider leading-none mt-0.5 text-white opacity-70">
          done
        </span>
      </div>
    </div>
  );
}

// ── Drag-to-reorder hook ──────────────────────────────────────────────────────
/**
 * Manages the drawing order for the sidebar.
 *
 * Priority (highest → lowest):
 *   1. Server sortOrder field — the permanent source of truth (persisted to backend)
 *   2. localStorage cache — fast initial render on the same device before server responds
 *   3. server arrival order — fallback for drawings that have no sortOrder yet (sortOrder === 9999)
 *
 * On every drag-drop the new order is:
 *   a) written to localStorage immediately (instant visual feedback on next render/refresh)
 *   b) POSTed to /api/drawings/reorder in the background (persisted to backend)
 */
function useDrawingOrder(projectId: string | undefined, sourceDrawings: Drawing[]) {
  const storageKey = `drawingOrder:${projectId ?? 'all'}`;

  // Deliberately NOT seeded from localStorage here: `projectId` is often still
  // undefined on the very first render (the projects list hasn't loaded yet),
  // so `storageKey` at mount time is frequently the wrong ("drawingOrder:all")
  // key. The sync effect below re-reads localStorage on every run using
  // whatever `storageKey` currently is — by the time `sourceDrawings` is
  // non-empty, `projectId` is guaranteed correct (sourceDrawings is filtered
  // by it), so that read is always against the right key. Carrying forward
  // in-memory `orderedIds` as the "cached order" instead (as a previous
  // version of this hook did) breaks under React 18 StrictMode's dev-only
  // double-invocation of effects/updaters, which can interleave a run keyed
  // off the wrong storageKey with one keyed off the right one and leave
  // `orderedIds` holding the wrong-key result.
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  // Tracks the storageKey the sync effect below has actually derived orderedIds
  // for. The mirror effect must not persist anything until this matches the
  // current storageKey — otherwise, on a render where storageKey has just
  // switched from 'drawingOrder:all' to the real project-keyed value but
  // sourceDrawings hasn't loaded yet (the sync effect below bails out via its
  // `sourceDrawings.length === 0` guard), the mirror effect would still fire
  // unconditionally and stomp the real persisted order with the still-initial
  // `orderedIds` ([]) — permanently erasing it once the sync effect later reads
  // back that now-empty value and falls back to arrival order.
  const syncedKeyRef = useRef<string | null>(null);

  // Sync whenever sourceDrawings changes (project switch or data refresh).
  // Server sortOrder is ALWAYS the authoritative source of truth — it is set
  // by the backend whenever the user drags to reorder and must win on refresh.
  useEffect(() => {
    if (sourceDrawings.length === 0) return;

    // Sort source by the backend's sortOrder field (server always wins).
    const byServer = [...sourceDrawings].sort(
      (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
    );
    const serverIds = byServer.map((d) => d.id);
    const anyHaveServerOrder = sourceDrawings.some((d) => (d.sortOrder ?? 9999) !== 9999);

    if (anyHaveServerOrder) {
      // Server has persisted order data — always use server order.
      syncedKeyRef.current = storageKey;
      setOrderedIds((prev) => {
        const newIds = serverIds.filter((id) => !prev.includes(id));
        return [...serverIds, ...newIds.filter((id) => !serverIds.includes(id))];
      });
      return;
    }

    // No server order yet — localStorage for the CURRENT storageKey is the
    // source of truth. Always read it fresh rather than reusing in-memory
    // `orderedIds`; see the note above for why that matters.
    let base: string[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      base = stored ? JSON.parse(stored) : [];
    } catch {
      base = [];
    }
    const stillValid = base.filter((id) => serverIds.includes(id));
    const newIds = serverIds.filter((id) => !stillValid.includes(id));
    syncedKeyRef.current = storageKey;
    setOrderedIds([...stillValid, ...newIds]);
  }, [sourceDrawings, storageKey]);

  // Mirror to localStorage as a fast cache for future page loads on same device.
  // Skipped until the sync effect above has actually run for this exact
  // storageKey — see syncedKeyRef's comment for why that guard matters.
  useEffect(() => {
    if (syncedKeyRef.current !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(orderedIds));
    } catch {}
  }, [orderedIds, storageKey]);

  /** Returns source drawings in the current persisted order. */
  const sorted = useMemo(() => {
    const map = new Map(sourceDrawings.map((d) => [d.id, d]));
    return orderedIds.map((id) => map.get(id)).filter(Boolean) as Drawing[];
  }, [sourceDrawings, orderedIds]);

  /**
   * Moves `fromId` to the position of `toId` and persists the new order to
   * both localStorage and the backend (`POST /api/drawings/reorder`).
   */
  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);

      // Persist to backend in the background — fire-and-forget with silent error handling.
      if (projectId) {
        DrawingsAPI.reorder(projectId, next).catch((err) => {
          console.warn('[reorder] Failed to persist drawing order to backend:', err?.message ?? err);
        });
      }

      return next;
    });
  };

  return { sorted, reorder };
}

export default function Sidebar() {
  const { tasks, drawings, projects, milestones, refreshProjects, currentDrawingId, setCurrentDrawingId, deleteDrawing, activeProjectId } = useApp();
  const navigate = useNavigate();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  const [drawingFilter, setDrawingFilter] = useState('');
  const [hoveredDrawing, setHoveredDrawing] = useState<string | null>(null);

  // Drag state
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  // Resolve the "active" project:
  // 1. activeProjectId from context (set when user clicks a project row)
  // 2. the project of the currently-open drawing
  // 3. fallback to first project
  const currentDrawing = useMemo(() => drawings.find((d) => d.id === currentDrawingId), [drawings, currentDrawingId]);
  const activeProject = useMemo(() => {
    if (activeProjectId) {
      const match = projects.find((p) => p.id === activeProjectId);
      if (match) return match;
    }
    if (currentDrawing?.projectId) {
      const match = projects.find((p) => p.id === currentDrawing.projectId);
      if (match) return match;
    }
    return projects[0];
  }, [projects, activeProjectId, currentDrawing]);

  // Scope stats to the active project's drawings only — `tasks` from context
  // is scoped to just the currently-open drawing (fetched fresh whenever the
  // user switches drawings, for the main canvas's pinned-task list), so it
  // can't be used to compute counts for OTHER drawings or the whole project.
  // `allTasks` below is a separate, unscoped fetch used only for these
  // read-only summaries (sidebar per-drawing counts + the project progress
  // ring) — it never touches the canvas's pinned-task behavior.
  const projectDrawingIds = useMemo(
    () => new Set(drawings.filter((d) => d.projectId === activeProject?.id).map((d) => d.id)),
    [drawings, activeProject]
  );

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  useEffect(() => {
    let cancelled = false;
    TasksAPI.list({}).then((data) => { if (!cancelled) setAllTasks(data); }).catch(() => {});
    return () => { cancelled = true; };
    // Re-fetch whenever the active project changes, or whenever the
    // currently-open drawing's own task list changes (a reasonable proxy for
    // "the user just added/completed a task, the summary is now stale").
  }, [activeProject?.id, tasks]);

  const projectTasks = useMemo(
    () => allTasks.filter((t) => projectDrawingIds.has(t.drawingId)),
    [allTasks, projectDrawingIds]
  );

  const stats = useMemo(() => {
    const total = projectTasks.length;
    const completed = projectTasks.filter((t) => t.status === 'Completed').length;
    const inProgress = projectTasks.filter((t) => t.status === 'In Progress').length;
    const blocked = projectTasks.filter((t) => t.status === 'Blocked').length;
    const delayed = projectTasks.filter((t) => t.status === 'Delayed').length;
    const assigned = projectTasks.filter((t) => t.status === 'Assigned').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, blocked, delayed, assigned, attention: blocked + delayed, pct };
  }, [projectTasks]);

  const activeMilestones = useMemo(
    () => milestones.filter((m) => m.status === 'Active' && m.projectId === activeProject?.id).length,
    [milestones, activeProject]
  );

  const switchDrawing = (drawingId: string) => {
    setCurrentDrawingId(drawingId);
    navigate('/');
  };

  // Only show drawings that belong to the active project
  const activeProjectDrawings = useMemo(
    () => activeProject
      ? drawings.filter((d) => d.projectId === activeProject.id)
      : drawings,
    [drawings, activeProject]
  );

  // Drag-to-reorder — sorted list of activeProjectDrawings, persisted to localStorage
  const { sorted: sortedProjectDrawings, reorder } = useDrawingOrder(activeProject?.id, activeProjectDrawings);

  const filteredDrawings = useMemo(
    () => sortedProjectDrawings.filter((d) => d.name.toLowerCase().includes(drawingFilter.trim().toLowerCase())),
    [sortedProjectDrawings, drawingFilter]
  );

  // Per-drawing task counts — sourced from `allTasks` (unscoped fetch above)
  // so every drawing shows real counts, not just the currently-open one.
  const tasksByDrawing = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const t of allTasks) {
      if (!map[t.drawingId]) map[t.drawingId] = { total: 0, done: 0 };
      map[t.drawingId].total++;
      if (t.status === 'Completed') map[t.drawingId].done++;
    }
    return map;
  }, [allTasks]);

  const managers = useMemo(
    () => Array.from(new Set(projects.map((p) => p.managerName).filter(Boolean))) as string[],
    [projects]
  );

  return (
    <div
      className={`${collapsed ? 'w-[72px]' : 'w-[280px]'} h-full flex flex-col shrink-0 select-none transition-all duration-300 relative overflow-hidden`}
      style={{
        background: 'linear-gradient(180deg, #130509 0%, #220b14 20%, #360d1b 40%, #2a0c17 60%, #220b14 80%, #130509 100%)',
        boxShadow: 'inset -1px 0 0 rgba(216,72,110,0.35), 4px 0 28px rgba(0,0,0,0.55)',
      }}
    >
      {/* Subtle gradient orbs for depth */}
      <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #d6486e 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="absolute bottom-24 right-0 w-32 h-32 rounded-full pointer-events-none opacity-5"
        style={{ background: 'radial-gradient(circle, #fb923c 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />

      {/* ── Header / Logo ── */}
      <div className={`relative flex items-center gap-2.5 px-4 pt-5 pb-4 ${collapsed ? 'justify-center !px-2' : ''}`}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{
            background: 'linear-gradient(145deg, #d6486e 0%, #8b0a2e 100%)',
            border: '1px solid rgba(216,72,110,0.6)',
            boxShadow: '0 0 16px rgba(214,72,110,0.4)',
          }}
        >
          <HardHat size={17} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-white font-extrabold text-[15px] leading-tight tracking-tight drop-shadow">BuildTrack</div>
            <div className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: '#e88aa5' }}>Site Operations</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen size={13} className="text-pink-100/70" />
            : <PanelLeftClose size={13} className="text-pink-100/70" />}
        </button>
      </div>

      {/* ── Project card (expanded only) ── */}
      {!collapsed && (
        <div className="relative px-3 pb-3">
          <div
            className="rounded-2xl p-3.5 space-y-3"
            style={{
              background: 'linear-gradient(135deg, rgba(216,72,110,0.12) 0%, rgba(0,0,0,0.3) 100%)',
              border: '1px solid rgba(216,72,110,0.28)',
              borderLeft: '3px solid #d6486e',
            }}
          >
            {/* Project identity */}
            <div className="flex items-start gap-2.5">
              <ProgressRing pct={stats.pct} size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-extrabold text-white truncate">
                    {activeProject?.name ?? 'No Project'}
                  </span>
                </div>
                <div className="text-[9.5px] font-semibold mt-0.5" style={{ color: '#e88aa5' }}>
                  {activeProject?.code ? `Code: ${activeProject.code}` : 'Set up a project'}
                </div>
                {/* Mini stat row */}
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
                    <CheckCircle2 size={9} /> {stats.completed}
                  </span>
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
                    <Clock size={9} /> {stats.inProgress}
                  </span>
                  {stats.attention > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-400">
                      <ShieldAlert size={9} /> {stats.attention}
                    </span>
                  )}
                  <span className="text-[9px] font-extrabold text-white/70 tabular-nums ml-auto">{stats.pct}%</span>
                </div>
              </div>
              <button
                onClick={() => setShowProjectForm(true)}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors shrink-0 mt-0.5"
                title={activeProject ? 'Edit project' : 'Add project'}
              >
                {activeProject ? <Pencil size={10} className="text-pink-100/70" /> : <Plus size={10} className="text-pink-100/70" />}
              </button>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${stats.pct}%`,
                    background: stats.pct === 100
                      ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                      : 'linear-gradient(90deg, #d6486e, #fb923c)',
                  }}
                />
              </div>
            </div>

            {/* Milestones & All Projects row */}
            <div className="flex gap-2">
              {activeMilestones > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9.5px] font-bold"
                  style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                  <Milestone size={9} /> {activeMilestones} active
                </div>
              )}
              <button
                onClick={() => navigate('/projects')}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all text-white"
                style={{ border: '1px solid rgba(216,72,110,0.35)', background: 'rgba(216,72,110,0.1)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(216,72,110,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(216,72,110,0.1)')}
              >
                <FolderKanban size={10} /> All Projects <ChevronRight size={9} className="opacity-60" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="relative px-2.5 py-1 space-y-0.5 shrink-0">
        {!collapsed && (
          <div className="px-1 mb-1">
            <span className="text-[8.5px] uppercase tracking-widest font-extrabold" style={{ color: 'rgba(232,138,165,0.5)', letterSpacing: '0.14em' }}>
              Navigation
            </span>
          </div>
        )}
        {navItems.map(({ to, label, icon: Icon, accent, accentBg, accentBorder }) => {
          const badge = to === '/' ? activeProjectDrawings.length : to === '/tasks' ? stats.total : null;
          return (
            <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} className="block">
              {({ isActive }) => (
                <div
                  className={`relative flex items-center gap-3 rounded-xl transition-all duration-150
                    ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
                    ${isActive ? '' : 'hover:bg-white/8'}`}
                  style={
                    isActive
                      ? { background: accentBg, border: `1px solid ${accentBorder}`, boxShadow: `0 0 12px ${accentBg}` }
                      : { border: '1px solid transparent' }
                  }
                >
                  {isActive && !collapsed && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                      style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                    />
                  )}
                  <Icon
                    size={18}
                    style={{ color: isActive ? accent : 'rgba(255,225,238,0.75)', flexShrink: 0, marginLeft: isActive && !collapsed ? '4px' : undefined }}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[13.5px] font-semibold tracking-tight"
                        style={{ color: isActive ? '#ffffff' : 'rgba(255,225,238,0.85)' }}>
                        {label}
                      </span>
                      {badge !== null && badge > 0 && (
                        <span
                          className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums"
                          style={{
                            background: isActive ? `${accent}25` : 'rgba(255,255,255,0.08)',
                            color: isActive ? accent : 'rgba(255,225,238,0.75)',
                            border: isActive ? `1px solid ${accent}40` : '1px solid transparent',
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Drawings section ── */}
      <div className="relative flex-1 min-h-0 px-2.5 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(216,72,110,0.35) transparent' }}>
        {!collapsed && (
          <div className="pt-3 pb-2 min-h-0">
            {/* Section header */}
            <div className="px-1 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers size={9} style={{ color: '#e88aa5' }} />
                <span className="text-[8.5px] uppercase tracking-widest font-extrabold"
                  style={{ color: 'rgba(232,138,165,0.5)', letterSpacing: '0.14em' }}>
                  Drawings
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {drawings.length > 0 && (
                  <span className="text-[9px] font-extrabold tabular-nums px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(216,72,110,0.2)', color: '#e88aa5', border: '1px solid rgba(216,72,110,0.25)' }}>
                    {drawings.length}
                  </span>
                )}
                <button
                  onClick={() => navigate('/')}
                  title="Upload drawing"
                  className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/15 transition-colors"
                >
                  <Plus size={11} className="text-pink-100/70" />
                </button>
              </div>
            </div>

            {/* Search */}
            {drawings.length > 4 && (
              <div className="relative mb-2">
                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-100/40 pointer-events-none" />
                <input
                  value={drawingFilter}
                  onChange={(e) => setDrawingFilter(e.target.value)}
                  placeholder="Search drawings…"
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[10.5px] font-medium text-white placeholder:text-pink-100/35 outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                />
              </div>
            )}

            {/* Drawing cards */}
            <div className="space-y-1">
              {filteredDrawings.length === 0 && (
                <div className="flex flex-col items-center py-6 text-center gap-2">
                  <FileImage size={20} className="text-pink-900/60" />
                  <span className="text-[10px] text-pink-100/40 font-medium">
                    {drawings.length === 0 ? 'No drawings yet' : 'No matches'}
                  </span>
                </div>
              )}
              {filteredDrawings.map((d) => {
                const active = d.id === currentDrawingId;
                const dt = tasksByDrawing[d.id] ?? { total: 0, done: 0 };
                const dpct = dt.total > 0 ? Math.round((dt.done / dt.total) * 100) : 0;
                const isHovered = hoveredDrawing === d.id;
                const isDragOver = dragOverId === d.id;

                return (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => {
                      dragId.current = d.id;
                      e.dataTransfer.effectAllowed = 'move';
                      // Slight opacity drop to indicate drag source
                      (e.currentTarget as HTMLElement).style.opacity = '0.5';
                    }}
                    onDragEnd={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                      dragId.current = null;
                      setDragOverId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragId.current && dragId.current !== d.id) {
                        setDragOverId(d.id);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverId((prev) => (prev === d.id ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId.current && dragId.current !== d.id) {
                        reorder(dragId.current, d.id);
                      }
                      setDragOverId(null);
                    }}
                    onMouseEnter={() => setHoveredDrawing(d.id)}
                    onMouseLeave={() => setHoveredDrawing(null)}
                    className="group relative rounded-xl transition-all duration-150 overflow-hidden"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(214,72,110,0.2) 0%, rgba(255,255,255,0.06) 100%)'
                        : isHovered
                          ? 'rgba(255,255,255,0.07)'
                          : 'rgba(255,255,255,0.03)',
                      border: isDragOver
                        ? '1px solid rgba(216,72,110,0.8)'
                        : active
                          ? '1px solid rgba(216,72,110,0.45)'
                          : '1px solid rgba(255,255,255,0.07)',
                      boxShadow: isDragOver
                        ? '0 0 16px rgba(216,72,110,0.35)'
                        : active
                          ? '0 0 12px rgba(216,72,110,0.15)'
                          : 'none',
                      cursor: 'grab',
                    }}
                  >
                    {/* Active left accent bar */}
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
                        style={{ background: 'linear-gradient(180deg, #fb7185, #d6486e)' }} />
                    )}

                    {/* Drag-over drop indicator line */}
                    {isDragOver && (
                      <span className="absolute top-0 left-0 right-0 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, #fb7185, #d6486e)' }} />
                    )}

                    {/* Grip handle — visible on hover */}
                    <div
                      className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing z-10"
                      title="Drag to reorder"
                    >
                      <GripVertical size={10} style={{ color: 'rgba(232,138,165,0.45)' }} />
                    </div>

                    <button
                      onClick={() => switchDrawing(d.id)}
                      className="w-full text-left px-3 py-2.5 pl-5"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start gap-2">
                        {/* Mini file icon */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: active ? 'rgba(216,72,110,0.25)' : 'rgba(255,255,255,0.08)',
                            border: active ? '1px solid rgba(216,72,110,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          }}>
                          <FileImage size={12} style={{ color: active ? '#fb7185' : 'rgba(255,225,238,0.6)' }} />
                        </div>

                         <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 pr-6">
                            <span className="text-[11.5px] font-bold leading-tight truncate"
                              style={{ color: active ? '#fff' : 'rgba(255,225,238,0.88)' }}>
                              {d.name}
                            </span>
                            <span className="text-[8.5px] font-semibold tabular-nums shrink-0 mt-0.5"
                              style={{ color: active ? 'rgba(251,183,197,0.8)' : 'rgba(255,225,238,0.4)' }}>
                              {d.gridCols}×{d.gridRows}
                            </span>
                          </div>

                          {/* Caption */}
                          {d.caption && (
                            <div
                              className="text-[10px] font-medium leading-tight block truncate max-w-xs mt-0.5"
                              style={{ color: 'rgba(232,138,165,0.5)' }}
                              title={d.caption}
                            >
                              {d.caption}
                            </div>
                          )}

                          {/* Per-drawing progress bar */}
                          {dt.total > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${dpct}%`,
                                    background: dpct === 100 ? '#4ade80' : active ? '#d6486e' : '#6b7280',
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[8.5px] font-semibold" style={{ color: 'rgba(255,225,238,0.4)' }}>
                                  {dt.done}/{dt.total} tasks
                                </span>
                                <span className="text-[8.5px] font-extrabold tabular-nums" style={{ color: active ? '#fb7185' : 'rgba(255,225,238,0.5)' }}>
                                  {dpct}%
                                </span>
                              </div>
                            </div>
                          )}

                          {dt.total === 0 && (
                            <span className="text-[9px] font-medium mt-0.5 block" style={{ color: 'rgba(255,225,238,0.3)' }}>
                              No tasks yet
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Action buttons — top-right on hover */}
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all duration-150">
                      {/* Delete button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Delete "${d.name}"? This will also remove all its tasks.`)) return;
                          try {
                            await deleteDrawing(d.id);
                            toast.success(`"${d.name}" deleted`, { icon: '🗑️', duration: 2000 });
                          } catch {
                            toast.error('Failed to delete drawing');
                          }
                        }}
                        title="Delete drawing"
                        className="w-5 h-5 flex items-center justify-center rounded-md transition-all duration-150"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.3)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                      >
                        <Trash2 size={9} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsed: show mini drawing dots */}
        {collapsed && drawings.length > 0 && (
          <div className="pt-3 flex flex-col items-center gap-1.5">
            {drawings.slice(0, 6).map((d) => {
              const active = d.id === currentDrawingId;
              return (
                <button
                  key={d.id}
                  onClick={() => switchDrawing(d.id)}
                  title={d.name}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: active ? 'rgba(216,72,110,0.35)' : 'rgba(255,255,255,0.06)',
                    border: active ? '1px solid rgba(216,72,110,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <FileImage size={12} style={{ color: active ? '#fb7185' : 'rgba(255,225,238,0.6)' }} />
                </button>
              );
            })}
            {drawings.length > 6 && (
              <span className="text-[9px] font-bold text-pink-100/40">+{drawings.length - 6}</span>
            )}
          </div>
        )}
      </div>

      {showProjectForm && (
        <ProjectFormModal
          project={activeProject ?? null}
          managers={managers}
          onClose={() => setShowProjectForm(false)}
          onSaved={() => { setShowProjectForm(false); refreshProjects(); }}
        />
      )}

      {/* ── Footer ── */}
      <div className="relative px-3 pb-4 pt-2 shrink-0">
        <div
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${collapsed ? 'justify-center' : ''}`}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {collapsed ? (
            <Activity size={13} className="text-white/40" />
          ) : (
            <>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <BarChart2 size={12} className="text-white/70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white/80">BuildTrack v1.0</div>
                <div className="text-[9px] font-semibold text-emerald-500/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Live
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-extrabold text-white tabular-nums">{stats.pct}%</div>
                <div className="text-[8.5px] text-pink-100/40 font-medium">overall</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
