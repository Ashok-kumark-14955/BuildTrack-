import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload,
  Grid3x3,
  Maximize2,
  Minimize2,
  Bell,
  ChevronDown,
  FileImage,
  X,
  SlidersHorizontal,
  Loader2,
  Crosshair,
  Plus,
  Minus,
  Check,
  Workflow,
  Share2,
  Download,
  Copy,
  CheckCheck,
  Layers,
  Pencil,
  Eraser,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { DrawingsAPI } from '../api';
import { detectGridFromImage } from '../utils/gridDetect';
import toast from 'react-hot-toast';

interface Props {
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  showBeams: boolean;
  setShowBeams: (v: boolean) => void;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  calibrating: boolean;
  setCalibrating: (v: boolean) => void;
  drawMode: boolean;
  setDrawMode: (v: boolean) => void;
  drawColor: string;
  setDrawColor: (v: string) => void;
  onClearAnnotations?: () => void;
  gridCols: number;
  gridRows: number;
  onGridSizeChange: (cols: number, rows: number) => void;
  onShareSnapshot?: () => string | null;
}

/** Renders a positioned div into document.body to escape overflow:hidden parents */
function PortalDropdown({
  anchorRef,
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

export default function TopToolbar({
  showGrid,
  setShowGrid,
  showBeams,
  setShowBeams,
  fullscreen,
  setFullscreen,
  calibrating,
  setCalibrating,
  drawMode,
  setDrawMode,
  drawColor,
  setDrawColor,
  onClearAnnotations,
  gridCols,
  gridRows,
  onGridSizeChange,
  onShareSnapshot,
}: Props) {
  const { currentDrawing, refreshDrawings, refreshTasks, setCurrentDrawingId, drawings, projects, activity, activeProjectId } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const shareBtnRef = useRef<HTMLButtonElement>(null);

  const [draftCols, setDraftCols] = useState(gridCols);
  const [draftRows, setDraftRows] = useState(gridRows);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraftCols(gridCols);
    setDraftRows(gridRows);
    setDirty(false);
  }, [gridCols, gridRows]);

  const handleDownloadSnapshot = () => {
    const dataUrl = onShareSnapshot?.();
    if (!dataUrl) { toast.error('No drawing loaded'); return; }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${currentDrawing?.name || 'drawing'}.png`;
    a.click();
    toast.success('Downloaded!');
    setShowShareMenu(false);
  };

  const handleCopySnapshot = async () => {
    const dataUrl = onShareSnapshot?.();
    if (!dataUrl) { toast.error('No drawing loaded'); return; }
    setSharing(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy not supported in this browser');
    } finally {
      setSharing(false);
      setShowShareMenu(false);
    }
  };

  const handleWebShare = async () => {
    const dataUrl = onShareSnapshot?.();
    if (!dataUrl) { toast.error('No drawing loaded'); return; }
    setSharing(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${currentDrawing?.name || 'drawing'}.png`, { type: blob.type });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: currentDrawing?.name || 'Drawing', files: [file] });
        toast.success('Shared!');
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${currentDrawing?.name || 'drawing'}.png`;
        a.click();
        toast.success('Downloaded (share not supported in browser)');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') toast.error('Share failed');
    } finally {
      setSharing(false);
      setShowShareMenu(false);
    }
  };

  const drawingActivity = activity
    .filter((a) => !currentDrawing || !a.drawingId || a.drawingId === currentDrawing.id)
    .slice(0, 8);

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const applyGridSize = () => {
    const c = Math.min(30, Math.max(2, draftCols));
    const r = Math.min(30, Math.max(2, draftRows));
    setDraftCols(c); setDraftRows(r);
    onGridSizeChange(c, r);
    setDirty(false); setShowGridSettings(false);
  };

  const adjustCols = (delta: number) => { setDraftCols((v) => Math.min(30, Math.max(2, v + delta))); setDirty(true); };
  const adjustRows = (delta: number) => { setDraftRows((v) => Math.min(30, Math.max(2, v + delta))); setDirty(true); };

  const handleUpload = async (file: File) => {
    setUploading(true);
    let cols = 10, rows = 8;
    try {
      const detected = await detectGridFromImage(file);
      if (detected) { cols = detected.cols; rows = detected.rows; toast.success(`Detected grid: ${cols} × ${rows}`); }
      else {
        const ci = window.prompt('Columns (letters)?', '10'); if (ci === null) { setUploading(false); return; }
        const ri = window.prompt('Rows (numbers)?', '8'); if (ri === null) { setUploading(false); return; }
        cols = Math.min(30, Math.max(1, Number(ci) || 10));
        rows = Math.min(30, Math.max(1, Number(ri) || 8));
      }
    } catch { /* use defaults */ }

    try {
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('name', file.name);
      form.append('projectId', activeProjectId || currentDrawing?.projectId || projects[0]?.id || '');
      form.append('gridCols', String(cols));
      form.append('gridRows', String(rows));
      const drawing = await DrawingsAPI.upload(form);
      await Promise.all([refreshDrawings(), refreshTasks()]);
      setCurrentDrawingId(drawing.id);
      toast.success(`Uploaded — ${cols * rows} grid tasks created`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  /* ── Share dropdown ─────────────────────────────────────────────────────── */
  const ShareDropdown = (
    <div
      className="w-56 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(10, 2, 18, 0.97)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
        <span className="text-[11px] font-black tracking-widest uppercase" style={{ color: 'rgba(196,181,253,0.9)' }}>Export</span>
        <button onClick={() => setShowShareMenu(false)}
          className="w-5 h-5 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
          <X size={11} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5 p-1.5">
        {[
          { icon: <Download size={13} style={{ color: '#a5b4fc' }} />, iconBg: 'rgba(99,102,241,0.18)', iconBorder: 'rgba(99,102,241,0.3)', label: 'Download PNG', sub: 'Save to device', action: handleDownloadSnapshot },
          { icon: copied ? <CheckCheck size={13} style={{ color: '#86efac' }} /> : <Copy size={13} style={{ color: '#86efac' }} />, iconBg: 'rgba(34,197,94,0.15)', iconBorder: 'rgba(34,197,94,0.3)', label: copied ? 'Copied!' : 'Copy Image', sub: 'To clipboard', action: handleCopySnapshot },
          { icon: <Share2 size={13} style={{ color: '#f9a8d4' }} />, iconBg: 'rgba(236,72,153,0.15)', iconBorder: 'rgba(236,72,153,0.3)', label: 'Share', sub: 'Via share sheet', action: handleWebShare },
        ].map(({ icon, iconBg, iconBorder, label, sub, action }) => (
          <button key={label} onClick={action}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
            style={{ color: '#fce7f3' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <span className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
              style={{ background: iconBg, border: `1px solid ${iconBorder}` }}>
              {icon}
            </span>
            <div>
              <div className="text-[12.5px] font-bold" style={{ color: '#ffffff' }}>{label}</div>
              <div className="text-[10px]" style={{ color: 'rgba(253,164,175,0.55)' }}>{sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Notification dropdown ──────────────────────────────────────────────── */
  const NotifDropdown = (
    <div
      className="w-80 max-h-96 flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(10, 2, 18, 0.97)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex items-center gap-2">
          <Bell size={12} style={{ color: '#fb7185' }} />
          <span className="text-[12px] font-black tracking-wide uppercase" style={{ color: 'rgba(253,164,175,0.9)' }}>Activity</span>
          {drawingActivity.length > 0 && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(251,113,133,0.18)', color: '#fb7185', border: '1px solid rgba(251,113,133,0.3)' }}>
              {drawingActivity.length}
            </span>
          )}
        </div>
        <button onClick={() => setShowNotifications(false)}
          className="w-5 h-5 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
          <X size={11} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        {drawingActivity.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell size={20} className="mx-auto mb-2" style={{ color: 'rgba(251,113,133,0.25)' }} />
            <div className="text-[12px] font-semibold" style={{ color: 'rgba(253,164,175,0.4)' }}>No recent activity</div>
          </div>
        ) : (
          <div className="py-1">
            {drawingActivity.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: i < drawingActivity.length - 1 ? '1px solid rgba(139,92,246,0.08)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                  style={{ background: '#fb7185', boxShadow: '0 0 6px rgba(251,113,133,0.6)' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold leading-snug" style={{ color: '#fce7f3' }}>{a.message}</div>
                  <div className="text-[10.5px] font-medium mt-0.5" style={{ color: 'rgba(253,164,175,0.45)' }}>{timeAgo(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ─── Tiny icon button helper ──────────────────────────────────────────── */
  const IconBtn = ({
    onClick, title, active, children,
  }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 shrink-0"
      style={active
        ? { background: 'rgba(219,39,119,0.28)', color: '#ffffff', border: '1px solid rgba(219,39,119,0.55)', boxShadow: '0 0 12px rgba(219,39,119,0.2)' }
        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(219,39,119,0.18)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,0.4)'; e.currentTarget.style.color = '#ffffff'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
    >
      {children}
    </button>
  );

  /* ─── Separator ───────────────────────────────────────────────────────── */
  const Sep = () => (
    <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
  );

  return (
    <div
      className="h-[58px] flex items-center shrink-0 relative z-50 overflow-visible"
      style={{
        background: 'linear-gradient(135deg, #060106 0%, #0c0208 40%, #110410 70%, #080107 100%)',
        borderBottom: '1px solid rgba(159,18,57,0.35)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(190,24,93,0.08)',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 8,
      }}
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(159,18,57,0.7) 30%, rgba(220,38,38,0.6) 70%, transparent 100%)',
      }} />

      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{
            background: 'linear-gradient(135deg, rgba(159,18,57,0.4) 0%, rgba(120,10,40,0.35) 100%)',
            border: '1px solid rgba(159,18,57,0.5)',
            boxShadow: '0 0 16px rgba(159,18,57,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
            <Layers size={14} style={{ color: '#fda4af' }} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center"
            style={{ background: '#22c55e', borderColor: '#120005', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
        </div>
        <div className="hidden sm:block leading-none">
          <div className="text-[13px] font-black tracking-tight" style={{ color: '#ffffff' }}>Drawing</div>
          <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: 'rgba(253,164,175,0.55)' }}>Studio</div>
        </div>
      </div>

      <Sep />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />

      {/* ── Upload button ── */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-[12.5px] font-bold px-4 py-[7px] rounded-xl shrink-0 transition-all duration-200"
        style={uploading
          ? { background: 'rgba(99,102,241,0.08)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(99,102,241,0.15)', cursor: 'not-allowed' }
          : {
            background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 55%, #4c0519 100%)',
            color: '#fff',
            border: '1px solid rgba(159,18,57,0.5)',
            boxShadow: '0 2px 16px rgba(159,18,57,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.filter = 'brightness(1.15)'; }}
        onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.filter = 'brightness(1)'; }}
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Upload'}</span>
      </button>

      {/* ── Drawing selector ── */}
      {drawings.length > 0 && (
        <div className="relative flex items-center shrink-0" style={{ minWidth: 0, flex: '1 1 auto', maxWidth: 340 }}>
          <div className="w-full flex items-center gap-1">
            <div className="relative flex-1 min-w-0 flex items-center">
              <FileImage size={12} className="absolute left-2.5 pointer-events-none z-10 shrink-0" style={{ color: 'rgba(253,164,175,0.55)' }} />
              <select
                className="w-full pl-8 pr-7 py-[7px] text-[12.5px] appearance-none cursor-pointer outline-none truncate font-semibold rounded-xl transition-all"
                style={{
                  background: 'rgba(159,18,57,0.08)',
                  border: '1px solid rgba(159,18,57,0.28)',
                  color: '#ffffff',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
                }}
                value={currentDrawing?.id || ''}
                onChange={(e) => setCurrentDrawingId(e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.6)'; e.currentTarget.style.background = 'rgba(159,18,57,0.16)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(159,18,57,0.28)'; e.currentTarget.style.background = 'rgba(159,18,57,0.08)'; }}
              >
                {drawings.map((d) => (
                  <option key={d.id} value={d.id} style={{ background: '#140005', color: '#ffffff' }}>{d.name}</option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(253,164,175,0.5)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Drawing count badge */}
      {drawings.length > 0 && (
        <span className="shrink-0 text-[10px] font-black tabular-nums px-2 py-1 rounded-lg"
          style={{ background: 'rgba(159,18,57,0.12)', color: 'rgba(253,164,175,0.7)', border: '1px solid rgba(159,18,57,0.25)' }}>
          {drawings.length} {drawings.length === 1 ? 'drawing' : 'drawings'}
        </span>
      )}

      <Sep />

      {/* ── Grid Toggle Pill ── */}
      <div className="flex items-center rounded-xl overflow-hidden shrink-0" style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        gap: 0,
      }}>
        {/* Columns */}
        <button onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? 'Hide column markers' : 'Show column markers'}
          className="relative flex items-center gap-1.5 text-[12px] px-3.5 py-[7px] font-bold transition-all duration-200"
          style={showGrid
            ? { background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 100%)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }
            : { color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => { if (!showGrid) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={(e) => { if (!showGrid) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <Grid3x3 size={12} />
          <span className="hidden sm:inline tracking-tight">Columns</span>
          {showGrid && <span className="w-1 h-1 rounded-full shrink-0" style={{ background: '#fda4af' }} />}
        </button>

        <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Beams */}
        <button onClick={() => setShowBeams(!showBeams)}
          title={showBeams ? 'Hide beam markup' : 'Show beam markup'}
          className="relative flex items-center gap-1.5 text-[12px] px-3.5 py-[7px] font-bold transition-all duration-200"
          style={showBeams
            ? { background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 100%)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }
            : { color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => { if (!showBeams) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={(e) => { if (!showBeams) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <Workflow size={12} />
          <span className="hidden sm:inline tracking-tight">Beams</span>
          {showBeams && <span className="w-1 h-1 rounded-full shrink-0" style={{ background: '#fda4af' }} />}
        </button>

        <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Grid settings */}
        <button onClick={() => setShowGridSettings(!showGridSettings)} title="Grid size settings"
          className="w-9 h-full flex items-center justify-center transition-all duration-150"
          style={showGridSettings ? { background: 'rgba(159,18,57,0.3)', color: '#fda4af' } : { color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={(e) => { if (!showGridSettings) { e.currentTarget.style.background = 'rgba(159,18,57,0.15)'; e.currentTarget.style.color = '#fda4af'; } }}
          onMouseLeave={(e) => { if (!showGridSettings) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; } }}
        >
          <SlidersHorizontal size={11} />
        </button>
      </div>

      {/* ── Grid Size Popover ── */}
      {showGridSettings && (
        <div className="flex items-center gap-0 rounded-2xl shrink-0 overflow-hidden"
          style={{
            background: 'rgba(20,0,6,0.97)',
            border: '1px solid rgba(159,18,57,0.4)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(20px)',
          }}>
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Cols */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(253,164,175,0.45)' }}>Cols</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => adjustCols(-1)} className="w-5 h-5 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <Minus size={8} />
                </button>
                <input type="number" min={2} max={30} value={draftCols}
                  onChange={(e) => { setDraftCols(Number(e.target.value)); setDirty(true); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
                  className="w-8 text-center text-[14px] font-black outline-none"
                  style={{ background: 'transparent', border: 'none', color: '#ffffff' }} />
                <button onClick={() => adjustCols(1)} className="w-5 h-5 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <Plus size={8} />
                </button>
              </div>
            </div>
            <span className="text-[15px] font-black mt-3" style={{ color: 'rgba(159,18,57,0.6)' }}>×</span>
            {/* Rows */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(253,164,175,0.45)' }}>Rows</span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => adjustRows(-1)} className="w-5 h-5 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <Minus size={8} />
                </button>
                <input type="number" min={2} max={30} value={draftRows}
                  onChange={(e) => { setDraftRows(Number(e.target.value)); setDirty(true); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
                  className="w-8 text-center text-[14px] font-black outline-none"
                  style={{ background: 'transparent', border: 'none', color: '#ffffff' }} />
                <button onClick={() => adjustRows(1)} className="w-5 h-5 flex items-center justify-center rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                  <Plus size={8} />
                </button>
              </div>
            </div>
          </div>
          <div className="w-px self-stretch my-2" style={{ background: 'rgba(159,18,57,0.3)' }} />
          <div className="flex items-center gap-1 px-2">
            <button onClick={applyGridSize}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={dirty
                ? { background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 100%)', color: '#fff', boxShadow: '0 2px 12px rgba(159,18,57,0.5)', border: '1px solid rgba(159,18,57,0.4)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'default' }}>
              <Check size={10} /> Apply
            </button>
            <button onClick={() => setShowGridSettings(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <Sep />

      {/* ── Calibrate button ── */}
      <button onClick={() => setCalibrating(!calibrating)}
        title={calibrating ? 'Exit calibration mode' : 'Calibrate column positions'}
        className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-[7px] rounded-xl font-bold transition-all duration-200 shrink-0"
        style={calibrating
          ? {
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: '#1a0500',
            boxShadow: '0 2px 16px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '1px solid rgba(251,191,36,0.4)',
          }
          : {
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        onMouseEnter={(e) => { if (!calibrating) { e.currentTarget.style.background = 'rgba(245,158,11,0.18)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.color = '#fcd34d'; } }}
        onMouseLeave={(e) => { if (!calibrating) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
      >
        <Crosshair size={13} />
        <span className="hidden sm:inline">{calibrating ? 'Done' : 'Calibrate'}</span>
      </button>

      {/* ── Draw (freehand markup) button ── */}
      <button onClick={() => setDrawMode(!drawMode)}
        title={drawMode ? 'Exit draw mode' : 'Draw markup on the drawing'}
        className="flex items-center gap-1.5 text-[12.5px] px-3.5 py-[7px] rounded-xl font-bold transition-all duration-200 shrink-0"
        style={drawMode
          ? {
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
            color: '#020617',
            boxShadow: '0 2px 16px rgba(59,130,246,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '1px solid rgba(96,165,250,0.4)',
          }
          : {
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        onMouseEnter={(e) => { if (!drawMode) { e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#93c5fd'; } }}
        onMouseLeave={(e) => { if (!drawMode) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
      >
        <Pencil size={13} />
        <span className="hidden sm:inline">{drawMode ? 'Done' : 'Draw'}</span>
      </button>

      {/* ── Draw-mode extras: color swatches + clear (only while drawing) ── */}
      {drawMode && (
        <div className="flex items-center gap-1 shrink-0 pl-1">
          {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#f8fafc'].map((c) => (
            <button
              key={c}
              onClick={() => setDrawColor(c)}
              title={c}
              className="w-5 h-5 rounded-full shrink-0 transition-transform"
              style={{
                background: c,
                border: drawColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                transform: drawColor === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
          {onClearAnnotations && (
            <button
              onClick={onClearAnnotations}
              title="Clear all markup"
              className="flex items-center justify-center w-7 h-7 rounded-lg ml-1 text-rose-300 hover:bg-rose-500/15 border border-rose-500/20 transition-colors"
            >
              <Eraser size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Fullscreen ── */}
      <IconBtn onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} active={fullscreen}>
        {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </IconBtn>

      {/* ── Right side ── */}
      <div className="ml-auto flex items-center gap-2 shrink-0">

        {/* Share */}
        {onShareSnapshot && (
          <>
            <button
              ref={shareBtnRef}
              onClick={() => { setShowShareMenu((v) => !v); setShowNotifications(false); }}
              title="Export / Share drawing"
              disabled={sharing}
              className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-[7px] rounded-xl transition-all duration-150 shrink-0"
              style={showShareMenu
                ? { background: 'rgba(159,18,57,0.28)', color: '#fda4af', border: '1px solid rgba(159,18,57,0.55)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={(e) => { if (!showShareMenu && !sharing) { e.currentTarget.style.background = 'rgba(159,18,57,0.18)'; e.currentTarget.style.borderColor = 'rgba(159,18,57,0.45)'; e.currentTarget.style.color = '#fda4af'; } }}
              onMouseLeave={(e) => { if (!showShareMenu && !sharing) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
            >
              {sharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
              <span className="hidden sm:inline">Share</span>
            </button>
            {showShareMenu && (
              <PortalDropdown anchorRef={shareBtnRef} onClose={() => setShowShareMenu(false)}>
                {ShareDropdown}
              </PortalDropdown>
            )}
          </>
        )}

        <Sep />

        {/* Bell */}
        <button
          ref={notifBtnRef}
          onClick={() => { setShowNotifications((v) => !v); setShowShareMenu(false); }}
          className="relative w-8 h-8 flex items-center justify-center rounded-xl transition-all shrink-0"
          title="Recent activity"
          style={showNotifications
            ? { color: '#ffffff', background: 'rgba(251,113,133,0.22)', border: '1px solid rgba(251,113,133,0.5)' }
            : { color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          onMouseEnter={(e) => { if (!showNotifications) { e.currentTarget.style.background = 'rgba(251,113,133,0.15)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.4)'; e.currentTarget.style.color = '#fda4af'; } }}
          onMouseLeave={(e) => { if (!showNotifications) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
        >
          <Bell size={13} />
          {drawingActivity.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full flex items-center justify-center"
              style={{ background: '#fb7185', boxShadow: '0 0 6px rgba(251,113,133,0.8)' }} />
          )}
        </button>

        {showNotifications && (
          <PortalDropdown anchorRef={notifBtnRef} onClose={() => setShowNotifications(false)}>
            {NotifDropdown}
          </PortalDropdown>
        )}

        <Sep />

        {/* User pill */}
        <div
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl cursor-pointer transition-all shrink-0"
          style={{ border: '1px solid rgba(159,18,57,0.3)', background: 'rgba(159,18,57,0.06)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(159,18,57,0.18)'; e.currentTarget.style.borderColor = 'rgba(159,18,57,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(159,18,57,0.06)'; e.currentTarget.style.borderColor = 'rgba(159,18,57,0.3)'; }}
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{
            background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 100%)',
            boxShadow: '0 0 0 2px rgba(159,18,57,0.4), 0 2px 8px rgba(159,18,57,0.35)',
          }}>AK</div>
          <div className="hidden md:block text-left leading-none">
            <div className="text-[12px] font-bold" style={{ color: '#ffffff' }}>Ashok K.</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(253,164,175,0.6)' }}>Site Engineer</div>
          </div>
          <ChevronDown size={10} style={{ color: 'rgba(253,164,175,0.45)' }} />
        </div>
      </div>
    </div>
  );
}
