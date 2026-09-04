import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Save, Plus, MessageSquare, Send, LayoutGrid, Minus, Flag, Camera, Image as ImageIcon, MapPin, Navigation, Crosshair, Pencil, Check, Users, HardHat } from 'lucide-react';
import { useApp } from '../AppContext';
import { TasksAPI, DrawingsAPI, GeocodeAPI, CustomModulesAPI } from '../api';
import { fileToDataUrl, resolveFileUrl } from '../utils/imageStorage';
import { useWeatherForecast } from '../utils/useWeatherForecast';
import { getTaskWeatherRisk } from '../utils/weather';
import WeatherRiskBadge from './WeatherRiskBadge';
import {
  CATEGORY_OPTIONS, CONSTRUCTION_STAGE_SUGGESTIONS, BEAM_STAGE_SUGGESTIONS, PRIORITY_OPTIONS, STATUS_COLORS, STATUS_OPTIONS,
  type Comment, type ElementType, type Task, type TaskPriority, type TaskStatus,
} from '../types';
import toast from 'react-hot-toast';

// ── Work Types ────────────────────────────────────────────────────────────────
// Work Types exactly match the Training Type options in 🦺 Safety Training module
export const WORK_TYPES = [
  'Working at Height Safety',
  'Confined Space Entry',
  'Electrical Safety',
  'Fire Safety & Evacuation',
  'First Aid & CPR',
  'Excavation & Trenching Safety',
  'Scaffolding Safety',
  'Lifting & Rigging Safety',
  'Chemical Handling & HAZMAT',
  'PPE Awareness',
  'Manual Handling & Ergonomics',
  'Hot Work Safety',
];

// ── Work Type → Required Training mapping ────────────────────────────────────
// Each work type directly maps to itself since work types == training types
const WORK_TYPE_TRAINING: Record<string, string[]> = {
  'Working at Height Safety':     ['Working at Height Safety'],
  'Confined Space Entry':         ['Confined Space Entry'],
  'Electrical Safety':            ['Electrical Safety'],
  'Fire Safety & Evacuation':     ['Fire Safety & Evacuation'],
  'First Aid & CPR':              ['First Aid & CPR'],
  'Excavation & Trenching Safety':['Excavation & Trenching Safety'],
  'Scaffolding Safety':           ['Scaffolding Safety'],
  'Lifting & Rigging Safety':     ['Lifting & Rigging Safety'],
  'Chemical Handling & HAZMAT':   ['Chemical Handling & HAZMAT'],
  'PPE Awareness':                ['PPE Awareness'],
  'Manual Handling & Ergonomics': ['Manual Handling & Ergonomics'],
  'Hot Work Safety':              ['Hot Work Safety'],
};

// ── Training Status helpers ───────────────────────────────────────────────────
type ComplianceStatus = 'valid' | 'expiring' | 'not_completed' | 'expired' | 'missing';

interface WorkerCompliance {
  worker: string;
  requiredTrainings: string[];
  statuses: { training: string; status: ComplianceStatus; expiryDate?: string }[];
  eligible: boolean;
}

function getComplianceStatus(trainingRecord: Record<string, any> | undefined, trainingStatusVal: string, expiryDateVal: string): ComplianceStatus {
  if (!trainingRecord) return 'missing';
  const status = (trainingStatusVal || '').toLowerCase();
  if (status === 'expired') return 'expired';
  if (status === 'completed') {
    if (!expiryDateVal) return 'valid';
    const expiry = new Date(expiryDateVal);
    const now = new Date();
    if (expiry < now) return 'expired';
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    if (expiry <= thirtyDays) return 'expiring';
    return 'valid';
  }
  if (['in progress', 'scheduled', 'pending'].includes(status)) return 'not_completed';
  return 'missing';
}

