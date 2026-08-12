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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const db = __importStar(require("../db"));
const cliqReport_1 = require("../cliqReport");
const stratus_1 = require("../db/stratus");
const router = (0, express_1.Router)();
// Use memory storage so photo comments are stored as base64 data URLs in the DB.
// This avoids any dependency on the ephemeral AppSail disk (same approach as drawings).
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per photo
});
// The DataStore column is named "priorityLevel" ("priority" is a ZCQL
// reserved word that cannot be used as a column name).
// We map it back to "priority" in the API response for the frontend contract.
function serialize(row) {
    if (!row)
        return row;
    // Support both column names: "priorityLevel" (DataStore) and "priority" (SQLite fallback)
    const priorityValue = row.priorityLevel ?? row.priority;
    const { priorityLevel, priority: _p, ...rest } = row;
    return { ...rest, priority: priorityValue };
}
async function logActivity(req, message, taskId, drawingId) {
    await db.run(req, 'INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), taskId || null, drawingId || null, message, new Date().toISOString()]);
}
// List tasks (optionally by drawingId)
router.get('/', async (req, res, next) => {
    try {
        const { drawingId } = req.query;
        const rows = drawingId
            ? await db.all(req, 'SELECT * FROM tasks WHERE drawingId = ? ORDER BY createdAt DESC', [drawingId])
            : await db.all(req, 'SELECT * FROM tasks ORDER BY createdAt DESC');
        res.json(rows.map(serialize));
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const row = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        if (!row)
            return res.status(404).json({ error: 'Not found' });
        res.json(serialize(row));
    }
    catch (err) {
        next(err);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { drawingId, gridCode, name, description, category, priority, assignedTo, startDate, dueDate, status, progress, milestoneId, elementType, elementId, } = req.body;
        const resolvedElementId = elementId || (gridCode ? `Column_${gridCode}` : null);
        if (!drawingId || !resolvedElementId || !name) {
            return res.status(400).json({ error: 'drawingId, elementId and name are required' });
        }
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await db.run(req, `INSERT INTO tasks (id, drawingId, milestoneId, gridCode, name, description, category, priorityLevel, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, drawingId, milestoneId || null, gridCode || '', name, description || '', category || '', priority || 'Medium',
            assignedTo || '', startDate || '', dueDate || '', status || 'Assigned', progress || 0,
            elementType || 'column', resolvedElementId, now, now]);
        await logActivity(req, `Task "${name}" created on ${resolvedElementId}`, id, drawingId);
        res.status(201).json(serialize(await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [id])));
    }
    catch (err) {
        next(err);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        const merged = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
        const priority = 'priority' in req.body ? req.body.priority : existing.priorityLevel;
        // Explicitly handle milestoneId: allow null to unlink
        const milestoneId = 'milestoneId' in req.body ? (req.body.milestoneId || null) : existing.milestoneId;
        await db.run(req, `UPDATE tasks SET milestoneId=?, name=?, description=?, category=?, priorityLevel=?, assignedTo=?, startDate=?, dueDate=?, status=?, progress=?, updatedAt=? WHERE id=?`, [milestoneId, merged.name, merged.description, merged.category, priority, merged.assignedTo,
            merged.startDate, merged.dueDate, merged.status, merged.progress, merged.updatedAt, req.params.id]);
        if (req.body.status && req.body.status !== existing.status) {
            await logActivity(req, `Task "${merged.name}" status changed to ${merged.status}`, req.params.id, existing.drawingId);
            if (merged.status === 'Completed') {
                await (0, cliqReport_1.reportTaskCompletion)(req, {
                    id: req.params.id,
                    name: merged.name,
                    drawingId: existing.drawingId,
                    assignedTo: merged.assignedTo,
                    category: merged.category,
                    dueDate: merged.dueDate,
                    priority: merged.priority ?? existing.priorityLevel,
                });
            }
        }
        else {
            await logActivity(req, `Task "${merged.name}" updated`, req.params.id, existing.drawingId);
        }
        res.json(serialize(await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id])));
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Not found' });
        await db.run(req, 'DELETE FROM tasks WHERE id = ?', [req.params.id]);
        await logActivity(req, `Task "${existing.name}" deleted`, undefined, existing.drawingId);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
});
// Comments
router.get('/:id/comments', async (req, res, next) => {
    try {
        const rows = await db.all(req, 'SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC', [req.params.id]);
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/comments', upload.single('photo'), async (req, res, next) => {
    try {
        const { author, message } = req.body;
        // Convert uploaded photo buffer to a base64 data URL so it persists in the
        // DB without needing the local disk (same approach used for drawing files).
        let photoUrl = null;
        if (req.file) {
            if ((0, stratus_1.isStratusEnabled)()) {
                // Production: upload to Stratus and store a signed URL (7 days)
                const key = await (0, stratus_1.uploadFile)(req, req.file.buffer, req.file.mimetype, 'photos');
                photoUrl = await (0, stratus_1.getSignedUrl)(req, key);
            }
            else {
                // Local dev: store as base64 data URL
                photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            }
        }
        else if (req.body.photoUrl) {
            photoUrl = req.body.photoUrl;
        }
        const id = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        await db.run(req, 'INSERT INTO comments (id, taskId, author, message, photoUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [id, req.params.id, author || 'User', message || '', photoUrl, createdAt]);
        const taskId = String(req.params.id);
        const task = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [taskId]);
        await logActivity(req, `Comment added on "${task?.name}"`, taskId, task?.drawingId);
        res.status(201).json(await db.get(req, 'SELECT * FROM comments WHERE id = ?', [id]));
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:taskId/comments/:commentId', async (req, res, next) => {
    try {
        const comment = await db.get(req, 'SELECT * FROM comments WHERE id = ? AND taskId = ?', [req.params.commentId, req.params.taskId]);
        if (!comment)
            return res.status(404).json({ error: 'Comment not found' });
        // Photos are now stored as base64 data URLs in the DB — no disk file to clean up.
        await db.run(req, 'DELETE FROM comments WHERE id = ?', [req.params.commentId]);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
