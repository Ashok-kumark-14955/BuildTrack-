/**
 * upload_roof_foundation_cad.mjs
 *
 * Generates professional CAD-style SVGs for:
 *   - Roof Plan  (HBP-RF-003)
 *   - Foundation Plan  (HBP-FND-001)
 * and uploads them to replace existing drawings.
 *
 * Run: node upload_roof_foundation_cad.mjs
 */

import fs from 'fs';
import { request as httpsRequest } from 'https';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const PROJECT_ID = 'b0af18f2-99dc-4ab8-8496-09d779343c8b';

const ROOF_DRAWING_ID       = '12b0ce29-ff25-46d2-bc99-fb8c3529bc79';
const ROOF_MILESTONE_ID     = '6883bb07-59c3-41ef-a319-7dc224835380';

const FOUNDATION_DRAWING_ID = 'ab7b4fc3-2641-4a22-a0cd-e17c33f73d00';
const FOUNDATION_MILESTONE_ID = '3d9bae5a-3965-4467-b707-f131e2e1cec6';

// ── SVG constants ────────────────────────────────────────────────────────────
const W = 1800, H = 1100;
const WALL_COL = '#1a1a2e';
const DIM_COL  = '#2c3e50';
const GRID_COL = '#3a3aaa';
const BG_ROOF  = '#f5f5f0';
const BG_FND   = '#f7f4ee';

