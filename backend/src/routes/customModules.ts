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
 */

import { Router } from 'express';
import * as db from '../db';

const router = Router();

/**
 * Normalise a raw DataStore row so it always has an "id" field.
 * DataStore returns ROWID in the row object; we expose it as "id".
 */
function normalizeRow(row: any): any {
  if (!row) return row;
  // ZCQL returns ROWID; also accept lowercase rowid
  const rid = row.ROWID ?? row.rowid ?? row.id;
  return { id: String(rid), ...row };
}

// ---------------------------------------------------------------------------
// Module Definitions
// ---------------------------------------------------------------------------

/** GET /api/custom-modules  — list all module definitions */
router.get('/', async (req, res) => {
  try {
    const rows = await db.all(req, `SELECT * FROM custom_modules ORDER BY createdAt ASC`);
    res.json(rows.map(normalizeRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/custom-modules  — create a new module */
router.post('/', async (req, res) => {
  try {
    const { name, fields } = req.body as { name: string; fields: any[] };
    if (!name) return res.status(400).json({ error: 'name is required' });

    const now = Date.now();
    const fieldsJson = JSON.stringify(fields || []);

    await db.run(
      req,
      `INSERT INTO custom_modules (name, fields, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
      [name, fieldsJson, now, now]
    );

    // Fetch the just-inserted row by matching name + createdAt
    const row = await db.get(
      req,
      `SELECT * FROM custom_modules WHERE name = ? AND createdAt = ? ORDER BY ROWID DESC`,
      [name, now]
    );

    res.status(201).json(normalizeRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/custom-modules/:id  — update module name / fields */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fields } = req.body as { name?: string; fields?: any[] };
    const now = Date.now();

    if (name !== undefined) {
      await db.run(req, `UPDATE custom_modules SET name = ?, updatedAt = ? WHERE ROWID = ?`, [name, now, id]);
    }
    if (fields !== undefined) {
      await db.run(req, `UPDATE custom_modules SET fields = ?, updatedAt = ? WHERE ROWID = ?`, [JSON.stringify(fields), now, id]);
    }

    const row = await db.get(req, `SELECT * FROM custom_modules WHERE ROWID = ?`, [id]);
    if (!row) return res.status(404).json({ error: 'Module not found' });
    res.json(normalizeRow(row));
  } catch (err: any) {
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
  } catch (err: any) {
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
    const rows = await db.all(
      req,
      `SELECT * FROM custom_records WHERE moduleId = ? ORDER BY createdAt ASC`,
      [id]
    );
    res.json(rows.map(normalizeRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/custom-modules/:id/records  — create a new record */
router.post('/:id/records', async (req, res) => {
  try {
    const { id: moduleId } = req.params;
    const data = req.body as Record<string, any>;
    const now = Date.now();

    await db.run(
      req,
      `INSERT INTO custom_records (moduleId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
      [moduleId, JSON.stringify(data), now, now]
    );

    // Fetch the just-inserted record by moduleId + createdAt
    const row = await db.get(
      req,
      `SELECT * FROM custom_records WHERE moduleId = ? AND createdAt = ? ORDER BY ROWID DESC`,
      [moduleId, now]
    );

    res.status(201).json(normalizeRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/custom-modules/:id/records/:recordId  — update a record */
router.put('/:id/records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = req.body as Record<string, any>;
    const now = Date.now();

    await db.run(
      req,
      `UPDATE custom_records SET data = ?, updatedAt = ? WHERE ROWID = ?`,
      [JSON.stringify(data), now, recordId]
    );

    const row = await db.get(req, `SELECT * FROM custom_records WHERE ROWID = ?`, [recordId]);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    res.json(normalizeRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/custom-modules/:id/records/:recordId  — delete a single record */
router.delete('/:id/records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    await db.run(req, `DELETE FROM custom_records WHERE ROWID = ?`, [recordId]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