const COMPLIANCE_CONFIG: Record<ComplianceStatus, { label: string; icon: string; color: string; bg: string; border: string }> = {
  valid:         { label: 'Completed & Valid',  icon: '🟢', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  expiring:      { label: 'Expiring Soon',       icon: '🟡', color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.25)' },
  not_completed: { label: 'Not Completed',       icon: '🟠', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  expired:       { label: 'Expired',             icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
  missing:       { label: 'Not Found',           icon: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

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
  workType: string;
  workersInvolved: string[];
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
  workType: '',
  workersInvolved: [],
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
    activeProjectId,
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
  const forecast = useWeatherForecast(currentDrawing?.lat, currentDrawing?.lng);
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // ── Worker Compliance state ──
  const [availableWorkers, setAvailableWorkers] = useState<string[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [complianceResults, setComplianceResults] = useState<WorkerCompliance[]>([]);
  const [checkingCompliance, setCheckingCompliance] = useState(false);

  // ── Load workers from Site Entry module when form is open ──
  useEffect(() => {
    if (!activeProjectId || mode !== 'edit') return;
    let cancelled = false;
    setLoadingWorkers(true);
    CustomModulesAPI.list(activeProjectId)
      .then(async (modules) => {
        const siteEntryModule = modules.find((m: any) => m.name === '🚧 Site Entry');
        if (!siteEntryModule) return;
        const records = await CustomModulesAPI.listRecords(activeProjectId, siteEntryModule.id);
        const workerField = siteEntryModule.fields.find((f: any) => f.label === 'Worker');
        if (!workerField) return;
        const names = [...new Set(records.map((r: any) => r.data[workerField.id]).filter(Boolean))] as string[];
        if (!cancelled) setAvailableWorkers(names);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingWorkers(false); });
    return () => { cancelled = true; };
  }, [activeProjectId, mode]);

  // ── Run compliance check when workType or workersInvolved change ──
  useEffect(() => {
    if (!form.workType || form.workersInvolved.length === 0 || !activeProjectId) {
      setComplianceResults([]);
      return;
    }
    let cancelled = false;
    setCheckingCompliance(true);
    const requiredTrainings = WORK_TYPE_TRAINING[form.workType] || [];
    CustomModulesAPI.list(activeProjectId)
      .then(async (modules) => {
        const trainingModule = modules.find((m: any) => m.name === '🦺 Safety Training');
        if (!trainingModule) return;
        const records = await CustomModulesAPI.listRecords(activeProjectId, trainingModule.id);
        const fields = trainingModule.fields;
        const getFieldId = (label: string) => fields.find((f: any) => f.label === label)?.id;
        const workerFId = getFieldId('Worker') ?? '';
        const trainingTypeFId = getFieldId('Training Type') ?? '';
        const trainingStatusFId = getFieldId('Training Status') ?? '';
        const expiryDateFId = getFieldId('Expiry Date') ?? '';
        const results: WorkerCompliance[] = form.workersInvolved.map((worker) => {
          const workerRecords = records.filter((r: any) => r.data[workerFId] === worker);
          const statuses = requiredTrainings.map((trainingType) => {
            const rec = workerRecords.find((r: any) => r.data[trainingTypeFId] === trainingType);
            const statusVal = rec ? String(rec.data[trainingStatusFId] || '') : '';
            const expiryVal = rec ? String(rec.data[expiryDateFId] || '') : '';
            const status = getComplianceStatus(rec?.data, statusVal, expiryVal);
            return { training: trainingType, status, expiryDate: expiryVal || undefined };
          });
          const eligible = statuses.every((s) => s.status === 'valid' || s.status === 'expiring');
          return { worker, requiredTrainings, statuses, eligible };
        });
        if (!cancelled) setComplianceResults(results);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCheckingCompliance(false); });
    return () => { cancelled = true; };
  }, [form.workType, form.workersInvolved, activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Use the drawing's own projectId first, fall back to activeProjectId from context
    const projectId = currentDrawing?.projectId ?? activeProjectId ?? undefined;
    if (!projectId) { toast.error('No project selected'); return; }
    setSavingLoc(true);
    try {
      await DrawingsAPI.update(currentDrawingId, { lat, lng, projectId } as any);
      await refreshDrawings();
      toast.success('Location saved');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Failed to save location';
      toast.error(msg);
    }
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
      workType: (task as any).workType || '',
      workersInvolved: (task as any).workersInvolved || [],
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
            const risk = forecast ? getTaskWeatherRisk(t, forecast) : null;
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
                  {risk && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <WeatherRiskBadge risk={risk} />
                    </>
                  )}
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
          {/* ── Work Type ── */}
          <Field label="Work Type">
            <select
              className="input"
              value={form.workType}
              onChange={(e) => setForm({ ...form, workType: e.target.value, workersInvolved: [] })}
            >
              <option value="">— Select Work Type —</option>
              {WORK_TYPES.map((wt) => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </Field>

          {/* ── Workers Involved ── */}
          <WorkerPicker
            availableWorkers={availableWorkers}
            loadingWorkers={loadingWorkers}
            selected={form.workersInvolved}
            onChange={(workers) => setForm({ ...form, workersInvolved: workers })}
          />

          {/* ── Worker Compliance Agent ── */}
          {form.workType && form.workersInvolved.length > 0 && (
            <div
              className="rounded-xl border p-3.5 space-y-3"
              style={{ background: 'rgba(20,10,30,0.6)', borderColor: 'rgba(139,92,246,0.3)' }}
            >
              <div className="flex items-center gap-2">
                <HardHat size={13} className="text-violet-400" />
                <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wide">Worker Compliance Agent</span>
                {checkingCompliance && (
                  <span className="text-[10px] text-slate-400 animate-pulse">Checking…</span>
                )}
              </div>
              {complianceResults.map((result) => (
                <div
                  key={result.worker}
                  className="rounded-lg p-2.5 space-y-1.5"
                  style={{
                    background: result.eligible ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${result.eligible ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">{result.worker}</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: result.eligible ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: result.eligible ? '#4ade80' : '#f87171',
                      }}
                    >
                      {result.eligible ? '✅ Eligible' : '🚫 Not Eligible'}
                    </span>
                  </div>
                  {result.statuses.map(({ training, status, expiryDate }) => {
                    const cfg = COMPLIANCE_CONFIG[status];
                    return (
                      <div
                        key={training}
                        className="flex items-center justify-between rounded px-2 py-1 gap-2"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <span className="text-[11px] text-slate-300 flex-1 truncate">{training}</span>
                        <span className="text-[10px] font-semibold whitespace-nowrap shrink-0" style={{ color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                          {expiryDate && status !== 'missing' && (
                            <span className="ml-1 text-slate-500">· {expiryDate}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

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
                      await DrawingsAPI.update(currentDrawingId!, { lat: null, lng: null, projectId: activeProjectId ?? undefined } as any);
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

// ── WorkerPicker ─────────────────────────────────────────────────────────────
/** Avatar initials badge for a worker */
function WorkerAvatar({ name, size = 28, selected = false }: { name: string; size?: number; selected?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  // Deterministic hue from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: selected
          ? 'linear-gradient(135deg,#be123c,#9f1239)'
          : `hsl(${hue},55%,28%)`,
        border: selected ? '2px solid #fb7185' : `2px solid hsl(${hue},40%,22%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.15s',
        boxShadow: selected ? '0 0 0 2px rgba(251,113,133,0.25)' : 'none',
      }}
    >
      <span
        style={{
          fontSize: size * 0.36,
          fontWeight: 700,
          color: selected ? '#fff' : `hsl(${hue},70%,80%)`,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {initials}
      </span>
    </div>
  );
}

interface WorkerPickerProps {
  availableWorkers: string[];
  loadingWorkers: boolean;
  selected: string[];
  onChange: (workers: string[]) => void;
}

function WorkerPicker({ availableWorkers, loadingWorkers, selected, onChange }: WorkerPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? availableWorkers.filter((w) => w.toLowerCase().includes(query.toLowerCase()))
    : availableWorkers;

  const toggle = (worker: string) => {
    if (selected.includes(worker)) {
      onChange(selected.filter((w) => w !== worker));
    } else {
      onChange([...selected, worker]);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((w) => selected.includes(w));

  const toggleAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      onChange(selected.filter((w) => !filtered.includes(w)));
    } else {
      // Select all filtered (merge, no duplicates)
      const merged = [...new Set([...selected, ...filtered])];
      onChange(merged);
    }
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <Users size={11} />
          Workers Involved
          {loadingWorkers && (
            <span className="text-[10px] text-slate-500 normal-case font-normal animate-pulse">Loading…</span>
          )}
        </span>
        {selected.length > 0 && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(190,18,60,0.18)', color: '#fb7185', border: '1px solid rgba(190,18,60,0.35)' }}
          >
            <Users size={9} />
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Empty state */}
      {!loadingWorkers && availableWorkers.length === 0 && (
        <div className="text-xs text-slate-500 italic px-1">No workers found in Site Entry module</div>
      )}

      {availableWorkers.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(63,63,70,0.8)', background: 'rgba(9,5,10,0.6)' }}
        >
          {/* Search bar */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: '1px solid rgba(63,63,70,0.6)', background: 'rgba(255,255,255,0.03)' }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-slate-500">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search workers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Select-all row */}
          {filtered.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left"
              style={{ borderBottom: '1px solid rgba(63,63,70,0.4)', background: 'rgba(255,255,255,0.015)' }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: allFilteredSelected ? '2px solid #be123c' : '2px solid rgba(63,63,70,1)',
                  background: allFilteredSelected ? 'linear-gradient(135deg,#be123c,#9f1239)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {allFilteredSelected && <Check size={9} className="text-white" style={{ strokeWidth: 3 }} />}
                {!allFilteredSelected && filtered.some((w) => selected.includes(w)) && (
                  <div style={{ width: 6, height: 2, background: '#f43f5e', borderRadius: 1 }} />
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {allFilteredSelected ? 'Deselect all' : 'Select all'}
                {query && ` (${filtered.length} results)`}
              </span>
            </button>
          )}

          {/* Worker list */}
          <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-600 italic">No matches for "{query}"</div>
            ) : (
              filtered.map((worker) => {
                const isSelected = selected.includes(worker);
                return (
                  <button
                    key={worker}
                    type="button"
                    onClick={() => toggle(worker)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all group"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(190,18,60,0.12), rgba(159,18,57,0.06))'
                        : 'transparent',
                      borderLeft: isSelected ? '2px solid rgba(251,113,133,0.6)' : '2px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                      else e.currentTarget.style.background = 'linear-gradient(135deg, rgba(190,18,60,0.12), rgba(159,18,57,0.06))';
                    }}
                  >
                    {/* Avatar */}
                    <WorkerAvatar name={worker} size={28} selected={isSelected} />

                    {/* Name */}
                    <span
                      className="flex-1 text-sm font-medium truncate"
                      style={{ color: isSelected ? '#fda4af' : '#cbd5e1' }}
                    >
                      {worker}
                    </span>

                    {/* Checkmark */}
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #be123c' : '2px solid rgba(63,63,70,0.8)',
                        background: isSelected ? 'linear-gradient(135deg,#be123c,#9f1239)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {isSelected && <Check size={9} className="text-white" style={{ strokeWidth: 3 }} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer: selected worker avatar strip */}
          {selected.length > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderTop: '1px solid rgba(63,63,70,0.5)', background: 'rgba(190,18,60,0.06)' }}
            >
              <div className="flex items-center" style={{ gap: -4 }}>
                {selected.slice(0, 6).map((w, i) => (
                  <div key={w} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: selected.length - i }}>
                    <WorkerAvatar name={w} size={22} selected />
                  </div>
                ))}
                {selected.length > 6 && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(63,63,70,0.8)',
                      border: '2px solid rgba(63,63,70,1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: -8,
                      zIndex: 0,
                    }}
                  >
                    <span className="text-[9px] font-bold text-slate-400">+{selected.length - 6}</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 flex-1 truncate">
                {selected.length === 1 ? selected[0] : `${selected.length} workers selected`}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-rose-400/70 hover:text-rose-400 transition-colors whitespace-nowrap"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
