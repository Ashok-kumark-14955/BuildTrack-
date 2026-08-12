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
const express_1 = require("express");
const uuid_1 = require("uuid");
const db = __importStar(require("../db"));
const cliqReport_1 = require("../cliqReport");
const router = (0, express_1.Router)();
const SORT_COLUMNS = {
    dueDate: 'dueDate',
    priority: 'priorityLevel',
    createdAt: 'createdAt',
    name: 'name',
};
function serialize(row) {
    if (!row)
        return row;
    let tags = [];
    try {
        const raw = row.tags;
        if (Array.isArray(raw)) {
            tags = raw;
        }
        else if (typeof raw === 'string' && raw.trim().startsWith('[')) {
            tags = JSON.parse(raw);
        }
        else if (typeof raw === 'string' && raw.trim()) {
            // Legacy comma-separated values (e.g. "Procurement,Steel")
            tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
        }
    }
    catch {
        tags = [];
    }
    // DataStore stores priority as "priorityLevel" (ZCQL reserved word workaround).
    // Support both column names for local-dev (SQLite) and production (DataStore) compat.
    const priorityValue = row.priorityLevel ?? row.priority;
    const { priorityLevel, priority: _p, ...rest } = row;
    return { ...rest, tags, priority: priorityValue };
}
// List project tasks (filter + search + sort)
router.get('/', async (req, res) => {
    const { projectId, status, priority, assignee, q, sortBy, sortDir } = req.query;
    const clauses = [];
    const params = [];
    if (projectId) {
        clauses.push('projectId = ?');
        params.push(projectId);
    }
    if (status) {
        clauses.push('status = ?');
        params.push(status);
    }
    if (priority) {
        clauses.push('priorityLevel = ?');
        params.push(priority);
    }
    if (assignee) {
        clauses.push('assignee = ?');
        params.push(assignee);
    }
    if (q && q.trim()) {
        clauses.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)');
        const like = `%${q.trim()}%`;
        params.push(like, like, like);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const col = SORT_COLUMNS[sortBy || ''] || 'createdAt';
    const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
    const rows = await db.all(req, `SELECT * FROM project_tasks ${where} ORDER BY ${col} ${dir}`, params);
    res.json(rows.map(serialize));
});
router.get('/:id', async (req, res) => {
    const row = await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [req.params.id]);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    res.json(serialize(row));
});
router.post('/', async (req, res) => {
    const { projectId, name, description, priority, status, assignee, dueDate, estimatedHours, tags } = req.body;
    if (!projectId || !name || !String(name).trim()) {
        return res.status(400).json({ error: 'projectId and name are required' });
    }
    const project = await db.get(req, 'SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project)
        return res.status(400).json({ error: 'Invalid project' });
    const id = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await db.run(req, `INSERT INTO project_tasks (id, projectId, name, description, priorityLevel, status, assignee, dueDate, estimatedHours, tags, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        id, projectId, name.trim(), description || '', priority || 'Medium', status || 'To Do',
        assignee || '', dueDate || '', estimatedHours != null && estimatedHours !== '' ? Number(estimatedHours) : null,
        JSON.stringify(Array.isArray(tags) ? tags : []), now, now,
    ]);
    res.status(201).json(serialize(await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [id])));
});
router.put('/:id', async (req, res) => {
    const existing = await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [req.params.id]);
    if (!existing)
        return res.status(404).json({ error: 'Not found' });
    const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
    if (!merged.name || !String(merged.name).trim())
        return res.status(400).json({ error: 'Task name is required' });
    const tags = Array.isArray(req.body.tags) ? req.body.tags : (existing.tags ? JSON.parse(existing.tags) : []);
    await db.run(req, `UPDATE project_tasks SET name=?, description=?, priorityLevel=?, status=?, assignee=?, dueDate=?, estimatedHours=?, tags=?, updatedAt=? WHERE id=?`, [
        merged.name, merged.description || '', merged.priority || 'Medium', merged.status || 'To Do',
        merged.assignee || '', merged.dueDate || '',
        merged.estimatedHours != null && merged.estimatedHours !== '' ? Number(merged.estimatedHours) : null,
        JSON.stringify(tags), merged.updatedAt, req.params.id,
    ]);
    if (req.body.status && req.body.status !== existing.status && (merged.status === 'Completed' || merged.status === 'Done')) {
        await (0, cliqReport_1.reportTaskCompletion)(req, {
            id: req.params.id,
            name: merged.name,
            projectId: existing.projectId,
            assignedTo: merged.assignee,
            dueDate: merged.dueDate,
            priority: merged.priority ?? existing.priorityLevel,
        });
    }
    res.json(serialize(await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [req.params.id])));
});
router.delete('/:id', async (req, res) => {
    const existing = await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [req.params.id]);
    if (!existing)
        return res.status(404).json({ error: 'Not found' });
    await db.run(req, 'DELETE FROM project_tasks WHERE id = ?', [req.params.id]);
    res.status(204).end();
});
// Comments
router.get('/:id/comments', async (req, res) => {
    const rows = await db.all(req, 'SELECT * FROM project_task_comments WHERE taskId = ? ORDER BY createdAt ASC', [req.params.id]);
    res.json(rows);
});
router.post('/:id/comments', async (req, res) => {
    const { author, message } = req.body;
    const id = (0, uuid_1.v4)();
    const createdAt = new Date().toISOString();
    await db.run(req, 'INSERT INTO project_task_comments (id, taskId, author, message, createdAt) VALUES (?, ?, ?, ?, ?)', [id, req.params.id, author || 'User', message || '', createdAt]);
    res.status(201).json(await db.get(req, 'SELECT * FROM project_task_comments WHERE id = ?', [id]));
});
exports.default = router;
