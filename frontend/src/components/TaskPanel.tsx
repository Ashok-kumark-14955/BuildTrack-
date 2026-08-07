import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Save, Plus, MessageSquare, Send, LayoutGrid, Minus, Flag, Camera, Image as ImageIcon, MapPin, Navigation, Crosshair, Pencil, Check } from 'lucide-react';
import { useApp } from '../AppContext';
import { TasksAPI, DrawingsAPI, GeocodeAPI } from '../api';
import { fileToDataUrl, resolveFileUrl } from '../utils/imageStorage';
import {
  CATEGORY_OPTIONS, CONSTRUCTION_STAGE_SUGGESTIONS, BEAM_STAGE_SUGGESTIONS, PRIORITY_OPTIONS, STATUS_COLORS, STATUS_OPTIONS,
  type Comment, type ElementType, type Task, type TaskPriority, type TaskStatus,
} from '../types';
import toast from 'react-hot-toast';

// Parse the human-readable label and element type out of an elementId.
// Accepts an optional columnLabels map to resolve custom display labels.
function describeElement(
  elementId: string,
  columnLabels: Record<string, string> = {}
): { type: ElementType; label: string; rawCode: string } {
  if (elementId.startsWith('Beam_')) {
    const parts = elementId.replace('Beam_', '').split('_');
    const [a, b] = parts;
    const labelA = columnLabels[a] ?? a;
    const labelB = columnLabels[b] ?? b;
    return { type: 'beam', label: `${labelA} – ${labelB}`, rawCode: `${a} – ${b}` };
  }
  const code = elementId.replace('Column_', '');
  return { type: 'column', label: columnLabels[code] ?? code, rawCode: code };
}

const emptyForm: {
  name: string;
  description: string;
  category: string;
  priority: TaskPriority;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  progress: number;
  milestoneId: string | null;
} = {
  name: '',
  description: '',
  category: CATEGORY_OPTIONS[0],
  priority: 'Medium',
  assignedTo: '',
  startDate: '',
  dueDate: '',
  status: 'Assigned',
  progress: 0,
  milestoneId: null,
};

