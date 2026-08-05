import { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Grid3x3,
  Maximize2,
  Minimize2,
  Search,
  Bell,
  ChevronDown,
  FileImage,
  X,
  SlidersHorizontal,
  Loader2,
  Crosshair,
  Layers,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { DrawingsAPI } from '../api';
import { detectGridFromImage } from '../utils/gridDetect';
import { convertToOutline } from '../utils/outlineConvert';
import toast from 'react-hot-toast';

interface Props {
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
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
  const [search, setSearch] = useState('');
  const [showGridSettings, setShowGridSettings] = useState(false);
  const [draftCols, setDraftCols] = useState(gridCols);
  const [draftRows, setDraftRows] = useState(gridRows);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraftCols(gridCols);
    setDraftRows(gridRows);
    setDirty(false);
  }, [gridCols, gridRows]);

  const applyGridSize = () => {
    const c = Math.min(30, Math.max(2, draftCols));
    const r = Math.min(30, Math.max(2, draftRows));
    setDraftCols(c);
    setDraftRows(r);
    onGridSizeChange(c, r);
    setDirty(false);
    setShowGridSettings(false);
  };

  const adjustCols = (delta: number) => { setDraftCols((v) => Math.min(30, Math.max(2, v + delta))); setDirty(true); };
  const adjustRows = (delta: number) => { setDraftRows((v) => Math.min(30, Math.max(2, v + delta))); setDirty(true); };

  const handleUpload = async (file: File) => {
    setUploading(true);
    let cols: number;
    let rows: number;
    try {
      const detected = await detectGridFromImage(file);
      if (detected) {
        cols = detected.cols;
        rows = detected.rows;
        toast.success(`Detected grid: ${cols} columns × ${rows} rows`);
      } else {
        const colsInput = window.prompt('Could not auto-detect grid. How many grid columns (letters)?', '10');
        if (colsInput === null) { setUploading(false); return; }
        const rowsInput = window.prompt('How many grid rows (numbers)?', '8');
        if (rowsInput === null) { setUploading(false); return; }
        cols = Math.min(30, Math.max(1, Number(colsInput) || 10));
        rows = Math.min(30, Math.max(1, Number(rowsInput) || 8));
      }
    } catch {
      cols = 10;
      rows = 8;
    }

    let uploadFile = file;
    if (file.type.startsWith('image/')) {
      const outlineToast = toast.loading('Converting to outline drawing…');
      try { uploadFile = await convertToOutline(file); } catch { /* fallback */ } finally { toast.dismiss(outlineToast); }
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
      toast.success(`Drawing uploaded — ${cols * rows} grid tasks created`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="h-[64px] flex items-center gap-2.5 px-4 shrink-0 relative z-10"
      style={{
        background: 'linear-gradient(135deg, #080208 0%, #0f030a 40%, #150510 70%, #0a0108 100%)',
        borderBottom: '1px solid rgba(159,18,57,0.35)',
        boxShadow: '0 1px 12px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(190,24,93,0.08)',
      }}
    >
      {/* Left accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r"
        style={{ background: 'linear-gradient(180deg, #be185d 0%, #9f1239 60%, #7f1d3c 100%)' }}
      />

      {/* Module name + icon */}
      <div className="flex items-center gap-2 ml-2 shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(159,18,57,0.3) 0%, rgba(109,7,31,0.5) 100%)',
            border: '1px solid rgba(190,24,93,0.4)',
            boxShadow: '0 2px 8px rgba(159,18,57,0.35)',
          }}
        >
          <FileImage size={15} style={{ color: '#f9a8d4' }} />
        </div>
        <span
          className="hidden sm:block text-sm font-bold tracking-wide"
          style={{ color: '#f1f5f9' }}
        >
          Drawing
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 shrink-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(159,18,57,0.4), transparent)' }} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />

      {/* ── Upload Button ── */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 shrink-0"
        style={
          uploading
            ? {
                background: 'rgba(159,18,57,0.15)',
                color: '#f9a8d4',
                cursor: 'not-allowed',
                border: '1px solid rgba(159,18,57,0.3)',
              }
            : {
                background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)',
                color: 'white',
                border: '1px solid rgba(236,72,153,0.25)',
                boxShadow: '0 2px 12px rgba(159,18,57,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
              }
        }
        onMouseEnter={(e) => {
          if (!uploading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #9f1239 0%, #881337 100%)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(159,18,57,0.55), inset 0 1px 0 rgba(255,255,255,0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!uploading) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(159,18,57,0.45), inset 0 1px 0 rgba(255,255,255,0.08)';
          }
        }}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        <span>{uploading ? 'Uploading…' : 'Upload'}</span>
      </button>

      {/* ── Drawing Selector ── */}
      {drawings.length > 0 && (
        <div className="relative flex items-center min-w-0 max-w-[240px]">
          <FileImage size={14} className="absolute left-2.5 pointer-events-none shrink-0 z-10" style={{ color: '#f472b6' }} />
          <select
            className="w-full pl-8 pr-8 py-2 text-sm appearance-none cursor-pointer outline-none truncate font-semibold transition-all rounded-xl"
            style={{
              background: 'rgba(10,2,7,0.9)',
              border: '1.5px solid rgba(159,18,57,0.35)',
              color: '#f1f5f9',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
            }}
            value={currentDrawing?.id || ''}
            onChange={(e) => setCurrentDrawingId(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(190,24,93,0.65)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(159,18,57,0.18), inset 0 1px 3px rgba(0,0,0,0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(159,18,57,0.35)';
              e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.3)';
            }}
          >
            {drawings.map((d) => (
              <option key={d.id} value={d.id} style={{ background: '#1a0309', color: '#f1f5f9' }}>{d.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#f472b6' }} />
        </div>
      )}

      {/* ── Divider ── */}
      <div className="w-px h-7 shrink-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(159,18,57,0.4), transparent)' }} />

      {/* ── Grid Toggle Group ── */}
      <div
        className="flex items-center gap-1 rounded-xl p-1 shrink-0"
        style={{
          background: 'rgba(20,4,8,0.7)',
          border: '1px solid rgba(159,18,57,0.25)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <button
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? 'Hide column markers' : 'Show column markers'}
          className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg font-semibold transition-all duration-200"
          style={
            showGrid
              ? {
                  background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)',
                  color: 'white',
                  boxShadow: '0 1px 6px rgba(159,18,57,0.45)',
                  border: '1px solid rgba(236,72,153,0.2)',
                }
              : {
                  color: 'rgba(203,213,225,0.6)',
                  border: '1px solid transparent',
                  background: 'transparent',
                }
          }
        >
          <Grid3x3 size={14} />
          <span>Columns</span>
        </button>

        <button
          onClick={() => setShowGridSettings(!showGridSettings)}
          title="Grid settings"
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200"
          style={
            showGridSettings
              ? {
                  background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)',
                  color: 'white',
                  boxShadow: '0 1px 6px rgba(159,18,57,0.45)',
                  border: '1px solid rgba(236,72,153,0.2)',
                }
              : { color: 'rgba(203,213,225,0.5)', border: '1px solid transparent', background: 'transparent' }
          }
        >
          <SlidersHorizontal size={13} />
        </button>
      </div>

      {/* ── Grid Size Popover ── */}
      {showGridSettings && (
        <div
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f0209 0%, #180412 100%)',
            border: '1.5px solid rgba(159,18,57,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(159,18,57,0.08)',
          }}
        >
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#f9a8d4' }}>Cols</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustCols(-1)}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
              style={{ border: '1px solid rgba(159,18,57,0.4)', color: '#f472b6', background: 'rgba(159,18,57,0.15)' }}
            >
              <Minus size={10} />
            </button>
            <input
              type="number"
              min={2}
              max={30}
              value={draftCols}
              onChange={(e) => { setDraftCols(Number(e.target.value)); setDirty(true); }}
              onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
              className="w-10 text-center text-sm font-bold outline-none py-0.5 rounded-lg"
              style={{ background: 'rgba(30,6,12,0.9)', border: '1px solid rgba(159,18,57,0.45)', color: '#f9a8d4' }}
            />
            <button
              onClick={() => adjustCols(1)}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
              style={{ border: '1px solid rgba(159,18,57,0.4)', color: '#f472b6', background: 'rgba(159,18,57,0.15)' }}
            >
              <Plus size={10} />
            </button>
          </div>

          <span className="text-sm font-light" style={{ color: 'rgba(244,114,182,0.4)' }}>×</span>

          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#f9a8d4' }}>Rows</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustRows(-1)}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
              style={{ border: '1px solid rgba(159,18,57,0.4)', color: '#f472b6', background: 'rgba(159,18,57,0.15)' }}
            >
              <Minus size={10} />
            </button>
            <input
              type="number"
              min={2}
              max={30}
              value={draftRows}
              onChange={(e) => { setDraftRows(Number(e.target.value)); setDirty(true); }}
              onKeyDown={(e) => e.key === 'Enter' && applyGridSize()}
              className="w-10 text-center text-sm font-bold outline-none py-0.5 rounded-lg"
              style={{ background: 'rgba(30,6,12,0.9)', border: '1px solid rgba(159,18,57,0.45)', color: '#f9a8d4' }}
            />
            <button
              onClick={() => adjustRows(1)}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
              style={{ border: '1px solid rgba(159,18,57,0.4)', color: '#f472b6', background: 'rgba(159,18,57,0.15)' }}
            >
              <Plus size={10} />
            </button>
          </div>

          <button
            onClick={applyGridSize}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={
              dirty
                ? {
                    background: 'linear-gradient(135deg, #be185d, #9f1239)',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(159,18,57,0.45)',
                    border: '1px solid transparent',
                  }
                : {
                    background: 'rgba(159,18,57,0.12)',
                    color: '#f9a8d4',
                    border: '1px solid rgba(159,18,57,0.3)',
                  }
            }
          >
            <Check size={11} />
            Apply
          </button>

          <button
            onClick={() => setShowGridSettings(false)}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'rgba(244,114,182,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(159,18,57,0.2)'; e.currentTarget.style.color = '#f472b6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(244,114,182,0.5)'; }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="w-px h-7 shrink-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(159,18,57,0.4), transparent)' }} />

      {/* ── Calibrate Button ── */}
      <button
        onClick={() => setCalibrating(!calibrating)}
        title={calibrating ? 'Done calibrating' : 'Drag columns to their exact position on this drawing'}
        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-semibold transition-all duration-200 shrink-0"
        style={
          calibrating
            ? {
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                boxShadow: '0 2px 10px rgba(245,158,11,0.45)',
                border: '1px solid rgba(245,158,11,0.3)',
              }
            : {
                background: 'rgba(20,4,8,0.7)',
                color: 'rgba(203,213,225,0.65)',
                border: '1px solid rgba(159,18,57,0.25)',
              }
        }
        onMouseEnter={(e) => {
          if (!calibrating) {
            e.currentTarget.style.borderColor = 'rgba(190,24,93,0.5)';
            e.currentTarget.style.color = '#f9a8d4';
            e.currentTarget.style.background = 'rgba(159,18,57,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!calibrating) {
            e.currentTarget.style.borderColor = 'rgba(159,18,57,0.25)';
            e.currentTarget.style.color = 'rgba(203,213,225,0.65)';
            e.currentTarget.style.background = 'rgba(20,4,8,0.7)';
          }
        }}
      >
        <Crosshair size={14} />
        <span>{calibrating ? 'Done' : 'Calibrate'}</span>
      </button>

      {/* ── Divider ── */}
      <div className="w-px h-7 shrink-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(159,18,57,0.4), transparent)' }} />

      {/* ── Fullscreen Toggle ── */}
      <button
        onClick={() => setFullscreen(!fullscreen)}
        title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        className="flex items-center justify-center w-8 h-8 rounded-xl transition-all shrink-0"
        style={{ color: 'rgba(203,213,225,0.5)', border: '1px solid transparent', background: 'transparent' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(159,18,57,0.2)';
          e.currentTarget.style.color = '#f9a8d4';
          e.currentTarget.style.borderColor = 'rgba(159,18,57,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(203,213,225,0.5)';
          e.currentTarget.style.borderColor = 'transparent';
        }}
      >
        {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>

      {/* ── Search Bar ── */}
      <div
        className="flex-1 flex items-center gap-2 max-w-sm rounded-xl px-3 py-2 transition-all"
        style={{
          background: 'rgba(10,2,7,0.8)',
          border: '1.5px solid rgba(159,18,57,0.28)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
        }}
        onFocusCapture={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(190,24,93,0.6)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(159,18,57,0.15), inset 0 1px 3px rgba(0,0,0,0.35)';
        }}
        onBlurCapture={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(159,18,57,0.28)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.35)';
        }}
      >
        <Search size={14} style={{ color: '#f472b6' }} className="shrink-0" />
        <input
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium"
          style={{ color: '#f1f5f9', caretColor: '#ec4899' }}
          placeholder="Search grid, task, engineer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: '#f472b6' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Right Actions ── */}
      <div className="ml-auto flex items-center gap-2 shrink-0">

        {/* Drawing count badge */}
        {drawings.length > 0 && (
          <div
            className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold tracking-wide"
            style={{
              background: 'rgba(20,4,8,0.8)',
              border: '1px solid rgba(159,18,57,0.3)',
              color: '#f9a8d4',
            }}
          >
            <Layers size={12} style={{ color: '#f472b6' }} />
            {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all"
          title="Notifications"
          style={{ color: 'rgba(203,213,225,0.5)', background: 'rgba(20,4,8,0.5)', border: '1px solid rgba(159,18,57,0.2)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(159,18,57,0.2)';
            e.currentTarget.style.color = '#f9a8d4';
            e.currentTarget.style.borderColor = 'rgba(159,18,57,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(20,4,8,0.5)';
            e.currentTarget.style.color = 'rgba(203,213,225,0.5)';
            e.currentTarget.style.borderColor = 'rgba(159,18,57,0.2)';
          }}
        >
          <Bell size={15} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)', boxShadow: '0 0 4px rgba(236,72,153,0.6)' }}
          />
        </button>

        {/* Divider */}
        <div className="w-px h-7 shrink-0" style={{ background: 'linear-gradient(180deg, transparent, rgba(159,18,57,0.4), transparent)' }} />

        {/* User Avatar */}
        <div
          className="flex items-center gap-2 pl-1 cursor-pointer rounded-xl px-2 py-1 transition-all"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(159,18,57,0.12)';
            e.currentTarget.style.borderColor = 'rgba(159,18,57,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
            style={{
              background: 'linear-gradient(135deg, #be185d 0%, #9f1239 100%)',
              boxShadow: '0 0 0 2px rgba(159,18,57,0.5), 0 2px 8px rgba(159,18,57,0.4)',
            }}
          >
            AK
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold leading-tight" style={{ color: '#f1f5f9' }}>Ashok K.</div>
            <div className="text-[10px] leading-tight font-semibold" style={{ color: '#f472b6' }}>Site Engineer</div>
          </div>
          <ChevronDown size={12} style={{ color: '#f472b6' }} />
        </div>
      </div>
    </div>
  );
}
