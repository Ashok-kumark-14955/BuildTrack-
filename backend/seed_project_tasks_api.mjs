/**
 * seed_project_tasks_api.mjs
 *
 * Seeds sample construction tasks for both projects via the production API.
 * Uses the fixed /api/project-tasks endpoint (which now uses SDK insertRow).
 *
 * Usage:
 *   node backend/seed_project_tasks_api.mjs
 */

const BASE_URL = 'https://buildtrack-backend-50044693287.development.catalystappsail.in';

const PROJECTS = {
  HOUSE: 'b0af18f2-99dc-4ab8-8496-09d779343c8b',
  APEX: 'd925af2e-56fe-44d9-a6dd-bc23a50f81a8',
};

const MILESTONES = {
  // House Building Project
  HOUSE_FOUNDATION: '3d9bae5a-3965-4467-b707-f131e2e1cec6',
  HOUSE_STRUCTURE: '79c443f3-517c-4099-a47b-69dca2905298',
  HOUSE_ROOFING: '6883bb07-59c3-41ef-a319-7dc224835380',
  HOUSE_MEP: '8bed5e93-c85f-446a-a830-7c6ea24de401',
  HOUSE_INTERIOR: '47cc2711-099b-4e68-8ffb-6c35284372fa',
  // Apex Steel Industrial Complex
  APEX_FOUNDATION: '94180c1e-b60c-4e71-9987-22301abfea14',
  APEX_GROUND: 'b51e41a0-a6d7-4162-aaef-005385425c60',
  APEX_TOWER: '4d7bf39f-6922-4f79-afce-8b81145e2f71',
  APEX_ENVELOPE: '94d398c9-5818-4bd9-90a3-19107e0dd7db',
  APEX_FITOUT: 'e38c399a-bde3-4428-a3b1-3c2e2e898d87',
};

