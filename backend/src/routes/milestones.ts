import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';

const router = Router();

// List milestones — optionally filter by projectId
router.get('/', (req, res) => {
  const { projectId } = req.query;
  const rows = projectId
    ? db.prepare('SELECT * FROM milestones WHERE projectId = ? ORDER BY createdAt ASC').all(projectId)
    : db.prepare('SELECT * FROM milestones ORDER BY createdAt ASC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Get all tasks belonging to a milestone
router.get('/:id/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE milestoneId = ? ORDER BY createdAt ASC').all(req.params.id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { projectId, name, description, dueDate, status } = req.body;
  if (!projectId || !name) {
    return res.status(400).json({ error: 'projectId and name are required' });
  }
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO milestones (id, projectId, name, description, dueDate, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, projectId, name, description || '', dueDate || '', status || 'Active', now, now);
  res.status(201).json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const existing: any = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  db.prepare(
    `UPDATE milestones SET name=?, description=?, dueDate=?, status=?, updatedAt=? WHERE id=?`
  ).run(merged.name, merged.description, merged.dueDate, merged.status, merged.updatedAt, req.params.id);
  res.json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  // Unlink tasks before deleting
  db.prepare('UPDATE tasks SET milestoneId = NULL WHERE milestoneId = ?').run(req.params.id);
  db.prepare('DELETE FROM milestones WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