// ── Shared helpers ───────────────────────────────────────────────────────────
function svgHeader(bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial,Helvetica,sans-serif">
<defs>
  <filter id="sd"><feDropShadow dx="1.5" dy="1.5" stdDeviation="2.5" flood-opacity="0.20"/></filter>
  <marker id="arro" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="${DIM_COL}"/></marker>
  <marker id="arrl" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto"><path d="M7,0 L7,6 L0,3 z" fill="${DIM_COL}"/></marker>
</defs>
<rect width="${W}" height="${H}" fill="${bg}"/>
<rect x="10" y="10" width="${W-20}" height="${H-20}" fill="none" stroke="${WALL_COL}" stroke-width="2"/>
<rect x="15" y="15" width="${W-30}" height="${H-30}" fill="none" stroke="${WALL_COL}" stroke-width="0.8"/>`;
}

function titleBlock(title, number, scale) {
  return `
<rect x="10" y="${H-78}" width="${W-20}" height="68" fill="${WALL_COL}"/>
<line x1="10" y1="${H-78}" x2="${W-10}" y2="${H-78}" stroke="#4a6a90" stroke-width="1"/>
<text x="30" y="${H-55}" font-size="17" fill="white" font-weight="900">${title}</text>
<text x="30" y="${H-33}" font-size="12" fill="#a0c0e0">Drawing No: ${number}  |  House Building Project  |  Scale ${scale}  |  Date: 09 Aug 2026</text>
<text x="${W/2}" y="${H-55}" font-size="13" fill="#d0e4f8" text-anchor="middle" font-weight="bold">CLIENT: HOUSE BUILDING PROJECT</text>
<text x="${W/2}" y="${H-34}" font-size="11" fill="#8ab0cc" text-anchor="middle">Drawn by: Arch. Division  |  Checked by: Structural Eng.  |  Approved by: Project Manager</text>
<text x="${W-30}" y="${H-55}" font-size="13" fill="#d0e4f8" text-anchor="end" font-weight="bold">BUILDTRACK</text>
<text x="${W-30}" y="${H-34}" font-size="11" fill="#8ab0cc" text-anchor="end">Construction Management Platform</text>`;
}

function northArrow(cx, cy) {
  return `<g transform="translate(${cx},${cy})">
  <circle cx="0" cy="0" r="28" fill="white" stroke="${WALL_COL}" stroke-width="2"/>
  <polygon points="0,-22 7,10 0,5 -7,10" fill="${WALL_COL}"/>
  <polygon points="0,-22 -7,10 0,5 7,10" fill="#9eb1c8"/>
  <text x="0" y="-26" font-size="13" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">N</text>
</g>`;
}

function scaleBar(x, y, label) {
  return `<g transform="translate(${x},${y})">
  <rect x="0" y="0" width="50" height="12" fill="${WALL_COL}"/>
  <rect x="50" y="0" width="50" height="12" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <rect x="100" y="0" width="50" height="12" fill="${WALL_COL}"/>
  <text x="0" y="26" font-size="11" fill="${WALL_COL}">0</text>
  <text x="48" y="26" font-size="11" fill="${WALL_COL}">5m</text>
  <text x="98" y="26" font-size="11" fill="${WALL_COL}">10m</text>
  <text x="75" y="-4" font-size="11" fill="#5a6a80" text-anchor="middle">Scale ${label}</text>
</g>`;
}

function gridBubbles(cols, rows, byTop, byLeft, bHeight) {
  const letters = 'ABCDEFGH';
  let s = '';
  cols.forEach((x, i) => {
    s += `<circle cx="${x}" cy="${byTop}" r="16" fill="${GRID_COL}" stroke="white" stroke-width="2"/>
<text x="${x}" y="${byTop+5}" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${letters[i]}</text>
<line x1="${x}" y1="${byTop+16}" x2="${x}" y2="${bHeight}" stroke="${GRID_COL}" stroke-width="1.2" stroke-dasharray="5,6" opacity="0.3"/>`;
  });
  rows.forEach((y, i) => {
    s += `<circle cx="${byLeft}" cy="${y}" r="16" fill="${GRID_COL}" stroke="white" stroke-width="2"/>
<text x="${byLeft}" y="${y+5}" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${i+1}</text>
<line x1="${byLeft+16}" y1="${y}" x2="${W-120}" y2="${y}" stroke="${GRID_COL}" stroke-width="1.2" stroke-dasharray="5,6" opacity="0.3"/>`;
  });
  return s;
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOF PLAN SVG
// ══════════════════════════════════════════════════════════════════════════════
function makeRoofPlanSVG() {
  // Building footprint (same as floor plan footprint)
  const BX = 140, BY = 90, BW = 1050, BH = 750;
  const ridgeX = BX + BW/2;         // vertical ridge
  const ridgeY = BY + BH/2;         // horizontal ridge

  // Grid lines
  const cols = [BX, BX+350, BX+700, BX+BW];
  const rows = [BY, BY+250, BY+500, BY+BH];

  // Hatch lines for roof slopes (right-leaning for W slope, left for E slope)
  const hatchLines = [];
  const spacing = 28;
  // West slope (left of ridge): hatched lines going down-right
  for (let y = BY + spacing; y < BY + BH; y += spacing) {
    const x1 = BX + 4;
    const x2 = ridgeX - 4;
    hatchLines.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${Math.min(BY+BH-4, y+60)}" stroke="#b0a898" stroke-width="0.8" opacity="0.55"/>`);
  }
  // East slope: symmetrical
  for (let y = BY + spacing; y < BY + BH; y += spacing) {
    const x1 = ridgeX + 4;
    const x2 = BX + BW - 4;
    hatchLines.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${Math.min(BY+BH-4, y+60)}" stroke="#b0a898" stroke-width="0.8" opacity="0.55"/>`);
  }

  // Contour lines (roof slope indicated by concentric rectangles inset)
  const contourLines = [];
  for (let i = 1; i <= 5; i++) {
    const inset = i * 28;
    contourLines.push(`<rect x="${BX+inset}" y="${BY+inset}" width="${BW-inset*2}" height="${BH-inset*2}" fill="none" stroke="#c8b89a" stroke-width="0.7" stroke-dasharray="6,5" opacity="0.5"/>`);
  }

  const svg = `${svgHeader(BG_ROOF)}

<!-- Sheet heading -->
<text x="${W/2}" y="52" font-size="26" fill="${WALL_COL}" text-anchor="middle" font-weight="900" letter-spacing="2">ROOF PLAN</text>
<text x="${W/2}" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT   |   Drawing No: HBP-RF-003   |   Scale 1:100   |   Sheet 1 of 1</text>

<!-- ── Roof surface (tile fill) ── -->
<defs>
  <pattern id="rooftile" x="0" y="0" width="36" height="20" patternUnits="userSpaceOnUse">
    <rect width="36" height="20" fill="#d4c8b8"/>
    <rect x="0" y="0" width="18" height="10" fill="#c8bba8" stroke="#b0a08a" stroke-width="0.5"/>
    <rect x="18" y="0" width="18" height="10" fill="#d4c8b8" stroke="#b0a08a" stroke-width="0.5"/>
    <rect x="9" y="10" width="18" height="10" fill="#c8bba8" stroke="#b0a08a" stroke-width="0.5"/>
    <rect x="-9" y="10" width="18" height="10" fill="#d4c8b8" stroke="#b0a08a" stroke-width="0.5"/>
    <rect x="27" y="10" width="9" height="10" fill="#d4c8b8" stroke="#b0a08a" stroke-width="0.5"/>
  </pattern>
  <pattern id="metalsheet" x="0" y="0" width="20" height="60" patternUnits="userSpaceOnUse">
    <rect width="20" height="60" fill="#a8b8c0"/>
    <line x1="0" y1="0" x2="0" y2="60" stroke="#90a0a8" stroke-width="1.5"/>
    <line x1="20" y1="0" x2="20" y2="60" stroke="#90a0a8" stroke-width="1.5"/>
    <line x1="10" y1="0" x2="10" y2="60" stroke="#8898a0" stroke-width="0.5"/>
  </pattern>
</defs>

<!-- West slope fill (clay tile) -->
<polygon points="${BX},${BY} ${ridgeX},${BY} ${ridgeX},${BY+BH} ${BX},${BY+BH}" fill="url(#rooftile)" opacity="0.85"/>

<!-- East slope fill (metal sheet — different material) -->
<polygon points="${ridgeX},${BY} ${BX+BW},${BY} ${BX+BW},${BY+BH} ${ridgeX},${BY+BH}" fill="url(#metalsheet)" opacity="0.7"/>

<!-- Contour / slope indicator lines -->
${contourLines.join('\n')}

<!-- Hatch lines (direction of slope) -->
${hatchLines.join('\n')}

<!-- ── Outer building footprint (eave line bold) ── -->
<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" fill="none" stroke="${WALL_COL}" stroke-width="5" filter="url(#sd)"/>

<!-- ── Ridge line (bold centre line) ── -->
<line x1="${ridgeX}" y1="${BY}" x2="${ridgeX}" y2="${BY+BH}" stroke="${WALL_COL}" stroke-width="3.5"/>
<line x1="${BX}" y1="${ridgeY}" x2="${BX+BW}" y2="${ridgeY}" stroke="${WALL_COL}" stroke-width="2" stroke-dasharray="14,7"/>

<!-- Ridge labels -->
<rect x="${ridgeX-62}" y="${ridgeY-14}" width="124" height="24" rx="4" fill="white" stroke="${WALL_COL}" stroke-width="1.2"/>
<text x="${ridgeX}" y="${ridgeY+4}" font-size="12" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">RIDGE LINE</text>

<rect x="${ridgeX-52}" y="${BY+50-14}" width="104" height="24" rx="4" fill="white" stroke="${WALL_COL}" stroke-width="1.2"/>
<text x="${ridgeX}" y="${BY+54}" font-size="11" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">APEX RIDGE</text>

<!-- ── Slope direction arrows ── -->
<!-- West slope arrow -->
<line x1="${BX+200}" y1="${ridgeY-60}" x2="${BX+60}" y2="${ridgeY-60}" stroke="${WALL_COL}" stroke-width="2" marker-end="url(#arro)"/>
<text x="${BX+200}" y="${ridgeY-65}" font-size="13" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">SLOPE →</text>
<text x="${BX+200}" y="${ridgeY-45}" font-size="11" fill="#5a6a80" text-anchor="middle">18.4° (1:3) Pitch</text>

<!-- East slope arrow -->
<line x1="${ridgeX+200}" y1="${ridgeY-60}" x2="${BX+BW-60}" y2="${ridgeY-60}" stroke="${WALL_COL}" stroke-width="2" marker-end="url(#arro)"/>
<text x="${ridgeX+200}" y="${ridgeY-65}" font-size="13" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">← SLOPE</text>
<text x="${ridgeX+200}" y="${ridgeY-45}" font-size="11" fill="#5a6a80" text-anchor="middle">18.4° (1:3) Pitch</text>

<!-- ── Valley lines (hip / valley at corners) ── -->
<line x1="${BX}" y1="${BY}" x2="${ridgeX}" y2="${ridgeY}" stroke="${WALL_COL}" stroke-width="2" stroke-dasharray="10,6" opacity="0.6"/>
<line x1="${BX+BW}" y1="${BY}" x2="${ridgeX}" y2="${ridgeY}" stroke="${WALL_COL}" stroke-width="2" stroke-dasharray="10,6" opacity="0.6"/>
<line x1="${BX}" y1="${BY+BH}" x2="${ridgeX}" y2="${ridgeY}" stroke="${WALL_COL}" stroke-width="2" stroke-dasharray="10,6" opacity="0.6"/>
<line x1="${BX+BW}" y1="${BY+BH}" x2="${ridgeX}" y2="${ridgeY}" stroke="${WALL_COL}" stroke-width="2" stroke-dasharray="10,6" opacity="0.6"/>

<!-- ── Roof overhang (600mm dashed) ── -->
<rect x="${BX-30}" y="${BY-30}" width="${BW+60}" height="${BH+60}" fill="none" stroke="#909090" stroke-width="1.5" stroke-dasharray="8,6"/>
<text x="${BX-30}" y="${BY-35}" font-size="11" fill="#707070">600 OVERHANG (TYP)</text>

<!-- ── Gutters (UPVC, bold blue) ── -->
<rect x="${BX-4}" y="${BY-12}" width="${BW+8}" height="10" rx="5" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.2"/>
<rect x="${BX-4}" y="${BY+BH+2}" width="${BW+8}" height="10" rx="5" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.2"/>
<rect x="${BX-12}" y="${BY-4}" width="10" height="${BH+8}" rx="5" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.2"/>
<rect x="${BX+BW+2}" y="${BY-4}" width="10" height="${BH+8}" rx="5" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.2"/>
<text x="${BX+BW/2}" y="${BY-16}" font-size="10" fill="#5080b0" text-anchor="middle">UPVC GUTTER 125mm (ALL EAVES)</text>

<!-- ── Downpipes at corners ── -->
<circle cx="${BX}" cy="${BY}" r="9" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.5"/>
<text x="${BX-14}" y="${BY-12}" font-size="10" fill="#5080b0" font-weight="bold">DN</text>
<circle cx="${BX+BW}" cy="${BY}" r="9" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.5"/>
<text x="${BX+BW+4}" y="${BY-12}" font-size="10" fill="#5080b0" font-weight="bold">DN</text>
<circle cx="${BX}" cy="${BY+BH}" r="9" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.5"/>
<text x="${BX-14}" y="${BY+BH+22}" font-size="10" fill="#5080b0" font-weight="bold">DN</text>
<circle cx="${BX+BW}" cy="${BY+BH}" r="9" fill="#5080b0" stroke="${WALL_COL}" stroke-width="1.5"/>
<text x="${BX+BW+4}" y="${BY+BH+22}" font-size="10" fill="#5080b0" font-weight="bold">DN</text>

<!-- ── Rooflight / Skylight ── -->
<rect x="${BX+80}" y="${ridgeY-50}" width="120" height="100" rx="6" fill="#d0f4ff" stroke="#3090c0" stroke-width="2.5"/>
<line x1="${BX+80}" y1="${ridgeY-50}" x2="${BX+200}" y2="${ridgeY+50}" stroke="#3090c0" stroke-width="1.2"/>
<line x1="${BX+200}" y1="${ridgeY-50}" x2="${BX+80}" y2="${ridgeY+50}" stroke="#3090c0" stroke-width="1.2"/>
<text x="${BX+140}" y="${ridgeY+80}" font-size="11" fill="#3090c0" text-anchor="middle" font-weight="bold">SKYLIGHT 1200×1000</text>

<!-- ── Solar panels ── -->
<rect x="${ridgeX+60}" y="${BY+120}" width="200" height="120" rx="4" fill="#304060" stroke="#202840" stroke-width="2" opacity="0.75"/>
<line x1="${ridgeX+60}" y1="${BY+180}" x2="${ridgeX+260}" y2="${BY+180}" stroke="#406080" stroke-width="1"/>
<line x1="${ridgeX+60}" y1="${BY+150}" x2="${ridgeX+260}" y2="${BY+150}" stroke="#406080" stroke-width="1"/>
<line x1="${ridgeX+60}" y1="${BY+210}" x2="${ridgeX+260}" y2="${BY+210}" stroke="#406080" stroke-width="1"/>
<line x1="${ridgeX+120}" y1="${BY+120}" x2="${ridgeX+120}" y2="${BY+240}" stroke="#406080" stroke-width="1"/>
<line x1="${ridgeX+180}" y1="${BY+120}" x2="${ridgeX+180}" y2="${BY+240}" stroke="#406080" stroke-width="1"/>
<line x1="${ridgeX+240}" y1="${BY+120}" x2="${ridgeX+240}" y2="${BY+240}" stroke="#406080" stroke-width="1"/>
<text x="${ridgeX+160}" y="${BY+280}" font-size="11" fill="#304060" text-anchor="middle" font-weight="bold">SOLAR PANELS (6 No.) 2kW</text>

<!-- ── Dimension lines ── -->
<!-- Overall width -->
<line x1="${BX}" y1="${BY-50}" x2="${BX+BW}" y2="${BY-50}" stroke="${DIM_COL}" stroke-width="1.5" marker-start="url(#arrl)" marker-end="url(#arro)"/>
<line x1="${BX}" y1="${BY-42}" x2="${BX}" y2="${BY-60}" stroke="${DIM_COL}" stroke-width="1.2"/>
<line x1="${BX+BW}" y1="${BY-42}" x2="${BX+BW}" y2="${BY-60}" stroke="${DIM_COL}" stroke-width="1.2"/>
<text x="${BX+BW/2}" y="${BY-60}" font-size="13" fill="${DIM_COL}" text-anchor="middle" font-weight="bold">10 500 mm</text>

<!-- Overall height right -->
<line x1="${BX+BW+45}" y1="${BY}" x2="${BX+BW+45}" y2="${BY+BH}" stroke="${DIM_COL}" stroke-width="1.5" marker-start="url(#arrl)" marker-end="url(#arro)"/>
<line x1="${BX+BW+38}" y1="${BY}" x2="${BX+BW+54}" y2="${BY}" stroke="${DIM_COL}" stroke-width="1.2"/>
<line x1="${BX+BW+38}" y1="${BY+BH}" x2="${BX+BW+54}" y2="${BY+BH}" stroke="${DIM_COL}" stroke-width="1.2"/>
<text x="${BX+BW+70}" y="${BY+BH/2}" font-size="13" fill="${DIM_COL}" text-anchor="middle" font-weight="bold" transform="rotate(-90,${BX+BW+70},${BY+BH/2})">7 500 mm</text>

<!-- Half span (ridge) -->
<line x1="${BX}" y1="${BY+BH+40}" x2="${ridgeX}" y2="${BY+BH+40}" stroke="${DIM_COL}" stroke-width="1.2" marker-start="url(#arrl)" marker-end="url(#arro)"/>
<text x="${(BX+ridgeX)/2}" y="${BY+BH+56}" font-size="11" fill="${DIM_COL}" text-anchor="middle">5 250 mm (half span)</text>

<!-- ── Grid bubbles ── -->
${gridBubbles(cols, rows, 62, 88, BY+BH+20)}

<!-- ── Rafter annotation ── -->
<line x1="${BX+40}" y1="${BY+150}" x2="${BX+40}" y2="${BY+350}" stroke="${WALL_COL}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>
<line x1="${BX+68}" y1="${BY+150}" x2="${BX+68}" y2="${BY+350}" stroke="${WALL_COL}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>
<text x="${BX+20}" y="${BY+260}" font-size="10" fill="${WALL_COL}" text-anchor="middle" transform="rotate(-90,${BX+20},${BY+260})">RAFTER 100×50mm TEAK @ 600 c/c</text>

<!-- ── Legend panel ── -->
<rect x="${BX+BW+110}" y="${BY}" width="310" height="500" rx="10" fill="white" stroke="#d0d8e0" stroke-width="1.8" filter="url(#sd)"/>
<rect x="${BX+BW+110}" y="${BY}" width="310" height="40" rx="10" fill="${WALL_COL}"/>
<text x="${BX+BW+265}" y="${BY+26}" font-size="14" fill="white" text-anchor="middle" font-weight="bold">ROOF SCHEDULE</text>

<rect x="${BX+BW+125}" y="${BY+50}" width="22" height="16" fill="#c8bba8"/>
<text x="${BX+BW+158}" y="${BY+63}" font-size="12" fill="${WALL_COL}" font-weight="bold">West Slope</text>
<text x="${BX+BW+158}" y="${BY+78}" font-size="11" fill="#5a6a80">Mangalore Clay Tiles</text>

<rect x="${BX+BW+125}" y="${BY+95}" width="22" height="16" fill="#a8b8c0"/>
<text x="${BX+BW+158}" y="${BY+108}" font-size="12" fill="${WALL_COL}" font-weight="bold">East Slope</text>
<text x="${BX+BW+158}" y="${BY+123}" font-size="11" fill="#5a6a80">Galv. Metal Sheet</text>

<rect x="${BX+BW+125}" y="${BY+140}" width="22" height="8" rx="4" fill="#5080b0"/>
<text x="${BX+BW+158}" y="${BY+152}" font-size="12" fill="${WALL_COL}" font-weight="bold">UPVC Gutters</text>
<text x="${BX+BW+158}" y="${BY+166}" font-size="11" fill="#5a6a80">125mm half-round</text>

<circle cx="${BX+BW+136}" cy="${BY+182}" r="9" fill="#5080b0"/>
<text x="${BX+BW+158}" y="${BY+186}" font-size="12" fill="${WALL_COL}" font-weight="bold">Downpipes 90mm</text>

<rect x="${BX+BW+125}" y="${BY+200}" width="22" height="16" fill="#d0f4ff" stroke="#3090c0" stroke-width="1.5"/>
<text x="${BX+BW+158}" y="${BY+213}" font-size="12" fill="${WALL_COL}" font-weight="bold">Skylight</text>
<text x="${BX+BW+158}" y="${BY+228}" font-size="11" fill="#5a6a80">1200×1000 Double Glaze</text>

<rect x="${BX+BW+125}" y="${BY+245}" width="22" height="16" fill="#304060" opacity="0.8"/>
<text x="${BX+BW+158}" y="${BY+258}" font-size="12" fill="${WALL_COL}" font-weight="bold">Solar Panels</text>
<text x="${BX+BW+158}" y="${BY+273}" font-size="11" fill="#5a6a80">6 No. × 330W = 2kW</text>

<line x1="${BX+BW+125}" y1="${BY+295}" x2="${BX+BW+405}" y2="${BY+295}" stroke="#e0e0e0" stroke-width="1"/>
<text x="${BX+BW+125}" y="${BY+315}" font-size="12" fill="${WALL_COL}" font-weight="bold">SPECIFICATIONS</text>
<text x="${BX+BW+125}" y="${BY+335}" font-size="11" fill="#555">Roof Pitch: 18.4° (1:3)</text>
<text x="${BX+BW+125}" y="${BY+352}" font-size="11" fill="#555">Eave Height: 3000mm</text>
<text x="${BX+BW+125}" y="${BY+369}" font-size="11" fill="#555">Ridge Height: +1750mm from eave</text>
<text x="${BX+BW+125}" y="${BY+386}" font-size="11" fill="#555">Rafter: 100×50mm Teak @ 600 c/c</text>
<text x="${BX+BW+125}" y="${BY+403}" font-size="11" fill="#555">Purlin: 100×75mm @ 1200 c/c</text>
<text x="${BX+BW+125}" y="${BY+420}" font-size="11" fill="#555">Waterproof membrane under tile</text>
<text x="${BX+BW+125}" y="${BY+437}" font-size="11" fill="#555">Insulation: 100mm glasswool</text>

${northArrow(BX+BW+270, BY+BH-80)}
${scaleBar(BX+BW+110, BY+BH-60, '1:100')}
${titleBlock('ROOF PLAN', 'HBP-RF-003', '1:100')}
</svg>`;

  return svg;
}

