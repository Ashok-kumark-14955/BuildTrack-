import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import db from './db';

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const now = new Date().toISOString();
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Assigned', 'In Progress', 'Waiting', 'Completed', 'Blocked'];
const engineers = ['Alice Kumar', 'Ben Ortiz', 'Chen Wei', 'Dana Cole'];

function gridCode(col: number, row: number) {
  const letter = String.fromCharCode(65 + col);
  return `${letter}${row + 1}`;
}

function writeSvg(svg: string) {
  const fileName = `${uuid()}.svg`;
  fs.writeFileSync(path.join(uploadDir, fileName), svg);
  return `/uploads/${fileName}`;
}

// --- SVG generators for each discipline, so each drawing looks visually distinct ---

function floorPlanSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#f5f5f0"/>
  <rect x="40" y="40" width="1520" height="920" fill="none" stroke="#333" stroke-width="4"/>
  <line x1="400" y1="40" x2="400" y2="960" stroke="#666" stroke-width="2"/>
  <line x1="800" y1="40" x2="800" y2="960" stroke="#666" stroke-width="2"/>
  <line x1="1200" y1="40" x2="1200" y2="960" stroke="#666" stroke-width="2"/>
  <line x1="40" y1="500" x2="1560" y2="500" stroke="#666" stroke-width="2"/>
  <text x="700" y="500" font-size="42" fill="#999" font-family="sans-serif">SAMPLE FLOOR PLAN - LEVEL 1</text>
</svg>`;
}

function civilSvg() {
  // Site/foundation plan: excavation outline, footing circles, grid reference lines
  const footings = Array.from({ length: 24 })
    .map((_, i) => {
      const x = 140 + (i % 6) * 240;
      const y = 140 + Math.floor(i / 6) * 220;
      return `<circle cx="${x}" cy="${y}" r="26" fill="#d9cba8" stroke="#7a5c2e" stroke-width="3"/>` +
        `<text x="${x}" y="${y + 45}" font-size="16" fill="#7a5c2e" font-family="sans-serif" text-anchor="middle">F${i + 1}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#efe8d8"/>
  <rect x="40" y="40" width="1520" height="920" fill="none" stroke="#5c4324" stroke-width="4" stroke-dasharray="12 6"/>
  <text x="500" y="90" font-size="38" fill="#5c4324" font-family="sans-serif" font-weight="bold">CIVIL WORKS - SITE &amp; FOUNDATION PLAN</text>
  ${footings}
  <line x1="40" y1="500" x2="1560" y2="500" stroke="#a8955f" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="60" y="520" font-size="20" fill="#8a7440" font-family="sans-serif">GRID LINE - EL. 0.00</text>
</svg>`;
}

function erectionSvg() {
  // Steel erection plan: columns + beam grid
  const cols = Array.from({ length: 30 })
    .map((_, i) => {
      const x = 120 + (i % 6) * 250;
      const y = 120 + Math.floor(i / 6) * 170;
      return `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="#c9d6e3" stroke="#1e3a5f" stroke-width="3"/>`;
    })
    .join('');
  const beamsH = Array.from({ length: 5 })
    .map((_, r) => `<line x1="110" y1="${120 + r * 170}" x2="1490" y2="${120 + r * 170}" stroke="#1e3a5f" stroke-width="5"/>`)
    .join('');
  const beamsV = Array.from({ length: 6 })
    .map((_, c) => `<line x1="${120 + c * 250}" y1="110" x2="${120 + c * 250}" y2="800" stroke="#1e3a5f" stroke-width="5"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#eef2f6"/>
  <rect x="40" y="40" width="1520" height="920" fill="none" stroke="#1e3a5f" stroke-width="4"/>
  <text x="480" y="90" font-size="38" fill="#1e3a5f" font-family="sans-serif" font-weight="bold">STEEL ERECTION PLAN - LEVEL 2</text>
  ${beamsH}
  ${beamsV}
  ${cols}
  <text x="60" y="960" font-size="18" fill="#456" font-family="sans-serif">Legend: [] = Column   — = Beam</text>
