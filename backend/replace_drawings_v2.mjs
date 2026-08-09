/**
 * replace_drawings_v2.mjs
 *
 * Generates improved high-visibility construction drawing SVGs and uploads them
 * to replace the existing ones for the House Building Project.
 *
 * Improvements:
 * - Bold/thick lines (walls, structural elements)
 * - Clear colour-coded zones (rooms in distinct pastel fills)
 * - Large, readable labels with drop-shadows
 * - Grid references (A, B, C… / 1, 2, 3…) prominently shown
 * - North arrow, scale bar, title block on every sheet
 * - Symbol legends on MEP drawings
 * - Professional architectural look
 *
 * Run: node replace_drawings_v2.mjs
 */

import fs from 'fs';

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const W = 1600, H = 950;

// ── Helpers ────────────────────────────────────────────────────────────────────

function titleBlock(title, number, scale, date = '09 Aug 2026') {
  return `
  <!-- Title Block -->
  <rect x="0" y="${H - 60}" width="${W}" height="60" fill="#1a2744" rx="0"/>
  <text x="20" y="${H - 36}" font-family="Arial Black,Arial,sans-serif" font-size="18" fill="#ffffff" font-weight="bold">${title}</text>
  <text x="20" y="${H - 14}" font-family="Arial,sans-serif" font-size="13" fill="#a0b4d0">Drawing No: ${number}   |   Scale: ${scale}   |   Date: ${date}   |   House Building Project</text>
  <text x="${W - 20}" y="${H - 14}" font-family="Arial,sans-serif" font-size="12" fill="#a0b4d0" text-anchor="end">© BuildTrack Construction Management</text>`;
}

function northArrow(cx, cy) {
  return `
  <!-- North Arrow -->
  <g transform="translate(${cx},${cy})">
    <circle cx="0" cy="0" r="22" fill="white" stroke="#1a2744" stroke-width="2"/>
    <polygon points="0,-18 6,8 0,4 -6,8" fill="#1a2744"/>
    <polygon points="0,-18 -6,8 0,4 6,8" fill="#8a9ab0"/>
    <text x="0" y="-22" font-family="Arial Black" font-size="12" fill="#1a2744" text-anchor="middle" font-weight="bold">N</text>
  </g>`;
}

function scaleBar(x, y, label = '1:100') {
  return `
  <!-- Scale Bar -->
  <g transform="translate(${x},${y})">
    <rect x="0" y="0" width="60" height="10" fill="#1a2744"/>
    <rect x="60" y="0" width="60" height="10" fill="white" stroke="#1a2744" stroke-width="1"/>
    <text x="0" y="24" font-family="Arial,sans-serif" font-size="11" fill="#1a2744">0</text>
    <text x="57" y="24" font-family="Arial,sans-serif" font-size="11" fill="#1a2744">5m</text>
    <text x="60" y="-4" font-family="Arial,sans-serif" font-size="11" fill="#444" text-anchor="middle">Scale ${label}</text>
  </g>`;
}

function gridLabels(colXs, rowYs, topPad = 40, leftPad = 40) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = '';
  colXs.forEach((x, i) => {
    s += `<circle cx="${x}" cy="${topPad}" r="14" fill="#1a2744"/><text x="${x}" y="${topPad + 5}" font-family="Arial Black,Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${letters[i]}</text>`;
    s += `<line x1="${x}" y1="${topPad + 14}" x2="${x}" y2="${rowYs[rowYs.length - 1] + 14}" stroke="#1a2744" stroke-width="1.5" stroke-dasharray="6,5" opacity="0.35"/>`;
  });
  rowYs.forEach((y, i) => {
    s += `<circle cx="${leftPad}" cy="${y}" r="14" fill="#1a2744"/><text x="${leftPad}" y="${y + 5}" font-family="Arial Black,Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${i + 1}</text>`;
    s += `<line x1="${leftPad + 14}" y1="${y}" x2="${colXs[colXs.length - 1] + 14}" y2="${y}" stroke="#1a2744" stroke-width="1.5" stroke-dasharray="6,5" opacity="0.35"/>`;
  });
  return s;
}

function svgOpen(bg = '#f0f4fa') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.18"/>
    </filter>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#1a2744"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>`;
}

const svgClose = `</svg>`;

