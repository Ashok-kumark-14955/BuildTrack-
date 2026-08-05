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

const PRIORITY_STYLE: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-50 text-blue-600',
  High: 'bg-orange-50 text-orange-600',
  Critical: 'bg-red-50 text-red-600',
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
      setProject(p);
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
    return <div className="p-7 text-sm text-slate-400">Loading project…</div>;
  }
  if (!project) {
    return <div className="p-7 text-sm text-slate-400">Project not found.</div>;
  }

  const stats = project.stats ?? { taskCount: 0, doneCount: 0, progress: 0, members: 0 };

  return (
    <div className="p-7 h-full flex flex-col overflow-y-auto bg-neutral-950">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 w-fit">
        <ArrowLeft size={15} /> Back to Projects
      </button>

      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">{project.name}</h1>
              {project.code && <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{project.code}</span>}
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: `${PROJECT_STATUS_COLORS[project.status]}18`, color: PROJECT_STATUS_COLORS[project.status] }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PROJECT_STATUS_COLORS[project.status] }} />
                {project.status}
              </span>
              {!!project.archived && <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500">Archived</span>}
            </div>
            {project.description && <p className="text-sm text-slate-400 mt-2 max-w-2xl">{project.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
              {project.managerName && (
                <span className="inline-flex items-center gap-1.5"><User size={13} className="text-slate-400" />{project.managerName}</span>
              )}
              {(project.startDate || project.endDate) && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  {project.startDate || '—'} → {project.endDate || '—'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowEditModal(true)} className="btn btn-secondary px-3 py-2 text-sm"><Pencil size={14} /> Edit</button>
            <button onClick={toggleArchive} className="btn btn-secondary px-3 py-2 text-sm">
              {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />} {project.archived ? 'Unarchive' : 'Archive'}
            </button>
            <button onClick={remove} className="btn bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-sm"><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tasks', value: stats.taskCount, icon: ListTodo, tint: 'from-blue-500/10 to-blue-500/0 text-blue-600' },
          { label: 'Done', value: stats.doneCount, icon: CheckCircle2, tint: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600' },
          { label: 'Progress', value: `${stats.progress}%`, icon: TrendingUp, tint: 'from-violet-500/10 to-violet-500/0 text-violet-600' },
          { label: 'Members', value: stats.members, icon: Users, tint: 'from-amber-500/10 to-amber-500/0 text-amber-600' },
        ].map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tint} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
          <div className="font-display text-2xl font-bold text-white leading-none">{value}</div>
          <div className="text-xs text-slate-400 mt-1.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Tasks</h2>
        <button onClick={() => setDrawerTaskId('new')} className="btn btn-primary px-3.5 py-2 text-sm">
          <Plus size={15} /> New Task
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 card p-3">
        <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2 flex-1 min-w-[220px] border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            className="flex-1 outline-none text-sm bg-transparent placeholder:text-slate-400"
            placeholder="Search tasks, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input !w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {PROJECT_TASK_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input !w-auto text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input !w-auto text-sm" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">All Assignees</option>
          {allAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 sticky top-0 z-10">
            <tr>
              {(['name'] as SortKey[]).map((key) => (
                <th key={key} onClick={() => toggleSort(key)} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-700">
                  <span className="inline-flex items-center gap-1">Task {sortKey === key && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Status</th>
              {(['priority'] as SortKey[]).map((key) => (
                <th key={key} onClick={() => toggleSort(key)} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-700">
                  <span className="inline-flex items-center gap-1">Priority {sortKey === key && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Assignee</th>
              {(['dueDate'] as SortKey[]).map((key) => (
                <th key={key} onClick={() => toggleSort(key)} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-700">
                  <span className="inline-flex items-center gap-1">Due Date {sortKey === key && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}</span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Est. Hrs</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Tags</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} onClick={() => setDrawerTaskId(t.id)} className="border-t border-zinc-800 hover:bg-zinc-800/60 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-semibold text-white">{t.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${PROJECT_TASK_STATUS_COLORS[t.status]}18`, color: PROJECT_TASK_STATUS_COLORS[t.status] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PROJECT_TASK_STATUS_COLORS[t.status] }} />
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{t.assignee || <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-slate-300 tabular-nums">{t.dueDate || <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-slate-400 tabular-nums">{t.estimatedHours ?? <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map((tag) => <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{tag}</span>)}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-14">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList size={28} className="text-slate-300" />
                    <span className="text-sm">No tasks yet</span>
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
