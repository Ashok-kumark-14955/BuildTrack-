import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUp, ArrowDown, FolderKanban, Archive, ArchiveRestore, User, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectsAPI } from '../api';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_OPTIONS, type Project } from '../types';
import ProjectFormModal from '../components/ProjectFormModal';
import FieldsModal from '../components/FieldsModal';
import { useApp } from '../AppContext';

type SortKey = 'name' | 'createdAt' | 'updatedAt';

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

  const load = async () => {
    setLoading(true);
    try {
      const list = await ProjectsAPI.list({
        q: search || undefined,
        status: statusFilter || undefined,
        archived: showArchived ? 'all' : undefined,
        sortBy: sortKey,
        sortDir: sortAsc ? 'asc' : 'desc',
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

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (p: Project, e: React.MouseEvent) => { e.stopPropagation(); setEditing(p); setShowForm(true); };

  const toggleArchive = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ProjectsAPI.setArchived(p.id, !p.archived);
      toast.success(p.archived ? 'Project unarchived' : 'Project archived');
      load();
    } catch {
      toast.error('Failed to update project');
    }
  };

  const managers = useMemo(
    () => Array.from(new Set(projects.map((p) => p.managerName).filter(Boolean))),
    [projects]
  );

  return (
    <div className="p-7 h-full flex flex-col overflow-hidden bg-neutral-950">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary px-3.5 py-2.5">
          <Plus size={15} /> New Project
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 card p-3">
        <div className="flex items-center gap-2 bg-slate-100/80 rounded-lg px-3 py-2 flex-1 min-w-[220px] border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            className="flex-1 outline-none text-sm bg-transparent placeholder:text-slate-400"
            placeholder="Search name, code, manager…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input !w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {PROJECT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={`btn px-3 py-2 text-sm ${showArchived ? 'bg-slate-800 text-white' : 'btn-secondary'}`}
        >
          <Archive size={14} /> {showArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
      </div>

      <div className="flex-1 overflow-auto card">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Code</th>
              {(['name'] as SortKey[]).map((key) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-700"
                >
                  <span className="inline-flex items-center gap-1">
                    Name {sortKey === key && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Manager</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Dates</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Progress</th>
              {(['createdAt', 'updatedAt'] as SortKey[]).map((key) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none whitespace-nowrap hover:text-slate-700"
                >
                  <span className="inline-flex items-center gap-1">
                    {key === 'createdAt' ? 'Created' : 'Updated'}
                    {sortKey === key && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                onClick={async () => {
                  // Refresh milestones & tasks for the new project context
                  await Promise.all([refreshMilestones(), refreshTasks()]);
                  // Setting activeProjectId triggers the AppContext useEffect which
                  // re-fetches all drawings and auto-switches to the first one for
                  // this project — no need to call setCurrentDrawingId manually.
                  setActiveProjectId(p.id);
                  navigate('/');
                }}
                className={`border-t border-zinc-800 hover:bg-zinc-800/60 cursor-pointer transition-colors ${p.archived ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.code || '—'}</td>
                <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${PROJECT_STATUS_COLORS[p.status]}18`, color: PROJECT_STATUS_COLORS[p.status] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PROJECT_STATUS_COLORS[p.status] }} />
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {p.managerName ? (
                    <span className="inline-flex items-center gap-1.5"><User size={12} className="text-slate-400" />{p.managerName}</span>
                  ) : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs tabular-nums">
                  {p.startDate || '—'} → {p.endDate || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${p.stats?.progress ?? 0}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums w-8">{p.stats?.progress ?? 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">{new Date(p.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => openEdit(p, e)} className="btn-ghost text-xs px-2 py-1 rounded-md">Edit</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFieldsProject(p); }}
                      className="icon-btn w-7 h-7"
                      title="Manage custom fields"
                    >
                      <Layers size={13} />
                    </button>
                    <button onClick={(e) => toggleArchive(p, e)} className="icon-btn w-7 h-7" title={p.archived ? 'Unarchive' : 'Archive'}>
                      {p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-slate-400 py-14">
                  <div className="flex flex-col items-center gap-2">
                    <FolderKanban size={28} className="text-slate-300" />
                    <span className="text-sm">No projects found</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProjectFormModal
          project={editing}
          managers={managers}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
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
