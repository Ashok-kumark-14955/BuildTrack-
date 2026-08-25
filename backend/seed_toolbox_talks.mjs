/**
 * seed_toolbox_talks.mjs
 *
 * Seeds the "🦺 Toolbox Talks" custom module into all BuildTrack projects.
 *
 * Fields:
 *   TBT ID, Topic, Project, Site, Date, Start Time, End Time,
 *   Work Area, Related Drawing, Related Task, Conducted By, Contractor,
 *   Workers Attended, Key Safety Points, PPE Required,
 *   Attendance Status, Worker Acknowledgement
 *
 * Run with: node backend/seed_toolbox_talks.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions ────────────────────────────────────────────────────────

function makeToolboxTalksFields() {
  return [
    { id: crypto.randomUUID(), label: 'TBT ID',                  type: 'text' },
    { id: crypto.randomUUID(), label: 'Topic',                    type: 'text' },
    { id: crypto.randomUUID(), label: 'Project',                  type: 'text' },
    { id: crypto.randomUUID(), label: 'Site',                     type: 'text' },
    { id: crypto.randomUUID(), label: 'Date',                     type: 'date' },
    { id: crypto.randomUUID(), label: 'Start Time',               type: 'text' },
    { id: crypto.randomUUID(), label: 'End Time',                 type: 'text' },
    { id: crypto.randomUUID(), label: 'Work Area',                type: 'text' },
    { id: crypto.randomUUID(), label: 'Related Drawing',          type: 'text' },
    { id: crypto.randomUUID(), label: 'Related Task',             type: 'text' },
    { id: crypto.randomUUID(), label: 'Conducted By',             type: 'text' },
    { id: crypto.randomUUID(), label: 'Contractor',               type: 'text' },
    { id: crypto.randomUUID(), label: 'Workers Attended',         type: 'number' },
    { id: crypto.randomUUID(), label: 'Key Safety Points',        type: 'text' },
    { id: crypto.randomUUID(), label: 'PPE Required',             type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Attendance Status', type: 'select',
      options: ['Completed', 'In Progress', 'Pending', 'Cancelled'],
    },
    {
      id: crypto.randomUUID(), label: 'Worker Acknowledgement', type: 'select',
      options: ['Completed', 'Pending', 'Waived'],
    },
  ];
}

// ── Sample records ────────────────────────────────────────────────────────────

function makeSampleRecords(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    {
      [f['TBT ID']]:                  'TBT-2026-00125',
      [f['Topic']]:                   'Working at Height Safety',
      [f['Project']]:                 'GreenSteel Industrial Building',
      [f['Site']]:                    'Chennai Industrial Site',
      [f['Date']]:                    '2026-08-20',
      [f['Start Time']]:              '07:30 AM',
      [f['End Time']]:                '08:00 AM',
      [f['Work Area']]:               'Steel Erection – Zone A',
      [f['Related Drawing']]:         'Steel Beam Erection Plan',
      [f['Related Task']]:            'Steel Beam B-102 Installation',
      [f['Conducted By']]:            'Arun Prakash – Safety Officer',
      [f['Contractor']]:              'ABC Steel Contractors',
      [f['Workers Attended']]:        12,
      [f['Key Safety Points']]:       'Harness, lifeline, anchor points, fall protection',
      [f['PPE Required']]:            'Helmet, safety shoes, gloves, safety harness',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00126',
      [f['Topic']]:                   'Electrical Safety & Lockout Tagout',
      [f['Project']]:                 'GreenSteel Industrial Building',
      [f['Site']]:                    'Chennai Industrial Site',
      [f['Date']]:                    '2026-08-19',
      [f['Start Time']]:              '07:45 AM',
      [f['End Time']]:                '08:15 AM',
      [f['Work Area']]:               'Electrical Panel Room – Ground Floor',
      [f['Related Drawing']]:         'Electrical Layout Plan',
      [f['Related Task']]:            'LT Panel Wiring',
      [f['Conducted By']]:            'Deepa Rao – HSE Manager',
      [f['Contractor']]:              'Arjun Electricals',
      [f['Workers Attended']]:        8,
      [f['Key Safety Points']]:       'Lockout/tagout, live wire awareness, PPE insulation',
      [f['PPE Required']]:            'Insulated gloves, face shield, safety shoes, helmet',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00127',
      [f['Topic']]:                   'Excavation & Shoring Safety',
      [f['Project']]:                 'GreenSteel Industrial Building',
      [f['Site']]:                    'Chennai Industrial Site',
      [f['Date']]:                    '2026-08-18',
      [f['Start Time']]:              '08:00 AM',
      [f['End Time']]:                '08:30 AM',
      [f['Work Area']]:               'Excavation – Zone C',
      [f['Related Drawing']]:         'Foundation Plan',
      [f['Related Task']]:            'Pile Cap Excavation',
      [f['Conducted By']]:            'Arun Prakash – Safety Officer',
      [f['Contractor']]:              'Deep Earth Contractors',
      [f['Workers Attended']]:        15,
      [f['Key Safety Points']]:       'Slope stability, shoring, no undermining, cave-in risks',
      [f['PPE Required']]:            'Helmet, safety shoes, high-vis vest, gloves',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00128',
      [f['Topic']]:                   'Crane & Rigging Safety',
      [f['Project']]:                 'GreenSteel Industrial Building',
      [f['Site']]:                    'Chennai Industrial Site',
      [f['Date']]:                    '2026-08-17',
      [f['Start Time']]:              '07:00 AM',
      [f['End Time']]:                '07:30 AM',
      [f['Work Area']]:               'Crane Operations – Bay 1',
      [f['Related Drawing']]:         'Steel Beam Erection Plan',
      [f['Related Task']]:            'Overhead Crane Lift – Column C4',
      [f['Conducted By']]:            'Deepa Rao – HSE Manager',
      [f['Contractor']]:              'Crane Masters Pvt Ltd',
      [f['Workers Attended']]:        10,
      [f['Key Safety Points']]:       'Load limits, sling inspection, exclusion zones, hand signals',
      [f['PPE Required']]:            'Helmet, safety shoes, gloves, high-vis vest',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00129',
      [f['Topic']]:                   'Fire Safety & Emergency Procedures',
      [f['Project']]:                 'Prestige Heights Residential',
      [f['Site']]:                    'Whitefield – Phase 2',
      [f['Date']]:                    '2026-08-20',
      [f['Start Time']]:              '08:30 AM',
      [f['End Time']]:                '09:00 AM',
      [f['Work Area']]:               'All Zones',
      [f['Related Drawing']]:         'Site Fire Safety Layout',
      [f['Related Task']]:            'General Site Safety',
      [f['Conducted By']]:            'Siva Shankar – Safety Supervisor',
      [f['Contractor']]:              'All Contractors',
      [f['Workers Attended']]:        25,
      [f['Key Safety Points']]:       'Fire extinguisher locations, assembly point, emergency contacts',
      [f['PPE Required']]:            'Helmet, safety shoes, high-vis vest',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Pending',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00130',
      [f['Topic']]:                   'Manual Handling & Ergonomics',
      [f['Project']]:                 'Prestige Heights Residential',
      [f['Site']]:                    'Whitefield – Phase 2',
      [f['Date']]:                    '2026-08-19',
      [f['Start Time']]:              '09:00 AM',
      [f['End Time']]:                '09:30 AM',
      [f['Work Area']]:               'Interior Finishing – Floors 1-3',
      [f['Related Drawing']]:         'Architectural Finishing Plan',
      [f['Related Task']]:            'Internal Wall Plastering',
      [f['Conducted By']]:            'Siva Shankar – Safety Supervisor',
      [f['Contractor']]:              'Shine Interiors',
      [f['Workers Attended']]:        9,
      [f['Key Safety Points']]:       'Proper lifting posture, team lifts for heavy loads, stretch breaks',
      [f['PPE Required']]:            'Helmet, safety shoes, gloves, knee pads',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00131',
      [f['Topic']]:                   'Scaffolding Safety & Inspection',
      [f['Project']]:                 'Prestige Heights Residential',
      [f['Site']]:                    'Whitefield – Phase 2',
      [f['Date']]:                    '2026-08-16',
      [f['Start Time']]:              '07:30 AM',
      [f['End Time']]:                '08:00 AM',
      [f['Work Area']]:               'Scaffolding – External Facade',
      [f['Related Drawing']]:         'Scaffolding Erection Plan',
      [f['Related Task']]:            'External Facade Scaffolding',
      [f['Conducted By']]:            'Deepa Rao – HSE Manager',
      [f['Contractor']]:              'HighWorks Safety Solutions',
      [f['Workers Attended']]:        7,
      [f['Key Safety Points']]:       'Daily inspection checklist, guardrails, toe boards, weight limits',
      [f['PPE Required']]:            'Helmet, safety harness, safety shoes, gloves',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00132',
      [f['Topic']]:                   'PPE Usage & Maintenance',
      [f['Project']]:                 'GreenSteel Industrial Building',
      [f['Site']]:                    'Chennai Industrial Site',
      [f['Date']]:                    '2026-08-21',
      [f['Start Time']]:              '07:30 AM',
      [f['End Time']]:                '08:00 AM',
      [f['Work Area']]:               'All Zones',
      [f['Related Drawing']]:         '—',
      [f['Related Task']]:            'General Site Safety',
      [f['Conducted By']]:            'Arun Prakash – Safety Officer',
      [f['Contractor']]:              'All Contractors',
      [f['Workers Attended']]:        20,
      [f['Key Safety Points']]:       'Correct PPE selection, inspection before use, storage, replacement',
      [f['PPE Required']]:            'All standard site PPE',
      [f['Attendance Status']]:       'Pending',
      [f['Worker Acknowledgement']]:  'Pending',
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedForProject(project) {
  const MODULE_NAME = '🦺 Toolbox Talks';
  console.log(`\n📋 Project: "${project.name}" (${project.id})`);

  // Check if module already exists for this project
  const allModules = await apiGet('/custom-modules');
  const existing = allModules.find(m =>
    m.name === MODULE_NAME && m.buildTrackProjectId === project.id
  );

  let module;
  const fields = makeToolboxTalksFields();

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
    const tbtIdField = savedFields.find(f => f.label === 'TBT ID');
    const topicField = savedFields.find(f => f.label === 'Topic');
    const tbtId = tbtIdField ? rec[tbtIdField.id] : '—';
    const topic = topicField ? rec[topicField.id] : '—';
    console.log(`    ➕ ${tbtId} — ${topic} (record id=${created.id})`);
  }
  console.log(`  ✓ ${records.length} sample Toolbox Talk records added`);
}

async function main() {
  console.log('🦺 BuildTrack — Toolbox Talks Module Seeder\n');
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

  console.log('\n\n✅ Toolbox Talks seeding complete!');
  console.log('\nNavigate to any project → Workforce & Safety → "🦺 Toolbox Talks"');
}

main().catch(err => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
