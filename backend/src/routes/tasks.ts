import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import * as db from '../db';
import { reportTaskCompletion } from '../cliqReport';

const router = Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// The DataStore column is named "priorityLevel" ("priority" collides with a
// reserved word); map it back to "priority" for the API contract.
function serialize(row: any) {
  if (!row) return row;
  const { priorityLevel, ...rest } = row;
  return { ...rest, priority: priorityLevel };
}

async function logActivity(req: any, message: string, taskId?: string, drawingId?: string) {
  await db.run(
    req,
    'INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)',
    [uuid(), taskId || null, drawingId || null, message, new Date().toISOString()]
  );
}

// List tasks (optionally by drawingId)
router.get('/', async (req, res, next) => {
  try {
    const { drawingId } = req.query;
    const rows = drawingId
      ? await db.all(req, 'SELECT * FROM tasks WHERE drawingId = ? ORDER BY createdAt DESC', [drawingId])
      : await db.all(req, 'SELECT * FROM tasks ORDER BY createdAt DESC');
    res.json(rows.map(serialize));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(serialize(row));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
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
    await db.run(
      req,
      `INSERT INTO tasks (id, drawingId, milestoneId, gridCode, name, description, category, priorityLevel, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, drawingId, milestoneId || null, gridCode || '', name, description || '', category || '', priority || 'Medium',
        assignedTo || '', startDate || '', dueDate || '', status || 'Assigned', progress || 0,
        elementType || 'column', resolvedElementId, now, now]
    );
    await logActivity(req, `Task "${name}" created on ${resolvedElementId}`, id, drawingId);
    res.status(201).json(serialize(await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [id])));
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing: any = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    const priority = 'priority' in req.body ? req.body.priority : existing.priorityLevel;
    // Explicitly handle milestoneId: allow null to unlink
    const milestoneId = 'milestoneId' in req.body ? (req.body.milestoneId || null) : existing.milestoneId;
    await db.run(
      req,
      `UPDATE tasks SET milestoneId=?, name=?, description=?, category=?, priorityLevel=?, assignedTo=?, startDate=?, dueDate=?, status=?, progress=?, updatedAt=? WHERE id=?`,
      [milestoneId, merged.name, merged.description, merged.category, priority, merged.assignedTo,
        merged.startDate, merged.dueDate, merged.status, merged.progress, merged.updatedAt, req.params.id]
    );
    if (req.body.status && req.body.status !== existing.status) {
      await logActivity(req, `Task "${merged.name}" status changed to ${merged.status}`, req.params.id, existing.drawingId);
      if (merged.status === 'Completed') {
        reportTaskCompletion(req, {
          id: req.params.id,
          name: merged.name,
          drawingId: existing.drawingId,
          assignedTo: merged.assignedTo,
          category: merged.category,
          dueDate: merged.dueDate,
          priority: merged.priority ?? existing.priorityLevel,
        }); // fire-and-forget, don't delay the response
      }
    } else {
      await logActivity(req, `Task "${merged.name}" updated`, req.params.id, existing.drawingId);
    }
    res.json(serialize(await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id])));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing: any = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await db.run(req, 'DELETE FROM tasks WHERE id = ?', [req.params.id]);
    await logActivity(req, `Task "${existing.name}" deleted`, undefined, existing.drawingId);
    res.status(204).end();
  } catch (err) { next(err); }
});

// Comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const rows = await db.all(req, 'SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC', [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:id/comments', upload.single('photo'), async (req, res, next) => {
  try {
    const { author, message } = req.body;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.photoUrl || null);
    const id = uuid();
    const createdAt = new Date().toISOString();
    await db.run(
      req,
      'INSERT INTO comments (id, taskId, author, message, photoUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.params.id, author || 'User', message || '', photoUrl, createdAt]
    );
    const taskId = String(req.params.id);
    const task: any = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [taskId]);
    await logActivity(req, `Comment added on "${task?.name}"`, taskId, task?.drawingId);
    res.status(201).json(await db.get(req, 'SELECT * FROM comments WHERE id = ?', [id]));
  } catch (err) { next(err); }
});

router.delete('/:taskId/comments/:commentId', async (req, res, next) => {
  try {
    const comment: any = await db.get(req, 'SELECT * FROM comments WHERE id = ? AND taskId = ?', [req.params.commentId, req.params.taskId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    // Delete uploaded photo file if present
    if (comment.photoUrl) {
      const filePath = path.join(__dirname, '..', '..', comment.photoUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.run(req, 'DELETE FROM comments WHERE id = ?', [req.params.commentId]);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
