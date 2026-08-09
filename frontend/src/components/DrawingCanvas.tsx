import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Group, Text } from 'react-konva';
import Konva from 'konva';
// Ensure Konva filter is available
import 'konva/lib/filters/Invert';
import { ImagePlus, Minus, Plus, Scan, Crosshair, RotateCcw, Wand2, ChevronDown, ChevronUp, Trash2, Link, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../AppContext';
import { DrawingsAPI, drawingFileProxyUrl } from '../api';
import { resolveFileUrl } from '../utils/imageStorage';
import { STATUS_COLORS } from '../types';
import { detectColumnPositions } from '../utils/autoCalibrate';

// ─── Custom hook: load an image with cleanup (supports idb:// keys) ──────────
// Tries the given URL first; if that fails AND a fallback URL is provided,
// attempts the fallback (e.g. proxy URL fails → try direct Stratus URL).
function useImage(url: string | undefined, fallbackUrl?: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) { setImg(null); return; }
    let cancelled = false;

    /**
     * Try to load `src` as an HTMLImageElement. Resolves with `true` on success,
     * `false` on error. Never rejects.
     *
     * ⚠️  Do NOT set crossOrigin for pre-signed S3/Stratus URLs or data: URLs.
     *    Adding crossOrigin sends an Origin header which most S3 presigned-URL
     *    policies reject (CORS preflight fails → image.onerror fires → blank canvas).
     *    For same-origin URLs (e.g. /uploads/…) CORS is not needed either.
     */
    const loadSrc = (src: string): Promise<boolean> =>
      new Promise((resolve) => {
        const image = new window.Image();
        image.onload = () => {
          if (cancelled) { resolve(false); return; }
          const finish = () => {
            if (cancelled) { resolve(false); return; }
            setImg(image);
            resolve(true);
          };
          if (typeof image.decode === 'function') {
            image.decode().then(finish).catch(() => finish());
          } else {
            finish();
          }
        };
        image.onerror = () => {
          if (!cancelled) console.error('[useImage] LOAD FAILED — src=', src.slice(0, 120));
          resolve(false);
        };
        image.src = src;
      });

    (async () => {
      // Resolve idb:// → data URL before creating the Image element
      const src = await resolveFileUrl(url);
      if (cancelled || !src) return;

      // Use a LOCAL boolean to track success — never read the React `img` state
      // here; inside an async closure it always has the stale initial value (null).
      // Using stale state caused the fallback to fire even after a successful primary
      // load, replacing the good image with a broken expired-Stratus-URL response.
      const ok = await loadSrc(src);
      if (ok || !fallbackUrl || cancelled) return;

      // Primary failed — try fallback (e.g. direct Stratus signed URL when proxy is down)
      const fallbackSrc = await resolveFileUrl(fallbackUrl);
      if (fallbackSrc && !cancelled) {
        console.warn('[useImage] primary failed — trying fallback URL');
        await loadSrc(fallbackSrc);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, fallbackUrl]);

  return img;
}

// ─── Pure helper (stable reference, never recreated) ─────────────────────────
function gridLabel(col: number, row: number) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
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
        fill={isEmpty ? '#334155' : color}
        opacity={isHovered || isSelected ? 1 : 0.9}
        stroke={isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.55)'}
        strokeWidth={isHovered || isSelected ? 2 : 1.25}
        shadowColor="black"
        shadowBlur={isHovered ? 10 : 4}
        shadowOpacity={isHovered ? 0.45 : 0.25}
        shadowOffsetY={1}
      />
      {/* Grid label floats above the circle — same colour as the circle fill */}
      <Text
        text={label}
        width={r * 4}
        offsetX={r * 0.5}
        y={-(r + Math.max(12, r * 1.2))}
        align="center"
        fontSize={Math.max(15, r * 1.35)}
        fontStyle="bold"
        fontFamily={calibrating ? "'Courier New', monospace" : 'sans-serif'}
        fill={isEmpty ? '#64748b' : color}
        opacity={1}
        listening={false}
      />
      {/* If label was customised, show the original code as tiny subtitle above */}
      {label !== code && (
        <Text
          text={code}
          width={r * 3}
          offsetX={r * 1.5}
          y={-(r + Math.max(10, r * 0.85)) + Math.max(8, r * 0.58) + 1}
          align="center"
          fontSize={Math.max(6, r * 0.38)}
          fill={isEmpty ? '#94a3b8' : color}
          listening={false}
        />
      )}
    </Group>
  );
});

// ─── Grid segment drag handle (per-cell boundary) ───────────────────────────
// Each handle sits on the midpoint of ONE cell edge (e.g. the right edge of B2).
// Dragging it moves ONLY the x (for horizontal) or y (for vertical) of the two
// nodes bounding that specific cell edge — all other nodes are untouched.
//
// Visual design:
//  • The handle line spans only the cell height/width (not the full row/column).
//  • A grab arrow/diamond appears at the midpoint on hover.
//  • Dragging shows a live amber line + ghost position of both endpoints.
//  • A small label (e.g. "B↔C | row 2") appears while dragging for clarity.

interface SegmentHandleProps {
  /** 'h' = vertical divider between left and right columns in same row (drag left/right)
   *  'v' = horizontal divider between upper and lower rows in same col (drag up/down) */
  axis: 'h' | 'v';
  /** The two grid codes this boundary sits between, e.g. 'B2' and 'C2' */
  codeA: string;
  codeB: string;
  /** Position of codeA node (image px) */
  xA: number;
  yA: number;
  /** Position of codeB node (image px) */
  xB: number;
  yB: number;
  /**
   * For 'h' handles: the y-span of the cell (from the row above to the row below).
   * For 'v' handles: the x-span of the cell (from the col to the left to the col to the right).
   * Used to draw a handle line that exactly covers the cell edge.
   */
  cellSpanStart: number; // image px — start of perpendicular span
  cellSpanEnd: number;   // image px — end of perpendicular span
  scale: number;
  onDragMove: (axis: 'h' | 'v', codeA: string, codeB: string, delta: number) => void;
  onDragEnd: (axis: 'h' | 'v', codeA: string, codeB: string) => void;
}

const HANDLE_HIT_WIDTH = 18; // hit area in screen px

