/**
 * reseed_safety_induction.mjs
 *
 * Clears all existing Safety Induction records and re-seeds with the
 * 11 canonical workers (matching Site Entry, Safety Training, Workers).
 *
 * Adds Arun Prakash as the 11th worker (was missing from original seed).
 *
 * Run with: node backend/reseed_safety_induction.mjs
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

// ── Sample records builder ─────────────────────────────────────────────────────

function makeSampleRecords(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    // 1. Arun Prakash — NEW (was missing)
    {
      [f['Induction ID']]:         'IND-2026-00125',
      [f['Worker']]:               'Arun Prakash',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-01',
      [f['Induction Time']]:       '07:30 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'All Zones – Safety Officer',
      [f['Job Role / Trade']]:     'Safety Officer',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '98%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00125',
      [f['Valid From']]:           '2026-08-01',
      [f['Valid Until']]:          '2027-07-31',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Site Rules & Regulations',
    },
    // 2. Ravi Kumar
    {
      [f['Induction ID']]:         'IND-2026-00126',
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
      [f['Certificate No.']]:      'SIC-2026-00126',
      [f['Valid From']]:           '2026-08-13',
      [f['Valid Until']]:          '2027-08-12',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'PPE Requirements',
    },
    // 3. Suresh Babu
    {
      [f['Induction ID']]:         'IND-2026-00127',
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
      [f['Certificate No.']]:      'SIC-2026-00127',
      [f['Valid From']]:           '2026-08-13',
      [f['Valid Until']]:          '2027-08-12',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Site Rules & Regulations',
    },
    // 4. Priya Nair
    {
      [f['Induction ID']]:         'IND-2026-00128',
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
      [f['Certificate No.']]:      'SIC-2026-00128',
      [f['Valid From']]:           '2026-08-14',
      [f['Valid Until']]:          '2027-08-13',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Emergency Procedures',
    },
    // 5. Karthik M
    {
      [f['Induction ID']]:         'IND-2026-00129',
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
      [f['Certificate No.']]:      'SIC-2026-00129',
      [f['Valid From']]:           '2026-08-10',
      [f['Valid Until']]:          '2027-08-09',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Electrical Safety',
    },
    // 6. Vijay Kumar
    {
      [f['Induction ID']]:         'IND-2026-00130',
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
    // 7. Anand Selvaraj
    {
      [f['Induction ID']]:         'IND-2026-00131',
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
      [f['Certificate No.']]:      'SIC-2026-00131',
      [f['Valid From']]:           '2026-08-12',
      [f['Valid Until']]:          '2027-08-11',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Lifting & Rigging Safety',
    },
    // 8. Meena Devi
    {
      [f['Induction ID']]:         'IND-2026-00132',
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
    // 9. Ramesh Patel
    {
      [f['Induction ID']]:         'IND-2026-00133',
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
      [f['Certificate No.']]:      'SIC-2026-00133',
      [f['Valid From']]:           '2026-07-08',
      [f['Valid Until']]:          '2026-08-07',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Excavation Safety',
    },
    // 10. Lakshmi Priya
    {
      [f['Induction ID']]:         'IND-2026-00134',
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
      [f['Certificate No.']]:      'SIC-2026-00134',
      [f['Valid From']]:           '2026-08-16',
      [f['Valid Until']]:          '2027-08-15',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Working at Height',
    },
    // 11. Dinesh Kumar
    {
      [f['Induction ID']]:         'IND-2026-00135',
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
      [f['Certificate No.']]:      'SIC-2026-00135',
      [f['Valid From']]:           '2026-08-17',
      [f['Valid Until']]:          '2026-08-17',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Fire Safety',
    },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🦺 BuildTrack — Safety Induction Module Reseeder\n');
  console.log('Re-seeding with 11 canonical workers (adding Arun Prakash)\n');
  console.log(`Backend: ${BASE}\n`);

  // Find all Safety Induction modules (one per project)
  const allModules = await apiGet('/custom-modules');
  const inductionModules = allModules.filter(m => m.name === '🦺 Safety Induction');

  if (inductionModules.length === 0) {
    console.error('❌ No "🦺 Safety Induction" module found.');
    console.log('Available modules:', allModules.map(m => m.name).join(', '));
    process.exit(1);
  }

  console.log(`✅ Found ${inductionModules.length} Safety Induction module(s)\n`);

  for (const module of inductionModules) {
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
        const idField = savedFields.find(f => f.label === 'Induction ID');
        const workerName = workerField ? rec[workerField.id] : '—';
        const inductionId = idField ? rec[idField.id] : '—';
        console.log(`    ➕ ${inductionId} — ${workerName} (record id=${created.id})`);
        inserted++;
      } catch (err) {
        console.error(`    ❌ Insert failed: ${err.message}`);
      }
    }
    console.log(`  ✓ Inserted ${inserted}/${records.length} records`);
  }

  console.log('\n\n✅ Safety Induction reseeding complete!');
  console.log('All 11 canonical workers now have Safety Induction records.');
}

main().catch(err => {
  console.error('\n❌ Reseeding failed:', err.message || err);
  process.exit(1);
});
