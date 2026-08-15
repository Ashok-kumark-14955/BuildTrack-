import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import https from 'https';
import http from 'http';
import * as db from '../db';
import { uploadFile, getSignedUrl, isStratusEnabled } from '../db/stratus';

const router = Router();

// Memory storage — buffer is uploaded to Stratus (production) or stored
// as a base64 data URL (local dev, where Stratus is not available).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

function gridCode(col: number, row: number) {
  const letter = String.fromCharCode(65 + col);
  return `${letter}${row + 1}`;
}

// The Catalyst Data Store SDK returns JSON-typed columns already parsed,
// while local SQLite stores them as TEXT — accept either shape here.
function parseMaybeJson<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function serialize(row: any) {
  if (!row) return row;
  const columnPositions = parseMaybeJson(row.columnPositions, {});
  const deletedNodes = parseMaybeJson<string[]>(row.deletedNodes, []);
  const customBeams = parseMaybeJson<{ from: string; to: string }[]>(row.customBeams, []);
  const deletedBeams = parseMaybeJson<string[]>(row.deletedBeams, []);
  const columnLabels = parseMaybeJson(row.columnLabels, {});
  const elementTypeLabels = parseMaybeJson(row.elementTypeLabels, {});
  return { ...row, columnPositions, deletedNodes, customBeams, deletedBeams, columnLabels, elementTypeLabels };
}

/**
 * If the stored fileUrl is a Stratus object key (starts with "stratus://"),
 * resolve it to a 7-day signed URL before sending to the client.
 * For data: URLs (local dev) or legacy /uploads/ paths, return as-is.
 */
async function resolveFileUrl(req: any, fileUrl: string): Promise<string> {
  if (!fileUrl) return fileUrl;
  if (fileUrl.startsWith('stratus://')) {
    const key = fileUrl.slice('stratus://'.length);
    try {
      return await getSignedUrl(req, key);
    } catch (err: any) {
      console.error('[stratus] Failed to generate signed URL for', key, err?.message || err);
      return fileUrl; // fallback — frontend will show broken image
    }
  }
  return fileUrl;
}

async function serializeWithUrl(req: any, row: any) {
  if (!row) return row;
  const base = serialize(row);
  base.fileUrl = await resolveFileUrl(req, base.fileUrl || '');
  return base;
}