</svg>`;
}

function paintingSvg() {
  // Painting / finishing plan: colored room zones with finish labels
  const rooms = [
    { x: 60, y: 100, w: 460, h: 380, color: '#f6c9c9', label: 'Living Rm - Emulsion (Off White)' },
    { x: 560, y: 100, w: 460, h: 380, color: '#c9e3f6', label: 'Bedroom 1 - Emulsion (Sky Blue)' },
    { x: 1060, y: 100, w: 460, h: 380, color: '#c9f6d3', label: 'Bedroom 2 - Emulsion (Mint)' },
    { x: 60, y: 520, w: 460, h: 380, color: '#f6ecc9', label: 'Kitchen - Enamel (Cream)' },
    { x: 560, y: 520, w: 460, h: 380, color: '#e3c9f6', label: 'Corridor - Emulsion (Lavender)' },
    { x: 1060, y: 520, w: 460, h: 380, color: '#f6d9c9', label: 'Balcony - Weatherproof (Terracotta)' },
  ];
  const shapes = rooms
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}" stroke="#555" stroke-width="3"/>` +
        `<text x="${r.x + 20}" y="${r.y + 36}" font-size="20" fill="#333" font-family="sans-serif">${r.label}</text>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#fbfbf8"/>
  <rect x="40" y="40" width="1520" height="920" fill="none" stroke="#333" stroke-width="4"/>
  <text x="480" y="90" font-size="38" fill="#333" font-family="sans-serif" font-weight="bold">PAINTING &amp; FINISHING PLAN - LEVEL 1</text>
  ${shapes}
</svg>`;
}

