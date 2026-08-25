/**
 * seed_safety_induction.mjs
 *
 * Seeds the "🦺 Safety Induction" custom module into all BuildTrack projects.
 *
 * Run with: node backend/seed_safety_induction.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions ────────────────────────────────────────────────────────

function makeSafetyInductionFields() {
  return [
    { id: crypto.randomUUID(), label: 'Induction ID',        type: 'text' },
    { id: crypto.randomUUID(), label: 'Worker',               type: 'text' },
    { id: crypto.randomUUID(), label: 'Project',              type: 'text' },
    { id: crypto.randomUUID(), label: 'Site',                 type: 'text' },
    { id: crypto.randomUUID(), label: 'Contractor',           type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Induction Type', type: 'select',
      options: [
        'New Worker Site Induction',
        'Refresher Induction',
        'Visitor Induction',
        'Contractor Induction',
        'Sub-Contractor Induction',
      ],
    },
    { id: crypto.randomUUID(), label: 'Induction Date',      type: 'date' },
    { id: crypto.randomUUID(), label: 'Induction Time',      type: 'text' },
    { id: crypto.randomUUID(), label: 'Trainer',              type: 'text' },
    { id: crypto.randomUUID(), label: 'Work Area',            type: 'text' },
    { id: crypto.randomUUID(), label: 'Job Role / Trade',     type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Induction Status', type: 'select',
      options: ['Completed', 'In Progress', 'Pending', 'Expired', 'Cancelled'],
    },
    {
      id: crypto.randomUUID(), label: 'Assessment Required', type: 'select',
      options: ['Yes', 'No'],
    },
    { id: crypto.randomUUID(), label: 'Assessment Score',    type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Assessment Result', type: 'select',
      options: ['Passed', 'Failed', 'Not Attempted', 'Waived'],
    },
    { id: crypto.randomUUID(), label: 'Certificate No.',     type: 'text' },
    { id: crypto.randomUUID(), label: 'Valid From',           type: 'date' },
    { id: crypto.randomUUID(), label: 'Valid Until',          type: 'date' },
    {
      id: crypto.randomUUID(), label: 'Worker Signature', type: 'select',
      options: ['Completed', 'Pending', 'Waived'],
    },
    {
      id: crypto.randomUUID(), label: 'Trainer Signature', type: 'select',
      options: ['Completed', 'Pending', 'Waived'],
    },
    {
      id: crypto.randomUUID(), label: 'Induction Topics', type: 'select',
      options: [
        'Site Rules & Regulations',
        'PPE Requirements',
        'Emergency Procedures',
        'Fire Safety',
        'First Aid',
        'Working at Height',
        'Electrical Safety',
        'Lifting & Rigging Safety',
        'Excavation Safety',
      ],
    },
  ];
}

// ── Sample records ────────────────────────────────────────────────────────────

function makeSampleRecords(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    {
      [f['Induction ID']]:         'IND-2026-00125',
      [f['Worker']]:               'Ravi Kumar',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-13',
      [f['Induction Time']]:       '08:00 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Steel Erection – Zone A',
      [f['Job Role / Trade']]:     'Steel Erector',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '92%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00125',
      [f['Valid From']]:           '2026-08-13',
      [f['Valid Until']]:          '2027-08-12',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'PPE Requirements',
    },
    {
      [f['Induction ID']]:         'IND-2026-00126',
      [f['Worker']]:               'Suresh Babu',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Raj Masonry Works',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-13',
      [f['Induction Time']]:       '08:30 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Foundation – Block B',
      [f['Job Role / Trade']]:     'Mason',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '88%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00126',
      [f['Valid From']]:           '2026-08-13',
      [f['Valid Until']]:          '2027-08-12',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Site Rules & Regulations',
    },
    {
      [f['Induction ID']]:         'IND-2026-00127',
      [f['Worker']]:               'Priya Nair',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Induction Type']]:       'Refresher Induction',
      [f['Induction Date']]:       '2026-08-14',
      [f['Induction Time']]:       '09:00 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'All Zones',
      [f['Job Role / Trade']]:     'Foreman',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'No',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Waived',
      [f['Certificate No.']]:      'SIC-2026-00127',
      [f['Valid From']]:           '2026-08-14',
      [f['Valid Until']]:          '2027-08-13',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Emergency Procedures',
    },
    {
      [f['Induction ID']]:         'IND-2026-00128',
      [f['Worker']]:               'Karthik M',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Arjun Electricals',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-10',
      [f['Induction Time']]:       '07:30 AM',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Work Area']]:            'Electrical – Floor 4 to 8',
      [f['Job Role / Trade']]:     'Electrician',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '95%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00128',
      [f['Valid From']]:           '2026-08-10',
      [f['Valid Until']]:          '2027-08-09',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Electrical Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00129',
      [f['Worker']]:               'Vijay Kumar',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Vijay Plumbing',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-11',
      [f['Induction Time']]:       '08:00 AM',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Work Area']]:            'Plumbing – Basement to Ground',
      [f['Job Role / Trade']]:     'Plumber',
      [f['Induction Status']]:     'In Progress',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Valid From']]:           '',
      [f['Valid Until']]:          '',
      [f['Worker Signature']]:     'Pending',
      [f['Trainer Signature']]:    'Pending',
      [f['Induction Topics']]:     'First Aid',
    },
    {
      [f['Induction ID']]:         'IND-2026-00130',
      [f['Worker']]:               'Anand Selvaraj',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Crane Masters Pvt Ltd',
      [f['Induction Type']]:       'Contractor Induction',
      [f['Induction Date']]:       '2026-08-12',
      [f['Induction Time']]:       '07:00 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Crane Operations – Bay 1',
      [f['Job Role / Trade']]:     'Crane Operator',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '97%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00130',
      [f['Valid From']]:           '2026-08-12',
      [f['Valid Until']]:          '2027-08-11',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Lifting & Rigging Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00131',
      [f['Worker']]:               'Meena Devi',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Shine Interiors',
      [f['Induction Type']]:       'Sub-Contractor Induction',
      [f['Induction Date']]:       '2026-08-15',
      [f['Induction Time']]:       '09:30 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'Interior Finishing – Floors 1-3',
      [f['Job Role / Trade']]:     'Painter',
      [f['Induction Status']]:     'Pending',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Valid From']]:           '',
      [f['Valid Until']]:          '',
      [f['Worker Signature']]:     'Pending',
      [f['Trainer Signature']]:    'Pending',
      [f['Induction Topics']]:     'PPE Requirements',
    },
    {
      [f['Induction ID']]:         'IND-2026-00132',
      [f['Worker']]:               'Ramesh Patel',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Deep Earth Contractors',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-08',
      [f['Induction Time']]:       '08:00 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Excavation – Zone C',
      [f['Job Role / Trade']]:     'General Labour',
      [f['Induction Status']]:     'Expired',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '72%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00132',
      [f['Valid From']]:           '2026-07-08',
      [f['Valid Until']]:          '2026-08-07',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Excavation Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00133',
      [f['Worker']]:               'Lakshmi Priya',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'HighWorks Safety Solutions',
      [f['Induction Type']]:       'Refresher Induction',
      [f['Induction Date']]:       '2026-08-16',
      [f['Induction Time']]:       '10:00 AM',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Work Area']]:            'Scaffolding – External Facade',
      [f['Job Role / Trade']]:     'Scaffold Erector',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '89%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00133',
      [f['Valid From']]:           '2026-08-16',
      [f['Valid Until']]:          '2027-08-15',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Working at Height',
    },
    {
      [f['Induction ID']]:         'IND-2026-00134',
      [f['Worker']]:               'Dinesh Kumar',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Fire Guard Systems',
      [f['Induction Type']]:       'Visitor Induction',
      [f['Induction Date']]:       '2026-08-17',
      [f['Induction Time']]:       '11:00 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'Site Office & Fire Equipment Areas',
      [f['Job Role / Trade']]:     'Fire Safety Technician',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'No',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Waived',
      [f['Certificate No.']]:      'SIC-2026-00134',
      [f['Valid From']]:           '2026-08-17',
      [f['Valid Until']]:          '2026-08-17',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Fire Safety',
    },
  ];
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 200)}`); }
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

async function seedForProject(project) {
  const MODULE_NAME = '🦺 Safety Induction';
  console.log(`\n📋 Project: "${project.name}" (${project.id})`);

  // Check if module already exists for this project
  const allModules = await apiGet('/custom-modules');
  const existing = allModules.find(m =>
    m.name === MODULE_NAME && m.buildTrackProjectId === project.id
  );

  let module;
  const fields = makeSafetyInductionFields();

  if (existing) {
    console.log(`  ⚠  Module already exists (id=${existing.id}). Skipping creation.`);
    module = existing;
  } else {
    module = await apiPost('/custom-modules', {
      name: MODULE_NAME,
      buildTrackProjectId: project.id,
      fields,
    });
    console.log(`  ✓ Created "🦺 Safety Induction" module id=${module.id} with ${fields.length} fields`);
  }

  // Use the fields returned from the server (IDs are canonical)
  const savedFields = typeof module.fields === 'string'
    ? JSON.parse(module.fields)
    : (Array.isArray(module.fields) ? module.fields : fields);

  // Check existing records
  const existingRecords = await apiGet(`/custom-modules/${module.id}/records`);
  if (existingRecords.length > 0) {
    console.log(`  ℹ  Module already has ${existingRecords.length} records. Skipping seeding.`);
    return;
  }

  const records = makeSampleRecords(savedFields);
  for (const rec of records) {
    const created = await apiPost(`/custom-modules/${module.id}/records`, rec);
    const nameField = savedFields.find(f => f.label === 'Worker');
    const workerName = nameField ? rec[nameField.id] : '—';
    const idField = savedFields.find(f => f.label === 'Induction ID');
    const inductionId = idField ? rec[idField.id] : '—';
    console.log(`    ➕ ${inductionId} — ${workerName} (record id=${created.id})`);
  }
  console.log(`  ✓ ${records.length} sample induction records added`);
}

async function main() {
  console.log('🦺 BuildTrack — Safety Induction Module Seeder\n');
  console.log(`Backend: ${BASE}\n`);

  const projects = await apiGet('/projects');
  if (!projects || projects.length === 0) {
    console.error('❌ No projects found. Seed projects first.');
    process.exit(1);
  }

  console.log(`Found ${projects.length} project(s):`);
  for (const p of projects) console.log(`  • ${p.name} (${p.id})`);

  for (const project of projects) {
    await seedForProject(project);
  }

  console.log('\n\n✅ Safety Induction seeding complete!');
  console.log('\nNavigate to any project → Custom Modules → "🦺 Safety Induction"');
}

main().catch(err => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
