/**
 * replace_drawings.mjs
 * Replaces the House Building Project drawings with proper architectural-style SVGs
 * matching the existing seed drawing format, and sets precise columnPositions.
 *
 * Run: node replace_drawings.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// Drawing IDs from previous seed
const DRAWINGS = {
  foundation:   'e59af3f9-846c-4b0b-9aaf-438fb01a77e5',  // 3 cols × 2 rows
  groundFloor:  '13cafecc-9ebb-4822-8f32-25357a29df89',  // 4 cols × 2 rows
  roof:         'fa786584-1129-4b72-9abc-309716a40124',  // 3 cols × 3 rows
  electrical:   '32367211-4d21-42e6-8912-af455f0b46f4',  // 6 cols × 3 rows
  plumbing:     '59ee9c04-cb62-414b-84d2-08092b5a6788',  // 4 cols × 3 rows
  finishing:    '87c4e225-6a5d-4f64-b1ec-fc5e74f59918',  // 4 cols × 3 rows
};

// ── SVG Builder Helpers ────────────────────────────────────────────────────────

/**
 * Generates grid column positions as fractions of SVG width.
 * gridX: pixel X positions of column lines in the drawing area.
 * svgW: total SVG width.
 * gridY: pixel Y positions of row lines.
 * svgH: total SVG height.
 * Returns columnPositions object { A1: {x, y}, B1: {x, y}, ... }
 */
function buildColumnPositions(colXs, rowYs, svgW, svgH) {
  const pos = {};
  for (let r = 0; r < rowYs.length; r++) {
    for (let c = 0; c < colXs.length; c++) {
      const letter = String.fromCharCode(65 + c);
      const code = `${letter}${r + 1}`;
      pos[code] = {
        x: parseFloat((colXs[c] / svgW).toFixed(6)),
        y: parseFloat((rowYs[r] / svgH).toFixed(6)),
      };
    }
  }
  return pos;
}

/** Standard title block (right panel) */
function titleBlock(svgW, svgH, drawNo, title, project, scale, rev, date, legendItems, notes) {
  const tbX = svgW - 380;
  const tbW = 380;
  const lines = [];

  lines.push(`<rect x="${tbX}" y="20" width="${tbW}" height="${svgH - 40}" fill="none" stroke="#5c3d11" stroke-width="2"/>`);
  lines.push(`<line x1="${tbX}" y1="90" x2="${svgW - 20}" y2="90" stroke="#5c3d11" stroke-width="1"/>`);
  lines.push(`<line x1="${tbX}" y1="150" x2="${svgW - 20}" y2="150" stroke="#5c3d11" stroke-width="1"/>`);
  lines.push(`<line x1="${tbX}" y1="250" x2="${svgW - 20}" y2="250" stroke="#5c3d11" stroke-width="1"/>`);

  const cx = tbX + tbW / 2;
  lines.push(`<text x="${cx}" y="55" font-size="15" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">PROJECT</text>`);
  lines.push(`<text x="${cx}" y="75" font-size="12" fill="#333" font-family="sans-serif" text-anchor="middle">${project}</text>`);
  lines.push(`<text x="${cx}" y="115" font-size="14" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">DRAWING TITLE</text>`);
  lines.push(`<text x="${cx}" y="135" font-size="12" fill="#333" font-family="sans-serif" text-anchor="middle">${title}</text>`);

  const tx = tbX + 10;
  lines.push(`<text x="${tx}" y="175" font-size="11" fill="#333" font-family="sans-serif">Drawing No: ${drawNo}</text>`);
  lines.push(`<text x="${tx}" y="193" font-size="11" fill="#333" font-family="sans-serif">Scale: ${scale}</text>`);
  lines.push(`<text x="${tx}" y="211" font-size="11" fill="#333" font-family="sans-serif">Rev: ${rev}</text>`);
  lines.push(`<text x="${tx}" y="229" font-size="11" fill="#333" font-family="sans-serif">Date: ${date}</text>`);

  lines.push(`<text x="${tx}" y="270" font-size="11" fill="#333" font-family="sans-serif">LEGEND:</text>`);
  let ly = 290;
  for (const item of legendItems) {
    lines.push(item.symbol(tbX + 15, ly));
    lines.push(`<text x="${tbX + 45}" y="${ly + 6}" font-size="10" fill="#333" font-family="sans-serif">${item.label}</text>`);
    ly += 28;
  }

  lines.push(`<text x="${tx}" y="${ly + 10}" font-size="11" fill="#333" font-family="sans-serif">NOTES:</text>`);
  ly += 28;
  for (const note of notes) {
    lines.push(`<text x="${tx}" y="${ly}" font-size="10" fill="#333" font-family="sans-serif">${note}</text>`);
    ly += 18;
  }

  return lines.join('\n');
}

/** Circled grid column letters at top */
function colLabels(colXs, y, col = '#5c3d11') {
  return colXs.map((x, i) => {
    const letter = String.fromCharCode(65 + i);
    return `<circle cx="${x}" cy="${y}" r="18" fill="#fff" stroke="${col}" stroke-width="2"/>
<text x="${x}" y="${y + 6}" font-size="16" fill="${col}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${letter}</text>`;
  }).join('\n');
}