// ─── House Building Project Tasks ────────────────────────────────────────────
const HOUSE_TASKS = [
  // Milestone 1 – Site Preparation & Foundation
  {
    name: 'Site Survey & Setting Out',
    description: 'Conduct topographic survey, establish benchmarks and set out building lines using total station.',
    priority: 'High',
    status: 'Completed',
    assignee: 'Ravi Kumar',
    dueDate: '2026-03-15',
    estimatedHours: 16,
    tags: ['Survey', 'Site Prep'],
    milestoneId: MILESTONES.HOUSE_FOUNDATION,
  },
  {
    name: 'Soil Excavation & Grading',
    description: 'Excavate to required depth as per drawing. Grade and level the site. Dispose of excess soil.',
    priority: 'High',
    status: 'Completed',
    assignee: 'Suresh Nair',
    dueDate: '2026-03-22',
    estimatedHours: 40,
    tags: ['Excavation', 'Site Prep'],
    milestoneId: MILESTONES.HOUSE_FOUNDATION,
  },
  {
    name: 'PCC (Plain Cement Concrete) Laying',
    description: 'Lay 100mm thick PCC M10 grade as bed for foundation footings as per structural drawings.',
    priority: 'High',
    status: 'Completed',
    assignee: 'Suresh Nair',
    dueDate: '2026-03-28',
    estimatedHours: 24,
    tags: ['Concrete', 'Foundation'],
    milestoneId: MILESTONES.HOUSE_FOUNDATION,
  },
  {
    name: 'Foundation Reinforcement & Concreting',
    description: 'Place reinforcement steel as per structural drawings. Pour M20 grade concrete for column footings and tie beams.',
    priority: 'High',
    status: 'In Progress',
    assignee: 'Mohan Raj',
    dueDate: '2026-04-10',
    estimatedHours: 80,
    tags: ['Reinforcement', 'Concrete', 'Foundation'],
    milestoneId: MILESTONES.HOUSE_FOUNDATION,
  },
  {
    name: 'Waterproofing of Foundation',
    description: 'Apply two coats of bituminous waterproofing compound on foundation walls below grade.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Ravi Kumar',
    dueDate: '2026-04-15',
    estimatedHours: 12,
    tags: ['Waterproofing', 'Foundation'],
    milestoneId: MILESTONES.HOUSE_FOUNDATION,
  },

  // Milestone 2 – Structural Works
  {
    name: 'Ground Floor Column Casting',
    description: 'Erect formwork, place column reinforcement and pour M25 concrete for all ground floor columns.',
    priority: 'High',
    status: 'In Progress',
    assignee: 'Mohan Raj',
    dueDate: '2026-04-25',
    estimatedHours: 60,
    tags: ['Columns', 'Concrete', 'Structure'],
    milestoneId: MILESTONES.HOUSE_STRUCTURE,
  },
  {
    name: 'First Floor Beam & Slab Formwork',
    description: 'Erect staging, props and plywood formwork for first floor beams and slab as per drawing.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Suresh Nair',
    dueDate: '2026-05-05',
    estimatedHours: 48,
    tags: ['Formwork', 'Slab', 'Structure'],
    milestoneId: MILESTONES.HOUSE_STRUCTURE,
  },
  {
    name: 'First Floor Beam & Slab Reinforcement',
    description: 'Place and tie all beam and slab reinforcement as per structural drawings. Get inspection done.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Mohan Raj',
    dueDate: '2026-05-15',
    estimatedHours: 72,
    tags: ['Reinforcement', 'Slab', 'Structure'],
    milestoneId: MILESTONES.HOUSE_STRUCTURE,
  },
  {
    name: 'First Floor Slab Concreting',
    description: 'Pour M25 grade concrete for first floor slab. Compact with needle vibrator. Cure for 28 days.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Mohan Raj',
    dueDate: '2026-05-20',
    estimatedHours: 32,
    tags: ['Concrete', 'Slab'],
    milestoneId: MILESTONES.HOUSE_STRUCTURE,
  },
  {
    name: 'Brickwork – Ground & First Floor',
    description: 'Construct 230mm and 115mm thick brick walls with CM 1:6 mortar as per architectural drawings.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Ravi Kumar',
    dueDate: '2026-06-10',
    estimatedHours: 120,
    tags: ['Brickwork', 'Masonry'],
    milestoneId: MILESTONES.HOUSE_STRUCTURE,
  },

  // Milestone 3 – Roofing & Weatherproofing
  {
    name: 'Roof Slab Waterproofing',
    description: 'Apply APP torch-on membrane waterproofing system on terrace slab. Lay protection screed.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Ravi Kumar',
    dueDate: '2026-06-25',
    estimatedHours: 24,
    tags: ['Waterproofing', 'Roofing'],
    milestoneId: MILESTONES.HOUSE_ROOFING,
  },
  {
    name: 'Parapet Wall & Coping',
    description: 'Construct parapet walls as per drawing. Fix precast coping stones with cement mortar.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Suresh Nair',
    dueDate: '2026-07-05',
    estimatedHours: 30,
    tags: ['Masonry', 'Roofing'],
    milestoneId: MILESTONES.HOUSE_ROOFING,
  },
  {
    name: 'Window & Door Frame Installation',
    description: 'Fix UPVC window frames and teak wood door frames at all openings as per schedule.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Ravi Kumar',
    dueDate: '2026-07-10',
    estimatedHours: 40,
    tags: ['Carpentry', 'Doors', 'Windows'],
    milestoneId: MILESTONES.HOUSE_ROOFING,
  },

  // Milestone 4 – MEP
  {
    name: 'Electrical Conduit & Wiring',
    description: 'Lay concealed PVC conduits, pull wires, install DB boards and connect switches/sockets.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Ajith Menon',
    dueDate: '2026-07-25',
    estimatedHours: 80,
    tags: ['Electrical', 'MEP'],
    milestoneId: MILESTONES.HOUSE_MEP,
  },
  {
    name: 'Plumbing – CPVC Supply Lines',
    description: 'Install CPVC water supply pipes, valves and bathroom CP fittings as per plumbing layout drawing.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Pradeep Pillai',
    dueDate: '2026-07-30',
    estimatedHours: 60,
    tags: ['Plumbing', 'MEP'],
    milestoneId: MILESTONES.HOUSE_MEP,
  },
  {
    name: 'Sanitary & Drainage Lines',
    description: 'Lay PVC drainage pipes, connect WCs and floor traps. Test for leaks before plastering.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Pradeep Pillai',
    dueDate: '2026-08-05',
    estimatedHours: 40,
    tags: ['Plumbing', 'Drainage', 'MEP'],
    milestoneId: MILESTONES.HOUSE_MEP,
  },

  // Milestone 5 – Interior Finishing
  {
    name: 'Internal Plastering',
    description: 'Apply 12mm thick CM 1:4 plaster on all internal walls. Neeru finish on ceiling.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Ravi Kumar',
    dueDate: '2026-08-25',
    estimatedHours: 96,
    tags: ['Plastering', 'Finishing'],
    milestoneId: MILESTONES.HOUSE_INTERIOR,
  },
  {
    name: 'Floor Tiling – Vitrified Tiles',
    description: 'Lay 600x600mm vitrified tiles in all rooms using adhesive mortar. Polish and clean on completion.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Suresh Nair',
    dueDate: '2026-09-10',
    estimatedHours: 80,
    tags: ['Tiling', 'Flooring', 'Finishing'],
    milestoneId: MILESTONES.HOUSE_INTERIOR,
  },
  {
    name: 'Interior Painting – 2 Coats Emulsion',
    description: 'Apply primer + 2 coats Tractor Emulsion on internal walls. External weatherproof paint on façade.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Ravi Kumar',
    dueDate: '2026-09-25',
    estimatedHours: 64,
    tags: ['Painting', 'Finishing'],
    milestoneId: MILESTONES.HOUSE_INTERIOR,
  },
  {
    name: 'Final Handover & Snag Clearance',
    description: 'Walk through all rooms with client. Create snag list and clear all pending items before handover.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Mohan Raj',
    dueDate: '2026-10-05',
    estimatedHours: 16,
    tags: ['Handover', 'QC'],
    milestoneId: MILESTONES.HOUSE_INTERIOR,
  },
];

