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
const router = (0, express_1.Router)();
// List milestones — optionally filter by projectId
router.get('/', async (req, res, next) => {
    try {
        const { projectId } = req.query;
        const rows = projectId
            ? await db.all(req, 'SELECT * FROM milestones WHERE projectId = ? ORDER BY createdAt ASC', [projectId])
            : await db.all(req, 'SELECT * FROM milestones ORDER BY createdAt ASC');
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const row = await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]);
        if (!row)
            return res.status(404).json({ error: 'Not found' });
        res.json(row);
    }
    catch (err) {
        next(err);
    }
});
// Get all tasks belonging to a milestone
router.get('/:id/tasks', async (req, res, next) => {
    try {
        const rows = await db.all(req, 'SELECT * FROM tasks WHERE milestoneId = ? ORDER BY createdAt ASC', [req.params.id]);
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { projectId, name, description, dueDate, status } = req.body;
        if (!projectId || !name) {
            return res.status(400).json({ error: 'projectId and name are required' });
        }
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await db.run(req, `INSERT INTO milestones (id, projectId, name, description, dueDate, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, projectId, name, description || '', dueDate || '', status || 'Active', now, now]);
        res.status(201).json(await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [id]));
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
        await db.run(req, `UPDATE milestones SET name=?, description=?, dueDate=?, status=?, updatedAt=? WHERE id=?`, [merged.name, merged.description, merged.dueDate, merged.status, merged.updatedAt, req.params.id]);
        res.json(await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]));
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM milestones WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        // Unlink tasks before deleting
        await db.run(req, 'UPDATE tasks SET milestoneId = NULL WHERE milestoneId = ?', [req.params.id]);
        await db.run(req, 'DELETE FROM milestones WHERE id = ?', [req.params.id]);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
