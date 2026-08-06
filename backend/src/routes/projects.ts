import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import * as db from '../db';

const router = Router();

const SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

async function projectStats(req: any, projectId: string) {
  const total: any = await db.get(req, 'SELECT COUNT(id) as c FROM project_tasks WHERE projectId = ?', [projectId]);
  const done: any = await db.get(req, "SELECT COUNT(id) as c FROM project_tasks WHERE projectId = ? AND status = 'Done'", [projectId]);
  const members: any = await db.get(
    req,
    "SELECT COUNT(DISTINCT assignee) as c FROM project_tasks WHERE projectId = ? AND assignee IS NOT NULL AND assignee != ''",
    [projectId]
  );
  const taskCount = Number(total?.c ?? 0);
  const doneCount = Number(done?.c ?? 0);
  return {
    taskCount,
    doneCount,
    progress: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
    members: Number(members?.c ?? 0),
  };
}

function toBool(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function serialize(row: any) {
  if (!row) return row;
  return { ...row, archived: toBool(row.archived) };
}

// List projects (search, filter, sort)
router.get('/', async (req, res, next) => {
  try {
    const { q, status, managerName, archived, sortBy, sortDir } = req.query as Record<string, string | undefined>;

    const clauses: string[] = [];
    const params: any[] = [];

    if (archived === 'true') {
      clauses.push("archived = 'true'");
    } else if (archived !== 'all') {
      clauses.push("(archived IS NULL OR archived = 'false')");
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

    const rows = await db.all(req, `SELECT * FROM projects ${where} ORDER BY ${col} ${dir}`, params);
    res.json(rows.map(serialize));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ ...serialize(row), stats: await projectStats(req, req.params.id) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, description, startDate, endDate, status, managerName } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Project name is required' });
    const id = uuid();
    const now = new Date().toISOString();
    await db.run(
      req,
      `INSERT INTO projects (id, name, code, description, startDate, endDate, status, managerName, archived, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), code || '', description || '', startDate || '', endDate || '', status || 'Planning', managerName || '', false, now, now]
    );
    res.status(201).json(serialize(await db.get(req, 'SELECT * FROM projects WHERE id = ?', [id])));
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing: any = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    if (!merged.name || !String(merged.name).trim()) return res.status(400).json({ error: 'Project name is required' });
    await db.run(
      req,
      `UPDATE projects SET name=?, code=?, description=?, startDate=?, endDate=?, status=?, managerName=?, updatedAt=? WHERE id=?`,
      [merged.name, merged.code || '', merged.description || '', merged.startDate || '', merged.endDate || '', merged.status || 'Planning', merged.managerName || '', merged.updatedAt, req.params.id]
    );
    res.json(serialize(await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id])));
  } catch (err) { next(err); }
});

router.patch('/:id/archive', async (req, res, next) => {
  try {
    const existing: any = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const archived = !!req.body.archived;
    await db.run(req, 'UPDATE projects SET archived = ?, updatedAt = ? WHERE id = ?', [archived, new Date().toISOString(), req.params.id]);
    res.json(serialize(await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id])));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const countRow: any = await db.get(req, 'SELECT COUNT(id) as c FROM project_tasks WHERE projectId = ?', [req.params.id]);
    const taskCount = Number(countRow?.c ?? 0);
    const force = req.query.force === 'true';
    if (taskCount > 0 && !force) {
      return res.status(409).json({ error: `This project has ${taskCount} task(s). Delete them first or confirm to delete anyway.`, taskCount });
    }
    await db.run(req, 'DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