// ── Drawing 1: Foundation Plan ─────────────────────────────────────────────────
function makeFoundationSVG() {
  const colXs = [200, 580, 960];
  const rowYs = [200, 600];
  // Foundation pads: large rectangles at each grid point
  const pads = [
    [200,200], [580,200], [960,200],
    [200,600], [580,600], [960,600],
  ];
  let svg = svgOpen('#f7f4ee');
  svg += `<text x="${W/2}" y="35" font-family="Arial Black,Arial" font-size="22" fill="#1a2744" text-anchor="middle" font-weight="bold">FOUNDATION PLAN — HBP-FND-001</text>`;
  svg += gridLabels(colXs, rowYs, 65, 65);

  // Grade beams connecting pads
  svg += `
  <!-- Grade beams -->
  <line x1="200" y1="200" x2="960" y2="200" stroke="#6b4c2a" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
  <line x1="200" y1="600" x2="960" y2="600" stroke="#6b4c2a" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
  <line x1="200" y1="200" x2="200" y2="600" stroke="#6b4c2a" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
  <line x1="580" y1="200" x2="580" y2="600" stroke="#6b4c2a" stroke-width="14" stroke-linecap="round" opacity="0.55"/>
  <line x1="960" y1="200" x2="960" y2="600" stroke="#6b4c2a" stroke-width="14" stroke-linecap="round" opacity="0.55"/>

  <!-- Diagonal hatching for soil -->
  <rect x="140" y="140" width="880" height="520" fill="none" stroke="#c8b89a" stroke-width="1" stroke-dasharray="8,8"/>`;

  // Isolated footings
  const labels = ['A1','B1','C1','A2','B2','C2'];
  pads.forEach(([cx, cy], i) => {
    svg += `
    <!-- Footing pad ${labels[i]} -->
    <rect x="${cx-55}" y="${cy-55}" width="110" height="110" fill="#d4c5a0" stroke="#6b4c2a" stroke-width="3" filter="url(#shadow)"/>
    <rect x="${cx-35}" y="${cy-35}" width="70" height="70" fill="#b0976a" stroke="#6b4c2a" stroke-width="2.5"/>
    <line x1="${cx-35}" y1="${cy-35}" x2="${cx+35}" y2="${cy+35}" stroke="#6b4c2a" stroke-width="1.5" opacity="0.6"/>
    <line x1="${cx+35}" y1="${cy-35}" x2="${cx-35}" y2="${cy+35}" stroke="#6b4c2a" stroke-width="1.5" opacity="0.6"/>
    <text x="${cx}" y="${cy + 80}" font-family="Arial Black,Arial" font-size="15" fill="#1a2744" text-anchor="middle" font-weight="bold">${labels[i]}</text>`;
  });

  // Dimension lines
  svg += `
  <!-- Dim: between A and B (col spacing) -->
  <line x1="200" y1="130" x2="580" y2="130" stroke="#1a2744" stroke-width="1.5" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
  <text x="390" y="120" font-family="Arial" font-size="13" fill="#1a2744" text-anchor="middle">3800 mm</text>
  <line x1="580" y1="130" x2="960" y2="130" stroke="#1a2744" stroke-width="1.5" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
  <text x="770" y="120" font-family="Arial" font-size="13" fill="#1a2744" text-anchor="middle">3800 mm</text>
  <!-- Dim: row 1 to row 2 -->
  <line x1="1060" y1="200" x2="1060" y2="600" stroke="#1a2744" stroke-width="1.5" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
  <text x="1080" y="405" font-family="Arial" font-size="13" fill="#1a2744">4000 mm</text>

  <!-- Legend -->
  <rect x="1100" y="200" width="440" height="160" rx="8" fill="white" stroke="#c8b89a" stroke-width="2" filter="url(#shadow)"/>
  <text x="1120" y="225" font-family="Arial Black" font-size="14" fill="#1a2744" font-weight="bold">LEGEND</text>
  <rect x="1120" y="238" width="30" height="20" fill="#b0976a" stroke="#6b4c2a" stroke-width="2"/>
  <text x="1160" y="253" font-family="Arial" font-size="13" fill="#333">Isolated Pad Footing</text>
  <rect x="1120" y="266" width="30" height="10" fill="#6b4c2a" opacity="0.55"/>
  <text x="1160" y="278" font-family="Arial" font-size="13" fill="#333">Grade Beam (600×350)</text>
  <rect x="1120" y="290" width="30" height="12" fill="none" stroke="#c8b89a" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="1160" y="305" font-family="Arial" font-size="13" fill="#333">Excavation Boundary</text>
  <text x="1120" y="345" font-family="Arial" font-size="12" fill="#666">Concrete: M25 RCC</text>
  <text x="1120" y="362" font-family="Arial" font-size="12" fill="#666">Reinforcement: Fe500 TMT</text>`;

  svg += northArrow(1480, 480);
  svg += scaleBar(1100, 500);
  svg += titleBlock('FOUNDATION PLAN', 'HBP-FND-001', '1:100');
  svg += svgClose;
  return svg;
}

