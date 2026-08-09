/**
 * seed_realistic_tasks.mjs
 *
 * Updates all House Building Project tasks with realistic construction work data:
 * - Proper task names matching each drawing / grid location
 * - Assigned engineer / contractor names
 * - Realistic statuses spread across all states
 * - Correct progress percentages
 * - Start / due dates in 2026
 * - Categories and priorities
 *
 * Run: node seed_realistic_tasks.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function date(y, m, d) { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

async function patchTask(id, body) {
  const r = await fetch(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${id} failed: ${await r.text()}`);
  return r.json();
}

async function fetchTasks(drawingId) {
  const r = await fetch(`${BASE}/tasks?drawingId=${drawingId}`);
  return r.json();
}

// ─── Task definitions per drawing ─────────────────────────────────────────────

/**
 * Foundation Plan  ab7b4fc3  (3 cols × 2 rows → 6 tasks)
 * A=NW corner, B=N centre, C=NE corner / 1=North row, 2=South row
 */
const FOUNDATION_TASKS = {
  A1: { name: 'Excavation – Column Footing A1 (NW)', description: 'Excavate to 1.5m BGL, compaction & PCC bed for isolated footing at grid A1. Include dewatering if groundwater is encountered.', category: 'Civil', priority: 'High', assignedTo: 'Rajesh Patel (Site Engineer)', status: 'Completed', progress: 100, startDate: date(2026,1,5), dueDate: date(2026,1,18) },
  B1: { name: 'Reinforcement – Column Footing B1 (N Centre)', description: 'Fix 16mm dia TMT bars, stirrups as per structural drawings. Cover 75mm. Get QC check before concreting.', category: 'Structural', priority: 'High', assignedTo: 'Suresh Kumar (Bar Bender)', status: 'Completed', progress: 100, startDate: date(2026,1,19), dueDate: date(2026,2,2) },
  C1: { name: 'Concreting – Column Footing C1 (NE)', description: 'Pour M25 concrete for isolated footing at grid C1. Slump 75-100mm, curing 14 days minimum.', category: 'Structural', priority: 'High', assignedTo: 'Anand Verma (Concrete Supervisor)', status: 'Completed', progress: 100, startDate: date(2026,2,3), dueDate: date(2026,2,10) },
  A2: { name: 'Formwork – Grade Beam A1–A2', description: 'Erect shuttering for grade beam along axis A between footings A1 and A2. Ensure 25mm cover and beam alignment.', category: 'Civil', priority: 'Medium', assignedTo: 'Ravi Shankar (Carpenter)', status: 'In Progress', progress: 65, startDate: date(2026,2,11), dueDate: date(2026,2,28) },
  B2: { name: 'Backfill – Column Footing B2 (S Centre)', description: 'Backfill with approved earth in 200mm layers after curing is complete. Compact to 95% proctor density.', category: 'Civil', priority: 'Medium', assignedTo: 'Gopal Singh (Excavation Contractor)', status: 'Assigned', progress: 0, startDate: date(2026,3,1), dueDate: date(2026,3,10) },
  C2: { name: 'Waterproofing – Footing C2 (SE)', description: 'Apply bituminous waterproofing coating on footing sides at C2. Extend 300mm above finished GL.', category: 'Finishing', priority: 'Low', assignedTo: 'Mani Contractor (Waterproof)', status: 'Assigned', progress: 0, startDate: date(2026,3,12), dueDate: date(2026,3,18) },
};

/**
 * Ground Floor Plan  ded710c4  (4 cols × 2 rows → 8 tasks)
 * A=Living/Dining zone, B=Bedroom zone, C=Wet area, D=Garage
 */
