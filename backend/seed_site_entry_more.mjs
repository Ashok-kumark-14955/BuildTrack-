/**
 * seed_site_entry_more.mjs
 *
 * Adds MORE sample records to the existing "🚧 Site Entry" module.
 * Skips records whose Entry ID already exists.
 *
 * Run with: node seed_site_entry_more.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

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

async function main() {
  console.log('🚧 Site Entry — Additional Records Seeder\n');

  // 1. Find the module
  const modules = await apiGet('/custom-modules');
  const mod = modules.find((m) => m.name === '🚧 Site Entry');
  if (!mod) {
    console.error('❌ "🚧 Site Entry" module not found. Run seed_site_entry_module.mjs first.');
    process.exit(1);
  }
  console.log(`✓ Found module id=${mod.id}`);

  // 2. Resolve fields
  const fields = typeof mod.fields === 'string' ? JSON.parse(mod.fields) : mod.fields;
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  // 3. Fetch existing records to skip duplicates
  const existing = await apiGet(`/custom-modules/${mod.id}/records`);
  const entryIdField = fields.find((x) => x.label === 'Entry ID');
  const existingIds = new Set(existing.map((r) => r[entryIdField?.id] ?? ''));
  console.log(`ℹ  ${existing.length} records already exist. Will skip duplicates.\n`);

  // 4. New sample records
  const newEntries = [
    // ── Aug 12 (yesterday) ──────────────────────────────
    {
      [f['Worker']]:           'Manoj Selvaraj',
      [f['Entry ID']]:         'ENT-2026-00132',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-12',
      [f['Entry Time']]:       '07:30 AM',
      [f['Exit Time']]:        '05:30 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Roof Truss – Bay A',
      [f['Assigned Task']]:    'Steel Rafter Erection',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Deepa Krishnan',
      [f['Entry ID']]:         'ENT-2026-00133',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-12',
      [f['Entry Time']]:       '08:00 AM',
      [f['Exit Time']]:        '04:45 PM',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Work Area']]:        'Sub-station Room',
      [f['Assigned Task']]:    'HT Cable Laying',
      [f['Entry Purpose']]:    'Electrical Work',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Anand Raj',
      [f['Entry ID']]:         'ENT-2026-00134',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-12',
      [f['Entry Time']]:       '09:00 AM',
      [f['Exit Time']]:        '06:00 PM',
      [f['Entry Gate']]:       'West Gate – Gate 03',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'First Floor Slab',
      [f['Assigned Task']]:    'Concrete Pouring',
      [f['Entry Purpose']]:    'Foundation Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Lakshmi Devi',
      [f['Entry ID']]:         'ENT-2026-00135',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-12',
      [f['Entry Time']]:       '10:00 AM',
      [f['Exit Time']]:        '03:30 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'Vijay Plumbing',
      [f['Work Area']]:        'Ground Floor – Toilet Block',
      [f['Assigned Task']]:    'Soil Pipe Installation',
      [f['Entry Purpose']]:    'Plumbing & Drainage',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    // ── Aug 11 ───────────────────────────────────────────
    {
      [f['Worker']]:           'Balamurugan T',
      [f['Entry ID']]:         'ENT-2026-00136',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-11',
      [f['Entry Time']]:       '07:45 AM',
      [f['Exit Time']]:        '05:15 PM',
      [f['Entry Gate']]:       'North Gate – Gate 04',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Basement – Zone A',
      [f['Assigned Task']]:    'Shuttering & Centering',
      [f['Entry Purpose']]:    'Foundation Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Senthil Kumar',
      [f['Entry ID']]:         'ENT-2026-00137',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-11',
      [f['Entry Time']]:       '08:30 AM',
      [f['Exit Time']]:        '05:00 PM',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Column Grid – Row C',
      [f['Assigned Task']]:    'Steel Column Alignment',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Nithya S',
      [f['Entry ID']]:         'ENT-2026-00138',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-11',
      [f['Entry Time']]:       '09:15 AM',
      [f['Exit Time']]:        '04:00 PM',
      [f['Entry Gate']]:       'South Gate – Gate 05',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Work Area']]:        'Electrical Panel Room',
      [f['Assigned Task']]:    'Earthing Installation',
      [f['Entry Purpose']]:    'Electrical Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Chandran M',
      [f['Entry ID']]:         'ENT-2026-00139',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-11',
      [f['Entry Time']]:       '07:00 AM',
      [f['Exit Time']]:        '03:00 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Gate House',
      [f['Assigned Task']]:    'Safety Barrier Setup',
      [f['Entry Purpose']]:    'Safety Inspection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    // ── Aug 13 (today) — additional workers ────────────
    {
      [f['Worker']]:           'Ramesh Babu',
      [f['Entry ID']]:         'ENT-2026-00140',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '07:55 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'South Gate – Gate 05',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Ground Floor – Block B',
      [f['Assigned Task']]:    'Masonry Wall Construction',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Venkat P',
      [f['Entry ID']]:         'ENT-2026-00141',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '08:10 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'Vijay Plumbing',
      [f['Work Area']]:        'First Floor – Plumbing Chase',
      [f['Assigned Task']]:    'Water Supply Line Installation',
      [f['Entry Purpose']]:    'Plumbing & Drainage',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Siva Kumar',
      [f['Entry ID']]:         'ENT-2026-00142',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '11:00 AM',
      [f['Exit Time']]:        '02:30 PM',
      [f['Entry Gate']]:       'Rear Gate – Gate 06',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Material Store',
      [f['Assigned Task']]:    'Reinforcement Bar Delivery',
      [f['Entry Purpose']]:    'Material Delivery',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Geetha R',
      [f['Entry ID']]:         'ENT-2026-00143',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '09:30 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Site Office',
      [f['Assigned Task']]:    'Quality Check – Slab A',
      [f['Entry Purpose']]:    'Safety Inspection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Murugan K',
      [f['Entry ID']]:         'ENT-2026-00144',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '10:00 AM',
      [f['Exit Time']]:        '01:00 PM',
      [f['Entry Gate']]:       'North Gate – Gate 04',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Work Area']]:        'Transformer Yard',
      [f['Assigned Task']]:    'Equipment Maintenance',
      [f['Entry Purpose']]:    'Equipment Maintenance',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    // ── Aug 14 (tomorrow — pre-scheduled) ────────────────
    {
      [f['Worker']]:           'Arjun Das',
      [f['Entry ID']]:         'ENT-2026-00145',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '—',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Roof – Waterproofing Zone',
      [f['Assigned Task']]:    'Bitumen Membrane Laying',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Pending',
    },
    {
      [f['Worker']]:           'Pradeep R',
      [f['Entry ID']]:         'ENT-2026-00146',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '—',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'ABC Construction',
      [f['Work Area']]:        'Second Floor – Staircase Block',
      [f['Assigned Task']]:    'Staircase Formwork',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Pending',
    },
    {
      [f['Worker']]:           'Unknown Vendor',
      [f['Entry ID']]:         'ENT-2026-00147',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-13',
      [f['Entry Time']]:       '12:00 PM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'Rear Gate – Gate 06',
      [f['Contractor']]:       'Unknown',
      [f['Work Area']]:        'Main Gate',
      [f['Assigned Task']]:    'Visitor',
      [f['Entry Purpose']]:    'Other',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Denied',
    },
  ];

  // 5. Insert only new records
  let added = 0;
  let skipped = 0;
  for (const entry of newEntries) {
    const eid = entry[f['Entry ID']];
    if (existingIds.has(eid)) {
      console.log(`  ⏭  Skip (exists): ${eid}`);
      skipped++;
      continue;
    }
    const rec = await apiPost(`/custom-modules/${mod.id}/records`, entry);
    console.log(`  ➕ ${eid}  ${entry[f['Worker']]}  (record id=${rec.id})`);
    added++;
  }

  console.log(`\n✅ Done — ${added} records added, ${skipped} skipped.`);
  console.log(`Total records now: ${existing.length + added}`);
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