const GridSegmentHandle = memo(function GridSegmentHandle({
  axis, codeA, codeB,
  xA, yA, xB, yB,
  cellSpanStart, cellSpanEnd,
  scale, onDragMove, onDragEnd,
}: SegmentHandleProps) {
  const dragStartRef = useRef<{ nodeX: number; nodeY: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Midpoint of the two bounding nodes
  const mx = (xA + xB) / 2;
  const my = (yA + yB) / 2;

  // The handle line is drawn perpendicular to the drag axis,
  // spanning exactly the cell edge (cellSpanStart → cellSpanEnd).
  // axis='h' → vertical line at x=mx, spanning y from cellSpanStart to cellSpanEnd.
  // axis='v' → horizontal line at y=my, spanning x from cellSpanStart to cellSpanEnd.
  const linePoints = axis === 'h'
    ? [mx, cellSpanStart, mx, cellSpanEnd]
    : [cellSpanStart, my, cellSpanEnd, my];

  const strokeW = (hovered || dragging ? 2.8 : 1.6) / scale;
  const hitW = HANDLE_HIT_WIDTH / scale;

  // Invisible hit-area line (same geometry but thick)
  const hitPoints = axis === 'h'
    ? [mx, cellSpanStart, mx, cellSpanEnd]
    : [cellSpanStart, my, cellSpanEnd, my];

  // Arrow indicator size
  const arrowSize = 7 / scale;

  return (
    <Group
      draggable
      onDragStart={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.draggable(false);
        dragStartRef.current = { nodeX: e.target.x(), nodeY: e.target.y() };
        setDragging(true);
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        if (!dragStartRef.current) return;
        if (axis === 'h') {
          // Only horizontal drag (left/right)
          const delta = node.x() - dragStartRef.current.nodeX;
          // Reset node position — we drive positions via state, not Konva transform
          node.x(dragStartRef.current.nodeX);
          node.y(dragStartRef.current.nodeY);
          onDragMove('h', codeA, codeB, delta);
          dragStartRef.current.nodeX += delta;
        } else {
          // Only vertical drag (up/down)
          const delta = node.y() - dragStartRef.current.nodeY;
          node.x(dragStartRef.current.nodeX);
          node.y(dragStartRef.current.nodeY);
          onDragMove('v', codeA, codeB, delta);
          dragStartRef.current.nodeY += delta;
        }
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        if (stage) stage.draggable(false);
        e.target.x(0);
        e.target.y(0);
        dragStartRef.current = null;
        setDragging(false);
        onDragEnd(axis, codeA, codeB);
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = axis === 'h' ? 'ew-resize' : 'ns-resize';
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
    >
      {/* Invisible thick hit area */}
      <Line
        points={hitPoints}
        stroke="transparent"
        strokeWidth={hitW}
        listening={true}
      />

      {/* Cell edge — subtle dashed when idle, solid amber when active */}
      <Line
        points={linePoints}
        stroke={
          dragging
            ? '#f59e0b'
            : hovered
              ? '#fbbf24'
              : 'rgba(34,211,238,0.5)'
        }
        strokeWidth={strokeW}
        dash={dragging || hovered ? undefined : [5 / scale, 4 / scale]}
        shadowColor={hovered || dragging ? '#f59e0b' : '#22d3ee'}
        shadowBlur={hovered || dragging ? 10 : 3}
        shadowOpacity={hovered || dragging ? 0.75 : 0.25}
        listening={false}
      />

      {/* Midpoint grab indicator — double-headed arrow */}
      {(hovered || dragging) && (() => {
        const color = dragging ? '#f59e0b' : '#fbbf24';
        const as = arrowSize;
        // For 'h' axis: ← → arrows along x at (mx, my)
        // For 'v' axis: ↑ ↓ arrows along y at (mx, my)
        const arrowPoints = axis === 'h'
          ? [
              // left arrow head
              mx - as, my,  mx - as * 0.4, my - as * 0.55,
              mx - as, my,  mx - as * 0.4, my + as * 0.55,
              mx - as, my,
              // right arrow head
              mx + as, my,  mx + as * 0.4, my - as * 0.55,
              mx + as, my,  mx + as * 0.4, my + as * 0.55,
              mx + as, my,
            ]
          : [
              // up arrow head
              mx, my - as,  mx - as * 0.55, my - as * 0.4,
              mx, my - as,  mx + as * 0.55, my - as * 0.4,
              mx, my - as,
              // down arrow head
              mx, my + as,  mx - as * 0.55, my + as * 0.4,
              mx, my + as,  mx + as * 0.55, my + as * 0.4,
              mx, my + as,
            ];
        return (
          <>
            {/* Center circle */}
            <Line
              points={arrowPoints}
              stroke={color}
              strokeWidth={1.5 / scale}
              listening={false}
            />
            {/* Connecting shaft between the two arrow heads */}
            <Line
              points={axis === 'h' ? [mx - as * 0.9, my, mx + as * 0.9, my] : [mx, my - as * 0.9, mx, my + as * 0.9]}
              stroke={color}
              strokeWidth={1.2 / scale}
              listening={false}
            />
            {/* Filled center dot */}
            <Line
              points={[
                mx - 3 / scale, my,
                mx, my - 3 / scale,
                mx + 3 / scale, my,
                mx, my + 3 / scale,
                mx - 3 / scale, my,
              ]}
              closed
              fill={color}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={0.7 / scale}
              opacity={0.95}
              listening={false}
            />
            {/* Label: "B↔C row2" while dragging */}
            {dragging && (
              <Text
                text={axis === 'h' ? `${codeA}↔${codeB}` : `${codeA}↕${codeB}`}
                x={mx + 6 / scale}
                y={my - 8 / scale}
                fontSize={10 / scale}
                fontStyle="bold"
                fill="#fbbf24"
                shadowColor="black"
                shadowBlur={4 / scale}
                shadowOpacity={0.8}
                listening={false}
              />
            )}
          </>
        );
      })()}
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
  const color = isEmpty ? '#334155' : (STATUS_COLORS[status] ?? STATUS_COLORS['No Task']);
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
        <Line points={[x1, y1, x2, y2]} stroke="#1d4ed8" strokeWidth={strokeWidth + 6} opacity={0.45} lineCap="round" listening={false} />
      )}
      <Line
        points={[x1, y1, x2, y2]}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={isHovered || isSelected ? 1 : isEmpty ? 0.65 : 0.9}
        lineCap="round"
        hitStrokeWidth={Math.max(18, strokeWidth * 4)}
        shadowColor="black"
        shadowBlur={isHovered ? 6 : 0}
        shadowOpacity={0.25}
      />
    </Group>
  );
});

interface Props {
  showGrid: boolean;
  showBeams: boolean;
  fullscreen: boolean;
  calibrating: boolean;
  onSnapshotReady?: (fn: () => string | null) => void;
}