// ══════════════════════════════════════════════════════════════════════════════
//  FOUNDATION PLAN SVG
// ══════════════════════════════════════════════════════════════════════════════
function makeFoundationPlanSVG() {
  const BX = 140, BY = 90, BW = 1050, BH = 750;

  // Column/grid positions
  const v1 = BX + 210;
  const v2 = BX + 420;
  const v3 = BX + 630;
  const v4 = BX + 840;
  const v5 = BX + BW;

  const r1 = BY;
  const r2 = BY + 250;
  const r3 = BY + 500;
  const r4 = BY + BH;

  const colXs = [BX, v1, v2, v3, v4, v5];
  const rowYs  = [r1, r2, r3, r4];

  // Grade beam positions: horizontal and vertical connecting pads
  const vLines = [BX, v1, v2, v3, v4, v5];
  const hLines = [r1, r2, r3, r4];

  // Isolated footings at each grid intersection
  const pads = [];
  for (const x of vLines) {
    for (const y of hLines) {
      pads.push([x, y]);
    }
  }

  // Soil hatch (diagonal lines over whole area)
  const soilLines = [];
  for (let offset = -BH; offset < BW + BH; offset += 30) {
    const x1 = BX + offset;
    const y1 = BY;
    const x2 = BX + offset - BH;
    const y2 = BY + BH;
    if ((x1 >= BX && x1 <= BX+BW) || (x2 >= BX && x2 <= BX+BW)) {
      soilLines.push(`<line x1="${Math.max(BX, x2)}" y1="${x2 < BX ? BY + (BX - x2) : BY}" x2="${Math.min(BX+BW, x1)}" y2="${x1 > BX+BW ? BY + (x1-(BX+BW)) : BY+BH}" stroke="#d8c8a8" stroke-width="0.7" opacity="0.5"/>`);
    }
  }

  const svg = `${svgHeader(BG_FND)}

<!-- Sheet heading -->
<text x="${W/2}" y="52" font-size="26" fill="${WALL_COL}" text-anchor="middle" font-weight="900" letter-spacing="2">FOUNDATION PLAN</text>
<text x="${W/2}" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT   |   Drawing No: HBP-FND-001   |   Scale 1:50   |   Sheet 1 of 1</text>

<!-- ── Soil hatch background ── -->
<clipPath id="bldgClip"><rect x="${BX}" y="${BY}" width="${BW}" height="${BH}"/></clipPath>
<g clip-path="url(#bldgClip)">
${soilLines.join('\n')}
</g>

<!-- ── Excavation outline (dashed) ── -->
<rect x="${BX-60}" y="${BY-60}" width="${BW+120}" height="${BH+120}" fill="none" stroke="#c0a060" stroke-width="2" stroke-dasharray="14,8"/>
<text x="${BX+BW/2}" y="${BY-64}" font-size="12" fill="#c0a060" text-anchor="middle" font-weight="bold">EXCAVATION BOUNDARY (600mm BEYOND)</text>

<!-- ── Grade beams (horizontal) ── -->
${hLines.map(y =>
  `<rect x="${BX}" y="${y-12}" width="${BW}" height="24" fill="#b09060" stroke="#6b4c2a" stroke-width="2" opacity="0.75"/>`
).join('\n')}

<!-- ── Grade beams (vertical) ── -->
${vLines.map(x =>
  `<rect x="${x-12}" y="${BY}" width="24" height="${BH}" fill="#b09060" stroke="#6b4c2a" stroke-width="2" opacity="0.75"/>`
).join('\n')}

<!-- ── Grade beam centre-lines ── -->
${hLines.map(y =>
  `<line x1="${BX}" y1="${y}" x2="${BX+BW}" y2="${y}" stroke="#4a2a08" stroke-width="1" stroke-dasharray="8,5" opacity="0.7"/>`
).join('\n')}
${vLines.map(x =>
  `<line x1="${x}" y1="${BY}" x2="${x}" y2="${BY+BH}" stroke="#4a2a08" stroke-width="1" stroke-dasharray="8,5" opacity="0.7"/>`
).join('\n')}

<!-- ── Isolated pad footings ── -->
${pads.map(([cx, cy], i) => {
  const lbl = String.fromCharCode(65 + Math.floor(i/4)) + (i%4 + 1);
  return `
  <!-- Footing pad ${lbl} -->
  <rect x="${cx-42}" y="${cy-42}" width="84" height="84" fill="#d4c5a0" stroke="#6b4c2a" stroke-width="2.5" filter="url(#sd)"/>
  <rect x="${cx-28}" y="${cy-28}" width="56" height="56" fill="#b0976a" stroke="#6b4c2a" stroke-width="2"/>
  <!-- Rebar cross hatch -->
  <line x1="${cx-28}" y1="${cy-28}" x2="${cx+28}" y2="${cy+28}" stroke="#6b4c2a" stroke-width="1.2" opacity="0.65"/>
  <line x1="${cx+28}" y1="${cy-28}" x2="${cx-28}" y2="${cy+28}" stroke="#6b4c2a" stroke-width="1.2" opacity="0.65"/>
  <circle cx="${cx}" cy="${cy}" r="6" fill="#6b4c2a"/>
  <text x="${cx}" y="${cy+58}" font-size="11" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">${lbl}</text>`;
}).join('\n')}

