/**
 * reseed_workers.mjs
 *
 * Clears all existing records from the Workers custom module and re-seeds
 * with the 11 canonical workers that match across all Workforce & Safety modules:
 *   Site Entry, Safety Training, Safety Induction, Workers.
 *
 * Run with: node backend/reseed_workers.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── 11 Canonical workers ─────────────────────────────────────────────────────
// These names must match exactly across:
//   🚧 Site Entry | 🦺 Safety Training | 🦺 Safety Induction | Workers

const CANONICAL_WORKERS = [
  {
    f_worker_id: 'WRK-001',
    f_full_name: 'Arun Prakash',
    f_worker_type: 'Supervisor',
    f_skill_level: 'Highly Skilled',
    f_trade: 'Safety Officer / Site Supervisor',
    f_phone: '9876543210',
    f_aadhar: '1234 5678 9012',
    f_doj: '2024-01-10',
    f_status: 'Active',
    f_supervisor: 'Project Manager',
    f_daily_wage: 1500,
    f_pf_no: 'TN/12345/001',
    f_esi_no: 'ESI-001-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-001',
    f_address: 'No. 12, Anna Nagar, Chennai - 600040',
    f_emergency_contact: 'Sunitha Prakash - 9876543211',
  },
  {
    f_worker_id: 'WRK-002',
    f_full_name: 'Ravi Kumar',
    f_worker_type: 'Skilled Worker',
    f_skill_level: 'Highly Skilled',
    f_trade: 'Steel Erector',
    f_phone: '9845012345',
    f_aadhar: '2345 6789 0123',
    f_doj: '2024-02-01',
    f_status: 'Active',
    f_supervisor: 'Arun Prakash',
    f_daily_wage: 1100,
    f_pf_no: 'TN/12345/002',
    f_esi_no: 'ESI-002-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-002',
    f_address: 'No. 45, T Nagar, Chennai - 600017',
    f_emergency_contact: 'Kamala Kumar - 9845012346',
  },
  {
    f_worker_id: 'WRK-003',
    f_full_name: 'Suresh Babu',
    f_worker_type: 'Skilled Worker',
    f_skill_level: 'Skilled',
    f_trade: 'Formwork Carpenter / Mason',
    f_phone: '9900112233',
    f_aadhar: '3456 7890 1234',
    f_doj: '2024-03-10',
    f_status: 'Active',
    f_supervisor: 'Arun Prakash',
    f_daily_wage: 900,
    f_pf_no: 'TN/12345/003',
    f_esi_no: 'ESI-003-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-003',
    f_address: 'No. 8, Tambaram, Chennai - 600045',
    f_emergency_contact: 'Lalitha Babu - 9900112234',
  },
  {
    f_worker_id: 'WRK-004',
    f_full_name: 'Priya Nair',
    f_worker_type: 'Engineer',
    f_skill_level: 'Highly Skilled',
    f_trade: 'Civil Engineering / Foreman',
    f_phone: '9751234567',
    f_aadhar: '4567 8901 2345',
    f_doj: '2024-02-15',
    f_status: 'Active',
    f_supervisor: 'Project Manager',
    f_daily_wage: 2000,
    f_pf_no: 'TN/12345/004',
    f_esi_no: 'ESI-004-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-004',
    f_address: 'No. 22, Velachery, Chennai - 600042',
    f_emergency_contact: 'Rajan Nair - 9751234568',
  },
  {
    f_worker_id: 'WRK-005',
    f_full_name: 'Karthik M',
    f_worker_type: 'Contractor Staff',
    f_skill_level: 'Highly Skilled',
    f_trade: 'Electrician',
    f_phone: '9988776655',
    f_aadhar: '5678 9012 3456',
    f_doj: '2024-04-01',
    f_status: 'Active',
    f_supervisor: 'Priya Nair',
    f_daily_wage: 1100,
    f_pf_no: 'TN/12345/005',
    f_esi_no: 'ESI-005-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-005',
    f_address: 'No. 56, Porur, Chennai - 600116',
    f_emergency_contact: 'Meenakshi - 9988776656',
  },
  {
    f_worker_id: 'WRK-006',
    f_full_name: 'Vijay Kumar',
    f_worker_type: 'Contractor Staff',
    f_skill_level: 'Highly Skilled',
    f_trade: 'Plumbing & Drainage',
    f_phone: '9444567890',
    f_aadhar: '7890 1234 5678',
    f_doj: '2024-05-10',
    f_status: 'Active',
    f_supervisor: 'Priya Nair',
    f_daily_wage: 1050,
    f_pf_no: 'TN/12345/006',
    f_esi_no: 'ESI-006-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-006',
    f_address: 'No. 11, Adyar, Chennai - 600020',
    f_emergency_contact: 'Kamakshi Kumar - 9444567891',
  },
  {
    f_worker_id: 'WRK-007',
    f_full_name: 'Anand Selvaraj',
    f_worker_type: 'Contractor Staff',
    f_skill_level: 'Highly Skilled',
    f_trade: 'Crane Operator',
    f_phone: '9500223344',
    f_aadhar: '8901 2345 6789',
    f_doj: '2024-04-20',
    f_status: 'Active',
    f_supervisor: 'Arun Prakash',
    f_daily_wage: 1300,
    f_pf_no: 'TN/12345/007',
    f_esi_no: 'ESI-007-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-007',
    f_address: 'No. 33, Perambur, Chennai - 600011',
    f_emergency_contact: 'Selvi Anand - 9500223345',
  },
  {
    f_worker_id: 'WRK-008',
    f_full_name: 'Meena Devi',
    f_worker_type: 'Contractor Staff',
    f_skill_level: 'Skilled',
    f_trade: 'Painter / Interior Finishing',
    f_phone: '9345678901',
    f_aadhar: '9012 3456 7890',
    f_doj: '2024-07-01',
    f_status: 'Active',
    f_supervisor: 'Priya Nair',
    f_daily_wage: 800,
    f_pf_no: 'TN/12345/008',
    f_esi_no: 'ESI-008-24',
    f_medical_fit: 'Valid',
    f_safety_cert: '',
    f_address: 'No. 77, Royapuram, Chennai - 600013',
    f_emergency_contact: 'Raj Devi - 9345678902',
  },
  {
    f_worker_id: 'WRK-009',
    f_full_name: 'Ramesh Patel',
    f_worker_type: 'Labour',
    f_skill_level: 'Semi-Skilled',
    f_trade: 'Excavation / General Labour',
    f_phone: '9123456789',
    f_aadhar: '0123 4567 8901',
    f_doj: '2024-06-15',
    f_status: 'Active',
    f_supervisor: 'Suresh Babu',
    f_daily_wage: 650,
    f_pf_no: 'TN/12345/009',
    f_esi_no: 'ESI-009-24',
    f_medical_fit: 'Valid',
    f_safety_cert: '',
    f_address: 'No. 4, Kodambakkam, Chennai - 600024',
    f_emergency_contact: 'Geeta Patel - 9123456780',
  },
  {
    f_worker_id: 'WRK-010',
    f_full_name: 'Lakshmi Priya',
    f_worker_type: 'Skilled Worker',
    f_skill_level: 'Skilled',
    f_trade: 'Scaffolding Erector',
    f_phone: '9567891234',
    f_aadhar: '1122 3344 5566',
    f_doj: '2024-07-10',
    f_status: 'Active',
    f_supervisor: 'Arun Prakash',
    f_daily_wage: 930,
    f_pf_no: 'TN/12345/010',
    f_esi_no: 'ESI-010-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-010',
    f_address: 'No. 19, Pallavaram, Chennai - 600043',
    f_emergency_contact: 'Gopal Priya - 9567891235',
  },
  {
    f_worker_id: 'WRK-011',
    f_full_name: 'Dinesh Kumar',
    f_worker_type: 'Contractor Staff',
    f_skill_level: 'Skilled',
    f_trade: 'Fire Safety Technician',
    f_phone: '9234567890',
    f_aadhar: '2233 4455 6677',
    f_doj: '2024-08-01',
    f_status: 'Active',
    f_supervisor: 'Arun Prakash',
    f_daily_wage: 980,
    f_pf_no: 'TN/12345/011',
    f_esi_no: 'ESI-011-24',
    f_medical_fit: 'Valid',
    f_safety_cert: 'SC-2025-011',
    f_address: 'No. 25, Chromepet, Chennai - 600044',
    f_emergency_contact: 'Kavitha Dinesh - 9234567891',
  },
];

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 200)}`); }
}

async function apiDelete(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!r.ok) {
    const text = await r.text();
    console.warn(`  ⚠  DELETE ${path} failed (${r.status}): ${text.slice(0, 100)}`);
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
    if (!r.ok) throw new Error(`POST ${path} failed (${r.status}): ${JSON.stringify(data)}`);
    return data;
  } catch (e) {
    if (e.message.startsWith('POST')) throw e;
    throw new Error(`POST ${path} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧑‍💼 BuildTrack — Workers Module Reseeder\n');
  console.log('Canonical workers: 11 (matching Site Entry, Safety Training, Safety Induction)\n');
  console.log(`Backend: ${BASE}\n`);

  // Get all custom modules and find the Workers module
  const allModules = await apiGet('/custom-modules');
  const workersModule = allModules.find(m =>
    /worker/i.test(m.name) && !/site entry|safety/i.test(m.name)
  );

  if (!workersModule) {
    console.error('❌ Workers module not found. Check module name in /api/custom-modules');
    console.log('Available modules:');
    allModules.forEach(m => console.log(`  • "${m.name}" (id=${m.id})`));
    process.exit(1);
  }

  console.log(`✅ Found Workers module: "${workersModule.name}" (id=${workersModule.id})\n`);

  // Delete all existing records
  const existingRecords = await apiGet(`/custom-modules/${workersModule.id}/records`);
  console.log(`📋 Found ${existingRecords.length} existing record(s) — deleting all...`);
  for (const rec of existingRecords) {
    await apiDelete(`/custom-modules/${workersModule.id}/records/${rec.id}`);
    console.log(`  🗑  Deleted record ${rec.id}`);
  }
  if (existingRecords.length > 0) {
    console.log(`  ✓ Deleted ${existingRecords.length} old records\n`);
  }

  // Insert the 11 canonical workers
  console.log(`➕ Inserting ${CANONICAL_WORKERS.length} canonical workers...\n`);
  let inserted = 0;
  for (const worker of CANONICAL_WORKERS) {
    try {
      const created = await apiPost(`/custom-modules/${workersModule.id}/records`, worker);
      console.log(`  ✅ ${worker.f_worker_id}  ${worker.f_full_name.padEnd(20)} ${worker.f_trade}`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ Failed to insert ${worker.f_full_name}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Inserted ${inserted}/${CANONICAL_WORKERS.length} workers.`);
  console.log('\n📋 Workers now consistent across:');
  console.log('   🚧 Site Entry  |  🦺 Safety Training  |  🦺 Safety Induction  |  🧑‍💼 Workers');
}

main().catch(err => {
  console.error('\n❌ Reseeding failed:', err.message || err);
  process.exit(1);
});
