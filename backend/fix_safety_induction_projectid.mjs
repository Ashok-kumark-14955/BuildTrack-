/**
 * fix_safety_induction_projectid.mjs
 *
 * Patches the two existing "🦺 Safety Induction" modules that were seeded
 * with an empty buildTrackProjectId. Sets the correct projectId on each.
 *
 * Run with: node backend/fix_safety_induction_projectid.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// Module IDs from the live index + their correct BuildTrack project IDs
const PATCHES = [
  {
    moduleId: '476111000000101097',
    buildTrackProjectId: 'c6b44879-dfd8-4a1f-984d-38b2b46f180b', // House Building Project
    projectName: 'House Building Project',
  },
  {
    moduleId: '476111000000101116',
    buildTrackProjectId: 'd925af2e-56fe-44d9-a6dd-bc23a50f81a8', // Apex Steel Industrial Complex
    projectName: 'Apex Steel Industrial Complex – Phase 1',
  },
];

async function apiPut(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    if (!r.ok) throw new Error(`PUT ${path} failed (${r.status}): ${JSON.stringify(data)}`);
    return data;
  } catch (e) {
    if (e.message.startsWith('PUT')) throw e;
    throw new Error(`PUT ${path} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

async function main() {
  console.log('🔧 Fixing Safety Induction buildTrackProjectId\n');

  for (const patch of PATCHES) {
    console.log(`📋 Patching module ${patch.moduleId} → project "${patch.projectName}"`);
    const result = await apiPut(`/custom-modules/${patch.moduleId}`, {
      buildTrackProjectId: patch.buildTrackProjectId,
    });
    console.log(`  ✓ buildTrackProjectId is now: "${result.buildTrackProjectId}"`);
  }

  console.log('\n✅ Done! Safety Induction modules now have correct project IDs.');
  console.log('Refresh the app and navigate to Workforce & Safety → Safety Induction.');
}

main().catch(err => {
  console.error('\n❌ Fix failed:', err.message || err);
  process.exit(1);
});
