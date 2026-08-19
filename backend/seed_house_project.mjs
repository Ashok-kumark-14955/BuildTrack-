/**
 * seed_house_project.mjs
 *
 * Adds rich test data for the "House Building Project" (9 BHK Residential) to:
 *  - 👷 Workers module (ID: 476111000000092018)
 *  - 🚧 Site Entry module (ID: 476111000000091006)
 *
 * Existing Workers: WRK-00201 → WRK-00205 (5 records)
 * Existing Site Entries: ENT-2026-00201 → ENT-2026-00205 (5 records)
 *
 * This script adds:
 *  - 10 new house construction workers (WRK-00206 → WRK-00215)
 *  - 20 new site entry records (ENT-2026-00206 → ENT-2026-00225)
 *
 * Run with: node seed_house_project.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api/custom-modules';

const WORKERS_MODULE_ID    = '476111000000092018';
const SITE_ENTRY_MODULE_ID = '476111000000091006';

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  if (!text.trim()) return {};
  try { return JSON.parse(text); }
  catch { throw new Error(`${method} ${path} → non-JSON: ${text.slice(0, 300)}`); }
}

// ─── NEW WORKER RECORDS (House Construction Team) ────────────────────────────
// Field keys: f1=Worker ID, f3=Full Name, f4=Phone, f5=Worker Type,
//   f6=Trade/Role, f7=Skill Level, f8=Experience, f9=Contractor,
//   f11=Emergency Contact Name, f12=Emergency Contact Phone,
//   f13=ID Proof Type, f14=ID Number, f15=Blood Group,
//   f16=Medical Fitness, f17=Status, f18=Notes

const NEW_WORKERS = [
  {
    f1: 'WRK-00206', f3: 'Ravi Shankar N',
    f4: '9876543210', f5: 'Supervisor',
    f6: 'Site Supervisor', f7: 'Highly Skilled',
    f8: '14 years', f9: 'Direct Hire',
    f11: 'Meena R', f12: '9876543211',
    f13: 'Aadhar Card', f14: 'KA****1234',
    f15: 'O+', f16: 'Valid',
    f17: 'Active', f18: 'Overall site supervisor for 9 BHK residential house. Manages daily workforce and quality.',
  },
  {
    f1: 'WRK-00207', f3: 'Suresh Babu K',
    f4: '9765432109', f5: 'Skilled Worker',
    f6: 'Mason / Bricklayer', f7: 'Highly Skilled',
    f8: '16 years', f9: 'KSB Masons Pvt Ltd',
    f11: 'Kamala S', f12: '9765432110',
    f13: 'Voter ID', f14: 'KA****5678',
    f15: 'A+', f16: 'Valid',
    f17: 'Active', f18: 'Expert in brick and block masonry. Handles load-bearing walls and arches.',
  },
  {
    f1: 'WRK-00208', f3: 'Priya Nair',
    f4: '9654321098', f5: 'Engineer',
    f6: 'Civil Engineer', f7: 'Highly Skilled',
    f8: '7 years', f9: 'Direct Hire',
    f11: 'Nair B', f12: '9654321099',
    f13: 'PAN Card', f14: 'KA****9012',
    f15: 'B+', f16: 'Valid',
    f17: 'Active', f18: 'Oversees structural drawings, RCC design, and material quality at the house site.',
  },
  {
    f1: 'WRK-00209', f3: 'Karthik Rajan',
    f4: '9543210987', f5: 'Skilled Worker',
    f6: 'Tile Layer / Flooring', f7: 'Skilled',
    f8: '9 years', f9: 'HomeFin Interiors',
    f11: 'Rajan M', f12: '9543210988',
    f13: 'Aadhar Card', f14: 'KA****3456',
    f15: 'O-', f16: 'Valid',
    f17: 'Active', f18: 'Specialises in vitrified floor tiles, bathroom tiles, and kitchen dado work.',
  },
  {
    f1: 'WRK-00210', f3: 'Saravanan M',
    f4: '9432109876', f5: 'Skilled Worker',
    f6: 'Painter', f7: 'Skilled',
    f8: '11 years', f9: 'ColorBrush Finishers',
    f11: 'Selvi S', f12: '9432109877',
    f13: 'Voter ID', f14: 'KA****7890',
    f15: 'A-', f16: 'Valid',
    f17: 'Active', f18: 'Interior and exterior wall painter. Expert in texture, putty and emulsion finishes.',
  },
  {
    f1: 'WRK-00211', f3: 'Venkatesh G',
    f4: '9321098765', f5: 'Skilled Worker',
    f6: 'Carpenter / Woodwork', f7: 'Highly Skilled',
    f8: '13 years', f9: 'WoodCraft Interiors',
    f11: 'Geetha V', f12: '9321098766',
    f13: 'Aadhar Card', f14: 'KA****1357',
    f15: 'B-', f16: 'Valid',
    f17: 'Active', f18: 'Custom woodwork: doors, window frames, kitchen cabinets, wardrobes, and staircase rails.',
  },
  {
    f1: 'WRK-00212', f3: 'Muthu Raj P',
    f4: '9210987654', f5: 'Skilled Worker',
    f6: 'Steel Bar Bender', f7: 'Skilled',
    f8: '6 years', f9: 'KSB Masons Pvt Ltd',
    f11: 'Poongodi M', f12: '9210987655',
    f13: 'Voter ID', f14: 'KA****2468',
    f15: 'AB+', f16: 'Valid',
    f17: 'Active', f18: 'Bends and places rebars for footings, columns, beams and slabs.',
  },
  {
    f1: 'WRK-00213', f3: 'Chandran T',
    f4: '9109876543', f5: 'Labour',
    f6: 'Helper / General Labour', f7: 'Unskilled',
    f8: '2 years', f9: 'SV Labour Contractors',
    f11: 'Thenmozhi C', f12: '9109876544',
    f13: 'Aadhar Card', f14: 'KA****3579',
    f15: 'O+', f16: 'Valid',
    f17: 'Active', f18: 'General site help: mixing concrete, carrying materials, digging, and cleaning.',
  },
  {
    f1: 'WRK-00214', f3: 'Indira Devi S',
    f4: '9098765432', f5: 'Labour',
    f6: 'Helper / Material Carrier', f7: 'Unskilled',
    f8: '1 year', f9: 'SV Labour Contractors',
    f11: 'Selvam I', f12: '9098765433',
    f13: 'Voter ID', f14: 'KA****4680',
    f15: 'A+', f16: 'Pending',
    f17: 'On Leave', f18: 'On approved personal leave for 1 week. Returns on 2026-08-23.',
  },
  {
    f1: 'WRK-00215', f3: 'Babu Thomas',
    f4: '8987654321', f5: 'Contractor Staff',
    f6: 'Waterproofing Specialist', f7: 'Skilled',
    f8: '8 years', f9: 'AquaShield Waterproofing',
    f11: 'Sheela B', f12: '8987654322',
    f13: 'Aadhar Card', f14: 'KA****5791',
    f15: 'B+', f16: 'Valid',
    f17: 'Active', f18: 'Specialises in terrace, bathroom, and basement waterproofing using membrane systems.',
  },
];

// ─── NEW SITE ENTRY RECORDS ──────────────────────────────────────────────────
// Field keys: f1=Worker, f2=Entry ID, f3=Project, f4=Site, f5=Date,
// f6=Entry Time, f7=Exit Time, f8=Entry Gate, f9=Contractor,
// f10=Work Area, f11=Assigned Task, f12=Entry Purpose,
// f13=Security Officer, f14=Status

const PROJECT = '9 BHK Residential House';
const SITE    = 'Bengaluru Residential Site';
const SECURITY_OFFICER = 'Naveen Kumar';

// Dates
const D_AUG10 = '2026-08-10';
const D_AUG11 = '2026-08-11';
const D_AUG12 = '2026-08-12';
const D_AUG13 = '2026-08-13';
const D_AUG14 = '2026-08-14';
const D_AUG15 = '2026-08-15';
const D_AUG16 = '2026-08-16';
const D_AUG17 = '2026-08-17';
const D_AUG18 = '2026-08-18';
const D_TODAY  = '2026-08-19';

const NEW_SITE_ENTRIES = [
  // ── Aug 10 – Foundation Groundwork ──────────────────────────────────────
  {
    f1: 'Ravi Shankar N', f2: 'ENT-2026-00206', f3: PROJECT, f4: SITE,
    f5: D_AUG10, f6: '07:00 AM', f7: '06:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Site – Foundation Zone', f11: 'Layout Marking & Excavation Supervision',
    f12: 'Foundation Work', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Muthu Raj P', f2: 'ENT-2026-00207', f3: PROJECT, f4: SITE,
    f5: D_AUG10, f6: '07:30 AM', f7: '05:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'KSB Masons Pvt Ltd',
    f10: 'Foundation – Footing Zone A', f11: 'Footing Rebar Placement',
    f12: 'Foundation Work', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Chandran T', f2: 'ENT-2026-00208', f3: PROJECT, f4: SITE,
    f5: D_AUG10, f6: '07:00 AM', f7: '05:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'SV Labour Contractors',
    f10: 'Foundation – Excavation Pit', f11: 'Soil Excavation & Earthwork Levelling',
    f12: 'Foundation Work', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 12 – Column & Beam Work ──────────────────────────────────────────
  {
    f1: 'Suresh Babu K', f2: 'ENT-2026-00209', f3: PROJECT, f4: SITE,
    f5: D_AUG12, f6: '06:45 AM', f7: '05:45 PM',
    f8: 'Main Gate – Gate 01', f9: 'KSB Masons Pvt Ltd',
    f10: 'Ground Floor – Column Grid', f11: 'Column Shuttering & Concrete Pour',
    f12: 'Structural Erection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Priya Nair', f2: 'ENT-2026-00210', f3: PROJECT, f4: SITE,
    f5: D_AUG12, f6: '08:30 AM', f7: '04:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Ground Floor – Structural Zone', f11: 'RCC Column Quality Inspection',
    f12: 'Safety Inspection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Muthu Raj P', f2: 'ENT-2026-00211', f3: PROJECT, f4: SITE,
    f5: D_AUG12, f6: '07:00 AM', f7: '06:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'KSB Masons Pvt Ltd',
    f10: 'Ground Floor – Beam Zone', f11: 'Beam Rebar Bending & Tying',
    f12: 'Structural Erection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 13 – Plumbing & Drainage ─────────────────────────────────────────
  {
    f1: 'Arjun Rao', f2: 'ENT-2026-00212', f3: PROJECT, f4: SITE,
    f5: D_AUG13, f6: '08:00 AM', f7: '05:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'SwiftPipe Plumbers',
    f10: 'Ground Floor – Utility Zone', f11: 'Sewer Line Pipe Laying & Slope Setting',
    f12: 'Plumbing & Drainage', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Chandran T', f2: 'ENT-2026-00213', f3: PROJECT, f4: SITE,
    f5: D_AUG13, f6: '07:30 AM', f7: '04:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'SV Labour Contractors',
    f10: 'Yard – Material Store', f11: 'Cement Bag Unloading & Stacking',
    f12: 'Material Delivery', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 14 – Masonry & Brickwork ─────────────────────────────────────────
  {
    f1: 'Suresh Babu K', f2: 'ENT-2026-00214', f3: PROJECT, f4: SITE,
    f5: D_AUG14, f6: '07:00 AM', f7: '06:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'KSB Masons Pvt Ltd',
    f10: 'Ground Floor – Block A', f11: 'External Wall Brick Masonry – Phase 1',
    f12: 'Structural Erection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Priya Nair', f2: 'ENT-2026-00215', f3: PROJECT, f4: SITE,
    f5: D_AUG14, f6: '09:00 AM', f7: '01:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Ground Floor – All Rooms', f11: 'Brickwork Plumb & Level Check',
    f12: 'Safety Inspection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 15 – First Floor Slab ─────────────────────────────────────────────
  {
    f1: 'Ravi Shankar N', f2: 'ENT-2026-00216', f3: PROJECT, f4: SITE,
    f5: D_AUG15, f6: '06:00 AM', f7: '07:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'First Floor – Slab', f11: 'Slab Concrete Pour Supervision (M25)',
    f12: 'Structural Erection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Muthu Raj P', f2: 'ENT-2026-00217', f3: PROJECT, f4: SITE,
    f5: D_AUG15, f6: '06:30 AM', f7: '06:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'KSB Masons Pvt Ltd',
    f10: 'First Floor – Slab Rebar', f11: 'Slab Top & Bottom Reinforcement Laying',
    f12: 'Structural Erection', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 16 – Waterproofing & Electrical Rough-in ─────────────────────────
  {
    f1: 'Babu Thomas', f2: 'ENT-2026-00218', f3: PROJECT, f4: SITE,
    f5: D_AUG16, f6: '08:00 AM', f7: '05:00 PM',
    f8: 'East Gate – Gate 02', f9: 'AquaShield Waterproofing',
    f10: 'Terrace – Roof Slab', f11: 'Terrace Waterproofing Membrane Application',
    f12: 'Other', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Lakshmi Iyer', f2: 'ENT-2026-00219', f3: PROJECT, f4: SITE,
    f5: D_AUG16, f6: '08:30 AM', f7: '05:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'BrightVolt Electricals',
    f10: 'Ground Floor – All Rooms', f11: 'Conduit Laying & Gang Box Fixing',
    f12: 'Electrical Work', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 17 – Interior Finishing Begins ───────────────────────────────────
  {
    f1: 'Karthik Rajan', f2: 'ENT-2026-00220', f3: PROJECT, f4: SITE,
    f5: D_AUG17, f6: '08:00 AM', f7: '06:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'HomeFin Interiors',
    f10: 'Ground Floor – Kitchen & Bathrooms', f11: 'Kitchen Dado & Bathroom Tile Work',
    f12: 'Interior Finishing', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  {
    f1: 'Venkatesh G', f2: 'ENT-2026-00221', f3: PROJECT, f4: SITE,
    f5: D_AUG17, f6: '09:00 AM', f7: '06:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'WoodCraft Interiors',
    f10: 'Ground Floor – Main Door & Windows', f11: 'Door Frame & Window Frame Installation',
    f12: 'Interior Finishing', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 18 – Painting & Final Work ───────────────────────────────────────
  {
    f1: 'Saravanan M', f2: 'ENT-2026-00222', f3: PROJECT, f4: SITE,
    f5: D_AUG18, f6: '08:00 AM', f7: '06:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'ColorBrush Finishers',
    f10: 'First Floor – All Bedrooms', f11: 'Putty & Wall Primer Application',
    f12: 'Interior Finishing', f13: SECURITY_OFFICER, f14: 'Exited',
  },
  // ── Aug 19 (Today) – Active / Mixed ──────────────────────────────────────
  {
    f1: 'Ravi Shankar N', f2: 'ENT-2026-00223', f3: PROJECT, f4: SITE,
    f5: D_TODAY, f6: '07:00 AM', f7: '—',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Site – All Floors', f11: 'Daily Progress Review & Punch List',
    f12: 'Safety Inspection', f13: SECURITY_OFFICER, f14: 'On Site',
  },
  {
    f1: 'Karthik Rajan', f2: 'ENT-2026-00224', f3: PROJECT, f4: SITE,
    f5: D_TODAY, f6: '08:00 AM', f7: '—',
    f8: 'Main Gate – Gate 01', f9: 'HomeFin Interiors',
    f10: 'First Floor – Master Bedroom & Bathrooms', f11: 'Floor & Wall Tile Laying',
    f12: 'Interior Finishing', f13: SECURITY_OFFICER, f14: 'On Site',
  },
  {
    f1: 'Venkatesh G', f2: 'ENT-2026-00225', f3: PROJECT, f4: SITE,
    f5: D_TODAY, f6: '09:00 AM', f7: '—',
    f8: 'Main Gate – Gate 01', f9: 'WoodCraft Interiors',
    f10: 'First Floor – Bedrooms 3, 4 & 5', f11: 'Wardrobe & Kitchen Cabinet Fitting',
    f12: 'Interior Finishing', f13: SECURITY_OFFICER, f14: 'On Site',
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏠  BuildTrack — House Building Project Seeder (9 BHK Residential)\n');

  // ── 1. Seed Workers ────────────────────────────────────────────────────────
  console.log('👷 Seeding Workers module (ID: ' + WORKERS_MODULE_ID + ')...');
  const existingWorkers = await api('GET', `/${WORKERS_MODULE_ID}/records`);
  const existingWorkerIds = new Set();
  for (const rec of existingWorkers) {
    const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
    if (d?.f1) existingWorkerIds.add(d.f1);
  }
  console.log(`   Found ${existingWorkers.length} existing records: ${[...existingWorkerIds].join(', ')}\n`);

  let wInserted = 0, wSkipped = 0;
  for (const worker of NEW_WORKERS) {
    if (existingWorkerIds.has(worker.f1)) {
      console.log(`   ⏭  Skip ${worker.f1} (${worker.f3}) — already exists`);
      wSkipped++;
      continue;
    }
    const result = await api('POST', `/${WORKERS_MODULE_ID}/records`, worker);
    if (result.id || result.ROWID) {
      console.log(`   ✓  ${worker.f1}  ${worker.f3.padEnd(22)}  ${worker.f6.padEnd(28)}  [${worker.f17}]`);
      wInserted++;
    } else {
      console.warn(`   ✗  Failed: ${worker.f1} — ${JSON.stringify(result)}`);
    }
  }
  console.log(`\n   Workers → Inserted: ${wInserted}, Skipped: ${wSkipped}\n`);

  // ── 2. Seed Site Entry ─────────────────────────────────────────────────────
  console.log('🚧 Seeding Site Entry module (ID: ' + SITE_ENTRY_MODULE_ID + ')...');
  const existingEntries = await api('GET', `/${SITE_ENTRY_MODULE_ID}/records`);
  const existingEntryIds = new Set();
  for (const rec of existingEntries) {
    const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
    if (d?.f2) existingEntryIds.add(d.f2);
  }
  console.log(`   Found ${existingEntries.length} existing records: ${[...existingEntryIds].join(', ')}\n`);

  let sInserted = 0, sSkipped = 0;
  for (const entry of NEW_SITE_ENTRIES) {
    if (existingEntryIds.has(entry.f2)) {
      console.log(`   ⏭  Skip ${entry.f2} (${entry.f1}) — already exists`);
      sSkipped++;
      continue;
    }
    const result = await api('POST', `/${SITE_ENTRY_MODULE_ID}/records`, entry);
    if (result.id || result.ROWID) {
      console.log(`   ✓  ${entry.f2}  ${entry.f1.padEnd(22)}  [${entry.f14.padEnd(8)}]  ${entry.f10}`);
      sInserted++;
    } else {
      console.warn(`   ✗  Failed: ${entry.f2} — ${JSON.stringify(result)}`);
    }
  }
  console.log(`\n   Site Entry → Inserted: ${sInserted}, Skipped: ${sSkipped}`);

  console.log('\n✅ House Building Project seeding complete! Refresh the app to see the new data.');
  console.log(`   Project: "${PROJECT}" | Site: "${SITE}"`);
  console.log(`   Workers added: ${wInserted} | Site Entries added: ${sInserted}`);
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message || err);
  process.exit(1);
});