// ── Drawing 2: Ground Floor Plan ───────────────────────────────────────────────
function makeGroundFloorSVG() {
  const colXs = [200, 510, 780, 1050];
  const rowYs = [355, 660];
  let svg = svgOpen('#f4f8f4');
  svg += `<text x="${W/2}" y="35" font-family="Arial Black,Arial" font-size="22" fill="#1a2744" text-anchor="middle" font-weight="bold">GROUND FLOOR PLAN — HBP-GF-002</text>`;

  // Room fills
  const rooms = [
    { x:140, y:90, w:270, h:530, fill:'#dff0e0', label:'LIVING &\nDINING', lx:275, ly:310 },
    { x:410, y:90, w:230, h:380, fill:'#e8e0f0', label:'MASTER\nBEDROOM', lx:525, ly:245 },
    { x:640, y:90, w:200, h:380, fill:'#ffe8d6', label:'BATH\nROOM', lx:740, ly:265 },
    { x:840, y:90, w:230, h:380, fill:'#d6eeff', label:'GARAGE', lx:955, ly:260 },
    { x:410, y:470, w:230, h:150, fill:'#fff3d6', label:'KITCHEN', lx:525, ly:542 },
    { x:640, y:470, w:430, h:150, fill:'#fde8e8', label:'BED 2 / BED 3', lx:855, ly:542 },
  ];

  rooms.forEach(r => {
    svg += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" stroke="#1a2744" stroke-width="3" filter="url(#shadow)"/>`;
    r.label.split('\n').forEach((line, i) =>
      svg += `<text x="${r.lx}" y="${r.ly + i * 22}" font-family="Arial,sans-serif" font-size="15" fill="#1a2744" text-anchor="middle" font-weight="bold" opacity="0.7">${line}</text>`
    );
  });

  // Wall outline thick
  svg += `<rect x="140" y="90" width="930" height="530" fill="none" stroke="#1a2744" stroke-width="5"/>`;

  // Interior walls
  svg += `
  <line x1="410" y1="90" x2="410" y2="620" stroke="#1a2744" stroke-width="4"/>
  <line x1="640" y1="90" x2="640" y2="620" stroke="#1a2744" stroke-width="4"/>
  <line x1="840" y1="90" x2="840" y2="620" stroke="#1a2744" stroke-width="4"/>
  <line x1="410" y1="470" x2="1070" y2="470" stroke="#1a2744" stroke-width="4"/>`;

  // Door symbols
  svg += `
  <!-- Doors: arcs -->
  <path d="M 285,90 A 60,60 0 0,1 225,150" fill="none" stroke="#1a2744" stroke-width="2" stroke-dasharray="4,3"/>
  <line x1="225" y1="90" x2="285" y2="90" stroke="#1a2744" stroke-width="2"/>
  <path d="M 440,90 A 60,60 0 0,1 440,150" fill="none" stroke="#1a2744" stroke-width="2" stroke-dasharray="4,3"/>`;

  // Windows (double line on wall)
  svg += `
  <line x1="140" y1="280" x2="140" y2="380" stroke="#60c0ff" stroke-width="6"/>
  <line x1="840" y1="200" x2="840" y2="300" stroke="#60c0ff" stroke-width="6"/>
  <line x1="1070" y1="200" x2="1070" y2="350" stroke="#60c0ff" stroke-width="6"/>`;

  svg += gridLabels(colXs, rowYs, 65, 65);

  // Room area annotations
  svg += `
  <text x="275" y="340" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" opacity="0.6">28.5 m²</text>
  <text x="525" y="270" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" opacity="0.6">16.0 m²</text>
  <text x="740" y="290" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" opacity="0.6">6.5 m²</text>
  <text x="955" y="285" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" opacity="0.6">15.0 m²</text>

  <!-- Legend -->
  <rect x="1100" y="100" width="430" height="200" rx="8" fill="white" stroke="#ccc" stroke-width="2" filter="url(#shadow)"/>
  <text x="1120" y="125" font-family="Arial Black" font-size="14" fill="#1a2744" font-weight="bold">ROOM LEGEND</text>
  <rect x="1120" y="135" width="22" height="16" fill="#dff0e0" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1150" y="148" font-family="Arial" font-size="13" fill="#333">Living / Dining Area</text>
  <rect x="1120" y="158" width="22" height="16" fill="#e8e0f0" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1150" y="171" font-family="Arial" font-size="13" fill="#333">Master Bedroom</text>
  <rect x="1120" y="181" width="22" height="16" fill="#ffe8d6" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1150" y="194" font-family="Arial" font-size="13" fill="#333">Bathroom / WC</text>
  <rect x="1120" y="204" width="22" height="16" fill="#d6eeff" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1150" y="217" font-family="Arial" font-size="13" fill="#333">Garage</text>
  <rect x="1120" y="227" width="22" height="16" fill="#fff3d6" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1150" y="240" font-family="Arial" font-size="13" fill="#333">Kitchen</text>
  <rect x="1120" y="250" width="22" height="16" fill="#fde8e8" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1150" y="263" font-family="Arial" font-size="13" fill="#333">Bedrooms 2 & 3</text>`;

  svg += northArrow(1490, 460);
  svg += scaleBar(1100, 490);
  svg += titleBlock('GROUND FLOOR PLAN', 'HBP-GF-002', '1:50');
  svg += svgClose;
  return svg;
}

