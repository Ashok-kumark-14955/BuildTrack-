import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';

const router = Router();

const SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

function projectStats(projectId: string) {
  const total: any = db.prepare('SELECT COUNT(*) as c FROM project_tasks WHERE projectId = ?').get(projectId);
  const done: any = db.prepare("SELECT COUNT(*) as c FROM project_tasks WHERE projectId = ? AND status = 'Done'").get(projectId);
  const members: any = db
    .prepare("SELECT COUNT(DISTINCT assignee) as c FROM project_tasks WHERE projectId = ? AND assignee IS NOT NULL AND assignee != ''")
    .get(projectId);
  const taskCount = total?.c ?? 0;
  const doneCount = done?.c ?? 0;
  return {
    taskCount,
    doneCount,
    progress: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
    members: members?.c ?? 0,
  };
}

// List projects (search, filter, sort)
router.get('/', (req, res) => {
  const { q, status, managerName, archived, sortBy, sortDir } = req.query as Record<string, string | undefined>;

  const clauses: string[] = [];
  const params: any[] = [];

  if (archived === 'true') {
    clauses.push('archived = 1');
  } else if (archived !== 'all') {
    clauses.push('(archived IS NULL OR archived = 0)');
  }

  if (q && q.trim()) {
    clauses.push('(name LIKE ? OR code LIKE ? OR managerName LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (managerName) {
    clauses.push('managerName = ?');
    params.push(managerName);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const col = SORT_COLUMNS[sortBy || ''] || 'createdAt';
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC';

  const rows = db.prepare(`SELECT * FROM projects ${where} ORDER BY ${col} ${dir}`).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, stats: projectStats(req.params.id) });
});

router.post('/', (req, res) => {
  const { name, code, description, startDate, endDate, status, managerName } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Project name is required' });
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO projects (id, name, code, description, startDate, endDate, status, managerName, archived, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    id, name.trim(), code || '', description || '', startDate || '', endDate || '',
    status || 'Planning', managerName || '', now, now
  );
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const existing: any = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  if (!merged.name || !String(merged.name).trim()) return res.status(400).json({ error: 'Project name is required' });
  db.prepare(
    `UPDATE projects SET name=?, code=?, description=?, startDate=?, endDate=?, status=?, managerName=?, updatedAt=? WHERE id=?`
  ).run(
    merged.name, merged.code || '', merged.description || '', merged.startDate || '', merged.endDate || '',
    merged.status || 'Planning', merged.managerName || '', merged.updatedAt, req.params.id
  );
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

router.patch('/:id/archive', (req, res) => {
  const existing: any = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const archived = req.body.archived ? 1 : 0;
  db.prepare('UPDATE projects SET archived = ?, updatedAt = ? WHERE id = ?').run(archived, new Date().toISOString(), req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const taskCount = (db.prepare('SELECT COUNT(*) as c FROM project_tasks WHERE projectId = ?').get(req.params.id) as any)?.c ?? 0;
  const force = req.query.force === 'true';
  if (taskCount > 0 && !force) {
    return res.status(409).json({ error: `This project has ${taskCount} task(s). Delete them first or confirm to delete anyway.`, taskCount });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
