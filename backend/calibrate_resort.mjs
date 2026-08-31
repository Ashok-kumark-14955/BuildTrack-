/**
 * calibrate_resort.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Applies accurate column-node positions to the "Resort Site Plan (Top View)"
 * drawing so every node sits exactly on its grid intersection.
 *
 * Source of truth: backend/assets/resort-drawings/resort-site-plan-top-view.svg
 *   viewBox : 0 0 1695 1412
 *
 * Node circles are placed at the following pixel coordinates:
 *
 *   Row 1 (cy=136):  A1=275   B1=440    C1=620   D1=815    E1=980   F1=1137.5  G1=1272.5
 *   Row 2 (cy=404):  A2=357.5 B2=620    C2=755   D2=882.5  E2=1017.5 F2=1152.5 G2=1287.5
 *   Row 3 (cy=672):  A3=290   B3=485    C3=642.5 D3=807.5  E3=972.5 F3=1145   G3=1370
 *   Row 4 (cy=970):  A4=245   B4=365    C4=560   D4=845    E4=1070  F4=1265   G4=1422.5
 *
 * Fractional positions = px / dimension (5 decimal places).
 *
 * Run:
 *   node backend/calibrate_resort.mjs
 *
 * The script auto-discovers the resort drawing by name from the API. If more
 * than one project is found it will list them and exit — set RESORT_PROJECT_ID
 * env var to target a specific project.
 */

const API = 'https://construction-backend-50044693287.development.catalystappsail.in';

const W = 1695;   // SVG viewBox width
const H = 1412;   // SVG viewBox height

// ── Node pixel coordinates read directly from the SVG ─────────────────────────
const nodes = {
  // Row 1 — main building spine
  A1: { cx: 275,    cy: 136 },
  B1: { cx: 440,    cy: 136 },
  C1: { cx: 620,    cy: 136 },
  D1: { cx: 815,    cy: 136 },
  E1: { cx: 980,    cy: 136 },
  F1: { cx: 1137.5, cy: 136 },
  G1: { cx: 1272.5, cy: 136 },

  // Row 2 — pool & leisure
  A2: { cx: 357.5,  cy: 404 },
  B2: { cx: 620,    cy: 404 },
  C2: { cx: 755,    cy: 404 },
  D2: { cx: 882.5,  cy: 404 },
  E2: { cx: 1017.5, cy: 404 },
  F2: { cx: 1152.5, cy: 404 },
  G2: { cx: 1287.5, cy: 404 },

  // Row 3 — garden & premium villas
  A3: { cx: 290,    cy: 672 },
  B3: { cx: 485,    cy: 672 },
  C3: { cx: 642.5,  cy: 672 },
  D3: { cx: 807.5,  cy: 672 },
  E3: { cx: 972.5,  cy: 672 },
  F3: { cx: 1145,   cy: 672 },
  G3: { cx: 1370,   cy: 672 },

  // Row 4 — entrance / parking / boundary
  A4: { cx: 245,    cy: 970 },
  B4: { cx: 365,    cy: 970 },
  C4: { cx: 560,    cy: 970 },
  D4: { cx: 845,    cy: 970 },
  E4: { cx: 1070,   cy: 970 },
  F4: { cx: 1265,   cy: 970 },
  G4: { cx: 1422.5, cy: 970 },
};

// Convert pixel coordinates to normalised fractions (0–1)
function buildColumnPositions() {
  const pos = {};
  for (const [code, { cx, cy }] of Object.entries(nodes)) {
    pos[code] = {
      x: parseFloat((cx / W).toFixed(5)),
      y: parseFloat((cy / H).toFixed(5)),
    };
  }
  return pos;
}

const columnPositions = buildColumnPositions();

// ── Sanity-print a few positions ──────────────────────────────────────────────
console.log('Calibration positions to apply:');
for (const code of ['A1', 'G1', 'A4', 'G4', 'D2']) {
  console.log(`  ${code}: ${JSON.stringify(columnPositions[code])}`);
}
console.log(`  Total positions: ${Object.keys(columnPositions).length}`);
console.log('');

// ── Discover the resort drawing ───────────────────────────────────────────────
async function findResortDrawing() {
  // List all projects
  const projRes = await fetch(`${API}/api/projects`);
  if (!projRes.ok) throw new Error(`Failed to list projects: ${projRes.status}`);
  const projects = await projRes.json();

  const targetProjectId = process.env.RESORT_PROJECT_ID;

  const resortProjects = targetProjectId
    ? projects.filter((p) => p.id === targetProjectId)
    : projects.filter((p) =>
        p.name?.toLowerCase().includes('resort') ||
        p.name?.toLowerCase().includes('coastal')
      );

  if (resortProjects.length === 0) {
    console.error('No resort project found. Available projects:');
    for (const p of projects) console.error(`  ${p.id}  ${p.name}`);
    console.error('\nSet RESORT_PROJECT_ID=<id> to target a specific project.');
    process.exit(1);
  }

  if (resortProjects.length > 1) {
    console.error('Multiple resort projects found — set RESORT_PROJECT_ID to disambiguate:');
    for (const p of resortProjects) console.error(`  ${p.id}  ${p.name}`);
    process.exit(1);
  }

  const project = resortProjects[0];
  console.log(`Found project: "${project.name}" (id=${project.id})`);

  // List drawings for this project
  const drawRes = await fetch(`${API}/api/drawings?projectId=${project.id}`);
  if (!drawRes.ok) throw new Error(`Failed to list drawings: ${drawRes.status}`);
  const drawings = await drawRes.json();

  const sitePlan = drawings.find((d) =>
    d.name?.toLowerCase().includes('site plan') ||
    d.name?.toLowerCase().includes('resort site') ||
    d.name?.toLowerCase().includes('top view')
  );

  if (!sitePlan) {
    console.error('No site plan drawing found. Available drawings:');
    for (const d of drawings) console.error(`  ${d.id}  ${d.name}`);
    process.exit(1);
  }

  console.log(`Found drawing: "${sitePlan.name}" (id=${sitePlan.id})`);
  return { project, drawing: sitePlan };
}

// ── Apply calibration ─────────────────────────────────────────────────────────
async function calibrate() {
  const { project, drawing } = await findResortDrawing();

  console.log('\nApplying calibration...');
  const res = await fetch(`${API}/api/drawings/${drawing.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      columnPositions,
      // Ensure grid dimensions match the SVG layout: 7 columns × 4 rows
      gridCols: 7,
      gridRows: 4,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Calibration PUT failed (${res.status}): ${txt.slice(0, 300)}`);
  }

  const updated = await res.json();
  const savedCount = Object.keys(updated.columnPositions || {}).length;
  console.log(`\n✓ Calibration applied — ${savedCount} node positions saved.`);

  // Verify a sample
  console.log('\nVerification (first row):');
  for (const code of ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1']) {
    const saved = updated.columnPositions?.[code];
    const expected = columnPositions[code];
    const ok = saved?.x === expected.x && saved?.y === expected.y;
    console.log(`  ${code}: ${JSON.stringify(saved)} ${ok ? '✓' : '✗ MISMATCH (expected ' + JSON.stringify(expected) + ')'}`);
  }
}

calibrate().catch((err) => { console.error('\nFatal:', err.message); process.exit(1); });