// ── Drawing 3: Roof Plan ────────────────────────────────────────────────────────
function makeRoofSVG() {
  const colXs = [340, 600, 860];
  const rowYs = [220, 440, 660];
  let svg = svgOpen('#f0f4fa');
  svg += `<text x="${W/2}" y="35" font-family="Arial Black,Arial" font-size="22" fill="#1a2744" text-anchor="middle" font-weight="bold">ROOF PLAN — HBP-RF-003</text>`;

  // Roof outline
  svg += `<rect x="220" y="120" width="760" height="640" fill="#e8ddd0" stroke="#4a3728" stroke-width="5" filter="url(#shadow)"/>`;

  // Ridge line
  svg += `<line x1="220" y1="440" x2="980" y2="440" stroke="#4a3728" stroke-width="4" stroke-dasharray="12,6"/>`;
  svg += `<line x1="600" y1="120" x2="600" y2="760" stroke="#4a3728" stroke-width="3" stroke-dasharray="8,5"/>`;

  // Roof slope hatch (left side)
  for (let y = 140; y < 760; y += 30) {
    svg += `<line x1="230" y1="${y}" x2="${Math.min(590, 230 + (y - 140) * 0.7)}" y2="${y}" stroke="#9b8b7a" stroke-width="1" opacity="0.5"/>`;
  }
  // Roof slope hatch (right side)
  for (let y = 140; y < 760; y += 30) {
    svg += `<line x1="610" y1="${y}" x2="${Math.min(970, 610 + (y - 140) * 0.7)}" y2="${y}" stroke="#9b8b7a" stroke-width="1" opacity="0.5"/>`;
  }

  // Ridge label
  svg += `<text x="600" y="455" font-family="Arial,sans-serif" font-size="15" fill="#4a3728" text-anchor="middle" font-weight="bold">RIDGE LINE</text>`;

  // Slope indicators
  svg += `
  <text x="380" y="350" font-family="Arial" font-size="14" fill="#4a3728" text-anchor="middle" font-weight="bold">W SLOPE</text>
  <text x="380" y="370" font-family="Arial" font-size="13" fill="#4a3728" text-anchor="middle">1:3 Pitch</text>
  <text x="820" y="350" font-family="Arial" font-size="14" fill="#4a3728" text-anchor="middle" font-weight="bold">E SLOPE</text>
  <text x="820" y="370" font-family="Arial" font-size="13" fill="#4a3728" text-anchor="middle">1:3 Pitch</text>`;

  // Gutters
  svg += `
  <rect x="210" y="118" width="770" height="12" fill="#607090" rx="4"/>
  <rect x="210" y="750" width="770" height="12" fill="#607090" rx="4"/>
  <text x="600" y="116" font-family="Arial" font-size="12" fill="#607090" text-anchor="middle">GUTTER (125mm UPVC)</text>`;

  // Downpipes
  svg += `
  <circle cx="220" cy="124" r="8" fill="#607090" stroke="#1a2744" stroke-width="1.5"/>
  <circle cx="980" cy="124" r="8" fill="#607090" stroke="#1a2744" stroke-width="1.5"/>
  <circle cx="220" cy="756" r="8" fill="#607090" stroke="#1a2744" stroke-width="1.5"/>
  <circle cx="980" cy="756" r="8" fill="#607090" stroke="#1a2744" stroke-width="1.5"/>
  <text x="1000" y="130" font-family="Arial" font-size="11" fill="#607090">DN</text>`;

  // Overhang
  svg += `<rect x="200" y="105" width="800" height="655" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="5,5"/>`;
  svg += `<text x="1010" y="200" font-family="Arial" font-size="11" fill="#888">600mm\nOverhang</text>`;

  svg += gridLabels(colXs, rowYs, 65, 65);

  svg += `
  <!-- Legend -->
  <rect x="1080" y="120" width="450" height="200" rx="8" fill="white" stroke="#ccc" stroke-width="2" filter="url(#shadow)"/>
  <text x="1100" y="148" font-family="Arial Black" font-size="14" fill="#1a2744" font-weight="bold">ROOF LEGEND</text>
  <rect x="1100" y="158" width="28" height="16" fill="#e8ddd0" stroke="#4a3728" stroke-width="2"/>
  <text x="1136" y="171" font-family="Arial" font-size="13" fill="#333">Mangalore Clay Tiles</text>
  <line x1="1100" y1="192" x2="1128" y2="192" stroke="#4a3728" stroke-width="3" stroke-dasharray="6,4"/>
  <text x="1136" y="196" font-family="Arial" font-size="13" fill="#333">Ridge / Valley Line</text>
  <rect x="1100" y="208" width="28" height="10" fill="#607090" rx="2"/>
  <text x="1136" y="218" font-family="Arial" font-size="13" fill="#333">UPVC Gutter</text>
  <circle cx="1114" cy="234" r="8" fill="#607090"/>
  <text x="1136" y="238" font-family="Arial" font-size="13" fill="#333">Downpipe 90mm</text>
  <rect x="1100" y="250" width="28" height="10" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="4,4"/>
  <text x="1136" y="260" font-family="Arial" font-size="13" fill="#333">Roof Overhang</text>
  <text x="1100" y="300" font-family="Arial" font-size="12" fill="#666">Roof Pitch: 18.4° (1:3)</text>
  <text x="1100" y="316" font-family="Arial" font-size="12" fill="#666">Rafter: 100×50mm Teak @ 600 c/c</text>`;

  svg += northArrow(1490, 490);
  svg += scaleBar(1100, 520);
  svg += titleBlock('ROOF PLAN', 'HBP-RF-003', '1:100');
  svg += svgClose;
  return svg;
}