const GROUND_FLOOR_TASKS = {
  A1: { name: 'Masonry – Walls Living / Dining Area', description: 'Lay 230mm thick brick walls in CM 1:6 for living and dining room on ground floor. Include bond courses every 600mm.', category: 'Civil', priority: 'High', assignedTo: 'Ramesh Bricklayer & Team', status: 'Completed', progress: 100, startDate: date(2026,3,1), dueDate: date(2026,3,25) },
  B1: { name: 'Plastering – Master Bedroom Walls', description: 'Two-coat plaster (12mm scratch + 8mm finish) in cement mortar 1:4 on master bedroom walls. Sponge finish for painting.', category: 'Finishing', priority: 'High', assignedTo: 'Prakash Plastering Co.', status: 'Completed', progress: 100, startDate: date(2026,4,1), dueDate: date(2026,4,20) },
  C1: { name: 'Tiling – Bathroom & Toilet Walls', description: 'Fix 300×600mm vitrified wall tiles in toilet and bathroom up to ceiling. Grout with white cement.', category: 'Finishing', priority: 'High', assignedTo: 'Vinod Tile Works', status: 'In Progress', progress: 55, startDate: date(2026,4,22), dueDate: date(2026,5,15) },
  D1: { name: 'Concrete – Garage Floor Slab', description: 'Cast M25 RCC slab 150mm thick for garage floor. Include 8mm anti-crack mesh. Surface finish to be broom textured.', category: 'Structural', priority: 'Medium', assignedTo: 'Kiran RCC Contractors', status: 'In Progress', progress: 80, startDate: date(2026,4,5), dueDate: date(2026,4,30) },
  A2: { name: 'Flooring – Living & Dining Area', description: 'Lay 600×600mm Kajaria vitrified tiles in living and dining area with 3mm joint. Polish and clean on completion.', category: 'Finishing', priority: 'High', assignedTo: 'Sunil Flooring Co.', status: 'Assigned', progress: 0, startDate: date(2026,5,20), dueDate: date(2026,6,10) },
  B2: { name: 'False Ceiling – Bedroom 2 & 3', description: 'Install 12mm gypsum board false ceiling with GI frame in Bedroom 2 and 3. Include downlight cutouts as per layout.', category: 'Finishing', priority: 'Medium', assignedTo: 'Arun Interior Works', status: 'Delayed', progress: 20, startDate: date(2026,5,1), dueDate: date(2026,5,18) },
  C2: { name: 'Waterproofing – Kitchen & Wet Areas', description: 'Apply crystalline waterproofing on kitchen floor and wall junction up to 300mm ht. Test 48h ponding before tiling.', category: 'Civil', priority: 'High', assignedTo: 'Mani Contractor (Waterproof)', status: 'Blocked', progress: 10, startDate: date(2026,4,25), dueDate: date(2026,5,5) },
  D2: { name: 'Door & Window Frames – Garage', description: 'Fix teak wood door frame and rolling shutter guide rails in garage opening as per BOQ. Paint with primer coat.', category: 'Finishing', priority: 'Medium', assignedTo: 'Lakshmi Carpentry Works', status: 'Assigned', progress: 0, startDate: date(2026,6,1), dueDate: date(2026,6,15) },
};

/**
 * Roof Plan  12b0ce29  (3 cols × 3 rows → 9 tasks)
 * A=West slope, B=Ridge, C=East slope / 1=N, 2=Centre, 3=S
 */
