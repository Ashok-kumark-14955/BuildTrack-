/**
 * cleanup_empty_records.mjs
 * Deletes all records that have an empty data object ({}) from the 6 custom modules.
 * Run with: node backend/cleanup_empty_records.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

const MODULE_IDS = [
  '476111000000091002',
  '476111000000092018',
  '476111000000091003',
  '476111000000091006',
  '476111000000101097',
  '476111000000101116',
];

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`GET ${path} non-JSON: ${text.slice(0, 200)}`); }
}

async function apiDelete(path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { return {}; }
}

async function main() {
  console.log('🧹 Cleaning up empty records from all 6 modules...\n');
  let totalDeleted = 0;

  for (const moduleId of MODULE_IDS) {
    const records = await apiGet(`/custom-modules/${moduleId}/records`);
    const emptyOnes = records.filter(r => !r.data || Object.keys(r.data).length === 0);
    console.log(`Module ${moduleId}: ${records.length} total, ${emptyOnes.length} empty`);

    for (const rec of emptyOnes) {
      await apiDelete(`/custom-modules/${moduleId}/records/${rec.id}`);
      console.log(`  🗑  Deleted record ${rec.id}`);
      totalDeleted++;
    }
  }

  console.log(`\n✅ Done. Deleted ${totalDeleted} empty records.`);
}

main().catch(err => {
  console.error('❌ Failed:', err.message || err);
  process.exit(1);
});
