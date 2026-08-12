"use strict";
/**
 * Custom Modules routes
 *
 * Provides a self-contained "custom module builder" — no Zoho Projects integration.
 *
 * Module definitions:   custom_modules   (id, name, fields JSON, createdAt, updatedAt)
 * Module records:       custom_records   (id, moduleId, data JSON, createdAt, updatedAt)
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db = __importStar(require("../db"));
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Module Definitions
// ---------------------------------------------------------------------------
/** GET /api/custom-modules  — list all module definitions */
router.get('/', async (req, res) => {
    try {
        const rows = await db.all(req, `SELECT * FROM custom_modules ORDER BY createdAt ASC`);
        res.json(rows);
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
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const fieldsJson = JSON.stringify(fields || []);
        await db.run(req, `INSERT INTO custom_modules (id, name, fields, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`, [id, name, fieldsJson, now, now]);
        const row = await db.get(req, `SELECT * FROM custom_modules WHERE id = ?`, [id]);
        res.status(201).json(row);
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
        const now = new Date().toISOString();
        if (name !== undefined) {
            await db.run(req, `UPDATE custom_modules SET name = ?, updatedAt = ? WHERE id = ?`, [name, now, id]);
        }
        if (fields !== undefined) {
            await db.run(req, `UPDATE custom_modules SET fields = ?, updatedAt = ? WHERE id = ?`, [JSON.stringify(fields), now, id]);
        }
        const row = await db.get(req, `SELECT * FROM custom_modules WHERE id = ?`, [id]);
        if (!row)
            return res.status(404).json({ error: 'Module not found' });
        res.json(row);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** DELETE /api/custom-modules/:id  — delete module + all its records */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.run(req, `DELETE FROM custom_records WHERE moduleId = ?`, [id]);
        await db.run(req, `DELETE FROM custom_modules WHERE id = ?`, [id]);
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
        res.json(rows);
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
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await db.run(req, `INSERT INTO custom_records (id, moduleId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`, [id, moduleId, JSON.stringify(data), now, now]);
        const row = await db.get(req, `SELECT * FROM custom_records WHERE id = ?`, [id]);
        res.status(201).json(row);
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
        const now = new Date().toISOString();
        await db.run(req, `UPDATE custom_records SET data = ?, updatedAt = ? WHERE id = ?`, [JSON.stringify(data), now, recordId]);
        const row = await db.get(req, `SELECT * FROM custom_records WHERE id = ?`, [recordId]);
        if (!row)
            return res.status(404).json({ error: 'Record not found' });
        res.json(row);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** DELETE /api/custom-modules/:id/records/:recordId  — delete a single record */
router.delete('/:id/records/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        await db.run(req, `DELETE FROM custom_records WHERE id = ?`, [recordId]);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