export default function DrawingCanvas({ showGrid, showBeams, fullscreen, calibrating, onSnapshotReady }: Props) {
  const {
    currentDrawing,
    tasksForCurrentDrawing,
    setSelectedElementId,
    selectedElementId,
    focusElementRequest,
    requestFocusElement,
    patchDrawingColumnPositions,
    resetDrawingColumnPositions,
    patchDrawingColumnLabel,
    deleteDrawingNode,
    deleteDrawingBeam,
    addCustomBeam,
    removeCustomBeam,
  } = useApp();

  // ── Join mode: user clicks two nodes to connect them with a custom beam ──
  const [joinMode, setJoinMode] = useState(false);
  const [joinFirst, setJoinFirst] = useState<string | null>(null); // grid code of first picked node

  // hoveredElementId is local — it changes on every mouse-move and should NOT
  // live in the global context (that would cause every context consumer to re-render).
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  // Start with 0×0 so auto-fit never fires before the ResizeObserver measures the real container.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // ── Rename modal state ──
  const [renamingCode, setRenamingCode] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [autoCalibrating, setAutoCalibrating] = useState(false);
  const [calibPanelOpen, setCalibPanelOpen] = useState(true);
  const [highContrast, setHighContrast] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const imageNodeRef = useRef<Konva.Image | null>(null);

  // Primary: load via backend proxy (same origin → no CORS issues with Stratus).
  // Fallback: if the proxy fails (e.g. backend not yet deployed), try the raw fileUrl
  // resolved by the API (which may be a Stratus signed URL or a data: URL in dev).
  const image = useImage(
    currentDrawing ? drawingFileProxyUrl(currentDrawing.id) : undefined,
    currentDrawing?.fileUrl || undefined,
  );

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
    const w = img.naturalWidth || img.width || 1;
    const h = img.naturalHeight || img.height || 1;
    const s = Math.min(sz.width / w, sz.height / h) * 0.95;
    const newPos = {
      x: (sz.width - w * s) / 2,
      y: (sz.height - h * s) / 2,
    };
    setScale(s);
    setPos(newPos);
    scaleRef.current = s;
    posRef.current = newPos;
  }, []); // stable — all reads go through refs

  // Auto-fit whenever the image changes (new drawing selected) OR container resizes.
  // Guard: skip if image dimensions are not yet known (naturalWidth === 0) to avoid
  // computing a huge scale from w=1 which pushes the image off-screen.
  useEffect(() => {
    if (!image || !size.width || !size.height) return;
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;
    // If dimensions are still 0 the image hasn't decoded yet — skip for now.
    // The hook will fire again once decode() completes and setImg() is called.
    if (!w || !h) return;
    const s = Math.min(size.width / w, size.height / h) * 0.95;
    const newPos = {
      x: (size.width - w * s) / 2,
      y: (size.height - h * s) / 2,
    };
    setScale(s);
    setPos(newPos);
    scaleRef.current = s;
    posRef.current = newPos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, size.width, size.height]);

  // ── Column positions: persisted override, else evenly spaced across the image ──
  // Nodes listed in currentDrawing.deletedNodes are filtered out entirely.
  const columnElements = useMemo(() => {
    if (!currentDrawing || !image) return [];
    const cols = currentDrawing.gridCols;
    const rows = currentDrawing.gridRows;
    const overrides = currentDrawing.columnPositions || {};
    const deleted = new Set(currentDrawing.deletedNodes ?? []);
    const iw = image.naturalWidth || image.width || 1;
    const ih = image.naturalHeight || image.height || 1;
    const points: { id: string; code: string; x: number; y: number; row: number; col: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = gridLabel(col, row);
        if (deleted.has(code)) continue; // skip deleted nodes
        const override = overrides[code];
        const fx = override ? override.x : cols > 1 ? col / (cols - 1) : 0.5;
        const fy = override ? override.y : rows > 1 ? row / (rows - 1) : 0.5;
        points.push({ id: `Column_${code}`, code, x: fx * iw, y: fy * ih, row, col });
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
  // Beams listed in currentDrawing.deletedBeams are filtered out entirely.
  const beamElements = useMemo(() => {
    if (!currentDrawing || columnElements.length === 0) return [];
    const cols = currentDrawing.gridCols;
    const rows = currentDrawing.gridRows;
    const deleted = new Set(currentDrawing.deletedBeams ?? []);
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
          const id = `Beam_${code}_${rightCode}`;
          if (right && !deleted.has(id)) beams.push({ id, x1: p.x, y1: p.y, x2: right.x, y2: right.y });
        }
        if (row < rows - 1) {
          const belowCode = gridLabel(col, row + 1);
          const below = byCode.get(belowCode);
          const id = `Beam_${code}_${belowCode}`;
          if (below && !deleted.has(id)) beams.push({ id, x1: p.x, y1: p.y, x2: below.x, y2: below.y });
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
    if (!currentDrawing || !image) return 10;
    const iw = image.naturalWidth || image.width || 1;
    const ih = image.naturalHeight || image.height || 1;
    const cellW = iw / currentDrawing.gridCols;
    const cellH = ih / currentDrawing.gridRows;
    // Adjusted: was 0.09 → 0.055 → 0.03 → 0.04 → 0.055 → now 0.07
    return Math.max(4, Math.min(cellW, cellH) * 0.07);
  }, [currentDrawing, image]);

  const beamThickness = useMemo(() => Math.max(2, hotspotRadius * 0.22), [hotspotRadius]);

  // ── The custom (user-joined) beam currently selected, if any ──
  const selectedCustomBeam = useMemo(() => {
    if (!selectedElementId?.startsWith('CustomBeam_') || !currentDrawing) return null;
    return (currentDrawing.customBeams ?? []).find(
      (b) => `CustomBeam_${b.from}_${b.to}` === selectedElementId
    ) ?? null;
  }, [selectedElementId, currentDrawing]);

  const activeElementMeta = useMemo(() => {
    if (!selectedElementId) return null;
    if (selectedElementId.startsWith('Column_')) {
      const col = columnElements.find((c) => c.id === selectedElementId);
      if (!col) return null;
      const label = currentDrawing?.columnLabels?.[col.code] || col.code;
      return { kind: 'Column', label, subtitle: `Grid ${col.code}` };
    }
    if (selectedElementId.startsWith('CustomBeam_')) {
      if (!selectedCustomBeam) return null;
      return { kind: 'Custom beam', label: `${selectedCustomBeam.from} ↔ ${selectedCustomBeam.to}`, subtitle: 'Manually joined beam' };
    }
    if (selectedElementId.startsWith('Beam_')) {
      const beam = selectedElementId.replace('Beam_', '').replaceAll('_', ' → ');
      return { kind: 'Beam', label: beam, subtitle: 'Structural span' };
    }
    return null;
  }, [selectedElementId, columnElements, currentDrawing, selectedCustomBeam]);

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
    // In join mode, clicking a column picks it as the first or second endpoint
    if (joinMode && id.startsWith('Column_') && currentDrawing) {
      const code = id.replace('Column_', '');
      if (!joinFirst) {
        // First click — remember first node
        setJoinFirst(code);
        setSelectedElementId(id);
        toast(`Join: now click the second node`, { icon: '🔗', id: 'join-hint', duration: 4000 });
      } else if (code !== joinFirst) {
        // Second click — create beam
        const from = joinFirst;
        setJoinFirst(null);
        setSelectedElementId(null);
        toast.dismiss('join-hint');
        addCustomBeam(currentDrawing.id, from, code).then(() => {
          toast.success(`Joined ${from} → ${code}`, { icon: '🔗', duration: 2000 });
        });
      } else {
        // Clicked same node twice — cancel
        setJoinFirst(null);
        setSelectedElementId(null);
        toast('Join cancelled', { icon: '✕', duration: 1500 });
      }
      return;
    }
    setSelectedElementId(id);
  }, [joinMode, joinFirst, currentDrawing, addCustomBeam, setSelectedElementId]);
  const handleHover = useCallback((id: string | null) => setHoveredElementId(id), [setHoveredElementId]);
  const handleBackgroundClick = useCallback(() => setSelectedElementId(null), [setSelectedElementId]);

  // ── Persist a manually-calibrated column position (beams follow automatically) ──
  // Uses an optimistic local patch so the image never unmounts/reloads on each drag.
  const handleReposition = useCallback(async (code: string, px: number, py: number) => {
    if (!currentDrawing || !image) return;
    const iw = image.naturalWidth || image.width || 1;
    const ih = image.naturalHeight || image.height || 1;
    const x = Math.min(1, Math.max(0, px / iw));
    const y = Math.min(1, Math.max(0, py / ih));
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

  // ── Auto-calibrate: run projection analysis on the drawing image ──
  const handleAutoCalibrate = useCallback(async () => {
    if (!image || !currentDrawing || autoCalibrating) return;
    setAutoCalibrating(true);
    const t = toast.loading('Analysing drawing for column positions…');
    try {
      const result = await detectColumnPositions(
        image,
        currentDrawing.gridCols,
        currentDrawing.gridRows,
      );

      // Build batch of (code → fractional position) updates
      const updates: Record<string, { x: number; y: number }> = {};
      for (let row = 0; row < currentDrawing.gridRows; row++) {
        for (let col = 0; col < currentDrawing.gridCols; col++) {
          const code = gridLabel(col, row);
          const x = result.colXs[col] ?? col / Math.max(1, currentDrawing.gridCols - 1);
          const y = result.rowYs[row] ?? row / Math.max(1, currentDrawing.gridRows - 1);
          updates[code] = { x, y };
          patchDrawingColumnPositions(currentDrawing.id, code, x, y);
        }
      }

      // Persist all at once
      await DrawingsAPI.update(currentDrawing.id, { columnPositions: updates });
      toast.dismiss(t);
      toast.success(`Auto-calibrated ${Object.keys(updates).length} columns from drawing analysis`, { icon: '🎯', duration: 3000 });
    } catch (err) {
      toast.dismiss(t);
      toast.error('Auto-calibration failed — please calibrate manually');
      console.error('[autoCalibrate]', err);
    } finally {
      setAutoCalibrating(false);
    }
  }, [image, currentDrawing, autoCalibrating, patchDrawingColumnPositions]);

  // ── Arrow-key nudge: fine-tune the selected column's position while calibrating ──
  // ── Expose snapshot function to parent ──
  useEffect(() => {
    if (!onSnapshotReady) return;
    onSnapshotReady(() => {
      const stage = stageRef.current;
      if (!stage) return null;
      return stage.toDataURL({ pixelRatio: 2 });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSnapshotReady]);

  // ── Delete selected node ──
  const handleDeleteSelectedNode = useCallback(async () => {
    if (!currentDrawing || !selectedElementId?.startsWith('Column_')) {
      toast('Select a column node first', { icon: '👆' });
      return;
    }
    const code = selectedElementId.replace('Column_', '');
    setSelectedElementId(null);
    await deleteDrawingNode(currentDrawing.id, code);
    toast.success(`Node ${code} removed`, { icon: '🗑️', duration: 2000 });
  }, [currentDrawing, selectedElementId, setSelectedElementId, deleteDrawingNode]);

  // ── Delete the selected auto-derived (structural) beam ──
  const handleDeleteSelectedBeam = useCallback(async () => {
    if (!currentDrawing || !selectedElementId?.startsWith('Beam_')) return;
    const beamId = selectedElementId;
    setSelectedElementId(null);
    await deleteDrawingBeam(currentDrawing.id, beamId);
    toast.success('Beam removed', { icon: '🗑️', duration: 2000 });
  }, [currentDrawing, selectedElementId, setSelectedElementId, deleteDrawingBeam]);

  // ── Delete the selected custom (joined) beam ──
  const handleDeleteSelectedCustomBeam = useCallback(async () => {
    if (!currentDrawing || !selectedCustomBeam) return;
    const { from, to } = selectedCustomBeam;
    setSelectedElementId(null);
    await removeCustomBeam(currentDrawing.id, from, to);
    toast.success(`Beam ${from} ↔ ${to} removed`, { icon: '🗑️', duration: 2000 });
  }, [currentDrawing, selectedCustomBeam, setSelectedElementId, removeCustomBeam]);

  // ── Restore all deleted nodes ──
  const handleRestoreAllNodes = useCallback(async () => {
    if (!currentDrawing) return;
    const deleted = currentDrawing.deletedNodes ?? [];
    if (deleted.length === 0) { toast('No deleted nodes to restore', { icon: 'ℹ️' }); return; }
    for (const code of deleted) {
      await deleteDrawingNode(currentDrawing.id, code, true);
    }
    toast.success(`Restored ${deleted.length} node(s)`, { icon: '♻️', duration: 2000 });
  }, [currentDrawing, deleteDrawingNode]);

  // ── Restore all deleted beams ──
  const handleRestoreAllBeams = useCallback(async () => {
    if (!currentDrawing) return;
    const deleted = currentDrawing.deletedBeams ?? [];
    if (deleted.length === 0) { toast('No deleted beams to restore', { icon: 'ℹ️' }); return; }
    for (const beamId of deleted) {
      await deleteDrawingBeam(currentDrawing.id, beamId, true);
    }
    toast.success(`Restored ${deleted.length} beam(s)`, { icon: '♻️', duration: 2000 });
  }, [currentDrawing, deleteDrawingBeam]);

  const columnElementsRef = useRef(columnElements);
  useEffect(() => { columnElementsRef.current = columnElements; }, [columnElements]);
  useEffect(() => {
    if (!calibrating) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Delete key: remove selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        const selectedId = selectedElementId;
        if (selectedId?.startsWith('Column_') && currentDrawing) {
          e.preventDefault();
          const code = selectedId.replace('Column_', '');
          setSelectedElementId(null);
          deleteDrawingNode(currentDrawing.id, code).then(() => {
            toast.success(`Node ${code} removed`, { icon: '🗑️', duration: 2000 });
          });
          return;
        }
      }
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
  }, [calibrating, selectedElementId, handleReposition, currentDrawing, deleteDrawingNode, setSelectedElementId]);

  // ── Delete key: remove a selected beam — custom or auto-derived (works outside calibration mode too) ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key !== 'Delete' && e.key !== 'Backspace') || e.ctrlKey || e.metaKey) return;
      if (selectedCustomBeam) {
        e.preventDefault();
        handleDeleteSelectedCustomBeam();
      } else if (selectedElementId?.startsWith('Beam_')) {
        e.preventDefault();
        handleDeleteSelectedBeam();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCustomBeam, handleDeleteSelectedCustomBeam, selectedElementId, handleDeleteSelectedBeam]);

  // ── Grid segment handles: per-cell-edge draggable lines ──────────────────────
  // One handle per CELL EDGE:
  //   axis='h': the vertical boundary between col and col+1 in the same row.
  //             Dragging left/right moves ONLY those two adjacent nodes' x-coords
  //             for that specific row — other rows' x-positions are untouched.
  //   axis='v': the horizontal boundary between row and row+1 in the same col.
  //             Dragging up/down moves ONLY those two adjacent nodes' y-coords
  //             for that specific column — other columns' y-positions are untouched.
  //
  // The handle line spans exactly the cell edge:
  //   - 'h' handle at boundary between col c and col c+1 in row r:
  //       the line is VERTICAL at x=midX, from y of row above (r-1 or top of cell)
  //       to y of row below (r+1 or bottom of cell).
  //   - 'v' handle at boundary between row r and row r+1 in col c:
  //       the line is HORIZONTAL at y=midY, from x of col to left (c-1 or left of cell)
  //       to x of col to right (c+1 or right of cell).
  const segmentHandles = useMemo(() => {
    if (!currentDrawing || !image || columnElements.length === 0) return [];
    const byCode = new Map(columnElements.map((c) => [c.code, c]));
    const cols = currentDrawing.gridCols;
    const rows = currentDrawing.gridRows;

    const handles: {
      id: string;
      axis: 'h' | 'v';
      codeA: string;
      codeB: string;
      xA: number; yA: number;
      xB: number; yB: number;
      cellSpanStart: number;
      cellSpanEnd: number;
    }[] = [];

    // ── Horizontal boundaries: between col c and col c+1 within the SAME row ──
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const codeA = gridLabel(col, row);       // left node
        const codeB = gridLabel(col + 1, row);   // right node
        const pA = byCode.get(codeA);
        const pB = byCode.get(codeB);
        if (!pA || !pB) continue;

        // Perpendicular (y) span = from the row above to the row below,
        // limited to the actual cell extent so each handle only covers its own cell.
        const yAbove = row > 0
          ? ((byCode.get(gridLabel(col, row - 1))?.y ?? pA.y) + pA.y) / 2
          : pA.y - Math.abs(pA.y - (byCode.get(gridLabel(col, row + 1))?.y ?? pA.y)) / 2;
        const yBelow = row < rows - 1
          ? ((byCode.get(gridLabel(col, row + 1))?.y ?? pA.y) + pA.y) / 2
          : pA.y + Math.abs(pA.y - (byCode.get(gridLabel(col, row - 1))?.y ?? pA.y)) / 2;

        handles.push({
          id: `seg-h-${codeA}-${codeB}`,
          axis: 'h',
          codeA, codeB,
          xA: pA.x, yA: pA.y,
          xB: pB.x, yB: pB.y,
          cellSpanStart: Math.min(yAbove, yBelow),
          cellSpanEnd: Math.max(yAbove, yBelow),
        });
      }
    }

    // ── Vertical boundaries: between row r and row r+1 within the SAME column ──
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols; col++) {
        const codeA = gridLabel(col, row);       // top node
        const codeB = gridLabel(col, row + 1);   // bottom node
        const pA = byCode.get(codeA);
        const pB = byCode.get(codeB);
        if (!pA || !pB) continue;

        // Perpendicular (x) span = from the col to the left to the col to the right,
        // limited to the actual cell extent.
        const xLeft = col > 0
          ? ((byCode.get(gridLabel(col - 1, row))?.x ?? pA.x) + pA.x) / 2
          : pA.x - Math.abs(pA.x - (byCode.get(gridLabel(col + 1, row))?.x ?? pA.x)) / 2;
        const xRight = col < cols - 1
          ? ((byCode.get(gridLabel(col + 1, row))?.x ?? pA.x) + pA.x) / 2
          : pA.x + Math.abs(pA.x - (byCode.get(gridLabel(col - 1, row))?.x ?? pA.x)) / 2;

        handles.push({
          id: `seg-v-${codeA}-${codeB}`,
          axis: 'v',
          codeA, codeB,
          xA: pA.x, yA: pA.y,
          xB: pB.x, yB: pB.y,
          cellSpanStart: Math.min(xLeft, xRight),
          cellSpanEnd: Math.max(xLeft, xRight),
        });
      }
    }
    return handles;
  }, [currentDrawing, image, columnElements]);

  // Live accumulated delta state for smooth real-time preview while dragging
  // We track it in a ref (not state) to avoid re-rendering the whole canvas on every pixel
  const segDeltaRef = useRef<{ axis: 'h' | 'v'; codeA: string; codeB: string; delta: number } | null>(null);

  const handleSegmentDragMove = useCallback((
    axis: 'h' | 'v', codeA: string, codeB: string, delta: number
  ) => {
    if (!currentDrawing || !image) return;
    segDeltaRef.current = { axis, codeA, codeB, delta };

    const iw = image.naturalWidth || image.width || 1;
    const ih = image.naturalHeight || image.height || 1;

    // Live-update only the two endpoint columns
    const pA = columnElements.find((c) => c.code === codeA);
    const pB = columnElements.find((c) => c.code === codeB);
    if (!pA || !pB) return;

    if (axis === 'h') {
      // Move the boundary: split the delta — codeA column right-edge moves right, codeB left-edge moves left
      // But actually we want: drag boundary = shift codeB.x by delta (and codeA stays).
      // This way A stays fixed and B moves — matching the user intent.
      const newBx = Math.min(1, Math.max(0, (pB.x + delta) / iw));
      patchDrawingColumnPositions(currentDrawing.id, codeB, newBx, pB.y / ih);
    } else {
      const newBy = Math.min(1, Math.max(0, (pB.y + delta) / ih));
      patchDrawingColumnPositions(currentDrawing.id, codeB, pB.x / iw, newBy);
    }
  }, [currentDrawing, image, columnElements, patchDrawingColumnPositions]);

  const handleSegmentDragEnd = useCallback((
    _axis: 'h' | 'v', codeA: string, codeB: string
  ) => {
    if (!currentDrawing || !image) return;
    const pB = columnElements.find((c) => c.code === codeB);
    if (!pB) return;
    const iw = image.naturalWidth || image.width || 1;
    const ih = image.naturalHeight || image.height || 1;
    const x = pB.x / iw;
    const y = pB.y / ih;
    segDeltaRef.current = null;
    DrawingsAPI.update(currentDrawing.id, {
      columnPositions: { [codeB]: { x, y } },
    }).catch(() => {/* best-effort */});
    toast.success(`Grid boundary ${codeA}↔${codeB} adjusted`, { id: `seg-${codeA}-${codeB}`, duration: 1200, icon: '↔' });
  }, [currentDrawing, image, columnElements]);

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

  // ── High contrast: CSS filter on the stageContainerRef wrapper div ──
  // This inverts the entire Konva canvas (image + grid) without any CORS issues.
  const stageContainerRef = useRef<HTMLDivElement>(null);

  // ── Compute per-element status (highest-priority active task wins) ──
  // Tasks are indexed by their canvas element ID (Column_A1, Beam_A1_B1).
  // We derive the canvas ID from the task's gridCode field, since task.elementId
  // may contain drawing-specific labels (FP-A1, COL-A1, etc.) that don't match
  // the canvas element IDs.
  const statusByElement = useMemo<Record<string, string>>(() => {
    const priorityOrder = ['Blocked', 'Delayed', 'In Progress', 'Assigned', 'Completed'];
    const result: Record<string, string> = {};

    const setPriority = (key: string, status: string) => {
      const existing = result[key];
      if (!existing || priorityOrder.indexOf(status) < priorityOrder.indexOf(existing)) {
        result[key] = status;
      }
    };

    for (const t of tasksForCurrentDrawing) {
      // Primary: index by canvas Column ID derived from gridCode (e.g. "A1" → "Column_A1")
      if (t.gridCode) {
        setPriority(`Column_${t.gridCode}`, t.status);
      }
      // Also index by raw elementId so legacy/custom IDs still work
      if (t.elementId) {
        setPriority(t.elementId, t.status);
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
            }
      }
      // Re-focus the canvas container when the mouse enters so that scroll
      // wheel events are delivered here even after the user typed in a sidebar input.
      tabIndex={-1}
      onMouseEnter={() => containerRef.current?.focus({ preventScroll: true })}
    >
      {/* ── Konva Stage — CSS filter on wrapper inverts the whole canvas safely ── */}
      <div
        ref={stageContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          filter: highContrast ? 'invert(1) contrast(1.15) brightness(0.95)' : 'none',
          transition: 'filter 0.2s ease',
        }}
      >
      {/* Konva's shadow-caching path draws into an internal canvas sized off the
          Stage — mounting it before the ResizeObserver reports a real size (still
          0×0 on first paint) makes it try to drawImage a 0×0 canvas and throw. */}
      {size.width > 0 && size.height > 0 && (
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
              width={image.naturalWidth || image.width}
              height={image.naturalHeight || image.height}
              listening={false}
              ref={(node) => { imageNodeRef.current = node; }}
            />
          )}

          {showBeams && image && !calibrating && beamElements.map((b) => (
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

          {/* ── Custom beams: user-drawn connections between any two nodes ── */}
          {showBeams && image && (() => {
            const byCode = new Map(columnElements.map((c) => [c.code, c]));
            return (currentDrawing.customBeams ?? []).map((cb) => {
              const pA = byCode.get(cb.from);
              const pB = byCode.get(cb.to);
              if (!pA || !pB) return null;
              const cbId = `CustomBeam_${cb.from}_${cb.to}`;
              const isSelected = selectedElementId === cbId;
              const cbStatus = statusByElement[cbId] ?? 'No Task';
              const cbColor = cbStatus === 'No Task' ? '#334155' : (STATUS_COLORS[cbStatus] ?? STATUS_COLORS['No Task']);
              return (
                <Group key={cbId} listening={calibrating ? false : true}
                  onClick={(e) => { e.cancelBubble = true; setSelectedElementId(cbId); }}
                  onTap={(e) => { e.cancelBubble = true; setSelectedElementId(cbId); }}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <Line
                      points={[pA.x, pA.y, pB.x, pB.y]}
                      stroke="#f87171"
                      strokeWidth={(beamThickness + 7) / scale}
                      opacity={0.45}
                      lineCap="round"
                      listening={false}
                    />
                  )}
                  {/* Glow backdrop — tinted by task status, same as auto-derived beams */}
                  <Line
                    points={[pA.x, pA.y, pB.x, pB.y]}
                    stroke={cbColor}
                    strokeWidth={(beamThickness + 4) / scale}
                    opacity={0.25}
                    lineCap="round"
                    listening={false}
                  />
                  {/* Main custom beam line */}
                  <Line
                    points={[pA.x, pA.y, pB.x, pB.y]}
                    stroke={cbColor}
                    strokeWidth={(beamThickness + 1) / scale * scale}
                    opacity={0.9}
                    lineCap="round"
                    shadowColor={cbColor}
                    shadowBlur={8}
                    shadowOpacity={0.5}
                    hitStrokeWidth={Math.max(18, (beamThickness + 1) / scale * 4)}
                  />
                  {/* Midpoint label */}
                  <Text
                    x={(pA.x + pB.x) / 2 + 4 / scale}
                    y={(pA.y + pB.y) / 2 - 10 / scale}
                    text={`${cb.from}↔${cb.to}`}
                    fontSize={9 / scale}
                    fill={isSelected ? '#fecaca' : cbColor}
                    fontStyle="bold"
                    listening={false}
                  />
                </Group>
              );
            });
          })()}

          {/* ── Per-segment grid boundary handles (calibration mode) ── */}
          {/* Each handle covers exactly ONE cell edge and only moves that edge's two nodes */}
          {calibrating && showGrid && image && segmentHandles.map((h) => (
            <GridSegmentHandle
              key={h.id}
              axis={h.axis}
              codeA={h.codeA}
              codeB={h.codeB}
              xA={h.xA}
              yA={h.yA}
              xB={h.xB}
              yB={h.yB}
              cellSpanStart={h.cellSpanStart}
              cellSpanEnd={h.cellSpanEnd}
              scale={scale}
              onDragMove={handleSegmentDragMove}
              onDragEnd={handleSegmentDragEnd}
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
                label={showLabels ? label : ''}
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
      )}
      </div>{/* end stageContainerRef — CSS invert filter boundary */}

      {/* ── Calibration side-panel (right edge, non-overlapping) ── */}
      {calibrating && (
        <div
          className="absolute top-3 right-3 flex flex-col gap-1.5 rounded-2xl shadow-2xl border"
          style={{
            background: 'rgba(20, 12, 0, 0.93)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(245,158,11,0.55)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.1)',
            width: 196,
            zIndex: 50,
          }}
        >
          {/* Header — always visible, click to collapse/expand */}
          <button
            className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b w-full text-left"
            style={{ borderColor: calibPanelOpen ? 'rgba(245,158,11,0.2)' : 'transparent' }}
            onClick={() => setCalibPanelOpen((v) => !v)}
            title={calibPanelOpen ? 'Hide calibration tools' : 'Show calibration tools'}
          >
            <div className="flex items-center gap-1.5">
              <Crosshair size={12} style={{ color: '#fbbf24' }} />
              <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: '#fbbf24' }}>Calibrate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                {Object.keys(currentDrawing.columnPositions || {}).length}/{columnElements.length}
              </span>
              {calibPanelOpen
                ? <ChevronUp size={10} style={{ color: 'rgba(251,191,36,0.6)' }} />
                : <ChevronDown size={10} style={{ color: 'rgba(251,191,36,0.6)' }} />}
            </div>
          </button>

          {/* Collapsible body */}
          {calibPanelOpen && <>
          {/* Hint */}
          <p className="text-[10px] leading-snug px-3 pb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Drag <span style={{ color: 'rgba(34,211,238,0.8)' }}>cyan lines</span> to resize individual grid sections. Drag <span style={{ color: 'rgba(251,191,36,0.8)' }}>circles</span> to reposition nodes. Arrow keys nudge 1px (Shift=10px).
          </p>

          {/* Tools */}
          <div className="flex flex-col gap-1 px-2.5 pb-2.5">
            {/* Auto-detect */}
            <button
              onClick={handleAutoCalibrate}
              disabled={autoCalibrating}
              title="Auto-detect column positions from drawing image"
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{
                background: autoCalibrating ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.18)',
                borderColor: 'rgba(99,102,241,0.4)',
                color: autoCalibrating ? 'rgba(165,180,252,0.4)' : '#a5b4fc',
                cursor: autoCalibrating ? 'not-allowed' : 'pointer',
              }}
            >
              <Wand2 size={11} className={autoCalibrating ? 'animate-pulse' : ''} />
              {autoCalibrating ? 'Analysing…' : '✦ Auto-detect'}
            </button>

            <div className="h-px my-0.5" style={{ background: 'rgba(245,158,11,0.15)' }} />

            {/* Even-space row */}
            <button
              title="Distribute all columns in selected row evenly (left → right)"
              onClick={() => {
                if (!selectedElementId?.startsWith('Column_')) { toast('Select a column first', { icon: '👆' }); return; }
                const sel = columnElements.find((c) => c.id === selectedElementId);
                if (!sel || !image) return;
                const rowCols = columnElements.filter((c) => c.row === sel.row).sort((a, b) => a.col - b.col);
                if (rowCols.length < 2) return;
                const x0 = rowCols[0].x; const x1 = rowCols[rowCols.length - 1].x;
                rowCols.forEach((c, i) => { handleReposition(c.code, x0 + (x1 - x0) * (i / (rowCols.length - 1)), c.y); });
              }}
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: 'rgba(251,191,36,0.85)' }}
            >
              <span>↔</span> Even-space row
            </button>

            {/* Even-space col */}
            <button
              title="Distribute all columns in selected col-strip evenly (top → bottom)"
              onClick={() => {
                if (!selectedElementId?.startsWith('Column_')) { toast('Select a column first', { icon: '👆' }); return; }
                const sel = columnElements.find((c) => c.id === selectedElementId);
                if (!sel || !image) return;
                const colCols = columnElements.filter((c) => c.col === sel.col).sort((a, b) => a.row - b.row);
                if (colCols.length < 2) return;
                const y0 = colCols[0].y; const y1 = colCols[colCols.length - 1].y;
                colCols.forEach((c, i) => { handleReposition(c.code, c.x, y0 + (y1 - y0) * (i / (colCols.length - 1))); });
              }}
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: 'rgba(251,191,36,0.85)' }}
            >
              <span>↕</span> Even-space col
            </button>

            {/* Align row Y */}
            <button
              title="Snap entire row to same Y as selected column"
              onClick={() => {
                if (!selectedElementId?.startsWith('Column_')) { toast('Select a column first', { icon: '👆' }); return; }
                const sel = columnElements.find((c) => c.id === selectedElementId);
                if (!sel) return;
                columnElements.filter((c) => c.row === sel.row).forEach((c) => { handleReposition(c.code, c.x, sel.y); });
              }}
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: 'rgba(251,191,36,0.85)' }}
            >
              <span>—</span> Align row Y
            </button>

            {/* Align col X */}
            <button
              title="Snap entire col-strip to same X as selected column"
              onClick={() => {
                if (!selectedElementId?.startsWith('Column_')) { toast('Select a column first', { icon: '👆' }); return; }
                const sel = columnElements.find((c) => c.id === selectedElementId);
                if (!sel) return;
                columnElements.filter((c) => c.col === sel.col).forEach((c) => { handleReposition(c.code, sel.x, c.y); });
              }}
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: 'rgba(251,191,36,0.85)' }}
            >
              <span>|</span> Align col X
            </button>

            <div className="h-px my-0.5" style={{ background: 'rgba(245,158,11,0.15)' }} />

            {/* ── Join two nodes with a custom beam ── */}
            <button
              onClick={() => {
                if (!joinMode) {
                  setJoinMode(true);
                  setJoinFirst(null);
                  toast('Join mode: click two nodes to connect', { icon: '🔗', id: 'join-hint', duration: 6000 });
                } else {
                  setJoinMode(false);
                  setJoinFirst(null);
                  toast.dismiss('join-hint');
                  toast('Join mode cancelled', { icon: '✕', duration: 1500 });
                }
              }}
              title="Connect two nodes with a custom beam"
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{
                background: joinMode ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.08)',
                borderColor: joinMode ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.3)',
                color: joinMode ? '#c4b5fd' : 'rgba(167,139,250,0.7)',
              }}
            >
              <Link size={10} />
              {joinMode ? (joinFirst ? `→ Pick 2nd (from ${joinFirst})` : '→ Pick 1st node') : 'Join nodes'}
            </button>

            {/* ── Unjoin: remove a custom beam connecting the selected node ── */}
            {(() => {
              if (!selectedElementId?.startsWith('Column_')) return null;
              const code = selectedElementId.replace('Column_', '');
              const connected = (currentDrawing.customBeams ?? []).filter(
                (b) => b.from === code || b.to === code
              );
              if (connected.length === 0) return null;
              return (
                <button
                  onClick={() => {
                    if (!currentDrawing) return;
                    connected.forEach((b) => removeCustomBeam(currentDrawing.id, b.from, b.to));
                    toast.success(`Removed ${connected.length} custom beam(s) from ${code}`, { icon: '🔓', duration: 2000 });
                  }}
                  title={`Remove all custom beams connected to ${code}`}
                  className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                  style={{
                    background: 'rgba(245,158,11,0.08)',
                    borderColor: 'rgba(245,158,11,0.3)',
                    color: 'rgba(251,191,36,0.8)',
                  }}
                >
                  <Unlink size={10} />
                  Unjoin {code} ({connected.length})
                </button>
              );
            })()}

            {/* ── Clear all custom beams ── */}
            {(currentDrawing.customBeams?.length ?? 0) > 0 && (
              <button
                onClick={() => {
                  if (!currentDrawing) return;
                  (currentDrawing.customBeams ?? []).forEach((b) => removeCustomBeam(currentDrawing.id, b.from, b.to));
                  toast.success('All custom beams removed', { icon: '🔓', duration: 2000 });
                }}
                title="Remove all custom beams"
                className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                style={{
                  background: 'rgba(245,158,11,0.06)',
                  borderColor: 'rgba(245,158,11,0.2)',
                  color: 'rgba(251,191,36,0.6)',
                }}
              >
                <Unlink size={10} />
                Clear all beams ({currentDrawing.customBeams!.length})
              </button>
            )}

            <div className="h-px my-0.5" style={{ background: 'rgba(245,158,11,0.15)' }} />

            {/* ── Delete selected node ── */}
            <button
              onClick={handleDeleteSelectedNode}
              title="Remove the selected grid node (Delete key also works)"
              disabled={!selectedElementId?.startsWith('Column_')}
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{
                background: selectedElementId?.startsWith('Column_') ? 'rgba(239,68,68,0.14)' : 'rgba(239,68,68,0.04)',
                borderColor: selectedElementId?.startsWith('Column_') ? 'rgba(239,68,68,0.45)' : 'rgba(239,68,68,0.15)',
                color: selectedElementId?.startsWith('Column_') ? 'rgba(252,165,165,0.95)' : 'rgba(252,165,165,0.35)',
                cursor: selectedElementId?.startsWith('Column_') ? 'pointer' : 'not-allowed',
              }}
            >
              <Trash2 size={10} />
              Delete node
              {selectedElementId?.startsWith('Column_') && (
                <span className="ml-auto text-[9px] opacity-60">Del</span>
              )}
            </button>

            {/* ── Restore deleted nodes ── */}
            {(currentDrawing.deletedNodes?.length ?? 0) > 0 && (
              <button
                onClick={handleRestoreAllNodes}
                title="Restore all deleted nodes"
                className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', color: 'rgba(134,239,172,0.85)' }}
              >
                <span>♻</span>
                Restore {currentDrawing.deletedNodes!.length} node{currentDrawing.deletedNodes!.length !== 1 ? 's' : ''}
              </button>
            )}

            {/* ── Restore deleted beams ── */}
            {(currentDrawing.deletedBeams?.length ?? 0) > 0 && (
              <button
                onClick={handleRestoreAllBeams}
                title="Restore all deleted beams"
                className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', color: 'rgba(134,239,172,0.85)' }}
              >
                <span>♻</span>
                Restore {currentDrawing.deletedBeams!.length} beam{currentDrawing.deletedBeams!.length !== 1 ? 's' : ''}
              </button>
            )}

            <div className="h-px my-0.5" style={{ background: 'rgba(245,158,11,0.15)' }} />

            {/* Reset All */}
            <button
              onClick={handleResetCalibration}
              title="Reset all column positions to evenly-spaced default"
              className="w-full flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: 'rgba(252,165,165,0.8)' }}
            >
              <RotateCcw size={10} /> Reset All
            </button>
          </div>
          </>}
        </div>
      )}

      {/* ── Zoom Controls ── */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 rounded-2xl border px-3 py-2 flex items-center gap-2 z-20"
        style={{
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(14px)',
          borderColor: 'rgba(148,163,184,0.22)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        }}
      >
        <button
          onClick={() => setHighContrast((v) => !v)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: highContrast ? 'rgba(56,189,248,0.18)' : 'rgba(51,65,85,0.65)',
            color: highContrast ? '#bae6fd' : '#cbd5e1',
            border: '1px solid rgba(148,163,184,0.2)',
          }}
          title={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
        >
          {highContrast ? 'High Contrast On' : 'High Contrast Off'}
        </button>
        <button
          onClick={() => setShowLabels((v) => !v)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: showLabels ? 'rgba(192,132,252,0.18)' : 'rgba(51,65,85,0.65)',
            color: showLabels ? '#e9d5ff' : '#cbd5e1',
            border: '1px solid rgba(148,163,184,0.2)',
          }}
        >
          {showLabels ? 'Labels On' : 'Labels Off'}
        </button>
      </div>

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

      {activeElementMeta && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-2xl border px-4 py-3 min-w-[220px] z-20"
          style={{
            background: 'rgba(15,23,42,0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(96,165,250,0.28)',
            boxShadow: '0 12px 35px rgba(0,0,0,0.38)',
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-sky-300/80">Selected</div>
          <div className="mt-1 text-sm font-bold text-white">{activeElementMeta.kind}: {activeElementMeta.label}</div>
          <div className="text-xs text-slate-300 mt-0.5">{activeElementMeta.subtitle}</div>
          {selectedCustomBeam && (
            <button
              onClick={handleDeleteSelectedCustomBeam}
              title="Remove this joined beam (Delete key also works)"
              className="mt-2 w-full flex items-center justify-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(239,68,68,0.14)', borderColor: 'rgba(239,68,68,0.45)', color: 'rgba(252,165,165,0.95)' }}
            >
              <Trash2 size={10} />
              Delete beam
              <span className="ml-auto text-[9px] opacity-60">Del</span>
            </button>
          )}
          {selectedElementId?.startsWith('Beam_') && (
            <button
              onClick={handleDeleteSelectedBeam}
              title="Remove this structural beam (Delete key also works)"
              className="mt-2 w-full flex items-center justify-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(239,68,68,0.14)', borderColor: 'rgba(239,68,68,0.45)', color: 'rgba(252,165,165,0.95)' }}
            >
              <Trash2 size={10} />
              Delete beam
              <span className="ml-auto text-[9px] opacity-60">Del</span>
            </button>
          )}
        </div>
      )}

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
                border: '1.5px solid rgba(128,0,32,0.5)',
                background: 'rgba(20,0,8,0.97)',
                color: '#ffffff',
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
