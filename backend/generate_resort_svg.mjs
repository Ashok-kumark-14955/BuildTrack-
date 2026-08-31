/**
 * generate_resort_svg.mjs
 * Run with: node backend/generate_resort_svg.mjs
 * Generates a monochrome-cyan CAD-style top-view resort site plan: real,
 * varied dimensions with proper chain-dimensioning (extension lines, tick
 * marks, measured text) and a formal title block. Single hue throughout
 * (cyan) — differentiation between pool/garden/road/building/villa comes
 * from hatch pattern and line weight, not colour.
 * Writes to backend/assets/resort-drawings/resort-site-plan-top-view.svg
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'assets', 'resort-drawings', 'resort-site-plan-top-view.svg');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (m) => (Math.round(m * 10) / 10).toFixed(1);

const SCALE = 15; // px per metre
const CYAN = '#00e5ff';

// Each row = one task-grid row (A-G still assigned left-to-right per zone
// for the app's grid-task system). w/h are real footprint metres.
const ROWS = [
  { label: '1', zones: [
    { name: 'Reception & Lobby', w: 14, h: 10, type: 'building' },
    { name: 'Front Office', w: 8, h: 10, type: 'building' },
    { name: 'Restaurant & Dining', w: 16, h: 12, type: 'building' },
    { name: 'Restaurant Kitchen', w: 10, h: 12, type: 'building' },
    { name: 'Spa & Wellness', w: 12, h: 10, type: 'building' },
    { name: 'Gymnasium', w: 9, h: 10, type: 'building' },
    { name: 'Admin & Staff Room', w: 9, h: 10, type: 'building' },
  ]},
  { label: '2', zones: [
    { name: 'Swimming Pool', w: 25, h: 12, type: 'pool' },
    { name: 'Pool Deck & Loungers', w: 10, h: 12, type: 'pool' },
    { name: 'Pool Bar & Cabana', w: 8, h: 10, type: 'building' },
    { name: 'Villa 1 (Deluxe)', w: 9, h: 9, type: 'villa' },
    { name: 'Villa 2 (Deluxe)', w: 9, h: 9, type: 'villa' },
    { name: 'Villa 3 (Deluxe)', w: 9, h: 9, type: 'villa' },
    { name: 'Villa 4 (Deluxe)', w: 9, h: 9, type: 'villa' },
  ]},
  { label: '3', zones: [
    { name: 'Garden Courtyard', w: 16, h: 14, type: 'garden' },
    { name: 'Fountain Plaza', w: 10, h: 10, type: 'garden' },
    { name: 'Villa 5 (Premium)', w: 11, h: 11, type: 'villa' },
    { name: 'Villa 6 (Premium)', w: 11, h: 11, type: 'villa' },
    { name: 'Villa 7 (Premium)', w: 11, h: 11, type: 'villa' },
    { name: 'Kids Play Area', w: 12, h: 10, type: 'garden' },
    { name: 'Recreation Court', w: 18, h: 9, type: 'garden' },
  ]},
  { label: '4', zones: [
    { name: 'Main Entrance Gate', w: 10, h: 6, type: 'road' },
    { name: 'Guard House', w: 6, h: 6, type: 'building' },
    { name: 'Driveway', w: 20, h: 8, type: 'road' },
    { name: 'Guest Parking', w: 18, h: 10, type: 'road' },
    { name: 'Staff Parking', w: 12, h: 10, type: 'road' },
    { name: 'Boundary & Compound Wall', w: 14, h: 6, type: 'garden' },
    { name: 'Utility Yard & DG Room', w: 7, h: 7, type: 'building' },
  ]},
];

// Every type shares the same stroke colour/fill — only the hatch pattern
// (or plain outline for building/villa) tells them apart, plus villas get
// a slightly heavier outline than plain buildings.
const FILL = '#020608';
const strokeFor = (type) => (type === 'villa' ? 2.4 : 2);

const PLOT_X0 = 170;
const ROW_GAP = 30;
const DIM_BAND = 58;
const rowWidthPx = (row) => row.zones.reduce((s, z) => s + z.w * SCALE, 0);
const rowHeightPx = (row) => Math.max(...row.zones.map((z) => z.h * SCALE));
const maxRowWidthPx = Math.max(...ROWS.map(rowWidthPx));

const W = PLOT_X0 + maxRowWidthPx + 190;
let cursorY = 150;
const rowLayout = ROWS.map((row) => {
  const y0 = cursorY + DIM_BAND;
  const h = rowHeightPx(row);
  cursorY = y0 + h + ROW_GAP;
  return { ...row, y0, h };
});
const TITLE_BLOCK_H = 150;
const H = cursorY + TITLE_BLOCK_H + 40;

let svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
svg.push(`<defs>
  <pattern id="wave" width="30" height="12" patternUnits="userSpaceOnUse">
    <path d="M0,6 Q7.5,0 15,6 T30,6" fill="none" stroke="${CYAN}" stroke-width="1" opacity="0.45"/>
  </pattern>
  <pattern id="leaf" width="26" height="26" patternUnits="userSpaceOnUse">
    <circle cx="6" cy="6" r="1.6" fill="${CYAN}" opacity="0.4"/>
    <circle cx="18" cy="16" r="1.6" fill="${CYAN}" opacity="0.4"/>
  </pattern>
  <pattern id="lane" width="1" height="20" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="10" stroke="${CYAN}" stroke-width="1.3" opacity="0.35"/>
  </pattern>
  <marker id="tick0" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
    <line x1="5" y1="1" x2="5" y2="9" stroke="${CYAN}" stroke-width="1.2" transform="rotate(45 5 5)"/>
  </marker>
</defs>`);
svg.push(`<rect width="${W}" height="${H}" fill="#000000"/>`);
svg.push(`<rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="${CYAN}" stroke-width="1.2" stroke-dasharray="12,6" opacity="0.18"/>`);

// Compound boundary
const boundY0 = rowLayout[0].y0 - 40;
const boundH = rowLayout[rowLayout.length - 1].y0 + rowLayout[rowLayout.length - 1].h - rowLayout[0].y0 + 80;
svg.push(`<rect x="${PLOT_X0 - 40}" y="${boundY0}" width="${maxRowWidthPx + 80}" height="${boundH}" fill="none" stroke="${CYAN}" stroke-width="2" stroke-dasharray="20,9" opacity="0.55"/>`);

function dimLine(x0, x1, y, text) {
  return `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${CYAN}" stroke-width="1" opacity="0.85" marker-start="url(#tick0)" marker-end="url(#tick0)"/>` +
    `<text x="${(x0 + x1) / 2}" y="${y - 5}" font-size="11" fill="${CYAN}" text-anchor="middle" font-family="Arial">${esc(text)}</text>`;
}

for (let ri = 0; ri < rowLayout.length; ri++) {
  const row = rowLayout[ri];
  const gridLetterY = row.y0 - DIM_BAND - 14;
  let x = PLOT_X0;
  const ticksX = [x];

  for (let zi = 0; zi < row.zones.length; zi++) {
    const z = row.zones[zi];
    const wp = z.w * SCALE, hp = z.h * SCALE;
    const y = row.y0 + (row.h - hp); // bottom-align within the row band

    svg.push(`<rect x="${x}" y="${y}" width="${wp}" height="${hp}" fill="${FILL}" stroke="${CYAN}" stroke-width="${strokeFor(z.type)}"/>`);
    if (z.type === 'pool') svg.push(`<rect x="${x + 4}" y="${y + 4}" width="${wp - 8}" height="${hp - 8}" fill="url(#wave)"/>`);
    if (z.type === 'garden') svg.push(`<rect x="${x + 4}" y="${y + 4}" width="${wp - 8}" height="${hp - 8}" fill="url(#leaf)"/>`);
    if (z.type === 'road') svg.push(`<rect x="${x + 4}" y="${y + 4}" width="${wp - 8}" height="${hp - 8}" fill="url(#lane)"/>`);

    const letter = String.fromCharCode(65 + zi);
    svg.push(`<circle cx="${x + wp / 2}" cy="${gridLetterY}" r="13" fill="#020608" stroke="${CYAN}" stroke-width="1.2"/>`);
    svg.push(`<text x="${x + wp / 2}" y="${gridLetterY + 4}" font-size="11" fill="${CYAN}" text-anchor="middle" font-weight="bold" font-family="Arial">${letter}${row.label}</text>`);

    svg.push(`<text x="${x + wp / 2}" y="${y + hp / 2 + 4}" font-size="12" fill="${CYAN}" text-anchor="middle" font-weight="bold" font-family="Arial">${esc(z.name)}</text>`);

    // extension lines from footprint top edge up to the inner dim line
    svg.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${row.y0 - 24}" stroke="${CYAN}" stroke-width="0.6" opacity="0.4"/>`);

    x += wp;
    ticksX.push(x);
  }
  svg.push(`<line x1="${x}" y1="${row.y0 + (row.h - row.zones[row.zones.length - 1].h * SCALE)}" x2="${x}" y2="${row.y0 - 24}" stroke="${CYAN}" stroke-width="0.6" opacity="0.4"/>`);

  for (let zi = 0; zi < row.zones.length; zi++) {
    svg.push(dimLine(ticksX[zi], ticksX[zi + 1], row.y0 - 20, `${fmt(row.zones[zi].w)} m`));
  }
  svg.push(dimLine(ticksX[0], ticksX[ticksX.length - 1], row.y0 - 40, `${fmt((ticksX[ticksX.length - 1] - ticksX[0]) / SCALE)} m overall`));

  const depthTop = row.y0;
  const depthBot = row.y0 + row.h;
  svg.push(`<line x1="${PLOT_X0 - 30}" y1="${depthTop}" x2="${PLOT_X0 - 30}" y2="${depthBot}" stroke="${CYAN}" stroke-width="1" opacity="0.85" marker-start="url(#tick0)" marker-end="url(#tick0)"/>`);
  svg.push(`<text x="${PLOT_X0 - 38}" y="${(depthTop + depthBot) / 2}" font-size="11" fill="${CYAN}" text-anchor="middle" font-family="Arial" transform="rotate(-90 ${PLOT_X0 - 38} ${(depthTop + depthBot) / 2})">${fmt(row.h)} m depth</text>`);
  svg.push(`<circle cx="${PLOT_X0 - 70}" cy="${depthTop + row.h / 2}" r="13" fill="#020608" stroke="${CYAN}" stroke-width="1.2"/>`);
  svg.push(`<text x="${PLOT_X0 - 70}" y="${depthTop + row.h / 2 + 4}" font-size="11" fill="${CYAN}" text-anchor="middle" font-weight="bold" font-family="Arial">${row.label}</text>`);
}

// North arrow
svg.push(`<g transform="translate(${W - 70},70)">
  <line x1="0" y1="40" x2="0" y2="0" stroke="${CYAN}" stroke-width="2.5" opacity="0.9"/>
  <path d="M-6,10 L0,0 L6,10 z" fill="${CYAN}" opacity="0.9"/>
  <text x="0" y="58" font-size="14" fill="${CYAN}" text-anchor="middle" font-family="Arial" font-weight="bold">N</text>
</g>`);

// ── Title block ──────────────────────────────────────────────────────────
const TB_W = 460, TB_H = TITLE_BLOCK_H - 30;
const tbX = W - TB_W - 40, tbY = H - TB_H - 30;
const FIELDS = [
  ['PROJECT', 'COASTAL BREEZE RESORT'],
  ['DRAWING', 'SITE PLAN — TOP VIEW'],
  ['SCALE', 'AS SHOWN (see dimensions)'],
  ['DWG NO. / REV', 'CBR-A101 / A'],
  ['DRAWN BY', 'BuildTrack'],
];
const rowH = (TB_H - 16) / FIELDS.length;
svg.push(`<rect x="${tbX}" y="${tbY}" width="${TB_W}" height="${TB_H}" fill="#020608" stroke="${CYAN}" stroke-width="1.5"/>`);
FIELDS.forEach(([label, value], i) => {
  const ly = tbY + 16 + i * rowH;
  if (i > 0) svg.push(`<line x1="${tbX}" y1="${ly - rowH / 2 + 2}" x2="${tbX + TB_W}" y2="${ly - rowH / 2 + 2}" stroke="${CYAN}" stroke-width="0.6" opacity="0.3"/>`);
  svg.push(`<text x="${tbX + 16}" y="${ly}" font-size="10.5" fill="${CYAN}" opacity="0.65" font-family="Arial" letter-spacing="0.5">${esc(label)}</text>`);
  svg.push(`<text x="${tbX + TB_W - 16}" y="${ly}" font-size="13" fill="${CYAN}" text-anchor="end" font-weight="bold" font-family="Arial">${esc(value)}</text>`);
});
svg.push(`<line x1="${tbX + 150}" y1="${tbY}" x2="${tbX + 150}" y2="${tbY + TB_H}" stroke="${CYAN}" stroke-width="0.6" opacity="0.3"/>`);

svg.push(`<text x="${PLOT_X0}" y="${H - 40}" font-size="11" fill="${CYAN}" opacity="0.55" font-family="Arial">All dimensions in metres. Site plan is indicative and not for construction issue.</text>`);

svg.push(`</svg>`);

writeFileSync(OUT, svg.join('\n'), 'utf8');
console.log('Wrote', OUT, `(${W}x${H})`);