<!-- ── Rebar indication on grade beams ── -->
<!-- Horizontal beam rebar bars (short dashes) -->
${hLines.map(y =>
  Array.from({length: 8}, (_, i) =>
    `<line x1="${BX+80+i*130}" y1="${y-6}" x2="${BX+80+i*130}" y2="${y+6}" stroke="#3a1a00" stroke-width="2" opacity="0.8"/>`
  ).join('\n')
).join('\n')}
<!-- Vertical beam rebar bars -->
${vLines.map(x =>
  Array.from({length: 5}, (_, i) =>
    `<line x1="${x-6}" y1="${BY+100+i*150}" x2="${x+6}" y2="${BY+100+i*150}" stroke="#3a1a00" stroke-width="2" opacity="0.8"/>`
  ).join('\n')
).join('\n')}

<!-- ── Bearing pile indicators (circle at key pads) ── -->
${[[BX, BY], [BX+BW, BY], [BX, BY+BH], [BX+BW, BY+BH]].map(([cx, cy]) =>
  `<circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="#c05000" stroke-width="2.5" stroke-dasharray="6,4"/>
   <text x="${cx}" y="${cy+32}" font-size="10" fill="#c05000" text-anchor="middle" font-weight="bold">RP-450Ø</text>`
).join('\n')}

