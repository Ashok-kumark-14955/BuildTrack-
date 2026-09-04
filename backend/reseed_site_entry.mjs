/**
 * reseed_site_entry.mjs
 *
 * Clears all existing "🚧 Site Entry" records across ALL projects and
 * re-seeds them with the full 10-worker canonical dataset so that
 * every worker in Safety Training / Safety Induction is also present
 * in Site Entry.
 *
 * Canonical worker list (matches Safety Training & Safety Induction):
 *   Ravi Kumar, Suresh Babu, Priya Nair, Karthik M, Vijay Kumar,
 *   Anand Selvaraj, Meena Devi, Ramesh Patel, Lakshmi Priya, Dinesh Kumar
 *   (+ Arun Prakash from original Site Entry seeding)
 *
 * Run with: node backend/reseed_site_entry.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Canonical site-entry records ─────────────────────────────────────────────

function makeSampleEntries(fields) {
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
    {
      [f['Worker']]:           'Anand Selvaraj',
      [f['Entry ID']]:         'ENT-2026-00132',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '07:30 AM',
      [f['Exit Time']]:        '05:30 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Roof Slab – Block B',
      [f['Assigned Task']]:    'Scaffolding Assembly',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Meena Devi',
      [f['Entry ID']]:         'ENT-2026-00133',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '09:00 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Site Office – First Floor',
      [f['Assigned Task']]:    'Quality Inspection',
      [f['Entry Purpose']]:    'Safety Inspection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Ramesh Patel',
      [f['Entry ID']]:         'ENT-2026-00134',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '08:15 AM',
      [f['Exit Time']]:        '04:45 PM',
      [f['Entry Gate']]:       'West Gate – Gate 03',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Work Area']]:        'Electrical Panel Room – Zone A',
      [f['Assigned Task']]:    'Cable Laying & Conduit Work',
      [f['Entry Purpose']]:    'Electrical Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Lakshmi Priya',
      [f['Entry ID']]:         'ENT-2026-00135',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '10:00 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'South Gate – Gate 05',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Ground Floor – Block C',
      [f['Assigned Task']]:    'Masonry Wall Construction',
      [f['Entry Purpose']]:    'Foundation Work',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Dinesh Kumar',
      [f['Entry ID']]:         'ENT-2026-00136',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '07:45 AM',
      [f['Exit Time']]:        '06:00 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'Vijay Plumbing',
      [f['Work Area']]:        'Second Floor – Plumbing Zone',
      [f['Assigned Task']]:    'Water Supply Pipe Fitting',
      [f['Entry Purpose']]:    'Plumbing & Drainage',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
  ];
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 300)}`); }
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

async function apiDelete(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`DELETE ${path} failed (${r.status}): ${text.slice(0, 200)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 BuildTrack — Site Entry Reseeder\n');
  console.log(`Backend: ${BASE}\n`);
  console.log('This will DELETE all existing Site Entry records and re-seed with\nthe full 11-worker canonical dataset.\n');

  const MODULE_NAME = '🚧 Site Entry';

  // 1. Find the module
  console.log('Fetching custom modules…');
  const allModules = await apiGet('/custom-modules');
  const siteEntryModule = allModules.find((m) => m.name === MODULE_NAME);

  if (!siteEntryModule) {
    console.error(`❌ Module "${MODULE_NAME}" not found. Run seed_site_entry_module.mjs first.`);
    process.exit(1);
  }
  console.log(`  ✓ Found module "${MODULE_NAME}" id=${siteEntryModule.id}`);

  // 2. Resolve fields
  const savedFields = typeof siteEntryModule.fields === 'string'
    ? JSON.parse(siteEntryModule.fields)
    : siteEntryModule.fields;

  // 3. Delete all existing records
  const existingRecords = await apiGet(`/custom-modules/${siteEntryModule.id}/records`);
  console.log(`\n  Found ${existingRecords.length} existing record(s) — deleting…`);
  for (const rec of existingRecords) {
    await apiDelete(`/custom-modules/${siteEntryModule.id}/records/${rec.id}`);
    const workerField = savedFields.find((f) => f.label === 'Worker');
    const workerName = workerField ? (rec.data?.[workerField.id] ?? '?') : '?';
    console.log(`    🗑  Deleted record id=${rec.id}  (${workerName})`);
  }

  // 4. Seed fresh records
  const entries = makeSampleEntries(savedFields);
  console.log(`\nSeeding ${entries.length} site entry records…`);

  for (const entry of entries) {
    const rec = await apiPost(`/custom-modules/${siteEntryModule.id}/records`, entry);
    const workerField = savedFields.find((f) => f.label === 'Worker');
    const workerName = workerField ? entry[workerField.id] : 'Worker';
    const entryIdField = savedFields.find((f) => f.label === 'Entry ID');
    const entryId = entryIdField ? entry[entryIdField.id] : '';
    console.log(`    ➕ ${entryId}  ${workerName}  (record id=${rec.id})`);
  }

  console.log('\n✅ Site Entry reseeding complete!');
  console.log('   All 11 workers now appear consistently across Site Entry,');
  console.log('   Safety Training, and Safety Induction modules.\n');
  console.log('   Workers seeded:');
  console.log('   Arun Prakash, Ravi Kumar, Suresh Babu, Priya Nair, Karthik M,');
  console.log('   Vijay Kumar, Anand Selvaraj, Meena Devi, Ramesh Patel,');
  console.log('   Lakshmi Priya, Dinesh Kumar');
}

main().catch((err) => {
  console.error('\n❌ Reseeding failed:', err.message || err);
  process.exit(1);
});
