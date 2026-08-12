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
function serialize(row) {
    if (!row)
        return row;
    let columnPositions = {};
    try {
        columnPositions = row.columnPositions ? JSON.parse(row.columnPositions) : {};
    }
    catch {
        columnPositions = {};
    }
    let deletedNodes = [];
    try {
        deletedNodes = row.deletedNodes ? JSON.parse(row.deletedNodes) : [];
    }
    catch {
        deletedNodes = [];
    }
    let customBeams = [];
    try {
        customBeams = row.customBeams ? JSON.parse(row.customBeams) : [];
    }
    catch {
        customBeams = [];
    }
    let deletedBeams = [];
    try {
        deletedBeams = row.deletedBeams ? JSON.parse(row.deletedBeams) : [];
    }
    catch {
        deletedBeams = [];
    }
    let columnLabels = {};
    try {
        columnLabels = row.columnLabels ? JSON.parse(row.columnLabels) : {};
    }
    catch {
        columnLabels = {};
    }
    let elementTypeLabels = {};
    try {
        elementTypeLabels = row.elementTypeLabels ? JSON.parse(row.elementTypeLabels) : {};
    }
    catch {
        elementTypeLabels = {};
    }
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
        ? await db.all(req, 'SELECT * FROM drawings WHERE projectId = ? ORDER BY createdAt DESC', [projectId])
        : await db.all(req, 'SELECT * FROM drawings ORDER BY createdAt DESC');
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
router.patch('/:id', async (req, res) => {
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
    let newColumnPositions = existing.columnPositions;
    if (resetColumnPositions) {
        newColumnPositions = '{}';
    }
    else if (columnPositions && typeof columnPositions === 'object') {
        let current = {};
        try {
            current = existing.columnPositions ? JSON.parse(existing.columnPositions) : {};
        }
        catch {
            current = {};
        }
        newColumnPositions = JSON.stringify({ ...current, ...columnPositions });
    }
    // deletedNodes patch: { [code]: true } adds the code; { [code]: false } removes it.
    let newDeletedNodes = existing.deletedNodes || '[]';
    if (resetDeletedNodes) {
        newDeletedNodes = '[]';
    }
    else if (deletedNodes && typeof deletedNodes === 'object') {
        let current = [];
        try {
            current = existing.deletedNodes ? JSON.parse(existing.deletedNodes) : [];
        }
        catch {
            current = [];
        }
        for (const [code, remove] of Object.entries(deletedNodes)) {
            if (remove) {
                if (!current.includes(code))
                    current.push(code);
            }
            else {
                current = current.filter((c) => c !== code);
            }
        }
        newDeletedNodes = JSON.stringify(current);
    }
    let newColumnLabels = existing.columnLabels || '{}';
    if (resetColumnLabels) {
        newColumnLabels = '{}';
    }
    else if (columnLabels && typeof columnLabels === 'object') {
        let current = {};
        try {
            current = existing.columnLabels ? JSON.parse(existing.columnLabels) : {};
        }
        catch {
            current = {};
        }
        newColumnLabels = JSON.stringify({ ...current, ...columnLabels });
    }
    // customBeams: { add?: {from,to}[], remove?: {from,to}[] }
    let newCustomBeams = existing.customBeams || '[]';
    if (resetCustomBeams) {
        newCustomBeams = '[]';
    }
    else if (customBeamsPatch && typeof customBeamsPatch === 'object') {
        let current = [];
        try {
            current = existing.customBeams ? JSON.parse(existing.customBeams) : [];
        }
        catch {
            current = [];
        }
        const { add, remove: rem } = customBeamsPatch;
        if (add) {
            for (const b of add) {
                const exists = current.some((c) => (c.from === b.from && c.to === b.to) || (c.from === b.to && c.to === b.from));
                if (!exists)
                    current.push(b);
            }
        }
        if (rem) {
            current = current.filter((c) => !rem.some((r) => (r.from === c.from && r.to === c.to) || (r.from === c.to && r.to === c.from)));
        }
        newCustomBeams = JSON.stringify(current);
    }
    // deletedBeams patch: { [beamId]: true } adds the id; { [beamId]: false } removes it.
    let newDeletedBeams = existing.deletedBeams || '[]';
    if (resetDeletedBeams) {
        newDeletedBeams = '[]';
    }
    else if (deletedBeams && typeof deletedBeams === 'object') {
        let current = [];
        try {
            current = existing.deletedBeams ? JSON.parse(existing.deletedBeams) : [];
        }
        catch {
            current = [];
        }
        for (const [beamId, remove] of Object.entries(deletedBeams)) {
            if (remove) {
                if (!current.includes(beamId))
                    current.push(beamId);
            }
            else {
                current = current.filter((c) => c !== beamId);
            }
        }
        newDeletedBeams = JSON.stringify(current);
    }
    let newElementTypeLabels = existing.elementTypeLabels || '{}';
    if (resetElementTypeLabels) {
        newElementTypeLabels = '{}';
    }
    else if (elementTypeLabels && typeof elementTypeLabels === 'object') {
        let current = {};
        try {
            current = existing.elementTypeLabels ? JSON.parse(existing.elementTypeLabels) : {};
        }
        catch {
            current = {};
        }
        newElementTypeLabels = JSON.stringify({ ...current, ...elementTypeLabels });
    }
    await db.run(req, 'UPDATE drawings SET gridCols = ?, gridRows = ?, name = ?, milestoneId = ?, columnPositions = ?, deletedNodes = ?, customBeams = ?, deletedBeams = ?, columnLabels = ?, elementTypeLabels = ?, lat = ?, lng = ?, fileUrl = ? WHERE id = ?', [
        gridCols ?? existing.gridCols,
        gridRows ?? existing.gridRows,
        name ?? existing.name,
        newMilestoneId,
        newColumnPositions,
        newDeletedNodes,
        newCustomBeams,
        newDeletedBeams,
        newColumnLabels,
        newElementTypeLabels,
        newLat,
        newLng,
        fileUrl ?? existing.fileUrl,
        req.params.id,
    ]);
    res.json(await serializeWithUrl(req, await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id])));
});
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
