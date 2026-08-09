/**
 * new_ground_floor.mjs
 *
 * Generates a clean, light-background architectural ground floor plan SVG
 * and uploads it to replace the existing Ground Floor Plan drawing.
 *
 * Run: node new_ground_floor.mjs
 */

import fs from 'fs';

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const DRAWING_ID = 'ded710c4-2eb9-41c3-a235-d24ee29263d6';

// Canvas size
const W = 1600, H = 1000;

// ── Colour palette (architectural / light) ─────────────────────────────────
const C = {
  bg:        '#f5f3ee',   // parchment background
  wallFill:  '#2c2c2c',   // thick wall fill
  wallStroke:'#1a1a1a',   // wall outline
  roomFill:  '#ffffff',   // white room interior
  dimLine:   '#444444',   // dimension line
  dimText:   '#333333',   // dimension text
  gridLine:  '#c8c8c8',   // grid reference line
  gridBg:    '#1a2744',   // grid bubble background
  titleBg:   '#1a2744',
  door:      '#555555',
  doorSwing: '#888888',
  window:    '#7bbfff',
  room: {
    living:   '#fff8f0',
    bed:      '#f0f4ff',
    kitchen:  '#f0fff4',
    bath:     '#f0f8ff',
    utility:  '#fffbf0',
    stair:    '#f5f5f5',
    verandah: '#f0ffe0',
  }
};

// ── Wall thickness ─────────────────────────────────────────────────────────
const WALL = 14;   // outer wall px
const IWALL = 10;  // inner wall px

// ── Grid reference columns (x) and rows (y) ────────────────────────────────
//  Columns:  A=120  B=390  C=660  D=930  E=1200
//  Rows:     1=100  2=310  3=520  4=730

const GX = { A: 120, B: 390, C: 660, D: 930, E: 1200 };
const GY = { 1: 100, 2: 310, 3: 520, 4: 730 };

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const NUMBERS = [1, 2, 3, 4];

// ── Helper: rect wall segment ──────────────────────────────────────────────
function wall(x, y, w, h, thick = WALL) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.wallFill}" rx="0"/>`;
}

// ── Helper: dimension line ─────────────────────────────────────────────────
function dim(x1, y1, x2, y2, text, side = 'above') {
  const isH = y1 === y2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const offset = 22;
  let tx = mx, ty = my;
  let ext = '';
  if (isH) {
    ty = y1 - offset;
    ext = `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1 - 16}" stroke="${C.dimLine}" stroke-width="1.2"/>
           <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y2 - 16}" stroke="${C.dimLine}" stroke-width="1.2"/>`;
  } else {
    tx = x1 + offset;
    ext = `<line x1="${x1}" y1="${y1}" x2="${x1 + 16}" y2="${y1}" stroke="${C.dimLine}" stroke-width="1.2"/>
           <line x1="${x2}" y1="${y2}" x2="${x2 + 16}" y2="${y2}" stroke="${C.dimLine}" stroke-width="1.2"/>`;
  }
  return `${ext}
  <line x1="${x1}" y1="${y1 - (isH ? 16 : 0)}" x2="${x2}" y2="${y2 - (isH ? 16 : 0)}" stroke="${C.dimLine}" stroke-width="1.2" marker-start="url(#dimArr)" marker-end="url(#dimArr)"/>
  <text x="${tx}" y="${ty - (isH ? 4 : 0)}" font-family="Arial" font-size="12" fill="${C.dimText}" text-anchor="middle">${text}</text>`;
}

// ── Helper: grid bubble labels ─────────────────────────────────────────────
function gridLabels() {
  let s = '';
  // Column headers (top)
  LETTERS.forEach(l => {
    const x = GX[l];
    s += `<circle cx="${x}" cy="55" r="16" fill="${C.gridBg}"/>
    <text x="${x}" y="60" font-family="Arial Black,Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${l}</text>
    <line x1="${x}" y1="71" x2="${x}" y2="${GY[4] + 50}" stroke="${C.gridLine}" stroke-width="1" stroke-dasharray="8,5"/>`;
  });
  // Row headers (left)
  NUMBERS.forEach(n => {
    const y = GY[n];
    s += `<circle cx="55" cy="${y}" r="16" fill="${C.gridBg}"/>
    <text x="55" y="${y + 5}" font-family="Arial Black,Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${n}</text>
    <line x1="71" y1="${y}" x2="${GX.E + 50}" y2="${y}" stroke="${C.gridLine}" stroke-width="1" stroke-dasharray="8,5"/>`;
  });
  return s;
}

