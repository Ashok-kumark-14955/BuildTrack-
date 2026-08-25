/**
 * reseed_safety_induction.mjs
 *
 * Deletes existing (corrupt) records from the Safety Induction modules
 * and re-seeds them using the ACTUAL field IDs from the live module definitions.
 *
 * Run with: node backend/reseed_safety_induction.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

const PROJECTS = [
  { id: 'c6b44879-dfd8-4a1f-984d-38b2b46f180b', name: 'House Building Project',                moduleId: '476111000000101097' },
  { id: 'd925af2e-56fe-44d9-a6dd-bc23a50f81a8', name: 'Apex Steel Industrial Complex – Phase 1', moduleId: '476111000000101116' },
];

// ── Sample record data (by label — we'll map to IDs at runtime) ──────────────

function makeSampleRecordsByLabel() {
  return [
    {
      'Induction ID':         'IND-2026-00125',
      'Worker':               'Ravi Kumar',
      'Project':              'GreenSteel Industrial Building',
      'Site':                 'Chennai Industrial Site',
      'Contractor':           'ABC Steel Contractors',
      'Induction Type':       'New Worker Site Induction',
      'Induction Date':       '2026-08-13',
      'Induction Time':       '08:00 AM',
      'Trainer':              'Arun Prakash – Safety Officer',
      'Work Area':            'Steel Erection – Zone A',
      'Job Role / Trade':     'Steel Erector',
      'Induction Status':     'Completed',
      'Assessment Required':  'Yes',
      'Assessment Score':     '92%',
      'Assessment Result':    'Passed',
      'Certificate No.':      'SIC-2026-00125',
      'Valid From':           '2026-08-13',
      'Valid Until':          '2027-08-12',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'PPE Requirements',
    },
    {
      'Induction ID':         'IND-2026-00126',
      'Worker':               'Suresh Babu',
      'Project':              'GreenSteel Industrial Building',
      'Site':                 'Chennai Industrial Site',
      'Contractor':           'Raj Masonry Works',
      'Induction Type':       'New Worker Site Induction',
      'Induction Date':       '2026-08-13',
      'Induction Time':       '08:30 AM',
      'Trainer':              'Arun Prakash – Safety Officer',
      'Work Area':            'Foundation – Block B',
      'Job Role / Trade':     'Mason',
      'Induction Status':     'Completed',
      'Assessment Required':  'Yes',
      'Assessment Score':     '88%',
      'Assessment Result':    'Passed',
      'Certificate No.':      'SIC-2026-00126',
      'Valid From':           '2026-08-13',
      'Valid Until':          '2027-08-12',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Site Rules & Regulations',
    },
    {
      'Induction ID':         'IND-2026-00127',
      'Worker':               'Priya Nair',
      'Project':              'GreenSteel Industrial Building',
      'Site':                 'Chennai Industrial Site',
      'Contractor':           'ABC Steel Contractors',
      'Induction Type':       'Refresher Induction',
      'Induction Date':       '2026-08-14',
      'Induction Time':       '09:00 AM',
      'Trainer':              'Deepa Rao – HSE Manager',
      'Work Area':            'All Zones',
      'Job Role / Trade':     'Foreman',
      'Induction Status':     'Completed',
      'Assessment Required':  'No',
      'Assessment Score':     '',
      'Assessment Result':    'Waived',
      'Certificate No.':      'SIC-2026-00127',
      'Valid From':           '2026-08-14',
      'Valid Until':          '2027-08-13',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Emergency Procedures',
    },
    {
      'Induction ID':         'IND-2026-00128',
      'Worker':               'Karthik M',
      'Project':              'Prestige Heights Residential',
      'Site':                 'Whitefield – Phase 2',
      'Contractor':           'Arjun Electricals',
      'Induction Type':       'New Worker Site Induction',
      'Induction Date':       '2026-08-10',
      'Induction Time':       '07:30 AM',
      'Trainer':              'Siva Shankar – Safety Supervisor',
      'Work Area':            'Electrical – Floor 4 to 8',
      'Job Role / Trade':     'Electrician',
      'Induction Status':     'Completed',
      'Assessment Required':  'Yes',
      'Assessment Score':     '95%',
      'Assessment Result':    'Passed',
      'Certificate No.':      'SIC-2026-00128',
      'Valid From':           '2026-08-10',
      'Valid Until':          '2027-08-09',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Electrical Safety',
    },
    {
      'Induction ID':         'IND-2026-00129',
      'Worker':               'Vijay Kumar',
      'Project':              'Prestige Heights Residential',
      'Site':                 'Whitefield – Phase 2',
      'Contractor':           'Vijay Plumbing',
      'Induction Type':       'New Worker Site Induction',
      'Induction Date':       '2026-08-11',
      'Induction Time':       '08:00 AM',
      'Trainer':              'Siva Shankar – Safety Supervisor',
      'Work Area':            'Plumbing – Basement to Ground',
      'Job Role / Trade':     'Plumber',
      'Induction Status':     'In Progress',
      'Assessment Required':  'Yes',
      'Assessment Score':     '',
      'Assessment Result':    'Not Attempted',
      'Certificate No.':      '',
      'Valid From':           '',
      'Valid Until':          '',
      'Worker Signature':     'Pending',
      'Trainer Signature':    'Pending',
      'Induction Topics':     'First Aid',
    },
    {
      'Induction ID':         'IND-2026-00130',
      'Worker':               'Anand Selvaraj',
      'Project':              'GreenSteel Industrial Building',
      'Site':                 'Chennai Industrial Site',
      'Contractor':           'Crane Masters Pvt Ltd',
      'Induction Type':       'Contractor Induction',
      'Induction Date':       '2026-08-12',
      'Induction Time':       '07:00 AM',
      'Trainer':              'Arun Prakash – Safety Officer',
      'Work Area':            'Crane Operations – Bay 1',
      'Job Role / Trade':     'Crane Operator',
      'Induction Status':     'Completed',
      'Assessment Required':  'Yes',
      'Assessment Score':     '97%',
      'Assessment Result':    'Passed',
      'Certificate No.':      'SIC-2026-00130',
      'Valid From':           '2026-08-12',
      'Valid Until':          '2027-08-11',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Lifting & Rigging Safety',
    },
    {
      'Induction ID':         'IND-2026-00131',
      'Worker':               'Meena Devi',
      'Project':              'Prestige Heights Residential',
      'Site':                 'Whitefield – Phase 2',
      'Contractor':           'Shine Interiors',
      'Induction Type':       'Sub-Contractor Induction',
      'Induction Date':       '2026-08-15',
      'Induction Time':       '09:30 AM',
      'Trainer':              'Deepa Rao – HSE Manager',
      'Work Area':            'Interior Finishing – Floors 1-3',
      'Job Role / Trade':     'Painter',
      'Induction Status':     'Pending',
      'Assessment Required':  'Yes',
      'Assessment Score':     '',
      'Assessment Result':    'Not Attempted',
      'Certificate No.':      '',
      'Valid From':           '',
      'Valid Until':          '',
      'Worker Signature':     'Pending',
      'Trainer Signature':    'Pending',
      'Induction Topics':     'PPE Requirements',
    },
    {
      'Induction ID':         'IND-2026-00132',
      'Worker':               'Ramesh Patel',
      'Project':              'GreenSteel Industrial Building',
      'Site':                 'Chennai Industrial Site',
      'Contractor':           'Deep Earth Contractors',
      'Induction Type':       'New Worker Site Induction',
      'Induction Date':       '2026-08-08',
      'Induction Time':       '08:00 AM',
      'Trainer':              'Arun Prakash – Safety Officer',
      'Work Area':            'Excavation – Zone C',
      'Job Role / Trade':     'General Labour',
      'Induction Status':     'Expired',
      'Assessment Required':  'Yes',
      'Assessment Score':     '72%',
      'Assessment Result':    'Passed',
      'Certificate No.':      'SIC-2026-00132',
      'Valid From':           '2026-07-08',
      'Valid Until':          '2026-08-07',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Excavation Safety',
    },
    {
      'Induction ID':         'IND-2026-00133',
      'Worker':               'Lakshmi Priya',
      'Project':              'Prestige Heights Residential',
      'Site':                 'Whitefield – Phase 2',
      'Contractor':           'HighWorks Safety Solutions',
      'Induction Type':       'Refresher Induction',
      'Induction Date':       '2026-08-16',
      'Induction Time':       '10:00 AM',
      'Trainer':              'Siva Shankar – Safety Supervisor',
      'Work Area':            'Scaffolding – External Facade',
      'Job Role / Trade':     'Scaffold Erector',
      'Induction Status':     'Completed',
      'Assessment Required':  'Yes',
      'Assessment Score':     '89%',
      'Assessment Result':    'Passed',
      'Certificate No.':      'SIC-2026-00133',
      'Valid From':           '2026-08-16',
      'Valid Until':          '2027-08-15',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Working at Height',
    },
    {
      'Induction ID':         'IND-2026-00134',
      'Worker':               'Dinesh Kumar',
      'Project':              'GreenSteel Industrial Building',
      'Site':                 'Chennai Industrial Site',
      'Contractor':           'Fire Guard Systems',
      'Induction Type':       'Visitor Induction',
      'Induction Date':       '2026-08-17',
      'Induction Time':       '11:00 AM',
      'Trainer':              'Deepa Rao – HSE Manager',
      'Work Area':            'Site Office & Fire Equipment Areas',
      'Job Role / Trade':     'Fire Safety Technician',
      'Induction Status':     'Completed',
      'Assessment Required':  'No',
      'Assessment Score':     '',
      'Assessment Result':    'Waived',
      'Certificate No.':      'SIC-2026-00134',
      'Valid From':           '2026-08-17',
      'Valid Until':          '2026-08-17',
      'Worker Signature':     'Completed',
      'Trainer Signature':    'Completed',
      'Induction Topics':     'Fire Safety',
    },
  ];
}

// ── API helpers ───────────────────────────────────────────────────────────────

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
  const data = JSON.parse(text);
  if (!r.ok) throw new Error(`POST ${path} failed (${r.status}): ${JSON.stringify(data)}`);
  return data;
}

async function apiDelete(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  const text = await r.text();
  return text;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function reseedForProject(project) {
  console.log(`\n📋 Project: "${project.name}"`);

  // Fetch the module to get canonical field IDs
  const allModules = await apiGet(`/custom-modules?projectId=${project.id}`);
  const module = allModules.find(m => m.id === project.moduleId);
  if (!module) {
    console.log(`  ❌ Module ${project.moduleId} not found for this project`);
    return;
  }

  const fields = Array.isArray(module.fields) ? module.fields : [];
  console.log(`  ✓ Module "${module.name}" has ${fields.length} fields`);

  // Build label → id map
  const labelToId = {};
  for (const f of fields) labelToId[f.label] = f.id;

  // Fetch existing records and delete them
  const existingRecords = await apiGet(`/custom-modules/${project.moduleId}/records`);
  if (existingRecords.length > 0) {
    console.log(`  🗑  Deleting ${existingRecords.length} existing (corrupt) records...`);
    for (const rec of existingRecords) {
      await apiDelete(`/custom-modules/${project.moduleId}/records/${rec.id}`);
    }
    console.log(`  ✓ Deleted ${existingRecords.length} records`);
  }

  // Re-seed with correct field IDs
  const sampleRecords = makeSampleRecordsByLabel();
  console.log(`  ➕ Seeding ${sampleRecords.length} records with correct field IDs...`);

  for (const recByLabel of sampleRecords) {
    // Convert label-keyed record to id-keyed record
    const data = {};
    for (const [label, value] of Object.entries(recByLabel)) {
      const fieldId = labelToId[label];
      if (fieldId) data[fieldId] = value;
      else console.warn(`    ⚠ Field "${label}" not found in module, skipping`);
    }

    const created = await apiPost(`/custom-modules/${project.moduleId}/records`, { data });
    const workerId = labelToId['Worker'];
    const inductionIdField = labelToId['Induction ID'];
    const workerName = workerId ? recByLabel['Worker'] : '—';
    const inductionId = inductionIdField ? recByLabel['Induction ID'] : '—';
    console.log(`    ✓ ${inductionId} — ${workerName} (record id=${created.id})`);
  }

  console.log(`  ✅ ${sampleRecords.length} records seeded successfully`);
}

async function main() {
  console.log('🔄 Re-seeding Safety Induction records with correct field IDs\n');
  console.log(`Backend: ${BASE}`);

  for (const project of PROJECTS) {
    await reseedForProject(project);
  }

  console.log('\n\n✅ Re-seeding complete! Safety Induction modules now have correct data.');
}

main().catch(err => {
  console.error('\n❌ Re-seeding failed:', err.message || err);
  process.exit(1);
});