// ── Drawing 4: Electrical Layout Plan ─────────────────────────────────────────
function makeElectricalSVG() {
  const colXs = [150, 380, 600, 820, 1040, 1260];
  const rowYs = [180, 440, 700];
  let svg = svgOpen('#f4f4ff');
  svg += `<text x="${W/2}" y="35" font-family="Arial Black,Arial" font-size="22" fill="#1a2744" text-anchor="middle" font-weight="bold">ELECTRICAL LAYOUT PLAN — HBP-EL-004</text>`;

  // Background floor outline
  svg += `<rect x="100" y="100" width="1200" height="680" fill="#eeeef8" stroke="#5050c0" stroke-width="4" filter="url(#shadow)"/>`;

  // Zone fills
  svg += `<rect x="100" y="100" width="400" height="680" fill="#e8e8ff" opacity="0.5"/>`;
  svg += `<text x="300" y="130" font-family="Arial" font-size="13" fill="#5050c0" text-anchor="middle" font-weight="bold">LIVING / DINING ZONE</text>`;
  svg += `<rect x="500" y="100" width="400" height="680" fill="#fff8e8" opacity="0.5"/>`;
  svg += `<text x="700" y="130" font-family="Arial" font-size="13" fill="#c07000" text-anchor="middle" font-weight="bold">BEDROOM ZONE</text>`;
  svg += `<rect x="900" y="100" width="400" height="680" fill="#e8fff8" opacity="0.5"/>`;
  svg += `<text x="1100" y="130" font-family="Arial" font-size="13" fill="#007060" text-anchor="middle" font-weight="bold">SERVICE ZONE</text>`;

  // Conduit routing lines
  const conduitColor = '#f0a020';
  svg += `
  <!-- Main conduit trunk lines -->
  <polyline points="150,180 150,700" fill="none" stroke="${conduitColor}" stroke-width="3" stroke-dasharray="10,5" opacity="0.7"/>
  <polyline points="150,440 1260,440" fill="none" stroke="${conduitColor}" stroke-width="2" stroke-dasharray="8,5" opacity="0.5"/>
  <polyline points="150,700 1260,700" fill="none" stroke="${conduitColor}" stroke-width="2" stroke-dasharray="8,5" opacity="0.5"/>`;

  // Symbols: DB, light, fan, AC, socket
  function lightPoint(x, y, label) {
    return `<circle cx="${x}" cy="${y}" r="14" fill="white" stroke="#5050c0" stroke-width="2.5"/><line x1="${x-10}" y1="${y}" x2="${x+10}" y2="${y}" stroke="#5050c0" stroke-width="2"/><line x1="${x}" y1="${y-10}" x2="${x}" y2="${y+10}" stroke="#5050c0" stroke-width="2"/><text x="${x}" y="${y+26}" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">${label}</text>`;
  }
  function fanPoint(x, y, label) {
    return `<circle cx="${x}" cy="${y}" r="14" fill="#fff8e0" stroke="#c07000" stroke-width="2.5"/><path d="M${x},${y-10} A12,12 0 0,1 ${x+10},${y}" fill="none" stroke="#c07000" stroke-width="2"/><path d="M${x+10},${y} A12,12 0 0,1 ${x},${y+10}" fill="none" stroke="#c07000" stroke-width="2"/><path d="M${x},${y+10} A12,12 0 0,1 ${x-10},${y}" fill="none" stroke="#c07000" stroke-width="2"/><text x="${x}" y="${y+26}" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">${label}</text>`;
  }
  function acPoint(x, y, label) {
    return `<rect x="${x-14}" y="${y-10}" width="28" height="20" rx="4" fill="#d6fff0" stroke="#007060" stroke-width="2.5"/><text x="${x}" y="${y+4}" font-family="Arial Black" font-size="10" fill="#007060" text-anchor="middle">AC</text><text x="${x}" y="${y+26}" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">${label}</text>`;
  }
  function dbBox(x, y, label) {
    return `<rect x="${x-18}" y="${y-18}" width="36" height="36" fill="#1a2744" stroke="#5050c0" stroke-width="3" rx="4"/><text x="${x}" y="${y+5}" font-family="Arial Black" font-size="11" fill="white" text-anchor="middle">DB</text><text x="${x}" y="${y+30}" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">${label}</text>`;
  }
  function socketPoint(x, y, label) {
    return `<rect x="${x-12}" y="${y-12}" width="24" height="24" rx="3" fill="#fff" stroke="#5050c0" stroke-width="2.5"/><circle cx="${x-5}" cy="${y-3}" r="3" fill="#5050c0"/><circle cx="${x+5}" cy="${y-3}" r="3" fill="#5050c0"/><text x="${x}" y="${y+26}" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">${label}</text>`;
  }

  // Row 1
  svg += dbBox(150, 180, 'DB1');
  svg += lightPoint(380, 180, 'L1');
  svg += lightPoint(600, 180, 'L2');
  svg += fanPoint(820, 180, 'F1');
  svg += lightPoint(1040, 180, 'L3');
  svg += acPoint(1260, 180, 'AC1');
  // Row 2
  svg += socketPoint(150, 440, 'S1-S4');
  svg += socketPoint(380, 440, 'SB1');
  svg += lightPoint(600, 440, 'L5');
  svg += lightPoint(820, 440, 'L6-WP');
  svg += dbBox(1040, 440, 'DB2');
  svg += lightPoint(1260, 440, 'L7-EXT');
  // Row 3
  svg += acPoint(150, 700, 'AC2');
  svg += lightPoint(380, 700, 'L7-ST');
  svg += socketPoint(600, 700, 'S3-KT');
  svg += fanPoint(820, 700, 'F2');
  svg += lightPoint(1040, 700, 'EARTH');
  svg += lightPoint(1260, 700, 'T&C');

  svg += gridLabels(colXs, rowYs, 65, 65);

  // Legend
  svg += `
  <rect x="1310" y="120" width="270" height="300" rx="8" fill="white" stroke="#ccc" stroke-width="2" filter="url(#shadow)"/>
  <text x="1330" y="148" font-family="Arial Black" font-size="13" fill="#1a2744" font-weight="bold">MEP LEGEND</text>
  ${lightPoint(1345, 172, '')}
  <text x="1368" y="178" font-family="Arial" font-size="12" fill="#333"> Light Point</text>
  ${fanPoint(1345, 204, '')}
  <text x="1368" y="210" font-family="Arial" font-size="12" fill="#333"> Ceiling Fan</text>
  ${acPoint(1345, 236, '')}
  <text x="1368" y="242" font-family="Arial" font-size="12" fill="#333"> AC Unit</text>
  ${socketPoint(1345, 268, '')}
  <text x="1368" y="274" font-family="Arial" font-size="12" fill="#333"> Socket Point</text>
  ${dbBox(1345, 305, '')}
  <text x="1368" y="311" font-family="Arial" font-size="12" fill="#333"> Distribution Board</text>
  <line x1="1330" y1="332" x2="1360" y2="332" stroke="${conduitColor}" stroke-width="3" stroke-dasharray="8,4"/>
  <text x="1368" y="337" font-family="Arial" font-size="12" fill="#333"> Conduit Run</text>
  <text x="1330" y="390" font-family="Arial" font-size="11" fill="#666">Supply: 63A TPN, 240V</text>
  <text x="1330" y="406" font-family="Arial" font-size="11" fill="#666">Wire: CPVC 1.5–2.5mm²</text>`;

  svg += northArrow(1490, 750);
  svg += titleBlock('ELECTRICAL LAYOUT PLAN', 'HBP-EL-004', '1:50');
  svg += svgClose;
  return svg;
}