// ─── Apex Steel Industrial Complex Tasks ─────────────────────────────────────
const APEX_TASKS = [
  // M1 – Substructure & Foundation
  {
    name: 'Geotechnical Investigation & Soil Report',
    description: 'Carry out bore holes and SPT tests at 5 locations. Submit soil investigation report for foundation design.',
    priority: 'High',
    status: 'Completed',
    assignee: 'Dr. Sathish Rao',
    dueDate: '2026-02-20',
    estimatedHours: 40,
    tags: ['Geotechnical', 'Investigation'],
    milestoneId: MILESTONES.APEX_FOUNDATION,
  },
  {
    name: 'Bulk Earthwork & Compaction',
    description: 'Bulk excavation to formation level. Compact subgrade to 98% Proctor density in 200mm layers.',
    priority: 'High',
    status: 'Completed',
    assignee: 'G. Venkatesh',
    dueDate: '2026-03-10',
    estimatedHours: 120,
    tags: ['Excavation', 'Earthwork'],
    milestoneId: MILESTONES.APEX_FOUNDATION,
  },
  {
    name: 'Pile Foundation – Bored Cast-in-Situ',
    description: 'Bore 500mm dia piles to design depth. Reinforce and grout. Conduct PDA test on 2% of piles.',
    priority: 'High',
    status: 'Completed',
    assignee: 'G. Venkatesh',
    dueDate: '2026-03-30',
    estimatedHours: 200,
    tags: ['Piling', 'Foundation'],
    milestoneId: MILESTONES.APEX_FOUNDATION,
  },
  {
    name: 'Pile Cap & Grade Beam Construction',
    description: 'Construct M30 reinforced pile caps and 600mm deep grade beams as per structural drawings.',
    priority: 'High',
    status: 'In Progress',
    assignee: 'Arun Krishnamurthy',
    dueDate: '2026-04-20',
    estimatedHours: 160,
    tags: ['Concrete', 'Foundation', 'Grade Beam'],
    milestoneId: MILESTONES.APEX_FOUNDATION,
  },

  // M2 – Ground Floor Structure
  {
    name: 'Ground Floor Column Erection (Steel)',
    description: 'Fabricate and erect 200+ steel columns as per structural drawings. Grouted base plates.',
    priority: 'High',
    status: 'In Progress',
    assignee: 'Arun Krishnamurthy',
    dueDate: '2026-05-15',
    estimatedHours: 240,
    tags: ['Steel', 'Columns', 'Erection'],
    milestoneId: MILESTONES.APEX_GROUND,
  },
  {
    name: 'Ground Floor Primary & Secondary Beams',
    description: 'Erect primary I-beams and secondary C-channel purlins on ground floor frame. Torque-tighten all bolts.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Arun Krishnamurthy',
    dueDate: '2026-05-30',
    estimatedHours: 180,
    tags: ['Steel', 'Beams', 'Erection'],
    milestoneId: MILESTONES.APEX_GROUND,
  },
  {
    name: 'Ground Floor Composite Deck Slab',
    description: 'Lay composite metal decking, place reinforcement mesh and pour M30 concrete slab (130mm thick).',
    priority: 'High',
    status: 'To Do',
    assignee: 'Subramaniam P.',
    dueDate: '2026-06-15',
    estimatedHours: 200,
    tags: ['Concrete', 'Decking', 'Slab'],
    milestoneId: MILESTONES.APEX_GROUND,
  },
  {
    name: 'High-Bay Racking Foundation Bolts',
    description: 'Install and grout 900+ anchor bolts for high-bay racking system as per layout drawing.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'G. Venkatesh',
    dueDate: '2026-06-25',
    estimatedHours: 80,
    tags: ['Anchors', 'Racking', 'Foundation'],
    milestoneId: MILESTONES.APEX_GROUND,
  },

  // M3 – Tower Structure Floors 1–6
  {
    name: 'Floors 1–3 Column & Beam Erection',
    description: 'Erect structural steel frame for floors 1 to 3. Align plumb and level. Permanent bolt-up.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Arun Krishnamurthy',
    dueDate: '2026-07-20',
    estimatedHours: 320,
    tags: ['Steel', 'Structure', 'Erection'],
    milestoneId: MILESTONES.APEX_TOWER,
  },
  {
    name: 'Floors 4–6 Column & Beam Erection',
    description: 'Erect structural steel frame for floors 4 to 6. Includes staircase landing beams and lift well structure.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Arun Krishnamurthy',
    dueDate: '2026-08-15',
    estimatedHours: 280,
    tags: ['Steel', 'Structure', 'Erection'],
    milestoneId: MILESTONES.APEX_TOWER,
  },
  {
    name: 'Floor Slabs – Levels 1 to 6',
    description: 'Place composite decking, reinforcement and pour M30 concrete for all 6 floor slabs.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Subramaniam P.',
    dueDate: '2026-09-10',
    estimatedHours: 480,
    tags: ['Concrete', 'Decking', 'Slab'],
    milestoneId: MILESTONES.APEX_TOWER,
  },
  {
    name: 'Fire Protection – Intumescent Coating on Steelwork',
    description: 'Apply intumescent paint to all structural steel members to achieve 120-min fire rating.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Rajan Fire Protection Ltd.',
    dueDate: '2026-09-30',
    estimatedHours: 200,
    tags: ['Fire Protection', 'Painting', 'Steel'],
    milestoneId: MILESTONES.APEX_TOWER,
  },

  // M4 – Building Envelope & MEP Rough-In
  {
    name: 'Roof Sheeting – Insulated Metal Panels',
    description: 'Fix 75mm PIR insulated sandwich roof panels on steel purlins. Include ridge cap and gutter.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Apex Cladding Works',
    dueDate: '2026-10-20',
    estimatedHours: 160,
    tags: ['Roofing', 'Cladding', 'Envelope'],
    milestoneId: MILESTONES.APEX_ENVELOPE,
  },
  {
    name: 'Wall Cladding – Metal Façade Panels',
    description: 'Install perforated metal cladding panels and glazed curtain wall system on all elevations.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Apex Cladding Works',
    dueDate: '2026-11-05',
    estimatedHours: 240,
    tags: ['Cladding', 'Façade', 'Envelope'],
    milestoneId: MILESTONES.APEX_ENVELOPE,
  },
  {
    name: 'HVAC Ductwork Rough-In',
    description: 'Fabricate and install GI ductwork, AHUs and exhaust fans as per HVAC design drawings.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Cool Air MEP Pvt Ltd',
    dueDate: '2026-11-20',
    estimatedHours: 320,
    tags: ['HVAC', 'MEP', 'Ductwork'],
    milestoneId: MILESTONES.APEX_ENVELOPE,
  },
  {
    name: 'Electrical Main LV Panel & Busbar Trunking',
    description: 'Install main LV panel (1600A), busbar trunking risers and floor distribution boards.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Bharath Electricals',
    dueDate: '2026-11-30',
    estimatedHours: 200,
    tags: ['Electrical', 'MEP', 'LV Panel'],
    milestoneId: MILESTONES.APEX_ENVELOPE,
  },

  // M5 – Fit-Out, Handover & Commissioning
  {
    name: 'Fire Suppression System Installation',
    description: 'Install wet pipe sprinkler system, FM-200 suppression in server room and fire hydrant ring main.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Rajan Fire Protection Ltd.',
    dueDate: '2026-12-15',
    estimatedHours: 280,
    tags: ['Fire Safety', 'MEP', 'Suppression'],
    milestoneId: MILESTONES.APEX_FITOUT,
  },
  {
    name: 'Raised Access Flooring – Office Zones',
    description: 'Install 600x600mm steel access floor panels with adjustable pedestals in office floors 3–6.',
    priority: 'Medium',
    status: 'To Do',
    assignee: 'Interior Finishes Co.',
    dueDate: '2026-12-25',
    estimatedHours: 160,
    tags: ['Flooring', 'Fit-Out', 'Office'],
    milestoneId: MILESTONES.APEX_FITOUT,
  },
  {
    name: 'Commissioning – HVAC, Electrical & Fire Systems',
    description: 'Test and commission all MEP systems. Conduct TAB (Test, Adjust, Balance) for HVAC. Thermographic scan.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Project Manager',
    dueDate: '2027-01-10',
    estimatedHours: 120,
    tags: ['Commissioning', 'MEP', 'Testing'],
    milestoneId: MILESTONES.APEX_FITOUT,
  },
  {
    name: 'Final Inspection & Authority Clearances',
    description: 'Obtain OC from local authority. Fire NOC, lift inspection certificate and BMS commissioning sign-off.',
    priority: 'High',
    status: 'To Do',
    assignee: 'Project Manager',
    dueDate: '2027-01-20',
    estimatedHours: 40,
    tags: ['Regulatory', 'Handover', 'OC'],
    milestoneId: MILESTONES.APEX_FITOUT,
  },
];

