/**
 * replace_9bhk_dark.mjs
 *
 * Replaces all 6 9BHK drawings with dark CAD-style SVGs:
 * - Black background
 * - Cyan (#00e5ff) outer/structural walls
 * - Orange (#cc6600 / #e07800) interior walls
 * - Dark maroon/crimson door swings
 * - Yellow staircase grid
 * - Gray/white windows
 * - White room labels
 * - Professional title block at bottom
 *
 * Run: node backend/replace_9bhk_dark.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const W = 1800, H = 1100;

// Drawing IDs from the 9BHK seed
const DRAWING_IDS = {
  groundFloor:  '7fd33122-691f-4930-81c7-02325941e426',
  foundation:   '051ea23d-7386-42d7-86af-37edccbcdf49',
  firstFloor:   '567f75ff-7964-4acc-bcae-e02d2a75d265',
  roof:         '110da146-5cf3-46ba-9a64-e524acdf5460',
  electrical:   '3e0432fe-1589-434d-ad44-770a975038a4',
  plumbing:     'c607c026-9162-410c-b5d1-69a267737861',
};

// Grid: 7 cols × 4 rows — exactly matching the seeded calibration
const COL_XS = [120, 370, 620, 870, 1120, 1370, 1620];
const ROW_YS = [120, 420, 700, 940];
const LETTERS = 'ABCDEFG';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function gridBubbles() {
  let s = '';
  // Column bubbles (top)
  COL_XS.forEach((x, i) => {
    s += `<circle cx="${x}" cy="50" r="18" fill="#1a1a2e" stroke="#00e5ff" stroke-width="1.5"/>`;
    s += `<text x="${x}" y="55" font-family="Arial Black,Arial" font-size="14" fill="#00e5ff" text-anchor="middle" font-weight="bold">${LETTERS[i]}</text>`;
    s += `<line x1="${x}" y1="68" x2="${x}" y2="${ROW_YS[ROW_YS.length-1]+18}" stroke="#00e5ff" stroke-width="0.6" stroke-dasharray="6,6" opacity="0.25"/>`;
  });
  // Row bubbles (left)
  ROW_YS.forEach((y, i) => {
    s += `<circle cx="50" cy="${y}" r="18" fill="#1a1a2e" stroke="#00e5ff" stroke-width="1.5"/>`;
    s += `<text x="50" y="${y+5}" font-family="Arial Black,Arial" font-size="14" fill="#00e5ff" text-anchor="middle" font-weight="bold">${i+1}</text>`;
    s += `<line x1="68" y1="${y}" x2="${COL_XS[COL_XS.length-1]+18}" y2="${y}" stroke="#00e5ff" stroke-width="0.6" stroke-dasharray="6,6" opacity="0.25"/>`;
  });
  return s;
}

function titleBlock(title, drawingNo, scale, sheet) {
  const Y = H - 56;
  return `
  <!-- Title block -->
  <rect x="0" y="${Y}" width="${W}" height="56" fill="#0a0a14"/>
  <line x1="0" y1="${Y}" x2="${W}" y2="${Y}" stroke="#00e5ff" stroke-width="1.2" opacity="0.5"/>
  <text x="24" y="${Y+22}" font-family="Arial Black,Arial" font-size="16" fill="#00e5ff" font-weight="bold" letter-spacing="1">${title}</text>
  <text x="24" y="${Y+42}" font-family="Arial,sans-serif" font-size="11" fill="#7a8a9a">Drawing No: ${drawingNo}  |  Scale: ${scale}  |  ${sheet}  |  9 BHK House Building Project</text>
  <text x="${W-24}" y="${Y+32}" font-family="Arial,sans-serif" font-size="11" fill="#4a5a6a" text-anchor="end">© BuildTrack Construction Management</text>`;
}

function northArrow(cx, cy) {
  return `
  <g transform="translate(${cx},${cy})">
    <circle cx="0" cy="0" r="20" fill="#0a0a14" stroke="#00e5ff" stroke-width="1.5"/>
    <polygon points="0,-16 5,8 0,3 -5,8" fill="#00e5ff"/>
    <polygon points="0,-16 -5,8 0,3 5,8" fill="#1a2a3a"/>
    <text x="0" y="-20" font-family="Arial Black" font-size="11" fill="#00e5ff" text-anchor="middle">N</text>
  </g>`;
}

function door(x1, y1, x2, y2, rx, ry, sweep, label) {
  // Door frame line + swing arc
  return `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="8"/>
  <line x1="${x1}" y1="${y1}" x2="${rx}" y2="${ry}" stroke="#8B0030" stroke-width="2"/>
  <path d="M${x1},${y1} A${Math.round(Math.hypot(rx-x1,ry-y1))},${Math.round(Math.hypot(rx-x1,ry-y1))} 0 0,${sweep} ${rx},${ry}" fill="none" stroke="#8B0030" stroke-width="1.5"/>
  <text x="${Math.round((x1+x2)/2)}" y="${Math.round((y1+y2)/2)+4}" font-size="10" fill="#fff" font-family="Arial" text-anchor="middle">${label}</text>`;
}

function window_(x, y, w, h, label) {
  const cx = x + w/2, cy = y + h/2;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1a1a1a" stroke="#888" stroke-width="1.8"/>
  <line x1="${x+w*0.33}" y1="${y}" x2="${x+w*0.33}" y2="${y+h}" stroke="#aaa" stroke-width="1"/>
  <line x1="${x+w*0.66}" y1="${y}" x2="${x+w*0.66}" y2="${y+h}" stroke="#aaa" stroke-width="1"/>
  <text x="${cx}" y="${y-4}" font-size="9" fill="#ccc" text-anchor="middle" font-family="Arial">${label}</text>`;
}

function outerWall(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#080818" stroke="#00e5ff" stroke-width="3.5"/>`;
}

function innerWall(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#cc6600" stroke="#e07800" stroke-width="1.2"/>`;
}

function room(x, y, w, h, label, sublabel) {
  const cx = x + w/2, cy = y + h/2;
  return `
  <rect x="${x+1}" y="${y+1}" width="${w-2}" height="${h-2}" fill="#05050f" opacity="0.96"/>
  <text x="${cx}" y="${cy - (sublabel ? 10 : 0)}" font-size="13" fill="#ffffff" text-anchor="middle" font-weight="bold" font-family="Arial">${label}</text>
  ${sublabel ? `<text x="${cx}" y="${cy+10}" font-size="10" fill="#aaaaaa" text-anchor="middle" font-family="Arial">${sublabel}</text>` : ''}`;
}

function staircase(x, y, w, h) {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#050500"/>
  <rect x="${x+4}" y="${y+4}" width="${w-8}" height="${h-8}" fill="url(#stair-grid)" opacity="0.85"/>
  <line x1="${x+w/2-6}" y1="${y+h-20}" x2="${x+w/2-6}" y2="${y+20}" stroke="#ccaa00" stroke-width="2" marker-end="url(#arr-up)"/>
  <line x1="${x+w/2+6}" y1="${y+20}" x2="${x+w/2+6}" y2="${y+h-20}" stroke="#ccaa00" stroke-width="2" marker-end="url(#arr-dn)"/>
  <text x="${x+w+8}" y="${y+h/2-6}" font-size="9" fill="#ccaa00" font-family="Arial" transform="rotate(90,${x+w+8},${y+h/2})">3rd Landing</text>`;
}

function rccColumn(cx, cy, size=24) {
  const h = size/2;
  return `
  <rect x="${cx-h}" y="${cy-h}" width="${size}" height="${size}" fill="#1a1a2e" stroke="#00e5ff" stroke-width="1.5"/>
  <line x1="${cx-h}" y1="${cy-h}" x2="${cx+h}" y2="${cy+h}" stroke="#00e5ff" stroke-width="1" opacity="0.7"/>
  <line x1="${cx+h}" y1="${cy-h}" x2="${cx-h}" y2="${cy+h}" stroke="#00e5ff" stroke-width="1" opacity="0.7"/>`;
}

const svgDefs = `
  <defs>
    <pattern id="stair-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="none" stroke="#b8a000" stroke-width="0.8"/>
    </pattern>
    <marker id="arr-up" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
      <path d="M0,6 L3,0 L6,6" fill="none" stroke="#ccaa00" stroke-width="1.5"/>
    </marker>
    <marker id="arr-dn" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
      <path d="M0,0 L3,6 L6,0" fill="none" stroke="#ccaa00" stroke-width="1.5"/>
    </marker>
    <marker id="dim-arr" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L6,3 z" fill="#00e5ff"/>
    </marker>
    <filter id="glow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

function svgWrap(content, title, drawingNo, scale, sheet) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${svgDefs}
<rect width="${W}" height="${H}" fill="#000000"/>
<rect x="8" y="8" width="${W-16}" height="${H-72}" fill="none" stroke="#222" stroke-width="1.5" stroke-dasharray="12,6"/>
${content}
${titleBlock(title, drawingNo, scale, sheet)}
</svg>`;
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING 1: Ground Floor Plan (dark CAD like reference image)
// ═══════════════════════════════════════════════════════════════════
function makeGroundFloor() {
  let s = '';
  s += gridBubbles();

  // ── OUTER WALLS ─────────────────────────────────────────────────
  // Top wall
  s += outerWall(80, 80, 1630, 18);
  // Bottom wall (left section)
  s += outerWall(80, 970, 810, 18);
  // Bottom wall (right section — staircase)
  s += outerWall(1050, 970, 660, 18);
  // Left wall
  s += outerWall(80, 80, 18, 910);
  // Right wall (upper)
  s += outerWall(1692, 80, 18, 620);
  // Right wall (lower — staircase side)
  s += outerWall(1692, 700, 18, 290);
  // Middle vertical wall dividing left & right half
  s += outerWall(890, 80, 18, 560);
  // Right half bottom wall (above staircase gap)
  s += outerWall(890, 640, 820, 18);

  // ── INTERIOR WALLS ───────────────────────────────────────────────
  // Row 1: horizontal divider between row1 and row2
  s += innerWall(80, 430, 1630, 12);
  // Row 2→3: horizontal divider
  s += innerWall(80, 710, 1630, 12);

  // Left zone verticals (cols B,C,D,E,F)
  s += innerWall(370, 80, 12, 350);   // B col wall (row1)
  s += innerWall(620, 80, 12, 350);   // C col
  s += innerWall(870, 80, 12, 350);   // D col

  // Left zone row2 verticals
  s += innerWall(370, 430, 12, 280);
  s += innerWall(620, 430, 12, 280);

  // Right zone row1 verticals
  s += innerWall(1120, 80, 12, 350);
  s += innerWall(1370, 80, 12, 350);

  // Right zone row2 verticals
  s += innerWall(1120, 430, 12, 280);
  s += innerWall(1370, 430, 12, 280);

  // Row3 verticals (left half)
  s += innerWall(370, 710, 12, 270);
  s += innerWall(620, 710, 12, 270);
  // Row3 verticals (right half)
  s += innerWall(1120, 710, 12, 270);
  s += innerWall(1370, 710, 12, 270);

  // Toilet sub-walls row1
  s += innerWall(200, 80, 12, 180);    // toilet divider left zone
  s += innerWall(200, 80, 160, 12);    // toilet horizontal top (left)
  s += innerWall(1200, 80, 12, 180);   // toilet divider right zone
  s += innerWall(1200, 80, 160, 12);   // toilet horizontal right

  // ── ROOM FILLS ───────────────────────────────────────────────────
  // ROW 1: 6 bedrooms + 2 toilets
  s += room(98, 98, 264, 324, 'Master Bed 1', '6.0×5.5m');
  s += room(382, 98, 228, 324, 'Bedroom 2', '5.0×5.5m');
  s += room(632, 98, 230, 324, 'Bedroom 3', '5.0×5.5m');
  s += room(908, 98, 204, 324, 'Bedroom 4', '5.0×5.5m');
  s += room(1132, 98, 228, 324, 'Bedroom 5', '5.0×5.5m');
  s += room(1382, 98, 300, 324, 'Bedroom 6', '5.5×5.5m');

  // ROW 2: Living, Dining, Kitchen, Staircase, Bath, Utility
  s += room(98, 448, 264, 254, 'Living Room', '7.0×5.0m');
  s += room(382, 448, 228, 254, 'Dining', '5.5×5.0m');
  s += room(632, 448, 240, 254, 'Kitchen', '5.5×5.0m');
  s += room(908, 448, 204, 254, 'Bath 1', '');
  s += room(1132, 448, 228, 254, 'Utility', '3.5×5.0m');
  s += room(1382, 448, 300, 254, 'Garage', '6.0×5.0m');

  // ROW 3: Bed 7-9, Store, Toilet, Bath 2
  s += room(98, 728, 264, 234, 'Bedroom 7', '5.0×4.5m');
  s += room(382, 728, 228, 234, 'Bedroom 8', '5.0×4.5m');
  s += room(632, 728, 240, 234, 'Bedroom 9', '5.0×4.5m');
  s += room(908, 728, 204, 234, 'Store', '3.5×4.5m');
  s += room(1132, 728, 228, 234, 'Toilet 2', '');
  s += room(1382, 728, 300, 234, 'Balcony', '5.5×4.5m');

  // ── STAIRCASE ───────────────────────────────────────────────────
  s += staircase(892, 648, 790, 322);

  // ── RCC COLUMNS at grid intersections ───────────────────────────
  const colPts = [
    [80,80],[370,80],[620,80],[870,80],[1120,80],[1370,80],[1620,80],
    [80,420],[370,420],[620,420],[870,420],[1120,420],[1370,420],[1620,420],
    [80,700],[370,700],[620,700],[870,700],[1120,700],[1370,700],[1620,700],
  ];
  colPts.forEach(([cx,cy]) => { s += rccColumn(cx+9, cy+9, 20); });

  // ── WINDOWS (top wall) ──────────────────────────────────────────
  s += window_(130, 78, 90, 22, 'W');
  s += window_(430, 78, 90, 22, 'W');
  s += window_(680, 78, 90, 22, 'W');
  s += window_(980, 78, 90, 22, 'SW');
  s += window_(1180, 78, 90, 22, 'W');
  s += window_(1430, 78, 90, 22, 'W');

  // ── DOORS ───────────────────────────────────────────────────────
  // Bedroom doors
  s += door(370, 280, 370, 350, 440, 350, 1, 'D3');
  s += door(620, 280, 620, 350, 690, 350, 1, 'D3');
  s += door(1120, 280, 1120, 350, 1190, 350, 1, 'D3');
  s += door(1370, 280, 1370, 350, 1440, 350, 1, 'D3');
  // Living room door
  s += door(200, 700, 200, 760, 270, 760, 1, 'D3');
  // Kitchen door
  s += door(620, 600, 620, 660, 690, 660, 1, 'D3');
  // Garage external
  s += door(1450, 968, 1550, 968, 1550, 900, 0, 'GD');

  // ── NORTH ARROW ─────────────────────────────────────────────────
  s += northArrow(1730, 150);

  // ── DIM LINES ───────────────────────────────────────────────────
  s += `<line x1="80" y1="1010" x2="370" y2="1010" stroke="#00e5ff" stroke-width="1" marker-end="url(#dim-arr)" marker-start="url(#dim-arr)" opacity="0.6"/>`;
  s += `<text x="225" y="1030" font-size="10" fill="#00e5ff" text-anchor="middle" font-family="Arial" opacity="0.7">4500mm</text>`;
  s += `<line x1="370" y1="1010" x2="620" y2="1010" stroke="#00e5ff" stroke-width="1" marker-end="url(#dim-arr)" marker-start="url(#dim-arr)" opacity="0.6"/>`;
  s += `<text x="495" y="1030" font-size="10" fill="#00e5ff" text-anchor="middle" font-family="Arial" opacity="0.7">4500mm</text>`;

  return svgWrap(s, '9 BHK GROUND FLOOR PLAN', '9BHK-GF-001', '1:100', 'Sheet 1 of 6');
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING 2: Foundation Plan
// ═══════════════════════════════════════════════════════════════════
function makeFoundation() {
  let s = '';
  s += gridBubbles();

  // Soil hatch boundary
  s += `<rect x="90" y="90" width="1610" height="870" fill="none" stroke="#444" stroke-width="1.5" stroke-dasharray="10,6" opacity="0.5"/>`;

  // Grade beams (horizontal)
  COL_XS.forEach((x, i) => {
    // Vertical grade beams
    s += `<line x1="${x}" y1="${ROW_YS[0]}" x2="${x}" y2="${ROW_YS[3]}" stroke="#7a5c30" stroke-width="14" stroke-linecap="square" opacity="0.7"/>`;
  });
  ROW_YS.forEach((y, i) => {
    // Horizontal grade beams
    s += `<line x1="${COL_XS[0]}" y1="${y}" x2="${COL_XS[6]}" y2="${y}" stroke="#7a5c30" stroke-width="14" stroke-linecap="square" opacity="0.7"/>`;
  });

  // Isolated pad footings at every grid intersection
  COL_XS.forEach((cx, ci) => {
    ROW_YS.forEach((cy, ri) => {
      const lbl = LETTERS[ci] + (ri+1);
      // Outer pad
      s += `<rect x="${cx-45}" y="${cy-45}" width="90" height="90" fill="#2a1e0a" stroke="#7a5c30" stroke-width="2.5"/>`;
      // Inner concrete core
      s += `<rect x="${cx-28}" y="${cy-28}" width="56" height="56" fill="#3a2c10" stroke="#b08040" stroke-width="2"/>`;
      // Diagonal hatching
      s += `<line x1="${cx-28}" y1="${cy-28}" x2="${cx+28}" y2="${cy+28}" stroke="#b08040" stroke-width="1.2" opacity="0.7"/>`;
      s += `<line x1="${cx+28}" y1="${cy-28}" x2="${cx-28}" y2="${cy+28}" stroke="#b08040" stroke-width="1.2" opacity="0.7"/>`;
      // RCC column stub
      s += `<rect x="${cx-12}" y="${cy-12}" width="24" height="24" fill="#1a1a2e" stroke="#00e5ff" stroke-width="1.5"/>`;
      s += `<line x1="${cx-12}" y1="${cy-12}" x2="${cx+12}" y2="${cy+12}" stroke="#00e5ff" stroke-width="0.8"/>`;
      s += `<line x1="${cx+12}" y1="${cy-12}" x2="${cx-12}" y2="${cy+12}" stroke="#00e5ff" stroke-width="0.8"/>`;
      // Label
      s += `<text x="${cx}" y="${cy+62}" font-size="11" fill="#b08040" text-anchor="middle" font-family="Arial" font-weight="bold">${lbl}</text>`;
    });
  });

  // Dim lines
  s += `<line x1="${COL_XS[0]}" y1="${ROW_YS[0]-60}" x2="${COL_XS[1]}" y2="${ROW_YS[0]-60}" stroke="#00e5ff" stroke-width="1" marker-end="url(#dim-arr)" marker-start="url(#dim-arr)" opacity="0.6"/>`;
  s += `<text x="${(COL_XS[0]+COL_XS[1])/2}" y="${ROW_YS[0]-68}" font-size="10" fill="#00e5ff" text-anchor="middle" font-family="Arial" opacity="0.7">4000mm</text>`;
  s += `<line x1="${COL_XS[6]+60}" y1="${ROW_YS[0]}" x2="${COL_XS[6]+60}" y2="${ROW_YS[1]}" stroke="#00e5ff" stroke-width="1" marker-end="url(#dim-arr)" marker-start="url(#dim-arr)" opacity="0.6"/>`;
  s += `<text x="${COL_XS[6]+80}" y="${(ROW_YS[0]+ROW_YS[1])/2+4}" font-size="10" fill="#00e5ff" font-family="Arial" opacity="0.7">3800mm</text>`;

  // Legend
  s += `<rect x="1650" y="200" width="120" height="180" rx="6" fill="#0a0a14" stroke="#444" stroke-width="1.5"/>`;
  s += `<text x="1660" y="222" font-size="11" fill="#aaa" font-family="Arial" font-weight="bold">LEGEND</text>`;
  s += `<rect x="1660" y="232" width="20" height="14" fill="#3a2c10" stroke="#b08040" stroke-width="1.5"/>`;
  s += `<text x="1686" y="244" font-size="10" fill="#ccc" font-family="Arial">Pad Footing</text>`;
  s += `<rect x="1660" y="254" width="20" height="8" fill="#7a5c30" opacity="0.7"/>`;
  s += `<text x="1686" y="263" font-size="10" fill="#ccc" font-family="Arial">Grade Beam</text>`;
  s += `<rect x="1660" y="274" width="20" height="14" fill="#1a1a2e" stroke="#00e5ff" stroke-width="1.5"/>`;
  s += `<text x="1686" y="285" font-size="10" fill="#ccc" font-family="Arial">RCC Column</text>`;
  s += `<text x="1660" y="360" font-size="9" fill="#666" font-family="Arial">M25 Grade</text>`;
  s += `<text x="1660" y="374" font-size="9" fill="#666" font-family="Arial">Fe500 TMT</text>`;

  s += northArrow(1730, 350);

  return svgWrap(s, '9 BHK FOUNDATION PLAN', '9BHK-FND-002', '1:100', 'Sheet 2 of 6');
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING 3: First Floor Plan
// ═══════════════════════════════════════════════════════════════════
function makeFirstFloor() {
  let s = '';
  s += gridBubbles();

  // FL level tag
  s += `<text x="${W/2}" y="76" font-size="13" fill="#00e5ff" text-anchor="middle" font-family="Arial" opacity="0.8">FL +3300mm  |  First Floor</text>`;

  // ── OUTER WALLS ─────────────────────────────────────────────────
  s += outerWall(80, 90, 1630, 18);
  s += outerWall(80, 970, 1630, 18);
  s += outerWall(80, 90, 18, 900);
  s += outerWall(1692, 90, 18, 900);

  // ── INTERIOR WALLS ───────────────────────────────────────────────
  s += innerWall(80, 430, 1630, 12);
  s += innerWall(80, 710, 1630, 12);
  // Vertical dividers col A-G row1
  s += innerWall(370, 90, 12, 340);
  s += innerWall(620, 90, 12, 340);
  s += innerWall(870, 90, 12, 340);
  s += innerWall(1120, 90, 12, 340);
  s += innerWall(1370, 90, 12, 340);
  // Row2 verticals
  s += innerWall(370, 430, 12, 280);
  s += innerWall(620, 430, 12, 280);
  s += innerWall(870, 430, 12, 280);
  s += innerWall(1120, 430, 12, 280);
  s += innerWall(1370, 430, 12, 280);
  // Row3 verticals
  s += innerWall(370, 710, 12, 260);
  s += innerWall(620, 710, 12, 260);
  s += innerWall(870, 710, 12, 260);
  s += innerWall(1120, 710, 12, 260);
  s += innerWall(1370, 710, 12, 260);

  // Ensuite sub-walls
  s += innerWall(200, 90, 12, 160);
  s += innerWall(200, 90, 160, 12);

  // ── ROOMS ───────────────────────────────────────────────────────
  // Row 1: 6 BHK with ensuites
  s += room(98, 108, 264, 314, 'Bedroom 1', 'with Ensuite');
  s += room(382, 108, 228, 314, 'Bedroom 2', 'with Ensuite');
  s += room(632, 108, 230, 314, 'Bedroom 3', 'with Ensuite');
  s += room(882, 108, 230, 314, 'Bedroom 4', 'with Ensuite');
  s += room(1132, 108, 228, 314, 'Bedroom 5', 'with Ensuite');
  s += room(1382, 108, 306, 314, 'Bedroom 6', 'with Ensuite');

  // Row 2: common areas
  s += room(98, 448, 264, 254, 'Family Lounge', '8.0×5.5m');
  s += room(382, 448, 228, 254, 'Study', '5.5×5.5m');
  s += room(632, 448, 230, 254, 'Home Theatre', '5.5×5.5m');
  s += room(882, 448, 230, 254, 'Open Terrace', '');
  s += room(1132, 448, 228, 254, 'Prayer Room', '');
  s += room(1382, 448, 306, 254, 'Servant Room', '');

  // Row 3: misc
  s += room(98, 728, 264, 234, 'Store 1', '');
  s += room(382, 728, 228, 234, 'Store 2', '');
  s += room(632, 728, 230, 234, 'Gym / Fitness', '');
  s += room(882, 728, 230, 234, 'Toilet 3', '');
  s += room(1132, 728, 228, 234, 'Toilet 4', '');
  s += room(1382, 728, 306, 234, 'Staircase', '');

  // Staircase
  s += staircase(1382, 728, 306, 234);

  // RCC Columns
  const colPts = [
    [80,90],[370,90],[620,90],[870,90],[1120,90],[1370,90],[1690,90],
    [80,430],[370,430],[620,430],[870,430],[1120,430],[1370,430],[1690,430],
    [80,710],[370,710],[620,710],[870,710],[1120,710],[1370,710],[1690,710],
  ];
  colPts.forEach(([cx,cy]) => { s += rccColumn(cx+9, cy+9, 20); });

  // Windows
  s += window_(130, 88, 90, 22, 'W');
  s += window_(430, 88, 90, 22, 'W');
  s += window_(680, 88, 90, 22, 'W');
  s += window_(980, 88, 90, 22, 'W');
  s += window_(1180, 88, 90, 22, 'W');
  s += window_(1430, 88, 90, 22, 'W');

  // Doors
  s += door(370, 280, 370, 350, 440, 350, 1, 'D3');
  s += door(620, 280, 620, 350, 690, 350, 1, 'D3');
  s += door(870, 280, 870, 350, 940, 350, 1, 'D3');
  s += door(1120, 280, 1120, 350, 1190, 350, 1, 'D3');
  s += door(1370, 280, 1370, 350, 1440, 350, 1, 'D3');

  s += northArrow(1730, 150);

  return svgWrap(s, '9 BHK FIRST FLOOR PLAN', '9BHK-FF-003', '1:100', 'Sheet 3 of 6');
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING 4: Roof Plan
// ═══════════════════════════════════════════════════════════════════
function makeRoof() {
  let s = '';
  s += gridBubbles();

  // Roof outline (parapet walls)
  s += outerWall(80, 90, 1630, 18);  // parapet top
  s += outerWall(80, 970, 1630, 18); // parapet bottom
  s += outerWall(80, 90, 18, 900);   // parapet left
  s += outerWall(1692, 90, 18, 900); // parapet right

  // Hip roof slope lines (radiate from center ridge)
  const ridgeX1 = 200, ridgeX2 = 1600, ridgeY = 530;
  // Ridge line
  s += `<line x1="${ridgeX1}" y1="${ridgeY}" x2="${ridgeX2}" y2="${ridgeY}" stroke="#00e5ff" stroke-width="3" stroke-dasharray="14,6" opacity="0.7"/>`;
  s += `<text x="${W/2}" y="${ridgeY+20}" font-size="13" fill="#00e5ff" text-anchor="middle" font-family="Arial" opacity="0.7">MAIN RIDGE LINE</text>`;

  // Roof hatch lines (slope indicator)
  for (let y = 108; y < ridgeY-20; y += 22) {
    const xStart = 98 + (ridgeY - y) * 0.18;
    s += `<line x1="${xStart}" y1="${y}" x2="${W-xStart}" y2="${y}" stroke="#2a3a2a" stroke-width="1" opacity="0.7"/>`;
  }
  for (let y = ridgeY+20; y < 968; y += 22) {
    const xStart = 98 + (y - ridgeY) * 0.18;
    s += `<line x1="${xStart}" y1="${y}" x2="${W-xStart}" y2="${y}" stroke="#2a3a2a" stroke-width="1" opacity="0.7"/>`;
  }

  // Gable ends
  s += `<polygon points="80,90 ${W/2},${ridgeY-320} 1710,90" fill="none" stroke="#cc6600" stroke-width="2" stroke-dasharray="8,5"/>`;

  // Hip rafters
  [[80,90],[80,988],[1710,90],[1710,988]].forEach(([x,y]) => {
    s += `<line x1="${x}" y1="${y}" x2="${W/2}" y2="${ridgeY}" stroke="#e07800" stroke-width="1.5" stroke-dasharray="6,5" opacity="0.5"/>`;
  });

  // Rainwater pipes (7 RWPs)
  const rwpPts = [[80,90],[370,90],[620,90],[870,90],[1120,90],[1370,90],[1692,90],
                  [80,530],[1692,530]];
  rwpPts.slice(0,7).forEach(([x,y]) => {
    s += `<circle cx="${x+9}" cy="${y+9}" r="10" fill="#1a1a1a" stroke="#607090" stroke-width="2"/>`;
    s += `<text x="${x+9}" y="${y+38}" font-size="9" fill="#607090" text-anchor="middle" font-family="Arial">RWP</text>`;
  });

  // Solar PV panels
  s += `<rect x="350" y="200" width="200" height="120" rx="4" fill="#0a1a0a" stroke="#00cc44" stroke-width="2"/>`;
  s += `<text x="450" y="258" font-size="11" fill="#00cc44" text-anchor="middle" font-family="Arial">SOLAR PV</text>`;
  s += `<text x="450" y="274" font-size="9" fill="#00cc44" text-anchor="middle" font-family="Arial">10kWp (40 panels)</text>`;

  s += `<rect x="620" y="200" width="200" height="120" rx="4" fill="#0a1a0a" stroke="#00cc44" stroke-width="2"/>`;
  s += `<text x="720" y="258" font-size="11" fill="#00cc44" text-anchor="middle" font-family="Arial">SOLAR PV</text>`;
  s += `<text x="720" y="274" font-size="9" fill="#00cc44" text-anchor="middle" font-family="Arial">10kWp (40 panels)</text>`;

  // OHWT
  s += `<rect x="1300" y="650" width="150" height="100" rx="6" fill="#0a1020" stroke="#4080ff" stroke-width="2.5"/>`;
  s += `<text x="1375" y="695" font-size="11" fill="#4080ff" text-anchor="middle" font-family="Arial" font-weight="bold">OHWT</text>`;
  s += `<text x="1375" y="712" font-size="9" fill="#4080ff" text-anchor="middle" font-family="Arial">5000 Litres</text>`;
  s += `<text x="1375" y="726" font-size="9" fill="#4080ff" text-anchor="middle" font-family="Arial">RCC Slab Top</text>`;

  // Parapet label
  s += `<text x="200" y="120" font-size="10" fill="#cc6600" font-family="Arial">PARAPET WALL 1050mm HT</text>`;
  s += `<text x="200" y="960" font-size="10" fill="#cc6600" font-family="Arial">PARAPET WALL 1050mm HT</text>`;

  // Slope indicators
  s += `<text x="400" y="${ridgeY-100}" font-size="12" fill="#e07800" text-anchor="middle" font-family="Arial">↑ SLOPE 1:3</text>`;
  s += `<text x="400" y="${ridgeY+120}" font-size="12" fill="#e07800" text-anchor="middle" font-family="Arial">↓ SLOPE 1:3</text>`;

  s += northArrow(1730, 150);

  // Legend
  s += `<rect x="1480" y="680" width="190" height="180" rx="6" fill="#0a0a14" stroke="#444" stroke-width="1.5"/>`;
  s += `<text x="1490" y="702" font-size="11" fill="#aaa" font-family="Arial" font-weight="bold">LEGEND</text>`;
  s += `<line x1="1490" y1="718" x2="1520" y2="718" stroke="#00e5ff" stroke-width="3" stroke-dasharray="8,4"/>`;
  s += `<text x="1530" y="722" font-size="10" fill="#ccc" font-family="Arial">Ridge Line</text>`;
  s += `<line x1="1490" y1="738" x2="1520" y2="738" stroke="#cc6600" stroke-width="2" stroke-dasharray="6,4"/>`;
  s += `<text x="1530" y="742" font-size="10" fill="#ccc" font-family="Arial">Hip Rafter</text>`;
  s += `<circle cx="1505" cy="760" r="8" fill="#1a1a1a" stroke="#607090" stroke-width="2"/>`;
  s += `<text x="1530" y="764" font-size="10" fill="#ccc" font-family="Arial">RWP 90mm</text>`;
  s += `<rect x="1490" y="774" width="22" height="14" fill="#0a1a0a" stroke="#00cc44" stroke-width="1.5"/>`;
  s += `<text x="1530" y="784" font-size="10" fill="#ccc" font-family="Arial">Solar PV</text>`;
  s += `<rect x="1490" y="796" width="22" height="14" fill="#0a1020" stroke="#4080ff" stroke-width="1.5"/>`;
  s += `<text x="1530" y="806" font-size="10" fill="#ccc" font-family="Arial">OHWT 5000L</text>`;
  s += `<text x="1490" y="850" font-size="9" fill="#666" font-family="Arial">Mangalore Clay Tiles</text>`;

  return svgWrap(s, '9 BHK ROOF PLAN', '9BHK-RF-004', '1:100', 'Sheet 4 of 6');
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING 5: Electrical Layout Plan
// ═══════════════════════════════════════════════════════════════════
function makeElectrical() {
  let s = '';
  s += gridBubbles();

  // Floor outline
  s += outerWall(80, 90, 1630, 18);
  s += outerWall(80, 970, 1630, 18);
  s += outerWall(80, 90, 18, 900);
  s += outerWall(1692, 90, 18, 900);
  // Floor dividers (interior walls faint)
  s += `<line x1="80" y1="430" x2="1710" y2="430" stroke="#333" stroke-width="6" opacity="0.6"/>`;
  s += `<line x1="80" y1="710" x2="1710" y2="710" stroke="#333" stroke-width="6" opacity="0.6"/>`;

  // Conduit trunk lines
  const conduit = '#e0a020';
  s += `<polyline points="120,430 1680,430" fill="none" stroke="${conduit}" stroke-width="2.5" stroke-dasharray="12,6" opacity="0.5"/>`;
  s += `<polyline points="120,710 1680,710" fill="none" stroke="${conduit}" stroke-width="2.5" stroke-dasharray="12,6" opacity="0.5"/>`;
  s += `<polyline points="120,90 120,980" fill="none" stroke="${conduit}" stroke-width="3" stroke-dasharray="14,7" opacity="0.4"/>`;

  // Symbols
  function lightPt(x, y, lbl) {
    return `<circle cx="${x}" cy="${y}" r="16" fill="#0a0a20" stroke="#5080ff" stroke-width="2.5"/>
    <line x1="${x-10}" y1="${y}" x2="${x+10}" y2="${y}" stroke="#5080ff" stroke-width="2"/>
    <line x1="${x}" y1="${y-10}" x2="${x}" y2="${y+10}" stroke="#5080ff" stroke-width="2"/>
    <text x="${x}" y="${y+30}" font-size="10" fill="#aaaaff" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }
  function fanPt(x, y, lbl) {
    return `<circle cx="${x}" cy="${y}" r="16" fill="#0a0a20" stroke="#c07000" stroke-width="2.5"/>
    <path d="M${x},${y-12} A14,14 0 0,1 ${x+12},${y}" fill="none" stroke="#c07000" stroke-width="2"/>
    <path d="M${x+12},${y} A14,14 0 0,1 ${x},${y+12}" fill="none" stroke="#c07000" stroke-width="2"/>
    <path d="M${x},${y+12} A14,14 0 0,1 ${x-12},${y}" fill="none" stroke="#c07000" stroke-width="2"/>
    <text x="${x}" y="${y+30}" font-size="10" fill="#ffcc66" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }
  function acPt(x, y, lbl) {
    return `<rect x="${x-18}" y="${y-12}" width="36" height="24" rx="5" fill="#001a10" stroke="#00cc66" stroke-width="2.5"/>
    <text x="${x}" y="${y+5}" font-family="Arial Black" font-size="10" fill="#00cc66" text-anchor="middle">AC</text>
    <text x="${x}" y="${y+28}" font-size="10" fill="#66ffaa" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }
  function dbBox(x, y, lbl) {
    return `<rect x="${x-20}" y="${y-20}" width="40" height="40" rx="5" fill="#0a0a30" stroke="#00e5ff" stroke-width="2.5"/>
    <text x="${x}" y="${y+5}" font-family="Arial Black" font-size="10" fill="#00e5ff" text-anchor="middle">DB</text>
    <text x="${x}" y="${y+32}" font-size="10" fill="#aaccff" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }
  function socketPt(x, y, lbl) {
    return `<rect x="${x-14}" y="${y-14}" width="28" height="28" rx="4" fill="#0a0a20" stroke="#a060ff" stroke-width="2.5"/>
    <circle cx="${x-5}" cy="${y-4}" r="4" fill="#a060ff"/>
    <circle cx="${x+5}" cy="${y-4}" r="4" fill="#a060ff"/>
    <text x="${x}" y="${y+28}" font-size="10" fill="#cc99ff" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }

  // Row 1 (y=220)
  s += dbBox(COL_XS[0], 220, 'MDB');
  s += lightPt(COL_XS[1], 220, 'L1');
  s += lightPt(COL_XS[2], 220, 'L2');
  s += fanPt(COL_XS[3], 220, 'F1');
  s += acPt(COL_XS[4], 220, 'AC1');
  s += lightPt(COL_XS[5], 220, 'L3');
  s += socketPt(COL_XS[6], 220, 'S1');

  // Row 2 (y=560)
  s += dbBox(COL_XS[0], 560, 'SDB-1');
  s += socketPt(COL_XS[1], 560, 'S2');
  s += lightPt(COL_XS[2], 560, 'L4');
  s += fanPt(COL_XS[3], 560, 'F2');
  s += acPt(COL_XS[4], 560, 'AC2');
  s += dbBox(COL_XS[5], 560, 'SDB-2');
  s += lightPt(COL_XS[6], 560, 'L5');

  // Row 3 (y=840)
  s += acPt(COL_XS[0], 840, 'AC3');
  s += lightPt(COL_XS[1], 840, 'L6');
  s += socketPt(COL_XS[2], 840, 'S3');
  s += fanPt(COL_XS[3], 840, 'F3');
  s += lightPt(COL_XS[4], 840, 'L7');
  s += socketPt(COL_XS[5], 840, 'S4');
  s += lightPt(COL_XS[6], 840, 'EARTH');

  // Row 4 (y=ROW_YS[3]=940 area)
  s += dbBox(COL_XS[0], ROW_YS[3]-20, 'SUB-DB');
  s += socketPt(COL_XS[2], ROW_YS[3]-20, 'S5');
  s += acPt(COL_XS[4], ROW_YS[3]-20, 'AC4');
  s += lightPt(COL_XS[6], ROW_YS[3]-20, 'T&C');

  // Conduit connecting symbols
  COL_XS.forEach(x => {
    s += `<line x1="${x}" y1="236" x2="${x}" y2="540" stroke="${conduit}" stroke-width="1.5" stroke-dasharray="8,5" opacity="0.35"/>`;
    s += `<line x1="${x}" y1="576" x2="${x}" y2="820" stroke="${conduit}" stroke-width="1.5" stroke-dasharray="8,5" opacity="0.35"/>`;
  });

  // Legend
  s += `<rect x="1480" y="100" width="190" height="260" rx="6" fill="#0a0a14" stroke="#444" stroke-width="1.5"/>`;
  s += `<text x="1490" y="122" font-size="11" fill="#aaa" font-family="Arial" font-weight="bold">MEP LEGEND</text>`;
  s += `<circle cx="1500" cy="144" r="10" fill="#0a0a20" stroke="#5080ff" stroke-width="2"/>`;
  s += `<text x="1520" y="148" font-size="10" fill="#ccc" font-family="Arial">Light Point</text>`;
  s += `<circle cx="1500" cy="168" r="10" fill="#0a0a20" stroke="#c07000" stroke-width="2"/>`;
  s += `<text x="1520" y="172" font-size="10" fill="#ccc" font-family="Arial">Ceiling Fan</text>`;
  s += `<rect x="1490" y="182" width="22" height="16" rx="3" fill="#001a10" stroke="#00cc66" stroke-width="1.5"/>`;
  s += `<text x="1520" y="194" font-size="10" fill="#ccc" font-family="Arial">AC Unit</text>`;
  s += `<rect x="1490" y="204" width="22" height="16" rx="3" fill="#0a0a20" stroke="#a060ff" stroke-width="1.5"/>`;
  s += `<text x="1520" y="216" font-size="10" fill="#ccc" font-family="Arial">Socket (16A)</text>`;
  s += `<rect x="1490" y="226" width="22" height="22" rx="3" fill="#0a0a30" stroke="#00e5ff" stroke-width="1.5"/>`;
  s += `<text x="1520" y="240" font-size="10" fill="#ccc" font-family="Arial">Dist. Board</text>`;
  s += `<line x1="1490" y1="256" x2="1514" y2="256" stroke="${conduit}" stroke-width="2.5" stroke-dasharray="8,4"/>`;
  s += `<text x="1520" y="260" font-size="10" fill="#ccc" font-family="Arial">Conduit Run</text>`;
  s += `<text x="1490" y="340" font-size="9" fill="#666" font-family="Arial">Supply: 63A TPN 240V</text>`;
  s += `<text x="1490" y="354" font-size="9" fill="#666" font-family="Arial">CPVC 1.5-2.5mm²</text>`;

  s += northArrow(1730, 430);

  return svgWrap(s, '9 BHK ELECTRICAL LAYOUT PLAN', '9BHK-EL-005', '1:100', 'Sheet 5 of 6');
}

// ═══════════════════════════════════════════════════════════════════
// DRAWING 6: Plumbing & Drainage Plan
// ═══════════════════════════════════════════════════════════════════
function makePlumbing() {
  let s = '';
  s += gridBubbles();

  // Floor outline
  s += outerWall(80, 90, 1630, 18);
  s += outerWall(80, 970, 1630, 18);
  s += outerWall(80, 90, 18, 900);
  s += outerWall(1692, 90, 18, 900);
  s += `<line x1="80" y1="430" x2="1710" y2="430" stroke="#333" stroke-width="6" opacity="0.6"/>`;
  s += `<line x1="80" y1="710" x2="1710" y2="710" stroke="#333" stroke-width="6" opacity="0.6"/>`;

  // Pipe runs
  // Cold water main (blue dashed)
  s += `<polyline points="120,90 120,980" fill="none" stroke="#2080ff" stroke-width="3.5" stroke-dasharray="14,7" opacity="0.7"/>`;
  s += `<polyline points="120,430 1680,430" fill="none" stroke="#2080ff" stroke-width="2.5" stroke-dasharray="10,6" opacity="0.55"/>`;
  s += `<polyline points="120,710 1680,710" fill="none" stroke="#2080ff" stroke-width="2.5" stroke-dasharray="10,6" opacity="0.55"/>`;
  s += `<polyline points="120,940 1680,940" fill="none" stroke="#2080ff" stroke-width="2" stroke-dasharray="8,5" opacity="0.45"/>`;

  // Hot water (red dashed)
  s += `<polyline points="370,90 370,980" fill="none" stroke="#ff3333" stroke-width="2.5" stroke-dasharray="10,7" opacity="0.6"/>`;

  // Soil/waste drain (gray solid)
  s += `<polyline points="620,90 620,980" fill="none" stroke="#707080" stroke-width="5" opacity="0.6"/>`;
  s += `<polyline points="80,430 1710,430" fill="none" stroke="#707080" stroke-width="3" opacity="0.3"/>`;

  // Fixtures
  function wcFix(x, y, lbl) {
    return `<ellipse cx="${x}" cy="${y}" rx="18" ry="25" fill="#0a0a20" stroke="#2080ff" stroke-width="2.5"/>
    <rect x="${x-14}" y="${y-38}" width="28" height="20" rx="4" fill="#0a1830" stroke="#2080ff" stroke-width="2"/>
    <text x="${x}" y="${y+40}" font-size="10" fill="#66aaff" text-anchor="middle" font-family="Arial" font-weight="bold">${lbl}</text>`;
  }
  function basinFix(x, y, lbl) {
    return `<ellipse cx="${x}" cy="${y}" rx="20" ry="14" fill="#0a0a20" stroke="#2080ff" stroke-width="2.5"/>
    <circle cx="${x}" cy="${y}" r="5" fill="#2080ff"/>
    <text x="${x}" y="${y+28}" font-size="10" fill="#66aaff" text-anchor="middle" font-family="Arial" font-weight="bold">${lbl}</text>`;
  }
  function showerFix(x, y, lbl) {
    return `<rect x="${x-20}" y="${y-20}" width="40" height="40" rx="20" fill="#0a0a20" stroke="#2080ff" stroke-width="2.5"/>
    <circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#2080ff" stroke-width="1.5"/>
    <text x="${x}" y="${y+36}" font-size="10" fill="#66aaff" text-anchor="middle" font-family="Arial" font-weight="bold">${lbl}</text>`;
  }
  function geyserFix(x, y, lbl) {
    return `<circle cx="${x}" cy="${y}" r="20" fill="#1a0800" stroke="#ff6600" stroke-width="2.5"/>
    <text x="${x}" y="${y+5}" font-family="Arial Black" font-size="9" fill="#ff6600" text-anchor="middle">GYS</text>
    <text x="${x}" y="${y+36}" font-size="10" fill="#ff9944" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }
  function sumpFix(x, y, lbl) {
    return `<rect x="${x-28}" y="${y-20}" width="56" height="40" rx="5" fill="#0a1020" stroke="#2080ff" stroke-width="2.5"/>
    <text x="${x}" y="${y+5}" font-family="Arial Black" font-size="9" fill="#2080ff" text-anchor="middle">SUMP</text>
    <text x="${x}" y="${y+36}" font-size="10" fill="#66aaff" text-anchor="middle" font-family="Arial">${lbl}</text>`;
  }

  // Row 1 fixtures (y=220)
  s += wcFix(COL_XS[0], 220, 'WC1');
  s += showerFix(COL_XS[1], 220, 'SH1');
  s += basinFix(COL_XS[2], 220, 'BS1');
  s += wcFix(COL_XS[3], 220, 'WC2');
  s += showerFix(COL_XS[4], 220, 'SH2');
  s += basinFix(COL_XS[5], 220, 'BS2');
  s += geyserFix(COL_XS[6], 220, 'GYS1');

  // Row 2 fixtures (y=560)
  s += wcFix(COL_XS[0], 560, 'WC3');
  s += showerFix(COL_XS[1], 560, 'SH3');
  s += basinFix(COL_XS[2], 560, 'KIT\nSINK');
  s += `<circle cx="${COL_XS[3]}" cy="560" r="14" fill="#0a0a20" stroke="#2080ff" stroke-width="2"/>
        <text x="${COL_XS[3]}" y="564" font-size="9" fill="#2080ff" text-anchor="middle" font-family="Arial">FD</text>
        <text x="${COL_XS[3]}" y="590" font-size="10" fill="#66aaff" text-anchor="middle" font-family="Arial">Floor Drain</text>`;
  s += wcFix(COL_XS[4], 560, 'WC4');
  s += geyserFix(COL_XS[5], 560, 'GYS2');
  s += basinFix(COL_XS[6], 560, 'BS3');

  // Row 3 fixtures (y=840)
  s += geyserFix(COL_XS[0], 840, 'GYS3');
  s += sumpFix(COL_XS[1], 840, '10kL');
  s += wcFix(COL_XS[2], 840, 'WC5');
  s += basinFix(COL_XS[3], 840, 'BS4');
  s += showerFix(COL_XS[4], 840, 'SH4');
  s += `<rect x="${COL_XS[5]-28}" y="820" width="56" height="40" rx="5" fill="#0a1020" stroke="#4040ff" stroke-width="2.5"/>
        <text x="${COL_XS[5]}" y="844" font-size="9" fill="#4040ff" text-anchor="middle" font-family="Arial" font-weight="bold">SEPTIC</text>
        <text x="${COL_XS[5]}" y="875" font-size="10" fill="#8888ff" text-anchor="middle" font-family="Arial">2000L</text>`;
  s += `<circle cx="${COL_XS[6]}" cy="840" r="20" fill="#001a0a" stroke="#00aa44" stroke-width="2.5"/>
        <text x="${COL_XS[6]}" y="844" font-size="9" fill="#00aa44" text-anchor="middle" font-family="Arial" font-weight="bold">PUMP</text>
        <text x="${COL_XS[6]}" y="875" font-size="10" fill="#44cc88" text-anchor="middle" font-family="Arial">1.5HP</text>`;

  // Row 4 fixtures (y~920)
  s += wcFix(COL_XS[0], ROW_YS[3]-30, 'WC6');
  s += showerFix(COL_XS[2], ROW_YS[3]-30, 'SH5');
  s += geyserFix(COL_XS[4], ROW_YS[3]-30, 'GYS4');
  s += basinFix(COL_XS[6], ROW_YS[3]-30, 'BS5');

  // Flow arrows
  s += `<line x1="120" y1="500" x2="120" y2="560" stroke="#2080ff" stroke-width="1.5" marker-end="url(#dim-arr)" opacity="0.6"/>`;
  s += `<line x1="${COL_XS[1]}" y1="860" x2="${COL_XS[2]}" y2="860" stroke="#2080ff" stroke-width="1.5" marker-end="url(#dim-arr)" opacity="0.6"/>`;

  // Legend
  s += `<rect x="1480" y="100" width="190" height="280" rx="6" fill="#0a0a14" stroke="#444" stroke-width="1.5"/>`;
  s += `<text x="1490" y="122" font-size="11" fill="#aaa" font-family="Arial" font-weight="bold">PLUMBING KEY</text>`;
  s += `<line x1="1490" y1="142" x2="1520" y2="142" stroke="#2080ff" stroke-width="3.5" stroke-dasharray="10,5"/>`;
  s += `<text x="1530" y="146" font-size="10" fill="#ccc" font-family="Arial">Cold Water</text>`;
  s += `<line x1="1490" y1="162" x2="1520" y2="162" stroke="#ff3333" stroke-width="2.5" stroke-dasharray="8,5"/>`;
  s += `<text x="1530" y="166" font-size="10" fill="#ccc" font-family="Arial">Hot Water</text>`;
  s += `<line x1="1490" y1="182" x2="1520" y2="182" stroke="#707080" stroke-width="5"/>`;
  s += `<text x="1530" y="186" font-size="10" fill="#ccc" font-family="Arial">Soil/Waste</text>`;
  s += `<ellipse cx="1502" cy="206" rx="10" ry="14" fill="#0a0a20" stroke="#2080ff" stroke-width="2"/>`;
  s += `<text x="1530" y="210" font-size="10" fill="#ccc" font-family="Arial">WC</text>`;
  s += `<ellipse cx="1502" cy="232" rx="12" ry="8" fill="#0a0a20" stroke="#2080ff" stroke-width="2"/>`;
  s += `<text x="1530" y="236" font-size="10" fill="#ccc" font-family="Arial">Wash Basin</text>`;
  s += `<circle cx="1502" cy="258" r="12" fill="#1a0800" stroke="#ff6600" stroke-width="2"/>`;
  s += `<text x="1530" y="262" font-size="10" fill="#ccc" font-family="Arial">Geyser 25L</text>`;
  s += `<rect x="1490" y="274" width="22" height="14" rx="3" fill="#0a1020" stroke="#2080ff" stroke-width="1.5"/>`;
  s += `<text x="1530" y="284" font-size="10" fill="#ccc" font-family="Arial">Sump/Tank</text>`;
  s += `<text x="1490" y="360" font-size="9" fill="#666" font-family="Arial">CPVC supply, PVC waste</text>`;
  s += `<text x="1490" y="374" font-size="9" fill="#666" font-family="Arial">25mm supply / 50-110mm</text>`;

  s += northArrow(1730, 430);

  return svgWrap(s, '9 BHK PLUMBING & DRAINAGE PLAN', '9BHK-PL-006', '1:100', 'Sheet 6 of 6');
}

// ═══════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════

async function replaceDrawing(drawingId, svgContent, name) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const fd = new FormData();
  fd.append('file', blob, `${name.replace(/ /g, '-').toLowerCase()}.svg`);
  const r = await fetch(`${BASE}/drawings/${drawingId}/image`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function main() {
  console.log('\n🎨 Replacing 9BHK drawings with dark CAD style...\n');

  const outDir = join(__dirname, 'assets', '9bhk-drawings');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const drawings = [
    { id: DRAWING_IDS.groundFloor, name: '9 BHK Ground Floor Plan',     svg: makeGroundFloor() },
    { id: DRAWING_IDS.foundation,  name: '9 BHK Foundation Plan',       svg: makeFoundation() },
    { id: DRAWING_IDS.firstFloor,  name: '9 BHK First Floor Plan',      svg: makeFirstFloor() },
    { id: DRAWING_IDS.roof,        name: '9 BHK Roof Plan',             svg: makeRoof() },
    { id: DRAWING_IDS.electrical,  name: '9 BHK Electrical Layout Plan',svg: makeElectrical() },
    { id: DRAWING_IDS.plumbing,    name: '9 BHK Plumbing & Drainage',   svg: makePlumbing() },
  ];

  for (const drw of drawings) {
    const filename = drw.name.toLowerCase().replace(/ /g, '-').replace(/[&]/g,'+') + '.svg';
    writeFileSync(join(outDir, filename), drw.svg, 'utf8');
    process.stdout.write(`  📄 ${drw.name} (${Math.round(drw.svg.length/1024)}KB) → uploading... `);
    try {
      await replaceDrawing(drw.id, drw.svg, drw.name);
      console.log('✅');
    } catch (e) {
      console.log(`⚠️  ${e.message}`);
    }
  }

  console.log('\n✅ All 6 dark CAD drawings replaced!');
  console.log('🌐 Open: https://buildtrack-withdrawing.onslate.in/projects\n');
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
