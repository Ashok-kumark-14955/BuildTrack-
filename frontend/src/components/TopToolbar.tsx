import { useRef, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useApp } from '../AppContext';
import { DrawingsAPI } from '../api';
import { detectGridFromImage } from '../utils/gridDetect';
import { convertToOutline } from '../utils/outlineConvert';
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
  gridCols: number;
  gridRows: number;
  onGridSizeChange: (cols: number, rows: number) => void;
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
  gridCols,
  gridRows,
  onGridSizeChange,
}: Props) {
  const { currentDrawing, refreshDrawings, refreshTasks, setCurrentDrawingId, drawings, projects } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [draftCols, setDraftCols] = useState(gridCols);
  const [draftRows, setDraftRows] = useState(gridRows);
  const [dirty, setDirty] = useState(false);

  /**
   * totalColumns = how many column circle markers there are (cols × rows of the grid).
   * totalBeams   = horizontal beams + vertical beams
   *             = cols × (rows-1)  [vertical spans]  +  (cols-1) × rows [horizontal spans]
   */
  const totalColumns = draftCols * draftRows;
  const totalBeams = draftCols * (draftRows - 1) + (draftCols - 1) * draftRows;

  useEffect(() => {
    setDraftCols(gridCols);
    setDraftRows(gridRows);
    setDirty(false);
  }, [gridCols, gridRows]);

  const applyGridSize = () => {
    const c = Math.min(30, Math.max(2, draftCols));
    const r = Math.min(30, Math.max(2, draftRows));
    setDraftCols(c); setDraftRows(r);
    onGridSizeChange(c, r);
    setDirty(false); setShowGridSettings(false);
  };

  const adjustCols = (delta: number) => {
    setDraftCols((v) => Math.min(30, Math.max(2, v + delta)));
    setDirty(true);
  };
  const adjustRows = (delta: number) => {
    setDraftRows((v) => Math.min(30, Math.max(2, v + delta)));
    setDirty(true);
  };

  /**
   * Given a target total (cols × rows), find the (cols, rows) pair in [2,30]×[2,30]
   * that equals the target exactly, preferring the factorization whose rows value
   * is closest to draftRows.
   * Returns null if no exact factorization exists in the allowed range.
   */
  const exactFactorization = (target: number): { cols: number; rows: number } | null => {
    let best: { cols: number; rows: number } | null = null;
    let bestDiff = Infinity;
    for (let r = 2; r <= 30; r++) {
      if (target % r === 0) {
        const c = target / r;
        if (c >= 2 && c <= 30) {
          const diff = Math.abs(r - draftRows);
          if (diff < bestDiff) { bestDiff = diff; best = { cols: c, rows: r }; }
        }
      }
    }
    return best;
  };

  // Step total columns by exactly ±1. Scans forward/backward to the nearest
  // integer that has an exact factorization in [2,30]×[2,30].
  const adjustTotalCols = (delta: number) => {
    const current = draftCols * draftRows;
    const direction = delta > 0 ? 1 : -1;
    // Search up to 30 steps in the requested direction
    for (let step = 1; step <= 30; step++) {
      const t = current + direction * step;
      if (t < 4) continue;
      const f = exactFactorization(t);
      if (f) {
        setDraftCols(f.cols);
        setDraftRows(f.rows);
        setDirty(true);
        return;
      }
    }
  };

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

    let uploadFile = file;
    if (file.type.startsWith('image/')) {
      const t = toast.loading('Converting to outline…');
      try { uploadFile = await convertToOutline(file); } catch { /* fallback */ } finally { toast.dismiss(t); }
    }
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      form.append('name', file.name);
      form.append('projectId', currentDrawing?.projectId || projects[0]?.id || '');
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

  // Palette: maroon bg + dark-pink buttons
  // bg-dark:    #1a0008
  // bg-mid:     #2a000f
  // btn-dpink:  #be185d → #9f1239
  // accent:     #db2777
  // text:       #fce7f3
  // subtext:    #fda4af

  const Divider = () => (
    <div className="w-px h-6 shrink-0 mx-0.5" style={{ background: 'linear-gradient(180deg, transparent, rgba(190,24,93,0.4), transparent)' }} />
  );

  return (
    <div
      className="h-[60px] flex items-center px-4 shrink-0 relative z-10 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a0008 0%, #220010 45%, #2a000f 70%, #1a0008 100%)',
        borderBottom: '1px solid rgba(128,0,32,0.55)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.8)',
        gap: '6px',
      }}
    >
      {/* Left accent stripe — dark-pink on maroon */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{
        background: 'linear-gradient(180deg, #7c0a2a 0%, #5a0620 50%, #3d0216 100%)',
        boxShadow: '0 0 10px rgba(80,4,24,0.7)',
      }} />

      {/* ── Brand ── */}
      <div className="flex items-center gap-2 ml-2 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
          background: 'rgba(190,24,93,0.2)',
          border: '1px solid rgba(219,39,119,0.4)',
          boxShadow: '0 0 10px rgba(159,18,57,0.2)',
        }}>
          <FileImage size={14} style={{ color: '#ffffff' }} />
        </div>
        <span className="hidden sm:block text-[13px] font-bold tracking-wide" style={{ color: '#ffffff' }}>Drawing</span>
      </div>

      <Divider />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />

      {/* ── Upload (pink button) ── */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-[7px] rounded-lg shrink-0 transition-all duration-200"
        style={uploading
          ? { background: 'rgba(80,4,24,0.3)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(120,8,40,0.3)', cursor: 'not-allowed' }
          : {
              background: 'linear-gradient(135deg, #7c0a2a 0%, #5a0620 55%, #3d0216 100%)',
              color: '#fff',
              border: '1px solid rgba(120,8,40,0.5)',
              boxShadow: '0 2px 14px rgba(60,2,18,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
        onMouseEnter={(e) => { if (!uploading) { e.currentTarget.style.filter = 'brightness(1.2)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(80,4,24,0.8), inset 0 1px 0 rgba(255,255,255,0.08)'; } }}
        onMouseLeave={(e) => { if (!uploading) { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.boxShadow = '0 2px 14px rgba(60,2,18,0.7), inset 0 1px 0 rgba(255,255,255,0.08)'; } }}
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Upload'}</span>
      </button>

      {/* ── Drawing Selector ── */}
      {drawings.length > 0 && (
        <div className="relative flex items-center shrink-0" style={{ minWidth: 180, maxWidth: 360, flex: '1 1 auto' }}>
          <FileImage size={13} className="absolute left-2.5 pointer-events-none shrink-0 z-10" style={{ color: 'rgba(255,255,255,0.6)' }} />
          <select
            className="w-full pl-8 pr-7 py-[7px] text-[13px] appearance-none cursor-pointer outline-none truncate font-semibold rounded-lg transition-all"
            style={{
              background: 'rgba(30,0,12,0.95)',
              border: '1.5px solid rgba(128,0,32,0.55)',
              color: '#ffffff',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
            }}
            value={currentDrawing?.id || ''}
            onChange={(e) => setCurrentDrawingId(e.target.value)}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(219,39,119,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(190,24,93,0.18), inset 0 1px 3px rgba(0,0,0,0.5)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(128,0,32,0.55)'; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.5)'; }}
          >
            {drawings.map((d) => (
              <option key={d.id} value={d.id} style={{ background: '#1a0008', color: '#ffffff' }}>{d.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.6)' }} />
        </div>
      )}

      <Divider />

      {/* ── Grid Toggle Group ── */}
      <div
        className="flex items-center rounded-full overflow-hidden shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1a0008 0%, #280010 100%)',
          border: '1px solid rgba(159,18,57,0.45)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Columns toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? 'Hide column markers' : 'Show column markers'}
          className="relative flex items-center gap-2 text-[12.5px] px-3.5 py-2 font-bold transition-all duration-200 overflow-hidden rounded-full"
          style={showGrid
            ? {
                background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 55%, #4c0519 100%)',
                color: '#fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
              }
            : {
                background: 'rgba(159,18,57,0.08)',
                color: 'rgba(253,202,212,0.6)',
                borderRight: '1px solid rgba(159,18,57,0.2)',
              }}
          onMouseEnter={(e) => { if (!showGrid) e.currentTarget.style.background = 'rgba(159,18,57,0.18)'; }}
          onMouseLeave={(e) => { if (!showGrid) e.currentTarget.style.background = 'rgba(159,18,57,0.08)'; }}
        >
          {showGrid && (
            <span className="absolute inset-0 pointer-events-none opacity-20"
              style={{ background: 'radial-gradient(ellipse at 20% 50%, #fb7185 0%, transparent 70%)' }} />
          )}
          <Grid3x3 size={13} />
          <span className="tracking-tight">Columns</span>
          {showGrid && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#fb7185', boxShadow: '0 0 5px #fb7185' }} />}
        </button>

        {/* Divider */}
        <div className="w-px self-stretch shrink-0" style={{ background: 'rgba(159,18,57,0.35)' }} />

        {/* Beams toggle */}
        <button
          onClick={() => setShowBeams(!showBeams)}
          title={showBeams ? 'Hide beam markup' : 'Show beam markup'}
          className="relative flex items-center gap-2 text-[12.5px] px-3.5 py-2 font-bold transition-all duration-200 overflow-hidden rounded-full"
          style={showBeams
            ? {
                background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 55%, #4c0519 100%)',
                color: '#fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
              }
            : {
                background: 'rgba(159,18,57,0.08)',
                color: 'rgba(253,202,212,0.6)',
              }}
          onMouseEnter={(e) => { if (!showBeams) e.currentTarget.style.background = 'rgba(159,18,57,0.18)'; }}
          onMouseLeave={(e) => { if (!showBeams) e.currentTarget.style.background = 'rgba(159,18,57,0.08)'; }}
        >
          {showBeams && (
            <span className="absolute inset-0 pointer-events-none opacity-20"
              style={{ background: 'radial-gradient(ellipse at 20% 50%, #fb7185 0%, transparent 70%)' }} />
          )}
          <Workflow size={13} />
          <span className="tracking-tight">Beams</span>
          {showBeams && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#fb7185', boxShadow: '0 0 5px #fb7185' }} />}
        </button>

        {/* Divider */}
        <div className="w-px self-stretch shrink-0" style={{ background: 'rgba(159,18,57,0.35)' }} />

        {/* Grid settings */}
        <button
          onClick={() => setShowGridSettings(!showGridSettings)}
          title="Grid settings"
          className="w-9 h-full flex items-center justify-center transition-all duration-150 rounded-full"
          style={showGridSettings
            ? { background: 'linear-gradient(135deg, #9f1239 0%, #4c0519 100%)', color: '#fda4af' }
            : { background: 'rgba(159,18,57,0.08)', color: 'rgba(253,202,212,0.45)' }}
          onMouseEnter={(e) => { if (!showGridSettings) e.currentTarget.style.background = 'rgba(159,18,57,0.18)'; }}
          onMouseLeave={(e) => { if (!showGridSettings) e.currentTarget.style.background = 'rgba(159,18,57,0.08)'; }}
        >
          <SlidersHorizontal size={12} />
        </button>
      </div>

      {/* ── Grid Size Popover ── */}
      {showGridSettings && (
        <div
          className="flex items-center gap-0 rounded-2xl shrink-0 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a0008 0%, #250010 50%, #1a0008 100%)',
            border: '1.5px solid rgba(236,72,153,0.4)',
            boxShadow: '0 6px 28px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* ── Grid dimensions (Cols × Rows) ── */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Cols stepper */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Cols</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => adjustCols(-1)}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <Minus size={8} />
                </button>
                <input
                  type="number" min={2} max={30} value={draftCols}
                  onChange={(e) => { setDraftCols(Number(e.target.value)); setDirty(true); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
                  className="w-8 text-center text-[14px] font-black outline-none rounded py-0"
                  style={{ background: 'transparent', border: 'none', color: '#ffffff' }}
                />
                <button
                  onClick={() => adjustCols(1)}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <Plus size={8} />
                </button>
              </div>
            </div>

            {/* × separator */}
            <span className="text-[16px] font-black mt-3" style={{ color: 'rgba(236,72,153,0.5)' }}>×</span>

            {/* Rows stepper */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-black tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Rows</span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => adjustRows(-1)}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <Minus size={8} />
                </button>
                <input
                  type="number" min={2} max={30} value={draftRows}
                  onChange={(e) => { setDraftRows(Number(e.target.value)); setDirty(true); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
                  className="w-8 text-center text-[14px] font-black outline-none rounded py-0"
                  style={{ background: 'transparent', border: 'none', color: '#ffffff' }}
                />
                <button
                  onClick={() => adjustRows(1)}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <Plus size={8} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="w-px self-stretch my-2" style={{ background: 'rgba(236,72,153,0.2)' }} />

          {/* ── Actions ── */}
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={applyGridSize}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={dirty
                ? { background: 'linear-gradient(135deg, #9f1239, #6d0120)', color: '#fff', boxShadow: '0 2px 12px rgba(159,18,57,0.6)', border: '1px solid rgba(236,72,153,0.3)' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'default' }}
            >
              <Check size={10} />
              Apply
            </button>
            <button
              onClick={() => setShowGridSettings(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      <Divider />

      {/* ── Calibrate (pink on hover / amber when active) ── */}
      <button
        onClick={() => setCalibrating(!calibrating)}
        title={calibrating ? 'Done calibrating' : 'Drag columns to their exact position'}
        className="flex items-center gap-1.5 text-[13px] px-3 py-[7px] rounded-lg font-semibold transition-all duration-150 shrink-0"
        style={calibrating
          ? { background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%)', color: '#1a0500', boxShadow: '0 2px 12px rgba(245,158,11,0.5)', border: '1px solid rgba(251,191,36,0.3)' }
          : { background: 'rgba(26,0,10,0.9)', color: '#ffffff', border: '1px solid rgba(128,0,32,0.45)' }}
        onMouseEnter={(e) => { if (!calibrating) { e.currentTarget.style.background = 'rgba(219,39,119,0.25)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,0.55)'; e.currentTarget.style.color = '#ffffff'; } }}
        onMouseLeave={(e) => { if (!calibrating) { e.currentTarget.style.background = 'rgba(26,0,10,0.9)'; e.currentTarget.style.borderColor = 'rgba(128,0,32,0.45)'; e.currentTarget.style.color = '#ffffff'; } }}
      >
        <Crosshair size={13} />
        <span>{calibrating ? 'Done' : 'Calibrate'}</span>
      </button>

      {/* ── Fullscreen ── */}
      <button
        onClick={() => setFullscreen(!fullscreen)}
        title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
        style={{ color: '#ffffff', border: '1px solid rgba(128,0,32,0.4)', background: 'rgba(26,0,10,0.85)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(219,39,119,0.25)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,0.55)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,0,10,0.85)'; e.currentTarget.style.borderColor = 'rgba(128,0,32,0.4)'; }}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>

      {/* ── Right Actions ── */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {/* Bell */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          title="Notifications"
          style={{ color: '#ffffff', background: 'rgba(26,0,10,0.85)', border: '1px solid rgba(128,0,32,0.4)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(219,39,119,0.25)'; e.currentTarget.style.borderColor = 'rgba(219,39,119,0.55)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,0,10,0.85)'; e.currentTarget.style.borderColor = 'rgba(128,0,32,0.4)'; }}
        >
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#7c0a2a', boxShadow: '0 0 6px rgba(80,4,24,0.9)' }} />
        </button>

        <Divider />

        {/* User pill */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
          style={{ border: '1px solid rgba(128,0,32,0.35)', background: 'rgba(26,0,10,0.7)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.12)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(26,0,10,0.7)'; e.currentTarget.style.borderColor = 'rgba(128,0,32,0.35)'; }}
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{
            background: 'linear-gradient(135deg, #7c0a2a 0%, #5a0620 55%, #3d0216 100%)',
            boxShadow: '0 0 0 2px rgba(80,4,24,0.5), 0 2px 8px rgba(60,2,18,0.5)',
          }}>AK</div>
          <div className="hidden md:block text-left leading-none">
            <div className="text-[12px] font-bold" style={{ color: '#ffffff' }}>Ashok K.</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Site Engineer</div>
          </div>
          <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
        </div>
      </div>
    </div>
  );
}
