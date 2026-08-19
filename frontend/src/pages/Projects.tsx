import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, ArrowUp, ArrowDown, FolderKanban, Archive, ArchiveRestore,
  User, Layers, Calendar, TrendingUp, CheckCircle2, Clock, AlertCircle,
  Filter, ChevronRight, Building2, Trash2, Hash, CalendarDays, BarChart2,
  Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectsAPI, ZohoBackboneAPI } from '../api';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_OPTIONS, type Project } from '../types';
import ProjectFormModal from '../components/ProjectFormModal';
import FieldsModal from '../components/FieldsModal';
import { useApp } from '../AppContext';

type SortKey = 'name' | 'createdAt' | 'updatedAt';
type ViewMode = 'table' | 'cards';

const STATUS_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Planning: Clock,
  Active: TrendingUp,
  'On Hold': AlertCircle,
  Completed: CheckCircle2,
};

function ProjectCard({ p, onEdit, onArchive, onDelete, onFields, onSelect }: {
  p: Project;
  onEdit: (p: Project, e: React.MouseEvent) => void;
  onArchive: (p: Project, e: React.MouseEvent) => void;
  onDelete: (p: Project, e: React.MouseEvent) => void;
  onFields: (p: Project, e: React.MouseEvent) => void;
  onSelect: (p: Project) => void;
}) {
  const StatusIcon = STATUS_ICONS[p.status] ?? Clock;
  const statusColor = PROJECT_STATUS_COLORS[p.status];
  const progress = p.stats?.progress ?? 0;

  return (
    <div
      onClick={() => onSelect(p)}
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group ${p.archived ? 'opacity-60' : ''}`}
      style={{
        background: 'rgba(14,4,8,0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}
    >
      {/* Top status bar */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${statusColor}aa, ${statusColor})` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {p.code && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                  {p.code}
                </span>
              )}
              {p.archived && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(100,116,139,0.2)', color: '#94a3b8' }}>
                  Archived
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-white truncate group-hover:text-rose-200 transition-colors">
              {p.name}
            </h3>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0 text-[10px] font-semibold"
            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
            <StatusIcon size={9} />
            {p.status}
          </div>
        </div>

        {/* Manager */}
        {p.managerName && (
          <div className="flex items-center gap-1.5 mb-3 text-[11px] text-white/50">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: `${statusColor}25`, color: statusColor }}>
              {p.managerName.charAt(0).toUpperCase()}
            </div>
            {p.managerName}
          </div>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40 font-medium">Progress</span>
            <span className="text-[10px] font-extrabold tabular-nums"
              style={{ color: progress >= 100 ? '#4ade80' : statusColor }}>
              {progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: progress >= 100 ? '#4ade80' : `linear-gradient(90deg, ${statusColor}aa, ${statusColor})` }} />
          </div>
        </div>

        {/* Stats row */}
        {p.stats && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <CheckCircle2 size={9} className="text-emerald-400" />
              <span className="font-semibold text-white/60">{p.stats.doneCount}</span>/{p.stats.taskCount}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/40">
              <User size={9} />
              {p.stats.members} member{p.stats.members !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Dates */}
        {(p.startDate || p.endDate) && (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] text-white/35">
            <Calendar size={9} />
            {p.startDate || '—'} → {p.endDate || '—'}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
          <button
            onClick={(e) => onEdit(p, e)}
            className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            Edit
          </button>
          <button
            onClick={(e) => onFields(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
            title="Custom fields"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <Layers size={11} />
          </button>
          <button
            onClick={(e) => onArchive(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
            title={p.archived ? 'Unarchive' : 'Archive'}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            {p.archived ? <ArchiveRestore size={11} /> : <Archive size={11} />}
          </button>
          <button
            onClick={(e) => onDelete(p, e)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(239,68,68,0.6)' }}
            title="Delete project"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)'; }}
          >
            <Trash2 size={11} />
          </button>
          <ChevronRight size={11} className="text-white/20 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const { setActiveProjectId, refreshMilestones, refreshTasks } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [fieldsProject, setFieldsProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const load = async () => {
    setLoading(true);
    try {
      let list = await ZohoBackboneAPI.listProjects();
      // Client-side filtering/sorting (Zoho backbone returns all projects)
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? '').toLowerCase().includes(q) ||
          (p.managerName ?? '').toLowerCase().includes(q)
        );
      }
      if (statusFilter) list = list.filter((p) => p.status === statusFilter);
      if (!showArchived) list = list.filter((p) => !p.archived);
      // Sort
      list = [...list].sort((a, b) => {
        let va = sortKey === 'name' ? a.name : (a[sortKey] ?? '');
        let vb = sortKey === 'name' ? b.name : (b[sortKey] ?? '');
        const cmp = String(va).localeCompare(String(vb));
        return sortAsc ? cmp : -cmp;
      });
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, showArchived, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'name'); }
  };

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (p: Project, e: React.MouseEvent) => { e.stopPropagation(); setEditing(p); setShowForm(true); };

  const toggleArchive = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Use the dedicated PATCH /archive endpoint (PUT does not update the archived column)
      await ProjectsAPI.setArchived(p.id, !p.archived);
      toast.success(p.archived ? 'Project unarchived' : 'Project archived');
      load();
    } catch {
      toast.error('Failed to update project');
    }
  };

  const confirmDelete = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(p);
  };

  const deleteProject = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ProjectsAPI.remove(deleteTarget.id, force);
      toast.success('Project deleted');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      const data = err?.response?.data;
      if (err?.response?.status === 409) {
        // Has tasks — confirm force-delete
        setDeleting(false);
        if (window.confirm(`${data?.error}\n\nClick OK to force-delete everything.`)) {
          await deleteProject(true);
        } else {
          setDeleteTarget(null);
        }
      } else {
        toast.error(data?.error || 'Failed to delete project');
        setDeleteTarget(null);
        setDeleting(false);
      }
    }
  };

  const selectProject = async (p: Project) => {
    await Promise.all([refreshMilestones(), refreshTasks()]);
    setActiveProjectId(p.id);
    navigate('/');
  };

  const managers = useMemo(
    () => Array.from(new Set(projects.map((p) => p.managerName).filter(Boolean))),
    [projects]
  );

  // Summary stats
  const summary = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => p.status === 'Active').length,
    completed: projects.filter((p) => p.status === 'Completed').length,
    onHold: projects.filter((p) => p.status === 'On Hold').length,
  }), [projects]);

  return (
    <div
      className="p-6 h-full flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 15% 5%, rgba(190,24,93,0.18) 0%, transparent 55%), #09090b' }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #be185d, #9f1239)', boxShadow: '0 4px 16px rgba(190,24,93,0.35)' }}>
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">Projects</h1>
            <p className="text-sm text-rose-300/60 mt-0.5">{summary.total} project{summary.total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['table', 'cards'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={viewMode === mode
                  ? { background: 'rgba(190,24,93,0.35)', color: '#fb7185', border: '1px solid rgba(216,72,110,0.3)' }
                  : { color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
                }
              >
                {mode === 'table' ? '≡ Table' : '⊞ Cards'}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #be185d, #9f1239)', boxShadow: '0 4px 14px rgba(190,24,93,0.3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { label: 'Active', value: summary.active, color: '#3b82f6' },
          { label: 'Completed', value: summary.completed, color: '#4ade80' },
          { label: 'On Hold', value: summary.onHold, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
            style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {value} {label}
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-2xl"
        style={{ background: 'rgba(18,4,8,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[200px] transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={14} className="text-rose-400/50 shrink-0" />
          <input
            className="flex-1 outline-none text-sm bg-transparent text-white placeholder:text-white/25"
            placeholder="Search name, code, manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-xl text-sm font-medium text-white outline-none transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {PROJECT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
          style={showArchived
            ? { background: 'rgba(100,116,139,0.25)', border: '1px solid rgba(100,116,139,0.4)', color: '#94a3b8' }
            : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
          }
        >
          <Archive size={13} /> {showArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
        <div className="flex items-center gap-1 text-[10px] text-white/30 ml-auto">
          <Filter size={10} /> {projects.length} result{projects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'cards' ? (
          // Card grid
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl h-48 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-3 text-white/30">
                <FolderKanban size={36} />
                <span className="text-sm font-medium">No projects found</span>
                <button onClick={openCreate} className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                  style={{ background: 'rgba(190,24,93,0.15)', color: '#fb7185', border: '1px solid rgba(190,24,93,0.25)' }}>
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id} p={p}
                    onEdit={openEdit}
                    onArchive={toggleArchive}
                    onDelete={confirmDelete}
                    onFields={(p, e) => { e.stopPropagation(); setFieldsProject(p); }}
                    onSelect={selectProject}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Table view
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(14,4,8,0.97)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'linear-gradient(135deg, rgba(190,24,93,0.1) 0%, rgba(14,4,8,0.98) 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <tr>
                  {/* Code */}
                  <th className="text-left px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                        <Hash size={8} className="text-rose-400/70" />
                      </span>
                      Code
                    </span>
                  </th>
                  {/* Name (sortable) */}
                  {(['name'] as SortKey[]).map((key) => (
                    <th key={key} onClick={() => toggleSort(key)} className="text-left px-4 py-3.5 cursor-pointer select-none group/th">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover/th:text-white/70 transition-colors">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                          <FolderKanban size={8} className="text-rose-400/70" />
                        </span>
                        Name
                        {sortKey === key
                          ? (sortAsc ? <ArrowUp size={9} className="text-rose-400" /> : <ArrowDown size={9} className="text-rose-400" />)
                          : <ArrowDown size={9} className="opacity-0 group-hover/th:opacity-40 transition-opacity" />}
                      </span>
                    </th>
                  ))}
                  {/* Status */}
                  <th className="text-left px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                        <CheckCircle2 size={8} className="text-emerald-400/70" />
                      </span>
                      Status
                    </span>
                  </th>
                  {/* Manager */}
                  <th className="text-left px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                        <User size={8} className="text-amber-400/70" />
                      </span>
                      Manager
                    </span>
                  </th>
                  {/* Dates */}
                  <th className="text-left px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                        <CalendarDays size={8} className="text-sky-400/70" />
                      </span>
                      Dates
                    </span>
                  </th>
                  {/* Progress */}
                  <th className="text-left px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                        <BarChart2 size={8} className="text-violet-400/70" />
                      </span>
                      Progress
                    </span>
                  </th>
                  {/* Created / Updated (sortable) */}
                  {(['createdAt', 'updatedAt'] as SortKey[]).map((key) => (
                    <th key={key} onClick={() => toggleSort(key)} className="text-left px-4 py-3.5 cursor-pointer select-none whitespace-nowrap group/th">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover/th:text-white/70 transition-colors">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                          <Calendar size={8} className="text-teal-400/70" />
                        </span>
                        {key === 'createdAt' ? 'Created' : 'Updated'}
                        {sortKey === key
                          ? (sortAsc ? <ArrowUp size={9} className="text-rose-400" /> : <ArrowDown size={9} className="text-rose-400" />)
                          : <ArrowDown size={9} className="opacity-0 group-hover/th:opacity-40 transition-opacity" />}
                      </span>
                    </th>
                  ))}
                  {/* Actions */}
                  <th className="text-left px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/6 border border-white/10">
                        <Edit3 size={8} className="text-rose-400/70" />
                      </span>
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-white/30">
                        <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Loading projects…</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && projects.map((p) => {
                  const sc = PROJECT_STATUS_COLORS[p.status];
                  const prog = p.stats?.progress ?? 0;
                  const StatusIcon = STATUS_ICONS[p.status] ?? Clock;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => selectProject(p)}
                      className={`cursor-pointer group/row ${p.archived ? 'opacity-50' : ''}`}
                      style={{ borderTop: '1px solid rgba(255,255,255,0.045)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `rgba(190,24,93,0.055)`; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        {p.code
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {p.code}
                            </span>
                          : <span className="text-white/20 text-[11px]">—</span>}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${sc}30, ${sc}15)`, border: `1px solid ${sc}40` }}>
                            <FolderKanban size={12} style={{ color: sc }} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white/90 text-[13px] group-hover/row:text-rose-200 transition-colors truncate">{p.name}</div>
                            {p.description && <div className="text-[10px] text-white/30 mt-0.5 truncate">{p.description}</div>}
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${sc}18`, color: sc, border: `1px solid ${sc}35`, boxShadow: `0 0 8px ${sc}20` }}>
                          <StatusIcon size={9} />
                          {p.status}
                        </span>
                      </td>
                      {/* Manager */}
                      <td className="px-4 py-3.5">
                        {p.managerName
                          ? <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0"
                                style={{ background: `linear-gradient(135deg, ${sc}40, ${sc}20)`, color: sc, border: `1px solid ${sc}40` }}>
                                {p.managerName.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[110px]">{p.managerName}</span>
                            </span>
                          : <span className="text-white/20 text-[11px]">—</span>}
                      </td>
                      {/* Dates */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 text-[10px] tabular-nums"
                          style={{ color: 'rgba(255,255,255,0.35)' }}>
                          <Calendar size={9} className="text-sky-400/50 shrink-0" />
                          <span>{p.startDate || '—'}</span>
                          <span className="text-white/20">→</span>
                          <span>{p.endDate || '—'}</span>
                        </div>
                      </td>
                      {/* Progress */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${prog}%`, background: prog >= 100 ? '#4ade80' : `linear-gradient(90deg, ${sc}88, ${sc})` }} />
                          </div>
                          <span className="text-[10px] font-extrabold tabular-nums w-7 text-right"
                            style={{ color: prog >= 100 ? '#4ade80' : sc }}>
                            {prog}%
                          </span>
                        </div>
                      </td>
                      {/* Created */}
                      <td className="px-4 py-3.5 text-white/30 text-[11px] tabular-nums whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      {/* Updated */}
                      <td className="px-4 py-3.5 text-white/30 text-[11px] tabular-nums whitespace-nowrap">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => openEdit(p, e)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: 'rgba(190,24,93,0.12)', color: '#fb7185', border: '1px solid rgba(190,24,93,0.22)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(190,24,93,0.25)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(190,24,93,0.12)'; }}
                          >
                            <Edit3 size={9} /> Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFieldsProject(p); }}
                            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all text-violet-400/50 hover:text-violet-300"
                            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
                            title="Custom fields"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; }}
                          >
                            <Layers size={10} />
                          </button>
                          <button
                            onClick={(e) => toggleArchive(p, e)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all text-slate-400/50 hover:text-slate-300"
                            style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)' }}
                            title={p.archived ? 'Unarchive' : 'Archive'}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(100,116,139,0.08)'; }}
                          >
                            {p.archived ? <ArchiveRestore size={10} /> : <Archive size={10} />}
                          </button>
                          <button
                            onClick={(e) => confirmDelete(p, e)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg transition-all text-red-500/50 hover:text-red-400"
                            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}
                            title="Delete project"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
                          >
                            <Trash2 size={10} />
                          </button>
                          <ChevronRight size={10} className="text-white/15 ml-0.5 group-hover/row:text-white/35 transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && projects.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-white/25">
                        <FolderKanban size={32} />
                        <span className="text-sm font-medium">No projects found</span>
                        <button onClick={openCreate} className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                          style={{ background: 'rgba(190,24,93,0.15)', color: '#fb7185', border: '1px solid rgba(190,24,93,0.25)' }}>
                          Create your first project
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ProjectFormModal
          project={editing}
          managers={managers}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(165deg, #0f111a 0%, #131824 60%, #0d1118 100%)',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-white">Delete Project?</div>
                  <div className="text-[11px] text-white/40 mt-0.5">This action cannot be undone</div>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-5">
                Are you sure you want to delete <span className="text-white font-semibold">"{deleteTarget.name}"</span>? All associated data will be permanently removed.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteProject(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}
                >
                  {deleting ? 'Deleting…' : 'Delete Project'}
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fieldsProject && (
        <FieldsModal
          projectId={fieldsProject.id}
          projectName={fieldsProject.name}
          onClose={() => setFieldsProject(null)}
        />
      )}
    </div>
  );
}
