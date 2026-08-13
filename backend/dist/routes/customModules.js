"use strict";
/**
 * Custom Modules routes
 *
 * Provides a self-contained "custom module builder" — no Zoho Projects integration.
 *
 * Module definitions:   custom_modules   (name, fields JSON, createdAt, updatedAt)
 * Module records:       custom_records   (moduleId, data JSON, createdAt, updatedAt)
 *
 * NOTE: Catalyst DataStore auto-manages ROWID as the primary key.
 * We do NOT store a separate `id` column — we use ROWID as the record id and
 * expose it as "id" in all API responses (via the ROWID alias in SELECT * queries
 * or by mapping the row after fetch).
 *
 * Attachment images are uploaded to Catalyst Stratus (same bucket as drawings).
 * In the record data we store { name, url: "stratus://<key>", type, size }.
 * Before returning records to the frontend, we resolve all stratus:// attachment
 * URLs to 7-day signed GET URLs so the browser can load them directly.
 */
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
const db = __importStar(require("../db"));
const stratus_1 = require("../db/stratus");
const router = (0, express_1.Router)();
// multer for attachment uploads (memory storage, 10 MB max)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
/**
 * Normalise a raw DataStore row so it always has an "id" field.
 * DataStore returns ROWID in the row object; we expose it as "id".
 */
function normalizeRow(row) {
    if (!row)
        return row;
    // ZCQL returns ROWID; also accept lowercase rowid
    const rid = row.ROWID ?? row.rowid ?? row.id;
    return { id: String(rid), ...row };
}
/**
 * Walk through a parsed record data object and resolve any attachment fields
 * whose url starts with "stratus://" to a fresh signed URL.
 */
async function resolveAttachmentUrls(req, data) {
    const resolved = { ...data };
    for (const key of Object.keys(resolved)) {
        const val = resolved[key];
        if (val && typeof val === 'object' && typeof val.url === 'string' && val.url.startsWith('stratus://')) {
            try {
                const stratusKey = val.url.slice('stratus://'.length);
                const signedUrl = await (0, stratus_1.getSignedUrl)(req, stratusKey);
                resolved[key] = { ...val, url: signedUrl };
            }
            catch (err) {
                console.error('[customModules] Failed to sign stratus URL:', val.url, err?.message);
                // Leave as stratus:// — frontend will show broken image rather than crash
            }
        }
    }
    return resolved;
}
/**
 * Parse and resolve a custom_records row: parse the data JSON, then resolve
 * any stratus:// attachment URLs inside it.
 */
async function resolveRecord(req, row) {
    const norm = normalizeRow(row);
    let data = {};
    try {
        data = typeof norm.data === 'string' ? JSON.parse(norm.data) : (norm.data ?? {});
    }
    catch {
        data = {};
    }
    data = await resolveAttachmentUrls(req, data);
    return { ...norm, data };
}
// ---------------------------------------------------------------------------
// Attachment upload endpoint
// ---------------------------------------------------------------------------
/**
 * POST /api/custom-modules/upload-attachment
 * Accepts multipart/form-data with a "file" field.
 * Uploads to Stratus (production) or returns a data: URL (local dev).
 * Returns: { url: "stratus://<key>" | "data:...", name, type, size }
 */
