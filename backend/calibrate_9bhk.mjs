/**
 * calibrate_9bhk.mjs
 *
 * Applies pixel-perfect column-grid positions to the 4 uncalibrated 9 BHK drawings.
 *
 * All 4 SVGs share the SAME grid layout:
 *   viewBox: 0 0 1800 1100
 *   Column grid lines (X): A=120, B=370, C=620, D=870, E=1120, F=1370, G=1620
 *   Row grid lines (Y):    1=120, 2=390, 3=660, 4=930
 *
 * Fractional positions = pixel / dimension
 *   colXs = [120,370,620,870,1120,1370,1620] / 1800
 *   rowYs = [120,390,660,930]              / 1100
 *
 * Usage:
 *   node backend/calibrate_9bhk.mjs
 */

const BASE_URL = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// Exact pixel coords from SVG source (viewBox 1800×1100)
const SVG_W = 1800;
const SVG_H = 1100;

// Column A–G x-positions (pixels)
const COL_XS = [120, 370, 620, 870, 1120, 1370, 1620];
// Row 1–4 y-positions (pixels)
const ROW_YS = [120, 390, 660, 930];

// Convert to fractions
const COL_FRACS = COL_XS.map((x) => parseFloat((x / SVG_W).toFixed(5)));
const ROW_FRACS = ROW_YS.map((y) => parseFloat((y / SVG_H).toFixed(5)));

// ── Drawings to calibrate ────────────────────────────────────────────────────
const DRAWINGS = [
  {
    id: '7fd33122-691f-4930-81c7-02325941e426',
    name: '9 BHK Ground Floor Plan',
    projectId: 'c6b44879-dfd8-4a1f-984d-38b2b46f180b',
    gridCols: 7,
    gridRows: 4,
  },
  {
    id: '051ea23d-7386-42d7-86af-37edccbcdf49',
    name: '9 BHK Foundation Plan',
    projectId: 'c6b44879-dfd8-4a1f-984d-38b2b46f180b',
    gridCols: 7,
    gridRows: 4,
  },
  {
    id: '567f75ff-7964-4acc-bcae-e02d2a75d265',
    name: '9 BHK First Floor Plan',
    projectId: 'c6b44879-dfd8-4a1f-984d-38b2b46f180b',
    gridCols: 7,
    gridRows: 4,
  },
  {
    id: '110da146-5cf3-46ba-9a64-e524acdf5460',
    name: '9 BHK Roof Plan',
    projectId: 'c6b44879-dfd8-4a1f-984d-38b2b46f180b',
    gridCols: 7,
    gridRows: 4,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate column letter: 0→A, 1→B, … */
function colLetter(colIndex) {
  return String.fromCharCode(65 + colIndex);
}

/**
 * Build columnPositions from the pre-computed fractions.
 * gridCols must equal COL_FRACS.length (7) and gridRows must equal ROW_FRACS.length (4).
 */
function buildColumnPositions(gridCols, gridRows) {
  const positions = {};
  for (let ci = 0; ci < gridCols; ci++) {
    const x = COL_FRACS[ci];
    for (let ri = 0; ri < gridRows; ri++) {
      const y = ROW_FRACS[ri];
      positions[`${colLetter(ci)}${ri + 1}`] = { x, y };
    }
  }
  return positions;
}

/** PATCH calibration to a drawing via the API */
async function calibrateDrawing(drawing) {
  const { id, name, projectId, gridCols, gridRows } = drawing;
  const columnPositions = buildColumnPositions(gridCols, gridRows);

  console.log(`\n📐 Calibrating "${name}" (${gridCols}×${gridRows} grid)…`);
  console.log(`   Col fracs: ${COL_FRACS.join(', ')}`);
  console.log(`   Row fracs: ${ROW_FRACS.join(', ')}`);
  console.log(`   Computed ${Object.keys(columnPositions).length} node positions`);

  const resp = await fetch(`${BASE_URL}/drawings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnPositions, projectId }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status} for drawing "${name}": ${text}`);
  }

  const result = await resp.json();
  const savedCount = Object.keys(result.columnPositions ?? {}).length;
  console.log(`   ✅ Saved — ${savedCount} positions confirmed in DB`);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏗️  9 BHK Drawing Calibration — Pixel-Perfect');
  console.log('===============================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`\nSVG size: ${SVG_W}×${SVG_H}`);
  console.log(`Col fracs (A–G): ${COL_FRACS.join(', ')}`);
  console.log(`Row fracs (1–4): ${ROW_FRACS.join(', ')}`);

  for (const drawing of DRAWINGS) {
    await calibrateDrawing(drawing);
  }

  console.log('\n\n✅ All 4 drawings calibrated successfully!');
}

main().catch((err) => {
  console.error('❌ Calibration failed:', err);
  process.exit(1);
});
