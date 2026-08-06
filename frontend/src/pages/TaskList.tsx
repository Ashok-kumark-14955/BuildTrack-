import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Download, Search, ClipboardList, ArrowUp, ArrowDown,
  Flag, ChevronDown, ChevronRight, X, FileImage,
  LayoutGrid, Building2, Minus, Plus, MapPin, Navigation, Crosshair,
} from 'lucide-react';
import { useApp } from '../AppContext';
import {
  STATUS_COLORS, STATUS_OPTIONS, PRIORITY_OPTIONS,
  MILESTONE_STATUS_OPTIONS, CATEGORY_OPTIONS, type Task, type Milestone, type Drawing,
} from '../types';
import { DrawingsAPI } from '../api';
import toast from 'react-hot-toast';

type SortKey = 'gridCode' | 'name' | 'status' | 'assignedTo' | 'priority' | 'dueDate' | 'progress';

const PRIORITY_STYLE: Record<string, string> = {
  Low: 'bg-zinc-800 text-slate-400',
  Medium: 'bg-blue-950/60 text-blue-400',
  High: 'bg-orange-950/60 text-orange-400',
  Critical: 'bg-red-950/60 text-red-400',
};

const MS_STYLE: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  Active:    { bg: 'bg-rose-950/60',    text: 'text-rose-300',    dot: 'bg-rose-500',    bar: 'bg-rose-500' },
  Completed: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  'On Hold': { bg: 'bg-amber-950/60',   text: 'text-amber-300',   dot: 'bg-amber-500',   bar: 'bg-amber-500' },
  Cancelled: { bg: 'bg-zinc-800',       text: 'text-slate-400',   dot: 'bg-zinc-500',    bar: 'bg-zinc-500' },
};

