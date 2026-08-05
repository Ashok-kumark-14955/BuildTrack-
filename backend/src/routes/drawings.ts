import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import db from '../db';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});
const upload = multer({ storage });

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
  return { ...row, columnPositions, columnLabels };
}

function createTasksForGrid(drawingId: string, cols: number, rows: number, createdAt: string) {
  const insertTask = db.prepare(
    `INSERT INTO tasks (id, drawingId, gridCode, name, description, category, priority, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  db.exec('BEGIN');
  try {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const code = gridCode(col, row);
        insertTask.run(
          uuid(), drawingId, code, `Grid ${code}`, '', '', 'Medium', '', '', '', 'Assigned', 0,
          'column', `Column_${code}`, createdAt, createdAt
        );
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// List drawings (optionally by project)
router.get('/', (req, res) => {
  const { projectId } = req.query;
  const rows = projectId
    ? db.prepare('SELECT * FROM drawings WHERE projectId = ? ORDER BY createdAt DESC').all(projectId)
    : db.prepare('SELECT * FROM drawings ORDER BY createdAt DESC').all();
  res.json(rows.map(serialize));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(serialize(row));
});

// Upload a new drawing
router.post('/upload', upload.single('file'), (req, res) => {
  const { projectId, name, gridCols, gridRows } = req.body;
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const resolvedProjectId = projectId || 'default';
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(resolvedProjectId);
  if (!project) return res.status(400).json({ error: 'Invalid or missing project. Please reload and try again.' });
  const id = uuid();
  const fileUrl = `/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
  const createdAt = new Date().toISOString();
  const cols = Math.min(30, Math.max(1, Number(gridCols) || 10));
  const rows = Math.min(30, Math.max(1, Number(gridRows) || 8));
  const drawingName = name || req.file.originalname;
  db.prepare(
    `INSERT INTO drawings (id, projectId, name, fileUrl, fileType, gridCols, gridRows, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, resolvedProjectId, drawingName, fileUrl, fileType, cols, rows, createdAt);

  createTasksForGrid(id, cols, rows, createdAt);
  db.prepare('INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)').run(
    uuid(), null, id, `${cols * rows} tasks auto-created for "${drawingName}"`, createdAt
  );

  const row = db.prepare('SELECT * FROM drawings WHERE id = ?').get(id);
  res.status(201).json(serialize(row));
});

// Update grid config (also supports milestoneId, columnPositions, columnLabels, lat, lng)
router.patch('/:id', (req, res) => {
  // Ensure columnLabels column exists (idempotent migration)
  try {
    db.exec('ALTER TABLE drawings ADD COLUMN columnLabels TEXT NOT NULL DEFAULT \'{}\'');
  } catch { /* column already exists */ }

  const { gridCols, gridRows, name, milestoneId, columnPositions, resetColumnPositions, columnLabels, resetColumnLabels, lat, lng } = req.body;
  const existing: any = db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id);
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

  db.prepare('UPDATE drawings SET gridCols = ?, gridRows = ?, name = ?, milestoneId = ?, columnPositions = ?, columnLabels = ?, lat = ?, lng = ? WHERE id = ?').run(
    gridCols ?? existing.gridCols,
    gridRows ?? existing.gridRows,
    name ?? existing.name,
    newMilestoneId,
    newColumnPositions,
    newColumnLabels,
    newLat,
    newLng,
    req.params.id
  );
  res.json(serialize(db.prepare('SELECT * FROM drawings WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM drawings WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
