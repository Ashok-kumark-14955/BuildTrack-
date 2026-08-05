import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileImage,
  ListChecks,
  HardHat,
  Building2,
  FolderKanban,
  Pencil,
  Plus,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Search,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { useEffect, useMemo, useState } from 'react';
import ProjectFormModal from './ProjectFormModal';

const navItems = [
  { to: '/', label: 'Drawing', icon: FileImage, accent: '#60a5fa', accentGlow: 'rgba(96,165,250,0.85)' },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#fb923c', accentGlow: 'rgba(251,146,60,0.85)' },
  { to: '/tasks', label: 'Task List', icon: ListChecks, accent: '#4ade80', accentGlow: 'rgba(74,222,128,0.85)' },
];

export default function Sidebar() {
  const { tasks, drawings, projects, refreshProjects, currentDrawingId, setCurrentDrawingId } = useApp();
  const navigate = useNavigate();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1');
  const [drawingFilter, setDrawingFilter] = useState('');

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const blocked = tasks.filter((t) => t.status === 'Blocked').length;
    const delayed = tasks.filter((t) => t.status === 'Delayed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, blocked, delayed, attention: blocked + delayed, pct };
  }, [tasks]);

  const switchDrawing = (drawingId: string) => {
    setCurrentDrawingId(drawingId);
    navigate('/');
  };

  const filteredDrawings = useMemo(
    () => drawings.filter((d) => d.name.toLowerCase().includes(drawingFilter.trim().toLowerCase())),
    [drawings, drawingFilter]
  );

  const activeProject = projects[0];
  const managers = useMemo(
    () => Array.from(new Set(projects.map((p) => p.managerName).filter(Boolean))) as string[],
    [projects]
  );

  return (
    <div
      className={`${collapsed ? 'w-[72px]' : 'w-72'} h-full flex flex-col shrink-0 select-none transition-all duration-300 relative overflow-hidden`}
      style={{
        background: 'linear-gradient(165deg, #0f0a0d 0%, #230d16 18%, #3a0f1f 34%, #5c1228 50%, #451a2c 66%, #240e18 82%, #0f0a0d 100%)',
        boxShadow: 'inset -1px 0 0 rgba(216,72,110,0.35)',
      }}
    >
      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Header / Logo ── */}
      <div className={`relative flex items-center gap-2.5 px-4 py-4 ${collapsed ? 'justify-center !px-2' : ''}`}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(145deg, #d6486e, #3d0010)', border: '1px solid rgba(216,72,110,0.6)' }}
        >
          <HardHat size={17} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-white font-extrabold text-[14.5px] leading-tight tracking-tight truncate drop-shadow">SiteTrack</div>
            <div className="text-[10px] font-semibold" style={{ color: '#e88aa5' }}>Site Operations</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors shrink-0"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <PanelLeftOpen size={13} className="text-pink-100/80" />
            : <PanelLeftClose size={13} className="text-pink-100/80" />}
        </button>
      </div>

      {/* ── Project card (expanded only) ── */}
      {!collapsed && (
        <div className="relative px-3 pb-3">
          <div
            className="rounded-2xl p-3 space-y-2.5"
            style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(216,72,110,0.3)', borderLeft: '3px solid #d6486e' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(216,72,110,0.25)' }}
              >
                <Building2 size={12} className="text-pink-200" />
              </div>
              <button
                onClick={() => activeProject && navigate(`/projects/${activeProject.id}`)}
                disabled={!activeProject}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <div className="text-[13.5px] font-bold text-white truncate">
                  {activeProject?.name ?? 'No Project'}
                </div>
                <div className="text-[9.5px] font-medium text-pink-100/80">
                  {activeProject?.code ? `#${activeProject.code}` : 'Add a project'}
                </div>
              </button>
              <button
                onClick={() => setShowProjectForm(true)}
                className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors shrink-0"
              >
                {activeProject
                  ? <Pencil size={10} className="text-pink-100/80" />
                  : <Plus size={10} className="text-pink-100/80" />}
              </button>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9.5px] font-semibold flex items-center gap-1 text-pink-100/80">
                  <TrendingUp size={9} /> Progress
                </span>
                <span className="text-[10px] font-extrabold text-white tabular-nums">{stats.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-black/30">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.pct}%`, background: '#d6486e' }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                {[
                  { label: 'Done', value: stats.completed, color: '#86efac' },
                  { label: 'Active', value: stats.inProgress, color: '#fde68a' },
                  { label: 'Issues', value: stats.attention, color: '#fca5a5' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex-1 mx-0.5 flex flex-col items-center rounded-lg py-1"
                    style={{ background: `${color}1a`, border: `1px solid ${color}33` }}
                  >
                    <span className="text-[11px] font-extrabold tabular-nums" style={{ color }}>{value}</span>
                    <span className="text-[8.5px] font-semibold text-pink-100/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/projects')}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-[10px] font-bold transition-colors text-white"
              style={{ border: '1px solid rgba(216,72,110,0.4)', background: 'rgba(216,72,110,0.12)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(216,72,110,0.28)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(216,72,110,0.12)')}
            >
              <FolderKanban size={10} /> All Projects
            </button>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="relative px-2 py-1 space-y-0.5 shrink-0">
        {navItems.map(({ to, label, icon: Icon, accent, accentGlow }) => {
          const badge = to === '/' ? drawings.length : to === '/tasks' ? stats.total : null;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className="block"
            >
              {({ isActive }) => (
                <div
                  className={`relative flex items-center gap-3 rounded-2xl transition-all duration-150
                    ${collapsed ? 'justify-center px-0 py-3.5' : 'px-4 py-3'}
                    ${isActive ? '' : 'hover:bg-white/10'}`}
                  style={
                    isActive
                      ? {
                          background: accentGlow.replace('0.85', '0.14'),
                          border: `1px solid ${accentGlow.replace('0.85', '0.3')}`,
                        }
                      : { border: '1px solid transparent' }
                  }
                >
                  {/* Glowing per-route left accent bar */}
                  {isActive && !collapsed && (
                    <span
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                      style={{ background: accent }}
                    />
                  )}
                  <Icon
                    size={20}
                    style={{
                      color: isActive ? accent : 'rgba(255,225,238,0.85)',
                      flexShrink: 0,
                      marginLeft: isActive && !collapsed ? '6px' : undefined,
                    }}
                  />
                  {!collapsed && (
                    <>
                      <span
                        className="flex-1 text-[14.5px] font-semibold tracking-tight"
                        style={{ color: isActive ? '#ffffff' : 'rgba(255,225,238,0.90)' }}
                      >
                        {label}
                      </span>
                      {badge !== null && badge > 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                          style={{
                            background: isActive ? `${accent}2a` : 'rgba(0,0,0,0.25)',
                            color: isActive ? accent : 'rgba(255,225,238,0.85)',
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

      {/* ── Drawings section (independently scrollable) ── */}
      <div className="relative flex-1 min-h-0 px-2 overflow-y-auto">
        {!collapsed && drawings.length > 0 && (
          <div className="pt-3">
            <div
              className="mx-1 mb-2.5 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(216,72,110,0.4), transparent)' }}
            />
            <div className="px-1 mb-1.5 flex items-center justify-between">
              <span
                className="text-[9px] uppercase tracking-widest font-extrabold flex items-center gap-1"
                style={{ letterSpacing: '0.12em', color: '#e88aa5' }}
              >
                <Layers size={8} /> Drawings
              </span>
              <span
                className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(216,72,110,0.2)', color: '#e88aa5' }}
              >
                {drawings.length}
              </span>
            </div>
            {drawings.length > 4 && (
              <div className="relative mb-1.5">
                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pink-100/50 pointer-events-none" />
                <input
                  value={drawingFilter}
                  onChange={(e) => setDrawingFilter(e.target.value)}
                  placeholder="Filter drawings…"
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg text-[10.5px] font-medium text-white placeholder:text-pink-100/40 outline-none transition-colors"
                  style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            )}
            <div className="space-y-0.5">
              {filteredDrawings.length === 0 && (
                <div className="px-2 py-2 text-[10.5px] text-pink-100/55">No drawings match.</div>
              )}
              {filteredDrawings.map((d) => {
                const active = d.id === currentDrawingId;
                return (
                  <button
                    key={d.id}
                    onClick={() => switchDrawing(d.id)}
                    title={d.name}
                    className="relative w-full flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-xl text-left transition-all duration-150 hover:bg-white/10"
                    style={
                      active
                        ? {
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.2)',
                          }
                        : { border: '1px solid transparent' }
                    }
                  >
                    {active && (
                      <span
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-white"
                        style={{ background: 'white' }}
                      />
                    )}
                    <FileImage size={11} style={{ color: active ? 'white' : 'rgba(255,225,238,0.8)' }} />
                    <span
                      className="flex-1 min-w-0 truncate text-[11px] font-semibold"
                      style={{ color: active ? 'white' : 'rgba(255,225,238,0.88)' }}
                    >
                      {d.name}
                    </span>
                    <span
                      className="text-[8.5px] font-semibold tabular-nums shrink-0"
                      style={{ color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,225,238,0.55)' }}
                    >
                      {d.gridCols}×{d.gridRows}
                    </span>
                  </button>
                );
              })}
            </div>
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
      <div className="relative px-3 pb-4 pt-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? (
            <div className="flex w-full items-center justify-center">
              <HardHat size={14} className="text-white/50" />
            </div>
          ) : (
            <>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <HardHat size={12} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white">v1.0</div>
                <div className="text-[9px] font-semibold text-pink-100/80">Live</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
