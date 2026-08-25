/**
 * reseed_toolbox_records.mjs
 *
 * Deletes the empty Toolbox Talks records and re-seeds them
 * using the correct (server-stored) field IDs.
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Module 1: House Building Project ──────────────────────────────────────────
const MODULE1_ID = '476111000000104041';
const FIELDS1 = {
  'TBT ID':                 '3cc7f4d6-c7a0-4957-b81e-d35e1493cc2c',
  'Topic':                  '3b412682-1cc0-4aa1-b7a6-99767243e40b',
  'Project':                '7d0c8851-b2a0-4f66-8ed3-3767320df496',
  'Site':                   'e920f3e4-29db-4fe9-bbe7-a90e109aad8a',
  'Date':                   '8fcea8f9-5b74-49f4-8efd-ffce1cca09c1',
  'Start Time':             'a5b0776d-1686-47f3-9f3c-11be7e3a89c2',
  'End Time':               '61e9eba4-e693-4e01-93c9-5ed9b9cc2595',
  'Work Area':              'a2a49234-cbcd-4b2a-96a1-eb14b985ddc9',
  'Related Drawing':        '11d90286-7b70-47a8-8975-36a2dec11a88',
  'Related Task':           '2c066a42-845c-4b1b-8937-c0c18e43f674',
  'Conducted By':           '7548cb36-b094-4c34-a650-b1130db5c55a',
  'Contractor':             '399957af-0257-44a7-a9fa-190d20731aff',
  'Workers Attended':       '2def6fe0-e6ca-4722-944a-9315c80395e0',
  'Key Safety Points':      'b84c31c2-af38-48e4-93d2-cc6e5077d46a',
  'PPE Required':           '63c1fe0f-7471-4376-b99b-c449933a759c',
  'Attendance Status':      '4147d1ec-1019-48a3-82a5-20d5565b5e9c',
  'Worker Acknowledgement': '7326fc10-af66-4fa6-a6be-70ec500039f3',
};

// ── Module 2: Apex Steel Industrial Complex ───────────────────────────────────
const MODULE2_ID = '476111000000104058';
const FIELDS2 = {
  'TBT ID':                 'be6902ce-9ace-44ae-b128-3d96e236198a',
  'Topic':                  'cc9091c4-ea0d-4e2a-b077-2b3ab834d91c',
  'Project':                '832a85c2-f63f-4929-a495-701d94ae1784',
  'Site':                   '4ee2056b-4679-4bb9-86b4-c53b7ed633d1',
  'Date':                   'bae4e07a-dd97-46af-bfba-e2a09ffbca33',
  'Start Time':             '9ea0777f-0265-456e-ac29-bb565ad0063e',
  'End Time':               '3dab90f3-5b1c-4653-b9f1-a61ec8bc8219',
  'Work Area':              'dca8be2b-03d8-4082-9bf5-3ccee298060b',
  'Related Drawing':        '9dce4a93-d25f-48f8-b499-fa4a73b107fc',
  'Related Task':           'f80bccd4-eecd-4d09-9018-7336e7ba0c56',
  'Conducted By':           '976cd509-ea08-4ec0-b33d-b7a8fd63ed05',
  'Contractor':             '9a3f18a6-bada-424f-b4be-38f278812f2c',
  'Workers Attended':       'e1013a7a-71a8-4208-b8f4-093b0f886428',
  'Key Safety Points':      'e4f7ce13-44d5-4b7d-bec8-3b3f72922298',
  'PPE Required':           'dee35735-ec59-499c-baf1-473c897d30b1',
  'Attendance Status':      '9511a399-c87f-4364-bfef-fae30732d202',
  'Worker Acknowledgement': '5546df7d-f40f-455a-8ca9-063443fe9ddd',
};

// ── Sample records builder ────────────────────────────────────────────────────

function makeRecords(f) {
  return [
    {
      [f['TBT ID']]:                  'TBT-2026-00125',
      [f['Topic']]:                   'Working at Height Safety',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-20',
      [f['Start Time']]:              '07:30 AM',
      [f['End Time']]:                '08:00 AM',
      [f['Work Area']]:               'Roof Slab – Level 2',
      [f['Related Drawing']]:         'Roof Plan',
      [f['Related Task']]:            'Roof Slab Concrete Pour',
      [f['Conducted By']]:            'Arun Prakash – Safety Officer',
      [f['Contractor']]:              'ABC Civil Contractors',
      [f['Workers Attended']]:        12,
      [f['Key Safety Points']]:       'Harness, lifeline, anchor points, fall protection',
      [f['PPE Required']]:            'Helmet, safety shoes, gloves, safety harness',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00126',
      [f['Topic']]:                   'Electrical Safety & Lockout Tagout',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-19',
      [f['Start Time']]:              '07:45 AM',
      [f['End Time']]:                '08:15 AM',
      [f['Work Area']]:               'Electrical Panel Room – Ground Floor',
      [f['Related Drawing']]:         'Electrical Layout Plan',
      [f['Related Task']]:            'Main Panel Wiring',
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
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-18',
      [f['Start Time']]:              '08:00 AM',
      [f['End Time']]:                '08:30 AM',
      [f['Work Area']]:               'Foundation Excavation – Zone C',
      [f['Related Drawing']]:         'Foundation Plan',
      [f['Related Task']]:            'Footing Excavation',
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
      [f['Topic']]:                   'Fire Safety & Emergency Procedures',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-17',
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
      [f['TBT ID']]:                  'TBT-2026-00129',
      [f['Topic']]:                   'Scaffolding Safety & Inspection',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-16',
      [f['Start Time']]:              '07:30 AM',
      [f['End Time']]:                '08:00 AM',
      [f['Work Area']]:               'External Facade – Floor 1',
      [f['Related Drawing']]:         'Scaffolding Erection Plan',
      [f['Related Task']]:            'External Wall Plastering',
      [f['Conducted By']]:            'Deepa Rao – HSE Manager',
      [f['Contractor']]:              'HighWorks Safety Solutions',
      [f['Workers Attended']]:        7,
      [f['Key Safety Points']]:       'Daily inspection checklist, guardrails, toe boards, weight limits',
      [f['PPE Required']]:            'Helmet, safety harness, safety shoes, gloves',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
    {
      [f['TBT ID']]:                  'TBT-2026-00130',
      [f['Topic']]:                   'Manual Handling & Ergonomics',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-15',
      [f['Start Time']]:              '09:00 AM',
      [f['End Time']]:                '09:30 AM',
      [f['Work Area']]:               'Interior Finishing – Ground Floor',
      [f['Related Drawing']]:         'Architectural Plan',
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
      [f['Topic']]:                   'PPE Usage & Maintenance',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
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
    {
      [f['TBT ID']]:                  'TBT-2026-00132',
      [f['Topic']]:                   'Crane & Rigging Safety',
      [f['Project']]:                 'House Building Project',
      [f['Site']]:                    'Site Block A',
      [f['Date']]:                    '2026-08-14',
      [f['Start Time']]:              '07:00 AM',
      [f['End Time']]:                '07:30 AM',
      [f['Work Area']]:               'Material Hoisting – Block A',
      [f['Related Drawing']]:         'Ground Floor Plan',
      [f['Related Task']]:            'Concrete Mixer Crane Lift',
      [f['Conducted By']]:            'Deepa Rao – HSE Manager',
      [f['Contractor']]:              'Crane Masters Pvt Ltd',
      [f['Workers Attended']]:        10,
      [f['Key Safety Points']]:       'Load limits, sling inspection, exclusion zones, hand signals',
      [f['PPE Required']]:            'Helmet, safety shoes, gloves, high-vis vest',
      [f['Attendance Status']]:       'Completed',
      [f['Worker Acknowledgement']]:  'Completed',
    },
  ];
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiDelete(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  return r.ok;
}

async function apiPost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try {
    const parsed = JSON.parse(text);
    if (!r.ok) throw new Error(`POST ${path} failed (${r.status}): ${JSON.stringify(parsed)}`);
    return parsed;
  } catch (e) {
    if (e.message.startsWith('POST')) throw e;
    throw new Error(`POST ${path} returned non-JSON: ${text.slice(0, 300)}`);
  }
}

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 300)}`); }
}

// ── Process one module ────────────────────────────────────────────────────────

async function processModule(moduleId, fields, label) {
  console.log(`\n📋 Module: ${label} (id=${moduleId})`);

  // 1. Fetch existing records
  const existing = await apiGet(`/custom-modules/${moduleId}/records`);
  console.log(`  Found ${existing.length} existing record(s) — deleting all...`);

  // 2. Delete each record
  for (const rec of existing) {
    const ok = await apiDelete(`/custom-modules/${moduleId}/records/${rec.id}`);
    console.log(`    🗑  Deleted record ${rec.id} — ${ok ? 'OK' : 'FAILED'}`);
  }

  // 3. Seed fresh records with correct field IDs
  // NOTE: The backend POST /custom-modules/:id/records expects { data: { fieldId: value } }
  const records = makeRecords(fields);
  console.log(`  Seeding ${records.length} records with correct field IDs...`);
  for (const rec of records) {
    const created = await apiPost(`/custom-modules/${moduleId}/records`, { data: rec });
    const topic = rec[fields['Topic']] || '—';
    const tbtId = rec[fields['TBT ID']] || '—';
    console.log(`    ➕ ${tbtId} — ${topic} (id=${created.id})`);
  }
  console.log(`  ✅ Done — ${records.length} records seeded`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🦺 Toolbox Talks — Record Re-seeder');
  console.log(`Backend: ${BASE}\n`);

  await processModule(MODULE1_ID, FIELDS1, 'House Building Project');
  await processModule(MODULE2_ID, FIELDS2, 'Apex Steel Industrial Complex');

  console.log('\n\n✅ Re-seeding complete! Open the app to verify Toolbox Talks data.');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
