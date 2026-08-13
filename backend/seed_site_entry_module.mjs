/**
 * seed_site_entry_module.mjs
 *
 * Seeds the "🚧 Site Entry" custom module into the live app.
 *
 * Path: BuildTrack → Workforce & Safety → Site Entry
 *
 * Fields:
 *   Worker, Entry ID, Project, Site, Date, Entry Time, Exit Time,
 *   Entry Gate, Contractor, Work Area, Assigned Task, Entry Purpose,
 *   Security Officer
 *
 * Run with: node seed_site_entry_module.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions ────────────────────────────────────────────────────────

function makeSiteEntryFields() {
  return [
    { id: crypto.randomUUID(), label: 'Worker',           type: 'text' },
    { id: crypto.randomUUID(), label: 'Entry ID',         type: 'text' },
    { id: crypto.randomUUID(), label: 'Project',          type: 'text' },
    { id: crypto.randomUUID(), label: 'Site',             type: 'text' },
    { id: crypto.randomUUID(), label: 'Date',             type: 'date' },
    { id: crypto.randomUUID(), label: 'Entry Time',       type: 'text' },
    { id: crypto.randomUUID(), label: 'Exit Time',        type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Entry Gate', type: 'select',
      options: [
        'Main Gate – Gate 01',
        'East Gate – Gate 02',
        'West Gate – Gate 03',
        'North Gate – Gate 04',
        'South Gate – Gate 05',
        'Rear Gate – Gate 06',
      ],
    },
    { id: crypto.randomUUID(), label: 'Contractor',       type: 'text' },
    { id: crypto.randomUUID(), label: 'Work Area',        type: 'text' },
    { id: crypto.randomUUID(), label: 'Assigned Task',    type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Entry Purpose', type: 'select',
      options: [
        'Foundation Work',
        'Structural Erection',
        'Electrical Work',
        'Plumbing & Drainage',
        'Interior Finishing',
        'Safety Inspection',
        'Material Delivery',
        'Equipment Maintenance',
        'Survey & Layout',
        'Other',
      ],
    },
    { id: crypto.randomUUID(), label: 'Security Officer', type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Status', type: 'select',
      options: ['On Site', 'Exited', 'Pending', 'Denied'],
    },
  ];
}

// ── Sample site-entry records ────────────────────────────────────────────────

function makeSampleEntries(fields) {
  // Build label → field.id lookup
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    {
      [f['Worker']]:           'Arun Prakash',
      [f['Entry ID']]:         'ENT-2026-00126',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '08:25 AM',
      [f['Exit Time']]:        '06:10 PM',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Basement Foundation – Zone B',
      [f['Assigned Task']]:    'Reinforcement Bar Installation',
      [f['Entry Purpose']]:    'Foundation Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Ravi Kumar',
      [f['Entry ID']]:         'ENT-2026-00127',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '07:50 AM',
      [f['Exit Time']]:        '05:45 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Column Erection – Bay C',
      [f['Assigned Task']]:    'Steel Column Erection',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Suresh Babu',
      [f['Entry ID']]:         'ENT-2026-00128',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '08:00 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Ground Floor – Block A',
      [f['Assigned Task']]:    'RCC Formwork Setup',
      [f['Entry Purpose']]:    'Foundation Work',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Priya Nair',
      [f['Entry ID']]:         'ENT-2026-00129',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '09:15 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Site Office',
      [f['Assigned Task']]:    'Daily Progress Review',
      [f['Entry Purpose']]:    'Safety Inspection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Karthik M',
      [f['Entry ID']]:         'ENT-2026-00130',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '10:30 AM',
      [f['Exit Time']]:        '04:00 PM',
      [f['Entry Gate']]:       'West Gate – Gate 03',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Work Area']]:        'Electrical Panel Room',
      [f['Assigned Task']]:    'LT Panel Wiring',
      [f['Entry Purpose']]:    'Electrical Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Vijay Kumar',
      [f['Entry ID']]:         'ENT-2026-00131',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '08:45 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'North Gate – Gate 04',
      [f['Contractor']]:       'Vijay Plumbing',
      [f['Work Area']]:        'Basement – Drainage Zone',
      [f['Assigned Task']]:    'Drain Pipe Installation',
      [f['Entry Purpose']]:    'Plumbing & Drainage',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
  ];
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 200)}`); }
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚧 BuildTrack — Site Entry Module Seeder\n');
  console.log(`Backend: ${BASE}\n`);

  const MODULE_NAME = '🚧 Site Entry';

  // 1. Check if module already exists
  console.log('Fetching existing custom modules…');
  const existingModules = await apiGet('/custom-modules');
  const existing = existingModules.find((m) => m.name === MODULE_NAME);

  const fields = makeSiteEntryFields();
  let module;

  if (existing) {
    console.log(`  ⚠  Module "${MODULE_NAME}" already exists (id=${existing.id}). Updating fields…`);
    const r = await fetch(`${BASE}/custom-modules/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    module = await r.json();
    console.log(`  ✓ Fields updated on module id=${module.id}`);
  } else {
    module = await apiPost('/custom-modules', { name: MODULE_NAME, fields });
    console.log(`  ✓ Created "${MODULE_NAME}" module id=${module.id} with ${fields.length} fields`);
  }

  // 2. Resolve saved fields (may be JSON string in DB)
  const savedFields = typeof module.fields === 'string'
    ? JSON.parse(module.fields)
    : module.fields;

  // 3. Check if records already exist
  const existingRecords = await apiGet(`/custom-modules/${module.id}/records`);
  if (existingRecords.length > 0) {
    console.log(`\n  ℹ  Module already has ${existingRecords.length} records. Skipping record seeding.`);
    console.log('\n✅ Done — no duplicate records created.');
    return;
  }

  // 4. Create sample records
  const entries = makeSampleEntries(savedFields);
  console.log(`\nSeeding ${entries.length} site entry records…`);

  for (const entry of entries) {
    const rec = await apiPost(`/custom-modules/${module.id}/records`, entry);
    const workerField = savedFields.find((f) => f.label === 'Worker');
    const workerName = workerField ? entry[workerField.id] : 'Worker';
    const entryIdField = savedFields.find((f) => f.label === 'Entry ID');
    const entryId = entryIdField ? entry[entryIdField.id] : '';
    console.log(`    ➕ ${entryId}  ${workerName}  (record id=${rec.id})`);
  }

  console.log(`\n✅ Site Entry module seeding complete!`);
  console.log(`\nView in app: Navigate to Workforce & Safety → Site Entry`);
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