// ── Helper: door (opening + quarter-circle swing) ──────────────────────────
function door(x, y, width, dir = 'R', axis = 'H', label = '') {
  // axis H = horizontal wall opening, V = vertical wall opening
  // dir = which way swing goes: R=right/down, L=left/up
  let d = '';
  if (axis === 'H') {
    const sw = dir === 'R' ? 1 : -1;
    d = `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="white" stroke-width="${WALL + 2}"/>
    <line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${C.bg}" stroke-width="${WALL - 2}"/>
    <line x1="${x + (dir==='R'?0:width)}" y1="${y}" x2="${x + (dir==='R'?0:width)}" y2="${y + sw*width}" stroke="${C.door}" stroke-width="1.5"/>
    <path d="M${x + (dir==='R'?0:width)},${y} A${width},${width} 0 0,${dir==='R'?1:0} ${x + (dir==='R'?width:0)},${y + sw*width}" fill="none" stroke="${C.doorSwing}" stroke-width="1" stroke-dasharray="4,3"/>`;
  } else {
    const sw = dir === 'R' ? 1 : -1;
    d = `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + width}" stroke="white" stroke-width="${WALL + 2}"/>
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + width}" stroke="${C.bg}" stroke-width="${WALL - 2}"/>
    <line x1="${x}" y1="${y + (dir==='R'?0:width)}" x2="${x + sw*width}" y2="${y + (dir==='R'?0:width)}" stroke="${C.door}" stroke-width="1.5"/>
    <path d="M${x},${y + (dir==='R'?0:width)} A${width},${width} 0 0,${dir==='R'?1:0} ${x + sw*width},${y + (dir==='R'?width:0)}" fill="none" stroke="${C.doorSwing}" stroke-width="1" stroke-dasharray="4,3"/>`;
  }
  if (label) d += `<text x="${x + (axis==='H'?width/2:15)}" y="${y + (axis==='H'?-6:width/2)}" font-family="Arial" font-size="10" fill="#555" text-anchor="middle">${label}</text>`;
  return d;
}