<!-- ── Dimension lines ── -->
<!-- Overall width -->
<line x1="${BX}" y1="${BY-50}" x2="${BX+BW}" y2="${BY-50}" stroke="${DIM_COL}" stroke-width="1.5" marker-start="url(#arrl)" marker-end="url(#arro)"/>
<line x1="${BX}" y1="${BY-42}" x2="${BX}" y2="${BY-60}" stroke="${DIM_COL}" stroke-width="1.2"/>
<line x1="${BX+BW}" y1="${BY-42}" x2="${BX+BW}" y2="${BY-60}" stroke="${DIM_COL}" stroke-width="1.2"/>
<text x="${BX+BW/2}" y="${BY-62}" font-size="13" fill="${DIM_COL}" text-anchor="middle" font-weight="bold">10 500 mm</text>

<!-- Bay widths -->
${[[BX,v1,'2100'],[v1,v2,'2100'],[v2,v3,'2100'],[v3,v4,'2100'],[v4,v5,'2100']].map(([x1,x2,lbl]) =>
  `<line x1="${x1}" y1="${BY-22}" x2="${x2}" y2="${BY-22}" stroke="${DIM_COL}" stroke-width="1.2" marker-start="url(#arrl)" marker-end="url(#arro)" opacity="0.7"/>
   <text x="${(x1+x2)/2}" y="${BY-26}" font-size="10" fill="${DIM_COL}" text-anchor="middle">${lbl}</text>`
).join('\n')}