const ROOF_TASKS = {
  A1: { name: 'Rafter Installation – NW Slope', description: 'Erect 100×50mm teak rafters at 600mm c/c on NW roof slope. Fix to wall plate and ridge board. Plumb and level.', category: 'Structural', priority: 'High', assignedTo: 'Vijay Roofing Contractors', status: 'Completed', progress: 100, startDate: date(2026,4,15), dueDate: date(2026,5,5) },
  B1: { name: 'Ridge Board & Purlin – North', description: 'Install 200×50mm ridge board and 100×50mm purlins along north ridge. Bolt all connections, apply wood preservative.', category: 'Structural', priority: 'High', assignedTo: 'Vijay Roofing Contractors', status: 'Completed', progress: 100, startDate: date(2026,5,6), dueDate: date(2026,5,18) },
  C1: { name: 'Rafter Installation – NE Slope', description: 'Erect rafters on NE slope at 600mm c/c. Install blocking between rafters at eave line and mid-span. Safety net below.', category: 'Structural', priority: 'High', assignedTo: 'Vijay Roofing Contractors', status: 'Completed', progress: 100, startDate: date(2026,5,6), dueDate: date(2026,5,18) },
  A2: { name: 'Tile Fixing – West Slope (Mid)', description: 'Fix Mangalore clay roof tiles on west slope. Start from eave, stagger joints. Use tile clips every 3rd course.', category: 'Finishing', priority: 'High', assignedTo: 'Babu Tile Roofing', status: 'In Progress', progress: 70, startDate: date(2026,5,20), dueDate: date(2026,6,15) },
  B2: { name: 'Gutters & Downpipes – Centre Ridge', description: 'Install 125mm UPVC box gutters along centre ridge line. Fix 90mm downpipes at SW and SE corners with shoe bends.', category: 'Civil', priority: 'Medium', assignedTo: 'Plumber Raja & Co.', status: 'In Progress', progress: 45, startDate: date(2026,6,1), dueDate: date(2026,6,20) },
  C2: { name: 'Tile Fixing – East Slope (Mid)', description: 'Fix Mangalore clay roof tiles on east slope. Maintain 75mm lap. Flash at hip and valley with zinc sheet.', category: 'Finishing', priority: 'High', assignedTo: 'Babu Tile Roofing', status: 'Assigned', progress: 0, startDate: date(2026,6,16), dueDate: date(2026,7,5) },
  A3: { name: 'Overhang Fascia – SW Eave', description: 'Fix 25mm thick teak fascia board at SW overhang. Paint with 2 coats exterior enamel. Soffit vent in 3rd board.', category: 'Finishing', priority: 'Low', assignedTo: 'Lakshmi Carpentry Works', status: 'Assigned', progress: 0, startDate: date(2026,7,6), dueDate: date(2026,7,15) },
  B3: { name: 'Waterproofing – Ridge Cap', description: 'Bed and point ridge tiles in CM 1:3 with waterproof additive. Apply liquid waterproofing membrane at ridge joint.', category: 'Finishing', priority: 'Medium', assignedTo: 'Mani Contractor (Waterproof)', status: 'Assigned', progress: 0, startDate: date(2026,7,6), dueDate: date(2026,7,18) },
  C3: { name: 'Inspection & Handover – Roof', description: 'Final inspection of entire roof: check tile bedding, gutter flow, downpipe connections, overhang soffit. Issue completion report.', category: 'QC', priority: 'High', assignedTo: 'Rajesh Patel (Site Engineer)', status: 'Assigned', progress: 0, startDate: date(2026,7,19), dueDate: date(2026,7,25) },
};

/**
 * Electrical Layout Plan  628bde45  (6 cols × 3 rows → 18 tasks)
 * Cols A–F = DB1, L1, L2, Fan, L3, AC1 / Rows 1–3 (levels)
 */
