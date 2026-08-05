/**
 * Idempotent startup migration: ensures the 4 Apex Steel sample drawings
 * always have correct columnPositions, even if the running DB was restored
 * from a stale snapshot (e.g. AppSail container restart) that predates the
 * calibration fix. Safe to run on every boot — only writes when missing/empty.
 */
import db from './db';

const SVG_WIDTH = 1700;
const SVG_HEIGHT = 950;

function computeColumnPositions(
  cols: string[],
  rows: number[],
  originX: number,
  originY: number,
  spacingX: number,
  spacingY: number
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < cols.length; c++) {
      const code = `${cols[c]}${rows[r]}`;
      positions[code] = {
        x: (originX + c * spacingX) / SVG_WIDTH,
        y: (originY + r * spacingY) / SVG_HEIGHT,
      };
    }
  }
  return positions;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS = [1, 2, 3, 4, 5];

// Drawing name (unique per project) -> origin/spacing used by its SVG
const CALIBRATIONS: Record<string, { originX: number; originY: number; spacingX: number; spacingY: number }> = {
  'Basement Foundation Plan': { originX: 200, originY: 180, spacingX: 220, spacingY: 140 },
  'Steel Column Erection Plan': { originX: 200, originY: 190, spacingX: 220, spacingY: 140 },
  'Steel Beam Erection Plan': { originX: 200, originY: 190, spacingX: 220, spacingY: 140 },
  'Steel Rafter Erection Plan': { originX: 200, originY: 200, spacingX: 220, spacingY: 130 },
};

const rows = db
  .prepare(
    `SELECT d.id, d.name, d.columnPositions FROM drawings d
     JOIN projects p ON p.id = d.projectId
     WHERE p.code = 'ASIC-P1'`
  )
  .all() as { id: string; name: string; columnPositions: string | null }[];

const update = db.prepare('UPDATE drawings SET columnPositions = ? WHERE id = ?');

for (const row of rows) {
  const calibration = Object.entries(CALIBRATIONS).find(([name]) => row.name.includes(name));
  if (!calibration) continue;

  let existing: Record<string, unknown> = {};
  try {
    existing = row.columnPositions ? JSON.parse(row.columnPositions) : {};
  } catch {
    existing = {};
  }

  if (Object.keys(existing).length >= COLS.length * ROWS.length) continue;

  const [, { originX, originY, spacingX, spacingY }] = calibration;
  const positions = computeColumnPositions(COLS, ROWS, originX, originY, spacingX, spacingY);
  update.run(JSON.stringify(positions), row.id);
  console.log(`[fixCalibration] Re-applied columnPositions for "${row.name}"`);
}