async function createTasksForGrid(req: any, drawingId: string, cols: number, rows: number, createdAt: string) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const code = gridCode(col, row);
      // "priority" is a reserved word in ZCQL — column is named "priorityLevel" in DataStore.
      await db.run(
        req,
        `INSERT INTO tasks (id, drawingId, gridCode, name, description, category, priorityLevel, assignedTo, startDate, dueDate, status, progress, elementType, elementId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), drawingId, code, `Grid ${code}`, '', '', 'Medium', '', '', '', 'Assigned', 0, 'column', `Column_${code}`, createdAt, createdAt]
      );
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
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(await serializeWithUrl(req, row));
});

// Upload a new drawing
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { projectId, name, gridCols, gridRows } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    const resolvedProjectId = projectId || 'default';
    const project = await db.get(req, 'SELECT id FROM projects WHERE id = ?', [resolvedProjectId]);
    if (!project) return res.status(400).json({ error: 'Invalid or missing project. Please reload and try again.' });
    const id = uuid();

    let storedFileUrl: string;
    if (isStratusEnabled()) {
      // Production: upload to Stratus. Surface error clearly if bucket doesn't exist.
      // Do NOT fall back to base64 — DataStore has a ~2 MB column limit and the
      // stored value would be silently truncated, causing "Cannot GET /uploads/..." errors.
      const key = await uploadFile(req, req.file.buffer, req.file.mimetype, 'drawings');
      storedFileUrl = `stratus://${key}`;
    } else {
      // Local dev: store as base64 data URL (no Stratus available locally).
      storedFileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
    const createdAt = new Date().toISOString();
    const cols = Math.min(30, Math.max(1, Number(gridCols) || 10));
    const rows = Math.min(30, Math.max(1, Number(gridRows) || 8));
    const drawingName = name || req.file.originalname;
    await db.run(
      req,
      `INSERT INTO drawings (id, projectId, name, fileUrl, fileType, gridCols, gridRows, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, resolvedProjectId, drawingName, storedFileUrl, fileType, cols, rows, createdAt]
    );

    await createTasksForGrid(req, id, cols, rows, createdAt);
    await db.run(
      req,
      'INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuid(), null, id, `${cols * rows} tasks auto-created for "${drawingName}"`, createdAt]
    );

    const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [id]);
    res.status(201).json(await serializeWithUrl(req, row));
  } catch (err: any) {
    console.error('[upload] Failed to upload drawing:', err?.message || err);
    res.status(500).json({
      error: err?.message || 'Upload failed. Ensure the Stratus bucket "buildtrack" exists in your Catalyst project.',
    });
  }
});

// Update grid config (also supports milestoneId, columnPositions, deletedNodes, columnLabels, elementTypeLabels, lat, lng)
router.patch('/:id', async (req, res) => {
  const {
    gridCols, gridRows, name, milestoneId,
    columnPositions, resetColumnPositions,
    deletedNodes,                         // { [code]: true|false } — true=delete, false=restore
    resetDeletedNodes,                    // boolean — clear all deletions
    customBeams: customBeamsPatch,        // { add?: {from,to}[], remove?: {from,to}[] }
    resetCustomBeams,                     // boolean — clear all custom beams
    deletedBeams,                         // { [beamId]: true|false } — true=delete, false=restore
    resetDeletedBeams,                    // boolean — clear all beam deletions
    columnLabels, resetColumnLabels,
    elementTypeLabels, resetElementTypeLabels,
    lat, lng, fileUrl,
  } = req.body;
  const existing: any = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const newMilestoneId = 'milestoneId' in req.body ? (milestoneId || null) : existing.milestoneId;
  const newLat = 'lat' in req.body ? (lat ?? null) : existing.lat;
  const newLng = 'lng' in req.body ? (lng ?? null) : existing.lng;

  const sets = ['gridCols = ?', 'gridRows = ?', 'name = ?', 'milestoneId = ?', 'lat = ?', 'lng = ?', 'fileUrl = ?'];
  const params: any[] = [
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
  function mergeJsonField<T>(col: string, patch: any, resetFlag: boolean, applyPatch: (current: T) => T, emptyValue: T) {
    if (resetFlag) {
      sets.push(`${col} = ?`);
      params.push(JSON.stringify(emptyValue));
    } else if (patch && typeof patch === 'object') {
      const current = parseMaybeJson<T>(existing[col], emptyValue);
      sets.push(`${col} = ?`);
      params.push(JSON.stringify(applyPatch(current)));
    }
  }

  mergeJsonField('columnPositions', columnPositions, resetColumnPositions,
    (current: Record<string, any>) => ({ ...current, ...columnPositions }), {});

  // deletedNodes patch: { [code]: true } adds the code; { [code]: false } removes it.
  mergeJsonField('deletedNodes', deletedNodes, resetDeletedNodes, (current: string[]) => {
    let next = [...current];
    for (const [code, remove] of Object.entries(deletedNodes)) {
      next = remove ? (next.includes(code) ? next : [...next, code]) : next.filter((c) => c !== code);
    }
    return next;
  }, []);

  mergeJsonField('columnLabels', columnLabels, resetColumnLabels,
    (current: Record<string, string>) => ({ ...current, ...columnLabels }), {});

  // customBeams: { add?: {from,to}[], remove?: {from,to}[] }
  mergeJsonField('customBeams', customBeamsPatch, resetCustomBeams, (current: { from: string; to: string }[]) => {
    let next = [...current];
    const { add, remove: rem } = customBeamsPatch as { add?: { from: string; to: string }[]; remove?: { from: string; to: string }[] };
    if (add) {
      for (const b of add) {
        const exists = next.some((c) => (c.from === b.from && c.to === b.to) || (c.from === b.to && c.to === b.from));
        if (!exists) next.push(b);
      }
    }
    if (rem) {
      next = next.filter((c) => !rem.some((r) => (r.from === c.from && r.to === c.to) || (r.from === c.to && r.to === c.from)));
    }
    return next;
  }, []);

  // deletedBeams patch: { [beamId]: true } adds the id; { [beamId]: false } removes it.
  mergeJsonField('deletedBeams', deletedBeams, resetDeletedBeams, (current: string[]) => {
    let next = [...current];
    for (const [beamId, remove] of Object.entries(deletedBeams)) {
      next = remove ? (next.includes(beamId) ? next : [...next, beamId]) : next.filter((c) => c !== beamId);
    }
    return next;
  }, []);

  mergeJsonField('elementTypeLabels', elementTypeLabels, resetElementTypeLabels,
    (current: Record<string, string>) => ({ ...current, ...elementTypeLabels }), {});

  params.push(req.params.id);
  await db.run(req, `UPDATE drawings SET ${sets.join(', ')} WHERE id = ?`, params);
  res.json(await serializeWithUrl(req, await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id])));
});

// Replace the file for an existing drawing (used by seeding/update scripts).
// Accepts multipart/form-data with a "file" field, uploads to Stratus (or
// stores as base64 in local dev), then patches the drawing's fileUrl in place.
router.post('/:id/image', upload.single('file'), async (req, res) => {
  try {
    const existing: any = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Drawing not found' });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    let storedFileUrl: string;
    if (isStratusEnabled()) {
      const key = await uploadFile(req, req.file.buffer, req.file.mimetype, 'drawings');
      storedFileUrl = `stratus://${key}`;
    } else {
      storedFileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await db.run(
      req,
      'UPDATE drawings SET fileUrl = ? WHERE id = ?',
      [storedFileUrl, req.params.id]
    );

    const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
    res.json(await serializeWithUrl(req, row));
  } catch (err: any) {
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
    if (!row) return res.status(404).json({ error: 'Not found' });

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
    const client = signedUrl.startsWith('https') ? https : http;
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
  } catch (err: any) {
    console.error('[proxy] error:', err?.message || err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req, res) => {
  await db.run(req, 'DELETE FROM drawings WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

export default router;
