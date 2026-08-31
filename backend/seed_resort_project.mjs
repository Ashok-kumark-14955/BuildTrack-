/**
 * seed_resort_project.mjs
 * Run with: node backend/seed_resort_project.mjs
 * Seeds a sample "Coastal Breeze Resort" project into the live Catalyst backend.
 * Uploads one top-view site plan drawing (backend/assets/resort-drawings/
 * resort-site-plan-top-view.svg, gridCols=7, gridRows=4) and fills in the
 * 28 auto-created grid tasks with realistic resort-construction details.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const SVG_PATH = join(__dirname, 'assets', 'resort-drawings', 'resort-site-plan-top-view.svg');

async function postJSON(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`POST ${path} non-JSON: ${text.slice(0, 200)}`); }
  if (!data.id) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function uploadDrawing(svgContent, name, projectId, gridCols, gridRows) {
  const fd = new FormData();
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  fd.set('file', blob, `${name.replace(/\s+/g, '_')}.svg`);
  fd.set('projectId', projectId);
  fd.set('name', name);
  fd.set('gridCols', String(gridCols));
  fd.set('gridRows', String(gridRows));
  const r = await fetch(`${BASE}/drawings/upload`, { method: 'POST', body: fd });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Upload non-JSON: ${text.slice(0, 300)}`); }
  if (!data.id) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  return data;
}

// col/row use 0-based indices matching the SVG generator's ZONES layout.
const TASKS = [
  // Row 1 — main building spine
  { col: 0, row: 0, name: 'Reception Lobby RCC Frame & Roofing', description: 'Structural frame and roof complete for the reception building; now moving to interior finishing.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-01-15', dueDate: '2026-03-10', status: 'Completed', progress: 100 },
  { col: 1, row: 0, name: 'Front Office Partition Walls & Flooring', description: 'Partition walls, false ceiling grid, and vitrified tile flooring for the front office and concierge desk.', category: 'Finishing', priority: 'Medium', assignedTo: 'Farah Sheikh', startDate: '2026-02-01', dueDate: '2026-03-25', status: 'In Progress', progress: 70 },
  { col: 2, row: 0, name: 'Restaurant Dining Hall Structure', description: 'Column and beam frame for the main dining hall, clear-span roof trusses for the double-height ceiling.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-01-20', dueDate: '2026-04-05', status: 'In Progress', progress: 55 },
  { col: 3, row: 0, name: 'Commercial Kitchen MEP Rough-in', description: 'Grease trap, exhaust hood ducting, gas manifold, and drainage rough-in for the back-of-house kitchen.', category: 'MEP', priority: 'Critical', assignedTo: 'Ravi Shankar', startDate: '2026-02-10', dueDate: '2026-04-20', status: 'In Progress', progress: 40 },
  { col: 4, row: 0, name: 'Spa & Wellness Center Shell', description: 'Foundation and superstructure for the spa building, including treatment room partitions.', category: 'Structural', priority: 'Medium', assignedTo: 'Anand Kumar', startDate: '2026-03-01', dueDate: '2026-05-15', status: 'Assigned', progress: 20 },
  { col: 5, row: 0, name: 'Gymnasium Flooring & Mirror Wall Fit-out', description: 'Shock-absorbent rubber flooring and full-height mirror wall installation for the gym.', category: 'Finishing', priority: 'Low', assignedTo: 'Farah Sheikh', startDate: '2026-03-15', dueDate: '2026-05-20', status: 'Assigned', progress: 10 },
  { col: 6, row: 0, name: 'Admin Block & Staff Room Construction', description: 'Admin office block and staff break room shell, including staff washrooms.', category: 'Civil', priority: 'Medium', assignedTo: 'Naveen Reddy', startDate: '2026-02-20', dueDate: '2026-05-01', status: 'Assigned', progress: 15 },
  // Row 2 — pool & leisure
  { col: 0, row: 1, name: 'Main Pool Shell Excavation & Waterproofing', description: 'Excavation, RCC shell, and two-coat waterproofing membrane for the main swimming pool.', category: 'Civil', priority: 'Critical', assignedTo: 'Vikram Nair', startDate: '2026-02-01', dueDate: '2026-05-10', status: 'In Progress', progress: 60 },
  { col: 1, row: 1, name: 'Pool Deck & Sun Lounger Bays', description: 'Anti-skid deck paving around the pool and paved bays for sun loungers.', category: 'Finishing', priority: 'Medium', assignedTo: 'Vikram Nair', startDate: '2026-04-01', dueDate: '2026-06-01', status: 'In Progress', progress: 35 },
  { col: 2, row: 1, name: 'Pool Bar & Cabana Structure', description: 'Timber-frame pool bar counter and thatched-roof cabana structure.', category: 'Structural', priority: 'Medium', assignedTo: 'Anand Kumar', startDate: '2026-04-10', dueDate: '2026-06-15', status: 'Assigned', progress: 15 },
  { col: 3, row: 1, name: 'Villa 1 Foundation & Plinth', description: 'Isolated footings and plinth beam for the first deluxe villa unit.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-01-10', dueDate: '2026-02-20', status: 'Completed', progress: 100 },
  { col: 4, row: 1, name: 'Villa 2 Superstructure & Roofing', description: 'Wall masonry, RCC roof slab, and sloped tile roof over the deluxe villa unit.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-02-15', dueDate: '2026-04-30', status: 'In Progress', progress: 65 },
  { col: 5, row: 1, name: 'Villa 3 Superstructure & Roofing', description: 'Wall masonry, RCC roof slab, and sloped tile roof over the deluxe villa unit.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-02-20', dueDate: '2026-05-05', status: 'In Progress', progress: 50 },
  { col: 6, row: 1, name: 'Villa 4 Masonry & Plumbing Rough-in', description: 'Brick masonry walls and ensuite plumbing rough-in for the deluxe villa unit.', category: 'Plumbing', priority: 'Medium', assignedTo: 'Ravi Shankar', startDate: '2026-03-10', dueDate: '2026-05-25', status: 'Assigned', progress: 25 },
  // Row 3 — garden & premium villas
  { col: 0, row: 2, name: 'Garden Courtyard Softscaping & Irrigation', description: 'Lawn turf, garden beds, and drip irrigation lines for the central courtyard.', category: 'Landscape', priority: 'Low', assignedTo: 'Divya Menon', startDate: '2026-05-01', dueDate: '2026-07-15', status: 'Assigned', progress: 10 },
  { col: 1, row: 2, name: 'Fountain Plaza Water Feature Installation', description: 'Pump chamber, nozzle jets, and paved surround for the plaza water feature.', category: 'MEP', priority: 'Medium', assignedTo: 'Vikram Nair', startDate: '2026-05-15', dueDate: '2026-07-01', status: 'Assigned', progress: 5 },
  { col: 2, row: 2, name: 'Villa 5 Foundation & Plinth', description: 'Isolated footings and plinth beam for the first premium villa unit.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-03-01', dueDate: '2026-05-10', status: 'In Progress', progress: 45 },
  { col: 3, row: 2, name: 'Villa 6 Foundation & Plinth', description: 'Isolated footings and plinth beam for the premium villa unit.', category: 'Structural', priority: 'High', assignedTo: 'Anand Kumar', startDate: '2026-03-10', dueDate: '2026-05-20', status: 'In Progress', progress: 30 },
  { col: 4, row: 2, name: 'Villa 7 Foundation & Plinth', description: 'Isolated footings and plinth beam for the premium villa unit.', category: 'Structural', priority: 'Medium', assignedTo: 'Anand Kumar', startDate: '2026-03-20', dueDate: '2026-05-30', status: 'Assigned', progress: 15 },
  { col: 5, row: 2, name: 'Kids Play Area Safety Surfacing & Equipment', description: 'Rubberised safety surfacing and play equipment installation.', category: 'Landscape', priority: 'Low', assignedTo: 'Divya Menon', startDate: '2026-06-01', dueDate: '2026-07-20', status: 'Assigned', progress: 0 },
  { col: 6, row: 2, name: 'Recreation Court Surfacing', description: 'Badminton/volleyball court base and acrylic surfacing — on hold pending equipment supplier confirmation.', category: 'Civil', priority: 'Low', assignedTo: 'Naveen Reddy', startDate: '2026-06-10', dueDate: '2026-08-01', status: 'Delayed', progress: 5 },
  // Row 4 — entrance / parking / boundary
  { col: 0, row: 3, name: 'Main Entrance Gate & Signage Pillars', description: 'RCC gate pillars, motorised gate, and illuminated resort signage at the main entrance.', category: 'Civil', priority: 'High', assignedTo: 'Naveen Reddy', startDate: '2026-04-01', dueDate: '2026-05-25', status: 'Assigned', progress: 10 },
  { col: 1, row: 3, name: 'Guard House Construction', description: 'Security guard house shell with washroom and CCTV monitoring desk.', category: 'Civil', priority: 'Medium', assignedTo: 'Naveen Reddy', startDate: '2026-03-15', dueDate: '2026-05-10', status: 'In Progress', progress: 40 },
  { col: 2, row: 3, name: 'Main Driveway Paving & Kerbing', description: 'Compacted base, paver block driveway, and kerb stones from the entrance to the lobby.', category: 'Civil', priority: 'Medium', assignedTo: 'Naveen Reddy', startDate: '2026-05-01', dueDate: '2026-06-20', status: 'Assigned', progress: 0 },
  { col: 3, row: 3, name: 'Guest Parking Bay Paving & Line Marking', description: 'Paved guest parking bays with line marking and shaded pergola structures.', category: 'Civil', priority: 'Low', assignedTo: 'Naveen Reddy', startDate: '2026-05-10', dueDate: '2026-06-25', status: 'Assigned', progress: 0 },
  { col: 4, row: 3, name: 'Staff Parking Area & Drainage', description: 'Staff parking area and stormwater drainage — blocked pending municipal drainage connection approval.', category: 'Civil', priority: 'Low', assignedTo: 'Naveen Reddy', startDate: '2026-05-15', dueDate: '2026-06-30', status: 'Blocked', progress: 0 },
  { col: 5, row: 3, name: 'Compound Boundary Wall & Perimeter Landscaping', description: 'Boundary compound wall with coping, plus perimeter hedge and tree planting.', category: 'Civil', priority: 'Medium', assignedTo: 'Naveen Reddy', startDate: '2026-02-01', dueDate: '2026-05-15', status: 'In Progress', progress: 55 },
  { col: 6, row: 3, name: 'Utility Yard, DG Room & Generator Installation', description: 'Backup generator installation, fuel storage, and utility yard enclosure.', category: 'MEP', priority: 'Critical', assignedTo: 'Ravi Shankar', startDate: '2026-03-01', dueDate: '2026-05-20', status: 'Assigned', progress: 20 },
];

async function main() {
  console.log('Creating project "Coastal Breeze Resort"...');
  const project = await postJSON('/projects', {
    name: 'Coastal Breeze Resort',
    code: 'CBR-01',
    description: 'Luxury beachside resort — reception, restaurant, spa, 7 villas, pool deck and landscaped grounds across a 2-acre site.',
    startDate: '2026-01-10',
    endDate: '2026-11-30',
    status: 'In Progress',
    managerName: 'Meera Iyer',
  });
  console.log(`  -> project ${project.id}`);

  console.log('Uploading site plan drawing (top view)...');
  const svgContent = readFileSync(SVG_PATH, 'utf8');
  const drawing = await uploadDrawing(svgContent, 'Resort Site Plan (Top View)', project.id, 7, 4);
  console.log(`  -> drawing ${drawing.id}`);

  const existing = await fetch(`${BASE}/tasks?drawingId=${drawing.id}`).then((r) => r.json());
  const taskMap = {};
  for (const t of existing) taskMap[t.gridCode] = t.id;

  console.log(`Updating ${TASKS.length} tasks...`);
  for (const t of TASKS) {
    const letter = String.fromCharCode(65 + t.col);
    const gridCode = `${letter}${t.row + 1}`;
    const taskId = taskMap[gridCode];
    if (!taskId) { console.warn(`  ⚠ No task for ${gridCode}`); continue; }
    const r = await fetch(`${BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: t.name, description: t.description, category: t.category,
        priority: t.priority, assignedTo: t.assignedTo,
        startDate: t.startDate, dueDate: t.dueDate,
        status: t.status, progress: t.progress,
      }),
    });
    if (!r.ok) console.warn(`  ⚠ Task update failed ${gridCode}: ${(await r.text()).slice(0, 150)}`);
    else process.stdout.write('.');
  }
  console.log('\nDone.');
  console.log(`Project: ${project.id}  Drawing: ${drawing.id}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