const ELECTRICAL_TASKS = {
  A1: { name: 'Main DB – Install Distribution Board DB1', description: 'Fix 12-way RCCB DB1 with 63A main MCB and 6 sub-circuit MCBs. Earth connection, cable labelling, load balancing.', category: 'MEP', priority: 'High', assignedTo: 'Electro Raj & Co.', status: 'Completed', progress: 100, startDate: date(2026,4,10), dueDate: date(2026,4,18) },
  B1: { name: 'Light Point – Living Room L1', description: 'Provide concealed conduit, 1.5mm² wiring and 1-way switch for ceiling light L1 in living room. LED batten 36W.', category: 'MEP', priority: 'Medium', assignedTo: 'Electro Raj & Co.', status: 'Completed', progress: 100, startDate: date(2026,4,19), dueDate: date(2026,4,25) },
  C1: { name: 'Light Point – Master Bedroom L2', description: 'Concealed conduit and wiring for master bedroom ceiling light L2. 2-way switching at door and bedside.', category: 'MEP', priority: 'Medium', assignedTo: 'Electro Raj & Co.', status: 'Completed', progress: 100, startDate: date(2026,4,19), dueDate: date(2026,4,25) },
  D1: { name: 'Ceiling Fan – Living Room Fan1', description: 'Provide fan box, 2.5mm² wiring, 3-speed regulator for ceiling fan in living room. Fan blade height 2.4m from FL.', category: 'MEP', priority: 'Medium', assignedTo: 'Electro Raj & Co.', status: 'Completed', progress: 100, startDate: date(2026,4,26), dueDate: date(2026,5,2) },
  E1: { name: 'Light Point – Bedroom 2 L3', description: 'Concealed conduit and 1.5mm² wiring for bedroom 2 ceiling light L3. Include 1-way switch near door.', category: 'MEP', priority: 'Medium', assignedTo: 'Electro Raj & Co.', status: 'Completed', progress: 100, startDate: date(2026,4,26), dueDate: date(2026,5,2) },
  F1: { name: 'AC Point – Master Bedroom AC1', description: 'Dedicated 2.5mm² circuit from DB1, 16A socket, 32A MCB for 1.5T split AC in master bedroom. GI conduit exposed.', category: 'MEP', priority: 'High', assignedTo: 'Electro Raj & Co.', status: 'Completed', progress: 100, startDate: date(2026,5,3), dueDate: date(2026,5,10) },
  A2: { name: 'Socket Points – Living & Dining Row', description: 'Install 4 nos. 6-pin sockets and 2 nos. USB charging points in living room. Concealed conduit, 2.5mm² wiring.', category: 'MEP', priority: 'Medium', assignedTo: 'Suresh Electricals', status: 'In Progress', progress: 75, startDate: date(2026,5,12), dueDate: date(2026,5,28) },
  B2: { name: 'Switch Boards – Bedroom Row (S1)', description: 'Fix 8-module modular switch boards in bedrooms 2 and 3. Include 1-way switches, 5A sockets and TV/data points.', category: 'MEP', priority: 'Medium', assignedTo: 'Suresh Electricals', status: 'In Progress', progress: 60, startDate: date(2026,5,12), dueDate: date(2026,5,30) },
  C2: { name: 'Power Wiring – Kitchen Appliances L5', description: '2.5mm² dedicated circuits for refrigerator, microwave, dishwasher in kitchen. Isolator switch inside cabinet.', category: 'MEP', priority: 'High', assignedTo: 'Suresh Electricals', status: 'In Progress', progress: 40, startDate: date(2026,5,15), dueDate: date(2026,6,5) },
  D2: { name: 'Light Point – Bathroom & Toilet S2', description: 'IP44 rated downlights in bathrooms. GFCI/RCD protected socket for exhaust fan. Waterproof switch outside.', category: 'MEP', priority: 'High', assignedTo: 'Suresh Electricals', status: 'Delayed', progress: 25, startDate: date(2026,5,18), dueDate: date(2026,5,30) },
  E2: { name: 'Sub-DB – Bedroom Zone DB2', description: 'Install 6-way sub-DB2 for bedroom wing circuits. Feeds from main DB1 via 10mm² cable. Label all breakers.', category: 'MEP', priority: 'Medium', assignedTo: 'Electro Raj & Co.', status: 'Assigned', progress: 0, startDate: date(2026,6,1), dueDate: date(2026,6,10) },
  F2: { name: 'Outdoor Light – Exterior L6', description: 'Install 4 nos. weather-proof outdoor wall lights at facade and porch. 2.5mm² armoured cable from DB1.', category: 'MEP', priority: 'Medium', assignedTo: 'Suresh Electricals', status: 'Assigned', progress: 0, startDate: date(2026,6,10), dueDate: date(2026,6,20) },
  A3: { name: 'AC Point – Bedroom 2 AC2', description: '2.5mm² dedicated AC circuit for bedroom 2 split AC unit. Include isolator switch adjacent to unit.', category: 'MEP', priority: 'Medium', assignedTo: 'Electro Raj & Co.', status: 'Assigned', progress: 0, startDate: date(2026,6,5), dueDate: date(2026,6,15) },
  B3: { name: 'Light – Staircase & Corridor L7', description: 'Install motion-sensor light at staircase landing. PIR sensor, 10W LED, 2-way switch at top and bottom.', category: 'MEP', priority: 'Low', assignedTo: 'Suresh Electricals', status: 'Assigned', progress: 0, startDate: date(2026,6,15), dueDate: date(2026,6,25) },
  C3: { name: 'Switch Points – Kitchen S3', description: 'Modular 4-module switch board in kitchen for exhaust fan, chimney, RO, light. IP44 rated near sink area.', category: 'MEP', priority: 'Medium', assignedTo: 'Suresh Electricals', status: 'Assigned', progress: 0, startDate: date(2026,6,10), dueDate: date(2026,6,22) },
  D3: { name: 'Ceiling Fan – Bedroom 3 Fan2', description: 'Fan point wiring 2.5mm², fan hook box, 3-speed electronic regulator for bedroom 3 ceiling fan.', category: 'MEP', priority: 'Low', assignedTo: 'Suresh Electricals', status: 'Assigned', progress: 0, startDate: date(2026,6,20), dueDate: date(2026,6,30) },
  E3: { name: 'Earthing – Ground Electrode System', description: 'Install 3m GI earth electrode with inspection chamber. Connect to main DB and all metalwork. Test earth resistance <5Ω.', category: 'MEP', priority: 'High', assignedTo: 'Electro Raj & Co.', status: 'Assigned', progress: 0, startDate: date(2026,6,25), dueDate: date(2026,7,5) },
  F3: { name: 'Testing & Commissioning – All Circuits', description: 'Megger test all circuits, check polarity, RCD trip time, load balancing. Issue electrical completion certificate.', category: 'QC', priority: 'High', assignedTo: 'Rajesh Patel (Site Engineer)', status: 'Assigned', progress: 0, startDate: date(2026,7,8), dueDate: date(2026,7,15) },
};

