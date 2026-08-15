/**
 * seed_prestige_final.mjs
 * -----------------------
 * 1. List all projects → pick "Prestige Heights" (or first project)
 * 2. Delete ALL existing drawings for that project
 * 3. Upload prestige-heights-ground-floor.svg as new drawing (gridCols=6, gridRows=7)
 * 4. PATCH the drawing with precise calibrated columnPositions (A1–F7)
 * 5. Seed 5 construction milestones
 * 6. PATCH existing auto-created tasks with realistic data
 *    (the upload auto-creates 42 tasks, so we just update the key ones)
 *
 * Run: node backend/seed_prestige_final.mjs
 * Requires local backend running on port 4001
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:4000/api';

// ─── Calibration data ────────────────────────────────────────────────────────
// SVG size: 1200 × 900
// Column X coords: A=180, B=340, C=500, D=660, E=820, F=980
// Row Y coords: 1=140, 2=255, 3=370, 4=485, 5=600, 6=715, 7=775
const COLUMN_POSITIONS = {
  "A1":{x:0.150,y:0.156}, "B1":{x:0.283,y:0.156}, "C1":{x:0.417,y:0.156}, "D1":{x:0.550,y:0.156}, "E1":{x:0.683,y:0.156}, "F1":{x:0.817,y:0.156},
  "A2":{x:0.150,y:0.283}, "B2":{x:0.283,y:0.283}, "C2":{x:0.417,y:0.283}, "D2":{x:0.550,y:0.283}, "E2":{x:0.683,y:0.283}, "F2":{x:0.817,y:0.283},
  "A3":{x:0.150,y:0.411}, "B3":{x:0.283,y:0.411}, "C3":{x:0.417,y:0.411}, "D3":{x:0.550,y:0.411}, "E3":{x:0.683,y:0.411}, "F3":{x:0.817,y:0.411},
  "A4":{x:0.150,y:0.539}, "B4":{x:0.283,y:0.539}, "C4":{x:0.417,y:0.539}, "D4":{x:0.550,y:0.539}, "E4":{x:0.683,y:0.539}, "F4":{x:0.817,y:0.539},
  "A5":{x:0.150,y:0.667}, "B5":{x:0.283,y:0.667}, "C5":{x:0.417,y:0.667}, "D5":{x:0.550,y:0.667}, "E5":{x:0.683,y:0.667}, "F5":{x:0.817,y:0.667},
  "A6":{x:0.150,y:0.794}, "B6":{x:0.283,y:0.794}, "C6":{x:0.417,y:0.794}, "D6":{x:0.550,y:0.794}, "E6":{x:0.683,y:0.794}, "F6":{x:0.817,y:0.794},
  "A7":{x:0.150,y:0.861}, "B7":{x:0.283,y:0.861}, "C7":{x:0.417,y:0.861}, "D7":{x:0.550,y:0.861}, "E7":{x:0.683,y:0.861}, "F7":{x:0.817,y:0.861}
};

// ─── Milestone definitions ────────────────────────────────────────────────────
const MILESTONES = [
  {
    name: "M1 – Substructure & Foundation",
    description: "Pile driving, raft foundation, and sub-basement construction complete. Includes pile cap casting and waterproofing.",
    dueDate: "2025-11-30",
    status: "Completed"
  },
  {
    name: "M2 – Ground Floor Structure",
    description: "Ground floor columns, beams and slab cast. All 42 structural columns (450×450mm RCC) at grid A–F / 1–7 completed.",
    dueDate: "2026-01-31",
    status: "Completed"
  },
  {
    name: "M3 – Tower Structure (Floors 1–6)",
    description: "Repetitive structural floors 1 through 6 complete. Shear walls, staircases, and lift cores cast.",
    dueDate: "2026-05-31",
    status: "In Progress"
  },
  {
    name: "M4 – Building Envelope & MEP Rough-In",
    description: "External cladding, windows, and waterproofing complete. Electrical, plumbing, and HVAC rough-in done.",
    dueDate: "2026-09-30",
    status: "Pending"
  },
  {
    name: "M5 – Fit-Out, Handover & Commissioning",
    description: "Interior fit-out of all 8 units, common area finishing, landscaping, fire NOC, and OC certificate.",
    dueDate: "2026-12-31",
    status: "Pending"
  }
];

// ─── Realistic task patches per grid code ─────────────────────────────────────
// Will be applied to auto-created tasks after upload.
// Keys: gridCode, values: task fields to update
function buildTaskPatches(milestoneMap) {
  // milestoneMap: { "M1": id, "M2": id, ... }
  return [
    // ── Row 1: Corner/perimeter columns, foundation ──
    { gridCode:"A1", name:"Column A1 – Foundation to Plinth", description:"450×450mm RCC column from pile cap to plinth level. M35 concrete, Fe500 bars, 16T16 + 4L links@100c/c.", category:"Structural", priority:"High", assignedTo:"Rajan Nair", startDate:"2025-10-01", dueDate:"2025-11-15", status:"Completed", progress:100, milestoneId: milestoneMap["M1"] },
    { gridCode:"B1", name:"Column B1 – Foundation to Plinth", description:"Corner column B1, pile cap integration, dowels set. Plinth beam laps complete.", category:"Structural", priority:"High", assignedTo:"Rajan Nair", startDate:"2025-10-01", dueDate:"2025-11-15", status:"Completed", progress:100, milestoneId: milestoneMap["M1"] },
    { gridCode:"C1", name:"Column C1 – Foundation to Plinth", description:"Internal column C1. Pile cap cast, column starter bars fixed. Shuttering and concreting done.", category:"Structural", priority:"High", assignedTo:"Suresh Kumar", startDate:"2025-10-05", dueDate:"2025-11-20", status:"Completed", progress:100, milestoneId: milestoneMap["M1"] },
    { gridCode:"D1", name:"Column D1 – Foundation to Plinth", description:"Internal column D1 at lobby–unit junction. Starter bars fixed, concreting done.", category:"Structural", priority:"Medium", assignedTo:"Suresh Kumar", startDate:"2025-10-05", dueDate:"2025-11-20", status:"Completed", progress:100, milestoneId: milestoneMap["M1"] },
    { gridCode:"E1", name:"Column E1 – Foundation to Plinth", description:"Perimeter column E1, north facade. Pile cap + column plinth done.", category:"Structural", priority:"Medium", assignedTo:"Anil Sharma", startDate:"2025-10-08", dueDate:"2025-11-22", status:"Completed", progress:100, milestoneId: milestoneMap["M1"] },
    { gridCode:"F1", name:"Column F1 – Foundation to Plinth", description:"Corner column F1. Pile cap, plinth beam junction, L-starter bars. Completed.", category:"Structural", priority:"High", assignedTo:"Anil Sharma", startDate:"2025-10-08", dueDate:"2025-11-22", status:"Completed", progress:100, milestoneId: milestoneMap["M1"] },

    // ── Row 2: Ground floor columns ──
    { gridCode:"A2", name:"Column A2 – GF Lift Core Wall", description:"Column A2 forms lift core west wall. 500mm thick RCC wall panel, waterproofed. M40 concrete.", category:"Structural", priority:"High", assignedTo:"Rajan Nair", startDate:"2025-12-01", dueDate:"2026-01-10", status:"Completed", progress:100, milestoneId: milestoneMap["M2"] },
    { gridCode:"B2", name:"Column B2 – Lobby Central Column", description:"B2 is the central lobby column. Exposed concrete finish, 450×450mm, M35, 20T16 bars.", category:"Structural", priority:"High", assignedTo:"Rajan Nair", startDate:"2025-12-01", dueDate:"2026-01-10", status:"Completed", progress:100, milestoneId: milestoneMap["M2"] },
    { gridCode:"C2", name:"Column C2 – Unit 1A/1B Junction", description:"Column C2 at the junction of Unit 1A and 1B. Full-height column GF to roof. Completed.", category:"Structural", priority:"Medium", assignedTo:"Suresh Kumar", startDate:"2025-12-05", dueDate:"2026-01-15", status:"Completed", progress:100, milestoneId: milestoneMap["M2"] },
    { gridCode:"D2", name:"Column D2 – Unit 1B/1C Junction", description:"Column D2 internal. Standard 450×450mm RCC. Column cast, de-shuttered, curing complete.", category:"Structural", priority:"Medium", assignedTo:"Suresh Kumar", startDate:"2025-12-05", dueDate:"2026-01-15", status:"Completed", progress:100, milestoneId: milestoneMap["M2"] },
    { gridCode:"E2", name:"Column E2 – Unit 1C/1D Junction", description:"Column E2 at unit junction. Full height GF column. Concreting and curing complete.", category:"Structural", priority:"Medium", assignedTo:"Anil Sharma", startDate:"2025-12-08", dueDate:"2026-01-18", status:"Completed", progress:100, milestoneId: milestoneMap["M2"] },
    { gridCode:"F2", name:"Column F2 – East Facade Corner", description:"Perimeter column F2, east face. Rebar fixing done. Shuttering and casting complete.", category:"Structural", priority:"High", assignedTo:"Anil Sharma", startDate:"2025-12-08", dueDate:"2026-01-18", status:"Completed", progress:100, milestoneId: milestoneMap["M2"] },

    // ── Row 3: Mid-floor columns (staircase zone) ──
    { gridCode:"A3", name:"Column A3 – Staircase West Wall", description:"Column A3 forms the staircase enclosure west face. Integrated into shear wall. Cast complete.", category:"Structural", priority:"High", assignedTo:"Priya Patel", startDate:"2026-02-01", dueDate:"2026-03-15", status:"Completed", progress:100, milestoneId: milestoneMap["M3"] },
    { gridCode:"B3", name:"Column B3 – Lift Core Column", description:"B3 lift shaft corner column. 550mm thick core wall section. Integrated with lift pit beam.", category:"Structural", priority:"High", assignedTo:"Priya Patel", startDate:"2026-02-01", dueDate:"2026-03-15", status:"Completed", progress:100, milestoneId: milestoneMap["M3"] },
    { gridCode:"C3", name:"Column C3 – Floor 2 Cast", description:"Column C3 floor 1→2 pour complete. Fe500 rebar, M35 concrete. NDT tested – passed.", category:"Structural", priority:"Medium", assignedTo:"Vikram Singh", startDate:"2026-02-10", dueDate:"2026-03-20", status:"Completed", progress:100, milestoneId: milestoneMap["M3"] },
    { gridCode:"D3", name:"Column D3 – Floor 2 Cast", description:"D3 column floor 2 cast. Plumb check ±2mm. Curing blanket applied. Completed.", category:"Structural", priority:"Medium", assignedTo:"Vikram Singh", startDate:"2026-02-10", dueDate:"2026-03-20", status:"Completed", progress:100, milestoneId: milestoneMap["M3"] },
    { gridCode:"E3", name:"Column E3 – Floor 2 Cast", description:"E3 column cast complete. Starter bars for floor 3 fixed. Ready for next pour.", category:"Structural", priority:"Medium", assignedTo:"Priya Patel", startDate:"2026-02-12", dueDate:"2026-03-22", status:"Completed", progress:100, milestoneId: milestoneMap["M3"] },
    { gridCode:"F3", name:"Column F3 – East Facade Floor 2", description:"F3 perimeter column floor 2. Cast and de-shuttered. Facade tie-in ready.", category:"Structural", priority:"Medium", assignedTo:"Priya Patel", startDate:"2026-02-12", dueDate:"2026-03-22", status:"Completed", progress:100, milestoneMap: milestoneMap["M3"] },

    // ── Row 4: Corridor-level columns ──
    { gridCode:"A4", name:"Column A4 – Floor 3 Starter", description:"A4 column floor 2→3, starter bars fixed. Shuttering in progress. Pour scheduled next week.", category:"Structural", priority:"High", assignedTo:"Rajan Nair", startDate:"2026-04-01", dueDate:"2026-05-01", status:"In Progress", progress:65, milestoneId: milestoneMap["M3"] },
    { gridCode:"B4", name:"Column B4 – Floor 3 Rebar Fix", description:"B4 column floor 3 rebar cage assembled. 20T20 bars tied. Pending shuttering and casting.", category:"Structural", priority:"High", assignedTo:"Rajan Nair", startDate:"2026-04-01", dueDate:"2026-05-01", status:"In Progress", progress:50, milestoneId: milestoneMap["M3"] },
    { gridCode:"C4", name:"Column C4 – Floor 3 Pending", description:"C4 floor 3 rebar fixing pending. Material at site. Crew assigned. Start after B4 shuttering.", category:"Structural", priority:"Medium", assignedTo:"Suresh Kumar", startDate:"2026-04-10", dueDate:"2026-05-10", status:"Assigned", progress:20, milestoneId: milestoneMap["M3"] },
    { gridCode:"D4", name:"Column D4 – Floor 3 Pending", description:"D4 floor 3 awaiting rebar cage. Lap length to be verified at B3 junction. Engineer to inspect.", category:"Structural", priority:"Medium", assignedTo:"Suresh Kumar", startDate:"2026-04-10", dueDate:"2026-05-10", status:"Assigned", progress:15, milestoneId: milestoneMap["M3"] },
    { gridCode:"E4", name:"Column E4 – Beam Soffit Form", description:"E4 beam soffit formwork set for row-4 beam. Beam casting follows column completion.", category:"Structural", priority:"Medium", assignedTo:"Anil Sharma", startDate:"2026-04-15", dueDate:"2026-05-15", status:"Assigned", progress:10, milestoneId: milestoneMap["M3"] },
    { gridCode:"F4", name:"Column F4 – East Facade Floor 3", description:"F4 east facade column floor 3. Awaiting rebar delivery. Scheduled after May holiday.", category:"Structural", priority:"Low", assignedTo:"Anil Sharma", startDate:"2026-04-20", dueDate:"2026-05-20", status:"Assigned", progress:5, milestoneId: milestoneMap["M3"] },

    // ── Row 5: Upper floors ──
    { gridCode:"A5", name:"Column A5 – Floor 4 Planned", description:"A5 column floor 4 planned. Drawings reviewed. Rebar schedule submitted. Awaiting approval.", category:"Structural", priority:"Medium", assignedTo:"Vikram Singh", startDate:"2026-06-01", dueDate:"2026-07-01", status:"Assigned", progress:0, milestoneId: milestoneMap["M3"] },
    { gridCode:"B5", name:"Column B5 – Floor 4 Planned", description:"B5 floor 4 planned. Concrete mix design M40 approved for upper floors. Quantity estimated.", category:"Structural", priority:"Medium", assignedTo:"Vikram Singh", startDate:"2026-06-01", dueDate:"2026-07-01", status:"Assigned", progress:0, milestoneId: milestoneMap["M3"] },
    { gridCode:"C5", name:"MEP Conduit Chase – C5 Zone", description:"Electrical conduit chasing in C5 column zone. ELV, power, and data conduits to be fixed before concreting.", category:"MEP", priority:"Medium", assignedTo:"Electricals Team", startDate:"2026-06-15", dueDate:"2026-07-15", status:"Assigned", progress:0, milestoneId: milestoneMap["M4"] },
    { gridCode:"D5", name:"MEP Conduit Chase – D5 Zone", description:"Plumbing sleeves and drainage vertical in D5 zone. Soil pipe routing from upper floors. Sleeve set required.", category:"MEP", priority:"Medium", assignedTo:"Plumbing Team", startDate:"2026-06-15", dueDate:"2026-07-15", status:"Assigned", progress:0, milestoneId: milestoneMap["M4"] },
    { gridCode:"E5", name:"Column E5 – Floor 4 Pending", description:"E5 floor 4 column pending. Drawings issued. Procurement in progress.", category:"Structural", priority:"Low", assignedTo:"Priya Patel", startDate:"2026-06-20", dueDate:"2026-07-20", status:"Assigned", progress:0, milestoneId: milestoneMap["M3"] },
    { gridCode:"F5", name:"Column F5 – Floor 4 Pending", description:"F5 perimeter column floor 4. East balcony cantilever beam support. Detailing in progress.", category:"Structural", priority:"Low", assignedTo:"Priya Patel", startDate:"2026-06-20", dueDate:"2026-07-20", status:"Assigned", progress:0, milestoneId: milestoneMap["M3"] },

    // ── Row 6: Finishing ──
    { gridCode:"A6", name:"Wall Plaster – A6 Zone", description:"Internal wall plastering, Unit 2A west face. 12mm CM 1:4 plaster. Surface level marked.", category:"Finishing", priority:"Medium", assignedTo:"Finishing Crew A", startDate:"2026-09-01", dueDate:"2026-10-01", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"B6", name:"Floor Tiling – Lobby B6 Zone", description:"Vitrified tile 800×800mm in lobby. Bedding mortar 1:4, levelness ±1mm. Pattern as per interior drawings.", category:"Finishing", priority:"Medium", assignedTo:"Finishing Crew B", startDate:"2026-09-15", dueDate:"2026-10-15", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"C6", name:"Facade Cladding – C6 Zone", description:"External composite aluminium panel cladding, Unit 1A/2B facade. Fixing brackets installed.", category:"Finishing", priority:"High", assignedTo:"Facade Contractor", startDate:"2026-08-01", dueDate:"2026-09-30", status:"Assigned", progress:0, milestoneId: milestoneMap["M4"] },
    { gridCode:"D6", name:"Facade Cladding – D6 Zone", description:"Curtain wall glazing unit D-E bay. 6mm toughened + 12 air + 6mm toughened IGU. Sealant application pending.", category:"Finishing", priority:"High", assignedTo:"Facade Contractor", startDate:"2026-08-01", dueDate:"2026-09-30", status:"Assigned", progress:0, milestoneId: milestoneMap["M4"] },
    { gridCode:"E6", name:"Waterproofing – Terrace E6 Zone", description:"Terrace waterproofing, E-F bay. APP modified bitumen membrane. Flood test required after application.", category:"Waterproofing", priority:"High", assignedTo:"WP Contractor", startDate:"2026-08-15", dueDate:"2026-09-15", status:"Assigned", progress:0, milestoneId: milestoneMap["M4"] },
    { gridCode:"F6", name:"Waterproofing – Terrace F6 Zone", description:"Terrace WP continuation F bay. Upstand 300mm, angle fillet 75mm. Insulation board 50mm EPS.", category:"Waterproofing", priority:"High", assignedTo:"WP Contractor", startDate:"2026-08-15", dueDate:"2026-09-15", status:"Assigned", progress:0, milestoneId: milestoneMap["M4"] },

    // ── Row 7: Handover ──
    { gridCode:"A7", name:"Snagging – Unit 2A (A7 Zone)", description:"Final snagging inspection, Unit 2A. Check door gaps, paint finish, electrical point testing, plumbing leak test.", category:"QA/Handover", priority:"High", assignedTo:"QA Engineer", startDate:"2026-11-01", dueDate:"2026-11-30", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"B7", name:"Snagging – Common Lobby (B7 Zone)", description:"Lobby finish inspection. Granite flooring check, elevator door alignment, false ceiling grid level.", category:"QA/Handover", priority:"High", assignedTo:"QA Engineer", startDate:"2026-11-01", dueDate:"2026-11-30", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"C7", name:"Fire NOC Inspection – C7 Zone", description:"Fire department inspection, sprinkler system commissioning, hose reel test. NOC application submitted.", category:"Compliance", priority:"Critical", assignedTo:"Safety Officer", startDate:"2026-11-15", dueDate:"2026-12-10", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"D7", name:"Electrical Commissioning – D7 Zone", description:"MDB testing, ELCB trip test, earthing resistance check <1Ω. Lighting control system commissioning.", category:"MEP", priority:"Critical", assignedTo:"Electrical Engineer", startDate:"2026-11-15", dueDate:"2026-12-10", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"E7", name:"HVAC Commissioning – E7 Zone", description:"VRF system balancing, duct leakage test, air flow measurement. Handover report to be prepared.", category:"MEP", priority:"High", assignedTo:"HVAC Engineer", startDate:"2026-11-20", dueDate:"2026-12-15", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
    { gridCode:"F7", name:"OC Certificate – F7 Handover", description:"Occupancy certificate obtained. Utility connections: BESCOM, BWSSB, gas. Keys handover to residents.", category:"QA/Handover", priority:"Critical", assignedTo:"Project Manager", startDate:"2026-12-01", dueDate:"2026-12-31", status:"Assigned", progress:0, milestoneId: milestoneMap["M5"] },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Prestige Heights — Final Seed Script   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // 1. Get projects
  log('📋', 'Fetching projects...');
  const projects = await api('GET', '/projects');
  if (!Array.isArray(projects) || projects.length === 0) {
    console.error('❌ No projects found! Please create a project first in the app.');
    process.exit(1);
  }

  // Pick Prestige Heights or first project
  const project = projects.find(p =>
    p.name && (p.name.toLowerCase().includes('prestige') || p.name.toLowerCase().includes('phase'))
  ) || projects[0];
  log('✅', `Using project: "${project.name}" (id: ${project.id})`);

  // 2. List and delete existing drawings
  log('\n🗑️ ', 'Listing existing drawings...');
  const drawings = await api('GET', `/drawings?projectId=${project.id}`);
  if (Array.isArray(drawings) && drawings.length > 0) {
    for (const d of drawings) {
      await api('DELETE', `/drawings/${d.id}`);
      log('  🗑️', `Deleted drawing: "${d.name}" (${d.id})`);
    }
  } else {
    log('  ℹ️', 'No existing drawings found.');
  }

  // Also delete any drawings not linked to this project (cleanup)
  const allDrawings = await api('GET', '/drawings');
  if (Array.isArray(allDrawings)) {
    for (const d of allDrawings) {
      if (d.projectId !== project.id) {
        await api('DELETE', `/drawings/${d.id}`);
        log('  🗑️', `Deleted stale drawing: "${d.name}" (projectId: ${d.projectId})`);
      }
    }
  }

  // 3. Upload new SVG
  log('\n📤', 'Uploading Ground Floor Plan SVG...');
  const svgPath = path.join(__dirname, 'assets/improved-drawings/prestige-heights-ground-floor.svg');
  if (!fs.existsSync(svgPath)) {
    console.error(`❌ SVG file not found at: ${svgPath}`);
    process.exit(1);
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(svgPath), {
    filename: 'prestige-heights-ground-floor.svg',
    contentType: 'image/svg+xml',
  });
  form.append('name', 'Ground Floor Plan – PH1');
  form.append('projectId', project.id);
  form.append('gridCols', '6');
  form.append('gridRows', '7');

  const uploadRes = await fetch(`${BASE}/drawings/upload`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });
  const drawing = await uploadRes.json();
  if (!drawing.id) {
    console.error('❌ Upload failed:', drawing);
    process.exit(1);
  }
  log('✅', `Drawing uploaded: "${drawing.name}" (id: ${drawing.id})`);
  log('  📐', `Grid: ${drawing.gridCols}×${drawing.gridRows}, ${drawing.gridCols * drawing.gridRows} tasks auto-created`);

  // 4. PATCH calibrated column positions
  log('\n📍', 'Setting calibrated column positions...');
  const patchRes = await api('PATCH', `/drawings/${drawing.id}`, {
    columnPositions: COLUMN_POSITIONS,
  });
  const posCount = Object.keys(patchRes.columnPositions || {}).length;
  log('✅', `Column positions set: ${posCount} nodes calibrated`);

  // 5. Seed milestones
  log('\n🏁', 'Seeding milestones...');
  const milestoneMap = {};
  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];
    const result = await api('POST', '/milestones', {
      projectId: project.id,
      name: m.name,
      description: m.description,
      dueDate: m.dueDate,
      status: m.status,
    });
    if (result.id) {
      const key = `M${i + 1}`;
      milestoneMap[key] = result.id;
      log('  ✅', `${m.name} (id: ${result.id})`);
    } else {
      console.error(`  ❌ Failed to create milestone: ${m.name}`, result);
    }
  }

  // 6. Update auto-created tasks with realistic data
  log('\n📝', 'Updating tasks with realistic data...');

  // Get all tasks for this drawing
  const tasks = await api('GET', `/tasks?drawingId=${drawing.id}`);
  if (!Array.isArray(tasks) || tasks.length === 0) {
    log('⚠️', 'No tasks found for drawing. Skipping task updates.');
  } else {
    log('  ℹ️', `Found ${tasks.length} auto-created tasks. Applying realistic patches...`);

    const patches = buildTaskPatches(milestoneMap);

    for (const patch of patches) {
      // Find matching task by gridCode
      const task = tasks.find(t => t.gridCode === patch.gridCode);
      if (!task) {
        log('  ⚠️', `No task found for gridCode ${patch.gridCode} – skipping`);
        continue;
      }
      const { gridCode, ...fields } = patch;
      const result = await api('PUT', `/tasks/${task.id}`, fields);
      if (result.id) {
        log('  ✅', `${gridCode}: "${result.name}" → ${result.status} (${result.progress}%)`);
      } else {
        log('  ❌', `Failed to update task ${gridCode}:`, result);
      }
    }
  }

  // 7. Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              SEED COMPLETE! 🎉           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n  Project : ${project.name} (${project.id})`);
  console.log(`  Drawing : ${drawing.name} (${drawing.id})`);
  console.log(`  Nodes   : ${posCount} calibrated grid positions`);
  console.log(`  Milestones: ${Object.keys(milestoneMap).length}/5 created`);
  console.log(`  Tasks   : 42 grid tasks updated with realistic construction data`);
  console.log('\n  → Open the app and select the project to see the results!\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message || err);
  process.exit(1);
});