<!-- Overall height -->
<line x1="${BX+BW+45}" y1="${BY}" x2="${BX+BW+45}" y2="${BY+BH}" stroke="${DIM_COL}" stroke-width="1.5" marker-start="url(#arrl)" marker-end="url(#arro)"/>
<line x1="${BX+BW+38}" y1="${BY}" x2="${BX+BW+54}" y2="${BY}" stroke="${DIM_COL}" stroke-width="1.2"/>
<line x1="${BX+BW+38}" y1="${BY+BH}" x2="${BX+BW+54}" y2="${BY+BH}" stroke="${DIM_COL}" stroke-width="1.2"/>
<text x="${BX+BW+70}" y="${BY+BH/2}" font-size="13" fill="${DIM_COL}" text-anchor="middle" font-weight="bold" transform="rotate(-90,${BX+BW+70},${BY+BH/2})">7 500 mm</text>

<!-- Bay heights -->
${[[r1,r2,'2500'],[r2,r3,'2500'],[r3,r4,'2500']].map(([y1,y2,lbl]) =>
  `<line x1="${BX+BW+18}" y1="${y1}" x2="${BX+BW+18}" y2="${y2}" stroke="${DIM_COL}" stroke-width="1.2" marker-start="url(#arrl)" marker-end="url(#arro)" opacity="0.7"/>
   <text x="${BX+BW+28}" y="${(y1+y2)/2}" font-size="10" fill="${DIM_COL}" text-anchor="middle" transform="rotate(-90,${BX+BW+28},${(y1+y2)/2})">${lbl}</text>`
).join('\n')}

