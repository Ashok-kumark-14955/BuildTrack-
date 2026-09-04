/**
 * reseed_workers_siteentry.mjs
 *
 * Fixes ALL Workers and Site Entry modules across both projects with the
 * 11 canonical workers, using the correct field-ID keyed format:
 *   { data: { f1: value, f3: value, ... } }
 *
 * Modules:
 *   👷 Workers      id=476111000000091002  project=d925af2e  (Prestige Heights)
 *   👷 Workers      id=476111000000092018  project=c6b44879  (GreenSteel)
 *   🚧 Site Entry   id=476111000000091003  project=d925af2e  (Prestige Heights)
 *   🚧 Site Entry   id=476111000000091006  project=c6b44879  (GreenSteel)
 *
 * Run with: node backend/reseed_workers_siteentry.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── API helpers ────────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`GET ${path} non-JSON: ${text.slice(0, 200)}`); }
}

async function apiDelete(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!r.ok) {
    const t = await r.text();
    console.warn(`  ⚠  DELETE ${path} (${r.status}): ${t.slice(0, 80)}`);
  }
}

async function apiPost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    if (!r.ok) throw new Error(`POST ${path} (${r.status}): ${JSON.stringify(data)}`);
    return data;
  } catch (e) {
    if (e.message.startsWith('POST')) throw e;
    throw new Error(`POST ${path} non-JSON: ${text.slice(0, 200)}`);
  }
}

async function clearAndInsert(moduleId, moduleName, records) {
  console.log(`\n📋 Processing: ${moduleName} (id=${moduleId})`);

  // Delete all existing records
  const existing = await apiGet(`/custom-modules/${moduleId}/records`);
  console.log(`  🗑  Deleting ${existing.length} existing record(s)...`);
  for (const rec of existing) {
    await apiDelete(`/custom-modules/${moduleId}/records/${rec.id}`);
  }
  console.log(`  ✓ Cleared ${existing.length} old records`);

  // Insert new records
  let inserted = 0;
  for (const rec of records) {
    try {
      const created = await apiPost(`/custom-modules/${moduleId}/records`, { data: rec });
      // Print the worker name (f3 for Workers, f1 for Site Entry)
      const name = rec.f3 || rec.f1 || '—';
      console.log(`  ➕ ${name} (id=${created.id})`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ Insert failed: ${err.message}`);
    }
  }
  console.log(`  ✓ Inserted ${inserted}/${records.length} records`);
}

// ── Workers Records (field ids: f1=Worker ID, f3=Full Name, f4=Mobile, f5=Worker Type, f6=Trade, f7=Skill Level, f17=Status)
// NOTE: f3 is "Full Name" — this is the primary display field

// Workers fields:
// f1=Worker ID, f3=Full Name, f4=Mobile Number, f5=Worker Type, f6=Trade,
// f7=Skill Level, f8=Experience, f9=Contractor, f10=Subcontractor,
// f11=Emergency Contact, f12=Emergency Phone, f13=ID Proof Type,
// f14=ID Number, f15=Blood Group, f16=Medical Fitness, f17=Status, f18=Notes

const WORKERS_RECORDS = [
  {
    f1: 'WRK-001', f3: 'Arun Prakash',   f4: '9876543210',
    f5: 'Supervisor',       f6: 'Foreman',        f7: 'Highly Skilled',
    f8: '8 years',          f9: 'ABC Contractors', f10: '',
    f11: 'Sunitha Prakash', f12: '9876543211',    f13: 'Aadhaar',
    f14: '1234 5678 9012',  f15: 'O+',            f16: 'Valid',
    f17: 'Active',          f18: 'Safety Officer / Site Supervisor',
  },
  {
    f1: 'WRK-002', f3: 'Ravi Kumar',     f4: '9845012345',
    f5: 'Skilled Worker',   f6: 'Steel Erector',  f7: 'Highly Skilled',
    f8: '6 years',          f9: 'ABC Steel Contractors', f10: '',
    f11: 'Kamala Kumar',    f12: '9845012346',    f13: 'Aadhaar',
    f14: '2345 6789 0123',  f15: 'B+',            f16: 'Valid',
    f17: 'Active',          f18: 'Steel Erector – Zone A',
  },
  {
    f1: 'WRK-003', f3: 'Suresh Babu',    f4: '9900112233',
    f5: 'Skilled Worker',   f6: 'Mason',          f7: 'Skilled',
    f8: '5 years',          f9: 'Raj Masonry Works', f10: '',
    f11: 'Lalitha Babu',    f12: '9900112234',    f13: 'Aadhaar',
    f14: '3456 7890 1234',  f15: 'A+',            f16: 'Valid',
    f17: 'Active',          f18: 'Formwork Carpenter / Mason',
  },
  {
    f1: 'WRK-004', f3: 'Priya Nair',     f4: '9751234567',
    f5: 'Engineer',         f6: 'Foreman',        f7: 'Highly Skilled',
    f8: '7 years',          f9: 'ABC Contractors', f10: '',
    f11: 'Rajan Nair',      f12: '9751234568',    f13: 'Aadhaar',
    f14: '4567 8901 2345',  f15: 'A-',            f16: 'Valid',
    f17: 'Active',          f18: 'Civil Engineering / Foreman',
  },
  {
    f1: 'WRK-005', f3: 'Karthik M',      f4: '9988776655',
    f5: 'Contractor Staff', f6: 'Electrician',    f7: 'Highly Skilled',
    f8: '4 years',          f9: 'Arjun Electricals', f10: '',
    f11: 'Meenakshi',       f12: '9988776656',    f13: 'Aadhaar',
    f14: '5678 9012 3456',  f15: 'B-',            f16: 'Valid',
    f17: 'Active',          f18: 'Licensed Electrician',
  },
  {
    f1: 'WRK-006', f3: 'Vijay Kumar',    f4: '9444567890',
    f5: 'Contractor Staff', f6: 'Plumber',        f7: 'Highly Skilled',
    f8: '5 years',          f9: 'Vijay Plumbing', f10: '',
    f11: 'Kamakshi Kumar',  f12: '9444567891',    f13: 'Aadhaar',
    f14: '7890 1234 5678',  f15: 'O+',            f16: 'Valid',
    f17: 'Active',          f18: 'Plumbing & Drainage',
  },
  {
    f1: 'WRK-007', f3: 'Anand Selvaraj', f4: '9500223344',
    f5: 'Contractor Staff', f6: 'Crane Operator', f7: 'Highly Skilled',
    f8: '9 years',          f9: 'Crane Masters Pvt Ltd', f10: '',
    f11: 'Selvi Anand',     f12: '9500223345',    f13: 'Aadhaar',
    f14: '8901 2345 6789',  f15: 'AB+',           f16: 'Valid',
    f17: 'Active',          f18: 'Certified Crane Operator',
  },
  {
    f1: 'WRK-008', f3: 'Meena Devi',     f4: '9345678901',
    f5: 'Contractor Staff', f6: 'Painter',        f7: 'Skilled',
    f8: '3 years',          f9: 'Shine Interiors', f10: '',
    f11: 'Raj Devi',        f12: '9345678902',    f13: 'Aadhaar',
    f14: '9012 3456 7890',  f15: 'B+',            f16: 'Valid',
    f17: 'Active',          f18: 'Painter / Interior Finishing',
  },
  {
    f1: 'WRK-009', f3: 'Ramesh Patel',   f4: '9123456789',
    f5: 'Labour',           f6: 'General Labour', f7: 'Semi-Skilled',
    f8: '2 years',          f9: 'Deep Earth Contractors', f10: '',
    f11: 'Geeta Patel',     f12: '9123456780',    f13: 'Aadhaar',
    f14: '0123 4567 8901',  f15: 'O-',            f16: 'Valid',
    f17: 'Active',          f18: 'Excavation / General Labour',
  },
  {
    f1: 'WRK-010', f3: 'Lakshmi Priya',  f4: '9567891234',
    f5: 'Skilled Worker',   f6: 'Steel Erector',  f7: 'Skilled',
    f8: '4 years',          f9: 'HighWorks Safety Solutions', f10: '',
    f11: 'Gopal Priya',     f12: '9567891235',    f13: 'Aadhaar',
    f14: '1122 3344 5566',  f15: 'A+',            f16: 'Valid',
    f17: 'Active',          f18: 'Scaffolding Erector',
  },
  {
    f1: 'WRK-011', f3: 'Dinesh Kumar',   f4: '9234567890',
    f5: 'Contractor Staff', f6: 'General Labour', f7: 'Skilled',
    f8: '5 years',          f9: 'Fire Guard Systems', f10: '',
    f11: 'Kavitha Dinesh',  f12: '9234567891',    f13: 'Aadhaar',
    f14: '2233 4455 6677',  f15: 'AB-',           f16: 'Valid',
    f17: 'Active',          f18: 'Fire Safety Technician',
  },
];

// ── Site Entry Records — Prestige Heights (project=d925af2e, module=091003)
// f1=Worker, f2=Entry ID, f3=Project, f4=Site, f5=Date, f6=Entry Time, f7=Exit Time,
// f8=Entry Gate, f9=Contractor, f10=Work Area, f11=Assigned Task, f12=Entry Purpose,
// f13=Security Officer, f14=Status

const SITE_ENTRY_PRESTIGE = [
  { f1: 'Arun Prakash',   f2: 'ENT-2026-00101', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-01', f6: '07:30 AM', f7: '05:00 PM', f8: 'Main Gate – Gate 01',  f9: 'ABC Contractors',        f10: 'All Zones',                 f11: 'Safety Inspection',          f12: 'Safety Inspection',  f13: 'Raj Mohan', f14: 'On Site'  },
  { f1: 'Ravi Kumar',     f2: 'ENT-2026-00102', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-05', f6: '08:00 AM', f7: '05:30 PM', f8: 'Main Gate – Gate 01',  f9: 'ABC Steel Contractors',  f10: 'Steel Erection – Zone A',   f11: 'Column Erection',            f12: 'Structural Erection', f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Suresh Babu',    f2: 'ENT-2026-00103', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-06', f6: '07:45 AM', f7: '05:00 PM', f8: 'East Gate – Gate 02',  f9: 'Raj Masonry Works',      f10: 'Foundation – Block B',      f11: 'Footing Work',               f12: 'Foundation Work',    f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Priya Nair',     f2: 'ENT-2026-00104', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-07', f6: '08:00 AM', f7: '06:00 PM', f8: 'Main Gate – Gate 01',  f9: 'ABC Contractors',        f10: 'All Zones',                 f11: 'Site Supervision',           f12: 'Safety Inspection',  f13: 'Raj Mohan', f14: 'On Site'  },
  { f1: 'Karthik M',      f2: 'ENT-2026-00105', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-08', f6: '07:30 AM', f7: '04:30 PM', f8: 'West Gate – Gate 03',  f9: 'Arjun Electricals',      f10: 'Electrical – Floor 4 to 8', f11: 'Panel Installation',         f12: 'Electrical Work',    f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Vijay Kumar',    f2: 'ENT-2026-00106', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-09', f6: '08:15 AM', f7: '05:15 PM', f8: 'Main Gate – Gate 01',  f9: 'Vijay Plumbing',         f10: 'Plumbing – Basement',       f11: 'Pipe Laying',                f12: 'Plumbing & Drainage', f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Anand Selvaraj', f2: 'ENT-2026-00107', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-10', f6: '07:00 AM', f7: '04:00 PM', f8: 'North Gate – Gate 04', f9: 'Crane Masters Pvt Ltd',  f10: 'Crane Bay – Sector 2',      f11: 'Material Lifting',           f12: 'Structural Erection', f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Meena Devi',     f2: 'ENT-2026-00108', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-11', f6: '09:00 AM', f7: '05:00 PM', f8: 'Main Gate – Gate 01',  f9: 'Shine Interiors',        f10: 'Interior – Floors 1-3',     f11: 'Wall Painting',              f12: 'Interior Finishing',  f13: 'Raj Mohan', f14: 'On Site'  },
  { f1: 'Ramesh Patel',   f2: 'ENT-2026-00109', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-12', f6: '07:30 AM', f7: '05:00 PM', f8: 'East Gate – Gate 02',  f9: 'Deep Earth Contractors', f10: 'Excavation – Zone C',       f11: 'Trench Digging',             f12: 'Foundation Work',    f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Lakshmi Priya',  f2: 'ENT-2026-00110', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-13', f6: '08:00 AM', f7: '05:30 PM', f8: 'Main Gate – Gate 01',  f9: 'HighWorks Safety',       f10: 'Scaffolding – Facade',      f11: 'Scaffold Assembly',          f12: 'Structural Erection', f13: 'Raj Mohan', f14: 'Exited'  },
  { f1: 'Dinesh Kumar',   f2: 'ENT-2026-00111', f3: 'Prestige Heights Residential', f4: 'Whitefield – Phase 2', f5: '2026-08-14', f6: '10:00 AM', f7: '04:00 PM', f8: 'Main Gate – Gate 01',  f9: 'Fire Guard Systems',     f10: 'Site Office & Equipment',   f11: 'Fire Equipment Check',       f12: 'Safety Inspection',  f13: 'Raj Mohan', f14: 'Exited'  },
];

// ── Site Entry Records — GreenSteel (project=c6b44879, module=091006)

const SITE_ENTRY_GREENSTEEL = [
  { f1: 'Arun Prakash',   f2: 'ENT-2026-00148', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-01', f6: '07:00 AM', f7: '05:00 PM', f8: 'Main Gate – Gate 01',  f9: 'ABC Contractors',        f10: 'All Zones',                 f11: 'Safety Inspection',          f12: 'Safety Inspection',   f13: 'Siva Kumar', f14: 'On Site'  },
  { f1: 'Ravi Kumar',     f2: 'ENT-2026-00149', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-05', f6: '07:30 AM', f7: '05:30 PM', f8: 'Main Gate – Gate 01',  f9: 'ABC Steel Contractors',  f10: 'Steel Erection – Bay 1',    f11: 'Column Splicing',            f12: 'Structural Erection', f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Suresh Babu',    f2: 'ENT-2026-00150', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-06', f6: '07:30 AM', f7: '05:00 PM', f8: 'East Gate – Gate 02',  f9: 'Raj Masonry Works',      f10: 'Foundation – Block A',      f11: 'Concrete Pouring',           f12: 'Foundation Work',    f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Priya Nair',     f2: 'ENT-2026-00151', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-07', f6: '08:00 AM', f7: '06:00 PM', f8: 'Main Gate – Gate 01',  f9: 'ABC Contractors',        f10: 'All Zones',                 f11: 'Site Supervision',           f12: 'Safety Inspection',   f13: 'Siva Kumar', f14: 'On Site'  },
  { f1: 'Karthik M',      f2: 'ENT-2026-00152', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-08', f6: '07:30 AM', f7: '04:30 PM', f8: 'West Gate – Gate 03',  f9: 'Arjun Electricals',      f10: 'Electrical – Main DB',      f11: 'Cable Laying',               f12: 'Electrical Work',    f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Vijay Kumar',    f2: 'ENT-2026-00153', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-09', f6: '08:00 AM', f7: '05:00 PM', f8: 'Main Gate – Gate 01',  f9: 'Vijay Plumbing',         f10: 'Plumbing – Ground Floor',   f11: 'Main Line Installation',     f12: 'Plumbing & Drainage', f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Anand Selvaraj', f2: 'ENT-2026-00154', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-10', f6: '06:30 AM', f7: '04:00 PM', f8: 'North Gate – Gate 04', f9: 'Crane Masters Pvt Ltd',  f10: 'Crane Operations – Bay 1',  f11: 'Beam Lifting',               f12: 'Structural Erection', f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Meena Devi',     f2: 'ENT-2026-00155', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-11', f6: '09:00 AM', f7: '05:00 PM', f8: 'Main Gate – Gate 01',  f9: 'Shine Interiors',        f10: 'Office Block – Ground Flr', f11: 'Painting & Finishing',       f12: 'Interior Finishing',  f13: 'Siva Kumar', f14: 'On Site'  },
  { f1: 'Ramesh Patel',   f2: 'ENT-2026-00156', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-12', f6: '07:00 AM', f7: '05:00 PM', f8: 'East Gate – Gate 02',  f9: 'Deep Earth Contractors', f10: 'Excavation – Zone B',       f11: 'Pile Cap Excavation',        f12: 'Foundation Work',    f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Lakshmi Priya',  f2: 'ENT-2026-00157', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-13', f6: '07:30 AM', f7: '05:00 PM', f8: 'Main Gate – Gate 01',  f9: 'HighWorks Safety',       f10: 'Scaffolding – Bay 2',       f11: 'Scaffold Erection',          f12: 'Structural Erection', f13: 'Siva Kumar', f14: 'Exited'  },
  { f1: 'Dinesh Kumar',   f2: 'ENT-2026-00158', f3: 'GreenSteel Industrial Building', f4: 'Chennai Industrial Site', f5: '2026-08-14', f6: '10:00 AM', f7: '04:00 PM', f8: 'Main Gate – Gate 01',  f9: 'Fire Guard Systems',     f10: 'Site-Wide Fire Equipment',  f11: 'Fire Extinguisher Inspection', f12: 'Safety Inspection', f13: 'Siva Kumar', f14: 'Exited'  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 BuildTrack — Workers & Site Entry Full Reseed\n');
  console.log('Fixing ALL 4 modules with the 11 canonical worker names\n');
  console.log(`Backend: ${BASE}\n`);
  console.log('Modules to fix:');
  console.log('  👷 Workers    476111000000091002  (Prestige Heights)');
  console.log('  👷 Workers    476111000000092018  (GreenSteel)');
  console.log('  🚧 Site Entry 476111000000091003  (Prestige Heights)');
  console.log('  🚧 Site Entry 476111000000091006  (GreenSteel)');

  // Workers — Prestige Heights
  await clearAndInsert('476111000000091002', '👷 Workers — Prestige Heights (d925af2e)', WORKERS_RECORDS);

  // Workers — GreenSteel
  await clearAndInsert('476111000000092018', '👷 Workers — GreenSteel (c6b44879)', WORKERS_RECORDS);

  // Site Entry — Prestige Heights
  await clearAndInsert('476111000000091003', '🚧 Site Entry — Prestige Heights (d925af2e)', SITE_ENTRY_PRESTIGE);

  // Site Entry — GreenSteel
  await clearAndInsert('476111000000091006', '🚧 Site Entry — GreenSteel (c6b44879)', SITE_ENTRY_GREENSTEEL);

  console.log('\n\n✅ All done! Workers & Site Entry now consistent with Safety Induction & Safety Training.');
  console.log('\n📋 Canonical 11 workers across ALL modules:');
  console.log('   Arun Prakash | Ravi Kumar | Suresh Babu | Priya Nair | Karthik M');
  console.log('   Vijay Kumar | Anand Selvaraj | Meena Devi | Ramesh Patel | Lakshmi Priya | Dinesh Kumar');
}

main().catch(err => {
  console.error('\n❌ Reseeding failed:', err.message || err);
  process.exit(1);
});