// ── Helper: window (gap in wall with glass lines) ──────────────────────────
function window_(x, y, width, axis = 'H') {
  if (axis === 'H') {
    return `<line x1="${x}" y1="${y}" x2="${x+width}" y2="${y}" stroke="white" stroke-width="${WALL+2}"/>
    <rect x="${x}" y="${y - WALL/2 - 1}" width="${width}" height="${WALL+2}" fill="white"/>
    <rect x="${x}" y="${y - WALL/2 - 1}" width="${width}" height="${WALL+2}" fill="${C.window}" opacity="0.35"/>
    <line x1="${x}" y1="${y - WALL/2}" x2="${x+width}" y2="${y - WALL/2}" stroke="${C.window}" stroke-width="1.5"/>
    <line x1="${x + width/3}" y1="${y - WALL/2}" x2="${x + width/3}" y2="${y + WALL/2}" stroke="${C.window}" stroke-width="1"/>
    <line x1="${x + 2*width/3}" y1="${y - WALL/2}" x2="${x + 2*width/3}" y2="${y + WALL/2}" stroke="${C.window}" stroke-width="1"/>
    <line x1="${x}" y1="${y + WALL/2}" x2="${x+width}" y2="${y + WALL/2}" stroke="${C.window}" stroke-width="1.5"/>`;
  } else {
    return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y+width}" stroke="white" stroke-width="${WALL+2}"/>
    <rect x="${x - WALL/2 - 1}" y="${y}" width="${WALL+2}" height="${width}" fill="white"/>
    <rect x="${x - WALL/2 - 1}" y="${y}" width="${WALL+2}" height="${width}" fill="${C.window}" opacity="0.35"/>
    <line x1="${x - WALL/2}" y1="${y}" x2="${x - WALL/2}" y2="${y+width}" stroke="${C.window}" stroke-width="1.5"/>
    <line x1="${x - WALL/2}" y1="${y + width/3}" x2="${x + WALL/2}" y2="${y + width/3}" stroke="${C.window}" stroke-width="1"/>
    <line x1="${x - WALL/2}" y1="${y + 2*width/3}" x2="${x + WALL/2}" y2="${y + 2*width/3}" stroke="${C.window}" stroke-width="1"/>
    <line x1="${x + WALL/2}" y1="${y}" x2="${x + WALL/2}" y2="${y+width}" stroke="${C.window}" stroke-width="1.5"/>`;
  }
}

// ── Helper: room label ─────────────────────────────────────────────────────
function roomLabel(x, y, name, sub = '') {
  return `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="16" fill="#1a1a2e" text-anchor="middle" font-weight="bold">${name}</text>
  ${sub ? `<text x="${x}" y="${y + 18}" font-family="Arial,sans-serif" font-size="11" fill="#666" text-anchor="middle">${sub}</text>` : ''}`;
}

// ── Helper: north arrow ────────────────────────────────────────────────────
function northArrow(cx, cy) {
  return `<g transform="translate(${cx},${cy})">
    <circle cx="0" cy="0" r="24" fill="white" stroke="${C.gridBg}" stroke-width="2"/>
    <polygon points="0,-20 7,10 0,5 -7,10" fill="${C.gridBg}"/>
    <polygon points="0,-20 -7,10 0,5 7,10" fill="#8a9ab0"/>
    <text x="0" y="-24" font-family="Arial Black" font-size="13" fill="${C.gridBg}" text-anchor="middle" font-weight="bold">N</text>
  </g>`;
}

// ── Helper: scale bar ──────────────────────────────────────────────────────
function scaleBar(x, y) {
  return `<g transform="translate(${x},${y})">
    <rect x="0" y="0" width="80" height="10" fill="${C.gridBg}"/>
    <rect x="80" y="0" width="80" height="10" fill="white" stroke="${C.gridBg}" stroke-width="1.5"/>
    <text x="0" y="26" font-family="Arial" font-size="11" fill="${C.dimText}">0</text>
    <text x="76" y="26" font-family="Arial" font-size="11" fill="${C.dimText}">5m</text>
    <text x="160" y="26" font-family="Arial" font-size="11" fill="${C.dimText}">10m</text>
    <text x="80" y="-4" font-family="Arial" font-size="11" fill="#555" text-anchor="middle">Scale 1:100</text>
  </g>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD THE SVG
// ─────────────────────────────────────────────────────────────────────────────
function makeGroundFloorSVG() {

  // Layout geometry — single 3-bay × 3-bay house + garage + verandah
  //
  //   A      B      C      D      E
  //   |      |      |      |      |
  // 1-+------+------+------+------+
  //   | Liv. | Hall | Bed1 | Gar. |
  // 2-+------+------+------+------+
  //   | Din. |Kitch.| Bed2 | Bath |
  // 3-+------+------+------+------+
  //   |   Verandah  | Util.| Stair|
  // 4-+------+------+------+------+
  //
  // Outer envelope: A1 → E4  (120→1200,  100→730)

  const L = { x: GX.A, y: GY[1] };                // top-left
  const envW = GX.E - GX.A;                        // 1080
  const envH = GY[4] - GY[1];                      // 630

  // Room fill rectangles (inside walls)
  function roomRect(col1, row1, col2, row2, fill) {
    const x = GX[col1] + WALL;
    const y = GY[row1] + WALL;
    const w = GX[col2] - GX[col1] - WALL;
    const h = GY[row2] - GY[row1] - WALL;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="dimArr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
      <path d="M0,0 L5,2.5 L0,5 Z" fill="${C.dimLine}"/>
    </marker>
    <filter id="sh">
      <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- ── BACKGROUND ── -->
  <rect width="${W}" height="${H}" fill="${C.bg}"/>

  <!-- ── DRAWING BORDER ── -->
  <rect x="20" y="20" width="${W-40}" height="${H-40}" fill="none" stroke="#aaa" stroke-width="1.5"/>
  <rect x="24" y="24" width="${W-48}" height="${H-48}" fill="none" stroke="#ccc" stroke-width="0.7"/>

  <!-- ── TITLE BLOCK ── -->
  <rect x="20" y="${H-70}" width="${W-40}" height="50" fill="${C.titleBg}"/>
  <text x="40" y="${H-44}" font-family="Arial Black,Arial" font-size="18" fill="white" font-weight="bold">GROUND FLOOR PLAN — House Building Project</text>
  <text x="40" y="${H-22}" font-family="Arial" font-size="12" fill="#a0b4d0">Drawing No: HBP-GF-001   |   Scale: 1:100   |   Date: 09 Aug 2026   |   All Dimensions in mm</text>
  <text x="${W-30}" y="${H-22}" font-family="Arial" font-size="11" fill="#a0b4d0" text-anchor="end">© BuildTrack Construction Management</text>

  <!-- ── GRID LINES & BUBBLES ── -->
  ${gridLabels()}

  <!-- ══════════════════════════════════════
       ROOM FILLS
  ═══════════════════════════════════════ -->
  ${roomRect('A','1','B','2', C.room.living)}
  ${roomRect('B','1','C','2', C.room.utility)}
  ${roomRect('C','1','D','2', C.room.bed)}
  ${roomRect('D','1','E','2', C.room.utility)}

  ${roomRect('A','2','B','3', C.room.living)}
  ${roomRect('B','2','C','3', C.room.kitchen)}
  ${roomRect('C','2','D','3', C.room.bed)}
  ${roomRect('D','2','E','3', C.room.bath)}

  ${roomRect('A','3','C','4', C.room.verandah)}
  ${roomRect('C','3','D','4', C.room.utility)}
  ${roomRect('D','3','E','4', C.room.stair)}

  <!-- ══════════════════════════════════════
       OUTER WALLS (thickness = ${WALL}px)
  ═══════════════════════════════════════ -->
  <!-- Top wall A1→E1 -->
  <rect x="${GX.A}" y="${GY[1]}" width="${GX.E - GX.A}" height="${WALL}" fill="${C.wallFill}"/>
  <!-- Bottom wall A4→E4 -->
  <rect x="${GX.A}" y="${GY[4]}" width="${GX.E - GX.A}" height="${WALL}" fill="${C.wallFill}"/>
  <!-- Left wall A1→A4 -->
  <rect x="${GX.A}" y="${GY[1]}" width="${WALL}" height="${GY[4] - GY[1] + WALL}" fill="${C.wallFill}"/>
  <!-- Right wall E1→E4 -->
  <rect x="${GX.E}" y="${GY[1]}" width="${WALL}" height="${GY[4] - GY[1] + WALL}" fill="${C.wallFill}"/>

  <!-- ══════════════════════════════════════
       INTERIOR WALLS (thickness = ${IWALL}px)
  ═══════════════════════════════════════ -->
  <!-- Horizontal: row 2 full width -->
  <rect x="${GX.A}" y="${GY[2]}" width="${GX.E - GX.A + WALL}" height="${IWALL}" fill="${C.wallFill}"/>
  <!-- Horizontal: row 3 full width -->
  <rect x="${GX.A}" y="${GY[3]}" width="${GX.E - GX.A + WALL}" height="${IWALL}" fill="${C.wallFill}"/>

  <!-- Vertical: col B full height -->
  <rect x="${GX.B}" y="${GY[1]}" width="${IWALL}" height="${GY[4] - GY[1] + WALL}" fill="${C.wallFill}"/>
  <!-- Vertical: col C full height -->
  <rect x="${GX.C}" y="${GY[1]}" width="${IWALL}" height="${GY[4] - GY[1] + WALL}" fill="${C.wallFill}"/>
  <!-- Vertical: col D full height -->
  <rect x="${GX.D}" y="${GY[1]}" width="${IWALL}" height="${GY[4] - GY[1] + WALL}" fill="${C.wallFill}"/>

  <!-- ══════════════════════════════════════
       WINDOWS
  ═══════════════════════════════════════ -->
  <!-- Top wall windows -->
  ${window_(GX.A + 40, GY[1], 90)}
  ${window_(GX.B + 40, GY[1], 90)}
  ${window_(GX.C + 40, GY[1], 90)}
  ${window_(GX.D + 40, GY[1], 80)}

  <!-- Bottom wall windows (verandah side) -->
  ${window_(GX.A + 40, GY[4], 90)}
  ${window_(GX.B + 40, GY[4], 90)}

  <!-- Left wall windows -->
  ${window_(GX.A, GY[1] + 60, 90, 'V')}
  ${window_(GX.A, GY[2] + 60, 80, 'V')}

  <!-- Right wall windows -->
  ${window_(GX.E, GY[1] + 60, 80, 'V')}
  ${window_(GX.E, GY[2] + 60, 70, 'V')}

  <!-- ══════════════════════════════════════
       DOORS
  ═══════════════════════════════════════ -->
  <!-- Main entrance — bottom wall, verandah to living (B strip) -->
  ${door(GX.A + 50, GY[4], 80, 'L', 'H', 'Main Entrance')}

  <!-- Living → Dining (interior row 2 wall, col A strip) -->
  ${door(GX.A + 30, GY[2], 70, 'R', 'H', '')}

  <!-- Hall → Living (col B, row 2) -->
  ${door(GX.B, GY[1] + 80, 70, 'R', 'V', '')}

  <!-- Hall → Kitchen (col B, row 2 wall) -->
  ${door(GX.B + 40, GY[2], 70, 'R', 'H', '')}

  <!-- Bedroom 1 door (col C interior wall) -->
  ${door(GX.C, GY[1] + 80, 70, 'L', 'V', '')}

  <!-- Bedroom 2 door (col C, row 2 wall) -->
  ${door(GX.C + 40, GY[2], 70, 'R', 'H', '')}

  <!-- Bathroom door (col D, row 2 wall) -->
  ${door(GX.D + 20, GY[2], 60, 'R', 'H', '')}

  <!-- Garage door (col D, row 3) — sliding double -->
  ${door(GX.D + 15, GY[3], 80, 'R', 'H', '')}

  <!-- Utility door (col C, row 3) -->
  ${door(GX.C + 30, GY[3], 60, 'R', 'H', '')}

  <!-- Staircase entry (col D, row 4 bottom) -->
  ${door(GX.D + 20, GY[4], 60, 'R', 'H', '')}

  <!-- ══════════════════════════════════════
       STAIRCASE (D3→E4)
  ═══════════════════════════════════════ -->
  ${(() => {
    const sx = GX.D + IWALL, sy = GY[3] + IWALL;
    const sw = GX.E - GX.D - IWALL, sh = GY[4] - GY[3] - IWALL;
    const steps = 10;
    const stepH = sh / steps;
    let s = `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${C.room.stair}" stroke="${C.wallFill}" stroke-width="0.7"/>`;
    for (let i = 1; i < steps; i++) {
      s += `<line x1="${sx}" y1="${sy + i * stepH}" x2="${sx + sw}" y2="${sy + i * stepH}" stroke="#888" stroke-width="1"/>`;
    }
    // Arrow going up
    const ax = sx + sw / 2;
    s += `<line x1="${ax}" y1="${sy + sh - 15}" x2="${ax}" y2="${sy + 20}" stroke="#444" stroke-width="2" marker-end="url(#dimArr)"/>`;
    s += `<text x="${ax + 10}" y="${sy + sh/2}" font-family="Arial" font-size="11" fill="#444" transform="rotate(-90,${ax + 10},${sy + sh/2})">UP</text>`;
    return s;
  })()}

  <!-- ══════════════════════════════════════
       ROOM LABELS
  ═══════════════════════════════════════ -->
  <!-- Row 1 -->
  ${roomLabel((GX.A + GX.B)/2, (GY[1]+GY[2])/2 - 10, 'Living Room', '4200 × 3500')}
  ${roomLabel((GX.B + GX.C)/2, (GY[1]+GY[2])/2 - 10, 'Hall / Lobby', '2700 × 3500')}
  ${roomLabel((GX.C + GX.D)/2, (GY[1]+GY[2])/2 - 10, 'Bedroom 1', '2700 × 3500')}
  ${roomLabel((GX.D + GX.E)/2, (GY[1]+GY[2])/2 - 10, 'Garage', '2700 × 3500')}

  <!-- Row 2 -->
  ${roomLabel((GX.A + GX.B)/2, (GY[2]+GY[3])/2 - 10, 'Dining Room', '4200 × 3500')}
  ${roomLabel((GX.B + GX.C)/2, (GY[2]+GY[3])/2 - 10, 'Kitchen', '2700 × 3500')}
  ${roomLabel((GX.C + GX.D)/2, (GY[2]+GY[3])/2 - 10, 'Bedroom 2', '2700 × 3500')}
  ${roomLabel((GX.D + GX.E)/2, (GY[2]+GY[3])/2 - 10, 'Bathroom', '2700 × 3500')}

  <!-- Row 3 -->
  ${roomLabel((GX.A + GX.C)/2, (GY[3]+GY[4])/2 - 10, 'Verandah / Porch', '8100 × 3500')}
  ${roomLabel((GX.C + GX.D)/2, (GY[3]+GY[4])/2 - 10, 'Utility / Store', '2700 × 3500')}
  ${roomLabel((GX.D + GX.E)/2, (GY[3]+GY[4])/2 - 10, 'Staircase', '2700 × 3500')}

  <!-- ══════════════════════════════════════
       DIMENSION LINES
  ═══════════════════════════════════════ -->
  <!-- Top span dimensions -->
  ${dim(GX.A, GY[1] - 30, GX.B, GY[1] - 30, '4200', 'above')}
  ${dim(GX.B, GY[1] - 30, GX.C, GY[1] - 30, '2700', 'above')}
  ${dim(GX.C, GY[1] - 30, GX.D, GY[1] - 30, '2700', 'above')}
  ${dim(GX.D, GY[1] - 30, GX.E, GY[1] - 30, '2700', 'above')}

  <!-- Left span dimensions -->
  ${dim(GX.A - 30, GY[1], GX.A - 30, GY[2], '3500')}
  ${dim(GX.A - 30, GY[2], GX.A - 30, GY[3], '3500')}
  ${dim(GX.A - 30, GY[3], GX.A - 30, GY[4], '3500')}

  <!-- Total width & height -->
  <line x1="${GX.A}" y1="${GY[1] - 55}" x2="${GX.E + WALL}" y2="${GY[1] - 55}" stroke="${C.dimLine}" stroke-width="1.5" marker-start="url(#dimArr)" marker-end="url(#dimArr)"/>
  <text x="${(GX.A + GX.E)/2}" y="${GY[1] - 60}" font-family="Arial Black,Arial" font-size="13" fill="${C.dimText}" text-anchor="middle" font-weight="bold">12300 mm TOTAL WIDTH</text>

  <line x1="${GX.E + 45}" y1="${GY[1]}" x2="${GX.E + 45}" y2="${GY[4] + WALL}" stroke="${C.dimLine}" stroke-width="1.5" marker-start="url(#dimArr)" marker-end="url(#dimArr)"/>
  <text x="${GX.E + 65}" y="${(GY[1]+GY[4])/2}" font-family="Arial Black,Arial" font-size="13" fill="${C.dimText}" text-anchor="middle" font-weight="bold" transform="rotate(90,${GX.E + 65},${(GY[1]+GY[4])/2})">10500 mm TOTAL HEIGHT</text>

  <!-- ══════════════════════════════════════
       LEGEND / SYMBOLS
  ═══════════════════════════════════════ -->
  <rect x="${W - 260}" y="100" width="220" height="290" rx="6" fill="white" stroke="#bbb" stroke-width="1.5" filter="url(#sh)"/>
  <text x="${W - 250}" y="124" font-family="Arial Black,Arial" font-size="13" fill="${C.gridBg}" font-weight="bold">LEGEND</text>
  <line x1="${W-250}" y1="130" x2="${W-60}" y2="130" stroke="#ddd" stroke-width="1"/>

  <!-- Window symbol -->
  <rect x="${W-250}" y="143" width="40" height="12" fill="${C.window}" opacity="0.4" stroke="${C.window}" stroke-width="1.5"/>
  <line x1="${W-250}" y1="149" x2="${W-210}" y2="149" stroke="${C.window}" stroke-width="1.5"/>
  <text x="${W-200}" y="153" font-family="Arial" font-size="12" fill="#333">Window</text>

  <!-- Door symbol -->
  <line x1="${W-250}" y1="175" x2="${W-230}" y2="175" stroke="${C.door}" stroke-width="2"/>
  <path d="M${W-250},175 A20,20 0 0,1 ${W-230},195" fill="none" stroke="${C.doorSwing}" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="${W-200}" y="183" font-family="Arial" font-size="12" fill="#333">Door / Swing</text>

  <!-- Room fills -->
  <rect x="${W-250}" y="204" width="25" height="16" fill="${C.room.living}" stroke="#bbb" stroke-width="1"/>
  <text x="${W-216}" y="215" font-family="Arial" font-size="12" fill="#333">Living / Dining</text>
  <rect x="${W-250}" y="228" width="25" height="16" fill="${C.room.bed}" stroke="#bbb" stroke-width="1"/>
  <text x="${W-216}" y="239" font-family="Arial" font-size="12" fill="#333">Bedroom</text>
  <rect x="${W-250}" y="252" width="25" height="16" fill="${C.room.kitchen}" stroke="#bbb" stroke-width="1"/>
  <text x="${W-216}" y="263" font-family="Arial" font-size="12" fill="#333">Kitchen</text>
  <rect x="${W-250}" y="276" width="25" height="16" fill="${C.room.bath}" stroke="#bbb" stroke-width="1"/>
  <text x="${W-216}" y="287" font-family="Arial" font-size="12" fill="#333">Bathroom</text>
  <rect x="${W-250}" y="300" width="25" height="16" fill="${C.room.verandah}" stroke="#bbb" stroke-width="1"/>
  <text x="${W-216}" y="311" font-family="Arial" font-size="12" fill="#333">Verandah</text>
  <rect x="${W-250}" y="324" width="25" height="16" fill="${C.room.stair}" stroke="#bbb" stroke-width="1"/>
  <text x="${W-216}" y="335" font-family="Arial" font-size="12" fill="#333">Staircase</text>
  <line x1="${W-250}" y1="352" x2="${W-60}" y2="352" stroke="#ddd" stroke-width="1"/>
  <text x="${W-250}" y="370" font-family="Arial" font-size="11" fill="#666">Walls: 230mm Brick</text>
  <text x="${W-250}" y="385" font-family="Arial" font-size="11" fill="#666">Slab: 150mm RCC M25</text>

  <!-- North Arrow + Scale Bar -->
  ${northArrow(W - 130, H - 150)}
  ${scaleBar(GX.A, H - 150)}

  <!-- Column position labels at intersections (for BuildTrack calibration) -->
  ${LETTERS.map(l => NUMBERS.map(n => {
    const x = GX[l]; const y = GY[n];
    return `<rect x="${x-8}" y="${y-8}" width="16" height="16" rx="3" fill="${C.gridBg}" opacity="0.7"/>
    <text x="${x}" y="${y+4}" font-family="Arial" font-size="9" fill="white" text-anchor="middle">${l}${n}</text>`;
  }).join('')).join('')}

</svg>`;

  return svg;
}

// ── Upload ─────────────────────────────────────────────────────────────────
async function uploadSVG(drawingId, svgContent) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const fd = new FormData();
  fd.append('file', blob, 'drawing.svg');
  const r = await fetch(`${BASE}/drawings/${drawingId}/image`, {
    method: 'POST',
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function main() {
  const svg = makeGroundFloorSVG();

  // Save locally
  fs.writeFileSync('./assets/improved-drawings/ground-floor-plan-v3-clear.svg', svg, 'utf8');
  console.log(`📄 Saved ground-floor-plan-v3-clear.svg (${Math.round(svg.length / 1024)}KB)`);

  // Upload
  process.stdout.write(`☁️  Uploading to drawing ${DRAWING_ID}... `);
  try {
    await uploadSVG(DRAWING_ID, svg);
    console.log('✅ Done');
    console.log('\nOpen: https://buildtrack-withdrawing.onslate.in/projects');
  } catch (err) {
    console.log(`⚠️  Upload failed: ${err.message} (file saved locally at ./assets/improved-drawings/ground-floor-plan-v3-clear.svg)`);
  }
}

main().catch(err => { console.error('Failed:', err.message || err); process.exit(1); });