<!-- ── Grade beam cross-section callout ── -->
<line x1="${BX+v1/3}" y1="${r2}" x2="${BX+v1/3-50}" y2="${r2+140}" stroke="${DIM_COL}" stroke-width="1.2"/>
<rect x="${BX+v1/3-130}" y="${r2+140}" width="80" height="50" fill="#d4c5a0" stroke="#6b4c2a" stroke-width="2"/>
<rect x="${BX+v1/3-116}" y="${r2+152}" width="52" height="26" fill="#b0976a" stroke="#6b4c2a" stroke-width="1.5"/>
<text x="${BX+v1/3-90}" y="${r2+210}" font-size="10" fill="${WALL_COL}" text-anchor="middle">BEAM 600×450 M25</text>

<!-- ── Grid bubbles ── -->
${gridBubbles(colXs, rowYs, 62, 88, BY+BH+20)}

<!-- ── Legend panel ── -->
<rect x="${BX+BW+110}" y="${BY}" width="310" height="520" rx="10" fill="white" stroke="#d0d8e0" stroke-width="1.8" filter="url(#sd)"/>
<rect x="${BX+BW+110}" y="${BY}" width="310" height="40" rx="10" fill="${WALL_COL}"/>
<text x="${BX+BW+265}" y="${BY+26}" font-size="14" fill="white" text-anchor="middle" font-weight="bold">FOUNDATION SCHEDULE</text>

<rect x="${BX+BW+125}" y="${BY+50}" width="22" height="22" fill="#b0976a" stroke="#6b4c2a" stroke-width="2"/>
<text x="${BX+BW+158}" y="${BY+63}" font-size="12" fill="${WALL_COL}" font-weight="bold">Isolated Pad Footing</text>
<text x="${BX+BW+158}" y="${BY+78}" font-size="11" fill="#5a6a80">900×900×450mm M25 RCC</text>

<rect x="${BX+BW+125}" y="${BY+98}" width="22" height="12" fill="#b09060" stroke="#6b4c2a" stroke-width="2"/>
<text x="${BX+BW+158}" y="${BY+111}" font-size="12" fill="${WALL_COL}" font-weight="bold">Grade Beam</text>
<text x="${BX+BW+158}" y="${BY+126}" font-size="11" fill="#5a6a80">600×450mm M25 Fe500 TMT</text>

<rect x="${BX+BW+125}" y="${BY+146}" width="22" height="14" fill="none" stroke="#c0a060" stroke-width="2" stroke-dasharray="6,4"/>
<text x="${BX+BW+158}" y="${BY+159}" font-size="12" fill="${WALL_COL}" font-weight="bold">Excavation Boundary</text>
<text x="${BX+BW+158}" y="${BY+174}" font-size="11" fill="#5a6a80">600mm beyond beam edge</text>

<circle cx="${BX+BW+136}" cy="${BY+196}" r="12" fill="none" stroke="#c05000" stroke-width="2.5" stroke-dasharray="5,3"/>
<text x="${BX+BW+158}" y="${BY+200}" font-size="12" fill="${WALL_COL}" font-weight="bold">RCC Pile 450Ø</text>
<text x="${BX+BW+158}" y="${BY+215}" font-size="11" fill="#5a6a80">Corner pads only, 6m depth</text>

