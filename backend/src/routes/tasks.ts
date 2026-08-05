import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import db from '../db';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

function logActivity(message: string, taskId?: string, drawingId?: string) {
  db.prepare('INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)').run(
    uuid(), taskId || null, drawingId || null, message, new Date().toISOString()
  );
}

// List tasks (optionally by drawingId)
router.get('/', (req, res) => {
  const { drawingId } = req.query;
  const rows = drawingId
    ? db.prepare('SELECT * FROM tasks WHERE drawingId = ? ORDER BY createdAt DESC').all(drawingId)
    : db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const {
    drawingId, gridCode, name, description, category, priority,
    assignedTo, startDate, dueDate, status, progress, milestoneId,
    elementType, elementId,
  } = req.body;
  const resolvedElementId = elementId || (gridCode ? `Column_${gridCode}` : null);
  if (!drawingId || !resolvedElementId || !name) {
    return res.status(400).json({ error: 'drawingId, elementId and name are required' });
  }
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO tasks (id, drawingId, milestoneId, gridCode, name, description, category, priority, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, drawingId, milestoneId || null, gridCode || '', name, description || '', category || '', priority || 'Medium',
    assignedTo || '', startDate || '', dueDate || '', status || 'Assigned', progress || 0,
    elementType || 'column', resolvedElementId, now, now
  );
  logActivity(`Task "${name}" created on ${resolvedElementId}`, id, drawingId);
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const existing: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  // Explicitly handle milestoneId: allow null to unlink
  const milestoneId = 'milestoneId' in req.body ? (req.body.milestoneId || null) : existing.milestoneId;
  db.prepare(
    `UPDATE tasks SET milestoneId=?, name=?, description=?, category=?, priority=?, assignedTo=?, startDate=?, dueDate=?, status=?, progress=?, updatedAt=? WHERE id=?`
  ).run(
    milestoneId, merged.name, merged.description, merged.category, merged.priority, merged.assignedTo,
    merged.startDate, merged.dueDate, merged.status, merged.progress, merged.updatedAt, req.params.id
  );
  if (req.body.status && req.body.status !== existing.status) {
    logActivity(`Task "${merged.name}" status changed to ${merged.status}`, req.params.id, existing.drawingId);
  } else {
    logActivity(`Task "${merged.name}" updated`, req.params.id, existing.drawingId);
  }
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  logActivity(`Task "${existing.name}" deleted`, undefined, existing.drawingId);
  res.status(204).end();
});

// Comments
router.get('/:id/comments', (req, res) => {
  const rows = db.prepare('SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC').all(req.params.id);
  res.json(rows);
});

router.post('/:id/comments', upload.single('photo'), (req, res) => {
  const { author, message } = req.body;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.photoUrl || null);
  const id = uuid();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO comments (id, taskId, author, message, photoUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.params.id, author || 'User', message || '', photoUrl, createdAt
  );
  const taskId = String(req.params.id);
  const task: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  logActivity(`Comment added on "${task?.name}"`, taskId, task?.drawingId);
  res.status(201).json(db.prepare('SELECT * FROM comments WHERE id = ?').get(id));
});

export default router;