router.post('/upload-attachment', upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'file is required' });
        let url;
        if ((0, stratus_1.isStratusEnabled)()) {
            const key = await (0, stratus_1.uploadFile)(req, req.file.buffer, req.file.mimetype, 'attachments');
            url = `stratus://${key}`;
        }
        else {
            // Local dev: store as data URL
            url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }
        res.json({ url, name: req.file.originalname, type: req.file.mimetype, size: req.file.size });
    }
    catch (err) {
        console.error('[customModules] upload-attachment error:', err?.message || err);
        res.status(500).json({ error: err?.message || 'Upload failed' });
    }
});
// ---------------------------------------------------------------------------
// Module Definitions
// ---------------------------------------------------------------------------
/** GET /api/custom-modules  — list all module definitions */
router.get('/', async (req, res) => {
    try {
        const rows = await db.all(req, `SELECT * FROM custom_modules ORDER BY createdAt ASC`);
        res.json(rows.map(normalizeRow));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** POST /api/custom-modules  — create a new module */
router.post('/', async (req, res) => {
    try {
        const { name, fields } = req.body;
        if (!name)
            return res.status(400).json({ error: 'name is required' });
        const now = Date.now();
        const fieldsJson = JSON.stringify(fields || []);
        await db.run(req, `INSERT INTO custom_modules (name, fields, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [name, fieldsJson, now, now]);
        // Fetch the just-inserted row by matching name + createdAt
        const row = await db.get(req, `SELECT * FROM custom_modules WHERE name = ? AND createdAt = ? ORDER BY ROWID DESC`, [name, now]);
        res.status(201).json(normalizeRow(row));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** GET /api/custom-modules/:id  — get a single module definition */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const row = await db.get(req, `SELECT * FROM custom_modules WHERE ROWID = ?`, [id]);
        if (!row)
            return res.status(404).json({ error: 'Module not found' });
        res.json(normalizeRow(row));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** PUT /api/custom-modules/:id  — update module name / fields */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, fields } = req.body;
        const now = Date.now();
        if (name !== undefined) {
            await db.run(req, `UPDATE custom_modules SET name = ?, updatedAt = ? WHERE ROWID = ?`, [name, now, id]);
        }
        if (fields !== undefined) {
            await db.run(req, `UPDATE custom_modules SET fields = ?, updatedAt = ? WHERE ROWID = ?`, [JSON.stringify(fields), now, id]);
        }
        const row = await db.get(req, `SELECT * FROM custom_modules WHERE ROWID = ?`, [id]);
        if (!row)
            return res.status(404).json({ error: 'Module not found' });
        res.json(normalizeRow(row));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** DELETE /api/custom-modules/:id  — delete module + all its records */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Delete records first (no CASCADE in DataStore)
        await db.run(req, `DELETE FROM custom_records WHERE moduleId = ?`, [id]);
        await db.run(req, `DELETE FROM custom_modules WHERE ROWID = ?`, [id]);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ---------------------------------------------------------------------------
// Module Records
// ---------------------------------------------------------------------------
/** GET /api/custom-modules/:id/records  — list all records for a module */
router.get('/:id/records', async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await db.all(req, `SELECT * FROM custom_records WHERE moduleId = ? ORDER BY createdAt ASC`, [id]);
        const resolved = await Promise.all(rows.map((r) => resolveRecord(req, r)));
        res.json(resolved);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** POST /api/custom-modules/:id/records  — create a new record */
router.post('/:id/records', async (req, res) => {
    try {
        const { id: moduleId } = req.params;
        const data = req.body;
        const now = Date.now();
        await db.run(req, `INSERT INTO custom_records (moduleId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [moduleId, JSON.stringify(data), now, now]);
        // Fetch the just-inserted record by moduleId + createdAt
        const row = await db.get(req, `SELECT * FROM custom_records WHERE moduleId = ? AND createdAt = ? ORDER BY ROWID DESC`, [moduleId, now]);
        res.status(201).json(await resolveRecord(req, row));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** PUT /api/custom-modules/:id/records/:recordId  — update a record */
router.put('/:id/records/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        const data = req.body;
        const now = Date.now();
        await db.run(req, `UPDATE custom_records SET data = ?, updatedAt = ? WHERE ROWID = ?`, [JSON.stringify(data), now, recordId]);
        const row = await db.get(req, `SELECT * FROM custom_records WHERE ROWID = ?`, [recordId]);
        if (!row)
            return res.status(404).json({ error: 'Record not found' });
        res.json(await resolveRecord(req, row));
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** DELETE /api/custom-modules/:id/records/:recordId  — delete a single record */
router.delete('/:id/records/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        await db.run(req, `DELETE FROM custom_records WHERE ROWID = ?`, [recordId]);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