<line x1="${BX+BW+125}" y1="${BY+235}" x2="${BX+BW+405}" y2="${BY+235}" stroke="#e0e0e0" stroke-width="1"/>
<text x="${BX+BW+125}" y="${BY+255}" font-size="12" fill="${WALL_COL}" font-weight="bold">SPECIFICATIONS</text>
<text x="${BX+BW+125}" y="${BY+275}" font-size="11" fill="#555">Concrete: M25 (fck=25 N/mm²)</text>
<text x="${BX+BW+125}" y="${BY+292}" font-size="11" fill="#555">Reinforcement: Fe500 TMT bars</text>
<text x="${BX+BW+125}" y="${BY+309}" font-size="11" fill="#555">Cover: 50mm clear (all faces)</text>
<text x="${BX+BW+125}" y="${BY+326}" font-size="11" fill="#555">PCC below footing: M10 75mm</text>
<text x="${BX+BW+125}" y="${BY+343}" font-size="11" fill="#555">Backfill: compacted murrum</text>
<text x="${BX+BW+125}" y="${BY+360}" font-size="11" fill="#555">DPC: 75mm 1:1.5:3 + IB coat</text>
<text x="${BX+BW+125}" y="${BY+377}" font-size="11" fill="#555">SBC: 150 kN/m² (assumed)</text>
<text x="${BX+BW+125}" y="${BY+394}" font-size="11" fill="#555">Foundation depth: 1500mm BGL</text>

${northArrow(BX+BW+270, BY+BH-80)}
${scaleBar(BX+BW+110, BY+BH-60, '1:50')}
${titleBlock('FOUNDATION PLAN', 'HBP-FND-001', '1:50')}
</svg>`;

  return svg;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPatch(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname, path, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
    };
    const req = httpsRequest(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function httpsDelete(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, method: 'DELETE' };
    const req = httpsRequest(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function uploadAndReplace(svgContent, name, projectId, milestoneId, existingId) {
  const HOST = 'construction-backend-50044693287.development.catalystappsail.in';

  // Build multipart/form-data body manually (no external deps needed)
  function buildMultipart(fields, fileField, fileContent, filename, mimetype) {
    const boundary = '----FormBoundary' + Date.now().toString(16);
    const parts = [];
    for (const [k, v] of Object.entries(fields)) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
      );
    }
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;
    const headerBuf = Buffer.from(parts.join('') + fileHeader, 'utf8');
    const fileBuf   = Buffer.from(fileContent, 'utf8');
    const footerBuf = Buffer.from(fileFooter, 'utf8');
    const body = Buffer.concat([headerBuf, fileBuf, footerBuf]);
    return { body, contentType: `multipart/form-data; boundary=${boundary}` };
  }

  const { body: multipartBody, contentType } = buildMultipart(
    { name, projectId, milestoneId },
    'file', svgContent, 'drawing.svg', 'image/svg+xml'
  );

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: HOST,
        path: '/api/drawings/upload',
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Content-Length': multipartBody.length,
        },
      };
      const req = httpsRequest(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(multipartBody);
      req.end();
    });

    if (uploadResult.status !== 200 && uploadResult.status !== 201) {
      throw new Error(`Upload failed (${uploadResult.status}): ${uploadResult.body.slice(0,200)}`);
    }

    const newDrawing = JSON.parse(uploadResult.body);
    const newId = newDrawing.id;
    const stratusUrl = newDrawing.fileUrl;
    console.log(`  ✅ Uploaded → new id: ${newId}`);
    console.log(`     Stratus URL: ${stratusUrl.slice(0,70)}...`);

    // 3. Get a fresh signed URL from the backend for the new drawing
    const freshRes = await httpsGet(`https://${HOST}/api/drawings/${newId}`);
    const freshUrl = JSON.parse(freshRes.body).fileUrl;

    // 4. PATCH the existing drawing to point at the new Stratus object
    const patchRes = await httpsPatch(HOST, `/api/drawings/${existingId}`, { fileUrl: freshUrl });
    console.log(`  ✅ PATCHed original drawing → status ${patchRes.status}`);

    // 5. Delete the duplicate
    const delRes = await httpsDelete(HOST, `/api/drawings/${newId}`);
    console.log(`  ✅ Deleted duplicate → status ${delRes.status}`);

  } catch(err) {
    throw err;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const outDir = path.join(__dirname, 'assets/improved-drawings');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('\n🏗  Generating Roof Plan...');
  const roofSVG = makeRoofPlanSVG();
  fs.writeFileSync(path.join(outDir, 'roof-plan-cad.svg'), roofSVG, 'utf8');
  console.log(`  📐 Size: ${Math.round(roofSVG.length/1024)} KB`);
  await uploadAndReplace(roofSVG, 'Roof Plan', PROJECT_ID, ROOF_MILESTONE_ID, ROOF_DRAWING_ID);

  console.log('\n🏗  Generating Foundation Plan...');
  const fndSVG = makeFoundationPlanSVG();
  fs.writeFileSync(path.join(outDir, 'foundation-plan-cad.svg'), fndSVG, 'utf8');
  console.log(`  📐 Size: ${Math.round(fndSVG.length/1024)} KB`);
  await uploadAndReplace(fndSVG, 'Foundation Plan', PROJECT_ID, FOUNDATION_MILESTONE_ID, FOUNDATION_DRAWING_ID);

  console.log('\n✅ All done! Open https://buildtrack-withdrawing.onslate.in/ to verify.');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
