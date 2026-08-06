import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import * as db from '../db';

const router = Router();

// Use memory storage so files never touch the ephemeral AppSail disk.
// The raw buffer is converted to a base64 data URL and persisted in the DB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

function gridCode(col: number, row: number) {
  const letter = String.fromCharCode(65 + col);
  return `${letter}${row + 1}`;
}

function serialize(row: any) {
  if (!row) return row;
  let columnPositions = {};
  try { columnPositions = row.columnPositions ? JSON.parse(row.columnPositions) : {}; } catch { columnPositions = {}; }
  let columnLabels = {};
  try { columnLabels = row.columnLabels ? JSON.parse(row.columnLabels) : {}; } catch { columnLabels = {}; }
  let elementTypeLabels = {};
  try { elementTypeLabels = row.elementTypeLabels ? JSON.parse(row.elementTypeLabels) : {}; } catch { elementTypeLabels = {}; }
  return { ...row, columnPositions, columnLabels, elementTypeLabels };
}

async function createTasksForGrid(req: any, drawingId: string, cols: number, rows: number, createdAt: string) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const code = gridCode(col, row);
      await db.run(
        req,
        `INSERT INTO tasks (id, drawingId, gridCode, name, description, category, priorityLevel, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), drawingId, code, `Grid ${code}`, '', '', 'Medium', '', '', '', 'Assigned', 0, 'column', `Column_${code}`, createdAt, createdAt]
      );
    }
  }
}

// List drawings (optionally by project)
router.get('/', async (req, res) => {
  const { projectId } = req.query;
  const rows = projectId
    ? await db.all(req, 'SELECT * FROM drawings WHERE projectId = ? ORDER BY createdAt DESC', [projectId])
    : await db.all(req, 'SELECT * FROM drawings ORDER BY createdAt DESC');
  res.json(rows.map(serialize));
});

router.get('/:id', async (req, res) => {
  const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(serialize(row));
});

// Upload a new drawing
router.post('/upload', upload.single('file'), async (req, res) => {
  const { projectId, name, gridCols, gridRows } = req.body;
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const resolvedProjectId = projectId || 'default';
  const project = await db.get(req, 'SELECT id FROM projects WHERE id = ?', [resolvedProjectId]);
  if (!project) return res.status(400).json({ error: 'Invalid or missing project. Please reload and try again.' });
  const id = uuid();

  // Convert file buffer to a base64 data URL so it's persisted in the
  // DataStore and survives AppSail container restarts (no local disk needed).
  const base64Data = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${base64Data}`;

  const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
  const createdAt = new Date().toISOString();
  const cols = Math.min(30, Math.max(1, Number(gridCols) || 10));
  const rows = Math.min(30, Math.max(1, Number(gridRows) || 8));
  const drawingName = name || req.file.originalname;
  await db.run(
    req,
    `INSERT INTO drawings (id, projectId, name, fileUrl, fileType, gridCols, gridRows, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, resolvedProjectId, drawingName, dataUrl, fileType, cols, rows, createdAt]
  );

  await createTasksForGrid(req, id, cols, rows, createdAt);
  await db.run(
    req,
    'INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)',
    [uuid(), null, id, `${cols * rows} tasks auto-created for "${drawingName}"`, createdAt]
  );

  const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [id]);
  res.status(201).json(serialize(row));
});

// Update grid config (also supports milestoneId, columnPositions, columnLabels, elementTypeLabels, lat, lng)
router.patch('/:id', async (req, res) => {
  const { gridCols, gridRows, name, milestoneId, columnPositions, resetColumnPositions, columnLabels, resetColumnLabels, elementTypeLabels, resetElementTypeLabels, lat, lng } = req.body;
  const existing: any = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const newMilestoneId = 'milestoneId' in req.body ? (milestoneId || null) : existing.milestoneId;
  const newLat = 'lat' in req.body ? (lat ?? null) : existing.lat;
  const newLng = 'lng' in req.body ? (lng ?? null) : existing.lng;

  let newColumnPositions = existing.columnPositions;
  if (resetColumnPositions) {
    newColumnPositions = '{}';
  } else if (columnPositions && typeof columnPositions === 'object') {
    let current: Record<string, any> = {};
    try { current = existing.columnPositions ? JSON.parse(existing.columnPositions) : {}; } catch { current = {}; }
    newColumnPositions = JSON.stringify({ ...current, ...columnPositions });
  }

  let newColumnLabels = existing.columnLabels || '{}';
  if (resetColumnLabels) {
    newColumnLabels = '{}';
  } else if (columnLabels && typeof columnLabels === 'object') {
    let current: Record<string, string> = {};
    try { current = existing.columnLabels ? JSON.parse(existing.columnLabels) : {}; } catch { current = {}; }
    newColumnLabels = JSON.stringify({ ...current, ...columnLabels });
  }

  let newElementTypeLabels = existing.elementTypeLabels || '{}';
  if (resetElementTypeLabels) {
    newElementTypeLabels = '{}';
  } else if (elementTypeLabels && typeof elementTypeLabels === 'object') {
    let current: Record<string, string> = {};
    try { current = existing.elementTypeLabels ? JSON.parse(existing.elementTypeLabels) : {}; } catch { current = {}; }
    newElementTypeLabels = JSON.stringify({ ...current, ...elementTypeLabels });
  }

  await db.run(
    req,
    'UPDATE drawings SET gridCols = ?, gridRows = ?, name = ?, milestoneId = ?, columnPositions = ?, columnLabels = ?, elementTypeLabels = ?, lat = ?, lng = ? WHERE id = ?',
    [
      gridCols ?? existing.gridCols,
      gridRows ?? existing.gridRows,
      name ?? existing.name,
      newMilestoneId,
      newColumnPositions,
      newColumnLabels,
      newElementTypeLabels,
      newLat,
      newLng,
      req.params.id,
    ]
  );
  res.json(serialize(await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id])));
});

router.delete('/:id', async (req, res) => {
  await db.run(req, 'DELETE FROM drawings WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