/**
 * Plumbing and Drainage Plan  e2cab291  (4 cols × 3 rows → 12 tasks)
 * A=WC/Toilet, B=Basin/Shower, C=Bath/Drain, D=Geyser/Sump/Tank/Pump
 */
const PLUMBING_TASKS = {
  A1: { name: 'Water Closet WC1 – Toilet 1 Installation', description: 'Fix wall-hung EWC pan, concealed cistern and flush valve in toilet 1. CPVC inlet pipe, PVC 110mm outlet. Waterproof seal.', category: 'MEP', priority: 'High', assignedTo: 'Plumber Raja & Co.', status: 'Completed', progress: 100, startDate: date(2026,5,1), dueDate: date(2026,5,10) },
  B1: { name: 'Basin 1 – Master Bathroom Wash Basin', description: 'Fix counter-top wash basin on granite vanity. Concealed CPVC supply, P-trap and PVC 50mm waste. Single-lever faucet.', category: 'MEP', priority: 'High', assignedTo: 'Plumber Raja & Co.', status: 'Completed', progress: 100, startDate: date(2026,5,5), dueDate: date(2026,5,12) },
  C1: { name: 'Water Closet WC2 – Common Bathroom', description: 'Fix floor-mounted WC and cistern in common bathroom. Include 110mm soil pipe run to external stack.', category: 'MEP', priority: 'High', assignedTo: 'Plumber Raja & Co.', status: 'Completed', progress: 100, startDate: date(2026,5,5), dueDate: date(2026,5,12) },
  D1: { name: 'Shower – Common Bathroom Shower Unit', description: 'Install concealed thermostatic shower mixer and overhead rain shower on 25mm CPVC riser. Test pressure 3 bar.', category: 'MEP', priority: 'Medium', assignedTo: 'Plumber Raja & Co.', status: 'In Progress', progress: 80, startDate: date(2026,5,13), dueDate: date(2026,5,22) },
  A2: { name: 'Kitchen Sink – Double Bowl Stainless Steel', description: 'Fix 1016×508mm SS double bowl kitchen sink on granite counter. CPVC hot & cold supply, P-trap, PVC waste.', category: 'MEP', priority: 'High', assignedTo: 'Plumber Raja & Co.', status: 'In Progress', progress: 50, startDate: date(2026,5,20), dueDate: date(2026,6,2) },
  B2: { name: 'Floor Drains – All Wet Areas', description: 'Install 100×100mm stainless floor drains in bathrooms, kitchen and utility. Connect to 75mm waste network.', category: 'MEP', priority: 'Medium', assignedTo: 'Plumber Raja & Co.', status: 'In Progress', progress: 35, startDate: date(2026,5,22), dueDate: date(2026,6,5) },
  C2: { name: 'Bathtub – Master Bathroom Freestanding', description: 'Install 1700mm acrylic freestanding bathtub on anti-vibration feet. Connect overflow, drain and chrome waste trap.', category: 'MEP', priority: 'Medium', assignedTo: 'Plumber Raja & Co.', status: 'Delayed', progress: 15, startDate: date(2026,5,25), dueDate: date(2026,6,5) },
  D2: { name: 'Basin 2 – Bedroom 2 Ensuite Basin', description: 'Wall-hung wash basin in bedroom 2 ensuite. Pedestal CPVC supply pipes, bottle trap, chrome mixer tap.', category: 'MEP', priority: 'Low', assignedTo: 'Plumber Raja & Co.', status: 'Assigned', progress: 0, startDate: date(2026,6,10), dueDate: date(2026,6,18) },
  A3: { name: 'Geyser – 25L Electric Geyser (Master Bath)', description: 'Wall-mount 25L Racold electric geyser. Dedicated 2.5mm² circuit, pressure relief valve, inlet filter. Test 24h.', category: 'MEP', priority: 'High', assignedTo: 'Suresh Electricals + Plumber Raja', status: 'Assigned', progress: 0, startDate: date(2026,6,12), dueDate: date(2026,6,20) },
  B3: { name: 'Underground Sump – 10,000L RCC', description: 'Cast RCC sump 10kL below grade. Waterproof with crystalline coat inside. Overflow, inlet, outlet pipes in 110mm UPVC.', category: 'Civil', priority: 'High', assignedTo: 'Kiran RCC Contractors', status: 'Assigned', progress: 0, startDate: date(2026,6,5), dueDate: date(2026,6,25) },
  C3: { name: 'Overhead Tank – 2000L HDPE Terrace', description: 'Install 2000L HDPE overhead tank on MS frame at terrace. Float valve, inlet/outlet 25mm CPVC, overflow pipe.', category: 'Civil', priority: 'High', assignedTo: 'Plumber Raja & Co.', status: 'Assigned', progress: 0, startDate: date(2026,6,26), dueDate: date(2026,7,5) },
  D3: { name: 'Booster Pump – 1HP Water Pump', description: 'Install 1HP centrifugal pump from sump to overhead tank. Auto-float switch, check valve, pressure gauge. Monthly service due.', category: 'MEP', priority: 'Medium', assignedTo: 'Plumber Raja & Co.', status: 'Assigned', progress: 0, startDate: date(2026,7,6), dueDate: date(2026,7,12) },
};

