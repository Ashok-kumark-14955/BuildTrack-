import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import https from 'https';
import http from 'http';
import * as db from '../db';
import { uploadFile, getSignedUrl, isStratusEnabled } from '../db/stratus';

// ---------------------------------------------------------------------------
// SDK updateRow wrapper — used by handleDrawingUpdate instead of ZCQL so that
// JSON-valued optional columns (deletedBeams, customBeams, deletedNodes) are
// reliably persisted. ZCQL UPDATE silently drops or corrupts JSON text values
// in some Catalyst DataStore environments.
// ---------------------------------------------------------------------------
async function sdkUpdateDrawing(req: any, rowId: string | number | null, updateData: Record<string, any>): Promise<void> {
  if (!rowId) throw new Error('Cannot updateRow: ROWID not found');
  // The SDK updateRow expects ROWID as the primary key field
  await db.updateRow(req, 'drawings', { ROWID: rowId, ...updateData });
}

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
  // Ensure caption is included (may be null/undefined if not set)
  const caption = row.caption ?? undefined;
  return { ...row, columnPositions, deletedNodes, customBeams, deletedBeams, columnLabels, elementTypeLabels, caption };
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
  // ZCQL does not support COALESCE() in ORDER BY — sort by createdAt instead.
  // sortOrder-based ordering is applied client-side by the frontend after receiving all rows.
  const rows = projectId
    ? await db.all(req, 'SELECT * FROM drawings WHERE projectId = ? ORDER BY createdAt ASC', [projectId])
    : await db.all(req, 'SELECT * FROM drawings ORDER BY createdAt ASC');
  // Client-side sortOrder fallback: rows that have a sortOrder come first, rest by createdAt
  const sorted = rows.slice().sort((a: any, b: any) => {
    const sa = a.sortOrder != null ? Number(a.sortOrder) : 9999;
    const sb = b.sortOrder != null ? Number(b.sortOrder) : 9999;
    if (sa !== sb) return sa - sb;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
  const resolved = await Promise.all(sorted.map((r) => serializeWithUrl(req, r)));
  res.json(resolved);
});

// Persist drag-reorder: update each drawing's sortOrder in the DB.
// Must be registered BEFORE /:id routes to avoid "reorder" being treated as an :id param.
router.post('/reorder', async (req, res) => {
  const { projectId, orderedIds } = req.body;
  if (!projectId || !Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'projectId and orderedIds required' });
  }
  try {
    // Add sortOrder column if it doesn't exist yet (idempotent — fails silently if already present).
    // This is needed for the local SQLite path; in DataStore the column must exist in the schema.
    try { await db.run(req, 'ALTER TABLE drawings ADD COLUMN sortOrder INTEGER DEFAULT 9999'); } catch {}

    for (let i = 0; i < orderedIds.length; i++) {
      const drawingId = orderedIds[i];

      // Look up the ROWID so we can use the SDK updateRow API (identical to handleDrawingUpdate).
      // ZCQL UPDATE silently fails for columns that were added after the DataStore table was created
      // (the column exists in the schema but ZCQL may not recognise it in UPDATE statements).
      // The SDK table.updateRow() API is the reliable path for optional/newer columns.
      const rowId = await db.getRowId(req, 'drawings', drawingId);

      if (rowId) {
        // Production DataStore: use SDK updateRow — reliable for sortOrder column
        try {
          await db.updateRow(req, 'drawings', { ROWID: rowId, sortOrder: i });
        } catch (sdkErr: any) {
          console.warn(`[reorder] SDK updateRow failed for drawing ${drawingId}, falling back to ZCQL:`, sdkErr?.message);
          // Fallback to ZCQL (may fail silently if column missing in DataStore schema)
          try {
            await db.run(req, 'UPDATE drawings SET sortOrder = ? WHERE id = ? AND projectId = ?', [i, drawingId, projectId]);
          } catch {}
        }
      } else {
        // Local SQLite: no ROWID, use plain SQL UPDATE
        await db.run(
          req,
          'UPDATE drawings SET sortOrder = ? WHERE id = ? AND projectId = ?',
          [i, drawingId, projectId]
        );
      }
    }
    res.json({ ok: true, reordered: orderedIds.length });
  } catch (err: any) {
    console.error('[reorder] Failed:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Reorder failed' });
  }
});

router.get('/:id', async (req, res) => {
  const row = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(await serializeWithUrl(req, row));
});

// Upload a new drawing — registered on both /upload (legacy scripts) and / (frontend DrawingsAPI.upload)
async function handleDrawingUpload(req: any, res: any) {
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
}

// Register upload handler on both routes:
//   POST /drawings        — called by frontend DrawingsAPI.upload()
//   POST /drawings/upload — called by legacy seeding scripts
router.post('/', upload.single('file'), handleDrawingUpload);
router.post('/upload', upload.single('file'), handleDrawingUpload);

