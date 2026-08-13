/**
 * seed_worker_module.mjs
 * Seeds the "Worker Information" custom module with realistic sample data.
 * Run with: node seed_worker_module.mjs
 *
 * Uses the live Catalyst backend REST API.
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api/custom-modules';
const MODULE_ID = '59125000000050009'; // Worker Information (already exists)

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${method} ${path} → HTTP ${r.status}: ${text.slice(0, 300)}`);
  }
  const text = await r.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${method} ${path} returned non-JSON: ${text.slice(0, 300)}`);
  }
}

// ─── Sample worker records (using f_ field IDs) ──────────────────────────────
const SAMPLE_WORKERS = [
  {
    f_worker_id: 'WRK-001', f_full_name: 'Rajesh Sharma',
    f_worker_type: 'Supervisor', f_skill_level: 'Highly Skilled',
    f_trade: 'Civil & Structural Supervision',
    f_phone: '9876543210', f_aadhar: '1234 5678 9012', f_doj: '2024-01-15',
    f_status: 'Active', f_supervisor: 'Site Manager - Kumar',
    f_daily_wage: 1200, f_pf_no: 'TN/12345/001', f_esi_no: 'ESI-001-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-001',
    f_address: 'No. 12, Anna Nagar, Chennai - 600040',
    f_emergency_contact: 'Sunita Sharma - 9876543211',
  },
  {
    f_worker_id: 'WRK-002', f_full_name: 'Priya Nair',
    f_worker_type: 'Engineer', f_skill_level: 'Highly Skilled',
    f_trade: 'Civil Engineering',
    f_phone: '9845012345', f_aadhar: '2345 6789 0123', f_doj: '2024-02-01',
    f_status: 'Active', f_supervisor: 'Project Manager - Anand',
    f_daily_wage: 2000, f_pf_no: 'TN/12345/002', f_esi_no: 'ESI-002-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-002',
    f_address: 'No. 45, T Nagar, Chennai - 600017',
    f_emergency_contact: 'Rajan Nair - 9845012346',
  },
  {
    f_worker_id: 'WRK-003', f_full_name: 'Suresh Babu',
    f_worker_type: 'Skilled Worker', f_skill_level: 'Skilled',
    f_trade: 'Formwork Carpenter',
    f_phone: '9900112233', f_aadhar: '3456 7890 1234', f_doj: '2024-03-10',
    f_status: 'Active', f_supervisor: 'Rajesh Sharma',
    f_daily_wage: 900, f_pf_no: 'TN/12345/003', f_esi_no: 'ESI-003-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-003',
    f_address: 'No. 8, Tambaram, Chennai - 600045',
    f_emergency_contact: 'Lalitha Babu - 9900112234',
  },
  {
    f_worker_id: 'WRK-004', f_full_name: 'Karthik Murugan',
    f_worker_type: 'Skilled Worker', f_skill_level: 'Semi-Skilled',
    f_trade: 'Mason / Bricklayer',
    f_phone: '9751234567', f_aadhar: '4567 8901 2345', f_doj: '2024-03-15',
    f_status: 'Active', f_supervisor: 'Rajesh Sharma',
    f_daily_wage: 850, f_pf_no: 'TN/12345/004', f_esi_no: 'ESI-004-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-004',
    f_address: 'No. 22, Velachery, Chennai - 600042',
    f_emergency_contact: 'Meenakshi - 9751234568',
  },
  {
    f_worker_id: 'WRK-005', f_full_name: 'Arjun Venkatesh',
    f_worker_type: 'Contractor Staff', f_skill_level: 'Highly Skilled',
    f_trade: 'Electrical Work',
    f_phone: '9988776655', f_aadhar: '5678 9012 3456', f_doj: '2024-04-01',
    f_status: 'Active', f_supervisor: 'Priya Nair',
    f_daily_wage: 1100, f_pf_no: 'TN/12345/005', f_esi_no: 'ESI-005-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-005',
    f_address: 'No. 56, Porur, Chennai - 600116',
    f_emergency_contact: 'Kamala Venkatesh - 9988776656',
  },
  {
    f_worker_id: 'WRK-006', f_full_name: 'Lakshmi Rajan',
    f_worker_type: 'Contractor Staff', f_skill_level: 'Skilled',
    f_trade: 'Electrical Wiring',
    f_phone: '9876001122', f_aadhar: '6789 0123 4567', f_doj: '2024-04-01',
    f_status: 'Active', f_supervisor: 'Priya Nair',
    f_daily_wage: 950, f_pf_no: 'TN/12345/006', f_esi_no: 'ESI-006-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-006',
    f_address: 'No. 33, Perambur, Chennai - 600011',
    f_emergency_contact: 'Rajan K - 9876001123',
  },
  {
    f_worker_id: 'WRK-007', f_full_name: 'Vijay Kumar',
    f_worker_type: 'Contractor Staff', f_skill_level: 'Highly Skilled',
    f_trade: 'Plumbing & Drainage',
    f_phone: '9444567890', f_aadhar: '7890 1234 5678', f_doj: '2024-05-10',
    f_status: 'Active', f_supervisor: 'Priya Nair',
    f_daily_wage: 1050, f_pf_no: 'TN/12345/007', f_esi_no: 'ESI-007-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-007',
    f_address: 'No. 11, Adyar, Chennai - 600020',
    f_emergency_contact: 'Kamakshi Kumar - 9444567891',
  },
  {
    f_worker_id: 'WRK-008', f_full_name: 'Mohammed Salim',
    f_worker_type: 'Labour', f_skill_level: 'Unskilled',
    f_trade: 'General Labour',
    f_phone: '9345678901', f_aadhar: '8901 2345 6789', f_doj: '2024-06-01',
    f_status: 'Active', f_supervisor: 'Suresh Babu',
    f_daily_wage: 600, f_pf_no: 'TN/12345/008', f_esi_no: 'ESI-008-23',
    f_medical_fit: 'Valid', f_safety_cert: '',
    f_address: 'No. 77, Royapuram, Chennai - 600013',
    f_emergency_contact: 'Ayesha Salim - 9345678902',
  },
  {
    f_worker_id: 'WRK-009', f_full_name: 'Deepa Chandran',
    f_worker_type: 'Labour', f_skill_level: 'Unskilled',
    f_trade: 'Material Handling',
    f_phone: '9123456789', f_aadhar: '9012 3456 7890', f_doj: '2024-06-15',
    f_status: 'On Leave', f_supervisor: 'Suresh Babu',
    f_daily_wage: 580, f_pf_no: 'TN/12345/009', f_esi_no: 'ESI-009-23',
    f_medical_fit: 'Pending', f_safety_cert: '',
    f_address: 'No. 4, Kodambakkam, Chennai - 600024',
    f_emergency_contact: 'Chandran M - 9123456780',
  },
  {
    f_worker_id: 'WRK-010', f_full_name: 'Ramesh Pillai',
    f_worker_type: 'Skilled Worker', f_skill_level: 'Skilled',
    f_trade: 'Steel Fixer / Bar Bender',
    f_phone: '9567891234', f_aadhar: '0123 4567 8901', f_doj: '2024-07-01',
    f_status: 'Active', f_supervisor: 'Rajesh Sharma',
    f_daily_wage: 880, f_pf_no: 'TN/12345/010', f_esi_no: 'ESI-010-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-010',
    f_address: 'No. 19, Pallavaram, Chennai - 600043',
    f_emergency_contact: 'Geetha Pillai - 9567891235',
  },
  {
    f_worker_id: 'WRK-011', f_full_name: 'Anita Singh',
    f_worker_type: 'Labour', f_skill_level: 'Unskilled',
    f_trade: 'Painting Assistant',
    f_phone: '9234567890', f_aadhar: '1122 3344 5566', f_doj: '2024-08-01',
    f_status: 'Active', f_supervisor: 'Karthik Murugan',
    f_daily_wage: 550, f_pf_no: 'TN/12345/011', f_esi_no: 'ESI-011-23',
    f_medical_fit: 'Valid', f_safety_cert: '',
    f_address: 'No. 30, Vyasarpadi, Chennai - 600039',
    f_emergency_contact: 'Ravi Singh - 9234567891',
  },
  {
    f_worker_id: 'WRK-012', f_full_name: 'Balakrishnan T',
    f_worker_type: 'Skilled Worker', f_skill_level: 'Semi-Skilled',
    f_trade: 'Tiling / Flooring',
    f_phone: '9811223344', f_aadhar: '2233 4455 6677', f_doj: '2024-09-01',
    f_status: 'Active', f_supervisor: 'Karthik Murugan',
    f_daily_wage: 820, f_pf_no: 'TN/12345/012', f_esi_no: 'ESI-012-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-012',
    f_address: 'No. 6, Mylapore, Chennai - 600004',
    f_emergency_contact: 'Radha Bala - 9811223345',
  },
  {
    f_worker_id: 'WRK-013', f_full_name: 'Ganesh Iyer',
    f_worker_type: 'Supervisor', f_skill_level: 'Highly Skilled',
    f_trade: 'MEP Coordination',
    f_phone: '9655443322', f_aadhar: '3344 5566 7788', f_doj: '2024-10-01',
    f_status: 'Active', f_supervisor: 'Priya Nair',
    f_daily_wage: 1300, f_pf_no: 'TN/12345/013', f_esi_no: 'ESI-013-23',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-013',
    f_address: 'No. 14, Nungambakkam, Chennai - 600034',
    f_emergency_contact: 'Saraswathi Iyer - 9655443323',
  },
  {
    f_worker_id: 'WRK-014', f_full_name: 'Parvathi Devi',
    f_worker_type: 'Labour', f_skill_level: 'Unskilled',
    f_trade: 'Site Cleaning',
    f_phone: '9777888999', f_aadhar: '4455 6677 8899', f_doj: '2024-11-01',
    f_status: 'Inactive', f_supervisor: 'Suresh Babu',
    f_daily_wage: 500, f_pf_no: '', f_esi_no: '',
    f_medical_fit: 'Expired', f_safety_cert: '',
    f_address: 'No. 3, Sholinganallur, Chennai - 600119',
    f_emergency_contact: 'Ramu - 9777888998',
  },
  {
    f_worker_id: 'WRK-015', f_full_name: 'Selvam Pandian',
    f_worker_type: 'Skilled Worker', f_skill_level: 'Skilled',
    f_trade: 'Scaffolding Erector',
    f_phone: '9500112233', f_aadhar: '5566 7788 9900', f_doj: '2025-01-10',
    f_status: 'Active', f_supervisor: 'Rajesh Sharma',
    f_daily_wage: 930, f_pf_no: 'TN/12345/015', f_esi_no: 'ESI-015-25',
    f_medical_fit: 'Valid', f_safety_cert: 'SC-2025-015',
    f_address: 'No. 25, Chromepet, Chennai - 600044',
    f_emergency_contact: 'Valli Selvam - 9500112234',
  },
];

// ─── Safely parse a record's data field ─────────────────────────────────────
// Some old records store a very large base64 blob in nested JSON fields.
// We only need the first field key to detect UUID vs f_ keyed records,
// so we can use a regex instead of JSON.parse to avoid 10 KB string limits.
function getFirstDataKey(dataStr) {
  if (typeof dataStr !== 'string') return Object.keys(dataStr || {})[0] || '';
  const m = dataStr.match(/"([^"]+)"\s*:/);
  return m ? m[1] : '';
}

function safeParseData(dataStr) {
  if (typeof dataStr !== 'string') return dataStr || {};
  try {
    return JSON.parse(dataStr);
  } catch {
    return null; // too large / corrupt
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏗  Seeding Worker Information custom module...\n');
  console.log(`  Module ID: ${MODULE_ID}`);

  // 1. Fetch existing records (outer array parses fine; data strings may be large)
  console.log('\n  Fetching existing records...');
  const existingRecords = await api('GET', `/${MODULE_ID}/records`);
  const records = Array.isArray(existingRecords) ? existingRecords : [];
  console.log(`  Found ${records.length} existing record(s).`);

  // 2. Categorise records by first data key (UUID vs f_ prefix)
  let deleted = 0;
  const existingWorkerIds = new Set();

  for (const rec of records) {
    const recordId = rec.id || rec.ROWID;
    const firstKey = getFirstDataKey(rec.data);

    if (!firstKey.startsWith('f_')) {
      // Stale record keyed by UUID — delete it
      console.log(`  🗑  Deleting stale record ${recordId}...`);
      await api('DELETE', `/${MODULE_ID}/records/${recordId}`);
      deleted++;
    } else {
      // Already seeded with f_ keys — extract worker ID to skip duplicate
      const parsed = safeParseData(rec.data);
      if (parsed && parsed.f_worker_id) {
        existingWorkerIds.add(parsed.f_worker_id);
      }
    }
  }

  if (deleted > 0) {
    console.log(`  Deleted ${deleted} stale record(s).`);
  }
  console.log(`  Existing worker IDs to preserve: ${existingWorkerIds.size === 0 ? 'none' : [...existingWorkerIds].join(', ')}\n`);

  // 3. Insert missing records
  let inserted = 0;
  let skipped = 0;

  for (const worker of SAMPLE_WORKERS) {
    if (existingWorkerIds.has(worker.f_worker_id)) {
      console.log(`  ⏭  Skip ${worker.f_worker_id} (${worker.f_full_name}) — already exists`);
      skipped++;
      continue;
    }

    const result = await api('POST', `/${MODULE_ID}/records`, worker);
    if (result.id || result.ROWID) {
      console.log(`  ✓  ${worker.f_worker_id}  ${worker.f_full_name.padEnd(25)} ${worker.f_trade}`);
      inserted++;
    } else {
      console.warn(`  ✗  Failed to insert ${worker.f_worker_id}: ${JSON.stringify(result)}`);
    }
  }

  console.log(`\n✅ Done! Deleted stale: ${deleted}  Inserted: ${inserted}  Skipped: ${skipped}`);
  console.log(`\nOpen the app → Custom Modules → Worker Information to see the data.`);
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