export default function TaskList() {
  const {
    tasks, drawings, projects,
    requestFocusElement, setSelectedElementId, setCurrentDrawingId,
    milestones, createMilestone, updateMilestone, deleteMilestone,
    refreshDrawings, createTask, refreshTasks,
  } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('gridCode');
  const [sortAsc, setSortAsc] = useState(true);
  const [collapsedMs, setCollapsedMs] = useState<Set<string>>(new Set());
  const [collapsedDrawings, setCollapsedDrawings] = useState<Set<string>>(new Set());

  // Milestone modal
  const [showMsModal, setShowMsModal] = useState(false);
  const [editingMs, setEditingMs] = useState<Milestone | null>(null);
  const [msForm, setMsForm] = useState({ name: '', description: '', dueDate: '', status: 'Active' as Milestone['status'] });

  // Drawing milestone assignment modal
  const [showDrawingMs, setShowDrawingMs] = useState(false);
  const [drawingToAssign, setDrawingToAssign] = useState<Drawing | null>(null);
  const [drawingMsId, setDrawingMsId] = useState<string>('');

  // Set Location modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationDrawing, setLocationDrawing] = useState<Drawing | null>(null);
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation is not supported by this browser'); return; }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLat(String(pos.coords.latitude));
        setLocLng(String(pos.coords.longitude));
        setLocatingMe(false);
        toast.success('Location captured — click Save to store it');
      },
      (err) => { setLocatingMe(false); toast.error('Could not get location: ' + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openLocationModal = (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocationDrawing(drawing);
    setLocLat(drawing.lat != null ? String(drawing.lat) : '');
    setLocLng(drawing.lng != null ? String(drawing.lng) : '');
    setShowLocationModal(true);
  };

  const saveLocation = async () => {
    if (!locationDrawing) return;
    const lat = locLat.trim() ? parseFloat(locLat) : null;
    const lng = locLng.trim() ? parseFloat(locLng) : null;
    if ((locLat.trim() && isNaN(lat!)) || (locLng.trim() && isNaN(lng!))) {
      toast.error('Invalid coordinates'); return;
    }
    setSavingLoc(true);
    try {
      await DrawingsAPI.update(locationDrawing.id, { lat, lng } as any);
      await refreshDrawings();
      toast.success('Location saved');
      setShowLocationModal(false);
    } catch { toast.error('Failed to save location'); }
    finally { setSavingLoc(false); }
  };

  const openGoogleMaps = (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    if (drawing.lat != null && drawing.lng != null) {
      window.open(`https://www.google.com/maps?q=${drawing.lat},${drawing.lng}`, '_blank');
    } else {
      toast.error('No location set for this drawing. Click the pin icon to add one.');
    }
  };

  // Add Task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskMsId, setAddTaskMsId] = useState<string | null>(null);
  const defaultTaskForm = () => ({ name: '', drawingId: '', status: 'Assigned' as Task['status'], priority: 'Medium' as Task['priority'], assignedTo: '', dueDate: '', progress: 0, category: 'Structural', description: '' });
  const [taskForm, setTaskForm] = useState(defaultTaskForm());
  const [savingTask, setSavingTask] = useState(false);

  const filterTask = (t: Task) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !t.gridCode.toLowerCase().includes(q) &&
        !t.name.toLowerCase().includes(q) &&
        !t.assignedTo.toLowerCase().includes(q) &&
        !t.status.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  };

  const sortTasks = (list: Task[]) =>
    [...list].sort((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const toggleMs = (id: string) =>
    setCollapsedMs((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleDrawing = (id: string) =>
    setCollapsedDrawings((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const goToGrid = (t: Task) => {
    const drawing = drawings.find((d) => d.id === t.drawingId);
    if (drawing) setCurrentDrawingId(drawing.id);
    setSelectedElementId(t.elementId);
    requestFocusElement(t.elementId);
    navigate('/');
  };

  const exportExcel = () => {
    const rows = tasks.filter(filterTask).map((t) => {
      const ms = milestones.find((m) => m.id === drawings.find((d) => d.id === t.drawingId)?.milestoneId);
      const drawing = drawings.find((d) => d.id === t.drawingId);
      return {
        Milestone: ms?.name ?? '',
        Drawing: drawing?.name ?? '',
        Grid: t.gridCode,
        Task: t.name,
        Status: t.status,
        'Assigned To': t.assignedTo,
        Priority: t.priority,
        'Due Date': t.dueDate,
        'Progress %': t.progress,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'tasks.xlsx');
  };

  // ─── Build hierarchy: Milestone → Drawing → Tasks ───────────────────────
  const hierarchy = useMemo(() => {
    type DrawingNode = { drawing: Drawing; tasks: Task[] };
    type MilestoneNode = { milestone: Milestone | null; drawings: DrawingNode[] };
    const nodes: MilestoneNode[] = [];

    // Each milestone: drawings that belong to it (via drawing.milestoneId)
    milestones.forEach((ms) => {
      const msDrawings = drawings.filter((d) => d.milestoneId === ms.id);
      nodes.push({
        milestone: ms,
        drawings: msDrawings.map((d) => ({
          drawing: d,
          tasks: sortTasks(tasks.filter((t) => t.drawingId === d.id && filterTask(t))),
        })),
      });
    });

    // Unassigned drawings (no milestoneId)
    const unassigned = drawings.filter((d) => !d.milestoneId);
    if (unassigned.length > 0) {
      nodes.push({
        milestone: null,
        drawings: unassigned.map((d) => ({
          drawing: d,
          tasks: sortTasks(tasks.filter((t) => t.drawingId === d.id && filterTask(t))),
        })),
      });
    }
    return nodes;
  }, [milestones, drawings, tasks, search, statusFilter, priorityFilter, sortKey, sortAsc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Milestone helpers
  const openCreateMs = () => { setEditingMs(null); setMsForm({ name: '', description: '', dueDate: '', status: 'Active' }); setShowMsModal(true); };
  const openEditMs = (ms: Milestone, e: React.MouseEvent) => { e.stopPropagation(); setEditingMs(ms); setMsForm({ name: ms.name, description: ms.description, dueDate: ms.dueDate, status: ms.status }); setShowMsModal(true); };
  const saveMilestone = async () => {
    if (!msForm.name.trim()) { toast.error('Milestone name required'); return; }
    const projectId = projects[0]?.id;
    if (!projectId) { toast.error('No project found'); return; }
    try {
      if (editingMs) { await updateMilestone(editingMs.id, msForm); toast.success('Milestone updated'); }
      else { await createMilestone({ ...msForm, projectId }); toast.success('Milestone created'); }
      setShowMsModal(false);
    } catch { toast.error('Failed to save milestone'); }
  };
  const removeMs = async (ms: Milestone, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete milestone "${ms.name}"? Drawings will be unassigned.`)) return;
    await deleteMilestone(ms.id);
    await refreshDrawings();
    toast.success('Milestone deleted');
  };

  // Drawing helpers
  const openDrawingMs = (drawing: Drawing, e: React.MouseEvent) => { e.stopPropagation(); setDrawingToAssign(drawing); setDrawingMsId(drawing.milestoneId ?? ''); setShowDrawingMs(true); };
  const saveDrawingMs = async () => {
    if (!drawingToAssign) return;
    try {
      await DrawingsAPI.update(drawingToAssign.id, { milestoneId: drawingMsId || null } as any);
      await refreshDrawings();
      toast.success('Drawing updated');
      setShowDrawingMs(false);
    } catch { toast.error('Failed to update drawing'); }
  };
  const deleteDrawing = async (drawing: Drawing, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete drawing "${drawing.name}" and all its tasks?`)) return;
    try {
      await DrawingsAPI.remove(drawing.id);
      await refreshDrawings();
      toast.success('Drawing deleted');
    } catch { toast.error('Failed to delete drawing'); }
  };

  const totalFiltered = tasks.filter(filterTask).length;

  return (
    <div className="p-7 h-full flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse 90% 55% at 15% 5%, rgba(190,24,93,0.18) 0%, transparent 60%), #09090b' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 size={20} className="text-rose-500" />
            Project Hierarchy
          </h1>
          <p className="text-sm text-rose-300/60 mt-0.5">
            {projects[0]?.name ?? 'Project'} · {milestones.length} milestones · {drawings.length} drawings · {totalFiltered} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreateMs} className="btn px-3.5 py-2.5 text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#be185d,#9f1239)', boxShadow: '0 4px 14px rgba(190,24,93,0.3)' }}>
            <Flag size={15} /> New Milestone
          </button>
          <button onClick={exportExcel} className="btn px-3.5 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800 shadow-lg">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 p-3 rounded-2xl border border-rose-900/25" style={{ background: 'rgba(20,4,8,0.7)' }}>
        <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2 flex-1 min-w-[180px] border border-zinc-800 focus-within:border-rose-700/50 transition-all">
          <Search size={15} className="text-rose-400/60 shrink-0" />
          <input
            className="flex-1 outline-none text-sm bg-transparent text-slate-200 placeholder:text-zinc-600"
            placeholder="Search grid, task, engineer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input !w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input !w-auto text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto space-y-5">
        {hierarchy.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-500 rounded-2xl border border-rose-900/20" style={{ background: 'rgba(20,4,8,0.7)' }}>
            <ClipboardList size={32} className="mb-2 text-rose-900/60" />
            <span className="text-sm">No data yet</span>
          </div>
        )}

        {hierarchy.map(({ milestone, drawings: drawingNodes }) => {
          const msId = milestone?.id ?? '__none__';
          const msCollapsed = collapsedMs.has(msId);
          const allTasks = drawingNodes.flatMap((d) => d.tasks);
          const msDone = allTasks.filter((t) => t.status === 'Completed').length;
          const msTotal = allTasks.length;
          const msStyle = milestone ? (MS_STYLE[milestone.status] ?? MS_STYLE.Active) : null;

          return (
            <div key={msId} className="rounded-2xl border border-rose-900/25 shadow-sm overflow-hidden" style={{ background: 'rgba(16,3,6,0.9)' }}>
              {/* ── MILESTONE header ── */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors"
                style={{ background: milestone ? 'linear-gradient(90deg, rgba(190,24,93,0.1) 0%, transparent 60%)' : 'linear-gradient(90deg, rgba(100,116,139,0.05) 0%, transparent 60%)' }}
                onClick={() => toggleMs(msId)}
              >
                <span className="text-slate-400">
                  {msCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                </span>
                <Flag size={14} className={milestone ? 'text-rose-500' : 'text-slate-400'} />
                <span className="font-bold text-white text-[15px] flex-1">
                  {milestone ? milestone.name : '— Unassigned Drawings —'}
                </span>
                {milestone && msStyle && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${msStyle.bg} ${msStyle.text} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${msStyle.dot}`} />
                    {milestone.status}
                  </span>
                )}
                {milestone?.dueDate && <span className="text-xs text-slate-400">Due {milestone.dueDate}</span>}
                <span className="text-xs text-zinc-500">{msDone}/{msTotal} tasks done</span>
                {msTotal > 0 && (
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(190,24,93,0.15)' }}>
                    <div className={`h-full rounded-full transition-all ${msStyle?.bar ?? 'bg-slate-400'}`} style={{ width: `${Math.round((msDone / msTotal) * 100)}%` }} />
                  </div>
                )}
                {milestone && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddTaskMsId(milestone.id); setTaskForm({ ...defaultTaskForm(), drawingId: drawings.find((d) => d.milestoneId === milestone.id)?.id ?? '' }); setShowAddTask(true); }}
                      className="flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded hover:bg-emerald-950/40 transition-colors font-semibold"
                    >
                      <Plus size={10} /> Add Task
                    </button>
                    <button onClick={(e) => openEditMs(milestone, e)} className="text-[10px] text-slate-400 hover:text-rose-400 px-2 py-0.5 rounded hover:bg-rose-950/40 transition-colors">Edit</button>
                    <button onClick={(e) => removeMs(milestone, e)} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-950/40 transition-colors">Delete</button>
                  </div>
                )}
              </div>

              {/* ── DRAWINGs ── */}
              {!msCollapsed && (
                <div className="divide-y divide-zinc-800 border-t border-zinc-800">
                  {drawingNodes.length === 0 && (
                    <p className="px-8 py-4 text-xs text-slate-400 italic">No drawings in this milestone. Upload a drawing and assign it here.</p>
                  )}

                  {drawingNodes.map(({ drawing, tasks: dTasks }) => {
                    const drawingCollapsed = collapsedDrawings.has(drawing.id);
                    const dDone = dTasks.filter((t) => t.status === 'Completed').length;

                    return (
                      <div key={drawing.id} className="bg-black/20">
                        {/* Drawing row */}
                        <div
                          className="flex items-center gap-3 pl-8 pr-5 py-3 cursor-pointer hover:bg-rose-950/20 transition-colors select-none"
                          onClick={() => toggleDrawing(drawing.id)}
                        >
                          <span className="text-slate-400">
                            {drawingCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                          </span>
                          <FileImage size={14} className="text-blue-500 shrink-0" />
                          <span className="font-semibold text-slate-200 text-sm flex-1">{drawing.name}</span>
                          {/* Grid info badge */}
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                            <LayoutGrid size={9} />
                            {drawing.gridCols}×{drawing.gridRows}
                          </span>
                          <span className="text-[10px] text-slate-400">{dDone}/{dTasks.length} done</span>
                          {dTasks.length > 0 && (
                            <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(190,24,93,0.15)' }}>
                              <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${Math.round((dDone / dTasks.length) * 100)}%` }} />
                            </div>
                          )}
                          <div className="flex items-center gap-1 ml-2">
                            {/* Location pin — green if set, slate if not */}
                            <button
                              onClick={(e) => openLocationModal(drawing, e)}
                              title={drawing.lat != null ? `Lat: ${drawing.lat}, Lng: ${drawing.lng} — click to edit` : 'Set site location'}
                              className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded transition-colors font-semibold ${drawing.lat != null ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40' : 'text-slate-500 hover:text-slate-300 hover:bg-zinc-800'}`}
                            >
                              <MapPin size={10} />
                              {drawing.lat != null ? 'Location' : 'Set Location'}
                            </button>
                            {/* Navigate button — only shown when lat/lng exist */}
                            {drawing.lat != null && drawing.lng != null && (
                              <button
                                onClick={(e) => openGoogleMaps(drawing, e)}
                                title="Open in Google Maps"
                                className="flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-950/40 transition-colors font-semibold"
                              >
                                <Navigation size={10} /> Navigate
                              </button>
                            )}
                            <button onClick={(e) => openDrawingMs(drawing, e)} className="text-[10px] text-slate-500 hover:text-rose-400 px-2 py-0.5 rounded hover:bg-rose-950/30 transition-colors">
                              {drawing.milestoneId ? 'Move' : 'Assign Milestone'}
                            </button>
                            <button onClick={(e) => deleteDrawing(drawing, e)} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-950/40 transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Task table */}
                        {!drawingCollapsed && (
                          <div className="pl-12 pr-5 pb-4">
                            {dTasks.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic py-2">No matching tasks</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr>
                                    {(['gridCode', 'name', 'status', 'assignedTo', 'priority', 'dueDate', 'progress'] as SortKey[]).map((key) => (
                                      <th
                                        key={key}
                                        onClick={() => toggleSort(key)}
                                        className="text-left px-2 py-1.5 font-semibold text-[10px] uppercase tracking-wide text-rose-400/60 cursor-pointer hover:text-rose-300 whitespace-nowrap select-none"
                                      >
                                        <span className="inline-flex items-center gap-0.5">
                                          {labelFor(key)}
                                          {sortKey === key && (sortAsc ? <ArrowUp size={9} /> : <ArrowDown size={9} />)}
                                        </span>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dTasks.map((t) => (
                                    <tr
                                      key={t.id}
                                      onClick={() => goToGrid(t)}
                                      className="hover:bg-rose-950/20 cursor-pointer transition-colors rounded"
                                    >
                                       <td className="px-2 py-1.5 font-semibold text-slate-200">
                                         <span className="flex items-center gap-1">
                                           {t.elementType === 'beam'
                                             ? <Minus size={10} className="text-amber-500" />
                                             : <LayoutGrid size={10} className="text-slate-400" />}
                                           {(() => {
                                             const labels = drawing.columnLabels ?? {};
                                             if (t.elementType === 'beam') {
                                               // Beam gridCode is like "A1" but elementId is "Beam_A1_B1"
                                               const parts = t.elementId.replace('Beam_', '').split('_');
                                               const la = labels[parts[0]] ?? parts[0];
                                               const lb = labels[parts[1]] ?? parts[1];
                                               return parts.length >= 2 ? `${la} – ${lb}` : t.gridCode;
                                             }
                                             const code = t.elementId.replace('Column_', '');
                                             return labels[code] ?? t.gridCode;
                                           })()}
                                         </span>
                                       </td>
                                      <td className="px-2 py-1.5 text-slate-300 max-w-[180px] truncate">{t.name}</td>
                                      <td className="px-2 py-1.5">
                                        <span
                                          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                          style={{ backgroundColor: `${STATUS_COLORS[t.status]}18`, color: STATUS_COLORS[t.status] }}
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[t.status] }} />
                                          {t.status}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1.5 text-slate-400">{t.assignedTo || <span className="text-zinc-600">—</span>}</td>
                                      <td className="px-2 py-1.5">
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                                      </td>
                                      <td className="px-2 py-1.5 text-slate-400 tabular-nums">{t.dueDate || <span className="text-zinc-600">—</span>}</td>
                                      <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-14 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${t.progress}%`, backgroundColor: STATUS_COLORS[t.status] }} />
                                          </div>
                                          <span className="tabular-nums text-slate-400 w-6">{t.progress}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Milestone Modal ── */}
      {showMsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div
            className="relative w-[460px] max-w-[94vw] rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(160deg, #130509 0%, #220b14 45%, #1a0a10 100%)',
              border: '1px solid rgba(216,72,110,0.3)',
              boxShadow: '0 0 0 1px rgba(216,72,110,0.08), 0 32px 64px rgba(0,0,0,0.75), 0 0 80px rgba(190,24,93,0.14)',
            }}
          >
            {/* Top gradient accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #8b0a2e, #d6486e, #fb923c, #d6486e, #8b0a2e)' }} />

            {/* Ambient glow orb */}
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-10 rounded-full"
              style={{ background: 'radial-gradient(circle, #d6486e 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

            <div className="relative p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(145deg, #d6486e 0%, #8b0a2e 100%)',
                      border: '1px solid rgba(216,72,110,0.5)',
                      boxShadow: '0 0 20px rgba(214,72,110,0.35)',
                    }}>
                    <Flag size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-extrabold text-[16px] leading-tight">
                      {editingMs ? 'Edit Milestone' : 'New Milestone'}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#e88aa5' }}>
                      {editingMs ? 'Update milestone details' : 'Track a project checkpoint'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowMsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,72,110,0.3), transparent)' }} />

              {/* Form fields */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(232,138,165,0.7)' }}>
                    Milestone Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white outline-none transition-all placeholder:font-normal"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(216,72,110,0.25)',
                      color: '#ffffff',
                    }}
                    placeholder="e.g. Foundation Works Complete"
                    value={msForm.name}
                    onChange={(e) => setMsForm({ ...msForm, name: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(190,24,93,0.15)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(232,138,165,0.7)' }}>
                    Description
                  </label>
                  <textarea
                    className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-white outline-none resize-none transition-all placeholder:font-normal"
                    rows={3}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(216,72,110,0.25)',
                      color: '#ffffff',
                    }}
                    placeholder="Brief description of what this milestone represents…"
                    value={msForm.description}
                    onChange={(e) => setMsForm({ ...msForm, description: e.target.value })}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(190,24,93,0.15)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Due Date + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(232,138,165,0.7)' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white outline-none transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(216,72,110,0.25)',
                        colorScheme: 'dark',
                      }}
                      value={msForm.dueDate}
                      onChange={(e) => setMsForm({ ...msForm, dueDate: e.target.value })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(190,24,93,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(232,138,165,0.7)' }}>
                      Status
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white outline-none transition-all appearance-none cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(216,72,110,0.25)',
                      }}
                      value={msForm.status}
                      onChange={(e) => setMsForm({ ...msForm, status: e.target.value as any })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.7)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(216,72,110,0.25)'; }}
                    >
                      {MILESTONE_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} style={{ background: '#1a0008', color: '#ffffff' }}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status colour hint chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['Active','Completed','On Hold','Cancelled'] as const).map((s) => {
                  const colors: Record<string, string> = { Active: '#f87171', Completed: '#4ade80', 'On Hold': '#fbbf24', Cancelled: '#6b7280' };
                  const selected = msForm.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setMsForm({ ...msForm, status: s })}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                      style={{
                        background: selected ? `${colors[s]}22` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selected ? colors[s] + '66' : 'rgba(255,255,255,0.1)'}`,
                        color: selected ? colors[s] : 'rgba(255,255,255,0.4)',
                        boxShadow: selected ? `0 0 10px ${colors[s]}33` : 'none',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colors[s] }} />
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,72,110,0.2), transparent)' }} />

              {/* Action buttons */}
              <div className="flex gap-2.5">
                <button
                  onClick={saveMilestone}
                  disabled={!msForm.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: msForm.name.trim()
                      ? 'linear-gradient(135deg, #d6486e 0%, #8b0a2e 60%, #5a0620 100%)'
                      : 'rgba(100,0,30,0.3)',
                    color: '#ffffff',
                    border: '1px solid rgba(216,72,110,0.4)',
                    boxShadow: msForm.name.trim() ? '0 4px 18px rgba(190,24,93,0.45), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                  }}
                  onMouseEnter={(e) => { if (msForm.name.trim()) e.currentTarget.style.filter = 'brightness(1.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
                >
                  <Flag size={14} />
                  {editingMs ? 'Update Milestone' : 'Create Milestone'}
                </button>
                <button
                  onClick={() => setShowMsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                  style={{ color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Task Modal ── */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          {/* Card */}
          <div
            className="relative w-[520px] max-w-[96vw] max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(160deg, #130509 0%, #220b14 40%, #1a0a10 100%)',
              border: '1px solid rgba(216,72,110,0.3)',
              boxShadow: '0 0 0 1px rgba(216,72,110,0.1), 0 32px 64px rgba(0,0,0,0.7), 0 0 80px rgba(190,24,93,0.12)',
            }}
          >
            {/* Top gradient accent bar */}
            <div className="h-1 w-full rounded-t-3xl flex-shrink-0"
              style={{ background: 'linear-gradient(90deg, #8b0a2e, #d6486e, #fb923c)' }} />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #d6486e, #8b0a2e)', boxShadow: '0 0 16px rgba(214,72,110,0.4)' }}>
                    <Plus size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-[16px] leading-tight">Add Task to Milestone</h2>
                    <p className="text-[10px] font-semibold text-pink-300/50 mt-0.5 uppercase tracking-widest">New task entry</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <X size={15} className="text-pink-200/70" />
                </button>
              </div>

              {/* Milestone context pill */}
              {addTaskMsId && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(139,10,46,0.2)', border: '1px solid rgba(216,72,110,0.25)' }}>
                  <Flag size={12} className="text-rose-400 shrink-0" />
                  <span className="text-[11.5px] text-pink-200/80 font-medium">
                    Milestone: <span className="font-bold text-white">{milestones.find((m) => m.id === addTaskMsId)?.name}</span>
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="h-px" style={{ background: 'rgba(216,72,110,0.15)' }} />

              {/* Form fields */}
              <div className="space-y-4">
                {/* Drawing */}
                <div>
                  <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Drawing *</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                    value={taskForm.drawingId}
                    onChange={(e) => setTaskForm({ ...taskForm, drawingId: e.target.value })}
                  >
                    <option value="">— Select drawing —</option>
                    {drawings
                      .filter((d) => addTaskMsId ? d.milestoneId === addTaskMsId : true)
                      .map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                    }
                  </select>
                </div>

                {/* Task name */}
                <div>
                  <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Task Name *</label>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white placeholder:text-white/25 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="e.g. Reinforcement Inspection"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white placeholder:text-white/25 outline-none resize-none min-h-[72px] transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="Optional details…"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                {/* Grid: Status + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Status</label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as Task['status'] })}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Priority</label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}
                    >
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Category</label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                      value={taskForm.category}
                      onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    >
                      {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Assigned To</label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white placeholder:text-white/25 outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="Engineer name"
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">Due Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-pink-300/60 uppercase tracking-widest mb-1.5">
                      Progress
                      <span className="ml-1 text-white font-black">{taskForm.progress}%</span>
                    </label>
                    <div className="relative pt-1">
                      <input
                        type="range" min={0} max={100} step={5}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: '#d6486e' }}
                        value={taskForm.progress}
                        onChange={(e) => setTaskForm({ ...taskForm, progress: Number(e.target.value) })}
                      />
                      {/* Custom track fill */}
                      <div className="h-1.5 rounded-full -mt-1.5 pointer-events-none absolute top-1 left-0 right-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${taskForm.progress}%`, background: 'linear-gradient(90deg, #8b0a2e, #d6486e)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'rgba(216,72,110,0.15)' }} />

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  disabled={savingTask}
                  onClick={async () => {
                    if (!taskForm.name.trim()) { toast.error('Task name required'); return; }
                    if (!taskForm.drawingId) { toast.error('Please select a drawing'); return; }
                    setSavingTask(true);
                    try {
                      await createTask({
                        drawingId: taskForm.drawingId,
                        milestoneId: addTaskMsId,
                        name: taskForm.name,
                        description: taskForm.description,
                        status: taskForm.status,
                        priority: taskForm.priority,
                        category: taskForm.category,
                        assignedTo: taskForm.assignedTo,
                        dueDate: taskForm.dueDate,
                        progress: taskForm.progress,
                        gridCode: 'TBD',
                        elementType: 'column',
                        elementId: `manual-${Date.now()}`,
                      });
                      await refreshTasks();
                      toast.success('Task added');
                      setShowAddTask(false);
                      setTaskForm(defaultTaskForm());
                    } catch {
                      toast.error('Failed to add task');
                    } finally {
                      setSavingTask(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #d6486e, #8b0a2e)',
                    boxShadow: '0 4px 16px rgba(214,72,110,0.35)',
                  }}
                  onMouseEnter={(e) => !savingTask && (e.currentTarget.style.boxShadow = '0 4px 24px rgba(214,72,110,0.55)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(214,72,110,0.35)')}
                >
                  <Plus size={15} /> {savingTask ? 'Saving…' : 'Add Task'}
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-5 py-3 rounded-xl font-semibold text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Location Modal ── */}
      {showLocationModal && locationDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[380px] max-w-[90vw] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-500" />
                <span className="font-bold text-slate-800 text-lg">Set Site Location</span>
              </div>
              <button onClick={() => setShowLocationModal(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>
            <p className="text-sm text-slate-600">Drawing: <strong>{locationDrawing.name}</strong></p>
            <p className="text-[11px] text-slate-400">
              Enter the GPS coordinates for this drawing's site location. Once saved, the <strong>Navigate</strong> button will open Google Maps directly to the construction site.
            </p>
            <button
              disabled={locatingMe}
              onClick={useMyLocation}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
            >
              <Crosshair size={12} /> {locatingMe ? 'Locating…' : 'Use my location'}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Latitude</span>
                <input
                  className="input w-full"
                  placeholder="e.g. 28.6139"
                  value={locLat}
                  onChange={(e) => setLocLat(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Longitude</span>
                <input
                  className="input w-full"
                  placeholder="e.g. 77.2090"
                  value={locLng}
                  onChange={(e) => setLocLng(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            {/* Quick preview link if both filled */}
            {locLat.trim() && locLng.trim() && !isNaN(parseFloat(locLat)) && !isNaN(parseFloat(locLng)) && (
              <a
                href={`https://www.google.com/maps?q=${locLat},${locLng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:underline"
              >
                <Navigation size={11} /> Preview on Google Maps
              </a>
            )}
            {/* Clear location */}
            {locationDrawing.lat != null && (
              <button
                onClick={async () => {
                  setSavingLoc(true);
                  try {
                    await DrawingsAPI.update(locationDrawing.id, { lat: null, lng: null } as any);
                    await refreshDrawings();
                    toast.success('Location cleared');
                    setShowLocationModal(false);
                  } catch { toast.error('Failed to clear location'); }
                  finally { setSavingLoc(false); }
                }}
                className="text-[11px] text-red-400 hover:text-red-600 hover:underline"
              >
                Clear location
              </button>
            )}
            <div className="flex gap-2 pt-1">
              <button
                disabled={savingLoc}
                onClick={saveLocation}
                className="btn btn-primary flex-1 py-2.5 disabled:opacity-60"
              >
                <MapPin size={15} /> {savingLoc ? 'Saving…' : 'Save Location'}
              </button>
              <button onClick={() => setShowLocationModal(false)} className="btn btn-ghost px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Drawing to Milestone Modal ── */}
      {showDrawingMs && drawingToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] max-w-[90vw] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage size={16} className="text-blue-500" />
                <span className="font-bold text-slate-800">Assign to Milestone</span>
              </div>
              <button onClick={() => setShowDrawingMs(false)} className="icon-btn w-8 h-8"><X size={16} /></button>
            </div>
            <p className="text-sm text-slate-600">Drawing: <strong>{drawingToAssign.name}</strong></p>
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Milestone</span>
              <select className="input w-full" value={drawingMsId} onChange={(e) => setDrawingMsId(e.target.value)}>
                <option value="">— None (Unassigned) —</option>
                {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button onClick={saveDrawingMs} className="btn btn-primary flex-1 py-2.5">
                <FileImage size={15} /> Save
              </button>
              <button onClick={() => setShowDrawingMs(false)} className="btn btn-ghost px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function labelFor(key: SortKey) {
  switch (key) {
    case 'gridCode': return 'Grid';
    case 'name': return 'Task';
    case 'assignedTo': return 'Assignee';
    case 'dueDate': return 'Due';
    default: return key.charAt(0).toUpperCase() + key.slice(1);
  }
}
