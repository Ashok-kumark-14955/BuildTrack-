/**
 * fix_all_db_issues.mjs
 *
 * Fixes all orphan-task DB issues:
 *
 * 1. Re-point 80 tasks from stale drawing 1cfafaa1 (Foundation Plan dup) → ab7b4fc3 (canonical Foundation Plan)
 * 2. Re-point 80 tasks from stale drawing d2dd62ff (Roof Plan dup)        → 12b0ce29 (canonical Roof Plan)
 * 3. Re-point 80 tasks from stale drawing bed4df52 (Ground Floor Plan dup) → ded710c4 (canonical Ground Floor Plan)
 * 4. Delete  12 tasks from 61aa1da2  (Interior Finishing Plan _TEMP_    — no canonical)
 * 5. Delete  12 tasks from 49f6c778  (Plumbing and Drainage Plan _TEMP_ — no canonical)
 * 6. Delete   2 tasks from 0eda1c1f  (Electrical Layout Plan _TEMP_     — only 2 remain)
 * 7. Delete  12 tasks from f21fcb38  (STR-RAF-004 _TEMP_)
 * 8. Delete   8 tasks from 5888392b  (STR-BEA-003 _TEMP_)
 * 9. Delete   6 tasks from 8aeeff78  (STR-COL-002 _TEMP_)
 * 10.Delete   8 tasks from 9e305d73  (STR-FND-001 _TEMP_)
 */

import https from 'https';

const HOST = 'construction-backend-50044693287.development.catalystappsail.in';
const BASE  = `https://${HOST}`;

// ─── helpers ──────────────────────────────────────────────────────────────────

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: HOST,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const get    = path         => request('GET',    path);
const patch  = (path, body) => request('PATCH',  path, body);
const del    = path         => request('DELETE', path);

async function getAllTasks() {
  const res = await get('/api/tasks');
  return res.body;
}

// ─── re-point stale → canonical ───────────────────────────────────────────────

const REMAP = {
  '1cfafaa1-7adf-4645-b7b1-4ce6272ad668': 'ab7b4fc3-2641-4a22-a0cd-e17c33f73d00', // Foundation Plan dup → canonical
  'd2dd62ff-6b5e-4b98-bef2-aa7b0faafc9f': '12b0ce29-ff25-46d2-bc99-fb8c3529bc79', // Roof Plan dup       → canonical
  'bed4df52-b379-4d25-aac4-855d157b7944': 'ded710c4-2eb9-41c3-a235-d24ee29263d6', // Ground Floor dup    → canonical
};

// drawings for which tasks should be DELETED (temp or no longer active)
const DELETE_DRAWING_IDS = new Set([
  'f21fcb38-ca8b-4f0f-86f4-64ac499896f7', // STR-RAF-004 _TEMP_
  '5888392b-7545-4dd5-bc53-6ab2f3149225', // STR-BEA-003 _TEMP_
  '8aeeff78-5472-42c1-ab20-459d99d84b7b', // STR-COL-002 _TEMP_
  '9e305d73-20ef-48a2-944f-9d9c445d5c22', // STR-FND-001 _TEMP_
  '61aa1da2-c70a-412f-bf10-adde4ab274f2', // Interior Finishing Plan _TEMP_
  '49f6c778-0f4b-480b-9b58-246207373a59', // Plumbing and Drainage Plan _TEMP_
  '0eda1c1f-b04c-4e4f-a3f7-9e02cf0f837b', // Electrical Layout Plan _TEMP_
]);

// ─── main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('📋 Fetching all tasks …');
  const tasks = await getAllTasks();
  console.log(`   ${tasks.length} tasks found\n`);

  // ── 1. Re-point stale drawing IDs ──────────────────────────────────────────
  console.log('🔁 Re-pointing stale drawing references …');
  let repointed = 0;
  const BATCH = 5; // concurrent PATCH limit to avoid rate limits

  for (const [staleId, canonicalId] of Object.entries(REMAP)) {
    const group = tasks.filter(t => t.drawingId === staleId);
    if (!group.length) { console.log(`   (no tasks for ${staleId})`); continue; }
    console.log(`   ${staleId.slice(0,8)}… → ${canonicalId.slice(0,8)}… : ${group.length} tasks`);

    // batch PATCHes
    for (let i = 0; i < group.length; i += BATCH) {
      const slice = group.slice(i, i + BATCH);
      await Promise.all(
        slice.map(t =>
          patch(`/api/tasks/${t.id}`, { drawingId: canonicalId })
            .then(r => {
              if (r.status !== 200) console.warn(`   ⚠️  PATCH ${t.id} → ${r.status}`);
            })
        )
      );
      process.stdout.write(`\r   progress: ${Math.min(i + BATCH, group.length)}/${group.length}   `);
    }
    repointed += group.length;
    console.log(`\n   ✅ ${group.length} tasks re-pointed`);
  }

  // ── 2. Delete orphan tasks from _TEMP_ drawings ────────────────────────────
  console.log('\n🗑️  Deleting tasks from obsolete _TEMP_ drawings …');
  let deleted = 0;

  for (const staleId of DELETE_DRAWING_IDS) {
    const group = tasks.filter(t => t.drawingId === staleId);
    if (!group.length) { console.log(`   (no tasks for ${staleId})`); continue; }
    console.log(`   Deleting ${group.length} tasks for drawing ${staleId.slice(0,8)}…`);

    for (let i = 0; i < group.length; i += BATCH) {
      const slice = group.slice(i, i + BATCH);
      await Promise.all(
        slice.map(t =>
          del(`/api/tasks/${t.id}`)
            .then(r => {
              if (r.status !== 204 && r.status !== 200) console.warn(`   ⚠️  DELETE ${t.id} → ${r.status}`);
            })
        )
      );
      process.stdout.write(`\r   progress: ${Math.min(i + BATCH, group.length)}/${group.length}   `);
    }
    deleted += group.length;
    console.log(`\n   ✅ ${group.length} tasks deleted`);
  }

  // ── 3. Summary ────────────────────────────────────────────────────────────
  console.log('\n✅ Done!');
  console.log(`   Re-pointed : ${repointed} tasks`);
  console.log(`   Deleted    : ${deleted} tasks`);

  // ── 4. Verify ────────────────────────────────────────────────────────────
  console.log('\n🔍 Verifying …');
  const allTasks = await getAllTasks();
  const drawingsRes = await get('/api/drawings');
  const validIds = new Set(drawingsRes.body.map(d => d.id));
  const orphans  = allTasks.filter(t => !validIds.has(t.drawingId));

  console.log(`   Total tasks now  : ${allTasks.length}`);
  console.log(`   Orphan tasks     : ${orphans.length}`);

  const byDrawing = {};
  for (const t of allTasks) {
    byDrawing[t.drawingId] = (byDrawing[t.drawingId] || 0) + 1;
  }
  console.log('\n   Tasks per canonical drawing:');
  for (const d of drawingsRes.body) {
    console.log(`     ${d.name.padEnd(40)} ${byDrawing[d.id] || 0} tasks`);
  }

  if (orphans.length === 0) {
    console.log('\n🎉 All DB issues fixed! No orphan tasks remaining.');
  } else {
    console.log('\n⚠️  There are still orphan tasks. Check manually:');
    const oids = new Set(orphans.map(t => t.drawingId));
    oids.forEach(id => console.log(`     ${id} → ${orphans.filter(t => t.drawingId === id).length} tasks`));
  }
})();
