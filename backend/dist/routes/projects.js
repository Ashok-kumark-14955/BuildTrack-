"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectStats = projectStats;
const express_1 = require("express");
const uuid_1 = require("uuid");
const db = __importStar(require("../db"));
const router = (0, express_1.Router)();
const SORT_COLUMNS = {
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
};
async function projectStats(req, projectId) {
    // Drawing-linked tasks (created via the drawing markup workflow) are the
    // real source of task/progress data in this app — the separate
    // `project_tasks` table (Kanban-style "Task List" feature) is tracked
    // independently and is often empty, so it must not be the only source
    // used for the project's headline progress numbers. ZCQL (via the thin
    // wrapper in db/catalyst.ts) doesn't support JOINs, so resolve the
    // drawing ids for this project first, then query tasks by drawingId.
    const drawings = await db.all(req, 'SELECT id FROM drawings WHERE projectId = ?', [projectId]);
    const drawingIds = drawings.map((d) => d.id);
    let drawingTasks = [];
    if (drawingIds.length > 0) {
        for (const id of drawingIds) {
            const rows = await db.all(req, 'SELECT status, assignedTo FROM tasks WHERE drawingId = ?', [id]);
            drawingTasks.push(...rows.map((t) => ({ status: t.status, assignee: t.assignedTo })));
        }
    }
    const projectTasks = await db.all(req, 'SELECT status, assignee FROM project_tasks WHERE projectId = ?', [projectId]);
    const allTasks = [...drawingTasks, ...projectTasks];
    const taskCount = allTasks.length;
    const doneCount = allTasks.filter((t) => t.status === 'Completed' || t.status === 'Done').length;
    const members = new Set(allTasks.map((t) => t.assignee).filter((a) => a && String(a).trim() !== '')).size;
    return {
        taskCount,
        doneCount,
        progress: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
        members,
    };
}
function toBool(v) {
    return v === true || v === 'true' || v === 1 || v === '1';
}
function serialize(row) {
    if (!row)
        return row;
    return { ...row, archived: toBool(row.archived) };
}
// List projects (search, filter, sort)
router.get('/', async (req, res, next) => {
    try {
        const { q, status, managerName, archived, sortBy, sortDir } = req.query;
        const clauses = [];
        const params = [];
        if (archived === 'true') {
            clauses.push("archived = 'true'");
        }
        else if (archived !== 'all') {
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
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const row = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!row)
            return res.status(404).json({ error: 'Not found' });
        res.json({ ...serialize(row), stats: await projectStats(req, req.params.id) });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, code, description, startDate, endDate, status, managerName } = req.body;
        if (!name || !String(name).trim())
            return res.status(400).json({ error: 'Project name is required' });
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await db.run(req, `INSERT INTO projects (id, name, code, description, startDate, endDate, status, managerName, archived, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, name.trim(), code || '', description || '', startDate || '', endDate || '', status || 'Planning', managerName || '', false, now, now]);
        res.status(201).json(serialize(await db.get(req, 'SELECT * FROM projects WHERE id = ?', [id])));
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
        if (!merged.name || !String(merged.name).trim())
            return res.status(400).json({ error: 'Project name is required' });
        await db.run(req, `UPDATE projects SET name=?, code=?, description=?, startDate=?, endDate=?, status=?, managerName=?, updatedAt=? WHERE id=?`, [merged.name, merged.code || '', merged.description || '', merged.startDate || '', merged.endDate || '', merged.status || 'Planning', merged.managerName || '', merged.updatedAt, req.params.id]);
        res.json(serialize(await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id])));
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id/archive', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        const archived = !!req.body.archived;
        await db.run(req, 'UPDATE projects SET archived = ?, updatedAt = ? WHERE id = ?', [archived, new Date().toISOString(), req.params.id]);
        res.json(serialize(await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id])));
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        const countRow = await db.get(req, 'SELECT COUNT(id) as c FROM project_tasks WHERE projectId = ?', [req.params.id]);
        const taskCount = Number(countRow?.c ?? 0);
        const force = req.query.force === 'true';
        if (taskCount > 0 && !force) {
            return res.status(409).json({ error: `This project has ${taskCount} task(s). Delete them first or confirm to delete anyway.`, taskCount });
        }
        await db.run(req, 'DELETE FROM projects WHERE id = ?', [req.params.id]);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
