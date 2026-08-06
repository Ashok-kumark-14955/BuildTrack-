import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import * as db from '../db';

const router = Router();

// List milestones — optionally filter by projectId
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const rows = projectId
      ? await db.all(req, 'SELECT * FROM milestones WHERE projectId = ? ORDER BY createdAt ASC', [projectId])
      : await db.all(req, 'SELECT * FROM milestones ORDER BY createdAt ASC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { next(err); }
});

// Get all tasks belonging to a milestone
router.get('/:id/tasks', async (req, res, next) => {
  try {
    const rows = await db.all(req, 'SELECT * FROM tasks WHERE milestoneId = ? ORDER BY createdAt ASC', [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { projectId, name, description, dueDate, status } = req.body;
    if (!projectId || !name) {
      return res.status(400).json({ error: 'projectId and name are required' });
    }
    const id = uuid();
    const now = new Date().toISOString();
    await db.run(
      req,
      `INSERT INTO milestones (id, projectId, name, description, dueDate, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectId, name, description || '', dueDate || '', status || 'Active', now, now]
    );
    res.status(201).json(await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [id]));
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing: any = await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    await db.run(
      req,
      `UPDATE milestones SET name=?, description=?, dueDate=?, status=?, updatedAt=? WHERE id=?`,
      [merged.name, merged.description, merged.dueDate, merged.status, merged.updatedAt, req.params.id]
    );
    res.json(await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    // Unlink tasks before deleting
    await db.run(req, 'UPDATE tasks SET milestoneId = NULL WHERE milestoneId = ?', [req.params.id]);
    await db.run(req, 'DELETE FROM milestones WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
