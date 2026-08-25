/**
 * seed_safety_training.mjs
 *
 * Seeds the "🦺 Safety Training" custom module into the
 * "Workforce & Safety" project (or all projects if not found).
 *
 * Run with: node backend/seed_safety_training.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions ────────────────────────────────────────────────────────

function makeSafetyTrainingFields() {
  return [
    { id: crypto.randomUUID(), label: 'Training ID',          type: 'text' },
    { id: crypto.randomUUID(), label: 'Worker',                type: 'text' },
    { id: crypto.randomUUID(), label: 'Project',               type: 'text' },
    { id: crypto.randomUUID(), label: 'Site',                  type: 'text' },
    { id: crypto.randomUUID(), label: 'Contractor',            type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Training Type', type: 'select',
      options: [
        'Working at Height Safety',
        'Confined Space Entry',
        'Electrical Safety',
        'Fire Safety & Evacuation',
        'First Aid & CPR',
        'Excavation & Trenching Safety',
        'Scaffolding Safety',
        'Lifting & Rigging Safety',
        'Chemical Handling & HAZMAT',
        'PPE Awareness',
        'Manual Handling & Ergonomics',
        'Hot Work Safety',
      ],
    },
    {
      id: crypto.randomUUID(), label: 'Training Category', type: 'select',
      options: [
        'High-Risk Work',
        'General Safety',
        'Emergency Response',
        'Compliance',
        'Refresher',
        'Toolbox Talk',
      ],
    },
    { id: crypto.randomUUID(), label: 'Training Date',         type: 'date' },
    { id: crypto.randomUUID(), label: 'Training Duration',     type: 'text' },
    { id: crypto.randomUUID(), label: 'Trainer',               type: 'text' },
    { id: crypto.randomUUID(), label: 'Training Location',     type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Training Method', type: 'select',
      options: [
        'Classroom + Practical',
        'Classroom Only',
        'Practical Only',
        'Online / E-Learning',
        'Toolbox Talk',
        'On-the-Job Training',
      ],
    },
    {
      id: crypto.randomUUID(), label: 'Assessment Required', type: 'select',
      options: ['Yes', 'No'],
    },
    { id: crypto.randomUUID(), label: 'Assessment Score',      type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Result', type: 'select',
      options: ['Passed', 'Failed', 'Not Attempted', 'Waived'],
    },
    { id: crypto.randomUUID(), label: 'Certificate No.',       type: 'text' },
    { id: crypto.randomUUID(), label: 'Issue Date',            type: 'date' },
    { id: crypto.randomUUID(), label: 'Expiry Date',           type: 'date' },
    {
      id: crypto.randomUUID(), label: 'Training Status', type: 'select',
      options: ['Completed', 'In Progress', 'Scheduled', 'Pending', 'Cancelled', 'Expired'],
    },
    { id: crypto.randomUUID(), label: 'Remarks',               type: 'text' },
  ];
}

// ── Sample records ────────────────────────────────────────────────────────────

function makeSampleRecords(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    {
      [f['Training ID']]:          'TRN-2026-00125',
      [f['Worker']]:               'Ravi Kumar',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Training Type']]:        'Working at Height Safety',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-08-20',
      [f['Training Duration']]:    '4 Hours',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Training Location']]:    'Site Safety Training Room',
      [f['Training Method']]:      'Classroom + Practical',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '94%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'WAH-2026-00125',
      [f['Issue Date']]:           '2026-08-20',
      [f['Expiry Date']]:          '2027-08-19',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Worker successfully completed practical assessment',
    },
    {
      [f['Training ID']]:          'TRN-2026-00126',
      [f['Worker']]:               'Suresh Babu',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Raj Masonry Works',
      [f['Training Type']]:        'Scaffolding Safety',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-08-18',
      [f['Training Duration']]:    '3 Hours',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Training Location']]:    'Site Safety Training Room',
      [f['Training Method']]:      'Classroom + Practical',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '88%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'SCF-2026-00126',
      [f['Issue Date']]:           '2026-08-18',
      [f['Expiry Date']]:          '2027-08-17',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Passed with good practical performance',
    },
    {
      [f['Training ID']]:          'TRN-2026-00127',
      [f['Worker']]:               'Priya Nair',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Training Type']]:        'First Aid & CPR',
      [f['Training Category']]:    'Emergency Response',
      [f['Training Date']]:        '2026-08-15',
      [f['Training Duration']]:    '6 Hours',
      [f['Trainer']]:              'Dr. Rema Krishnan – Medical Officer',
      [f['Training Location']]:    'Project Site Office',
      [f['Training Method']]:      'Classroom + Practical',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '96%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'FAC-2026-00127',
      [f['Issue Date']]:           '2026-08-15',
      [f['Expiry Date']]:          '2028-08-14',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Excellent performance in CPR practical assessment',
    },
    {
      [f['Training ID']]:          'TRN-2026-00128',
      [f['Worker']]:               'Karthik M',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Arjun Electricals',
      [f['Training Type']]:        'Electrical Safety',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-08-12',
      [f['Training Duration']]:    '5 Hours',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Training Location']]:    'Training Hall – Block A',
      [f['Training Method']]:      'Classroom Only',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '91%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'ELS-2026-00128',
      [f['Issue Date']]:           '2026-08-12',
      [f['Expiry Date']]:          '2027-08-11',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'All modules covered; loto procedure re-demonstrated',
    },
    {
      [f['Training ID']]:          'TRN-2026-00129',
      [f['Worker']]:               'Vijay Kumar',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Vijay Plumbing',
      [f['Training Type']]:        'Confined Space Entry',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-08-19',
      [f['Training Duration']]:    '4 Hours',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Training Location']]:    'Site Safety Training Room',
      [f['Training Method']]:      'Classroom + Practical',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '',
      [f['Result']]:               'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Issue Date']]:           '',
      [f['Expiry Date']]:          '',
      [f['Training Status']]:      'In Progress',
      [f['Remarks']]:              'Assessment scheduled for next session',
    },
    {
      [f['Training ID']]:          'TRN-2026-00130',
      [f['Worker']]:               'Anand Selvaraj',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Crane Masters Pvt Ltd',
      [f['Training Type']]:        'Lifting & Rigging Safety',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-08-10',
      [f['Training Duration']]:    '8 Hours',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Training Location']]:    'Crane Operations Yard',
      [f['Training Method']]:      'Practical Only',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '97%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'LRS-2026-00130',
      [f['Issue Date']]:           '2026-08-10',
      [f['Expiry Date']]:          '2027-08-09',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Full-day practical with live crane load test',
    },
    {
      [f['Training ID']]:          'TRN-2026-00131',
      [f['Worker']]:               'Meena Devi',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Shine Interiors',
      [f['Training Type']]:        'Chemical Handling & HAZMAT',
      [f['Training Category']]:    'Compliance',
      [f['Training Date']]:        '2026-08-22',
      [f['Training Duration']]:    '3 Hours',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Training Location']]:    'Site Office – Conference Room',
      [f['Training Method']]:      'Classroom Only',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '',
      [f['Result']]:               'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Issue Date']]:           '',
      [f['Expiry Date']]:          '',
      [f['Training Status']]:      'Scheduled',
      [f['Remarks']]:              'Training scheduled for 22-Aug-2026',
    },
    {
      [f['Training ID']]:          'TRN-2026-00132',
      [f['Worker']]:               'Ramesh Patel',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Deep Earth Contractors',
      [f['Training Type']]:        'Excavation & Trenching Safety',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-07-15',
      [f['Training Duration']]:    '4 Hours',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Training Location']]:    'Site Safety Training Room',
      [f['Training Method']]:      'Classroom + Practical',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '72%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'EXT-2026-00132',
      [f['Issue Date']]:           '2026-07-15',
      [f['Expiry Date']]:          '2026-08-14',
      [f['Training Status']]:      'Expired',
      [f['Remarks']]:              'Certificate expired — re-training required',
    },
    {
      [f['Training ID']]:          'TRN-2026-00133',
      [f['Worker']]:               'Lakshmi Priya',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'HighWorks Safety Solutions',
      [f['Training Type']]:        'Fire Safety & Evacuation',
      [f['Training Category']]:    'Emergency Response',
      [f['Training Date']]:        '2026-08-16',
      [f['Training Duration']]:    '2 Hours',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Training Location']]:    'Assembly Point – East Gate',
      [f['Training Method']]:      'Practical Only',
      [f['Assessment Required']]:  'No',
      [f['Assessment Score']]:     '',
      [f['Result']]:               'Waived',
      [f['Certificate No.']]:      'FSE-2026-00133',
      [f['Issue Date']]:           '2026-08-16',
      [f['Expiry Date']]:          '2027-08-15',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Fire drill and evacuation exercise completed',
    },
    {
      [f['Training ID']]:          'TRN-2026-00134',
      [f['Worker']]:               'Dinesh Kumar',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Fire Guard Systems',
      [f['Training Type']]:        'Hot Work Safety',
      [f['Training Category']]:    'High-Risk Work',
      [f['Training Date']]:        '2026-08-14',
      [f['Training Duration']]:    '3 Hours',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Training Location']]:    'Welding Workshop – Bay 2',
      [f['Training Method']]:      'Classroom + Practical',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '89%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'HWS-2026-00134',
      [f['Issue Date']]:           '2026-08-14',
      [f['Expiry Date']]:          '2027-08-13',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Hot work permit procedure verified',
    },
  ];
}

// ── API helpers ──────────────────────────────────────────────────────────────

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

async function seedForProject(project) {
  const MODULE_NAME = '🦺 Safety Training';
  console.log(`\n📋 Project: "${project.name}" (${project.id})`);

  const allModules = await apiGet('/custom-modules');
  const existing = allModules.find(m =>
    m.name === MODULE_NAME && m.buildTrackProjectId === project.id
  );

  let module;
  const fields = makeSafetyTrainingFields();

  if (existing) {
    console.log(`  ⚠  Module already exists (id=${existing.id}). Skipping creation.`);
    module = existing;
  } else {
    module = await apiPost('/custom-modules', {
      name: MODULE_NAME,
      buildTrackProjectId: project.id,
      fields,
    });
    console.log(`  ✓ Created "${MODULE_NAME}" module id=${module.id} with ${fields.length} fields`);
  }

  const savedFields = typeof module.fields === 'string'
    ? JSON.parse(module.fields)
    : (Array.isArray(module.fields) ? module.fields : fields);

  const existingRecords = await apiGet(`/custom-modules/${module.id}/records`);
  if (existingRecords.length > 0) {
    // Delete all existing records (they may be empty due to bad payload format)
    console.log(`  ℹ  Module has ${existingRecords.length} existing records — deleting and reseeding...`);
    for (const r of existingRecords) {
      await apiDelete(`/custom-modules/${module.id}/records/${r.id}`);
    }
    console.log(`  ✓ Deleted ${existingRecords.length} old records`);
  }

  const records = makeSampleRecords(savedFields);
  for (const rec of records) {
    // IMPORTANT: backend expects { data: { fieldId: value } }, not bare field map
    const created = await apiPost(`/custom-modules/${module.id}/records`, { data: rec });
    const workerField = savedFields.find(f => f.label === 'Worker');
    const idField     = savedFields.find(f => f.label === 'Training ID');
    const workerName  = workerField ? rec[workerField.id] : '—';
    const trainingId  = idField     ? rec[idField.id]     : '—';
    console.log(`    ➕ ${trainingId} — ${workerName} (record id=${created.id})`);
  }
  console.log(`  ✓ ${records.length} sample training records added`);
}

async function main() {
  console.log('🦺 BuildTrack — Safety Training Module Seeder\n');
  console.log(`Backend: ${BASE}\n`);

  const projects = await apiGet('/projects');
  if (!projects || projects.length === 0) {
    console.error('❌ No projects found. Seed projects first.');
    process.exit(1);
  }

  console.log(`Found ${projects.length} project(s):`);
  for (const p of projects) console.log(`  • ${p.name} (${p.id})`);

  // Prefer the "Workforce & Safety" project; fall back to all projects
  const wsProject = projects.find(p =>
    /workforce/i.test(p.name) || /safety/i.test(p.name)
  );

  if (wsProject) {
    console.log(`\n🎯 Targeting "Workforce & Safety" project: ${wsProject.name}`);
    await seedForProject(wsProject);
  } else {
    console.log('\n⚠  No "Workforce & Safety" project found — seeding all projects.');
    for (const project of projects) {
      await seedForProject(project);
    }
  }

  console.log('\n\n✅ Safety Training seeding complete!');
  console.log('\nNavigate to the project → Custom Modules → "🦺 Safety Training"');
}

main().catch(err => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