// ── Drawing 5: Plumbing and Drainage Plan ─────────────────────────────────────
function makePlumbingSVG() {
  const colXs = [200, 480, 760, 1040];
  const rowYs = [230, 560, 720];
  let svg = svgOpen('#f0f8ff');
  svg += `<text x="${W/2}" y="35" font-family="Arial Black,Arial" font-size="22" fill="#1a2744" text-anchor="middle" font-weight="bold">PLUMBING &amp; DRAINAGE PLAN — HBP-PL-005</text>`;

  // Background
  svg += `<rect x="120" y="100" width="980" height="720" fill="#e8f4ff" stroke="#2070c0" stroke-width="4" filter="url(#shadow)"/>`;

  // Supply water lines (blue)
  svg += `
  <!-- Cold water main -->
  <polyline points="200,100 200,720" fill="none" stroke="#2080ff" stroke-width="4" stroke-dasharray="14,6"/>
  <polyline points="200,560 1040,560" fill="none" stroke="#2080ff" stroke-width="3" stroke-dasharray="10,5"/>
  <!-- Hot water (red) -->
  <polyline points="200,230 760,230" fill="none" stroke="#ff4040" stroke-width="3" stroke-dasharray="10,5"/>
  <!-- Drainage (grey) -->
  <polyline points="200,720 1040,720" fill="none" stroke="#808090" stroke-width="5"/>
  <polyline points="480,720 480,100" fill="none" stroke="#808090" stroke-width="3"/>`;

  // Fixtures
  function wc(x, y, label) {
    return `<ellipse cx="${x}" cy="${y}" rx="18" ry="24" fill="white" stroke="#2070c0" stroke-width="2.5"/><rect x="${x-14}" y="${y-35}" width="28" height="20" rx="4" fill="#b0d8ff" stroke="#2070c0" stroke-width="2"/><text x="${x}" y="${y+42}" font-family="Arial Bold" font-size="12" fill="#1a2744" text-anchor="middle" font-weight="bold">${label}</text>`;
  }
  function basin(x, y, label) {
    return `<ellipse cx="${x}" cy="${y}" rx="20" ry="14" fill="white" stroke="#2070c0" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="4" fill="#2070c0"/><text x="${x}" y="${y+30}" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" font-weight="bold">${label}</text>`;
  }
  function shower(x, y, label) {
    return `<rect x="${x-18}" y="${y-18}" width="36" height="36" rx="18" fill="#e0f0ff" stroke="#2070c0" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#2070c0" stroke-width="1.5"/><line x1="${x-6}" y1="${y-14}" x2="${x-6}" y2="${y+14}" stroke="#2070c0" stroke-width="1"/><line x1="${x+6}" y1="${y-14}" x2="${x+6}" y2="${y+14}" stroke="#2070c0" stroke-width="1"/><text x="${x}" y="${y+34}" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" font-weight="bold">${label}</text>`;
  }
  function sump(x, y, label) {
    return `<rect x="${x-24}" y="${y-18}" width="48" height="36" rx="4" fill="#c0d8f0" stroke="#2070c0" stroke-width="2.5"/><text x="${x}" y="${y+5}" font-family="Arial Black" font-size="10" fill="#1a2744" text-anchor="middle">SUMP</text><text x="${x}" y="${y+32}" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" font-weight="bold">${label}</text>`;
  }
  function tank(x, y, label) {
    return `<rect x="${x-22}" y="${y-18}" width="44" height="36" rx="4" fill="#d0eeff" stroke="#2070c0" stroke-width="2.5"/><text x="${x}" y="${y+5}" font-family="Arial Black" font-size="10" fill="#1a2744" text-anchor="middle">TANK</text><text x="${x}" y="${y+32}" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle" font-weight="bold">${label}</text>`;
  }

  // Row 1
  svg += wc(200, 230, 'WC1');
  svg += basin(480, 230, 'BS1');
  svg += wc(760, 230, 'WC2');
  svg += shower(1040, 230, 'SH1');
  // Row 2
  svg += basin(200, 560, 'SINK\nKITCHEN');
  svg += `<circle cx="480" cy="560" r="14" fill="#e0f0ff" stroke="#2070c0" stroke-width="2.5"/><text x="480" y="564" font-family="Arial" font-size="10" fill="#1a2744" text-anchor="middle">FD</text><text x="480" y="595" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">Floor\nDrain</text>`;
  svg += `<ellipse cx="760" cy="560" rx="28" ry="18" fill="#d0e8ff" stroke="#2070c0" stroke-width="2.5"/><text x="760" y="564" font-family="Arial Black" font-size="10" fill="#1a2744" text-anchor="middle">BATH</text><text x="760" y="590" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">BS2</text>`;
  svg += basin(1040, 560, 'BS2\nENS');
  // Row 3
  svg += `<circle cx="200" cy="720" r="18" fill="#ffe8d0" stroke="#c05000" stroke-width="2.5"/><text x="200" y="724" font-family="Arial Black" font-size="10" fill="#c05000" text-anchor="middle">GYS</text><text x="200" y="755" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle">Geyser</text>`;
  svg += sump(480, 720, '10kL');
  svg += tank(760, 720, '2000L');
  svg += `<circle cx="1040" cy="720" r="16" fill="#e0ffe8" stroke="#007040" stroke-width="2.5"/><text x="1040" y="724" font-family="Arial Black" font-size="9" fill="#007040" text-anchor="middle">PUMP</text><text x="1040" y="752" font-family="Arial" font-size="12" fill="#1a2744" text-anchor="middle">1HP</text>`;

  // Flow arrows
  svg += `<line x1="200" y1="300" x2="200" y2="350" stroke="#2080ff" stroke-width="2" marker-end="url(#arrow)"/>`;
  svg += `<line x1="480" y1="720" x2="760" y2="720" stroke="#2080ff" stroke-width="2" marker-end="url(#arrow)"/>`;

  svg += gridLabels(colXs, rowYs, 65, 65);

  // Legend
  svg += `
  <rect x="1120" y="100" width="430" height="330" rx="8" fill="white" stroke="#ccc" stroke-width="2" filter="url(#shadow)"/>
  <text x="1140" y="128" font-family="Arial Black" font-size="14" fill="#1a2744" font-weight="bold">PLUMBING LEGEND</text>
  <line x1="1140" y1="148" x2="1180" y2="148" stroke="#2080ff" stroke-width="4" stroke-dasharray="10,5"/>
  <text x="1190" y="153" font-family="Arial" font-size="13" fill="#333">Cold Water Supply</text>
  <line x1="1140" y1="172" x2="1180" y2="172" stroke="#ff4040" stroke-width="3" stroke-dasharray="8,5"/>
  <text x="1190" y="177" font-family="Arial" font-size="13" fill="#333">Hot Water Supply</text>
  <line x1="1140" y1="196" x2="1180" y2="196" stroke="#808090" stroke-width="5"/>
  <text x="1190" y="201" font-family="Arial" font-size="13" fill="#333">Soil / Waste Drain</text>
  ${wc(1155, 232, '')}
  <text x="1180" y="238" font-family="Arial" font-size="12" fill="#333"> WC (Water Closet)</text>
  ${basin(1155, 268, '')}
  <text x="1180" y="274" font-family="Arial" font-size="12" fill="#333"> Wash Basin</text>
  ${shower(1155, 304, '')}
  <text x="1180" y="310" font-family="Arial" font-size="12" fill="#333"> Shower Unit</text>
  <text x="1140" y="390" font-family="Arial" font-size="12" fill="#666">Pipe: CPVC (supply), PVC (waste)</text>
  <text x="1140" y="406" font-family="Arial" font-size="12" fill="#666">Supply: 25mm / Waste: 50–110mm</text>`;

  svg += northArrow(1490, 760);
  svg += titleBlock('PLUMBING & DRAINAGE PLAN', 'HBP-PL-005', '1:50');
  svg += svgClose;
  return svg;
}

