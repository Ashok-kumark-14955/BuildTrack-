/**
 * Custom Modules routes
 *
 * Provides a self-contained "custom module builder" — no Zoho Projects integration.
 *
 * Module definitions:   custom_modules   (id, name, fields JSON, createdAt, updatedAt)
 * Module records:       custom_records   (id, moduleId, data JSON, createdAt, updatedAt)
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db';

const router = Router();

// ---------------------------------------------------------------------------
// Module Definitions
// ---------------------------------------------------------------------------

/** GET /api/custom-modules  — list all module definitions */
router.get('/', async (req, res) => {
  try {
    const rows = await db.all(req, `SELECT * FROM custom_modules ORDER BY createdAt ASC`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/custom-modules  — create a new module */
router.post('/', async (req, res) => {
  try {
    const { name, fields } = req.body as { name: string; fields: any[] };
    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = uuidv4();
    const now = new Date().toISOString();
    const fieldsJson = JSON.stringify(fields || []);

    await db.run(
      req,
      `INSERT INTO custom_modules (id, name, fields, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [id, name, fieldsJson, now, now]
    );

    const row = await db.get(req, `SELECT * FROM custom_modules WHERE id = ?`, [id]);
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/custom-modules/:id  — update module name / fields */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fields } = req.body as { name?: string; fields?: any[] };
    const now = new Date().toISOString();

    if (name !== undefined) {
      await db.run(req, `UPDATE custom_modules SET name = ?, updatedAt = ? WHERE id = ?`, [name, now, id]);
    }
    if (fields !== undefined) {
      await db.run(req, `UPDATE custom_modules SET fields = ?, updatedAt = ? WHERE id = ?`, [JSON.stringify(fields), now, id]);
    }

    const row = await db.get(req, `SELECT * FROM custom_modules WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ error: 'Module not found' });
    res.json(row);
  } catch (err: any) {
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
    const rows = await db.all(req, `SELECT * FROM custom_records WHERE moduleId = ? ORDER BY createdAt ASC`, [id]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/custom-modules/:id/records  — create a new record */
router.post('/:id/records', async (req, res) => {
  try {
    const { id: moduleId } = req.params;
    const data = req.body as Record<string, any>;
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      req,
      `INSERT INTO custom_records (id, moduleId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [id, moduleId, JSON.stringify(data), now, now]
    );

    const row = await db.get(req, `SELECT * FROM custom_records WHERE id = ?`, [id]);
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/custom-modules/:id/records/:recordId  — update a record */
router.put('/:id/records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = req.body as Record<string, any>;
    const now = new Date().toISOString();

    await db.run(
      req,
      `UPDATE custom_records SET data = ?, updatedAt = ? WHERE id = ?`,
      [JSON.stringify(data), now, recordId]
    );

    const row = await db.get(req, `SELECT * FROM custom_records WHERE id = ?`, [recordId]);
    if (!row) return res.status(404).json({ error: 'Record not found' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/custom-modules/:id/records/:recordId  — delete a single record */
router.delete('/:id/records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    await db.run(req, `DELETE FROM custom_records WHERE id = ?`, [recordId]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
