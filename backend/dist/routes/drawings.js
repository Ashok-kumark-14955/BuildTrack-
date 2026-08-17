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
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const db = __importStar(require("../db"));
const stratus_1 = require("../db/stratus");
const router = (0, express_1.Router)();
// Memory storage — buffer is uploaded to Stratus (production) or stored
// as a base64 data URL (local dev, where Stratus is not available).
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});
function gridCode(col, row) {
    const letter = String.fromCharCode(65 + col);
    return `${letter}${row + 1}`;
}
// The Catalyst Data Store SDK returns JSON-typed columns already parsed,
// while local SQLite stores them as TEXT — accept either shape here.
function parseMaybeJson(value, fallback) {
    if (value == null)
        return fallback;
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function serialize(row) {
    if (!row)
        return row;
    const columnPositions = parseMaybeJson(row.columnPositions, {});
    const deletedNodes = parseMaybeJson(row.deletedNodes, []);
    const customBeams = parseMaybeJson(row.customBeams, []);
    const deletedBeams = parseMaybeJson(row.deletedBeams, []);
    const columnLabels = parseMaybeJson(row.columnLabels, {});
    const elementTypeLabels = parseMaybeJson(row.elementTypeLabels, {});
    return { ...row, columnPositions, deletedNodes, customBeams, deletedBeams, columnLabels, elementTypeLabels };
}
/**
 * If the stored fileUrl is a Stratus object key (starts with "stratus://"),
 * resolve it to a 7-day signed URL before sending to the client.
 * For data: URLs (local dev) or legacy /uploads/ paths, return as-is.
 */
async function resolveFileUrl(req, fileUrl) {
    if (!fileUrl)
        return fileUrl;
    if (fileUrl.startsWith('stratus://')) {
        const key = fileUrl.slice('stratus://'.length);
        try {
            return await (0, stratus_1.getSignedUrl)(req, key);
        }
        catch (err) {
            console.error('[stratus] Failed to generate signed URL for', key, err?.message || err);
            return fileUrl; // fallback — frontend will show broken image
        }
    }
    return fileUrl;
}
async function serializeWithUrl(req, row) {
    if (!row)
        return row;
    const base = serialize(row);
    base.fileUrl = await resolveFileUrl(req, base.fileUrl || '');
    return base;
}
async function createTasksForGrid(req, drawingId, cols, rows, createdAt) {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const code = gridCode(col, row);
            // "priority" is a reserved word in ZCQL — column is named "priorityLevel" in DataStore.
            await db.run(req, `INSERT INTO tasks (id, drawingId, gridCode, name, description, category, priorityLevel, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), drawingId, code, `Grid ${code}`, '', '', 'Medium', '', '', '', 'Assigned', 0, 'column', `Column_${code}`, createdAt, createdAt]);
        }
    }
}
// List drawings (optionally by project)
router.get('/', async (req, res) => {
    const { projectId } = req.query;
    const rows = projectId
        ? await db.all(req, 'SELECT * FROM drawings WHERE projectId = ? ORDER BY createdAt ASC', [projectId])
        : await db.all(req, 'SELECT * FROM drawings ORDER BY createdAt ASC');
    const resolved = await Promise.all(rows.map((r) => serializeWithUrl(req, r)));
    res.json(resolved);
});
router.get('/:id', async (req, res) => {
    const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
    if (!row)
        return res.status(404).json({ error: 'Not found' });
    res.json(await serializeWithUrl(req, row));
});
// Upload a new drawing
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { projectId, name, gridCols, gridRows } = req.body;
        if (!req.file)
            return res.status(400).json({ error: 'File is required' });
        const resolvedProjectId = projectId || 'default';
        const project = await db.get(req, 'SELECT id FROM projects WHERE id = ?', [resolvedProjectId]);
        if (!project)
            return res.status(400).json({ error: 'Invalid or missing project. Please reload and try again.' });
        const id = (0, uuid_1.v4)();
        let storedFileUrl;
        if ((0, stratus_1.isStratusEnabled)()) {
            // Production: upload to Stratus. Surface error clearly if bucket doesn't exist.
            // Do NOT fall back to base64 — DataStore has a ~2 MB column limit and the
            // stored value would be silently truncated, causing "Cannot GET /uploads/..." errors.
            const key = await (0, stratus_1.uploadFile)(req, req.file.buffer, req.file.mimetype, 'drawings');
            storedFileUrl = `stratus://${key}`;
        }
        else {
            // Local dev: store as base64 data URL (no Stratus available locally).
            storedFileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
        const createdAt = new Date().toISOString();
        const cols = Math.min(30, Math.max(1, Number(gridCols) || 10));
        const rows = Math.min(30, Math.max(1, Number(gridRows) || 8));
        const drawingName = name || req.file.originalname;
        await db.run(req, `INSERT INTO drawings (id, projectId, name, fileUrl, fileType, gridCols, gridRows, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, resolvedProjectId, drawingName, storedFileUrl, fileType, cols, rows, createdAt]);
        await createTasksForGrid(req, id, cols, rows, createdAt);
        await db.run(req, 'INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), null, id, `${cols * rows} tasks auto-created for "${drawingName}"`, createdAt]);
        const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [id]);
        res.status(201).json(await serializeWithUrl(req, row));
    }
    catch (err) {
        console.error('[upload] Failed to upload drawing:', err?.message || err);
        res.status(500).json({
            error: err?.message || 'Upload failed. Ensure the Stratus bucket "buildtrack" exists in your Catalyst project.',
        });
    }
});
// Update grid config (also supports milestoneId, columnPositions, deletedNodes, columnLabels, elementTypeLabels, lat, lng)
// Accepts both PATCH and PUT so that DrawingsAPI.update() (which uses PUT) works correctly.
async function handleDrawingUpdate(req, res) {
    const { gridCols, gridRows, name, milestoneId, columnPositions, resetColumnPositions, deletedNodes, // { [code]: true|false } — true=delete, false=restore
    resetDeletedNodes, // boolean — clear all deletions
    customBeams: customBeamsPatch, // { add?: {from,to}[], remove?: {from,to}[] }
    resetCustomBeams, // boolean — clear all custom beams
    deletedBeams, // { [beamId]: true|false } — true=delete, false=restore
    resetDeletedBeams, // boolean — clear all beam deletions
    columnLabels, resetColumnLabels, elementTypeLabels, resetElementTypeLabels, lat, lng, fileUrl, } = req.body;
    const existing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
    if (!existing)
        return res.status(404).json({ error: 'Not found' });
    const newMilestoneId = 'milestoneId' in req.body ? (milestoneId || null) : existing.milestoneId;
    const newLat = 'lat' in req.body ? (lat ?? null) : existing.lat;
    const newLng = 'lng' in req.body ? (lng ?? null) : existing.lng;
    const sets = ['gridCols = ?', 'gridRows = ?', 'name = ?', 'milestoneId = ?', 'lat = ?', 'lng = ?', 'fileUrl = ?'];
    const params = [
        gridCols ?? existing.gridCols,
        gridRows ?? existing.gridRows,
        name ?? existing.name,
        newMilestoneId,
        newLat,
        newLng,
        fileUrl ?? existing.fileUrl,
    ];
    // These grid-editor columns aren't present in every environment's DataStore
    // table yet, so only touch a column when this request actually changes it —
    // an unconditional blanket UPDATE fails the whole request with "Invalid
    // column name X" if any one of them is missing.
    function mergeJsonField(col, patch, resetFlag, applyPatch, emptyValue) {
        if (resetFlag) {
            sets.push(`${col} = ?`);
            params.push(JSON.stringify(emptyValue));
        }
        else if (patch && typeof patch === 'object') {
            const current = parseMaybeJson(existing[col], emptyValue);
            sets.push(`${col} = ?`);
            params.push(JSON.stringify(applyPatch(current)));
        }
    }
    mergeJsonField('columnPositions', columnPositions, resetColumnPositions, (current) => ({ ...current, ...columnPositions }), {});
    // deletedNodes patch: { [code]: true } adds the code; { [code]: false } removes it.
    mergeJsonField('deletedNodes', deletedNodes, resetDeletedNodes, (current) => {
        let next = [...current];
        for (const [code, remove] of Object.entries(deletedNodes)) {
            next = remove ? (next.includes(code) ? next : [...next, code]) : next.filter((c) => c !== code);
        }
        return next;
    }, []);
    mergeJsonField('columnLabels', columnLabels, resetColumnLabels, (current) => ({ ...current, ...columnLabels }), {});
    // customBeams: { add?: {from,to}[], remove?: {from,to}[] }
    mergeJsonField('customBeams', customBeamsPatch, resetCustomBeams, (current) => {
        let next = [...current];
        const { add, remove: rem } = customBeamsPatch;
        if (add) {
            for (const b of add) {
                const exists = next.some((c) => (c.from === b.from && c.to === b.to) || (c.from === b.to && c.to === b.from));
                if (!exists)
                    next.push(b);
            }
        }
        if (rem) {
            next = next.filter((c) => !rem.some((r) => (r.from === c.from && r.to === c.to) || (r.from === c.to && r.to === c.from)));
        }
        return next;
    }, []);
    // deletedBeams patch: { [beamId]: true } adds the id; { [beamId]: false } removes it.
    mergeJsonField('deletedBeams', deletedBeams, resetDeletedBeams, (current) => {
        let next = [...current];
        for (const [beamId, remove] of Object.entries(deletedBeams)) {
            next = remove ? (next.includes(beamId) ? next : [...next, beamId]) : next.filter((c) => c !== beamId);
        }
        return next;
    }, []);
    mergeJsonField('elementTypeLabels', elementTypeLabels, resetElementTypeLabels, (current) => ({ ...current, ...elementTypeLabels }), {});
    params.push(req.params.id);
    await db.run(req, `UPDATE drawings SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json(await serializeWithUrl(req, await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id])));
}
// Register both PATCH and PUT so that DrawingsAPI.update() (which uses PUT) works correctly.
router.patch('/:id', handleDrawingUpdate);
router.put('/:id', handleDrawingUpdate);
// Replace the file for an existing drawing (used by seeding/update scripts).
// Accepts multipart/form-data with a "file" field, uploads to Stratus (or
// stores as base64 in local dev), then patches the drawing's fileUrl in place.
router.post('/:id/image', upload.single('file'), async (req, res) => {
    try {
        const existing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
        if (!existing)
            return res.status(404).json({ error: 'Drawing not found' });
        if (!req.file)
            return res.status(400).json({ error: 'File is required' });
        let storedFileUrl;
        if ((0, stratus_1.isStratusEnabled)()) {
            const key = await (0, stratus_1.uploadFile)(req, req.file.buffer, req.file.mimetype, 'drawings');
            storedFileUrl = `stratus://${key}`;
        }
        else {
            storedFileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        await db.run(req, 'UPDATE drawings SET fileUrl = ? WHERE id = ?', [storedFileUrl, req.params.id]);
        const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
        res.json(await serializeWithUrl(req, row));
    }
    catch (err) {
        console.error('[image-replace] Failed:', err?.message || err);
        res.status(500).json({ error: err?.message || 'Failed to replace drawing image' });
    }
});
// Proxy endpoint: streams the drawing file from Stratus through the backend.
// This avoids CORS issues since Stratus signed URLs don't include Access-Control-Allow-Origin.
// The browser loads the image from the same AppSail origin instead of directly from Stratus.
router.get('/:id/file', async (req, res) => {
    try {
        const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
        if (!row)
            return res.status(404).json({ error: 'Not found' });
        const signedUrl = await resolveFileUrl(req, row.fileUrl || '');
        if (!signedUrl || signedUrl.startsWith('stratus://') || signedUrl.startsWith('idb://')) {
            return res.status(404).json({ error: 'No file available' });
        }
        // data: URL — decode and return directly (local dev)
        if (signedUrl.startsWith('data:')) {
            const [meta, b64] = signedUrl.split(',');
            const mimeMatch = meta.match(/data:([^;]+)/);
            const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            const buf = Buffer.from(b64, 'base64');
            res.setHeader('Content-Type', mime);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.send(buf);
        }
        // Stratus signed URL — proxy it
        const client = signedUrl.startsWith('https') ? https_1.default : http_1.default;
        client.get(signedUrl, (upstream) => {
            res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/svg+xml');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            if (upstream.statusCode && upstream.statusCode !== 200) {
                res.status(upstream.statusCode || 500).json({ error: 'Upstream error' });
                return;
            }
            upstream.pipe(res);
        }).on('error', (err) => {
            console.error('[proxy] fetch error:', err.message);
            res.status(502).json({ error: 'Failed to fetch drawing file' });
        });
    }
    catch (err) {
        console.error('[proxy] error:', err?.message || err);
        res.status(500).json({ error: 'Internal error' });
    }
});
router.delete('/:id', async (req, res) => {
    await db.run(req, 'DELETE FROM drawings WHERE id = ?', [req.params.id]);
    res.status(204).end();
});
exports.default = router;