/** Circled grid row numbers on left */
function rowLabels(rowYs, x, col = '#5c3d11') {
  return rowYs.map((y, i) => {
    return `<circle cx="${x}" cy="${y}" r="18" fill="#fff" stroke="${col}" stroke-width="2"/>
<text x="${x}" y="${y + 6}" font-size="16" fill="${col}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${i + 1}</text>`;
  }).join('\n');
}

/** Dashed centre-lines through each grid point */
function gridLines(colXs, rowYs, x0, x1, y0, y1, col = '#8B6914') {
  const v = colXs.map(x =>
    `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${col}" stroke-width="1.5" stroke-dasharray="8 5"/>`
  ).join('\n');
  const h = rowYs.map(y =>
    `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${col}" stroke-width="1.5" stroke-dasharray="8 5"/>`
  ).join('\n');
  return v + '\n' + h;
}

/** Thick structural lines (beams/walls) */
function structLines(colXs, rowYs, x0, x1, y0, y1, col = '#8B6914') {
  const v = colXs.map(x =>
    `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`
  ).join('\n');
  const h = rowYs.map(y =>
    `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`
  ).join('\n');
  return v + '\n' + h;
}

/** Dimension lines below drawing */
function dimLines(colXs, y, dims, col = '#333') {
  const lines = [];
  for (let i = 0; i < colXs.length - 1; i++) {
    const x1 = colXs[i], x2 = colXs[i + 1];
    lines.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="1"/>`);
    lines.push(`<text x="${(x1 + x2) / 2}" y="${y - 4}" font-size="12" fill="${col}" font-family="sans-serif" text-anchor="middle">${dims[i]}</text>`);
  }
  return lines.join('\n');
}

/** North arrow */
function northArrow(x, y) {
  return `<polygon points="${x},${y} ${x + 10},${y + 30} ${x + 20},${y}" fill="#333"/>
<text x="${x + 10}" y="${y + 50}" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>`;
}

// ── Drawing 1: Foundation Plan (3 cols A-C × 2 rows 1-2) ──────────────────────
function makeFoundationSVG() {
  const W = 1700, H = 950;
  const tbX = W - 380;
  // Grid geometry: 3 cols, 2 rows within the drawing area
  const colXs = [200, 580, 960];   // px centre of each column
  const rowYs = [200, 560];        // px centre of each row
  const drawX0 = 150, drawX1 = tbX - 30;
  const drawY0 = 130, drawY1 = 800;

  // Footing pad at each grid intersection
  const footings = [];
  for (const cy of rowYs) {
    for (const cx of colXs) {
      footings.push(
        `<rect x="${cx - 30}" y="${cy - 30}" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>`,
        `<rect x="${cx - 18}" y="${cy - 18}" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>`,
      );
    }
  }

  // Grade beams connecting footings
  const beams = [];
  for (let r = 0; r < rowYs.length; r++) {
    const y = rowYs[r];
    for (let c = 0; c < colXs.length - 1; c++) {
      beams.push(`<line x1="${colXs[c] + 30}" y1="${y}" x2="${colXs[c + 1] - 30}" y2="${y}" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>`);
    }
  }
  for (let c = 0; c < colXs.length; c++) {
    const x = colXs[c];
    beams.push(`<line x1="${x}" y1="${rowYs[0] + 30}" x2="${x}" y2="${rowYs[rowYs.length - 1] - 30}" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>`);
  }

  // Pile circles
  const piles = [];
  for (const cy of rowYs) {
    for (const cx of colXs) {
      for (const [ox, oy] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) {
        piles.push(`<circle cx="${cx + ox}" cy="${cy + oy}" r="5" fill="none" stroke="#5c3d11" stroke-width="1.5"/>`);
      }
    }
  }

  const tb = titleBlock(W, H,
    'HBP-FND-001', 'FOUNDATION PLAN', 'HOUSE BUILDING PROJECT',
    '1:100', '01', '2026-01-15',
    [
      { label: 'Isolated Footing Pad', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="20" height="20" fill="#d4b483" stroke="#5c3d11" stroke-width="1.5"/>` },
      { label: 'Bored Pile (300Ø)', symbol: (x, y) => `<circle cx="${x + 10}" cy="${y}" r="6" fill="none" stroke="#5c3d11" stroke-width="1.5"/>` },
      { label: 'Grade Beam GB-230×450', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#8B6914" stroke-width="6"/>` },
    ],
    ['1. All dims in mm.', '2. Concrete: M25 grade.', '3. Footing depth: 1500mm BGL.', '4. Min. cover: 50mm.', '5. Anti-termite treatment req\'d.']
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9f4ea"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#5c3d11" stroke-width="3"/>
  ${tb}
  <text x="${tbX / 2}" y="65" font-size="24" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">FOUNDATION PLAN  –  EL. (−) 1.500</text>
  ${gridLines(colXs, rowYs, drawX0, drawX1, drawY0, drawY1)}
  ${beams.join('\n')}
  ${footings.join('\n')}
  ${piles.join('\n')}
  ${colLabels(colXs, drawY0 - 30)}
  ${rowLabels(rowYs, drawX0 - 40)}
  ${dimLines(colXs, drawY1 + 35, ['7200', '7200'])}
  <line x1="${colXs[0]}" y1="${drawY1 + 25}" x2="${colXs[0]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[1]}" y1="${drawY1 + 25}" x2="${colXs[1]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[2]}" y1="${drawY1 + 25}" x2="${colXs[2]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  ${northArrow(70, drawY1 - 40)}
</svg>`;

  const colPos = buildColumnPositions(colXs, rowYs, W, H);
  return { svg, colPos };
}

// ── Drawing 2: Ground Floor Plan (4 cols A-D × 2 rows 1-2) ───────────────────
function makeGroundFloorSVG() {
  const W = 1700, H = 950;
  const tbX = W - 380;
  const colXs = [200, 480, 760, 1040];
  const rowYs = [210, 570];
  const drawX0 = 150, drawX1 = tbX - 30;
  const drawY0 = 130, drawY1 = 800;

  // Room fills
  const rooms = [
    { x: colXs[0] - 30, y: rowYs[0] - 30, w: colXs[1] - colXs[0] + 60, h: rowYs[1] - rowYs[0] - 30, fill: '#fff8f0', label: 'Living / Dining', lx: 250, ly: 360 },
    { x: colXs[1] + 30, y: rowYs[0] - 30, w: colXs[2] - colXs[1] - 30, h: 170, fill: '#f0f8ff', label: 'Master Bedroom', lx: 570, ly: 310 },
    { x: colXs[2] + 30, y: rowYs[0] - 30, w: colXs[3] - colXs[2] - 30, h: 170, fill: '#f0fff0', label: 'Bedroom 2', lx: 860, ly: 310 },
    { x: colXs[1] + 30, y: rowYs[0] + 150, w: 100, h: 130, fill: '#fff0f0', label: 'Toilet', lx: 595, ly: 480 },
    { x: colXs[1] + 140, y: rowYs[0] + 150, w: 140, h: 130, fill: '#f5f0ff', label: 'Bathroom', lx: 720, ly: 480 },
    { x: colXs[2] + 30, y: rowYs[0] + 150, w: colXs[3] - colXs[2] - 30, h: 130, fill: '#f0ffff', label: 'Bedroom 3', lx: 862, ly: 480 },
    { x: colXs[0] - 30, y: rowYs[1] - 30, w: 160, h: rowYs[1] + 60, fill: '#fffdf0', label: 'Kitchen', lx: 215, ly: 610 },
    { x: colXs[0] + 140, y: rowYs[1] - 30, w: colXs[2] - colXs[0] - 110, h: 200, fill: '#fff0f8', label: 'Garage', lx: 500, ly: 680 },
  ];

  const roomsSvg = rooms.map(r =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}" stroke="#888" stroke-width="2"/>
<text x="${r.lx}" y="${r.ly}" font-size="13" fill="#444" font-family="sans-serif" text-anchor="middle">${r.label}</text>`
  ).join('\n');

  // Walls
  const walls = [];
  for (const y of rowYs) {
    walls.push(`<line x1="${drawX0}" y1="${y}" x2="${drawX1}" y2="${y}" stroke="#333" stroke-width="10" stroke-linecap="round"/>`);
  }
  for (const x of colXs) {
    walls.push(`<line x1="${x}" y1="${drawY0 + 20}" x2="${x}" y2="${drawY1 - 20}" stroke="#333" stroke-width="10" stroke-linecap="round"/>`);
  }
  // Perimeter
  walls.push(`<rect x="${colXs[0] - 30}" y="${rowYs[0] - 30}" width="${colXs[3] - colXs[0] + 60}" height="${rowYs[1] - rowYs[0] + 220}" fill="none" stroke="#333" stroke-width="6"/>`);

  // Column squares at intersections
  const cols = [];
  for (const y of rowYs) {
    for (const x of colXs) {
      cols.push(`<rect x="${x - 15}" y="${y - 15}" width="30" height="30" fill="#c8a45a" stroke="#5c3d11" stroke-width="2"/>`);
      cols.push(`<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="#d4b483" stroke="#5c3d11" stroke-width="1.5"/>`);
    }
  }

  // Door openings (simple arcs)
  const doors = [
    // Main door
    `<line x1="${colXs[0] - 30}" y1="420" x2="${colXs[0] + 20}" y2="420" stroke="#fff8f0" stroke-width="12"/>`,
    `<path d="M ${colXs[0] - 30} 420 Q ${colXs[0] + 20} 420 ${colXs[0] - 30} 370" fill="none" stroke="#555" stroke-width="1.5"/>`,
  ];

  const tb = titleBlock(W, H,
    'HBP-GF-002', 'GROUND FLOOR PLAN', 'HOUSE BUILDING PROJECT',
    '1:100', '01', '2026-01-20',
    [
      { label: 'Load Bearing Wall 230mm', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#333" stroke-width="8"/>` },
      { label: 'RCC Column 230×230', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="20" height="20" fill="#d4b483" stroke="#5c3d11" stroke-width="1.5"/>` },
      { label: 'Room / Space', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="20" height="20" fill="#fff8f0" stroke="#888" stroke-width="1.5"/>` },
    ],
    ['1. All dims in mm.', '2. Wall: 230mm thick brick.', '3. RCC columns M25 grade.', '4. Floor: Vitrified tiles.', '5. Doors: see door schedule.']
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9f4ea"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#5c3d11" stroke-width="3"/>
  ${tb}
  <text x="${tbX / 2}" y="65" font-size="24" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">GROUND FLOOR PLAN  –  EL. ±0.000</text>
  ${gridLines(colXs, rowYs, drawX0, drawX1, drawY0, drawY1)}
  ${roomsSvg}
  ${walls.join('\n')}
  ${cols.join('\n')}
  ${doors.join('\n')}
  ${colLabels(colXs, drawY0 - 30)}
  ${rowLabels(rowYs, drawX0 - 40)}
  ${dimLines(colXs, drawY1 + 35, ['7200', '7200', '7200'])}
  <line x1="${colXs[0]}" y1="${drawY1 + 25}" x2="${colXs[0]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[1]}" y1="${drawY1 + 25}" x2="${colXs[1]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[2]}" y1="${drawY1 + 25}" x2="${colXs[2]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[3]}" y1="${drawY1 + 25}" x2="${colXs[3]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  ${northArrow(70, drawY1 - 40)}
</svg>`;

  const colPos = buildColumnPositions(colXs, rowYs, W, H);
  return { svg, colPos };
}

// ── Drawing 3: Roof Plan (3 cols × 3 rows) ────────────────────────────────────
function makeRoofSVG() {
  const W = 1700, H = 950;
  const tbX = W - 380;
  const colXs = [200, 580, 960];
  const rowYs = [170, 430, 690];
  const drawX0 = 150, drawX1 = tbX - 30;
  const drawY0 = 100, drawY1 = 830;

  // Ridge line and hip lines
  const ridge = `<line x1="${(colXs[0] + colXs[2]) / 2}" y1="${rowYs[0]}" x2="${(colXs[0] + colXs[2]) / 2}" y2="${rowYs[2]}" stroke="#8B6914" stroke-width="4" stroke-dasharray="10 5"/>`;

  // Rafter lines
  const raftersCenterX = (colXs[0] + colXs[2]) / 2;
  const rafters = [];
  for (const x of colXs) {
    for (const y of rowYs) {
      rafters.push(`<line x1="${raftersCenterX}" y1="${(rowYs[0] + rowYs[2]) / 2}" x2="${x}" y2="${y}" stroke="#a08060" stroke-width="2" stroke-dasharray="6 4"/>`);
    }
  }

  // Purlin lines (horizontal structural)
  const purlins = rowYs.map(y =>
    `<line x1="${colXs[0]}" y1="${y}" x2="${colXs[colXs.length - 1]}" y2="${y}" stroke="#8B6914" stroke-width="6" stroke-linecap="round"/>`
  ).join('\n');
  const eaveLines = colXs.map(x =>
    `<line x1="${x}" y1="${rowYs[0]}" x2="${x}" y2="${rowYs[rowYs.length - 1]}" stroke="#8B6914" stroke-width="6" stroke-linecap="round"/>`
  ).join('\n');

  // Roof outline
  const roofOutline = `<rect x="${colXs[0] - 30}" y="${rowYs[0] - 30}" width="${colXs[2] - colXs[0] + 60}" height="${rowYs[2] - rowYs[0] + 60}" fill="none" stroke="#5c3d11" stroke-width="3"/>`;

  // Rafter symbols at columns
  const rafterSyms = [];
  for (const y of rowYs) {
    for (const x of colXs) {
      rafterSyms.push(`<circle cx="${x}" cy="${y}" r="14" fill="#e8d8c0" stroke="#5c3d11" stroke-width="2"/>`);
      rafterSyms.push(`<circle cx="${x}" cy="${y}" r="6" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>`);
    }
  }

  // Gutters at perimeter
  const gutters = `<rect x="${colXs[0] - 50}" y="${rowYs[0] - 50}" width="${colXs[2] - colXs[0] + 100}" height="${rowYs[2] - rowYs[0] + 100}" fill="none" stroke="#4a90d9" stroke-width="3" stroke-dasharray="14 6"/>`;

  const tb = titleBlock(W, H,
    'HBP-RF-003', 'ROOF PLAN', 'HOUSE BUILDING PROJECT',
    '1:100', '01', '2026-01-25',
    [
      { label: 'Ridge / Hip Line', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#8B6914" stroke-width="4" stroke-dasharray="8 4"/>` },
      { label: 'Rafter / Purlin', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#8B6914" stroke-width="6"/>` },
      { label: 'UPVC Box Gutter', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#4a90d9" stroke-width="3" stroke-dasharray="10 4"/>` },
      { label: 'Roof Column / Pillar', symbol: (x, y) => `<circle cx="${x + 10}" cy="${y}" r="8" fill="#e8d8c0" stroke="#5c3d11" stroke-width="2"/>` },
    ],
    ['1. Pitch: 25°.', '2. Material: Mangalore clay tiles.', '3. Overhang: 600mm all around.', '4. Gutter: UPVC 150mm box.', '5. Downpipe at each corner.']
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9f4ea"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#5c3d11" stroke-width="3"/>
  ${tb}
  <text x="${tbX / 2}" y="65" font-size="24" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">ROOF PLAN  –  EL. (+) 7.500</text>
  ${gridLines(colXs, rowYs, drawX0, drawX1, drawY0, drawY1)}
  ${gutters}
  ${roofOutline}
  ${purlins}
  ${eaveLines}
  ${rafters.join('\n')}
  ${ridge}
  ${rafterSyms.join('\n')}
  ${colLabels(colXs, drawY0 - 30)}
  ${rowLabels(rowYs, drawX0 - 40)}
  ${dimLines(colXs, drawY1 + 35, ['7200', '7200'])}
  <line x1="${colXs[0]}" y1="${drawY1 + 25}" x2="${colXs[0]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[1]}" y1="${drawY1 + 25}" x2="${colXs[1]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  <line x1="${colXs[2]}" y1="${drawY1 + 25}" x2="${colXs[2]}" y2="${drawY1 + 45}" stroke="#333" stroke-width="1"/>
  ${northArrow(70, drawY1 - 40)}
</svg>`;

  const colPos = buildColumnPositions(colXs, rowYs, W, H);
  return { svg, colPos };
}

// ── Drawing 4: Electrical Layout (6 cols × 3 rows) ───────────────────────────
function makeElectricalSVG() {
  const W = 1700, H = 950;
  const tbX = W - 380;
  const colXs = [170, 370, 570, 770, 970, 1130];
  const rowYs = [200, 460, 700];
  const drawX0 = 120, drawX1 = tbX - 30;
  const drawY0 = 120, drawY1 = 820;

  // Circuit conduit lines
  const conduits = [];
  for (const y of rowYs) {
    conduits.push(`<line x1="${drawX0 + 20}" y1="${y}" x2="${drawX1}" y2="${y}" stroke="#e6a800" stroke-width="3" stroke-dasharray="14 5"/>`);
  }
  for (const x of colXs) {
    conduits.push(`<line x1="${x}" y1="${drawY0 + 30}" x2="${x}" y2="${drawY1}" stroke="#e6a800" stroke-width="2" stroke-dasharray="10 4"/>`);
  }

  // Electrical symbols at grid points
  const elecSymbols = {
    'A': ['DB', 'L', 'Fan', 'S', 'DB2', 'AC'],
    'B': ['L', 'S', 'L', 'Fan', 'L', 'S'],
    'C': ['EXH', 'S', 'L', 'S', 'L', 'EXT'],
  };
  const symbols = [];
  const symLabels = { DB: '#e03', L: '#ca8a04', Fan: '#0a6', S: '#36a', DB2: '#e03', AC: '#0a6', EXH: '#f60', EXT: '#666' };
  const rows = ['A', 'B', 'C'];
  for (let r = 0; r < rowYs.length; r++) {
    const row = rows[r];
    const symRow = elecSymbols[row];
    for (let c = 0; c < colXs.length; c++) {
      const lbl = symRow[c] || 'L';
      const col = symLabels[lbl] || '#ca8a04';
      const cx = colXs[c], cy = rowYs[r];
      if (lbl === 'DB' || lbl === 'DB2') {
        // Distribution board — rectangle
        symbols.push(`<rect x="${cx - 22}" y="${cy - 18}" width="44" height="36" fill="#fff3cd" stroke="${col}" stroke-width="2.5" rx="3"/>`);
        symbols.push(`<text x="${cx}" y="${cy + 6}" font-size="11" fill="${col}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${lbl}</text>`);
      } else if (lbl === 'Fan') {
        symbols.push(`<circle cx="${cx}" cy="${cy}" r="20" fill="#e8fce8" stroke="${col}" stroke-width="2"/>`);
        symbols.push(`<line x1="${cx - 14}" y1="${cy}" x2="${cx + 14}" y2="${cy}" stroke="${col}" stroke-width="2"/>`);
        symbols.push(`<line x1="${cx}" y1="${cy - 14}" x2="${cx}" y2="${cy + 14}" stroke="${col}" stroke-width="2"/>`);
        symbols.push(`<text x="${cx}" y="${cy + 34}" font-size="10" fill="${col}" font-family="sans-serif" text-anchor="middle">Fan</text>`);
      } else if (lbl === 'AC') {
        symbols.push(`<rect x="${cx - 22}" y="${cy - 14}" width="44" height="28" fill="#e8f4fd" stroke="${col}" stroke-width="2" rx="5"/>`);
        symbols.push(`<text x="${cx}" y="${cy + 5}" font-size="11" fill="${col}" font-family="sans-serif" text-anchor="middle" font-weight="bold">AC</text>`);
      } else {
        symbols.push(`<circle cx="${cx}" cy="${cy}" r="18" fill="#fffbe6" stroke="${col}" stroke-width="2"/>`);
        symbols.push(`<text x="${cx}" y="${cy + 5}" font-size="11" fill="${col}" font-family="sans-serif" text-anchor="middle" font-weight="bold">${lbl}</text>`);
      }
    }
  }

  const tb = titleBlock(W, H,
    'HBP-EL-004', 'ELECTRICAL LAYOUT PLAN', 'HOUSE BUILDING PROJECT',
    '1:100', '01', '2026-02-05',
    [
      { label: 'Distribution Board (DB)', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="22" height="20" fill="#fff3cd" stroke="#e03" stroke-width="2"/>` },
      { label: 'Light Point (L)', symbol: (x, y) => `<circle cx="${x + 10}" cy="${y}" r="9" fill="#fffbe6" stroke="#ca8a04" stroke-width="2"/>` },
      { label: 'Power Socket (S)', symbol: (x, y) => `<circle cx="${x + 10}" cy="${y}" r="9" fill="#fffbe6" stroke="#36a" stroke-width="2"/>` },
      { label: 'AC / Exhaust', symbol: (x, y) => `<rect x="${x}" y="${y - 8}" width="20" height="16" fill="#e8f4fd" stroke="#0a6" stroke-width="2" rx="3"/>` },
      { label: 'Conduit run (dashed)', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#e6a800" stroke-width="3" stroke-dasharray="8 4"/>` },
    ],
    ['1. All wiring: PVC conduit.', '2. Main supply: 3Ph 415V 63A.', '3. Lights: 1.5 sqmm FRLS.', '4. Sockets: 2.5 sqmm FRLS.', '5. Earthing: IS 3043.']
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9f4ea"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#5c3d11" stroke-width="3"/>
  ${tb}
  <text x="${tbX / 2}" y="65" font-size="22" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">ELECTRICAL LAYOUT PLAN  –  GROUND FLOOR</text>
  ${conduits.join('\n')}
  ${symbols.join('\n')}
  ${colLabels(colXs, drawY0 - 30, '#ca8a04')}
  ${rowLabels(rowYs, drawX0 - 40, '#ca8a04')}
  ${northArrow(70, drawY1 - 40)}
</svg>`;

  const colPos = buildColumnPositions(colXs, rowYs, W, H);
  return { svg, colPos };
}

// ── Drawing 5: Plumbing & Drainage (4 cols × 3 rows) ─────────────────────────
function makePlumbingSVG() {
  const W = 1700, H = 950;
  const tbX = W - 380;
  const colXs = [200, 500, 800, 1060];
  const rowYs = [200, 460, 700];
  const drawX0 = 150, drawX1 = tbX - 30;
  const drawY0 = 120, drawY1 = 820;

  // Supply pipes (blue solid)
  const supply = [];
  for (const y of rowYs) {
    supply.push(`<line x1="${drawX0 + 20}" y1="${y}" x2="${drawX1}" y2="${y}" stroke="#2563eb" stroke-width="4"/>`);
  }
  for (const x of colXs) {
    supply.push(`<line x1="${x}" y1="${drawY0 + 30}" x2="${x}" y2="${drawY1}" stroke="#2563eb" stroke-width="3"/>`);
  }

  // Drainage pipes (green dashed)
  const drain = [];
  const drainOffset = 25;
  for (const y of rowYs) {
    drain.push(`<line x1="${drawX0 + 20}" y1="${y + drainOffset}" x2="${drawX1}" y2="${y + drainOffset}" stroke="#16a34a" stroke-width="4" stroke-dasharray="16 7"/>`);
  }
  for (const x of colXs) {
    drain.push(`<line x1="${x + drainOffset}" y1="${drawY0 + 30}" x2="${x + drainOffset}" y2="${drawY1}" stroke="#16a34a" stroke-width="3" stroke-dasharray="12 6"/>`);
  }

  // Fixture symbols at grid intersections
  const fixtures = [
    { c: 0, r: 0, type: 'WC', label: 'WC-1' },
    { c: 1, r: 0, type: 'Basin', label: 'B-1' },
    { c: 2, r: 0, type: 'Shower', label: 'SH-1' },
    { c: 3, r: 0, type: 'Tank', label: 'OHT' },
    { c: 0, r: 1, type: 'Sink', label: 'SK-1' },
    { c: 1, r: 1, type: 'WC', label: 'WC-2' },
    { c: 2, r: 1, type: 'Basin', label: 'B-2' },
    { c: 3, r: 1, type: 'Sump', label: 'Sump' },
    { c: 0, r: 2, type: 'Geyser', label: 'GS-1' },
    { c: 1, r: 2, type: 'Drain', label: 'FD-1' },
    { c: 2, r: 2, type: 'Drain', label: 'FD-2' },
    { c: 3, r: 2, type: 'Pump', label: 'Pump' },
  ];
  const fixtureSvg = fixtures.map(f => {
    const cx = colXs[f.c], cy = rowYs[f.r];
    if (f.type === 'WC') {
      return `<ellipse cx="${cx}" cy="${cy}" rx="22" ry="28" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
<text x="${cx}" y="${cy + 5}" font-size="11" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">${f.label}</text>`;
    } else if (f.type === 'Basin') {
      return `<rect x="${cx - 20}" y="${cy - 16}" width="40" height="32" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
<text x="${cx}" y="${cy + 5}" font-size="11" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">${f.label}</text>`;
    } else if (f.type === 'Shower') {
      return `<circle cx="${cx}" cy="${cy}" r="20" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
<text x="${cx}" y="${cy + 5}" font-size="10" fill="#1e40af" font-family="sans-serif" text-anchor="middle">${f.label}</text>`;
    } else if (f.type === 'Sink') {
      return `<rect x="${cx - 24}" y="${cy - 16}" width="48" height="32" fill="#d1fae5" stroke="#16a34a" stroke-width="2"/>
<text x="${cx}" y="${cy + 5}" font-size="11" fill="#166534" font-family="sans-serif" text-anchor="middle" font-weight="bold">${f.label}</text>`;
    } else if (f.type === 'Tank' || f.type === 'Sump') {
      return `<rect x="${cx - 22}" y="${cy - 22}" width="44" height="44" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.5"/>
<text x="${cx}" y="${cy + 5}" font-size="10" fill="#0369a1" font-family="sans-serif" text-anchor="middle" font-weight="bold">${f.label}</text>`;
    } else {
      return `<circle cx="${cx}" cy="${cy}" r="18" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
<text x="${cx}" y="${cy + 5}" font-size="10" fill="#166534" font-family="sans-serif" text-anchor="middle">${f.label}</text>`;
    }
  }).join('\n');

  const tb = titleBlock(W, H,
    'HBP-PL-005', 'PLUMBING AND DRAINAGE PLAN', 'HOUSE BUILDING PROJECT',
    '1:100', '01', '2026-02-10',
    [
      { label: 'Cold Water Supply (CPVC)', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#2563eb" stroke-width="4"/>` },
      { label: 'Drainage / Soil Pipe', symbol: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y}" stroke="#16a34a" stroke-width="4" stroke-dasharray="10 4"/>` },
      { label: 'WC / Closet', symbol: (x, y) => `<ellipse cx="${x + 11}" cy="${y}" rx="10" ry="13" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"/>` },
      { label: 'Basin / Sink', symbol: (x, y) => `<rect x="${x}" y="${y - 8}" width="22" height="16" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"/>` },
      { label: 'Overhead Tank / Sump', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="22" height="20" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>` },
    ],
    ['1. Supply pipe: 25mm CPVC.', '2. Soil pipe: 110mm uPVC.', '3. Waste pipe: 50mm uPVC.', '4. OHT: 1000L on terrace.', '5. Sump: 15000L underground.']
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9f4ea"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#5c3d11" stroke-width="3"/>
  ${tb}
  <text x="${tbX / 2}" y="65" font-size="22" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">PLUMBING AND DRAINAGE PLAN  –  GROUND FLOOR</text>
  ${gridLines(colXs, rowYs, drawX0, drawX1, drawY0, drawY1, '#aaa')}
  ${supply.join('\n')}
  ${drain.join('\n')}
  ${fixtureSvg}
  ${colLabels(colXs, drawY0 - 30, '#2563eb')}
  ${rowLabels(rowYs, drawX0 - 40, '#2563eb')}
  ${dimLines(colXs, drawY1 + 35, ['6000', '6000', '5200'])}
  ${northArrow(70, drawY1 - 40)}
</svg>`;

  const colPos = buildColumnPositions(colXs, rowYs, W, H);
  return { svg, colPos };
}

// ── Drawing 6: Interior Finishing Plan (4 cols × 3 rows) ─────────────────────
function makeFinishingSVG() {
  const W = 1700, H = 950;
  const tbX = W - 380;
  const colXs = [200, 500, 800, 1060];
  const rowYs = [200, 460, 700];
  const drawX0 = 150, drawX1 = tbX - 30;
  const drawY0 = 120, drawY1 = 820;

  // Room fills with hatching
  const rooms2 = [
    { x1: colXs[0], y1: rowYs[0], x2: colXs[1], y2: rowYs[1], fill: '#fef3c7', label: 'Living / Dining' },
    { x1: colXs[1], y1: rowYs[0], x2: colXs[2], y2: rowYs[1], fill: '#dbeafe', label: 'Master Bedroom' },
    { x1: colXs[2], y1: rowYs[0], x2: colXs[3], y2: rowYs[1], fill: '#dcfce7', label: 'Bedroom 2' },
    { x1: colXs[0], y1: rowYs[1], x2: colXs[1], y2: rowYs[2], fill: '#ffe4e6', label: 'Kitchen' },
    { x1: colXs[1], y1: rowYs[1], x2: colXs[2], y2: rowYs[2], fill: '#fce7f3', label: 'Toilet / Bath' },
    { x1: colXs[2], y1: rowYs[1], x2: colXs[3], y2: rowYs[2], fill: '#ede9fe', label: 'Bedroom 3' },
    { x1: colXs[0], y1: rowYs[2], x2: colXs[2], y2: rowYs[2] + 150, fill: '#f0fdf4', label: 'Garage / Utility' },
    { x1: colXs[2], y1: rowYs[2], x2: colXs[3], y2: rowYs[2] + 150, fill: '#fff7ed', label: 'Corridor' },
  ];
  const roomFills = rooms2.map(r =>
    `<rect x="${r.x1}" y="${r.y1}" width="${r.x2 - r.x1}" height="${r.y2 - r.y1}" fill="${r.fill}" stroke="#888" stroke-width="2"/>
<text x="${(r.x1 + r.x2) / 2}" y="${(r.y1 + r.y2) / 2 + 5}" font-size="12" fill="#555" font-family="sans-serif" text-anchor="middle">${r.label}</text>`
  ).join('\n');

  // Finishing annotations
  const annots = [
    { x: colXs[0] + 10, y: rowYs[0] + 20, text: 'Vitrified 600×600' },
    { x: colXs[1] + 10, y: rowYs[0] + 20, text: 'Vitrified 600×600' },
    { x: colXs[2] + 10, y: rowYs[0] + 20, text: 'Vitrified 600×600' },
    { x: colXs[0] + 10, y: rowYs[1] + 20, text: 'Anti-skid tiles' },
    { x: colXs[1] + 10, y: rowYs[1] + 20, text: 'Ceramic tiles' },
  ].map(a => `<text x="${a.x}" y="${a.y}" font-size="10" fill="#888" font-family="sans-serif" font-style="italic">${a.text}</text>`).join('\n');

  // Wall finish hatch marks
  const wallHash = [];
  for (const y of rowYs) {
    for (let x = drawX0 + 30; x < drawX1 - 30; x += 30) {
      wallHash.push(`<line x1="${x}" y1="${y - 5}" x2="${x + 8}" y2="${y + 5}" stroke="#bbb" stroke-width="0.8"/>`);
    }
  }

  const tb = titleBlock(W, H,
    'HBP-FIN-006', 'INTERIOR FINISHING PLAN', 'HOUSE BUILDING PROJECT',
    '1:100', '01', '2026-03-01',
    [
      { label: 'Living / Bedroom: Vitrified 600×600', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="20" height="20" fill="#fef3c7" stroke="#888" stroke-width="1.5"/>` },
      { label: 'Kitchen: Anti-skid ceramic', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="20" height="20" fill="#ffe4e6" stroke="#888" stroke-width="1.5"/>` },
      { label: 'Toilet: Glazed wall tile', symbol: (x, y) => `<rect x="${x}" y="${y - 10}" width="20" height="20" fill="#fce7f3" stroke="#888" stroke-width="1.5"/>` },
      { label: 'Door: Teak wood / HDF', symbol: (x, y) => `<rect x="${x}" y="${y - 8}" width="8" height="16" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>` },
      { label: 'Window: UPVC with 4mm glass', symbol: (x, y) => `<rect x="${x}" y="${y - 8}" width="20" height="16" fill="none" stroke="#60a5fa" stroke-width="2"/>` },
    ],
    ['1. All dims in mm.', '2. Internal plaster: 12mm CM 1:4.', '3. Paint: Asian Royale Emulsion.', '4. Putty: 2 coats before paint.', '5. Grout: epoxy for tile joints.']
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f9f4ea"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#5c3d11" stroke-width="3"/>
  ${tb}
  <text x="${tbX / 2}" y="65" font-size="22" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">INTERIOR FINISHING PLAN  –  GROUND FLOOR</text>
  ${gridLines(colXs, rowYs, drawX0, drawX1, drawY0, drawY1)}
  ${roomFills}
  ${wallHash.join('\n')}
  ${annots}
  ${colLabels(colXs, drawY0 - 30)}
  ${rowLabels(rowYs, drawX0 - 40)}
  ${dimLines(colXs, drawY1 + 35, ['6000', '6000', '5200'])}
  ${northArrow(70, drawY1 - 40)}
</svg>`;

  const colPos = buildColumnPositions(colXs, rowYs, W, H);
  return { svg, colPos };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function patchDrawing(id, svgContent, colPos) {
  // Upload new file via multipart
  const fd = new FormData();
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  fd.set('file', blob, 'drawing.svg');

  const uploadR = await fetch(`${BASE}/drawings/upload`, {
    method: 'POST',
    body: fd,
  });
  // We don't actually use this new upload – the API always creates a NEW drawing.
  // Instead we use the PATCH /:id with fileUrl to replace the SVG inline, and set columnPositions.
  // But since upload creates a new one, let's just patch fileUrl (base64) + colPos on existing.

  const svgB64 = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

  const patchR = await fetch(`${BASE}/drawings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileUrl: svgB64,
      columnPositions: colPos,
      resetColumnPositions: true,  // clear first, then we set
    }),
  });
  const patchData = await patchR.json();
  if (!patchData.id) throw new Error(`PATCH failed for ${id}: ${JSON.stringify(patchData)}`);

  // Now set the correct column positions (merge on top)
  const patchR2 = await fetch(`${BASE}/drawings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnPositions: colPos }),
  });
  const pd2 = await patchR2.json();
  return pd2;
}

async function main() {
  console.log('Replacing House Building Project drawings with proper architectural SVGs...\n');

  const tasks = [
    { name: 'Foundation Plan',          id: DRAWINGS.foundation,  maker: makeFoundationSVG },
    { name: 'Ground Floor Plan',        id: DRAWINGS.groundFloor, maker: makeGroundFloorSVG },
    { name: 'Roof Plan',                id: DRAWINGS.roof,        maker: makeRoofSVG },
    { name: 'Electrical Layout Plan',   id: DRAWINGS.electrical,  maker: makeElectricalSVG },
    { name: 'Plumbing and Drainage Plan', id: DRAWINGS.plumbing,  maker: makePlumbingSVG },
    { name: 'Interior Finishing Plan',  id: DRAWINGS.finishing,   maker: makeFinishingSVG },
  ];

  for (const t of tasks) {
    process.stdout.write(`  Replacing "${t.name}"... `);
    const { svg, colPos } = t.maker();
    await patchDrawing(t.id, svg, colPos);
    console.log(`✓  (${Object.keys(colPos).length} column positions set)`);
  }

  console.log('\n✅ All drawings replaced with proper architectural drawings!');
  console.log('Open: https://buildtrack-withdrawing.onslate.in/projects');
}

main().catch(err => { console.error('\nFailed:', err.message); process.exit(1); });