/**
 * Interior Finishing Plan  3efd90a6  (4 cols × 3 rows → 12 tasks)
 * A=Living/Kitchen, B=Master Bed, C=Bed2&3, D=Garage&Service
 */
const FINISHING_TASKS = {
  A1: { name: 'Putty & Primer – Living / Dining Walls', description: 'Apply 2 coats of white cement putty, sand between coats, 1 coat primer in living & dining. Surface must be smooth before painting.', category: 'Finishing', priority: 'High', assignedTo: 'Colour Craft Painters', status: 'Completed', progress: 100, startDate: date(2026,6,1), dueDate: date(2026,6,18) },
  B1: { name: 'Paint – Master Bedroom (Asian Paints Royale)', description: '2 coats Asian Paints Royale Shyne on master bedroom walls. Colour: Ivory White (7020). Ceiling: White Emulsion 2 coats.', category: 'Finishing', priority: 'High', assignedTo: 'Colour Craft Painters', status: 'Completed', progress: 100, startDate: date(2026,6,19), dueDate: date(2026,6,30) },
  C1: { name: 'Paint – Bedroom 2 & 3', description: 'Royale Shyne on bedroom 2 (Pale Blue 7031) and bedroom 3 (Warm Cream 7022) walls. 2 coats on all surfaces.', category: 'Finishing', priority: 'High', assignedTo: 'Colour Craft Painters', status: 'In Progress', progress: 65, startDate: date(2026,7,1), dueDate: date(2026,7,18) },
  D1: { name: 'Garage Floor – Epoxy Coating', description: 'Surface prep: diamond grind floor, apply 2 coats of epoxy floor paint with anti-slip quartz aggregate. Demarcation lines.', category: 'Finishing', priority: 'Medium', assignedTo: 'Epoxy Floor Solutions', status: 'In Progress', progress: 30, startDate: date(2026,7,5), dueDate: date(2026,7,20) },
  A2: { name: 'Modular Kitchen – Installation', description: 'Install L-shaped modular kitchen: base cabinets, wall cabinets, granite counter top, chimney, hob and sink as per BOQ.', category: 'Finishing', priority: 'High', assignedTo: 'Ashoka Modular Kitchen Co.', status: 'Assigned', progress: 0, startDate: date(2026,7,20), dueDate: date(2026,8,5) },
  B2: { name: 'Wardrobe – Master Bedroom Built-in', description: 'Fabricate and install 2400mm wide × 2100mm high sliding wardrobe. 18mm BWP plywood, laminate finish, soft-close shutters.', category: 'Finishing', priority: 'Medium', assignedTo: 'Lakshmi Carpentry Works', status: 'Delayed', progress: 10, startDate: date(2026,7,10), dueDate: date(2026,7,25) },
  C2: { name: 'Doors – HDF Panel Doors (Bedrooms 2 & 3)', description: 'Fix 2100×900mm HDF moulded panel doors with teak frame in bedrooms 2 and 3. Mortise lock, tower bolts, door stopper.', category: 'Finishing', priority: 'High', assignedTo: 'Lakshmi Carpentry Works', status: 'Assigned', progress: 0, startDate: date(2026,7,22), dueDate: date(2026,8,2) },
  D2: { name: 'Roller Shutter – Garage Door', description: 'Supply and install motorised 5m wide × 2.4m high galvanised steel roller shutter. Remote + manual override. Paint RAL7035.', category: 'Finishing', priority: 'Medium', assignedTo: 'Metro Roller Shutters', status: 'Assigned', progress: 0, startDate: date(2026,8,5), dueDate: date(2026,8,15) },
  A3: { name: 'False Ceiling – Living Room Gypsum', description: '12mm gypsum board false ceiling at 2700mm ht in living room. Cove profile at perimeter. 6 downlight cutouts.', category: 'Finishing', priority: 'Medium', assignedTo: 'Arun Interior Works', status: 'Assigned', progress: 0, startDate: date(2026,7,25), dueDate: date(2026,8,10) },
  B3: { name: 'Grills & Safety Rails – Windows', description: 'Fix MS window safety grills on all bedrooms and living room windows. Hot-dip galvanise + enamel paint. Anchor to RCC.', category: 'Finishing', priority: 'Low', assignedTo: 'Ramesh Fabrication Works', status: 'Assigned', progress: 0, startDate: date(2026,8,10), dueDate: date(2026,8,20) },
  C3: { name: 'Main Door – Teak Wood Panel Door', description: 'Fix 2100×1050mm teak wood main door with brass fittings, digital lock and peephole. Wood polish 3 coats (NC lacquer).', category: 'Finishing', priority: 'High', assignedTo: 'Premium Teak Works', status: 'Assigned', progress: 0, startDate: date(2026,8,12), dueDate: date(2026,8,22) },
  D3: { name: 'Final Snag & Completion Certificate', description: 'Walk-through inspection: check all works, create snag list, rectify, issue practical completion certificate. Hand keys to owner.', category: 'QC', priority: 'High', assignedTo: 'Rajesh Patel (Site Engineer)', status: 'Assigned', progress: 0, startDate: date(2026,8,25), dueDate: date(2026,8,31) },
};

