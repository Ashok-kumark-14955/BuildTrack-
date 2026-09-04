/**
 * reseed_safety_training.mjs
 *
 * Clears all existing Safety Training records and re-seeds with the
 * 11 canonical workers (matching Site Entry, Safety Induction, Workers).
 *
 * Adds Arun Prakash as the 11th worker (was missing from original seed).
 *
 * Run with: node backend/reseed_safety_training.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

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

// ── Sample records builder ────────────────────────────────────────────────────

function makeSampleRecords(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    // 1. Arun Prakash — NEW (was missing from original seed)
    {
      [f['Training ID']]:          'TRN-2026-00124',
      [f['Worker']]:               'Arun Prakash',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Training Type']]:        'PPE Awareness',
      [f['Training Category']]:    'General Safety',
      [f['Training Date']]:        '2026-08-01',
      [f['Training Duration']]:    '2 Hours',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Training Location']]:    'Site Safety Training Room',
      [f['Training Method']]:      'Classroom Only',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '99%',
      [f['Result']]:               'Passed',
      [f['Certificate No.']]:      'PPE-2026-00124',
      [f['Issue Date']]:           '2026-08-01',
      [f['Expiry Date']]:          '2027-07-31',
      [f['Training Status']]:      'Completed',
      [f['Remarks']]:              'Safety officer mandatory PPE refresher completed',
    },
    // 2. Ravi Kumar
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
    // 3. Suresh Babu
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
    // 4. Priya Nair
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
    // 5. Karthik M
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
    // 6. Vijay Kumar
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
    // 7. Anand Selvaraj
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
    // 8. Meena Devi
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
    // 9. Ramesh Patel
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
    // 10. Lakshmi Priya
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
    // 11. Dinesh Kumar
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🦺 BuildTrack — Safety Training Module Reseeder\n');
  console.log('Re-seeding with 11 canonical workers (adding Arun Prakash)\n');
  console.log(`Backend: ${BASE}\n`);

  // Find all Safety Training modules
  const allModules = await apiGet('/custom-modules');
  const trainingModules = allModules.filter(m => m.name === '🦺 Safety Training');

  if (trainingModules.length === 0) {
    console.error('❌ No "🦺 Safety Training" module found.');
    console.log('Available modules:', allModules.map(m => m.name).join(', '));
    process.exit(1);
  }

  console.log(`✅ Found ${trainingModules.length} Safety Training module(s)\n`);

  for (const module of trainingModules) {
    console.log(`\n📋 Processing module id=${module.id} (project=${module.buildTrackProjectId})`);

    const savedFields = typeof module.fields === 'string'
      ? JSON.parse(module.fields)
      : (Array.isArray(module.fields) ? module.fields : []);

    if (savedFields.length === 0) {
      console.warn('  ⚠  No fields found on module — skipping.');
      continue;
    }

    // Delete all existing records
    const existingRecords = await apiGet(`/custom-modules/${module.id}/records`);
    console.log(`  📋 Found ${existingRecords.length} existing record(s) — deleting all...`);
    for (const rec of existingRecords) {
      await apiDelete(`/custom-modules/${module.id}/records/${rec.id}`);
    }
    if (existingRecords.length > 0) {
      console.log(`  ✓ Deleted ${existingRecords.length} old records`);
    }

    // Insert 11 canonical records
    const records = makeSampleRecords(savedFields);
    let inserted = 0;
    for (const rec of records) {
      try {
        const created = await apiPost(`/custom-modules/${module.id}/records`, { data: rec });
        const workerField = savedFields.find(f => f.label === 'Worker');
        const idField = savedFields.find(f => f.label === 'Training ID');
        const workerName = workerField ? rec[workerField.id] : '—';
        const trainingId = idField ? rec[idField.id] : '—';
        console.log(`    ➕ ${trainingId} — ${workerName} (record id=${created.id})`);
        inserted++;
      } catch (err) {
        console.error(`    ❌ Insert failed: ${err.message}`);
      }
    }
    console.log(`  ✓ Inserted ${inserted}/${records.length} records`);
  }

  console.log('\n\n✅ Safety Training reseeding complete!');
  console.log('All 11 canonical workers now have Safety Training records.');
}

main().catch(err => {
  console.error('\n❌ Reseeding failed:', err.message || err);
  process.exit(1);
});