// ── Drawing 6: Interior Finishing Plan ────────────────────────────────────────
function makeInteriorSVG() {
  const colXs = [200, 480, 760, 1020];
  const rowYs = [350, 640, 780];
  let svg = svgOpen('#fff8f4');
  svg += `<text x="${W/2}" y="35" font-family="Arial Black,Arial" font-size="22" fill="#1a2744" text-anchor="middle" font-weight="bold">INTERIOR FINISHING PLAN — HBP-INT-006</text>`;

  // Room zones with rich colours
  const zones = [
    { x:120, y:90, w:280, h:600, fill:'#ffe4c4', label:'LIVING\n& DINING', lx:260, ly:350 },
    { x:400, y:90, w:240, h:430, fill:'#c8e6c9', label:'MASTER\nBEDROOM', lx:520, ly:280 },
    { x:640, y:90, w:250, h:430, fill:'#bbdefb', label:'BED 2\n& 3', lx:765, ly:280 },
    { x:890, y:90, w:230, h:430, fill:'#f8bbd0', label:'GARAGE /\nSERVICE', lx:1005, ly:280 },
    { x:400, y:520, w:240, h:170, fill:'#fff9c4', label:'KITCHEN', lx:520, ly:600 },
    { x:640, y:520, w:480, h:170, fill:'#e1bee7', label:'CORRIDORS / UTILITY', lx:880, ly:600 },
  ];

  zones.forEach(z => {
    svg += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${z.fill}" stroke="#5a3825" stroke-width="3" filter="url(#shadow)"/>`;
    z.label.split('\n').forEach((line, i) =>
      svg += `<text x="${z.lx}" y="${z.ly + i * 22}" font-family="Arial,sans-serif" font-size="14" fill="#333" text-anchor="middle" font-weight="bold" opacity="0.8">${line}</text>`
    );
  });

  // Outer walls
  svg += `<rect x="120" y="90" width="1000" height="600" fill="none" stroke="#5a3825" stroke-width="6"/>`;

  // Interior walls
  svg += `
  <line x1="400" y1="90" x2="400" y2="690" stroke="#5a3825" stroke-width="4"/>
  <line x1="640" y1="90" x2="640" y2="690" stroke="#5a3825" stroke-width="4"/>
  <line x1="890" y1="90" x2="890" y2="690" stroke="#5a3825" stroke-width="4"/>
  <line x1="400" y1="520" x2="1120" y2="520" stroke="#5a3825" stroke-width="4"/>`;

  // Furniture symbols (simplified)
  // Sofa in living
  svg += `<rect x="145" y="200" width="210" height="80" rx="10" fill="#a0785a" opacity="0.6"/><text x="250" y="248" font-family="Arial" font-size="11" fill="white" text-anchor="middle">SOFA</text>`;
  // Dining table
  svg += `<ellipse cx="250" cy="450" rx="70" ry="50" fill="#8b5e3c" opacity="0.6"/><text x="250" y="454" font-family="Arial" font-size="11" fill="white" text-anchor="middle">DINING</text>`;
  // Bed in master
  svg += `<rect x="420" y="150" width="180" height="120" rx="8" fill="#4a8060" opacity="0.5"/><rect x="420" y="150" width="180" height="35" rx="8" fill="#2a6040" opacity="0.7"/><text x="510" y="220" font-family="Arial" font-size="11" fill="white" text-anchor="middle">MASTER BED</text>`;
  // Wardrobe
  svg += `<rect x="420" y="390" width="180" height="50" rx="4" fill="#8a6040" opacity="0.6"/><text x="510" y="420" font-family="Arial" font-size="11" fill="white" text-anchor="middle">WARDROBE</text>`;
  // Bed 2
  svg += `<rect x="660" y="150" width="150" height="110" rx="8" fill="#2060a0" opacity="0.4"/><text x="735" y="210" font-family="Arial" font-size="11" fill="#1a2744" text-anchor="middle">BED 2</text>`;
  // Kitchen cabinets
  svg += `<rect x="410" y="530" width="215" height="40" rx="4" fill="#c0a060" opacity="0.7"/><text x="518" y="555" font-family="Arial" font-size="11" fill="white" text-anchor="middle">MODULAR KITCHEN</text>`;

  // Finishing annotations
  svg += `
  <text x="250" y="120" font-family="Arial" font-size="11" fill="#5a3825" text-anchor="middle">Vitrified Tiles 600×600</text>
  <text x="520" y="120" font-family="Arial" font-size="11" fill="#5a3825" text-anchor="middle">Royale Paint – Ivory White</text>
  <text x="765" y="120" font-family="Arial" font-size="11" fill="#5a3825" text-anchor="middle">Royale Paint – Pale Blue</text>
  <text x="1005" y="120" font-family="Arial" font-size="11" fill="#5a3825" text-anchor="middle">Epoxy Floor Coat</text>`;

  svg += gridLabels(colXs, rowYs, 65, 65);

  // Legend
  svg += `
  <rect x="1140" y="100" width="420" height="360" rx="8" fill="white" stroke="#ccc" stroke-width="2" filter="url(#shadow)"/>
  <text x="1160" y="128" font-family="Arial Black" font-size="14" fill="#1a2744" font-weight="bold">FINISH SCHEDULE</text>
  <rect x="1160" y="140" width="22" height="16" fill="#ffe4c4" stroke="#5a3825" stroke-width="1.5"/>
  <text x="1190" y="153" font-family="Arial" font-size="12" fill="#333">Living/Dining – Vit. Tile 600×600</text>
  <rect x="1160" y="163" width="22" height="16" fill="#c8e6c9" stroke="#5a3825" stroke-width="1.5"/>
  <text x="1190" y="176" font-family="Arial" font-size="12" fill="#333">Master Bedroom – Wooden Flooring</text>
  <rect x="1160" y="186" width="22" height="16" fill="#bbdefb" stroke="#5a3825" stroke-width="1.5"/>
  <text x="1190" y="199" font-family="Arial" font-size="12" fill="#333">Bedrooms 2 & 3 – Vit. Tile 600×600</text>
  <rect x="1160" y="209" width="22" height="16" fill="#f8bbd0" stroke="#5a3825" stroke-width="1.5"/>
  <text x="1190" y="222" font-family="Arial" font-size="12" fill="#333">Garage – Epoxy Floor Coat</text>
  <rect x="1160" y="232" width="22" height="16" fill="#fff9c4" stroke="#5a3825" stroke-width="1.5"/>
  <text x="1190" y="245" font-family="Arial" font-size="12" fill="#333">Kitchen – Anti-skid Ceramic</text>
  <rect x="1160" y="255" width="22" height="16" fill="#e1bee7" stroke="#5a3825" stroke-width="1.5"/>
  <text x="1190" y="268" font-family="Arial" font-size="12" fill="#333">Utility/Corridor – Ceramic 300×300</text>
  <line x1="1160" y1="290" x2="1540" y2="290" stroke="#eee" stroke-width="1"/>
  <text x="1160" y="310" font-family="Arial Black" font-size="13" fill="#1a2744" font-weight="bold">WALL FINISH</text>
  <text x="1160" y="332" font-family="Arial" font-size="12" fill="#555">Bedrooms: Asian Paints Royale Shyne</text>
  <text x="1160" y="350" font-family="Arial" font-size="12" fill="#555">Living: Royale Shyne (Interior)</text>
  <text x="1160" y="368" font-family="Arial" font-size="12" fill="#555">Kitchen/Bath: Ceramic Wall Tiles</text>
  <text x="1160" y="386" font-family="Arial" font-size="12" fill="#555">All: 2-coat putty + 1-coat primer</text>
  <text x="1160" y="440" font-family="Arial" font-size="11" fill="#666">Ceiling Ht: 2700mm | False ceiling: 2550mm</text>`;

  svg += northArrow(1490, 780);
  svg += scaleBar(1140, 520);
  svg += titleBlock('INTERIOR FINISHING PLAN', 'HBP-INT-006', '1:50');
  svg += svgClose;
  return svg;
}

