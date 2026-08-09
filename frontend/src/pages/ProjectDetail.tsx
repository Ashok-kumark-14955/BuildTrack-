import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Archive, ArchiveRestore, Trash2, Plus, Search,
  ListTodo, CheckCircle2, Users, TrendingUp, User, Calendar, ArrowUp, ArrowDown, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectsAPI, ProjectTasksAPI } from '../api';
import {
  PROJECT_STATUS_COLORS, PROJECT_TASK_STATUS_COLORS, PROJECT_TASK_STATUS_OPTIONS, PRIORITY_OPTIONS,
  type Project, type ProjectTask,
} from '../types';
import ProjectFormModal from '../components/ProjectFormModal';
import ProjectTaskDrawer from '../components/ProjectTaskDrawer';

type SortKey = 'name' | 'dueDate' | 'priority' | 'createdAt';

const PRIORITY_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  Low:      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', dot: '#64748b' },
  Medium:   { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', dot: '#3b82f6' },
  High:     { bg: 'rgba(249,115,22,0.12)',  color: '#fb923c', dot: '#f97316' },
  Critical: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', dot: '#ef4444' },
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | 'new' | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        ProjectsAPI.get(id),
        ProjectTasksAPI.list({
          projectId: id,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          assignee: assigneeFilter || undefined,
          q: search || undefined,
          sortBy: sortKey,
          sortDir: sortAsc ? 'asc' : 'desc',
        }),
      ]);
      setProject(p ?? null);
      setTasks(t);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, search, statusFilter, priorityFilter, assigneeFilter, sortKey, sortAsc]);

  const [allAssignees, setAllAssignees] = useState<string[]>([]);
  useEffect(() => {
    if (!id) return;
    ProjectTasksAPI.list({ projectId: id }).then((all) => {
      setAllAssignees(Array.from(new Set(all.map((t) => t.assignee).filter(Boolean))));
    });
  }, [id]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const toggleArchive = async () => {
    if (!project) return;
    try {
      const updated = await ProjectsAPI.setArchived(project.id, !project.archived);
      setProject((prev) => (prev ? { ...prev, archived: updated.archived } : prev));
      toast.success(project.archived ? 'Project unarchived' : 'Project archived');
    } catch {
      toast.error('Failed to update project');
    }
  };

  const remove = async () => {
    if (!project) return;
    try {
      await ProjectsAPI.remove(project.id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err: any) {
      const taskCount = err?.response?.data?.taskCount;
      if (err?.response?.status === 409 && taskCount != null) {
        if (confirm(`This project has ${taskCount} task(s). Delete the project and all its tasks anyway?`)) {
          await ProjectsAPI.remove(project.id, true);
          toast.success('Project and its tasks deleted');
          navigate('/projects');
        }
      } else {
        toast.error('Failed to delete project');
      }
    }
  };

  if (loading && !project) {
    return (
      <div className="p-7 h-full flex items-center justify-center" style={{ background: '#0e0006' }}>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading project…</div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="p-7 h-full flex items-center justify-center" style={{ background: '#0e0006' }}>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Project not found.</div>
      </div>
    );
  }

  const stats = project.stats ?? { taskCount: 0, doneCount: 0, progress: 0, members: 0 };

  const statCards = [
    { label: 'Total Tasks',  value: stats.taskCount,      icon: ListTodo,     accent: '#3b82f6' },
    { label: 'Done',         value: stats.doneCount,      icon: CheckCircle2, accent: '#10b981' },
    { label: 'Progress',     value: `${stats.progress}%`, icon: TrendingUp,   accent: '#8b5cf6' },
    { label: 'Members',      value: stats.members,        icon: Users,        accent: '#f59e0b' },
  ];

  const selectStyle: React.CSSProperties = {
    background: 'rgba(30,0,12,0.9)',
    border: '1px solid rgba(128,0,32,0.45)',
    color: '#ffffff',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div
      className="h-full flex flex-col overflow-y-auto"
      style={{ background: 'linear-gradient(160deg, #0e0006 0%, #150009 50%, #0e0006 100%)', padding: '28px' }}
    >
      {/* Back */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-sm mb-5 w-fit transition-colors"
        style={{ color: 'rgba(255,255,255,0.55)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
      >
        <ArrowLeft size={14} /> Back to Projects
      </button>

      {/* ── Project Header Card ── */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(30,0,12,0.9) 0%, rgba(40,0,18,0.85) 100%)',
          border: '1px solid rgba(128,0,32,0.4)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-bold text-2xl tracking-tight" style={{ color: '#ffffff' }}>{project.name}</h1>
              {project.code && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'rgba(128,0,32,0.3)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(190,24,93,0.3)' }}>
                  {project.code}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${PROJECT_STATUS_COLORS[project.status]}18`, color: PROJECT_STATUS_COLORS[project.status], border: `1px solid ${PROJECT_STATUS_COLORS[project.status]}30` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PROJECT_STATUS_COLORS[project.status] }} />
                {project.status}
              </span>
              {!!project.archived && (
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>Archived</span>
              )}
            </div>
            {project.description && (
              <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{project.description}</p>
            )}
            <div className="flex items-center gap-5 mt-3 flex-wrap">
              {project.managerName && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <User size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />{project.managerName}
                </span>
              )}
              {(project.startDate || project.endDate) && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <Calendar size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  {project.startDate || '—'} → {project.endDate || '—'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(30,0,12,0.9)', color: '#ffffff', border: '1px solid rgba(128,0,32,0.45)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(190,24,93,0.2)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,0,12,0.9)'; e.currentTarget.style.borderColor = 'rgba(128,0,32,0.45)'; }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={toggleArchive}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(30,0,12,0.9)', color: '#ffffff', border: '1px solid rgba(128,0,32,0.45)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(190,24,93,0.2)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,0,12,0.9)'; e.currentTarget.style.borderColor = 'rgba(128,0,32,0.45)'; }}
            >
              {project.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              {project.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={remove}
              className="flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-lg transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(30,0,12,0.9) 0%, rgba(38,0,16,0.85) 100%)',
              border: '1px solid rgba(128,0,32,0.35)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
            }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, border: `1px solid ${accent}25` }}>
              <Icon size={18} style={{ color: accent }} />
            </div>
            <div>
              <div className="text-2xl font-bold leading-none" style={{ color: '#ffffff' }}>{value}</div>
              <div className="text-[11px] font-semibold mt-1.5 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tasks Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-base" style={{ color: '#ffffff' }}>Tasks</h2>
        <button
          onClick={() => setDrawerTaskId('new')}
          className="flex items-center gap-1.5 text-[13px] font-bold px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'linear-gradient(135deg, #db2777 0%, #be185d 55%, #9f1239 100%)',
            color: '#fff',
            border: '1px solid rgba(219,39,119,0.3)',
            boxShadow: '0 2px 12px rgba(159,18,57,0.5)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* ── Filters ── */}
      <div
        className="flex flex-wrap gap-3 mb-4 rounded-xl p-3"
        style={{ background: 'rgba(30,0,12,0.8)', border: '1px solid rgba(128,0,32,0.3)' }}
      >
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px] transition-all"
          style={{ background: 'rgba(20,0,8,0.9)', border: '1px solid rgba(128,0,32,0.4)' }}
          onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(219,39,119,0.6)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 2px rgba(190,24,93,0.15)'; }}
          onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(128,0,32,0.4)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
        >
          <Search size={14} style={{ color: 'rgba(255,255,255,0.35)' }} className="shrink-0" />
          <input
            className="flex-1 outline-none text-[13px] bg-transparent"
            style={{ color: '#ffffff', caretColor: '#be185d' }}
            placeholder="Search tasks, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {PROJECT_TASK_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select style={selectStyle} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">All Assignees</option>
          {allAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* ── Tasks Table ── */}
      <div
        className="rounded-2xl overflow-auto"
        style={{ background: 'rgba(20,0,8,0.85)', border: '1px solid rgba(128,0,32,0.35)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(30,0,12,0.95)', borderBottom: '1px solid rgba(128,0,32,0.35)' }}>
              {(['name'] as SortKey[]).map((key) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors"
                  style={{ color: sortKey === key ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
                >
                  <span className="inline-flex items-center gap-1">Task {sortKey === key && (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}</span>
                </th>
              ))}
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Status</th>
              {(['priority'] as SortKey[]).map((key) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors"
                  style={{ color: sortKey === key ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
                >
                  <span className="inline-flex items-center gap-1">Priority {sortKey === key && (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}</span>
                </th>
              ))}
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Assignee</th>
              {(['dueDate'] as SortKey[]).map((key) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest cursor-pointer select-none transition-colors"
                  style={{ color: sortKey === key ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
                >
                  <span className="inline-flex items-center gap-1">Due Date {sortKey === key && (sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}</span>
                </th>
              ))}
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Est. Hrs</th>
              <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr
                key={t.id}
                onClick={() => setDrawerTaskId(t.id)}
                className="cursor-pointer transition-all"
                style={{ borderTop: i > 0 ? '1px solid rgba(128,0,32,0.2)' : undefined }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(190,24,93,0.07)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                <td className="px-5 py-3.5 font-semibold" style={{ color: '#ffffff' }}>{t.name}</td>
                <td className="px-5 py-3.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${PROJECT_TASK_STATUS_COLORS[t.status]}18`, color: PROJECT_TASK_STATUS_COLORS[t.status], border: `1px solid ${PROJECT_TASK_STATUS_COLORS[t.status]}25` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PROJECT_TASK_STATUS_COLORS[t.status] }} />
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {t.priority && (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: PRIORITY_STYLE[t.priority]?.bg,
                        color: PRIORITY_STYLE[t.priority]?.color,
                        border: `1px solid ${PRIORITY_STYLE[t.priority]?.dot}20`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_STYLE[t.priority]?.dot }} />
                      {t.priority}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {t.assignee || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                </td>
                <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {t.dueDate || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                </td>
                <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {t.estimatedHours ?? <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: 'rgba(128,0,32,0.25)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(190,24,93,0.25)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(128,0,32,0.15)', border: '1px solid rgba(128,0,32,0.3)' }}>
                      <ClipboardList size={24} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No tasks yet — create the first one</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEditModal && (
        <ProjectFormModal
          project={project}
          managers={[]}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); load(); }}
        />
      )}

      {drawerTaskId && (
        <ProjectTaskDrawer
          projectId={project.id}
          taskId={drawerTaskId}
          onClose={() => setDrawerTaskId(null)}
          onSaved={() => { setDrawerTaskId(null); load(); }}
          onDeleted={() => { setDrawerTaskId(null); load(); }}
        />
      )}
    </div>
  );
}
