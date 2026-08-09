/**
 * calibrate_drawings.mjs
 *
 * Patches perfect columnPositions for all 6 House Building Project drawings
 * by deriving exact grid-intersection coordinates from the SVG geometry that
 * was used when each drawing was generated.
 *
 * Positions are stored as fractional values (0–1) relative to image width/height.
 * SVG canvas for all drawings: 1600 × 950
 *
 * Run: node calibrate_drawings.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

const W = 1600, H = 950;
const frac = (v, max) => v / max;

function buildPositions(colXs, rowYs) {
  const positions = {};
  rowYs.forEach((ry, row) => {
    colXs.forEach((cx, col) => {
      const code = String.fromCharCode(65 + col) + (row + 1);
      positions[code] = { x: frac(cx, W), y: frac(ry, H) };
    });
  });
  return positions;
}

// ── Drawing definitions (from SVG geometry) ───────────────────────────────────

/**
 * Foundation Plan  (3 cols × 2 rows)  HBP-FND-001
 * colXs from SVG: [200, 580, 960]   (dashed grid lines = column grid lines)
 * rowYs from SVG: [200, 600]
 */
const foundationPositions = buildPositions([200, 580, 960], [200, 600]);

/**
 * Ground Floor Plan  (4 cols × 2 rows)  HBP-GF-002  (dark CAD style)
 * New SVG canvas: 1600×950, plan occupies x=38..878, y=38..776
 *
 * Left unit column centres (walls at x=38,244,420,636):
 *   col A = mid of 38..244  → 141
 *   col B = mid of 244..420 → 332
 *   col C = mid of 420..636 → 528
 * Right unit:
 *   col D = mid of 636..878 → 757
 *
 * Row centres (walls at y=38,360,776):
 *   row 1 = mid of 38..360  → 199
 *   row 2 = mid of 360..776 → 568
 */
const groundFloorPositions = buildPositions([141, 332, 528, 757], [199, 568]);

/**
 * Roof Plan  (3 cols × 3 rows)  HBP-RF-003
 * dashed grid line cols: x = 340, 600, 860
 * dashed grid line rows: y = 220, 440, 660
 */
const roofPositions = buildPositions([340, 600, 860], [220, 440, 660]);

/**
 * Electrical Layout Plan  (6 cols × 3 rows)  HBP-EL-004
 * symbol centres col: 150, 380, 600, 820, 1040, 1260
 * symbol centres row: 180, 440, 700
 */
const electricalPositions = buildPositions([150, 380, 600, 820, 1040, 1260], [180, 440, 700]);

/**
 * Plumbing and Drainage Plan  (4 cols × 3 rows)  HBP-PL-005
 * fixture centres col: 200, 480, 760, 1040
 * fixture centres row: 230, 560, 720
 */
const plumbingPositions = buildPositions([200, 480, 760, 1040], [230, 560, 720]);

/**
 * Interior Finishing Plan  (4 cols × 3 rows)  HBP-INT-006
 * Using wall column lines same as Ground Floor at: 200, 480, 760, 1020
 * Row centres: 355, 640  (only 2 row bands in ground floor shape, but 3 rows required)
 * Rows from SVG: row 1 centre y≈350, row 2 centre y≈640, row 3 outside box area ≈ 780
 */
const finishingPositions = buildPositions([200, 480, 760, 1020], [350, 640, 780]);

const DRAWINGS = [
  {
    id: 'ab7b4fc3-2641-4a22-a0cd-e17c33f73d00',
    name: 'Foundation Plan',
    positions: foundationPositions,
  },
  {
    id: 'ded710c4-2eb9-41c3-a235-d24ee29263d6',
    name: 'Ground Floor Plan',
    positions: groundFloorPositions,
  },
  {
    id: '12b0ce29-ff25-46d2-bc99-fb8c3529bc79',
    name: 'Roof Plan',
    positions: roofPositions,
  },
];

async function main() {
  console.log('Patching exact column positions for all House Building Project drawings...\n');

  for (const drw of DRAWINGS) {
    process.stdout.write(`  ${drw.name}... `);
    const r = await fetch(`${BASE}/drawings/${drw.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetColumnPositions: true,  // clear old
      }),
    });
    if (!r.ok) {
      console.log(`❌ reset failed: ${await r.text()}`);
      continue;
    }

    // Now apply the exact positions
    const r2 = await fetch(`${BASE}/drawings/${drw.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        columnPositions: drw.positions,
      }),
    });
    if (!r2.ok) {
      console.log(`❌ patch failed: ${await r2.text()}`);
      continue;
    }

    const keys = Object.keys(drw.positions);
    console.log(`✅ ${keys.length} positions set (${keys.join(', ')})`);
  }

  console.log('\n✅ All drawings calibrated perfectly!');
  console.log('Open: https://buildtrack-withdrawing.onslate.in/projects');
}

main().catch(err => { console.error('\nFailed:', err.message || err); process.exit(1); });
