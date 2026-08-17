/**
 * Correct calibration for all 4 9 BHK drawings.
 *
 * SVG viewBox: 0 0 1800 1100
 * Column circles (cx): A=120, B=370, C=620, D=870, E=1120, F=1370, G=1620
 * Row circles    (cy): 1=120, 2=420, 3=700, 4=940
 *
 * Fractions = px / dimension
 */

const API = 'https://construction-backend-50044693287.development.catalystappsail.in';
const PROJECT_ID = '1'; // adjust if needed

const W = 1800, H = 1100;

const colPx = { A: 120, B: 370, C: 620, D: 870, E: 1120, F: 1370, G: 1620 };
const rowPx = { 1: 120, 2: 420, 3: 700, 4: 940 };

function buildPositions() {
  const pos = {};
  for (const [col, cx] of Object.entries(colPx)) {
    for (const [row, ry] of Object.entries(rowPx)) {
      pos[`${col}${row}`] = {
        x: parseFloat((cx / W).toFixed(5)),
        y: parseFloat((ry / H).toFixed(5)),
      };
    }
  }
  return pos;
}

const columnPositions = buildPositions();

console.log('Calibration positions to apply:');
console.log('  A1:', JSON.stringify(columnPositions.A1));
console.log('  G4:', JSON.stringify(columnPositions.G4));
console.log('  A2 (row2 y should be 0.38182):', JSON.stringify(columnPositions.A2));
console.log('  A3 (row3 y should be 0.63636):', JSON.stringify(columnPositions.A3));
console.log('  A4 (row4 y should be 0.85455):', JSON.stringify(columnPositions.A4));
console.log('  Total positions:', Object.keys(columnPositions).length);
console.log('');

const drawings = [
  { id: '7fd33122-691f-4930-81c7-02325941e426', name: '9 BHK Ground Floor Plan' },
  { id: '051ea23d-7386-42d7-86af-37edccbcdf49', name: '9 BHK Foundation Plan' },
  { id: '567f75ff-7964-4acc-bcae-e02d2a75d265', name: '9 BHK First Floor Plan' },
  { id: '110da146-5cf3-46ba-9a64-e524acdf5460', name: '9 BHK Roof Plan' },
];

async function calibrateDrawing(id, name) {
  // First fetch projectId for this drawing
  const getRes = await fetch(`${API}/api/drawings/${id}`);
  if (!getRes.ok) {
    console.error(`  ✗ Failed to fetch ${name}: ${getRes.status}`);
    return;
  }
  const drawing = await getRes.json();
  const projectId = drawing.projectId;

  const body = { columnPositions, projectId };
  const res = await fetch(`${API}/api/drawings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const updated = await res.json();
    const count = Object.keys(updated.columnPositions || {}).length;
    console.log(`  ✓ ${name}: ${count} positions saved`);
    console.log(`    A1=${JSON.stringify(updated.columnPositions?.A1)}, A2=${JSON.stringify(updated.columnPositions?.A2)}, G4=${JSON.stringify(updated.columnPositions?.G4)}`);
  } else {
    const txt = await res.text();
    console.error(`  ✗ ${name}: ${res.status} ${txt}`);
  }
}

(async () => {
  for (const d of drawings) {
    console.log(`Calibrating: ${d.name}...`);
    await calibrateDrawing(d.id, d.name);
  }
  console.log('\nDone!');
})();