// ── Upload SVGs ────────────────────────────────────────────────────────────────

const DRAWINGS = [
  { id: 'ab7b4fc3-2641-4a22-a0cd-e17c33f73d00', name: 'Foundation Plan', svg: makeFoundationSVG() },
  { id: 'ded710c4-2eb9-41c3-a235-d24ee29263d6', name: 'Ground Floor Plan', svg: makeGroundFloorSVG() },
  { id: '12b0ce29-ff25-46d2-bc99-fb8c3529bc79', name: 'Roof Plan', svg: makeRoofSVG() },
  { id: '628bde45-dcdc-4ae5-b635-4e6301496968', name: 'Electrical Layout Plan', svg: makeElectricalSVG() },
  { id: 'e2cab291-8be9-467d-b334-24fd13ccd4a1', name: 'Plumbing and Drainage Plan', svg: makePlumbingSVG() },
  { id: '3efd90a6-309c-4497-b41b-28c347ea0122', name: 'Interior Finishing Plan', svg: makeInteriorSVG() },
];

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
  console.log('Generating and uploading improved high-visibility construction drawings...\n');

  // Save SVGs locally first (for reference)
  const outDir = './assets/improved-drawings';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const drw of DRAWINGS) {
    const filename = drw.name.toLowerCase().replace(/ /g, '-') + '.svg';
    fs.writeFileSync(`${outDir}/${filename}`, drw.svg, 'utf8');
    console.log(`  📄 Saved ${filename} (${Math.round(drw.svg.length / 1024)}KB)`);

    process.stdout.write(`  ☁️  Uploading ${drw.name}... `);
    try {
      await uploadSVG(drw.id, drw.svg);
      console.log('✅ Done');
    } catch (err) {
      console.log(`⚠️  Upload failed: ${err.message} (file saved locally)`);
    }
  }

  console.log('\n✅ All improved drawings generated!');
  console.log('Open: https://buildtrack-withdrawing.onslate.in/projects');
}

main().catch(err => { console.error('\nFailed:', err.message || err); process.exit(1); });
