/**
 * seed_9bhk.mjs
 * Run with: node backend/seed_9bhk.mjs
 * Seeds the 9 BHK House Building Project into the live Catalyst backend via REST API.
 * Reads SVG files from backend/assets/9bhk-drawings/
 * Uploads 6 drawings (gridCols=7, gridRows=4) with 28 tasks each.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const DRAWINGS_DIR = join(__dirname, 'assets', '9bhk-drawings');

// ── Helpers ────────────────────────────────────────────────────────────────────

async function postJSON(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`POST ${path} non-JSON: ${text.slice(0,200)}`); }
  if (!data.id) throw new Error(`POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function uploadDrawing(svgContent, name, projectId, milestoneId, gridCols, gridRows) {
  const fd = new FormData();
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  fd.set('file', blob, `${name.replace(/\s+/g,'_')}.svg`);
  fd.set('projectId', projectId);
  fd.set('name', name);
  fd.set('gridCols', String(gridCols));
  fd.set('gridRows', String(gridRows));
  const r = await fetch(`${BASE}/drawings/upload`, { method: 'POST', body: fd });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Upload non-JSON: ${text.slice(0,300)}`); }
  if (!data.id) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  if (milestoneId) {
    await fetch(`${BASE}/drawings/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId }),
    });
  }
  return data;
}

async function createDrawingWithTasks(drawing, tasks, projectId) {
  const drw = await uploadDrawing(
    drawing.svg, drawing.name, projectId, drawing.milestoneId, 7, 4
  );
  console.log(`  ✓ Drawing "${drawing.name}" => ${drw.id}`);

  const existing = await fetch(`${BASE}/tasks?drawingId=${drw.id}`).then(r => r.json());
  const taskMap = {};
  for (const t of existing) taskMap[t.gridCode] = t.id;

  for (const t of tasks) {
    const letter = String.fromCharCode(65 + t.col);
    const gridCode = `${letter}${t.row + 1}`;
    const taskId = taskMap[gridCode];
    if (!taskId) { console.warn(`    ⚠ No task for ${gridCode}`); continue; }
    const r = await fetch(`${BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: t.name, description: t.description, category: t.category,
        priority: t.priority, assignedTo: t.assignedTo,
        startDate: t.startDate || '2026-01-15', dueDate: t.dueDate,
        status: t.status, progress: t.progress, milestoneId: drawing.milestoneId,
      }),
    });
    if (!r.ok) console.warn(`    ⚠ Task update failed ${gridCode}: ${(await r.text()).slice(0,100)}`);
    else process.stdout.write('.');
  }
  console.log(` (${tasks.length} tasks)`);
  return drw;
}

// ── Task definitions ───────────────────────────────────────────────────────────

function gfTasks(msId) {
  return [
    // Row 1 — Bedrooms A1-G1
    { col:0,row:0,name:'Bed 1 Brick Masonry',description:'230mm external + 115mm internal walls for Bedroom 1. CM 1:6 mortar. Openings for D1 & W1.',category:'Masonry',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-02-01',dueDate:'2026-02-28',status:'Completed',progress:100 },
    { col:1,row:0,name:'Bed 2 Masonry & Column C-B1',description:'Brick masonry for Bed 2 bay. RCC column 350×350mm at grid B1, M25, 6-20mm bars.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-02-01',dueDate:'2026-03-05',status:'Completed',progress:100 },
    { col:2,row:0,name:'Bed 3 Masonry & Ensuite',description:'Bed 3 walls, ensuite partition 115mm wall, WC rough-in cutouts, W3 lintel.',category:'Masonry',priority:'High',assignedTo:'Priya Nair',startDate:'2026-02-10',dueDate:'2026-03-10',status:'Completed',progress:100 },
    { col:3,row:0,name:'Bed 4 Masonry & Column C-D1',description:'Bed 4 external walls, RCC column at D1, door frame D4 fixed, sill for W4.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-02-10',dueDate:'2026-03-12',status:'Completed',progress:100 },
    { col:4,row:0,name:'Bed 5 Walls & Window Lintels',description:'115mm partition for Bed 5 WIR, lintels over W5 & W6 windows, 230mm outer wall.',category:'Masonry',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-02-15',dueDate:'2026-03-15',status:'In Progress',progress:75 },
    { col:5,row:0,name:'Bed 6 Masonry & Column C-F1',description:'Bed 6 bay masonry, column C-F1 350×350mm poured, door frame D6 installation.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-02-15',dueDate:'2026-03-20',status:'In Progress',progress:60 },
    { col:6,row:0,name:'Row 1 East Wall & Col C-G1',description:'East perimeter wall 230mm, column C-G1 reinforced, parapet starter bars at top.',category:'Structural',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-02-20',dueDate:'2026-03-25',status:'In Progress',progress:40 },
    // Row 2 — Living/Dining/Kitchen/Stair A2-G2
    { col:0,row:1,name:'Living Room Slab Shuttering',description:'Timber formwork and props for 125mm ground floor slab over living room A2 bay.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-03-01',dueDate:'2026-03-20',status:'In Progress',progress:50 },
    { col:1,row:1,name:'Dining Room Walls & Main Door',description:'Dining room partition 115mm, main entrance door frame MD fixed in 230mm wall.',category:'Masonry',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-03-05',dueDate:'2026-03-25',status:'Assigned',progress:15 },
    { col:2,row:1,name:'Kitchen Walls & Duct Opening',description:'Kitchen 230mm outer wall, exhaust duct sleeve 200mm, DK door lintel MS flat.',category:'Masonry',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-03-10',dueDate:'2026-03-30',status:'Assigned',progress:10 },
    { col:3,row:1,name:'Staircase Slab & Waist Slab',description:'Dog-leg staircase: 150mm waist slab, 16R @ 175mm rise, reinforcement per S-09.',category:'Structural',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-03-15',dueDate:'2026-04-10',status:'Assigned',progress:5 },
    { col:4,row:1,name:'Ground Floor Slab Reinforcement',description:'BRC mesh + 12mm dia bars top & bottom for 125mm slab, Row 2 span. 75mm cover.',category:'Structural',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-03-20',dueDate:'2026-04-15',status:'Assigned',progress:0 },
    { col:5,row:1,name:'Ground Floor Slab Concrete Pour',description:'Ready-mix M25 concrete pump pour for Row 1+2 slab. Curing compound applied.',category:'Structural',priority:'Critical',assignedTo:'Suresh Babu',startDate:'2026-04-16',dueDate:'2026-04-18',status:'Assigned',progress:0 },
    { col:6,row:1,name:'Slab Curing & Column Starters',description:'21-day water curing on slab. Starter bars bent for first-floor columns C-G2.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-04-19',dueDate:'2026-05-10',status:'Assigned',progress:0 },
    // Row 3 — Beds 7-9/Bath/Utility/Garage A3-G3
    { col:0,row:2,name:'Bed 7 Masonry & Ensuite',description:'Bed 7 walls, ensuite WC & shower rough-in, 115mm partition, window W8.',category:'Masonry',priority:'High',assignedTo:'Priya Nair',startDate:'2026-04-01',dueDate:'2026-04-25',status:'Assigned',progress:0 },
    { col:1,row:2,name:'Bed 8 Walls & Wardrobe Niche',description:'Bed 8 partition, wardrobe niche 600mm deep framed, lintel over D8.',category:'Masonry',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-04-05',dueDate:'2026-04-28',status:'Assigned',progress:0 },
    { col:2,row:2,name:'Bed 9 Masonry & Column C-C3',description:'Bed 9 walls 230mm ext, column C-C3 pour, balcony starter slab edge beam.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-04-10',dueDate:'2026-05-02',status:'Assigned',progress:0 },
    { col:3,row:2,name:'Common Bathrooms Walls',description:'Two common bathrooms, 115mm partition between, 200mm floor drain falls.',category:'Masonry',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-04-10',dueDate:'2026-05-05',status:'Assigned',progress:0 },
    { col:4,row:2,name:'Utility & Washing Area',description:'Utility room walls, washing machine plinth 150mm RCC, exhaust fan opening.',category:'Civil',priority:'Low',assignedTo:'Priya Nair',startDate:'2026-04-15',dueDate:'2026-05-08',status:'Assigned',progress:0 },
    { col:5,row:2,name:'Garage RCC Floor Slab',description:'150mm M25 RCC slab for garage, anti-skid finish, 1:50 drainage fall to drain.',category:'Civil',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-04-15',dueDate:'2026-05-10',status:'Assigned',progress:0 },
    { col:6,row:2,name:'Garage Rolling Shutter Frame',description:'MS shutter frame 3000×2400mm fabricated, grouted into 230mm jambs, painted.',category:'Finishing',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-05-01',dueDate:'2026-05-20',status:'Assigned',progress:0 },
    // Row 4 — South boundary wall, compound, drive A4-G4
    { col:0,row:3,name:'South Perimeter Wall - West',description:'225mm boundary wall 1800mm height, coping on top, PCC footing 450×250mm.',category:'Civil',priority:'Low',assignedTo:'Rajesh Sharma',startDate:'2026-05-15',dueDate:'2026-06-10',status:'Assigned',progress:0 },
    { col:1,row:3,name:'Main Entrance Gate Pillars',description:'RCC gate pillars 450×450mm with 4-16mm bars, main gate foundation, 2.4m ht.',category:'Civil',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-05-20',dueDate:'2026-06-15',status:'Assigned',progress:0 },
    { col:2,row:3,name:'Driveway Paving',description:'150mm compacted WBM base, 60mm paver block on 30mm sand bed. Kerb stones.',category:'Civil',priority:'Low',assignedTo:'Karthik M',startDate:'2026-06-01',dueDate:'2026-06-25',status:'Assigned',progress:0 },
    { col:3,row:3,name:'External Drain & Manhole',description:'300mm RCC drain channel, precast manhole 900mm dia, connection to municipal.',category:'Civil',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-06-05',dueDate:'2026-06-28',status:'Assigned',progress:0 },
    { col:4,row:3,name:'Compound Landscaping',description:'Top soil 150mm, lawn turf, garden bed edging, 6 sapling pits 600mm dia.',category:'Finishing',priority:'Low',assignedTo:'Rajesh Sharma',startDate:'2026-07-01',dueDate:'2026-07-20',status:'Assigned',progress:0 },
    { col:5,row:3,name:'External Painting & Texture',description:'Texture finish on compound wall, 2 coats Apex Damp-proof exterior on plinth.',category:'Finishing',priority:'Low',assignedTo:'Priya Nair',startDate:'2026-07-15',dueDate:'2026-08-05',status:'Assigned',progress:0 },
    { col:6,row:3,name:'Site Handover & Final Survey',description:'Final AS-BUILT survey, handover documentation, BBMP completion certificate.',category:'Safety',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-08-10',dueDate:'2026-08-31',status:'Assigned',progress:0 },
  ];
}

function fndTasks(msId) {
  return [
    { col:0,row:0,name:'Excavation Block A1',description:'Bulk excavation 1800mm BGL at A1 for isolated pad footing F1A. Remove loose soil.',category:'Civil',priority:'Critical',assignedTo:'Rajesh Sharma',startDate:'2026-01-15',dueDate:'2026-01-25',status:'Completed',progress:100 },
    { col:1,row:0,name:'PCC M10 at B1',description:'100mm M10 plain cement concrete levelling course at B1 column location.',category:'Civil',priority:'High',assignedTo:'Priya Nair',startDate:'2026-01-20',dueDate:'2026-01-28',status:'Completed',progress:100 },
    { col:2,row:0,name:'Footing F3 Rebar at C1',description:'16mm dia bars 2-way, 200mm c/c for isolated footing at C1. 50mm cover blocks.',category:'Structural',priority:'Critical',assignedTo:'Suresh Babu',startDate:'2026-01-25',dueDate:'2026-02-02',status:'Completed',progress:100 },
    { col:3,row:0,name:'Footing Concrete D1-E1',description:'M25 RCC pour for pad footings D1 and E1. Vibrator compaction. Curing 14 days.',category:'Structural',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-01-28',dueDate:'2026-02-10',status:'Completed',progress:100 },
    { col:4,row:0,name:'Grade Beam F1 Row 1 East',description:'300×450mm grade beam between F1-G1 footings. Rebar per structural sheet F-04.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-02-05',dueDate:'2026-02-18',status:'Completed',progress:100 },
    { col:5,row:0,name:'Anti-termite Spray F1-G1',description:'Chemical anti-termite treatment to all excavated earth at F1-G1 zone.',category:'Civil',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-02-08',dueDate:'2026-02-12',status:'Completed',progress:100 },
    { col:6,row:0,name:'Footing G1 Pour & Backfill',description:'M25 pour for corner footing G1. Compact backfill in 150mm layers. Survey level.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-02-10',dueDate:'2026-02-20',status:'Completed',progress:100 },
    { col:0,row:1,name:'Plinth Beam A2 West Side',description:'Plinth beam 230×300mm at A2 between A1 and A3 pads. M25, 4-12mm bars.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-02-15',dueDate:'2026-02-28',status:'Completed',progress:100 },
    { col:1,row:1,name:'Footing B2 & Sump Excavation',description:'B2 footing + UG sump 10000L excavation 3000×2500×2000mm. PCC bed 100mm.',category:'Civil',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-02-18',dueDate:'2026-03-05',status:'Completed',progress:100 },
    { col:2,row:1,name:'UG Sump RCC Construction',description:'250mm M25 RCC walls and slab for underground sump. Waterproofing coating 2K.',category:'Civil',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-03-01',dueDate:'2026-03-15',status:'Completed',progress:100 },
    { col:3,row:1,name:'Centre Column Row 2 Footings',description:'D2 and E2 isolated footings, column starters 350×350 cast. M25 concrete.',category:'Structural',priority:'Critical',assignedTo:'Suresh Babu',startDate:'2026-02-20',dueDate:'2026-03-05',status:'Completed',progress:100 },
    { col:4,row:1,name:'Grade Beam Row 2 Mid-span',description:'Grade beam E2-F2, 300×450mm. Expansion joint 12mm @ centre as per drawing.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-03-01',dueDate:'2026-03-12',status:'Completed',progress:100 },
    { col:5,row:1,name:'Septic Tank Excavation & PCC',description:'Septic tank 3-chamber excavation near F2. PCC M10 bed. Brick masonry walls.',category:'Civil',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-03-05',dueDate:'2026-03-20',status:'Completed',progress:100 },
    { col:6,row:1,name:'Footing G2 Corner & Backfill',description:'G2 isolated pad footing poured. Backfill with approved material. Anti-rodent.',category:'Structural',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-03-05',dueDate:'2026-03-18',status:'Completed',progress:100 },
    { col:0,row:2,name:'Plinth Beam Row 3 West',description:'A3 plinth beam 230×300mm, connects A3 footing to external drain. Survey check.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-03-10',dueDate:'2026-03-22',status:'Completed',progress:100 },
    { col:1,row:2,name:'Footing B3 & Garage Pit',description:'B3 footing pour. Garage inspection pit 900×500×600mm formwork and concrete.',category:'Civil',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-03-12',dueDate:'2026-03-25',status:'Completed',progress:100 },
    { col:2,row:2,name:'Foundation Plinth Level Check',description:'Total station survey of all column starters. Permissible deviation ±3mm.',category:'Civil',priority:'Critical',assignedTo:'Rajesh Sharma',startDate:'2026-03-20',dueDate:'2026-03-22',status:'Completed',progress:100 },
    { col:3,row:2,name:'Plinth Protection & Damp Proof',description:'75mm PCC plinth protection 750mm wide around perimeter. DPC 20mm CM 1:2.',category:'Civil',priority:'High',assignedTo:'Priya Nair',startDate:'2026-03-22',dueDate:'2026-04-02',status:'Completed',progress:100 },
    { col:4,row:2,name:'E3 Footing & Drain Connection',description:'E3 isolated footing, external storm drain pipe 110mm uPVC connected to sump.',category:'Civil',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-03-18',dueDate:'2026-03-30',status:'Completed',progress:100 },
    { col:5,row:2,name:'F3 Footing & Anti-termite',description:'F3 footing poured M25. Full anti-termite treatment zone F-G row 3. Document.',category:'Civil',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-03-18',dueDate:'2026-03-30',status:'Completed',progress:100 },
    { col:6,row:2,name:'G3 Corner Footing & Rebar Check',description:'G3 corner pad footing. Third-party inspection of rebar before concrete pour.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-03-20',dueDate:'2026-04-01',status:'Completed',progress:100 },
    { col:0,row:3,name:'Row 4 Boundary Wall Footing A4',description:'Strip footing 450×250mm M15 for boundary wall along south face at A4.',category:'Civil',priority:'Low',assignedTo:'Priya Nair',startDate:'2026-04-05',dueDate:'2026-04-15',status:'Completed',progress:100 },
    { col:1,row:3,name:'Gate Pillar Footing B4',description:'Isolated 600×600mm footing for main gate pillar. 6-16mm bars. M25.',category:'Civil',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-04-05',dueDate:'2026-04-15',status:'Completed',progress:100 },
    { col:2,row:3,name:'Foundation Completion Certificate',description:'Soil test report, foundation completion certificate, approved by structural engineer.',category:'Safety',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-04-16',dueDate:'2026-04-20',status:'Completed',progress:100 },
    { col:3,row:3,name:'Backfill & Compaction D4',description:'Approved granular fill, 150mm layers, plate compactor. CBR tested at D4.',category:'Civil',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-04-10',dueDate:'2026-04-22',status:'Completed',progress:100 },
    { col:4,row:3,name:'Plinth Filling E4 Zone',description:'Red soil + 20% stone dust plinth fill, compacted, sand blinding 50mm on top.',category:'Civil',priority:'High',assignedTo:'Priya Nair',startDate:'2026-04-12',dueDate:'2026-04-25',status:'Completed',progress:100 },
    { col:5,row:3,name:'F4 External Drain Outfall',description:'Storm drain from sump overflows to municipal drain at F4 boundary. 150mm pipe.',category:'Civil',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-04-15',dueDate:'2026-04-28',status:'Completed',progress:100 },
    { col:6,row:3,name:'Foundation Stage Photographs',description:'As-built photographs of all footings, grade beams. Archive in project folder.',category:'Safety',priority:'Low',assignedTo:'Karthik M',startDate:'2026-04-28',dueDate:'2026-04-30',status:'Completed',progress:100 },
  ];
}

function ffTasks(msId) {
  return [
    { col:0,row:0,name:'FF Col A1 & Bed 1 Walls',description:'First floor column C-A1 350×350mm M25. Bed 1 external wall 230mm brick.',category:'Structural',priority:'Critical',assignedTo:'Suresh Babu',startDate:'2026-05-15',dueDate:'2026-06-05',status:'Assigned',progress:0 },
    { col:1,row:0,name:'FF Bed 2 Masonry & WIR',description:'Bed 2 first floor, WIR partition 115mm, ensuite door lintel, W-F2 sill.',category:'Masonry',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-05-18',dueDate:'2026-06-08',status:'Assigned',progress:0 },
    { col:2,row:0,name:'FF Bed 3 & Common Bath',description:'Bed 3 walls, common bathroom 115mm dividing wall, 200mm floor fall.',category:'Masonry',priority:'High',assignedTo:'Priya Nair',startDate:'2026-05-20',dueDate:'2026-06-10',status:'Assigned',progress:0 },
    { col:3,row:0,name:'FF Bed 4 & Column C-D1',description:'Col C-D1 first floor pour, Bed 4 walls, door D-F4 frame installation.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-05-20',dueDate:'2026-06-12',status:'Assigned',progress:0 },
    { col:4,row:0,name:'FF Bed 5 & Balcony Parapet',description:'Bed 5 walls, balcony parapet 230×900mm, balcony slab edge tie beam.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-05-25',dueDate:'2026-06-15',status:'Assigned',progress:0 },
    { col:5,row:0,name:'FF Bed 6 & Column C-F1',description:'Col C-F1 first floor, Bed 6 masonry, W-F6 lintel 230mm cast iron lug.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-05-25',dueDate:'2026-06-18',status:'Assigned',progress:0 },
    { col:6,row:0,name:'FF East Perimeter Wall & Col G1',description:'East 230mm perimeter wall, col C-G1 pour, balcony slab formwork east edge.',category:'Structural',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-06-01',dueDate:'2026-06-22',status:'Assigned',progress:0 },
    { col:0,row:1,name:'First Floor Lounge Slab Soffit',description:'Shuttering for lounge slab, 125mm, span A2-C2. Props at 1200mm c/c.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-06-05',dueDate:'2026-06-20',status:'Assigned',progress:0 },
    { col:1,row:1,name:'Study Room Walls',description:'Study room 115mm partition, door D-FS2, window W-F8 sill at 900mm AFF.',category:'Masonry',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-06-08',dueDate:'2026-06-25',status:'Assigned',progress:0 },
    { col:2,row:1,name:'Family Room & Beam B2-C2',description:'Family room 230mm wall, 230×450mm beam at gridline C2, 4-16mm bars top.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-06-10',dueDate:'2026-06-28',status:'Assigned',progress:0 },
    { col:3,row:1,name:'First Floor Staircase Head',description:'Staircase head room slab 150mm, up to FF level +3300mm. DN stair 14R.',category:'Structural',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-06-15',dueDate:'2026-07-05',status:'Assigned',progress:0 },
    { col:4,row:1,name:'Open Terrace Parapet F2-G2',description:'Terrace parapet wall 230×900mm height, coping 75mm thick. Waterproofing.',category:'Masonry',priority:'High',assignedTo:'Karthik M',startDate:'2026-06-20',dueDate:'2026-07-10',status:'Assigned',progress:0 },
    { col:5,row:1,name:'FF Slab Reinforcement Row 2',description:'Top & bottom 12mm rebar for Row 2 FF slab. BRC mesh at slab-beam junction.',category:'Structural',priority:'Critical',assignedTo:'Suresh Babu',startDate:'2026-07-01',dueDate:'2026-07-15',status:'Assigned',progress:0 },
    { col:6,row:1,name:'FF Row 2 Slab Concrete',description:'M25 pump pour for Row 1+2 FF slab. Compaction, level check, curing sheet.',category:'Structural',priority:'Critical',assignedTo:'Rajesh Sharma',startDate:'2026-07-16',dueDate:'2026-07-18',status:'Assigned',progress:0 },
    { col:0,row:2,name:'FF Bed 7 Masonry & Ensuite',description:'Bed 7 walls 230mm ext+115mm int, ensuite plumbing rough-in, W-F9 lintel.',category:'Masonry',priority:'High',assignedTo:'Priya Nair',startDate:'2026-07-01',dueDate:'2026-07-22',status:'Assigned',progress:0 },
    { col:1,row:2,name:'FF Bed 8 Partition & WIR',description:'Bed 8 walls, wardrobe niche framed, door D-F8 lintel, W-F10 sill.',category:'Masonry',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-07-05',dueDate:'2026-07-25',status:'Assigned',progress:0 },
    { col:2,row:2,name:'FF Bed 9 Walls & Column C-C3',description:'Col C-C3 first floor, Bed 9 walls, balcony door D-FB9 frame set.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-07-05',dueDate:'2026-07-28',status:'Assigned',progress:0 },
    { col:3,row:2,name:'Common Bath D3 & E3 Walls',description:'Common bath partition, 115mm walls, door D-FC frame, waterproofing base.',category:'Masonry',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-07-10',dueDate:'2026-07-30',status:'Assigned',progress:0 },
    { col:4,row:2,name:'FF Linen & Utility Room',description:'Linen room shelving niches, utility room floor drain, washing machine plinth.',category:'Civil',priority:'Low',assignedTo:'Priya Nair',startDate:'2026-07-12',dueDate:'2026-08-02',status:'Assigned',progress:0 },
    { col:5,row:2,name:'FF Row 3 Slab Formwork',description:'Shuttering for Row 3 slab, cantilevered balcony 1200mm overhang formwork.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-07-20',dueDate:'2026-08-05',status:'Assigned',progress:0 },
    { col:6,row:2,name:'FF East Balcony Slab & Rails',description:'Balcony slab 125mm M25, GI balustrade post anchor bolts cast, 19mm glass.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-08-01',dueDate:'2026-08-18',status:'Assigned',progress:0 },
    { col:0,row:3,name:'FF South Parapet & Coping',description:'South parapet 230×600mm with weathered coping tile. CC 1:3 pointing.',category:'Masonry',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-08-10',dueDate:'2026-08-28',status:'Assigned',progress:0 },
    { col:1,row:3,name:'FF Lift Shaft Provision',description:'Lift shaft opening 1500×1800mm framed in RCC. Guide rail anchor plates.',category:'Structural',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-08-12',dueDate:'2026-08-30',status:'Assigned',progress:0 },
    { col:2,row:3,name:'FF Roof Slab Formwork Row 4',description:'Shuttering for terrace-level slab at Row 4 corridor. 125mm slab props.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-08-20',dueDate:'2026-09-05',status:'Assigned',progress:0 },
    { col:3,row:3,name:'FF Roof Slab Rebar D4',description:'Top+bottom 12mm bars for roof slab at D4. Shear links 8mm dia, 150mm c/c.',category:'Structural',priority:'Critical',assignedTo:'Suresh Babu',startDate:'2026-09-01',dueDate:'2026-09-12',status:'Assigned',progress:0 },
    { col:4,row:3,name:'FF Roof Slab Concrete Pour',description:'M25 pump pour for full terrace slab. Screeding to 1:80 fall for drainage.',category:'Structural',priority:'Critical',assignedTo:'Rajesh Sharma',startDate:'2026-09-13',dueDate:'2026-09-15',status:'Assigned',progress:0 },
    { col:5,row:3,name:'FF Terrace Waterproofing',description:'2-coat APP bituminous membrane on terrace slab, turned up 300mm at parapet.',category:'Waterproofing',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-09-20',dueDate:'2026-10-02',status:'Assigned',progress:0 },
    { col:6,row:3,name:'FF Structural Completion Check',description:'Structural engineer sign-off on first floor. Deflection + crack survey.',category:'Safety',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-10-05',dueDate:'2026-10-08',status:'Assigned',progress:0 },
  ];
}

function roofTasks(msId) {
  return [
    { col:0,row:0,name:'Roof Truss Fabrication A1',description:'MS roof truss Span A1-D1 fabricated 12m span, 30° pitch, per R-01 drawing.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-09-01',dueDate:'2026-09-20',status:'Assigned',progress:0 },
    { col:1,row:0,name:'Truss Erection B1',description:'Crane erection of hip trusses Row 1 west span. Ridge purlin 100×50 MS.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-09-21',dueDate:'2026-10-02',status:'Assigned',progress:0 },
    { col:2,row:0,name:'Purlin Fixing C1',description:'75×50mm MS purlins at 600mm c/c over trusses A1-D1. Welded + painted.',category:'Structural',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-10-03',dueDate:'2026-10-12',status:'Assigned',progress:0 },
    { col:3,row:0,name:'Hip Rafter D1',description:'Hip rafters 100×50mm MS at 45°. Valley flashing 450mm aluminium strip.',category:'Structural',priority:'High',assignedTo:'Karthik M',startDate:'2026-10-03',dueDate:'2026-10-14',status:'Assigned',progress:0 },
    { col:4,row:0,name:'Gable Roof Truss E1',description:'Gable end truss at E1-G1, 8m span. Verge board 150×25mm teak fixed.',category:'Structural',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-09-15',dueDate:'2026-10-05',status:'Assigned',progress:0 },
    { col:5,row:0,name:'Roof Batten F1',description:'Timber battens 50×25mm at 280mm c/c for clay tile fixing. Row 1 east.',category:'Finishing',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-10-10',dueDate:'2026-10-20',status:'Assigned',progress:0 },
    { col:6,row:0,name:'Ridge Cap & Pointing G1',description:'Clay ridge cap tiles set in CM 1:3. White cement pointing. RL +8200mm.',category:'Finishing',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-10-20',dueDate:'2026-10-28',status:'Assigned',progress:0 },
    { col:0,row:1,name:'Flat Slab Waterproofing A2',description:'APP 3mm membrane on flat RCC slab A2. Torch-applied. 2-layer system.',category:'Waterproofing',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-09-20',dueDate:'2026-09-30',status:'Assigned',progress:0 },
    { col:1,row:1,name:'RWP Installation B2 North',description:'RWP-1 & RWP-2: 110mm uPVC downpipes, gutter 150mm PVC, brackets 600mm.',category:'Plumbing',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-10-15',dueDate:'2026-10-25',status:'Assigned',progress:0 },
    { col:2,row:1,name:'Clay Tile Laying Row 1 West',description:'Mangalore clay tiles 420×260mm, 75mm overlap, CM 1:3 bedding on battens.',category:'Finishing',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-10-21',dueDate:'2026-11-05',status:'Assigned',progress:0 },
    { col:3,row:1,name:'Open Terrace Screed & Drain',description:'Terrace screed 40mm avg to 1:80 fall. Floor drain 110mm uPVC. Puddle flange.',category:'Civil',priority:'High',assignedTo:'Priya Nair',startDate:'2026-09-25',dueDate:'2026-10-05',status:'Assigned',progress:0 },
    { col:4,row:1,name:'Solar PV Panel Base E2',description:'6 no. solar PV panel mounting frames, 50mm ISMC channel, anchor bolts M12.',category:'MEP',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-10-01',dueDate:'2026-10-15',status:'Assigned',progress:0 },
    { col:5,row:1,name:'OHWT Sintex Platform F2',description:'5000L OHWT platform: 2400mm ht RCC columns, 150mm slab 2.0×2.0m plan.',category:'Civil',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-09-15',dueDate:'2026-10-05',status:'Assigned',progress:0 },
    { col:6,row:1,name:'Stair Headroom Slab G2',description:'Stair headroom cover slab at +8200mm. 125mm M25, 300mm parapet around.',category:'Structural',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-10-05',dueDate:'2026-10-18',status:'Assigned',progress:0 },
    { col:0,row:2,name:'Hip Roof Row 3 West A3',description:'Hip roof trusses A3-D3 span 12m, RL+7100mm. Erect and brace, 4 trusses.',category:'Structural',priority:'High',assignedTo:'Priya Nair',startDate:'2026-10-05',dueDate:'2026-10-22',status:'Assigned',progress:0 },
    { col:1,row:2,name:'Row 3 Purlin & Batten B3',description:'MS purlins 75×50mm + timber battens 50×25mm over Row 3 hip roof.',category:'Structural',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-10-22',dueDate:'2026-11-01',status:'Assigned',progress:0 },
    { col:2,row:2,name:'Row 3 Clay Tile Laying C3',description:'Mangalore tiles, Row 3 west hip roof. Ridge cap, valley tiles, eave course.',category:'Finishing',priority:'High',assignedTo:'Suresh Babu',startDate:'2026-11-01',dueDate:'2026-11-15',status:'Assigned',progress:0 },
    { col:3,row:2,name:'Hip Roof Row 3 East D3',description:'D3-G3 hip roof 8m span trusses erected. East valley flashing installed.',category:'Structural',priority:'High',assignedTo:'Rajesh Sharma',startDate:'2026-10-08',dueDate:'2026-10-25',status:'Assigned',progress:0 },
    { col:4,row:2,name:'Row 3 East Clay Tile E3',description:'Tile laying Row 3 east D3-G3. Hip corner details. Cement wash on joints.',category:'Finishing',priority:'Medium',assignedTo:'Priya Nair',startDate:'2026-11-05',dueDate:'2026-11-20',status:'Assigned',progress:0 },
    { col:5,row:2,name:'RWP South Installation F3',description:'RWP-4 & RWP-5 south face 110mm downpipes. Splash block at base 600×400.',category:'Plumbing',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-11-10',dueDate:'2026-11-20',status:'Assigned',progress:0 },
    { col:6,row:2,name:'Roof Eave Gutter Row 3 G3',description:'150mm UPVC gutter along all Row 3 eaves. Fall 1:150 to RWP-5 & RWP-7.',category:'Plumbing',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-11-15',dueDate:'2026-11-25',status:'Assigned',progress:0 },
    { col:0,row:3,name:'Parapet Wall Row 4 A4',description:'230mm parapet 600mm high around terrace perimeter. Coping tiles on top.',category:'Masonry',priority:'Medium',assignedTo:'Rajesh Sharma',startDate:'2026-09-28',dueDate:'2026-10-10',status:'Assigned',progress:0 },
    { col:1,row:3,name:'Terrace Anti-crack Membrane B4',description:'Glass fibre mesh in waterproofing at parapet junction. Cove 100mm radius.',category:'Waterproofing',priority:'High',assignedTo:'Priya Nair',startDate:'2026-10-01',dueDate:'2026-10-12',status:'Assigned',progress:0 },
    { col:2,row:3,name:'Solar PV Panel Installation C4',description:'Install 6 no. 400W monocrystalline panels. DC cable to SDB in loft.',category:'MEP',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-11-01',dueDate:'2026-11-15',status:'Assigned',progress:0 },
    { col:3,row:3,name:'Terrace Flooring D4',description:'Anti-skid ceramic 300×300mm over waterproofing membrane. CM 1:3 bed.',category:'Finishing',priority:'Medium',assignedTo:'Suresh Babu',startDate:'2026-10-15',dueDate:'2026-10-28',status:'Assigned',progress:0 },
    { col:4,row:3,name:'Roof Leak Test E4',description:'Flood test on flat terrace 50mm standing water 24hrs. Inspect all junctions.',category:'Safety',priority:'Critical',assignedTo:'Rajesh Sharma',startDate:'2026-11-20',dueDate:'2026-11-21',status:'Assigned',progress:0 },
    { col:5,row:3,name:'Roof Completion Survey F4',description:'As-built levels of all ridge, hip, valley and RWP invert. Structural sign-off.',category:'Safety',priority:'High',assignedTo:'Priya Nair',startDate:'2026-11-25',dueDate:'2026-11-28',status:'Assigned',progress:0 },
    { col:6,row:3,name:'Roof Final Inspection G4',description:'Final roof inspection: tile alignment, ridge seal, gutter fall, solar test.',category:'Safety',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-11-28',dueDate:'2026-11-30',status:'Assigned',progress:0 },
  ];
}

function elecTasks(msId) {
  return [
    { col:0,row:0,name:'MDB Installation at A1',description:'63A TPN MCB main distribution board at entrance. 3-phase 415V 50Hz supply.',category:'Electrical',priority:'Critical',assignedTo:'Arjun Electricals',startDate:'2026-10-01',dueDate:'2026-10-08',status:'Assigned',progress:0 },
    { col:1,row:0,name:'Conduit Rough-in Row 1 East',description:'25mm PVC conduit loop Row 1, beds 1-3. Junction boxes at each column bay.',category:'Electrical',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-10-05',dueDate:'2026-10-15',status:'Assigned',progress:0 },
    { col:2,row:0,name:'Bed 1-2 Wiring C1',description:'1.5sqmm light + 2.5sqmm power FRLS copper wire, Beds 1 & 2. AC 2.5sqmm.',category:'Electrical',priority:'High',assignedTo:'Lakshmi Electricals',startDate:'2026-10-10',dueDate:'2026-10-22',status:'Assigned',progress:0 },
    { col:3,row:0,name:'Bed 3-4 Wiring D1',description:'Beds 3 & 4 branch circuits, 6A light + 16A socket. 2.5sqmm AC dedicated.',category:'Electrical',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-10-10',dueDate:'2026-10-24',status:'Assigned',progress:0 },
    { col:4,row:0,name:'Bed 5-6 Wiring E1',description:'Beds 5 & 6 wiring complete. Fan hook boxes, AC outdoor disconnect 20A.',category:'Electrical',priority:'Medium',assignedTo:'Lakshmi Electricals',startDate:'2026-10-12',dueDate:'2026-10-26',status:'Assigned',progress:0 },
    { col:5,row:0,name:'SDB-1 Sub-board at F1',description:'32A DP MCB sub-board for Row 1 beds. 6 ways. Feed from MDB via 10sqmm.',category:'Electrical',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-10-08',dueDate:'2026-10-18',status:'Assigned',progress:0 },
    { col:6,row:0,name:'Row 1 Final Fit-off G1',description:'Switch plates, socket outlets, LED downlight fitting, AC isolators Row 1.',category:'Electrical',priority:'Medium',assignedTo:'Lakshmi Electricals',startDate:'2026-11-01',dueDate:'2026-11-12',status:'Assigned',progress:0 },
    { col:0,row:1,name:'Living Room Wiring A2',description:'3 lights, 2 fans, 8 sockets in living. Chandelier 10A special outlet.',category:'Electrical',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-10-15',dueDate:'2026-10-28',status:'Assigned',progress:0 },
    { col:1,row:1,name:'Dining & Kitchen Wiring B2',description:'Dining: 2L+1F+4S. Kitchen: 15A exhaust, 20A oven, 20A fridge, undercabinet.',category:'Electrical',priority:'High',assignedTo:'Lakshmi Electricals',startDate:'2026-10-15',dueDate:'2026-10-30',status:'Assigned',progress:0 },
    { col:2,row:1,name:'MDB Earthing & Bonding C2',description:'Plate earth IS 3043, 1200×600×6mm GI. 25sqmm conductor to MDB. Test.',category:'Electrical',priority:'Critical',assignedTo:'Arjun Electricals',startDate:'2026-10-05',dueDate:'2026-10-12',status:'Assigned',progress:0 },
    { col:3,row:1,name:'Row 2 Conduit D2',description:'Main conduit loop Row 2 at +300mm soffit level. Tee to each room.',category:'Electrical',priority:'High',assignedTo:'Lakshmi Electricals',startDate:'2026-10-08',dueDate:'2026-10-18',status:'Assigned',progress:0 },
    { col:4,row:1,name:'Staircase & Passage Lighting E2',description:'2-way switch stair lights, emergency light + exit sign, passage PIR sensor.',category:'Electrical',priority:'Medium',assignedTo:'Arjun Electricals',startDate:'2026-10-20',dueDate:'2026-10-30',status:'Assigned',progress:0 },
    { col:5,row:1,name:'Row 2 Final Fit-off F2',description:'Switch plates, dimmer for living, USB sockets, ELCB at kitchen circuit.',category:'Electrical',priority:'Medium',assignedTo:'Lakshmi Electricals',startDate:'2026-11-05',dueDate:'2026-11-15',status:'Assigned',progress:0 },
    { col:6,row:1,name:'External Lighting G2',description:'EXT-1 porch LED, EXT-2 garage LED, EXT-3 compound: 3 garden bollards.',category:'Electrical',priority:'Low',assignedTo:'Arjun Electricals',startDate:'2026-11-01',dueDate:'2026-11-12',status:'Assigned',progress:0 },
    { col:0,row:2,name:'Row 3 Conduit Rough-in A3',description:'25mm PVC conduit for Beds 7-9 and bathrooms Row 3. Chase in walls.',category:'Electrical',priority:'High',assignedTo:'Lakshmi Electricals',startDate:'2026-10-20',dueDate:'2026-10-30',status:'Assigned',progress:0 },
    { col:1,row:2,name:'Bed 7-8 Wiring B3',description:'FRLS wiring Beds 7 & 8, 2L+1F+4S+1AC each. Conduit in RCC slab.',category:'Electrical',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-10-25',dueDate:'2026-11-05',status:'Assigned',progress:0 },
    { col:2,row:2,name:'Bed 9 & Common Bath Wiring C3',description:'Bed 9 full circuit + common bath IP44 fittings, shaver socket, exhaust.',category:'Electrical',priority:'High',assignedTo:'Lakshmi Electricals',startDate:'2026-10-25',dueDate:'2026-11-08',status:'Assigned',progress:0 },
    { col:3,row:2,name:'Utility & Garage Wiring D3',description:'Utility 15A wm + 15A dryer outlets. Garage 20A + floodlight 10A.',category:'Electrical',priority:'Medium',assignedTo:'Arjun Electricals',startDate:'2026-11-01',dueDate:'2026-11-12',status:'Assigned',progress:0 },
    { col:4,row:2,name:'SDB-2 Row 3 Sub-board E3',description:'32A DP MCB SDB-2 for Row 3. 6-way, feed from MDB via 10sqmm FRLS cable.',category:'Electrical',priority:'High',assignedTo:'Lakshmi Electricals',startDate:'2026-10-20',dueDate:'2026-10-28',status:'Assigned',progress:0 },
    { col:5,row:2,name:'Solar PV Inverter & Metering F3',description:'3kW solar inverter, net meter, DC isolator. Connect to SDB-2 spare way.',category:'MEP',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-11-15',dueDate:'2026-11-25',status:'Assigned',progress:0 },
    { col:6,row:2,name:'Row 3 Final Fit-off G3',description:'Switch plates, IP44 bath fittings, garage light, utility socket Row 3.',category:'Electrical',priority:'Medium',assignedTo:'Lakshmi Electricals',startDate:'2026-11-15',dueDate:'2026-11-25',status:'Assigned',progress:0 },
    { col:0,row:3,name:'Data & TV Conduit Row 4 A4',description:'20mm conduit for LAN CAT6 & TV coax. Pull wire left in all conduits.',category:'Electrical',priority:'Low',assignedTo:'Arjun Electricals',startDate:'2026-11-05',dueDate:'2026-11-18',status:'Assigned',progress:0 },
    { col:1,row:3,name:'Home Network Switch & Router B4',description:'24-port managed switch in MDB room. CAT6 to all 10 data points. Patch panel.',category:'Electrical',priority:'Medium',assignedTo:'Lakshmi Electricals',startDate:'2026-11-20',dueDate:'2026-11-28',status:'Assigned',progress:0 },
    { col:2,row:3,name:'CCTV & Security C4',description:'8-ch DVR, 4 outdoor IP cameras, 2 indoor. Cable CAT6, power 12V adaptor.',category:'Electrical',priority:'Medium',assignedTo:'Arjun Electricals',startDate:'2026-11-20',dueDate:'2026-12-02',status:'Assigned',progress:0 },
    { col:3,row:3,name:'Electrical Testing D4',description:'Insulation resistance test >1MΩ, earth loop <1Ω, RCD 30mA trip <40ms.',category:'Safety',priority:'Critical',assignedTo:'Lakshmi Electricals',startDate:'2026-12-01',dueDate:'2026-12-05',status:'Assigned',progress:0 },
    { col:4,row:3,name:'Load Balancing & MDB Schedule E4',description:'Balance phases, update MDB circuit schedule card. Neutral links checked.',category:'Electrical',priority:'High',assignedTo:'Arjun Electricals',startDate:'2026-12-05',dueDate:'2026-12-08',status:'Assigned',progress:0 },
    { col:5,row:3,name:'EB Connection & Meter F4',description:'BESCOM 3-phase connection application. Meter room sealed. ELCB tested.',category:'Electrical',priority:'Critical',assignedTo:'Lakshmi Electricals',startDate:'2026-12-08',dueDate:'2026-12-15',status:'Assigned',progress:0 },
    { col:6,row:3,name:'Electrical Completion Certificate G4',description:'Electrical inspector sign-off, completion certificate issued. As-built SLD.',category:'Safety',priority:'Critical',assignedTo:'Arjun Electricals',startDate:'2026-12-15',dueDate:'2026-12-18',status:'Assigned',progress:0 },
  ];
}

function plumbTasks(msId) {
  return [
    { col:0,row:0,name:'Cold Water Main Supply A1',description:'25mm CPVC main from sump pump via pressure vessel to all floors. Valves.',category:'Plumbing',priority:'Critical',assignedTo:'Vijay Plumbing',startDate:'2026-10-01',dueDate:'2026-10-12',status:'Assigned',progress:0 },
    { col:1,row:0,name:'Bed 1-2 Ensuite Rough-in B1',description:'CPVC supply 15mm to WC, basin, shower in Beds 1 & 2 ensuites. Hot+cold.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-08',dueDate:'2026-10-20',status:'Assigned',progress:0 },
    { col:2,row:0,name:'Bed 3-4 Ensuite Rough-in C1',description:'CPVC 15mm HW+CW to WC-3, WC-4, basins, showers Beds 3 & 4.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-10',dueDate:'2026-10-22',status:'Assigned',progress:0 },
    { col:3,row:0,name:'Bed 5-6 & Geyser Points D1',description:'GYS-1 (Bed 5) & GYS-2 (Bed 6): 25mm CW inlet, 20A supply. 15mm HW out.',category:'Plumbing',priority:'High',assignedTo:'Priya Nair',startDate:'2026-10-10',dueDate:'2026-10-24',status:'Assigned',progress:0 },
    { col:4,row:0,name:'Soil Stack ST-1 at E1',description:'110mm uPVC vertical soil stack from ground to terrace. Access door at each floor.',category:'Plumbing',priority:'Critical',assignedTo:'Vijay Plumbing',startDate:'2026-10-05',dueDate:'2026-10-16',status:'Assigned',progress:0 },
    { col:5,row:0,name:'Vent Stack & AAV F1',description:'50mm vent pipe from ST-1 through roof. AAV at FF level. 900mm above roof.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-16',dueDate:'2026-10-25',status:'Assigned',progress:0 },
    { col:6,row:0,name:'Row 1 Drain Pipes G1',description:'50mm uPVC waste from Row 1 baths to ST-1. P-traps, vent loops, floor traps.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-12',dueDate:'2026-10-26',status:'Assigned',progress:0 },
    { col:0,row:1,name:'Kitchen Sink & Waste A2',description:'SS double bowl sink, mixer tap 1/2", waste 40mm to soil stack. Grease trap.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-11-01',dueDate:'2026-11-12',status:'Assigned',progress:0 },
    { col:1,row:1,name:'Living & Dining Supply B2',description:'25mm CPVC branch to bar sink and outdoor hose tap. Stopcock at branch.',category:'Plumbing',priority:'Low',assignedTo:'Vijay Plumbing',startDate:'2026-11-05',dueDate:'2026-11-14',status:'Assigned',progress:0 },
    { col:2,row:1,name:'UG Sump Pump & Rising Main C2',description:'Submersible pump 0.5HP, float switch, 25mm GI rising main to OHWT.',category:'Plumbing',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-10-01',dueDate:'2026-10-15',status:'Assigned',progress:0 },
    { col:3,row:1,name:'OHWT 5000L & Float Valve D2',description:'Sintex 5000L triple-layer on platform. 25mm inlet with float valve, overflow.',category:'Plumbing',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-10-10',dueDate:'2026-10-22',status:'Assigned',progress:0 },
    { col:4,row:1,name:'Common Bath Row 2 E2',description:'WC-C1, WC-C2: P-trap WC, pedestal basin, 50mm waste, floor drain FT.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-20',dueDate:'2026-11-01',status:'Assigned',progress:0 },
    { col:5,row:1,name:'Main Drain Collector F2',description:'110mm uPVC main collector at ground level to septic tank. 1:50 fall.',category:'Plumbing',priority:'Critical',assignedTo:'Vijay Plumbing',startDate:'2026-10-15',dueDate:'2026-10-28',status:'Assigned',progress:0 },
    { col:6,row:1,name:'Septic Tank & Soak Pit G2',description:'3-chamber brick septic tank 3000×1500mm + soak pit 1500mm dia gravel.',category:'Civil',priority:'Critical',assignedTo:'Rajesh Sharma',startDate:'2026-10-20',dueDate:'2026-11-05',status:'Assigned',progress:0 },
    { col:0,row:2,name:'Bed 7 Ensuite Rough-in A3',description:'WC-7, basin WB-7, shower SH-7. GYS-4 25mm CW, 15mm HW. Floor drain.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-25',dueDate:'2026-11-05',status:'Assigned',progress:0 },
    { col:1,row:2,name:'Bed 8-9 Ensuite Rough-in B3',description:'WC-8, WC-9, basins WB-8, WB-9, showers SH-8, SH-9. GYS-5, GYS-6.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-10-25',dueDate:'2026-11-08',status:'Assigned',progress:0 },
    { col:2,row:2,name:'Utility & WM Supply C3',description:'WM supply 15mm CPVC with angle stop. Drain 40mm to floor trap. Tap.',category:'Plumbing',priority:'Medium',assignedTo:'Vijay Plumbing',startDate:'2026-11-01',dueDate:'2026-11-10',status:'Assigned',progress:0 },
    { col:3,row:2,name:'Soil Stack ST-2 at D3',description:'110mm uPVC ST-2 from GF to terrace for Row 3 baths. Offset at FF beam.',category:'Plumbing',priority:'Critical',assignedTo:'Vijay Plumbing',startDate:'2026-10-20',dueDate:'2026-11-02',status:'Assigned',progress:0 },
    { col:4,row:2,name:'Row 3 Drain Collector E3',description:'110mm collector at GF level for Row 3. Join ST-2 at 1:50 fall to main.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-11-01',dueDate:'2026-11-12',status:'Assigned',progress:0 },
    { col:5,row:2,name:'Geysers GYS-1 to GYS-6 Install',description:'6 no. 25L electric geysers fixed, wired 20A, pressure relief valve, tested.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-11-15',dueDate:'2026-11-25',status:'Assigned',progress:0 },
    { col:6,row:2,name:'Row 3 Final Fit-off Plumbing G3',description:'WC fixtures fixed, basins hung, shower heads installed, taps fitted Row 3.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-11-25',dueDate:'2026-12-05',status:'Assigned',progress:0 },
    { col:0,row:3,name:'Pressure Test - Supply Lines A4',description:'Hydraulic test 1.5× working pressure (15 bar) on all CPVC supply. 2hrs.',category:'Safety',priority:'Critical',assignedTo:'Priya Nair',startDate:'2026-12-01',dueDate:'2026-12-03',status:'Assigned',progress:0 },
    { col:1,row:3,name:'Drain Flush & Smoke Test B4',description:'Full flush test all drain pipes. Smoke test for vent continuity. CCTV drain.',category:'Safety',priority:'Critical',assignedTo:'Vijay Plumbing',startDate:'2026-12-03',dueDate:'2026-12-06',status:'Assigned',progress:0 },
    { col:2,row:3,name:'Rainwater Harvesting C4',description:'Roof RWP-3 terrace drain connected to filter pit 600mm dia, feeds sump.',category:'Civil',priority:'Medium',assignedTo:'Karthik M',startDate:'2026-11-20',dueDate:'2026-11-30',status:'Assigned',progress:0 },
    { col:3,row:3,name:'GF Final Plumbing Fit-off D4',description:'WC-1 to WC-6 fitted, basins, shower heads, kitchen mixers, tap tested GF.',category:'Plumbing',priority:'High',assignedTo:'Vijay Plumbing',startDate:'2026-11-20',dueDate:'2026-12-02',status:'Assigned',progress:0 },
    { col:4,row:3,name:'Plumbing Completion Check E4',description:'Flow rate test at all outlets (min 6 LPM). Document and sign-off sheet.',category:'Safety',priority:'High',assignedTo:'Priya Nair',startDate:'2026-12-06',dueDate:'2026-12-08',status:'Assigned',progress:0 },
    { col:5,row:3,name:'External Water Connection F4',description:'BWSSB connection 25mm to sump inlet. Flow meter, backflow preventer.',category:'Plumbing',priority:'Critical',assignedTo:'Vijay Plumbing',startDate:'2026-12-08',dueDate:'2026-12-12',status:'Assigned',progress:0 },
    { col:6,row:3,name:'Plumbing Completion Certificate G4',description:'Plumbing engineer sign-off. As-built plumbing layout drawings. Filed.',category:'Safety',priority:'Critical',assignedTo:'Karthik M',startDate:'2026-12-12',dueDate:'2026-12-15',status:'Assigned',progress:0 },
  ];
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== 9 BHK House Building Project Seed ===\n');

  // 1. Create project
  console.log('1. Creating project...');
  const project = await postJSON('/projects', {
    name: '9 BHK House Building Project',
    description: 'Complete construction of a luxury 9-bedroom house with ground floor, first floor, RCC framed structure, full MEP services. Site area 400 sq.m, BUA 650 sq.m, Bengaluru.',
    status: 'In Progress',
    startDate: '2026-01-15',
    endDate: '2026-12-31',
  });
  const PID = project.id;
  console.log(`  ✓ Project created: ${PID}\n`);

  // 2. Create milestones
  console.log('2. Creating milestones...');
  const mFoundation = await postJSON('/milestones', { projectId: PID, name: 'Foundation & Substructure', description: 'Excavation, footings, grade beams, plinth', dueDate: '2026-04-30', status: 'Completed' });
  const mStructural = await postJSON('/milestones', { projectId: PID, name: 'Structural Frame', description: 'RCC columns, beams, slabs GF & FF', dueDate: '2026-09-15', status: 'In Progress' });
  const mRoofing   = await postJSON('/milestones', { projectId: PID, name: 'Roofing Works', description: 'Roof structure, tiling, waterproofing', dueDate: '2026-11-30', status: 'Assigned' });
  const mMEP       = await postJSON('/milestones', { projectId: PID, name: 'MEP Services', description: 'Electrical, plumbing, drainage', dueDate: '2026-12-15', status: 'Assigned' });
  const mFinishing = await postJSON('/milestones', { projectId: PID, name: 'Interior Finishing', description: 'Plastering, tiling, painting, joinery', dueDate: '2026-12-31', status: 'Assigned' });
  console.log(`  ✓ 5 milestones created\n`);

  // 3. Read SVG files
  console.log('3. Reading SVG drawings...');
  const svgs = {
    groundFloor: readFileSync(join(DRAWINGS_DIR, 'ground-floor-plan.svg'), 'utf8'),
    foundation:  readFileSync(join(DRAWINGS_DIR, 'foundation-plan.svg'), 'utf8'),
    firstFloor:  readFileSync(join(DRAWINGS_DIR, 'first-floor-plan.svg'), 'utf8'),
    roof:        readFileSync(join(DRAWINGS_DIR, 'roof-plan.svg'), 'utf8'),
    electrical:  readFileSync(join(DRAWINGS_DIR, 'electrical-layout-plan.svg'), 'utf8'),
    plumbing:    readFileSync(join(DRAWINGS_DIR, 'plumbing-drainage-plan.svg'), 'utf8'),
  };
  console.log(`  ✓ All 6 SVGs loaded\n`);

  // 4. Upload drawings and update tasks
  console.log('4. Uploading drawings and seeding tasks...\n');

  await createDrawingWithTasks(
    { name: '9 BHK Ground Floor Plan', svg: svgs.groundFloor, milestoneId: mStructural.id }, gfTasks(mStructural.id), PID
  );
  await createDrawingWithTasks(
    { name: '9 BHK Foundation Plan', svg: svgs.foundation, milestoneId: mFoundation.id }, fndTasks(mFoundation.id), PID
  );
  await createDrawingWithTasks(
    { name: '9 BHK First Floor Plan', svg: svgs.firstFloor, milestoneId: mStructural.id }, ffTasks(mStructural.id), PID
  );
  await createDrawingWithTasks(
    { name: '9 BHK Roof Plan', svg: svgs.roof, milestoneId: mRoofing.id }, roofTasks(mRoofing.id), PID
  );
  await createDrawingWithTasks(
    { name: '9 BHK Electrical Layout Plan', svg: svgs.electrical, milestoneId: mMEP.id }, elecTasks(mMEP.id), PID
  );
  await createDrawingWithTasks(
    { name: '9 BHK Plumbing & Drainage Plan', svg: svgs.plumbing, milestoneId: mMEP.id }, plumbTasks(mMEP.id), PID
  );

  console.log('\n✅ 9 BHK House Building Project seeded successfully!');
  console.log(`\nProject ID: ${PID}`);
  console.log(`Open the app: https://buildtrack-withdrawing.onslate.in/projects`);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