// ─── Map drawing IDs → task patches ───────────────────────────────────────────

const DRAWING_TASKS = {
  'ab7b4fc3-2641-4a22-a0cd-e17c33f73d00': FOUNDATION_TASKS,
  'ded710c4-2eb9-41c3-a235-d24ee29263d6': GROUND_FLOOR_TASKS,
  '12b0ce29-ff25-46d2-bc99-fb8c3529bc79': ROOF_TASKS,
  '628bde45-dcdc-4ae5-b635-4e6301496968': ELECTRICAL_TASKS,
  'e2cab291-8be9-467d-b334-24fd13ccd4a1': PLUMBING_TASKS,
  '3efd90a6-309c-4497-b41b-28c347ea0122': FINISHING_TASKS,
};

const DRAWING_NAMES = {
  'ab7b4fc3-2641-4a22-a0cd-e17c33f73d00': 'Foundation Plan',
  'ded710c4-2eb9-41c3-a235-d24ee29263d6': 'Ground Floor Plan',
  '12b0ce29-ff25-46d2-bc99-fb8c3529bc79': 'Roof Plan',
  '628bde45-dcdc-4ae5-b635-4e6301496968': 'Electrical Layout Plan',
  'e2cab291-8be9-467d-b334-24fd13ccd4a1': 'Plumbing and Drainage Plan',
  '3efd90a6-309c-4497-b41b-28c347ea0122': 'Interior Finishing Plan',
};

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding realistic construction task data for House Building Project...\n');

  for (const [drawingId, taskDefs] of Object.entries(DRAWING_TASKS)) {
    console.log(`\n📐 ${DRAWING_NAMES[drawingId]}`);
    const tasks = await fetchTasks(drawingId);
    let ok = 0, fail = 0;

    for (const task of tasks) {
      const patch = taskDefs[task.gridCode];
      if (!patch) {
        console.log(`  ⚠️  No patch defined for ${task.gridCode} (id=${task.id})`);
        continue;
      }
      try {
        await patchTask(task.id, patch);
        const { status, progress, assignedTo } = patch;
        console.log(`  ✅ ${task.gridCode} → "${patch.name.slice(0,55)}..." [${status} ${progress}%] @${assignedTo.split('(')[0].trim()}`);
        ok++;
      } catch (err) {
        console.log(`  ❌ ${task.gridCode} failed: ${err.message}`);
        fail++;
      }
    }
    console.log(`     → ${ok} updated, ${fail} failed`);
  }

  console.log('\n✅ All task data seeded!');
  console.log('Open: https://buildtrack-withdrawing.onslate.in/projects');
}

main().catch(err => { console.error('\nFailed:', err.message || err); process.exit(1); });