export default function TaskPanel() {
  const {
    selectedElementId, setSelectedElementId,
    tasksForCurrentDrawing, currentDrawingId,
    createTask, updateTask, deleteTask,
    milestones, drawings, refreshDrawings,
    currentDrawing: ctxCurrentDrawing,
    patchDrawingColumnLabel,
    patchDrawingElementTypeLabel,
  } = useApp();

  // Resolve custom label: for columns look up columnLabels on the current drawing
  const columnLabels = ctxCurrentDrawing?.columnLabels ?? {};
  const elementTypeLabels = ctxCurrentDrawing?.elementTypeLabels ?? {};

  // ── Column ID rename state ──
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Match tasks to the selected canvas element.
  // selectedElementId is "Column_A1" or "Beam_A1_B1".
  // Tasks store their location in gridCode (e.g. "A1") — not by the canvas element ID.
  // We derive the raw grid code from the canvas element ID to perform the lookup.
  const elementTasks = selectedElementId
    ? tasksForCurrentDrawing.filter((t) => {
        if (selectedElementId.startsWith('Column_')) {
          const code = selectedElementId.replace('Column_', '');
          return t.gridCode === code || t.elementId === selectedElementId || t.elementId === code;
        }
        // For beams, fall back to elementId match
        return t.elementId === selectedElementId;
      })
    : [];
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Site location for the current drawing
  const currentDrawing = drawings.find((d) => d.id === currentDrawingId) ?? null;
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Sync location fields when the drawing changes
  useEffect(() => {
    setLocLat(currentDrawing?.lat != null ? String(currentDrawing.lat) : '');
    setLocLng(currentDrawing?.lng != null ? String(currentDrawing.lng) : '');
  }, [currentDrawingId, currentDrawing?.lat, currentDrawing?.lng]);

  // Reverse-geocode the saved coordinates into a human-readable address
  useEffect(() => {
    if (currentDrawing?.lat == null || currentDrawing?.lng == null) { setAddress(null); return; }
    let cancelled = false;
    setLoadingAddress(true);
    GeocodeAPI.reverse(currentDrawing.lat, currentDrawing.lng)
      .then((name) => { if (!cancelled) setAddress(name); })
      .catch(() => { if (!cancelled) setAddress(null); })
      .finally(() => { if (!cancelled) setLoadingAddress(false); });
    return () => { cancelled = true; };
  }, [currentDrawing?.lat, currentDrawing?.lng]);

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

  const saveLocation = async () => {
    if (!currentDrawingId) return;
    const lat = locLat.trim() ? parseFloat(locLat) : null;
    const lng = locLng.trim() ? parseFloat(locLng) : null;
    if ((locLat.trim() && isNaN(lat!)) || (locLng.trim() && isNaN(lng!))) {
      toast.error('Invalid coordinates'); return;
    }
    setSavingLoc(true);
    try {
      await DrawingsAPI.update(currentDrawingId, { lat, lng } as any);
      await refreshDrawings();
      toast.success('Location saved');
    } catch { toast.error('Failed to save location'); }
    finally { setSavingLoc(false); }
  };

  useEffect(() => {
    setActiveTaskId(null);
    setMode(elementTasks.length === 0 ? 'edit' : 'list');
    setForm(emptyForm);
  }, [selectedElementId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeTaskId) { setComments([]); return; }
    TasksAPI.comments(activeTaskId).then(setComments).catch(() => {});
  }, [activeTaskId]);

  // Close rename mode when element changes
  useEffect(() => {
    setRenaming(false);
  }, [selectedElementId]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renaming) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renaming]);

  if (!selectedElementId) return null;

  const { type: elementType, label: elementLabel, rawCode } = describeElement(selectedElementId, columnLabels);
  const isBeam = elementType === 'beam';
  const stageSuggestions = isBeam ? BEAM_STAGE_SUGGESTIONS : CONSTRUCTION_STAGE_SUGGESTIONS;

  // For columns: code is the single grid code (e.g. "A1")
  // For beams: we parse both endpoints so each can be renamed
  const beamCodes = isBeam
    ? selectedElementId.replace('Beam_', '').split('_') // ["A1", "B1"]
    : [];

  const startRename = () => {
    setRenameValue(elementLabel);
    setRenaming(true);
  };

  const commitRename = async () => {
    if (!currentDrawingId) return;
    const trimmed = renameValue.trim();
    setSavingRename(true);
    try {
      if (!isBeam) {
        // Column rename
        const code = selectedElementId.replace('Column_', '');
        await patchDrawingColumnLabel(currentDrawingId, code, trimmed);
      } else {
        // For a beam header rename we don't rename individual endpoints here.
        // The user renames each column separately via the column panel.
        // So this branch shouldn't be reached, but handle gracefully.
      }
      toast.success('Renamed successfully');
      setRenaming(false);
    } catch {
      toast.error('Failed to rename');
    } finally {
      setSavingRename(false);
    }
  };

  const cancelRename = () => setRenaming(false);

  const openTask = (task: Task) => {
    setActiveTaskId(task.id);
    setForm({
      name: task.name,
      description: task.description,
      category: task.category,
      priority: task.priority,
      assignedTo: task.assignedTo,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: task.status,
      progress: task.progress,
      milestoneId: task.milestoneId ?? null,
    });
    setMode('edit');
  };

  const startNew = () => {
    setActiveTaskId(null);
    setForm(emptyForm);
    setMode('edit');
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Task name is required'); return; }
    if (!currentDrawingId || !selectedElementId) return;
    try {
      if (activeTaskId) {
        await updateTask(activeTaskId, { ...form, milestoneId: form.milestoneId || null });
        toast.success('Task updated');
      } else {
        const created = await createTask({
          ...form,
          milestoneId: form.milestoneId || null,
          drawingId: currentDrawingId,
          elementType,
          elementId: selectedElementId,
          // gridCode must be the raw canvas code (e.g. "A1"), not the display label,
          // so that statusByElement and elementTasks can match by gridCode.
          gridCode: rawCode,
        });
        setActiveTaskId(created.id);
        toast.success('Task created');
      }
      setMode('list');
    } catch {
      toast.error('Failed to save task');
    }
  };

  const remove = async () => {
    if (!activeTaskId) return;
    await deleteTask(activeTaskId);
    toast.success('Task deleted');
    setActiveTaskId(null);
    setMode(elementTasks.length <= 1 ? 'edit' : 'list');
  };

  const postComment = async () => {
    if (!activeTaskId || !commentText.trim()) return;
    const c = await TasksAPI.addComment(activeTaskId, { author: 'You', message: commentText });
    setComments((prev) => [...prev, c]);
    setCommentText('');
  };

  const uploadPhoto = async (file: File) => {
    if (!activeTaskId) return;
    setUploadingPhoto(true);
    try {
      // Convert photo to base64 data URL and store it directly in the backend DB.
      // This ensures photos are visible on any device/browser without IndexedDB.
      const dataUrl = await fileToDataUrl(file);
      const c = await TasksAPI.addComment(activeTaskId, {
        author: 'You',
        message: commentText,
        photoUrl: dataUrl,
      });
      setComments((prev) => [...prev, c]);
      setCommentText('');
      toast.success('Photo added');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const activeMilestone = milestones.find((m) => m.id === form.milestoneId);

  return (
      <div className="w-full h-full flex flex-col shadow-elevated overflow-hidden" style={{ background: 'linear-gradient(180deg, #0e0408 0%, #110508 50%, #0a0306 100%)', borderLeft: '1px solid rgba(159,18,57,0.5)', borderRadius: '18px 0 0 18px' }}>
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{
          background: isBeam
            ? 'linear-gradient(135deg, rgba(70,25,2,1) 0%, rgba(30,8,0,1) 100%)'
            : 'linear-gradient(135deg, rgba(80,4,24,1) 0%, rgba(30,1,10,1) 100%)',
          borderBottomColor: isBeam ? 'rgba(245,158,11,0.35)' : 'rgba(244,63,94,0.35)',
          borderRadius: '18px 0 0 0',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
              style={{
                background: isBeam
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(120,53,15,0.4))'
                  : 'linear-gradient(135deg, rgba(244,63,94,0.35), rgba(76,5,25,0.4))',
                borderColor: isBeam ? 'rgba(245,158,11,0.5)' : 'rgba(244,63,94,0.5)',
                boxShadow: isBeam ? '0 0 12px rgba(245,158,11,0.35)' : '0 0 12px rgba(244,63,94,0.35)',
              }}
            >
              {isBeam ? <Minus size={16} className="text-amber-300" /> : <LayoutGrid size={16} className="text-rose-300" />}
            </div>
            <div className="flex-1 min-w-0">
              {/* Element type label — editable (e.g. "Column" → "Anchor Bolt") */}
              {currentDrawingId && (
                <ElementTypeLabelEditor
                  elementKey={elementType}
                  defaultLabel={isBeam ? 'Beam' : 'Column'}
                  currentLabel={elementTypeLabels[elementType] ?? (isBeam ? 'Beam' : 'Column')}
                  color={isBeam ? 'rgba(253,230,138,0.85)' : 'rgba(251,207,232,0.85)'}
                  drawingId={currentDrawingId}
                  onSave={patchDrawingElementTypeLabel}
                />
              )}
              {!currentDrawingId && (
                <span className="text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: isBeam ? 'rgba(253,230,138,0.85)' : 'rgba(251,207,232,0.85)' }}>
                  {isBeam ? 'Beam' : 'Column'}
                </span>
              )}

              {/* Inline rename for columns */}
              {!isBeam && renaming ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') cancelRename();
                    }}
                    className="flex-1 min-w-0 bg-black/40 border border-rose-700/60 rounded-lg px-2 py-1 text-white text-sm font-bold outline-none focus:border-rose-500"
                    placeholder={rawCode}
                  />
                  <button
                    onClick={commitRename}
                    disabled={savingRename}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/40 disabled:opacity-60 transition-colors"
                    title="Save"
                  >
                    <Check size={13} className="text-emerald-400" />
                  </button>
                  <button
                    onClick={cancelRename}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="Cancel"
                  >
                    <X size={13} className="text-slate-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className="text-lg font-bold font-display leading-tight bg-clip-text text-transparent truncate"
                    style={{
                      backgroundImage: isBeam
                        ? 'linear-gradient(90deg, #fff, #fcd34d)'
                        : 'linear-gradient(90deg, #fff, #fb7185)',
                    }}
                  >
                    {elementLabel}
                  </div>
                  {!isBeam && (
                    <button
                      onClick={startRename}
                      title="Rename column"
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors shrink-0"
                    >
                      <Pencil size={11} className="text-slate-500 hover:text-slate-300" />
                    </button>
                  )}
                </div>
              )}

              {elementLabel !== rawCode && !renaming && (
                <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">{rawCode}</div>
              )}
            </div>
          </div>
          <button onClick={() => setSelectedElementId(null)} className="icon-btn w-8 h-8 shrink-0">
            <X size={17} />
          </button>
        </div>

        {/* Beam endpoint rename rows */}
        {isBeam && beamCodes.length === 2 && (
          <div className="mt-3 space-y-1.5">
            {beamCodes.map((code) => {
              const currentLabel = columnLabels[code] ?? code;
              return (
                <BeamEndpointRenamer
                  key={code}
                  code={code}
                  label={currentLabel}
                  drawingId={currentDrawingId!}
                  onRename={patchDrawingColumnLabel}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Task list */}
      {mode === 'list' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {elementTasks.map((t) => {
            const ms = milestones.find((m) => m.id === t.milestoneId);
            return (
              <button
                key={t.id}
                onClick={() => openTask(t)}
                className="w-full text-left p-3.5 rounded-lg border hover:shadow-card-hover transition-all"
                style={{ background: 'linear-gradient(135deg, rgba(80,4,24,0.98) 0%, rgba(4,0,2,1) 100%)', border: '1.5px solid rgba(159,18,57,0.5)' }}
              >
                {ms && (
                  <div className="flex items-center gap-1 mb-1.5">
                    <Flag size={10} className="text-rose-500" />
                    <span className="text-[10px] font-semibold text-rose-400 truncate">{ms.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white text-sm">{t.name}</span>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${STATUS_COLORS[t.status]}18`, color: STATUS_COLORS[t.status] }}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <span>{t.assignedTo || 'Unassigned'}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="tabular-nums">{t.progress}%</span>
                </div>
              </button>
            );
          })}
          <button
            onClick={startNew}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-rose-900/40 text-slate-500 hover:border-rose-700/50 hover:text-rose-400 hover:bg-rose-950/20 transition-all text-sm font-medium"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      )}

      {/* Task edit form */}
      {mode === 'edit' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Milestone badge */}
          {activeMilestone && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-800/40" style={{ background: 'rgba(190,24,93,0.1)' }}>
              <Flag size={12} className="text-rose-500 shrink-0" />
              <span className="text-xs font-semibold text-rose-300 truncate">Milestone: {activeMilestone.name}</span>
            </div>
          )}

          <Field label="Milestone">
            <select
              className="input"
              value={form.milestoneId ?? ''}
              onChange={(e) => setForm({ ...form, milestoneId: e.target.value || null })}
            >
              <option value="">— None —</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Task Name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Reinforcement"
            />
            {!activeTaskId && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stageSuggestions.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setForm({ ...form, name: stage })}
                    className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${
                      form.name === stage
                        ? 'border-rose-700 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-slate-400 hover:border-rose-700/50 hover:text-rose-400'
                    }`}
                    style={form.name === stage ? { background: 'linear-gradient(135deg,#be185d,#9f1239)' } : {}}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Description">
            <textarea
              className="input min-h-20 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })}>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Assigned Engineer">
            <input className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} placeholder="Engineer or crew name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="End Date">
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 items-start">
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label={`Progress · ${form.progress}%`}>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full accent-blue-600 mt-2.5"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
              />
            </Field>
          </div>

          {/* ── Site Location ── */}
          <div className="rounded-xl border border-rose-900/35 p-3.5 space-y-2.5" style={{ background: 'rgba(50,10,22,0.6)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                <MapPin size={12} className={currentDrawing?.lat != null ? 'text-emerald-500' : 'text-slate-400'} />
                Site Location
                {currentDrawing?.lat != null && (
                  <span className="ml-1 text-[10px] font-semibold text-emerald-600 normal-case tracking-normal">
                    {currentDrawing.lat.toFixed(5)}, {currentDrawing.lng?.toFixed(5)}
                  </span>
                )}
              </div>
              {currentDrawing?.lat != null && currentDrawing.lng != null && (
                <a
                  href={`https://www.google.com/maps?q=${currentDrawing.lat},${currentDrawing.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Navigation size={10} /> Navigate
                </a>
              )}
            </div>
            {currentDrawing?.lat != null && (
              <div className="text-[11px] text-slate-400 leading-snug">
                {loadingAddress ? 'Resolving address…' : address ?? 'Address unavailable'}
              </div>
            )}
            <button
              disabled={locatingMe}
              onClick={useMyLocation}
              className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-blue-800/40 text-blue-400 hover:bg-blue-950/40 transition-colors disabled:opacity-60"
              style={{ background: 'rgba(30,58,138,0.15)' }}
            >
              <Crosshair size={11} /> {locatingMe ? 'Locating…' : 'Use my location'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Latitude</span>
                <input
                  className="input text-sm"
                  placeholder="e.g. 28.6139"
                  value={locLat}
                  inputMode="decimal"
                  onChange={(e) => setLocLat(e.target.value)}
                />
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Longitude</span>
                <input
                  className="input text-sm"
                  placeholder="e.g. 77.2090"
                  value={locLng}
                  inputMode="decimal"
                  onChange={(e) => setLocLng(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={savingLoc}
                onClick={saveLocation}
                className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/40 transition-colors disabled:opacity-60"
                style={{ background: 'rgba(6,78,59,0.2)' }}
              >
                <MapPin size={11} /> {savingLoc ? 'Saving…' : 'Save Location'}
              </button>
              {currentDrawing?.lat != null && (
                <button
                  onClick={async () => {
                    setSavingLoc(true);
                    try {
                      await DrawingsAPI.update(currentDrawingId!, { lat: null, lng: null } as any);
                      await refreshDrawings();
                      setLocLat(''); setLocLng('');
                      toast.success('Location cleared');
                    } catch { toast.error('Failed to clear'); }
                    finally { setSavingLoc(false); }
                  }}
                  className="text-[11px] text-red-400 hover:text-red-600 hover:underline"
                >
                  Clear
                </button>
              )}
              {locLat.trim() && locLng.trim() && !isNaN(parseFloat(locLat)) && !isNaN(parseFloat(locLng)) && (
                <a
                  href={`https://www.google.com/maps?q=${locLat},${locLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-500 hover:underline ml-auto"
                >
                  <Navigation size={10} /> Preview
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={save} className="btn btn-primary flex-1 py-2.5">
              <Save size={16} /> {activeTaskId ? 'Update Task' : 'Save Task'}
            </button>
            {activeTaskId && (
              <button onClick={remove} className="btn bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-900/40 w-11 h-11">
                <Trash2 size={16} />
              </button>
            )}
            {elementTasks.length > 0 && (
              <button onClick={() => setMode('list')} className="btn btn-ghost px-3 py-2.5">
                Back
              </button>
            )}
          </div>

          {activeTaskId && (
            <div className="pt-5 border-t border-zinc-800 mt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
                <MessageSquare size={15} /> Comments & Timeline
              </div>
              <div className="space-y-2.5 max-h-52 overflow-y-auto mb-3 pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="group relative text-sm bg-zinc-900 rounded-lg p-2.5 border border-zinc-800">
                    <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                      <span className="font-medium text-slate-400">{c.author}</span>
                      <div className="flex items-center gap-1.5">
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                        <button
                          title="Delete comment"
                          onClick={async () => {
                            if (!activeTaskId) return;
                            if (!window.confirm('Delete this comment?')) return;
                            try {
                              await TasksAPI.deleteComment(activeTaskId, c.id);
                              setComments((prev) => prev.filter((x) => x.id !== c.id));
                              toast.success('Comment deleted', { duration: 1500 });
                            } catch {
                              toast.error('Failed to delete comment');
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded transition-all hover:bg-red-900/40"
                          style={{ color: 'rgba(248,113,113,0.7)' }}
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </div>
                    {c.message && <div className="text-slate-200">{c.message}</div>}
                    {c.photoUrl && (
                      <div className="relative mt-2 group/photo">
                        <ResolvedPhoto photoUrl={c.photoUrl} />
                        <button
                          title="Delete photo"
                          onClick={async (e) => {
                            e.preventDefault();
                            if (!activeTaskId) return;
                            if (!window.confirm('Delete this photo?')) return;
                            try {
                              await TasksAPI.deleteComment(activeTaskId, c.id);
                              setComments((prev) => prev.filter((x) => x.id !== c.id));
                              toast.success('Photo deleted', { duration: 1500 });
                            } catch {
                              toast.error('Failed to delete photo');
                            }
                          }}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover/photo:opacity-100 w-6 h-6 flex items-center justify-center rounded-md transition-all"
                          style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: '1px solid rgba(248,113,113,0.4)' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {comments.length === 0 && <div className="text-xs text-zinc-600 text-center py-2">No comments yet</div>}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
              />
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Add a comment or completion note…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="btn btn-secondary w-10 shrink-0"
                  title="Attach a photo"
                >
                  {uploadingPhoto ? <ImageIcon size={15} className="animate-pulse" /> : <Camera size={15} />}
                </button>
                <button onClick={postComment} className="btn btn-secondary w-10 shrink-0">
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Async image component that resolves idb:// URLs from IndexedDB before rendering. */
function ResolvedPhoto({ photoUrl }: { photoUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveFileUrl(photoUrl).then((resolved) => {
      if (!cancelled) setSrc(resolved);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [photoUrl]);

  if (!src) return <div className="rounded-lg border border-slate-700 h-10 bg-zinc-900 animate-pulse" />;

  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      <img src={src} alt="Site photo" className="rounded-lg border border-slate-200 max-h-40 object-cover" />
    </a>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/** Editable type label badge — e.g. "Column" → "Anchor Bolt", "Beam" → "Rafter" */
function ElementTypeLabelEditor({
  elementKey,
  defaultLabel,
  currentLabel,
  color,
  drawingId,
  onSave,
}: {
  elementKey: string;
  defaultLabel: string;
  currentLabel: string;
  color: string;
  drawingId: string;
  onSave: (drawingId: string, elementType: string, label: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentLabel);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setValue(currentLabel); }, [currentLabel, editing]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.select(), 40); }, [editing]);

  const commit = async () => {
    if (!drawingId) { toast.error('No drawing selected'); return; }
    const trimmed = value.trim();
    if (!trimmed) { toast.error('Label cannot be empty'); return; }
    setSaving(true);
    try {
      await onSave(drawingId, elementKey, trimmed);
      toast.success(`Renamed to "${trimmed}"`);
      setEditing(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Failed to rename';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-0.5 mb-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setEditing(false); setValue(currentLabel); }
          }}
          className="flex-1 min-w-0 bg-black/40 rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider outline-none"
          style={{ border: `1px solid ${color.replace('0.85', '0.6')}`, color }}
          placeholder={defaultLabel}
        />
        <button
          onClick={commit}
          disabled={saving}
          className="w-5 h-5 flex items-center justify-center rounded bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/30 disabled:opacity-60"
          title="Save"
        >
          <Check size={10} className="text-emerald-400" />
        </button>
        <button
          onClick={() => { setEditing(false); setValue(currentLabel); }}
          className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 border border-white/10"
          title="Cancel"
        >
          <X size={10} className="text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(currentLabel); setEditing(true); }}
      className="group flex items-center gap-1 leading-none mb-0.5 hover:opacity-80 transition-opacity"
      title={`Rename ${defaultLabel} type (e.g. "${defaultLabel}" → "Anchor Bolt")`}
    >
      <span className="text-[10.5px] uppercase tracking-wider font-semibold" style={{ color }}>
        {currentLabel}
      </span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color }} />
    </button>
  );
}

/** Inline renamer for a single beam endpoint column */
function BeamEndpointRenamer({
  code,
  label,
  drawingId,
  onRename,
}: {
  code: string;
  label: string;
  drawingId: string;
  onRename: (drawingId: string, code: string, label: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync label when parent updates
  useEffect(() => { if (!editing) setValue(label); }, [label, editing]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 40); }, [editing]);

  const commit = async () => {
    setSaving(true);
    try {
      await onRename(drawingId, code, value.trim());
      toast.success(`Column ${code} renamed`);
      setEditing(false);
    } catch {
      toast.error('Failed to rename');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
      <span className="text-[9.5px] font-bold text-amber-500/70 uppercase tracking-wider w-6 shrink-0">{code}</span>
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setEditing(false); setValue(label); }
            }}
            className="flex-1 min-w-0 bg-black/40 border border-amber-600/50 rounded px-1.5 py-0.5 text-white text-[12px] font-semibold outline-none focus:border-amber-400"
            placeholder={code}
          />
          <button
            onClick={commit}
            disabled={saving}
            className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-600/30 disabled:opacity-60"
            title="Save"
          >
            <Check size={11} className="text-emerald-400" />
          </button>
          <button
            onClick={() => { setEditing(false); setValue(label); }}
            className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 border border-white/10"
            title="Cancel"
          >
            <X size={11} className="text-slate-400" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-[12px] font-semibold text-white truncate">{label}</span>
          <button
            onClick={() => { setValue(label); setEditing(true); }}
            title={`Rename column ${code}`}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
          >
            <Pencil size={10} className="text-amber-500/60 hover:text-amber-400" />
          </button>
        </>
      )}
    </div>
  );
}