// ─── Seeding helper ────────────────────────────────────────────────────────────

async function postTask(task, projectId) {
  const res = await fetch(`${BASE_URL}/api/project-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...task, projectId }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`POST failed ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function seed(projectId, tasks, projectLabel) {
  console.log(`\n📦 Seeding ${tasks.length} tasks for: ${projectLabel}`);
  let passed = 0, failed = 0;
  for (const task of tasks) {
    try {
      const result = await postTask(task, projectId);
      console.log(`  ✅ [${result.id?.slice(0, 8)}] ${task.name}`);
      passed++;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.error(`  ❌ ${task.name}: ${err.message}`);
      failed++;
    }
  }
  console.log(`  → ${passed} created, ${failed} failed`);
}

(async () => {
  console.log('🚀 Starting seed: construction project tasks');
  console.log(`   API: ${BASE_URL}`);

  await seed(PROJECTS.HOUSE, HOUSE_TASKS, 'House Building Project');
  await seed(PROJECTS.APEX, APEX_TASKS, 'Apex Steel Industrial Complex – Phase 1');

  // Verify
  console.log('\n📊 Verification:');
  for (const [label, id] of [['House', PROJECTS.HOUSE], ['Apex', PROJECTS.APEX]]) {
    const res = await fetch(`${BASE_URL}/api/project-tasks?projectId=${id}`);
    const rows = await res.json();
    console.log(`  ${label}: ${rows.length} tasks in DataStore`);
  }

  console.log('\n✅ Done!');
})();