// Update grid config (also supports milestoneId, columnPositions, deletedNodes, columnLabels, elementTypeLabels, lat, lng)
// Accepts both PATCH and PUT so that DrawingsAPI.update() (which uses PUT) works correctly.
async function handleDrawingUpdate(req: any, res: any) {
  try {
    console.log('[handleDrawingUpdate] body keys:', Object.keys(req.body));
    const {
      gridCols, gridRows, name, milestoneId,
      caption,
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

    // -----------------------------------------------------------------------
    // Build the update payload as a plain object.
    // We use the DataStore SDK updateRow() API (via db.updateRow) instead of
    // ZCQL so that JSON-valued text columns are correctly persisted.
    // ZCQL UPDATE silently drops or truncates values that contain JSON special
    // characters (brackets, quotes) in certain DataStore environments.
    // -----------------------------------------------------------------------

    // Always-present columns (every DataStore row has these)
    const updateData: Record<string, any> = {
      gridCols:    gridCols    ?? existing.gridCols,
      gridRows:    gridRows    ?? existing.gridRows,
      name:        name        ?? existing.name,
      milestoneId: newMilestoneId,
      lat:         newLat,
      lng:         newLng,
      fileUrl:     fileUrl     ?? existing.fileUrl,
      // caption is optional — only write it when the client explicitly sends it
      ...('caption' in req.body ? { caption: caption ?? null } : {}),
    };

    // Helper: compute new value for a JSON field and add to updateData
    function mergeJsonField<T>(
      col: string,
      patch: any,
      resetFlag: boolean,
      applyPatch: (current: T) => T,
      emptyValue: T,
    ) {
      if (resetFlag) {
        updateData[col] = JSON.stringify(emptyValue);
      } else if (patch && typeof patch === 'object') {
        const current = parseMaybeJson<T>(existing[col], emptyValue);
        updateData[col] = JSON.stringify(applyPatch(current));
      }
      // If neither resetFlag nor patch is provided, don't touch the column
    }

    mergeJsonField('columnPositions', columnPositions, resetColumnPositions,
      (current: Record<string, any>) => ({ ...current, ...columnPositions }), {});

    mergeJsonField('columnLabels', columnLabels, resetColumnLabels,
      (current: Record<string, string>) => ({ ...current, ...columnLabels }), {});

    mergeJsonField('elementTypeLabels', elementTypeLabels, resetElementTypeLabels,
      (current: Record<string, string>) => ({ ...current, ...elementTypeLabels }), {});

    // deletedNodes patch: { [code]: true } adds the code; { [code]: false } removes it.
    mergeJsonField('deletedNodes', deletedNodes, resetDeletedNodes, (current: string[]) => {
      let next = [...current];
      for (const [code, remove] of Object.entries(deletedNodes)) {
        next = remove ? (next.includes(code) ? next : [...next, code]) : next.filter((c) => c !== code);
      }
      return next;
    }, []);

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

    // -----------------------------------------------------------------------
    // Persist via SDK updateRow (bypasses ZCQL — correctly handles JSON text)
    // Falls back to ZCQL UPDATE on local SQLite (where ROWID is not needed).
    // -----------------------------------------------------------------------
    // ROWID is a large integer (e.g. 59125000000124003). JavaScript's Number
    // loses precision for integers > 2^53, so we must keep it as a string and
    // pass it directly to the SDK without converting to Number.
    const rowId: string | null = existing.ROWID ? String(existing.ROWID) : (existing.rowid ? String(existing.rowid) : null);

    if (rowId) {
      // Production DataStore: use SDK updateRow for reliable JSON persistence
      console.log('[handleDrawingUpdate] Using SDK updateRow, ROWID=', rowId, 'cols:', Object.keys(updateData));
      try {
        await sdkUpdateDrawing(req, rowId as any, updateData);
      } catch (sdkErr: any) {
        // If SDK updateRow fails for optional columns (e.g. column doesn't exist),
        // fall back to per-column ZCQL updates skipping missing ones
        console.warn('[handleDrawingUpdate] SDK updateRow failed, falling back to per-column ZCQL:', sdkErr?.message);

        // Required columns first (always exist)
        const requiredCols = ['gridCols', 'gridRows', 'name', 'milestoneId', 'lat', 'lng', 'fileUrl'];
        const requiredData: Record<string, any> = {};
        for (const k of requiredCols) requiredData[k] = updateData[k];
        await sdkUpdateDrawing(req, rowId, requiredData);

        // Optional columns one at a time
        for (const [col, val] of Object.entries(updateData)) {
          if (requiredCols.includes(col)) continue;
          try {
            await sdkUpdateDrawing(req, rowId, { [col]: val });
          } catch (colErr: any) {
            console.warn(`[handleDrawingUpdate] Skipping optional column ${col}: ${colErr?.message}`);
          }
        }
      }
    } else {
      // Local SQLite fallback: no ROWID, use ZCQL UPDATE with id
      const sets = Object.keys(updateData).map(k => `${k} = ?`);
      const params = [...Object.values(updateData), req.params.id];
      await db.run(req, `UPDATE drawings SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    res.json(await serializeWithUrl(req, await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [req.params.id])));
  } catch (err: any) {
    console.error('[handleDrawingUpdate] ERROR:', err?.message || err, '\nStack:', err?.stack);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

// Register both PATCH and PUT so that DrawingsAPI.update() (which uses PUT) works correctly.
router.patch('/:id', handleDrawingUpdate);
router.put('/:id', handleDrawingUpdate);

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
      // Force correct Content-Type for SVG files — Stratus may serve files
      // stored with a ".svg+xml" key (old bug) as application/octet-stream.
      // We detect SVG by inspecting the stored fileUrl key extension OR the
      // upstream content-type, and always respond with image/svg+xml so that
      // the browser and Konva can render the image correctly.
      const storedKey: string = (row.fileUrl || '').replace(/^stratus:\/\//, '');
      const upstreamCt: string = upstream.headers['content-type'] || '';
      const isSvg =
        storedKey.match(/\.(svg|svg\+xml)$/i) ||
        upstreamCt.includes('svg');
      const contentType = isSvg ? 'image/svg+xml' : upstreamCt || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
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
