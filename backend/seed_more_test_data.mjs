/**
 * seed_more_test_data.mjs
 *
 * Adds more varied test data to both:
 *  - 👷 Workers module (ID: 476111000000091002)
 *  - 🚧 Site Entry module (ID: 476111000000091003)
 *
 * Workers field keys:
 *   f1=Worker ID, f3=Full Name, f4=Phone, f5=Worker Type, f6=Trade/Role,
 *   f7=Skill Level, f8=Experience, f9=Contractor, f11=Emergency Contact Name,
 *   f12=Emergency Contact Phone, f13=ID Proof Type, f14=ID Number,
 *   f15=Blood Group, f16=Medical Fitness, f17=Status, f18=Notes
 *
 * Site Entry field keys:
 *   f1=Worker, f2=Entry ID, f3=Project, f4=Site, f5=Date,
 *   f6=Entry Time, f7=Exit Time, f8=Entry Gate, f9=Contractor,
 *   f10=Work Area, f11=Assigned Task, f12=Entry Purpose,
 *   f13=Security Officer, f14=Status
 *
 * Run with: node seed_more_test_data.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api/custom-modules';

const WORKERS_MODULE_ID   = '476111000000091002';
const SITE_ENTRY_MODULE_ID = '476111000000091003';

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

// ─── NEW WORKER RECORDS ──────────────────────────────────────────────────────
// Using f1-f18 field keys matching the live schema

const NEW_WORKERS = [
  {
    f1: 'WRK-00201', f3: 'Anbu Selvan',
    f4: '9944332211', f5: 'Supervisor',
    f6: 'Site Safety Supervisor', f7: 'Highly Skilled',
    f8: '12 years', f9: 'Direct Hire',
    f11: 'Selvi Anbu', f12: '9944332212',
    f13: 'Aadhar Card', f14: 'TN****1122',
    f15: 'O+', f16: 'Valid',
    f17: 'Active', f18: 'Certified safety officer. Manages PPE compliance and daily TBT.',
  },
  {
    f1: 'WRK-00202', f3: 'Meena Krishnan',
    f4: '9800223344', f5: 'Engineer',
    f6: 'Structural Engineer', f7: 'Highly Skilled',
    f8: '8 years', f9: 'Direct Hire',
    f11: 'Krishnan R', f12: '9800223345',
    f13: 'PAN Card', f14: 'TN****5566',
    f15: 'A+', f16: 'Valid',
    f17: 'Active', f18: 'Leads structural design review and concrete quality checks.',
  },
  {
    f1: 'WRK-00203', f3: 'Balamurugan S',
    f4: '9677889900', f5: 'Skilled Worker',
    f6: 'RCC Shuttering Carpenter', f7: 'Skilled',
    f8: '7 years', f9: 'PBR Contractors',
    f11: 'Saraswathi B', f12: '9677889901',
    f13: 'Voter ID', f14: 'TN****7788',
    f15: 'B+', f16: 'Valid',
    f17: 'Active', f18: 'Expert in slab and beam shuttering. Works night shift.',
  },
  {
    f1: 'WRK-00204', f3: 'Sathish Raja',
    f4: '9566778899', f5: 'Skilled Worker',
    f6: 'Steel Bar Bender', f7: 'Skilled',
    f8: '5 years', f9: 'PBR Contractors',
    f11: 'Padmavathi R', f12: '9566778800',
    f13: 'Aadhar Card', f14: 'TN****9900',
    f15: 'AB-', f16: 'Valid',
    f17: 'Active', f18: 'Specialized in high-tensile rebar bending for columns.',
  },
  {
    f1: 'WRK-00205', f3: 'Nalini Devi',
    f4: '9455667788', f5: 'Labour',
    f6: 'Material Loader', f7: 'Unskilled',
    f8: '2 years', f9: 'SV Labour Contractors',
    f11: 'Devi M', f12: '9455667789',
    f13: 'Aadhar Card', f14: 'TN****3344',
    f15: 'O-', f16: 'Valid',
    f17: 'Active', f18: 'Handles cement bag loading and site material shifting.',
  },
  {
    f1: 'WRK-00206', f3: 'Murugesan P',
    f4: '9344556677', f5: 'Skilled Worker',
    f6: 'Welding Fabricator', f7: 'Highly Skilled',
    f8: '10 years', f9: 'Arjun Electricals',
    f11: 'Parvathi M', f12: '9344556678',
    f13: 'Driving Licence', f14: 'TN****1234',
    f15: 'B-', f16: 'Valid',
    f17: 'Active', f18: 'CSWIP 3.1 certified welder. Handles structural steel joints.',
  },
  {
    f1: 'WRK-00207', f3: 'Lavanya R',
    f4: '9233445566', f5: 'Contractor Staff',
    f6: 'Interior Painter', f7: 'Semi-Skilled',
    f8: '4 years', f9: 'ColorTech Finishers',
    f11: 'Ramesh L', f12: '9233445567',
    f13: 'Voter ID', f14: 'TN****5566',
    f15: 'A-', f16: 'Valid',
    f17: 'Active', f18: 'Handles texture and wall finishing on interior block work.',
  },
  {
    f1: 'WRK-00208', f3: 'Nandakumar T',
    f4: '9122334455', f5: 'Skilled Worker',
    f6: 'Plumber – Drainage', f7: 'Skilled',
    f8: '6 years', f9: 'Vijay Plumbing',
    f11: 'Thilaga N', f12: '9122334456',
    f13: 'Aadhar Card', f14: 'TN****6677',
    f15: 'O+', f16: 'Valid',
    f17: 'Active', f18: 'Installs UPVC drainage and sewage lines in basement zones.',
  },
  {
    f1: 'WRK-00209', f3: 'Divya Moorthy',
    f4: '9011223344', f5: 'Labour',
    f6: 'Site Cleaner', f7: 'Unskilled',
    f8: '1 year', f9: 'SV Labour Contractors',
    f11: 'Moorthy S', f12: '9011223345',
    f13: 'Voter ID', f14: 'TN****8899',
    f15: 'A+', f16: 'Pending',
    f17: 'On Leave', f18: 'Currently on approved medical leave for 2 weeks.',
  },
  {
    f1: 'WRK-00210', f3: 'Senthil Kumaran',
    f4: '8900112233', f5: 'Contractor Staff',
    f6: 'Crane Operator', f7: 'Highly Skilled',
    f8: '15 years', f9: 'Heavy Lift Solutions',
    f11: 'Kumari S', f12: '8900112234',
    f13: 'Driving Licence', f14: 'TN****2233',
    f15: 'B+', f16: 'Valid',
    f17: 'Active', f18: 'Operates 50-ton tower crane. NCCCO certified.',
  },
  {
    f1: 'WRK-00211', f3: 'Bharathi V',
    f4: '8799001122', f5: 'Skilled Worker',
    f6: 'Tile Layer / Flooring', f7: 'Skilled',
    f8: '9 years', f9: 'ColorTech Finishers',
    f11: 'Velu B', f12: '8799001123',
    f13: 'Aadhar Card', f14: 'TN****4455',
    f15: 'AB+', f16: 'Valid',
    f17: 'Active', f18: 'Specialist in vitrified tile and marble flooring.',
  },
  {
    f1: 'WRK-00212', f3: 'Ramachandran K',
    f4: '8688990011', f5: 'Supervisor',
    f6: 'Electrical Foreman', f7: 'Highly Skilled',
    f8: '11 years', f9: 'Arjun Electricals',
    f11: 'Kalpana R', f12: '8688990012',
    f13: 'PAN Card', f14: 'TN****6677',
    f15: 'O+', f16: 'Valid',
    f17: 'Active', f18: 'Manages HT/LT panel work and cable tray routing.',
  },
  {
    f1: 'WRK-00213', f3: 'Sumathi G',
    f4: '8577889900', f5: 'Labour',
    f6: 'Gardening / Landscaping', f7: 'Unskilled',
    f8: '3 years', f9: 'Green Thumb Contractors',
    f11: 'Ganesan S', f12: '8577889901',
    f13: 'Voter ID', f14: 'TN****0011',
    f15: 'B+', f16: 'Valid',
    f17: 'Inactive', f18: 'Contract ended. Landscaping work completed.',
  },
  {
    f1: 'WRK-00214', f3: 'Pandiarajan M',
    f4: '8466778899', f5: 'Skilled Worker',
    f6: 'Concrete Mixer Operator', f7: 'Semi-Skilled',
    f8: '4 years', f9: 'PBR Contractors',
    f11: 'Muthu P', f12: '8466778800',
    f13: 'Aadhar Card', f14: 'TN****8900',
    f15: 'A+', f16: 'Valid',
    f17: 'Active', f18: 'Operates transit mixer and batching plant. Morning shift.',
  },
  {
    f1: 'WRK-00215', f3: 'Kavitha Subramaniam',
    f4: '8355667788', f5: 'Engineer',
    f6: 'MEP Engineer', f7: 'Highly Skilled',
    f8: '6 years', f9: 'Direct Hire',
    f11: 'Subramaniam K', f12: '8355667789',
    f13: 'PAN Card', f14: 'TN****2345',
    f15: 'O-', f16: 'Valid',
    f17: 'Active', f18: 'Coordinates mechanical, electrical and plumbing services across floors.',
  },
];

// ─── NEW SITE ENTRY RECORDS ──────────────────────────────────────────────────
// Field keys: f1=Worker, f2=Entry ID, f3=Project, f4=Site, f5=Date,
// f6=Entry Time, f7=Exit Time, f8=Entry Gate, f9=Contractor,
// f10=Work Area, f11=Assigned Task, f12=Entry Purpose,
// f13=Security Officer, f14=Status

const TODAY = '2026-08-19';
const YESTERDAY = '2026-08-18';
const DAY_BEFORE = '2026-08-17';

const NEW_SITE_ENTRIES = [
  // Today - ongoing entries
  {
    f1: 'Anbu Selvan', f2: 'ENT-2026-00201', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '07:30 AM', f7: '—',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'All Floors – Safety Walkthrough', f11: 'Daily Safety Toolbox Talk',
    f12: 'Safety Inspection', f13: 'Dinesh Kumar',
    f14: 'On Site',
  },
  {
    f1: 'Meena Krishnan', f2: 'ENT-2026-00202', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '08:00 AM', f7: '—',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Level 8 – Structural Zone', f11: 'Slab Thickness & Rebar Inspection',
    f12: 'Structural Erection', f13: 'Dinesh Kumar',
    f14: 'On Site',
  },
  {
    f1: 'Balamurugan S', f2: 'ENT-2026-00203', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '06:45 AM', f7: '—',
    f8: 'East Gate – Gate 02', f9: 'PBR Contractors',
    f10: 'Level 9 – Slab Shuttering', f11: 'Shuttering Panel Assembly',
    f12: 'Structural Erection', f13: 'Rajan P',
    f14: 'On Site',
  },
  {
    f1: 'Sathish Raja', f2: 'ENT-2026-00204', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '07:00 AM', f7: '—',
    f8: 'East Gate – Gate 02', f9: 'PBR Contractors',
    f10: 'Level 9 – Rebar Zone', f11: 'Column Rebar Bending & Placing',
    f12: 'Structural Erection', f13: 'Rajan P',
    f14: 'On Site',
  },
  {
    f1: 'Murugesan P', f2: 'ENT-2026-00205', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: TODAY,
    f6: '08:30 AM', f7: '—',
    f8: 'West Gate – Gate 03', f9: 'Arjun Electricals',
    f10: 'Mezzanine Floor – Steel Frame', f11: 'Structural Steel Joint Welding',
    f12: 'Structural Erection', f13: 'Suresh Kumar',
    f14: 'On Site',
  },
  {
    f1: 'Senthil Kumaran', f2: 'ENT-2026-00206', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: TODAY,
    f6: '06:00 AM', f7: '—',
    f8: 'North Gate – Gate 04', f9: 'Heavy Lift Solutions',
    f10: 'Tower Crane – Station 2', f11: 'Precast Panel Lifting & Placement',
    f12: 'Structural Erection', f13: 'Suresh Kumar',
    f14: 'On Site',
  },
  {
    f1: 'Nandakumar T', f2: 'ENT-2026-00207', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '09:00 AM', f7: '—',
    f8: 'South Gate – Gate 05', f9: 'Vijay Plumbing',
    f10: 'Basement Level 2 – Drainage Pit', f11: 'Sump Pit Drain Line Connection',
    f12: 'Plumbing & Drainage', f13: 'Dinesh Kumar',
    f14: 'On Site',
  },
  // Today - exited
  {
    f1: 'Nalini Devi', f2: 'ENT-2026-00208', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: TODAY,
    f6: '08:00 AM', f7: '02:00 PM',
    f8: 'Main Gate – Gate 01', f9: 'SV Labour Contractors',
    f10: 'Yard – Material Storage Area', f11: 'TMT Steel Unloading & Stacking',
    f12: 'Material Delivery', f13: 'Rajan P',
    f14: 'Exited',
  },
  {
    f1: 'Kavitha Subramaniam', f2: 'ENT-2026-00209', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '09:30 AM', f7: '01:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Level 5 to Level 9 – MEP Shafts', f11: 'HVAC Duct Routing Review',
    f12: 'Safety Inspection', f13: 'Dinesh Kumar',
    f14: 'Exited',
  },
  {
    f1: 'Ramachandran K', f2: 'ENT-2026-00210', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: TODAY,
    f6: '07:45 AM', f7: '03:30 PM',
    f8: 'West Gate – Gate 03', f9: 'Arjun Electricals',
    f10: 'Main Electrical Panel Room', f11: 'HT Cable Termination – Incomer Panel',
    f12: 'Electrical Work', f13: 'Suresh Kumar',
    f14: 'Exited',
  },
  // Yesterday entries - mix of statuses
  {
    f1: 'Lavanya R', f2: 'ENT-2026-00211', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: YESTERDAY,
    f6: '08:00 AM', f7: '05:00 PM',
    f8: 'East Gate – Gate 02', f9: 'ColorTech Finishers',
    f10: 'Level 4 – Apartment Block B', f11: 'Wall Putty & Texture Coat Application',
    f12: 'Interior Finishing', f13: 'Rajan P',
    f14: 'Exited',
  },
  {
    f1: 'Bharathi V', f2: 'ENT-2026-00212', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: YESTERDAY,
    f6: '08:15 AM', f7: '06:30 PM',
    f8: 'East Gate – Gate 02', f9: 'ColorTech Finishers',
    f10: 'Level 3 – Lobby & Corridor', f11: 'Marble Flooring – Lobby Area',
    f12: 'Interior Finishing', f13: 'Rajan P',
    f14: 'Exited',
  },
  {
    f1: 'Pandiarajan M', f2: 'ENT-2026-00213', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: YESTERDAY,
    f6: '05:30 AM', f7: '02:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'PBR Contractors',
    f10: 'Concrete Batching Plant', f11: 'Grade M40 Concrete Mixing for Raft Slab',
    f12: 'Foundation Work', f13: 'Suresh Kumar',
    f14: 'Exited',
  },
  {
    f1: 'Sumathi G', f2: 'ENT-2026-00214', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: YESTERDAY,
    f6: '10:00 AM', f7: '04:00 PM',
    f8: 'South Gate – Gate 05', f9: 'Green Thumb Contractors',
    f10: 'Podium Level – Landscape Zone', f11: 'Topsoil Preparation & Planting',
    f12: 'Other', f13: 'Dinesh Kumar',
    f14: 'Exited',
  },
  {
    f1: 'Security Guard – Arun', f2: 'ENT-2026-00215', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: YESTERDAY,
    f6: '06:00 AM', f7: '—',
    f8: 'Rear Gate – Gate 06', f9: 'QuickFix Equipment Co.',
    f10: 'Crane Yard – Maintenance Bay', f11: 'Hydraulic System Service',
    f12: 'Equipment Maintenance', f13: 'Suresh Kumar',
    f14: 'Pending',
  },
  {
    f1: 'Contractor – ABC Delivery', f2: 'ENT-2026-00216', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: YESTERDAY,
    f6: '11:30 AM', f7: '12:45 PM',
    f8: 'Main Gate – Gate 01', f9: 'SV Labour Contractors',
    f10: 'Material Yard – Block C', f11: 'AAC Block Delivery & Stack',
    f12: 'Material Delivery', f13: 'Rajan P',
    f14: 'Exited',
  },
  // Day before entries - various purposes
  {
    f1: 'Murugesan P', f2: 'ENT-2026-00217', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: DAY_BEFORE,
    f6: '07:00 AM', f7: '05:30 PM',
    f8: 'West Gate – Gate 03', f9: 'Arjun Electricals',
    f10: 'Roof Level – PEB Structure', f11: 'Purlin Welding & Gutter Fixing',
    f12: 'Structural Erection', f13: 'Ramesh P',
    f14: 'Exited',
  },
  {
    f1: 'Anbu Selvan', f2: 'ENT-2026-00218', f3: 'GreenSteel Industrial Building',
    f4: 'Chennai Industrial Site', f5: DAY_BEFORE,
    f6: '06:30 AM', f7: '04:30 PM',
    f8: 'Main Gate – Gate 01', f9: 'Direct Hire',
    f10: 'Site-wide', f11: 'Safety Audit – HSE Walk',
    f12: 'Safety Inspection', f13: 'Ramesh P',
    f14: 'Exited',
  },
  {
    f1: 'Senthil Kumaran', f2: 'ENT-2026-00219', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: DAY_BEFORE,
    f6: '05:45 AM', f7: '03:00 PM',
    f8: 'North Gate – Gate 04', f9: 'Heavy Lift Solutions',
    f10: 'Tower Crane – Station 1', f11: 'Steel Beam Erection – Level 8',
    f12: 'Structural Erection', f13: 'Dinesh Kumar',
    f14: 'Exited',
  },
  // Denied entry example
  {
    f1: 'Unknown Visitor', f2: 'ENT-2026-00220', f3: 'Prestige Heights Residential Tower',
    f4: 'Bangalore North Site', f5: TODAY,
    f6: '10:45 AM', f7: '10:50 AM',
    f8: 'Main Gate – Gate 01', f9: '—',
    f10: '—', f11: 'Visitor – No Authorisation',
    f12: 'Other', f13: 'Dinesh Kumar',
    f14: 'Denied',
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏗  BuildTrack — Additional Test Data Seeder\n');

  // ── 1. Seed Workers ────────────────────────────────────────────────────────
  console.log('👷 Seeding Workers module...');
  const existingWorkers = await api('GET', `/${WORKERS_MODULE_ID}/records`);
  const existingWorkerIds = new Set();
  for (const rec of existingWorkers) {
    const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
    if (d?.f1) existingWorkerIds.add(d.f1);
  }
  console.log(`   Existing: ${existingWorkers.length} records, IDs: ${[...existingWorkerIds].join(', ')}`);

  let wInserted = 0, wSkipped = 0;
  for (const worker of NEW_WORKERS) {
    if (existingWorkerIds.has(worker.f1)) {
      console.log(`   ⏭  Skip ${worker.f1} (${worker.f3}) — already exists`);
      wSkipped++;
      continue;
    }
    const result = await api('POST', `/${WORKERS_MODULE_ID}/records`, worker);
    if (result.id || result.ROWID) {
      console.log(`   ✓  ${worker.f1}  ${worker.f3.padEnd(25)}  ${worker.f6}  [${worker.f17}]`);
      wInserted++;
    } else {
      console.warn(`   ✗  Failed: ${worker.f1} — ${JSON.stringify(result)}`);
    }
  }
  console.log(`\n   Workers done → Inserted: ${wInserted}, Skipped: ${wSkipped}\n`);

  // ── 2. Seed Site Entry ─────────────────────────────────────────────────────
  console.log('🚧 Seeding Site Entry module...');
  const existingEntries = await api('GET', `/${SITE_ENTRY_MODULE_ID}/records`);
  const existingEntryIds = new Set();
  for (const rec of existingEntries) {
    const d = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
    if (d?.f2) existingEntryIds.add(d.f2);
  }
  console.log(`   Existing: ${existingEntries.length} records, Entry IDs: ${[...existingEntryIds].join(', ')}`);

  let sInserted = 0, sSkipped = 0;
  for (const entry of NEW_SITE_ENTRIES) {
    if (existingEntryIds.has(entry.f2)) {
      console.log(`   ⏭  Skip ${entry.f2} (${entry.f1}) — already exists`);
      sSkipped++;
      continue;
    }
    const result = await api('POST', `/${SITE_ENTRY_MODULE_ID}/records`, entry);
    if (result.id || result.ROWID) {
      console.log(`   ✓  ${entry.f2}  ${entry.f1.padEnd(25)}  ${entry.f14}  [${entry.f12}]`);
      sInserted++;
    } else {
      console.warn(`   ✗  Failed: ${entry.f2} — ${JSON.stringify(result)}`);
    }
  }
  console.log(`\n   Site Entry done → Inserted: ${sInserted}, Skipped: ${sSkipped}`);

  console.log('\n✅ All done! Refresh the app to see the new data.');
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message || err);
  process.exit(1);
});