function columnGridSvg() {
  // Structural column layout: A-D across the top, 1-4 down the side, matching
  // standard structural drawing convention (column letter first, row number second).
  const cols = ['A', 'B', 'C', 'D'];
  const rowNums = [1, 2, 3, 4];
  const originX = 260;
  const originY = 180;
  const spacing = 340;
  const dim = 6000;

  const colHeads = cols
    .map((c, i) => {
      const x = originX + i * spacing;
      return `<circle cx="${x}" cy="80" r="28" fill="#fff" stroke="#111" stroke-width="3"/>` +
        `<text x="${x}" y="90" font-size="28" fill="#111" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`;
    })
    .join('');
  const colHeadsBottom = cols
    .map((c, i) => {
      const x = originX + i * spacing;
      const y = originY + (rowNums.length - 1) * spacing + 120;
      return `<circle cx="${x}" cy="${y}" r="28" fill="#fff" stroke="#111" stroke-width="3"/>` +
        `<text x="${x}" y="${y + 10}" font-size="28" fill="#111" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`;
    })
    .join('');
  const rowHeads = rowNums
    .map((n, i) => {
      const y = originY + i * spacing;
      return `<circle cx="80" cy="${y}" r="28" fill="#fff" stroke="#111" stroke-width="3"/>` +
        `<text x="80" y="${y + 10}" font-size="28" fill="#111" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`;
    })
    .join('');
  const rowHeadsRight = rowNums
    .map((n, i) => {
      const y = originY + i * spacing;
      const x = originX + (cols.length - 1) * spacing + 180;
      return `<circle cx="${x}" cy="${y}" r="28" fill="#fff" stroke="#111" stroke-width="3"/>` +
        `<text x="${x}" y="${y + 10}" font-size="28" fill="#111" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`;
    })
    .join('');

  const vLines = cols
    .map((_, i) => {
      const x = originX + i * spacing;
      return `<line x1="${x}" y1="108" x2="${x}" y2="${originY + (rowNums.length - 1) * spacing + 92}" stroke="#666" stroke-width="2" stroke-dasharray="10 6"/>`;
    })
    .join('');
  const hLines = rowNums
    .map((_, i) => {
      const y = originY + i * spacing;
      return `<line x1="108" y1="${y}" x2="${originX + (cols.length - 1) * spacing + 92}" y2="${y}" stroke="#666" stroke-width="2" stroke-dasharray="10 6"/>`;
    })
    .join('');

  const columns = [];
  for (let r = 0; r < rowNums.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const x = originX + c * spacing;
      const y = originY + r * spacing;
      columns.push(
        `<rect x="${x - 18}" y="${y - 18}" width="36" height="36" fill="#9ca3af" stroke="#111" stroke-width="3"/>` +
        `<text x="${x + 26}" y="${y + 8}" font-size="22" fill="#1e3a8a" font-family="sans-serif" font-weight="bold">${cols[c]}${rowNums[r]}</text>`
      );
    }
  }

  const dimLabels = cols
    .slice(0, -1)
    .map((_, i) => {
      const x1 = originX + i * spacing;
      const x2 = originX + (i + 1) * spacing;
      return `<line x1="${x1}" y1="140" x2="${x2}" y2="140" stroke="#333" stroke-width="1.5"/>` +
        `<text x="${(x1 + x2) / 2}" y="130" font-size="20" fill="#333" font-family="sans-serif" text-anchor="middle">${dim}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <rect width="1600" height="1200" fill="#ffffff"/>
  <text x="420" y="40" font-size="32" fill="#111" font-family="sans-serif" font-weight="bold">STRUCTURAL COLUMN LAYOUT PLAN</text>
  ${dimLabels}
  ${vLines}
  ${hLines}
  ${columns.join('')}
  ${colHeads}
  ${colHeadsBottom}
  ${rowHeads}
  ${rowHeadsRight}
  <text x="1150" y="200" font-size="18" fill="#333" font-family="sans-serif">NOTES:</text>
  <text x="1150" y="230" font-size="15" fill="#333" font-family="sans-serif">1. All dimensions in mm.</text>
  <text x="1150" y="255" font-size="15" fill="#333" font-family="sans-serif">2. Column mark as per column schedule.</text>
  <text x="1150" y="280" font-size="15" fill="#333" font-family="sans-serif">3. Verify all dimensions on site.</text>
</svg>`;
}

const projectId = uuid();

db.prepare('INSERT INTO projects (id, name, createdAt) VALUES (?, ?, ?)').run(projectId, 'Riverside Tower', now);

const insertTask = db.prepare(
  `INSERT INTO tasks (id, drawingId, gridCode, name, description, category, priority, assignedTo, startDate, dueDate, status, progress, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertActivity = db.prepare(
  'INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)'
);

function seedDrawing(opts: {
  name: string;
  fileUrl: string;
  gridCols: number;
  gridRows: number;
  categories: string[];
  cells: [number, number][];
}) {
  const drawingId = uuid();
  db.prepare(
    `INSERT INTO drawings (id, projectId, name, fileUrl, fileType, gridCols, gridRows, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(drawingId, projectId, opts.name, opts.fileUrl, 'image', opts.gridCols, opts.gridRows, now);

  opts.cells.forEach(([col, row], i) => {
    const code = gridCode(col, row);
    const status = statuses[i % statuses.length];
    const progress = status === 'Completed' ? 100 : status === 'Blocked' ? 20 : (i * 13) % 90;
    const category = opts.categories[i % opts.categories.length];
    insertTask.run(
      uuid(), drawingId, code, `${category} work - ${code}`,
      `Sample task for grid ${code} demonstrating ${status} status.`,
      category, priorities[i % priorities.length],
      engineers[i % engineers.length], '2026-07-01', '2026-08-15', status, progress, now, now
    );
  });

  insertActivity.run(uuid(), null, drawingId, `${opts.name} seeded with demo tasks`, now);
  return drawingId;
}

const generalDrawingId = seedDrawing({
  name: 'Level 1 - Floor Plan',
  fileUrl: writeSvg(floorPlanSvg()),
  gridCols: 10,
  gridRows: 8,
  categories: ['Structural', 'Electrical', 'Plumbing', 'Finishing', 'HVAC'],
  cells: [[1, 1], [2, 1], [3, 2], [4, 3], [5, 0], [6, 4], [0, 5], [7, 2], [2, 6], [8, 5]],
});

seedDrawing({
  name: 'Civil - Site & Foundation Plan',
  fileUrl: writeSvg(civilSvg()),
  gridCols: 6,
  gridRows: 4,
  categories: ['Civil', 'Structural', 'Safety'],
  cells: [[0, 0], [1, 0], [2, 1], [3, 2], [4, 3], [5, 1], [1, 3], [2, 2]],
});

seedDrawing({
  name: 'Erection - Steel Structure Level 2',
  fileUrl: writeSvg(erectionSvg()),
  gridCols: 6,
  gridRows: 5,
  categories: ['Structural', 'Safety'],
  cells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 0], [0, 4], [3, 1], [2, 0]],
});

seedDrawing({
  name: 'Painting - Finishing Plan Level 1',
  fileUrl: writeSvg(paintingSvg()),
  gridCols: 3,
  gridRows: 2,
  categories: ['Finishing'],
  cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
});

seedDrawing({
  name: 'Structural - Column Layout Plan',
  fileUrl: writeSvg(columnGridSvg()),
  gridCols: 4,
  gridRows: 4,
  categories: ['Structural', 'Civil', 'Safety'],
  cells: [[0, 0], [1, 0], [2, 1], [3, 2], [1, 3], [3, 3], [0, 2], [2, 0]],
});

console.log('Seed complete. Project:', projectId, 'Drawing:', generalDrawingId);
