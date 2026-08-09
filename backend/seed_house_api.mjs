/**
 * seed_house_api.mjs
 * Run with: node seed_house_api.mjs
 * Seeds the House Building Project into the live Catalyst backend via REST API.
 * Drawings use POST /api/drawings/upload (multipart/form-data)
 * Tasks use POST /api/tasks (JSON)
 */
// FormData and Blob are globals in Node 18+

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const PID = 'b0af18f2-99dc-4ab8-8496-09d779343c8b';

// Pre-created milestone IDs
const MS = {
  foundation: '3d9bae5a-3965-4467-b707-f131e2e1cec6',
  structural:  '79c443f3-517c-4099-a47b-69dca2905298',
  roofing:     '6883bb07-59c3-41ef-a319-7dc224835380',
  mep:         '8bed5e93-c85f-446a-a830-7c6ea24de401',
  finishing:   '47cc2711-099b-4e68-8ffb-6c35284372fa',
};

async function postJSON(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`POST ${path} returned non-JSON: ${text.slice(0, 200)}`); }
  if (!data.id) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function uploadDrawing(svgContent, name, projectId, milestoneId, gridCols, gridRows) {
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
  try { data = JSON.parse(text); } catch { throw new Error(`Drawing upload returned non-JSON: ${text.slice(0, 300)}`); }
  if (!data.id) throw new Error(`Drawing upload failed: ${JSON.stringify(data)}`);

  // Attach milestone after upload
  if (milestoneId) {
    await fetch(`${BASE}/drawings/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId }),
    });
  }

  return data;
}

// ── SVG generators ─────────────────────────────────────────────────────────────

function foundationSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<rect width="1600" height="1000" fill="#f0ece0"/>
<rect x="40" y="40" width="1520" height="920" fill="none" stroke="#5c4324" stroke-width="4" stroke-dasharray="12 6"/>
<text x="350" y="80" font-size="34" fill="#5c4324" font-family="sans-serif" font-weight="bold">FOUNDATION PLAN - HOUSE BUILDING PROJECT</text>
<rect x="100" y="200" width="1400" height="80" fill="#d9cba8" stroke="#7a5c2e" stroke-width="3"/>
<rect x="100" y="700" width="1400" height="80" fill="#d9cba8" stroke="#7a5c2e" stroke-width="3"/>
<rect x="100" y="200" width="80" height="580" fill="#d9cba8" stroke="#7a5c2e" stroke-width="3"/>
<rect x="1420" y="200" width="80" height="580" fill="#d9cba8" stroke="#7a5c2e" stroke-width="3"/>
<rect x="760" y="200" width="80" height="580" fill="#d9cba8" stroke="#7a5c2e" stroke-width="3"/>
<circle cx="140" cy="240" r="30" fill="#c9a87c" stroke="#5c4324" stroke-width="3"/>
<circle cx="800" cy="240" r="30" fill="#c9a87c" stroke="#5c4324" stroke-width="3"/>
<circle cx="1460" cy="240" r="30" fill="#c9a87c" stroke="#5c4324" stroke-width="3"/>
<circle cx="140" cy="740" r="30" fill="#c9a87c" stroke="#5c4324" stroke-width="3"/>
<circle cx="800" cy="740" r="30" fill="#c9a87c" stroke="#5c4324" stroke-width="3"/>
<circle cx="1460" cy="740" r="30" fill="#c9a87c" stroke="#5c4324" stroke-width="3"/>
<text x="100" y="175" font-size="22" fill="#333" font-family="sans-serif" font-weight="bold">A</text>
<text x="760" y="175" font-size="22" fill="#333" font-family="sans-serif" font-weight="bold">B</text>
<text x="1420" y="175" font-size="22" fill="#333" font-family="sans-serif" font-weight="bold">C</text>
<text x="55" y="245" font-size="22" fill="#333" font-family="sans-serif" font-weight="bold">1</text>
<text x="55" y="745" font-size="22" fill="#333" font-family="sans-serif" font-weight="bold">2</text>
<text x="600" y="970" font-size="18" fill="#555" font-family="sans-serif">All dims in mm. Footing depth: 1500mm BGL.</text>
</svg>`;
}

function groundFloorSvg() {
  const rooms = [
    { x:60,   y:120, w:460, h:360, color:'#fce9d0', label:'Living Room' },
    { x:560,  y:120, w:300, h:360, color:'#d0e8fc', label:'Master Bed' },
    { x:900,  y:120, w:280, h:360, color:'#d0fce0', label:'Bedroom 2' },
    { x:1220, y:120, w:300, h:360, color:'#fce0d0', label:'Bedroom 3' },
    { x:60,   y:520, w:280, h:360, color:'#fdf5d0', label:'Kitchen' },
    { x:380,  y:520, w:200, h:360, color:'#ead0fc', label:'Toilet' },
    { x:620,  y:520, w:280, h:360, color:'#d0fcf5', label:'Bathroom' },
    { x:940,  y:520, w:560, h:360, color:'#ffd0d0', label:'Garage' },
  ];
  const shapes = rooms.map(r =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}" stroke="#555" stroke-width="2.5"/>` +
    `<text x="${r.x+14}" y="${r.y+34}" font-size="20" fill="#333" font-family="sans-serif" font-weight="bold">${r.label}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<rect width="1600" height="1000" fill="#fafaf8"/>
<rect x="40" y="40" width="1520" height="920" fill="none" stroke="#333" stroke-width="4"/>
<text x="320" y="90" font-size="34" fill="#333" font-family="sans-serif" font-weight="bold">GROUND FLOOR PLAN - HOUSE BUILDING PROJECT</text>
${shapes}
<line x1="40" y1="100" x2="40" y2="960" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="520" y1="100" x2="520" y2="960" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="860" y1="100" x2="860" y2="960" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="1200" y1="100" x2="1200" y2="960" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="1560" y1="100" x2="1560" y2="960" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="40" y1="490" x2="1560" y2="490" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="40" y1="890" x2="1560" y2="890" stroke="#aaa" stroke-width="1.5" stroke-dasharray="8 5"/>
</svg>`;
}

function roofSvg() {
  const rafters = Array.from({length:8}, (_, i) => {
    const y = 150 + i * 90;
    return `<line x1="800" y1="${y}" x2="1520" y2="500" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>` +
           `<line x1="800" y1="${y}" x2="80" y2="500" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<rect width="1600" height="1000" fill="#f8f4ee"/>
<rect x="40" y="40" width="1520" height="920" fill="none" stroke="#333" stroke-width="4"/>
<text x="420" y="85" font-size="34" fill="#333" font-family="sans-serif" font-weight="bold">ROOF PLAN - HOUSE BUILDING PROJECT</text>
<polygon points="800,120 1560,500 800,880 40,500" fill="#e8d8c0" stroke="#7a5c2e" stroke-width="4"/>
<line x1="800" y1="120" x2="800" y2="880" stroke="#5c4324" stroke-width="3" stroke-dasharray="10 5"/>
${rafters}
<line x1="520" y1="120" x2="520" y2="880" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="1080" y1="120" x2="1080" y2="880" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<text x="560" y="960" font-size="18" fill="#555" font-family="sans-serif">Pitch: 30 deg  |  Material: Clay tiles  |  Overhang: 600mm</text>
</svg>`;
}

function electricalSvg() {
  const symbols = [
    {x:150,y:200,label:'DB1'},{x:400,y:200,label:'L1'},{x:650,y:200,label:'L2'},
    {x:900,y:200,label:'Fan'},{x:1150,y:200,label:'L3'},{x:1400,y:200,label:'AC1'},
    {x:150,y:500,label:'L4'},{x:400,y:500,label:'S1'},{x:650,y:500,label:'L5'},
    {x:900,y:500,label:'S2'},{x:1150,y:500,label:'DB2'},{x:1400,y:500,label:'L6'},
    {x:150,y:800,label:'AC2'},{x:400,y:800,label:'L7'},{x:650,y:800,label:'S3'},
    {x:900,y:800,label:'Fan2'},{x:1150,y:800,label:'L8'},{x:1400,y:800,label:'EXT'},
  ];
  const circles = symbols.map(s =>
    `<circle cx="${s.x}" cy="${s.y}" r="28" fill="#fef9c3" stroke="#ca8a04" stroke-width="3"/>` +
    `<text x="${s.x}" y="${s.y+6}" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">${s.label}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<rect width="1600" height="1000" fill="#fefce8"/>
<rect x="40" y="40" width="1520" height="920" fill="none" stroke="#ca8a04" stroke-width="4"/>
<text x="320" y="85" font-size="32" fill="#92400e" font-family="sans-serif" font-weight="bold">ELECTRICAL LAYOUT - HOUSE BUILDING PROJECT</text>
<line x1="150" y1="200" x2="1400" y2="200" stroke="#ca8a04" stroke-width="2"/>
<line x1="150" y1="500" x2="1400" y2="500" stroke="#ca8a04" stroke-width="2"/>
<line x1="150" y1="800" x2="1400" y2="800" stroke="#ca8a04" stroke-width="2"/>
${circles}
<text x="60" y="960" font-size="14" fill="#555" font-family="sans-serif">L=Light  S=Socket  DB=Distribution Board  AC=Air Conditioner</text>
</svg>`;
}

function plumbingSvg() {
  const fixtures = [
    {x:200,y:250,label:'WC1',color:'#60a5fa'},{x:500,y:250,label:'Basin1',color:'#60a5fa'},
    {x:900,y:250,label:'WC2',color:'#60a5fa'},{x:1200,y:250,label:'Shower',color:'#60a5fa'},
    {x:200,y:700,label:'Sink',color:'#34d399'},{x:500,y:700,label:'Drain',color:'#34d399'},
    {x:900,y:700,label:'Bath',color:'#34d399'},{x:1200,y:700,label:'Basin2',color:'#34d399'},
  ].map(f =>
    `<rect x="${f.x-40}" y="${f.y-25}" width="80" height="50" rx="6" fill="${f.color}" stroke="#1e40af" stroke-width="2"/>` +
    `<text x="${f.x}" y="${f.y+6}" font-size="13" fill="#1e3a8a" font-family="sans-serif" text-anchor="middle" font-weight="bold">${f.label}</text>`
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<rect width="1600" height="1000" fill="#f0f8ff"/>
<rect x="40" y="40" width="1520" height="920" fill="none" stroke="#1e40af" stroke-width="4"/>
<text x="300" y="85" font-size="32" fill="#1e40af" font-family="sans-serif" font-weight="bold">PLUMBING AND DRAINAGE - HOUSE BUILDING PROJECT</text>
<line x1="100" y1="500" x2="1500" y2="500" stroke="#3b82f6" stroke-width="5"/>
<line x1="800" y1="100" x2="800" y2="900" stroke="#3b82f6" stroke-width="5"/>
<line x1="100" y1="600" x2="1500" y2="600" stroke="#16a34a" stroke-width="4" stroke-dasharray="14 6"/>
<line x1="600" y1="100" x2="600" y2="900" stroke="#16a34a" stroke-width="4" stroke-dasharray="14 6"/>
${fixtures}
<text x="60" y="960" font-size="14" fill="#555" font-family="sans-serif">Blue = Water Supply  |  Dashed Green = Drainage</text>
</svg>`;
}

function finishingSvg() {
  return groundFloorSvg().replace('GROUND FLOOR PLAN', 'INTERIOR FINISHING PLAN');
}

// ── Main seed ──────────────────────────────────────────────────────────────────

async function createDrawingWithTasks(drawing, tasks) {
  // Upload drawing (auto-creates blank grid tasks)
  const drw = await uploadDrawing(
    drawing.svg,
    drawing.name,
    PID,
    drawing.milestoneId,
    drawing.gridCols,
    drawing.gridRows,
  );
  console.log(`  ✓ Drawing "${drawing.name}" => ${drw.id}`);

  // Get the auto-created tasks for this drawing so we can update them
  const existing = await fetch(`${BASE}/tasks?drawingId=${drw.id}`).then(r => r.json());
  // Build a map: gridCode -> taskId
  const taskMap = {};
  for (const t of existing) {
    taskMap[t.gridCode] = t.id;
  }

  // Update each task with real data
  for (const t of tasks) {
    const letter = String.fromCharCode(65 + t.col);
    const gridCode = `${letter}${t.row + 1}`;
    const taskId = taskMap[gridCode];
    if (!taskId) {
      console.warn(`    ⚠ No task found for ${gridCode} in drawing ${drw.id}`);
      continue;
    }
    const r = await fetch(`${BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: t.name,
        description: t.description,
        category: t.category,
        priority: t.priority,
        assignedTo: t.assignedTo,
        startDate: '2026-01-01',
        dueDate: t.dueDate,
        status: t.status,
        progress: t.progress,
        milestoneId: drawing.milestoneId,
      }),
    });
    const text = await r.text();
    if (!r.ok) console.warn(`    ⚠ Task update failed for ${gridCode}: ${text.slice(0, 100)}`);
    else process.stdout.write('.');
  }
  console.log(` (${tasks.length} tasks updated)`);
}

async function main() {
  console.log('Starting House Building Project seed...\n');

  // Drawing 1: Foundation Plan
  await createDrawingWithTasks(
    { name: 'Foundation Plan', milestoneId: MS.foundation, svg: foundationSvg(), gridCols: 3, gridRows: 2 },
    [
      { col:0, row:0, name:'Excavation - Grid A1', description:'Bulk excavation to founding level. Remove all loose material and debris.', category:'Civil', status:'Completed', priority:'Critical', assignedTo:'Rajesh Sharma', progress:100, dueDate:'2026-02-10' },
      { col:1, row:0, name:'PCC Laying - Grid B1', description:'Plain cement concrete M10 grade, 100mm thick over prepared sub-grade.', category:'Civil', status:'Completed', priority:'High', assignedTo:'Priya Nair', progress:100, dueDate:'2026-02-15' },
      { col:2, row:0, name:'Footing Reinforcement - C1', description:'Binding of footing cage with 16mm dia bars. Cover 50mm.', category:'Structural', status:'Completed', priority:'Critical', assignedTo:'Suresh Babu', progress:100, dueDate:'2026-02-20' },
      { col:0, row:1, name:'Foundation Concrete - A2', description:'RCC M25 grade concrete for isolated footing. Curing 14 days.', category:'Structural', status:'Completed', priority:'High', assignedTo:'Rajesh Sharma', progress:100, dueDate:'2026-03-01' },
      { col:1, row:1, name:'Plinth Beam - B2', description:'Formwork, reinforcement and concrete for plinth beam at junction.', category:'Structural', status:'Completed', priority:'High', assignedTo:'Priya Nair', progress:100, dueDate:'2026-03-15' },
      { col:2, row:1, name:'Anti-termite Treatment - C2', description:'Chemical barrier anti-termite treatment to all foundation earth below plinth.', category:'Civil', status:'Completed', priority:'Medium', assignedTo:'Karthik M', progress:100, dueDate:'2026-03-20' },
    ]
  );

  // Drawing 2: Ground Floor Plan
  await createDrawingWithTasks(
    { name: 'Ground Floor Plan', milestoneId: MS.structural, svg: groundFloorSvg(), gridCols: 4, gridRows: 2 },
    [
      { col:0, row:0, name:'Column C1 - A1', description:'Formwork, steel fix and pour RCC column 230x230mm. M25 concrete.', category:'Structural', status:'Completed', priority:'Critical', assignedTo:'Suresh Babu', progress:100, dueDate:'2026-04-10' },
      { col:1, row:0, name:'Column C2 - B1', description:'Column shuttering, 6 nos 12mm dia bars, RCC pour at B1.', category:'Structural', status:'Completed', priority:'Critical', assignedTo:'Rajesh Sharma', progress:100, dueDate:'2026-04-10' },
      { col:2, row:0, name:'Column C3 - C1', description:'Column at C1 - verify bar splices as per detail sheet S-04.', category:'Structural', status:'In Progress', priority:'High', assignedTo:'Priya Nair', progress:70, dueDate:'2026-05-10' },
      { col:3, row:0, name:'Brick Masonry - D1', description:'230mm thick brick masonry in CM 1:6 for external wall at D1 bay.', category:'Masonry', status:'In Progress', priority:'High', assignedTo:'Karthik M', progress:55, dueDate:'2026-05-20' },
      { col:0, row:1, name:'Roof Slab Formwork - A2', description:'Timber shuttering and props for 125mm thick roof slab.', category:'Structural', status:'Assigned', priority:'High', assignedTo:'Suresh Babu', progress:10, dueDate:'2026-06-15' },
      { col:1, row:1, name:'Roof Slab Reinforcement - B2', description:'BRC mesh and bar reinforcement as per slab detail. Top and bottom layers.', category:'Structural', status:'Assigned', priority:'High', assignedTo:'Rajesh Sharma', progress:0, dueDate:'2026-06-25' },
      { col:2, row:1, name:'Roof Slab Concrete - C2', description:'Ready mix M25 concrete pour for ground floor roof slab.', category:'Structural', status:'Assigned', priority:'Critical', assignedTo:'Priya Nair', progress:0, dueDate:'2026-07-05' },
      { col:3, row:1, name:'Staircase RCC - D2', description:'Dog-legged staircase slab and waist slab reinforcement and concrete.', category:'Structural', status:'Assigned', priority:'Medium', assignedTo:'Karthik M', progress:0, dueDate:'2026-07-20' },
    ]
  );

  // Drawing 3: Roof Plan
  await createDrawingWithTasks(
    { name: 'Roof Plan', milestoneId: MS.roofing, svg: roofSvg(), gridCols: 3, gridRows: 3 },
    [
      { col:0, row:0, name:'Roof Truss Supply - A1', description:'Fabrication and delivery of MS roof trusses as per structural drawing R-01.', category:'Structural', status:'Assigned', priority:'High', assignedTo:'Suresh Babu', progress:20, dueDate:'2026-08-10' },
      { col:1, row:0, name:'Truss Erection - B1', description:'Crane erection of roof trusses and ridge purlin installation.', category:'Structural', status:'Assigned', priority:'High', assignedTo:'Rajesh Sharma', progress:0, dueDate:'2026-08-25' },
      { col:2, row:0, name:'Purlin and Batten - C1', description:'75x50mm MS purlins and timber battens at 300mm c/c for tile fixing.', category:'Structural', status:'Assigned', priority:'Medium', assignedTo:'Priya Nair', progress:0, dueDate:'2026-09-05' },
      { col:0, row:1, name:'Waterproofing Membrane - A2', description:'APP modified bituminous waterproof membrane 3mm thick on roof slab.', category:'Waterproofing', status:'Assigned', priority:'Critical', assignedTo:'Karthik M', progress:0, dueDate:'2026-09-10' },
      { col:1, row:1, name:'Clay Tile Laying - B2', description:'Mangalore clay tiles fixed with CM 1:3 pointing on prepared battens.', category:'Finishing', status:'Assigned', priority:'Medium', assignedTo:'Suresh Babu', progress:0, dueDate:'2026-09-20' },
      { col:2, row:1, name:'Ridge Capping - C2', description:'Ridge tiles fixed with CM 1:3 and painted with white cement wash.', category:'Finishing', status:'Assigned', priority:'Low', assignedTo:'Rajesh Sharma', progress:0, dueDate:'2026-09-25' },
      { col:0, row:2, name:'Parapet Wall - A3', description:'225mm brick parapet wall 600mm height with coping on perimeter.', category:'Masonry', status:'Assigned', priority:'Medium', assignedTo:'Priya Nair', progress:0, dueDate:'2026-09-28' },
      { col:1, row:2, name:'Gutter and Downpipe - B3', description:'UPVC box gutter 150mm and 110mm downpipe installation at eaves.', category:'Plumbing', status:'Assigned', priority:'Medium', assignedTo:'Karthik M', progress:0, dueDate:'2026-09-30' },
      { col:2, row:2, name:'Roof Inspection - C3', description:'Final roof inspection for tile alignment, ridge seal and drainage fall.', category:'Safety', status:'Assigned', priority:'High', assignedTo:'Suresh Babu', progress:0, dueDate:'2026-10-02' },
    ]
  );

  // Drawing 4: Electrical Layout
  await createDrawingWithTasks(
    { name: 'Electrical Layout Plan', milestoneId: MS.mep, svg: electricalSvg(), gridCols: 6, gridRows: 3 },
    [
      { col:0, row:0, name:'Main DB Installation - A1', description:'Supply and fix 12-way MCB distribution board at main entry. 63A incomer.', category:'Electrical', status:'Assigned', priority:'Critical', assignedTo:'Arjun Electricals', progress:0, dueDate:'2026-10-05' },
      { col:1, row:0, name:'Living Room Wiring - B1', description:'2.5sqmm FRLS PVC conduit wiring for lights and fans in living room.', category:'Electrical', status:'Assigned', priority:'High', assignedTo:'Arjun Electricals', progress:0, dueDate:'2026-10-10' },
      { col:2, row:0, name:'Bedroom 1 Wiring - C1', description:'1.5sqmm light wiring and 2.5sqmm power circuit for Bedroom 1.', category:'Electrical', status:'Assigned', priority:'High', assignedTo:'Lakshmi Electricals', progress:0, dueDate:'2026-10-12' },
      { col:3, row:0, name:'Bedroom 2 Wiring - D1', description:'Electrical rough-in for Bedroom 2 including AC power point.', category:'Electrical', status:'Assigned', priority:'Medium', assignedTo:'Lakshmi Electricals', progress:0, dueDate:'2026-10-14' },
      { col:4, row:0, name:'Bedroom 3 Wiring - E1', description:'Wiring for Bedroom 3 - lights, fans and socket outlets.', category:'Electrical', status:'Assigned', priority:'Medium', assignedTo:'Arjun Electricals', progress:0, dueDate:'2026-10-16' },
      { col:5, row:0, name:'AC Power Points - F1', description:'2.5sqmm dedicated circuits for 3 air conditioner units with isolators.', category:'Electrical', status:'Assigned', priority:'High', assignedTo:'Lakshmi Electricals', progress:0, dueDate:'2026-10-18' },
      { col:0, row:1, name:'Kitchen Wiring - A2', description:'15A power points and exhaust fan wiring in kitchen area.', category:'Electrical', status:'Assigned', priority:'High', assignedTo:'Arjun Electricals', progress:0, dueDate:'2026-10-20' },
      { col:1, row:1, name:'Socket Outlets - B2', description:'16A and 6A socket outlets throughout all rooms - recessed type.', category:'Electrical', status:'Assigned', priority:'Medium', assignedTo:'Lakshmi Electricals', progress:0, dueDate:'2026-10-22' },
      { col:2, row:1, name:'Outdoor Lighting - C2', description:'External wall mounted LED fittings and garden lighting conduit run.', category:'Electrical', status:'Assigned', priority:'Low', assignedTo:'Arjun Electricals', progress:0, dueDate:'2026-10-25' },
      { col:3, row:1, name:'Earthing System - D2', description:'Plate earthing as per IS 3043 with copper earth conductor. Test pit.', category:'Electrical', status:'Assigned', priority:'Critical', assignedTo:'Lakshmi Electricals', progress:0, dueDate:'2026-10-28' },
    ]
  );

  // Drawing 5: Plumbing
  await createDrawingWithTasks(
    { name: 'Plumbing and Drainage Plan', milestoneId: MS.mep, svg: plumbingSvg(), gridCols: 4, gridRows: 3 },
    [
      { col:0, row:0, name:'Water Supply Rough-in - A1', description:'CPVC 25mm main supply line from overhead tank to all wet areas.', category:'Plumbing', status:'Assigned', priority:'High', assignedTo:'Vijay Plumbing', progress:0, dueDate:'2026-10-06' },
      { col:1, row:0, name:'WC Installation - B1', description:'Western closet fixing with flush valve, P-trap and concealed cistern.', category:'Plumbing', status:'Assigned', priority:'High', assignedTo:'Vijay Plumbing', progress:0, dueDate:'2026-10-10' },
      { col:2, row:0, name:'Basin and Mirror - C1', description:'Pedestal wash basin with chrome pillar tap and mirror cabinet.', category:'Plumbing', status:'Assigned', priority:'Medium', assignedTo:'Priya Nair', progress:0, dueDate:'2026-10-14' },
      { col:3, row:0, name:'Shower Unit - D1', description:'Rain shower unit with overhead and hand shower set, thermostatic valve.', category:'Plumbing', status:'Assigned', priority:'Medium', assignedTo:'Vijay Plumbing', progress:0, dueDate:'2026-10-16' },
      { col:0, row:1, name:'Kitchen Sink - A2', description:'Stainless steel double bowl sink with mixer tap and waste fitting.', category:'Plumbing', status:'Assigned', priority:'High', assignedTo:'Vijay Plumbing', progress:0, dueDate:'2026-10-18' },
      { col:1, row:1, name:'Drainage Rough-in - B2', description:'110mm uPVC soil pipe and 50mm waste pipe concealed in walls.', category:'Plumbing', status:'Assigned', priority:'Critical', assignedTo:'Vijay Plumbing', progress:0, dueDate:'2026-10-20' },
      { col:2, row:1, name:'Overhead Tank - C2', description:'1000L HDPE tank on terrace with ball valve, overflow and inlet pipe.', category:'Plumbing', status:'Assigned', priority:'High', assignedTo:'Karthik M', progress:0, dueDate:'2026-10-22' },
      { col:3, row:1, name:'Sump and Pump - D2', description:'15000L underground sump with submersible pump and auto-level switch.', category:'Civil', status:'Assigned', priority:'High', assignedTo:'Rajesh Sharma', progress:0, dueDate:'2026-10-25' },
      { col:0, row:2, name:'Geyser Points - A3', description:'25mm CPVC hot water lines from geyser to all bathrooms.', category:'Plumbing', status:'Assigned', priority:'Medium', assignedTo:'Vijay Plumbing', progress:0, dueDate:'2026-10-28' },
      { col:1, row:2, name:'Drainage Testing - B3', description:'Hydraulic pressure test on all supply lines. Flush test on drain pipes.', category:'Safety', status:'Assigned', priority:'High', assignedTo:'Priya Nair', progress:0, dueDate:'2026-10-30' },
    ]
  );

  // Drawing 6: Interior Finishing Plan
  await createDrawingWithTasks(
    { name: 'Interior Finishing Plan', milestoneId: MS.finishing, svg: finishingSvg(), gridCols: 4, gridRows: 3 },
    [
      { col:0, row:0, name:'Internal Plastering - A1', description:'12mm thick CM 1:4 internal plaster on all walls and soffits.', category:'Finishing', status:'Assigned', priority:'High', assignedTo:'Suresh Babu', progress:0, dueDate:'2026-11-05' },
      { col:1, row:0, name:'Ceramic Tile Flooring - B1', description:'600x600mm Kajaria vitrified tiles on living room floor with CM 1:3 bed.', category:'Finishing', status:'Assigned', priority:'High', assignedTo:'Karthik M', progress:0, dueDate:'2026-11-10' },
      { col:2, row:0, name:'Bathroom Tiles - C1', description:'300x450mm glazed wall tiles up to 7ft height in all toilets.', category:'Finishing', status:'Assigned', priority:'Medium', assignedTo:'Karthik M', progress:0, dueDate:'2026-11-15' },
      { col:3, row:0, name:'Primer and Putty - D1', description:'Asian putty 2 coats on all plastered surfaces prior to painting.', category:'Finishing', status:'Assigned', priority:'Medium', assignedTo:'Priya Nair', progress:0, dueDate:'2026-11-18' },
      { col:0, row:1, name:'Interior Paint - A2', description:'Asian Paints Royale 2 coats interior emulsion in all bedrooms.', category:'Finishing', status:'Assigned', priority:'High', assignedTo:'Priya Nair', progress:0, dueDate:'2026-11-25' },
      { col:1, row:1, name:'Kitchen Tiles - B2', description:'Dado tiles 600mm height in kitchen, anti-skid floor tiles.', category:'Finishing', status:'Assigned', priority:'Medium', assignedTo:'Karthik M', progress:0, dueDate:'2026-11-28' },
      { col:2, row:1, name:'Door Installation - C2', description:'Solid teak wood main door and HDF flush doors for all rooms.', category:'Finishing', status:'Assigned', priority:'High', assignedTo:'Suresh Babu', progress:0, dueDate:'2026-12-02' },
      { col:3, row:1, name:'Window Installation - D2', description:'UPVC sliding windows with 4mm clear glass and fly mesh.', category:'Finishing', status:'Assigned', priority:'High', assignedTo:'Suresh Babu', progress:0, dueDate:'2026-12-05' },
      { col:0, row:2, name:'Grille and Railing - A3', description:'MS staircase railing with 12mm bars at 100mm spacing, powder coated.', category:'Finishing', status:'Assigned', priority:'Medium', assignedTo:'Rajesh Sharma', progress:0, dueDate:'2026-12-08' },
      { col:1, row:2, name:'Exterior Paint - B3', description:'Apex weatherproof exterior emulsion on all external surfaces - 2 coats.', category:'Finishing', status:'Assigned', priority:'High', assignedTo:'Priya Nair', progress:0, dueDate:'2026-12-10' },
      { col:2, row:2, name:'Final Cleaning - C3', description:'Post-construction deep clean, waste disposal and site handover prep.', category:'Safety', status:'Assigned', priority:'Medium', assignedTo:'Karthik M', progress:0, dueDate:'2026-12-13' },
      { col:3, row:2, name:'Snag List Rectification - D3', description:'Walkthrough with client, snag list preparation and full rectification.', category:'Safety', status:'Assigned', priority:'Critical', assignedTo:'Rajesh Sharma', progress:0, dueDate:'2026-12-15' },
    ]
  );

  console.log('\n\u2705 House Building Project seeded successfully!');
  console.log(`\nOpen the app: https://buildtrack-withdrawing.onslate.in/projects`);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
