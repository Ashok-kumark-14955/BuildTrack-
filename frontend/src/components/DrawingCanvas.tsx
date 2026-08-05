import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Group, Text } from 'react-konva';
import Konva from 'konva';
import { ImagePlus, Minus, Plus, Scan, Crosshair, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../AppContext';
import { fileUrl, DrawingsAPI } from '../api';
import { STATUS_COLORS } from '../types';

// ─── Custom hook: load an image with cleanup ──────────────────────────────────
function useImage(url: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => { if (!cancelled) setImg(image); };
    image.onerror = () => { if (!cancelled) setImg(null); };
    image.src = url;
    return () => { cancelled = true; };
  }, [url]);
  return img;
}

// ─── Pure helper (stable reference, never recreated) ─────────────────────────
function gridLabel(col: number, row: number) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

// ─── Lighten a hex color for a subtle radial-gradient highlight ───────────────
function lighten(hex: string, amount = 0.35) {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const num = parseInt(m, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The drawing engine recognizes structural elements generically by
 * { id, type, geometry }. Columns are points, beams are line segments.
 * A future element (slab, wall) just needs its own geometry generator
 * and hotspot renderer plugged into the two render blocks below —
 * the selection/status/task-linking model already works for any type.
 */

// ─── A single column: an independent clickable point hotspot ────────────────
interface ColumnProps {
  id: string;
  code: string;
  label: string; // custom display label (may equal code if not overridden)
  x: number;
  y: number;
  radius: number;
  status: string;
  isHovered: boolean;
  isSelected: boolean;
  calibrating: boolean;
  scale: number;
  sameRowYs: number[]; // y of other columns sharing this column's row (snap target for straight rows)
  sameColXs: number[]; // x of other columns sharing this column's col (snap target for straight columns)
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onReposition: (code: string, x: number, y: number) => void;
  onDoubleClick: (code: string) => void;
}

const SNAP_TOLERANCE_PX = 8; // screen pixels

const ColumnHotspot = memo(function ColumnHotspot({
  id, code, label, x, y, radius, status, isHovered, isSelected, calibrating, scale, sameRowYs, sameColXs,
  onSelect, onHover, onReposition, onDoubleClick,
}: ColumnProps) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS['No Task'];
  const isEmpty = status === 'No Task';
  const r = isHovered || isSelected ? radius * 1.22 : radius;
  const [snapGuide, setSnapGuide] = useState<{ axis: 'x' | 'y'; value: number } | null>(null);

  return (
    <Group
      x={x}
      y={y}
      draggable={calibrating}
      onDragStart={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.draggable(false);
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const tol = SNAP_TOLERANCE_PX / scale;
        let nx = node.x();
        let ny = node.y();
        const snapX = sameColXs.find((sx) => Math.abs(nx - sx) < tol);
        const snapY = sameRowYs.find((sy) => Math.abs(ny - sy) < tol);
        if (snapX !== undefined) nx = snapX;
        if (snapY !== undefined) ny = snapY;
        node.x(nx);
        node.y(ny);
        if (snapX !== undefined) setSnapGuide({ axis: 'x', value: snapX });
        else if (snapY !== undefined) setSnapGuide({ axis: 'y', value: snapY });
        else setSnapGuide(null);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.draggable(false);
        setSnapGuide(null);
        onReposition(code, e.target.x(), e.target.y());
      }}
      onClick={(e) => { e.cancelBubble = true; onSelect(id); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(id); }}
      onDblClick={(e) => { e.cancelBubble = true; if (!calibrating) onDoubleClick(code); }}
      onMouseEnter={(e) => {
        onHover(id);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = calibrating ? 'grab' : 'pointer';
      }}
      onMouseLeave={(e) => {
        onHover(null);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
    >
      {snapGuide && (
        <Line
          points={
            snapGuide.axis === 'x'
              ? [0, -4000, 0, 4000]
              : [-4000, 0, 4000, 0]
          }
          stroke="#22d3ee"
          strokeWidth={1.5 / scale}
          dash={[6 / scale, 4 / scale]}
          opacity={0.9}
          listening={false}
        />
      )}
      {isSelected && (
        <>
          <Circle radius={r + 10} stroke="#3b82f6" strokeWidth={1.5} opacity={0.25} />
          <Circle radius={r + 5} stroke="#2563eb" strokeWidth={2} opacity={0.7} shadowColor="#2563eb" shadowBlur={6} shadowOpacity={0.5} />
        </>
      )}
      {calibrating && (
        <>
          <Circle
            radius={r + 7}
            stroke="#22d3ee"
            strokeWidth={1.75}
            dash={[5, 4]}
            opacity={0.85}
            shadowColor="#22d3ee"
            shadowBlur={5}
            shadowOpacity={0.35}
          />
          {/* CAD-style crosshair ticks */}
          <Line points={[-(r + 14), 0, -(r + 4), 0]} stroke="#22d3ee" strokeWidth={1.25} opacity={0.9} listening={false} />
          <Line points={[r + 4, 0, r + 14, 0]} stroke="#22d3ee" strokeWidth={1.25} opacity={0.9} listening={false} />
          <Line points={[0, -(r + 14), 0, -(r + 4)]} stroke="#22d3ee" strokeWidth={1.25} opacity={0.9} listening={false} />
          <Line points={[0, r + 4, 0, r + 14]} stroke="#22d3ee" strokeWidth={1.25} opacity={0.9} listening={false} />
        </>
      )}
      <Circle
        radius={r}
        fillRadialGradientStartPoint={{ x: -r * 0.35, y: -r * 0.35 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={r * 1.15}
        fillRadialGradientColorStops={
          isEmpty
            ? [0, '#f1f5f9', 1, '#dbe2ea']
            : [0, lighten(color), 1, color]
        }
        opacity={isEmpty ? 0.9 : 1}
        stroke={isHovered || isSelected ? '#1e293b' : 'rgba(15,23,42,0.45)'}
        strokeWidth={isHovered || isSelected ? 2 : 1}
        shadowColor="black"
        shadowBlur={isHovered ? 10 : 5}
        shadowOpacity={isHovered ? 0.32 : 0.22}
        shadowOffsetY={2}
      />
      {/* Show custom label above, default code inside */}
      <Text
        text={label}
        width={r * 2}
        height={r * 2}
        offsetX={r}
        offsetY={r}
        align="center"
        verticalAlign="middle"
        fontSize={Math.max(9, r * 0.62)}
        fontStyle="bold"
        fontFamily={calibrating ? "'Courier New', monospace" : 'sans-serif'}
        fill={isEmpty ? '#475569' : 'white'}
        listening={false}
      />
      {/* If label was customised, show the original code as tiny subtitle */}
      {label !== code && (
        <Text
          text={code}
          width={r * 2.8}
          offsetX={r * 1.4}
          y={r * 0.62}
          align="center"
          fontSize={Math.max(7, r * 0.42)}
          fill={isEmpty ? '#94a3b8' : 'rgba(255,255,255,0.7)'}
          listening={false}
        />
      )}
    </Group>
  );
});

// ─── A single beam: an independent clickable line hotspot ───────────────────
interface BeamProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  status: string;
  isHovered: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const BeamHotspot = memo(function BeamHotspot({
  id, x1, y1, x2, y2, thickness, status, isHovered, isSelected, onSelect, onHover,
}: BeamProps) {
  const isEmpty = status === 'No Task';
  const color = isEmpty ? '#22d3ee' : (STATUS_COLORS[status] ?? STATUS_COLORS['No Task']);
  const strokeWidth = isHovered || isSelected ? thickness * 1.6 : thickness;

  return (
    <Group
      onClick={(e) => { e.cancelBubble = true; onSelect(id); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(id); }}
      onMouseEnter={(e) => {
        onHover(id);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        onHover(null);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
    >
      {isSelected && (
        <Line points={[x1, y1, x2, y2]} stroke="#2563eb" strokeWidth={strokeWidth + 6} opacity={0.3} lineCap="round" listening={false} />
      )}
      <Line
        points={[x1, y1, x2, y2]}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={isEmpty ? 0.7 : 0.95}
        lineCap="round"
        hitStrokeWidth={Math.max(18, strokeWidth * 3)}
        shadowColor="black"
        shadowBlur={isHovered ? 6 : 0}
        shadowOpacity={0.2}
      />
    </Group>
  );
});

interface Props {
  showGrid: boolean;
  fullscreen: boolean;
  calibrating: boolean;
}

export default function DrawingCanvas({ showGrid, fullscreen, calibrating }: Props) {
  const {
    currentDrawing,
    tasksForCurrentDrawing,
    setSelectedElementId,
    selectedElementId,
    hoveredElementId,
    setHoveredElementId,
    focusElementRequest,
    requestFocusElement,
    patchDrawingColumnPositions,
    resetDrawingColumnPositions,
    patchDrawingColumnLabel,
  } = useApp();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // ── Rename modal state ──
  const [renamingCode, setRenamingCode] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const imageNodeRef = useRef<Konva.Image | null>(null);

  const image = useImage(currentDrawing ? fileUrl(currentDrawing.fileUrl) : undefined);

  // Re-cache whenever the image changes so the Brighten filter is applied correctly.
  // We use a small timeout to ensure the Konva layer has painted the new image first.
  useEffect(() => {
    if (!image) return;
    const timer = setTimeout(() => {
      const node = imageNodeRef.current;
      if (!node) return;
      node.cache();
      node.getLayer()?.batchDraw();
    }, 60);
    return () => clearTimeout(timer);
  }, [image]);

  // ── Resize observer ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Live refs (declared early so fitToScreen and handleWheel can use them) ──
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);
  const imageRef = useRef(image);
  useEffect(() => { imageRef.current = image; }, [image]);

  // ── Fit to screen (stable — reads current values via refs) ──
  const fitToScreen = useCallback(() => {
    const img = imageRef.current;
    const sz = sizeRef.current;
    if (!img || !sz.width || !sz.height) return;
    const s = Math.min(sz.width / img.width, sz.height / img.height) * 0.95;
    const newPos = {
      x: (sz.width - img.width * s) / 2,
      y: (sz.height - img.height * s) / 2,
    };
    setScale(s);
    setPos(newPos);
    scaleRef.current = s;
    posRef.current = newPos;
  }, []); // stable — all reads go through refs

  // Auto-fit whenever the image changes (new drawing selected) OR container resizes
  useEffect(() => {
    if (!image || !size.width || !size.height) return;
    const s = Math.min(size.width / image.width, size.height / image.height) * 0.95;
    const newPos = {
      x: (size.width - image.width * s) / 2,
      y: (size.height - image.height * s) / 2,
    };
    setScale(s);
    setPos(newPos);
    scaleRef.current = s;
    posRef.current = newPos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, size.width, size.height]);

  // ── Column positions: persisted override, else evenly spaced across the image ──
  const columnElements = useMemo(() => {
    if (!currentDrawing || !image) return [];
    const cols = currentDrawing.gridCols;
    const rows = currentDrawing.gridRows;
    const overrides = currentDrawing.columnPositions || {};
    const points: { id: string; code: string; x: number; y: number; row: number; col: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = gridLabel(col, row);
        const override = overrides[code];
        const fx = override ? override.x : cols > 1 ? col / (cols - 1) : 0.5;
        const fy = override ? override.y : rows > 1 ? row / (rows - 1) : 0.5;
        points.push({ id: `Column_${code}`, code, x: fx * image.width, y: fy * image.height, row, col });
      }
    }
    return points;
  }, [currentDrawing, image]);

  // ── Snap targets: for each column, the x/y of its row/column neighbors (for straight-line drag snapping) ──
  const snapTargets = useMemo(() => {
    const byRow = new Map<number, number[]>(); // row -> all y values in that row
    const byCol = new Map<number, number[]>(); // col -> all x values in that col
    for (const p of columnElements) {
      if (!byRow.has(p.row)) byRow.set(p.row, []);
      byRow.get(p.row)!.push(p.y);
      if (!byCol.has(p.col)) byCol.set(p.col, []);
      byCol.get(p.col)!.push(p.x);
    }
    return { byRow, byCol };
  }, [columnElements]);

  // ── Beams: derived automatically by connecting adjacent columns — no separate storage needed ──
  const beamElements = useMemo(() => {
    if (!currentDrawing || columnElements.length === 0) return [];
    const cols = currentDrawing.gridCols;
    const rows = currentDrawing.gridRows;
    const byCode = new Map(columnElements.map((c) => [c.code, c]));
    const beams: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = gridLabel(col, row);
        const p = byCode.get(code);
        if (!p) continue;
        if (col < cols - 1) {
          const rightCode = gridLabel(col + 1, row);
          const right = byCode.get(rightCode);
          if (right) beams.push({ id: `Beam_${code}_${rightCode}`, x1: p.x, y1: p.y, x2: right.x, y2: right.y });
        }
        if (row < rows - 1) {
          const belowCode = gridLabel(col, row + 1);
          const below = byCode.get(belowCode);
          if (below) beams.push({ id: `Beam_${code}_${belowCode}`, x1: p.x, y1: p.y, x2: below.x, y2: below.y });
        }
      }
    }
    return beams;
  }, [currentDrawing, columnElements]);

  // ── Combined lookup for focusing/zooming to any element by id (column point or beam midpoint) ──
  const elementPointById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    columnElements.forEach((c) => map.set(c.id, { x: c.x, y: c.y }));
    beamElements.forEach((b) => map.set(b.id, { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 }));
    return map;
  }, [columnElements, beamElements]);

  const elementPointByIdRef = useRef(elementPointById);
  useEffect(() => { elementPointByIdRef.current = elementPointById; }, [elementPointById]);

  const hotspotRadius = useMemo(() => {
    if (!currentDrawing || !image) return 16;
    const cellW = image.width / currentDrawing.gridCols;
    const cellH = image.height / currentDrawing.gridRows;
    return Math.max(8, Math.min(cellW, cellH) * 0.16);
  }, [currentDrawing, image]);

  const beamThickness = useMemo(() => Math.max(4, hotspotRadius * 0.32), [hotspotRadius]);

  // ── Focus an element from an EXTERNAL request ONLY (e.g. Task List "Locate" button) ──
  // Direct taps on the canvas (handleSelect) never set focusElementRequest,
  // so the drawing position is never changed by a tap — only by the Task List button.
  useEffect(() => {
    if (!focusElementRequest || !currentDrawing || !image) return;
    const point = elementPointById.get(focusElementRequest);
    if (!point) { requestFocusElement(null); return; }
    // Zoom to the element only when the request came from outside (Task List).
    const targetScale = Math.min(3, Math.max(scaleRef.current * 1.6, 1.8));
    const newPos = {
      x: sizeRef.current.width / 2 - point.x * targetScale,
      y: sizeRef.current.height / 2 - point.y * targetScale,
    };
    setScale(targetScale);
    setPos(newPos);
    scaleRef.current = targetScale;
    posRef.current = newPos;
    setSelectedElementId(focusElementRequest);
    requestFocusElement(null);
  // size intentionally omitted — we read it via sizeRef to avoid re-firing on resize
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusElementRequest, currentDrawing, image, elementPointById, setSelectedElementId, requestFocusElement]);


  // ── Stable zoom callbacks ──
  const zoomIn = useCallback(() => setScale((s) => Math.min(6, s * 1.2)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.1, s / 1.2)), []);

  // ── Stable drag end handler (panning the whole stage) ──
  // Only update pos when the stage itself was dragged — not when a column marker was dragged.
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // e.target is the Stage node when stage-drag ends; it's a Group node when a marker drag ends.
    if (e.target === e.target.getStage()) {
      setPos({ x: e.target.x(), y: e.target.y() });
    }
  }, []);

  // ── Stable hotspot handlers (kept identity-stable so memoized hotspots don't re-render on pan/zoom) ──
  // NOTE: tapping a grid only selects it — no zoom or pan. Use the Task List "locate" button for focus zoom.
  const handleSelect = useCallback((id: string) => {
    setSelectedElementId(id);
  }, [setSelectedElementId]);
  const handleHover = useCallback((id: string | null) => setHoveredElementId(id), [setHoveredElementId]);
  const handleBackgroundClick = useCallback(() => setSelectedElementId(null), [setSelectedElementId]);

  // ── Persist a manually-calibrated column position (beams follow automatically) ──
  // Uses an optimistic local patch so the image never unmounts/reloads on each drag.
  const handleReposition = useCallback(async (code: string, px: number, py: number) => {
    if (!currentDrawing || !image) return;
    const x = Math.min(1, Math.max(0, px / image.width));
    const y = Math.min(1, Math.max(0, py / image.height));
    // Update local state immediately — no full refresh, no image flicker
    patchDrawingColumnPositions(currentDrawing.id, code, x, y);
    // Fire-and-forget persist to backend
    DrawingsAPI.update(currentDrawing.id, { columnPositions: { [code]: { x, y } } }).catch(() => {
      // best-effort; local state already reflects the drag
    });
    toast.success(`${code} position saved`, { id: `calib-${code}`, duration: 1400, icon: '📍' });
  }, [currentDrawing, image, patchDrawingColumnPositions]);

  const handleResetCalibration = useCallback(async () => {
    if (!currentDrawing) return;
    try {
      await resetDrawingColumnPositions(currentDrawing.id);
      toast.success('Column positions reset to default grid');
    } catch {
      toast.error('Failed to reset positions');
    }
  }, [currentDrawing, resetDrawingColumnPositions]);

  // ── Arrow-key nudge: fine-tune the selected column's position while calibrating ──
  const columnElementsRef = useRef(columnElements);
  useEffect(() => { columnElementsRef.current = columnElements; }, [columnElements]);
  useEffect(() => {
    if (!calibrating) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const selectedId = selectedElementId;
      if (!selectedId || !selectedId.startsWith('Column_')) return;
      const point = columnElementsRef.current.find((p) => p.id === selectedId);
      if (!point) return;
      e.preventDefault();
      const step = (e.shiftKey ? 10 : 1) / scaleRef.current;
      let { x, y } = point;
      if (e.key === 'ArrowUp') y -= step;
      else if (e.key === 'ArrowDown') y += step;
      else if (e.key === 'ArrowLeft') x -= step;
      else if (e.key === 'ArrowRight') x += step;
      handleReposition(point.code, x, y);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [calibrating, selectedElementId, handleReposition]);

  // ── Column rename ──
  const openRename = useCallback((code: string) => {
    if (!currentDrawing) return;
    const existing = currentDrawing.columnLabels?.[code] ?? code;
    setRenamingCode(code);
    setRenameValue(existing);
    // Focus the input after render
    setTimeout(() => renameInputRef.current?.select(), 30);
  }, [currentDrawing]);

  const commitRename = useCallback(async () => {
    if (!renamingCode || !currentDrawing) return;
    const trimmed = renameValue.trim();
    const original = renamingCode;
    setRenamingCode(null);
    await patchDrawingColumnLabel(currentDrawing.id, original, trimmed);
    if (trimmed && trimmed !== original) {
      toast.success(`${original} renamed to "${trimmed}"`, { icon: '✏️', duration: 2000 });
    } else if (!trimmed) {
      toast.success(`${original} label cleared`, { icon: '✏️', duration: 1600 });
    }
  }, [renamingCode, renameValue, currentDrawing, patchDrawingColumnLabel]);

  const cancelRename = useCallback(() => setRenamingCode(null), []);

  // ── Compute per-element status (highest-priority active task wins) ──
  const statusByElement = useMemo<Record<string, string>>(() => {
    const priorityOrder = ['Blocked', 'Delayed', 'In Progress', 'Assigned', 'Completed'];
    const result: Record<string, string> = {};
    for (const t of tasksForCurrentDrawing) {
      const existing = result[t.elementId];
      if (!existing || priorityOrder.indexOf(t.status) < priorityOrder.indexOf(existing)) {
        result[t.elementId] = t.status;
      }
    }
    return result;
  }, [tasksForCurrentDrawing]);

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (!currentDrawing) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center text-center max-w-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
            <ImagePlus size={24} className="text-blue-500" />
          </div>
          <div className="text-slate-700 font-semibold mb-1">No drawing loaded</div>
          <div className="text-sm text-slate-400">Upload a drawing to start mapping tasks on it</div>
        </div>
      </div>
    );
  }

  // ─── Canvas ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={
        calibrating
          ? {
              backgroundColor: '#000000',
              backgroundImage: `
                linear-gradient(rgba(0,255,255,0.14) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,255,255,0.14) 1px, transparent 1px),
                linear-gradient(rgba(0,255,255,0.28) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,255,255,0.28) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
            }
          : {
              backgroundColor: '#000000',
              backgroundImage: `
                linear-gradient(rgba(0,255,255,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,255,255,0.06) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px, 40px 40px',
            }
      }
      // Re-focus the canvas container when the mouse enters so that scroll
      // wheel events are delivered here even after the user typed in a sidebar input.
      tabIndex={-1}
      onMouseEnter={() => containerRef.current?.focus({ preventScroll: true })}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        draggable={!calibrating}
        onDragEnd={handleDragEnd}
        onClick={handleBackgroundClick}
        onTap={handleBackgroundClick}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={image.width}
              height={image.height}
              listening={false}
              filters={[Konva.Filters.Invert, Konva.Filters.Contrast]}
              contrast={15}
              ref={(node) => {
                imageNodeRef.current = node;
                if (node && image) {
                  setTimeout(() => {
                    node.cache();
                    node.getLayer()?.batchDraw();
                  }, 60);
                }
              }}
            />
          )}

          {showGrid && image && !calibrating && beamElements.map((b) => (
            <BeamHotspot
              key={b.id}
              id={b.id}
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              thickness={beamThickness}
              status={statusByElement[b.id] ?? 'No Task'}
              isHovered={hoveredElementId === b.id}
              isSelected={selectedElementId === b.id}
              onSelect={handleSelect}
              onHover={handleHover}
            />
          ))}

          {showGrid && image && columnElements.map(({ id, code, x, y, row, col }) => {
            const label = currentDrawing.columnLabels?.[code] || code;
            const sameRowYs = (snapTargets.byRow.get(row) ?? []).filter((v) => v !== y);
            const sameColXs = (snapTargets.byCol.get(col) ?? []).filter((v) => v !== x);
            return (
              <ColumnHotspot
                key={id}
                id={id}
                code={code}
                label={label}
                x={x}
                y={y}
                radius={hotspotRadius}
                status={statusByElement[id] ?? 'No Task'}
                isHovered={hoveredElementId === id}
                isSelected={selectedElementId === id}
                calibrating={calibrating}
                scale={scale}
                sameRowYs={sameRowYs}
                sameColXs={sameColXs}
                onSelect={handleSelect}
                onHover={handleHover}
                onReposition={handleReposition}
                onDoubleClick={openRename}
              />
            );
          })}
        </Layer>
      </Stage>

      {calibrating && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl shadow-elevated border px-4 py-2.5"
          style={{ background: 'rgba(255,251,235,0.92)', backdropFilter: 'blur(10px)', borderColor: 'rgba(245,158,11,0.35)' }}
        >
          <div className="flex items-center gap-2 text-amber-700">
            <Crosshair size={15} className="shrink-0" />
            <span className="text-xs font-medium leading-snug">
              Calibration mode — drag onto position (snaps to row/column). Select + arrow keys to nudge (Shift = 10px). Beams follow automatically.
              <span className="ml-1.5 font-bold tabular-nums">
                {Object.keys(currentDrawing.columnPositions || {}).length}/{columnElements.length} calibrated
              </span>
            </span>
          </div>
          <div className="w-px h-5 bg-amber-300/50 shrink-0" />
          <button
            onClick={handleResetCalibration}
            title="Reset all column positions to the default evenly-spaced grid"
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors shrink-0"
          >
            <RotateCcw size={11} /> Reset All
          </button>
        </div>
      )}

      {/* ── Zoom Controls ── */}
      <div
        className="absolute bottom-5 right-5 flex flex-col gap-1 rounded-2xl p-1.5 shadow-elevated border"
        style={{ background: 'rgba(24,24,27,0.88)', backdropFilter: 'blur(12px)', borderColor: 'rgba(63,63,70,0.8)' }}
      >
        <button onClick={zoomIn} className="icon-btn w-9 h-9 rounded-xl hover:bg-rose-950/40 hover:text-rose-400 transition-colors" title="Zoom in">
          <Plus size={16} />
        </button>
        <div className="h-px mx-1.5" style={{ backgroundColor: '#3f3f46' }} />
        <button onClick={zoomOut} className="icon-btn w-9 h-9 rounded-xl hover:bg-rose-950/40 hover:text-rose-400 transition-colors" title="Zoom out">
          <Minus size={16} />
        </button>
        <div className="h-px mx-1.5" style={{ backgroundColor: '#3f3f46' }} />
        <button onClick={fitToScreen} className="icon-btn w-9 h-9 rounded-xl hover:bg-rose-950/40 hover:text-rose-400 transition-colors" title="Fit to screen">
          <Scan size={15} />
        </button>
      </div>

      {/* ── Zoom Level Indicator ── */}
      <div
        className="absolute bottom-5 left-5 rounded-xl shadow-card border px-3 py-1.5 text-xs font-semibold text-slate-300 tabular-nums"
        style={{ background: 'rgba(24,24,27,0.88)', backdropFilter: 'blur(12px)', borderColor: 'rgba(63,63,70,0.8)' }}
      >
        {Math.round(scale * 100)}%
      </div>

      {/* ── Column Rename Modal ── */}
      {renamingCode && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
          onClick={cancelRename}
        >
          <div
            className="rounded-2xl shadow-2xl p-5 w-80"
            style={{ background: 'white', border: '1px solid rgba(236,72,153,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-slate-800">Rename Column</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(236,72,153,0.1)', color: '#be185d' }}
              >
                {renamingCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Enter a custom label for this column. Leave blank to reset to the default grid code.
            </p>
            <input
              ref={renameInputRef}
              className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none transition-all"
              style={{
                border: '1.5px solid rgba(236,72,153,0.3)',
                background: '#fdf2f8',
                color: '#be185d',
                caretColor: '#ec4899',
              }}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') cancelRename();
              }}
              placeholder={renamingCode}
              maxLength={12}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={commitRename}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #ec4899, #be185d)',
                  boxShadow: '0 2px 8px rgba(236,72,153,0.3)',
                }}
              >
                Rename
              </button>
              <button
                onClick={cancelRename}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
