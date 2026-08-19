/**
 * Custom Modules routes — Workforce & Safety
 *
 * Backed by Zoho Projects instead of Catalyst Data Store:
 *   Custom Module  → Zoho Task List
 *   Custom Record  → Zoho Task inside that list
 *
 * Zoho's Task List API does not round-trip a `description` field (confirmed
 * absent on create/get/list responses), so a module's schema (its `fields`)
 * can't live on the task list itself. Instead it lives in a hidden task named
 * META_TASK_NAME inside the list — the same workaround already proven for
 * drawings in functions/construction-api (DRAWING_META_TASK_NAME). Zoho tasks
 * *do* round-trip `description` correctly, which is also how record data is
 * stored (JSON in the task's description).
 *
 * All modules currently live inside a single shared Zoho project
 * (ZOHO_PROJECT_ID) since BuildTrack projects don't each have their own Zoho
 * Project yet. A module is scoped to a BuildTrack project via the
 * `buildTrackProjectId` stored in its meta task — the same keying convention
 * backend/seed_workers_module.mjs already used ("projectId:<id>").
 *
 * Attachments still go through Catalyst Stratus — file blobs are a separate
 * concern from record data and Stratus is already Zoho-native storage.
 */

import { Router } from 'express';
import multer from 'multer';
import { getAccessToken } from '../zohoAuth';
import { zohoGet, zohoPostForm, zohoPutForm, zohoDelete, getPortalId } from './zohoProjects';
import { uploadFile, getSignedUrl, isStratusEnabled } from '../db/stratus';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const META_TASK_NAME = '__custom_module_meta__';

function getZohoProjectId(): string {
  const pid = process.env.ZOHO_PROJECT_ID;
  if (!pid) throw new Error('ZOHO_PROJECT_ID env var is required (the Zoho project that hosts custom modules)');
  return pid;
}

function safeParse(raw: any): any {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
  } catch {
    return {};
  }
}

function taskId(t: any): string {
  return String(t.id_string || t.id);
}

/**
 * Walk a record's data object and resolve any attachment fields whose url
 * starts with "stratus://" to a fresh signed URL.
 */
async function resolveAttachmentUrls(req: any, data: Record<string, any>): Promise<Record<string, any>> {
  const resolved = { ...data };
  for (const key of Object.keys(resolved)) {
    const val = resolved[key];
    if (val && typeof val === 'object' && typeof val.url === 'string' && val.url.startsWith('stratus://')) {
      try {
        const stratusKey = val.url.slice('stratus://'.length);
        const signedUrl = await getSignedUrl(req, stratusKey);
        resolved[key] = { ...val, url: signedUrl };
      } catch (err: any) {
        console.error('[customModules] Failed to sign stratus URL:', val.url, err?.message);
      }
    }
  }
  return resolved;
}

/**
 * Fetch every task list plus every task in the shared Zoho project in one
 * shot, then pair each task list with its meta task (if any). Avoids an N+1
 * fetch per module. Mirrors getDrawingTaskLists() in construction-api.
 */
async function getModuleTaskLists(token: string, portalId: string, zProjectId: string) {
  const [tlData, taskData] = await Promise.all([
    zohoGet(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/`),
    zohoGet(token, `/portal/${portalId}/projects/${zProjectId}/tasks/`),
  ]);
  const taskLists = tlData.tasklists || [];
  const tasks = taskData.tasks || [];
  const metaByListId = new Map<string, any>();
  for (const t of tasks) {
    if (t.name !== META_TASK_NAME) continue;
    const listId = String(t.tasklist?.id_string || t.tasklist?.id || '');
    if (listId) metaByListId.set(listId, t);
  }
  return taskLists
    .map((tl: any) => ({ tl, metaTask: metaByListId.get(String(tl.id_string || tl.id)) }))
    .filter((entry: any) => entry.metaTask);
}

function parseModule(tl: any, metaTask: any) {
  const meta = safeParse(metaTask?.description);
  return {
    id: taskId(tl),
    name: tl.name,
    fields: meta.fields || [],
    buildTrackProjectId: meta.buildTrackProjectId || '',
  };
}

// ---------------------------------------------------------------------------
// Attachment upload endpoint (unchanged — Stratus, not Zoho)
// ---------------------------------------------------------------------------

router.post('/upload-attachment', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    let url: string;
    if (isStratusEnabled()) {
      const key = await uploadFile(req, req.file.buffer, req.file.mimetype, 'attachments');
      url = `stratus://${key}`;
    } else {
      url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    res.json({ url, name: req.file.originalname, type: req.file.mimetype, size: req.file.size });
  } catch (err: any) {
    console.error('[customModules] upload-attachment error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Upload failed' });
  }
});

// ---------------------------------------------------------------------------
// Module Definitions (= Zoho Task Lists)
// ---------------------------------------------------------------------------

/** GET /api/custom-modules?projectId=  — list module definitions for a BuildTrack project */
router.get('/', async (req, res) => {
  try {
    const projectId = String(req.query.projectId || '');
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();

    const entries = await getModuleTaskLists(token, portalId, zProjectId);
    const modules = entries
      .map(({ tl, metaTask }: any) => parseModule(tl, metaTask))
      .filter((m: any) => !projectId || m.buildTrackProjectId === projectId);

    res.json(modules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/custom-modules  — create a new module ({ projectId, name, fields }) */
router.post('/', async (req, res) => {
  try {
    const { projectId, name, fields } = req.body as { projectId?: string; name: string; fields?: any[] };
    if (!name) return res.status(400).json({ error: 'name is required' });

    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();

    const tlData = await zohoPostForm(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/`, {
      name,
      flag: 'internal',
    });
    const tl = tlData.tasklists?.[0];
    if (!tl) return res.status(502).json({ error: 'Zoho did not return the created task list', raw: tlData });
    const listId = taskId(tl);

    const meta = { fields: fields || [], buildTrackProjectId: projectId || '' };
    await zohoPostForm(token, `/portal/${portalId}/projects/${zProjectId}/tasks/`, {
      name: META_TASK_NAME,
      tasklist_id: listId,
      description: JSON.stringify(meta),
    });

    res.status(201).json({ id: listId, name: tl.name, fields: fields || [], buildTrackProjectId: projectId || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/custom-modules/:id  — update module name and/or fields */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fields } = req.body as { name?: string; fields?: any[] };
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();

    if (name !== undefined) {
      await zohoPutForm(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/${id}/`, { name });
    }

    const taskData = await zohoGet(token, `/portal/${portalId}/projects/${zProjectId}/tasks/?tasklist_id=${id}`);
    const metaTask = (taskData.tasks || []).find((t: any) => t.name === META_TASK_NAME);
    const currentMeta = safeParse(metaTask?.description);
    const newMeta = {
      ...currentMeta,
      fields: fields !== undefined ? fields : (currentMeta.fields || []),
    };

    if (metaTask) {
      await zohoPutForm(token, `/portal/${portalId}/projects/${zProjectId}/tasks/${taskId(metaTask)}/`, {
        description: JSON.stringify(newMeta),
      });
    } else {
      await zohoPostForm(token, `/portal/${portalId}/projects/${zProjectId}/tasks/`, {
        name: META_TASK_NAME,
        tasklist_id: id,
        description: JSON.stringify(newMeta),
      });
    }

    res.json({ id, name, fields: newMeta.fields, buildTrackProjectId: newMeta.buildTrackProjectId || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/custom-modules/:id  — delete module + all its records (Zoho cascades tasks) */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();
    await zohoDelete(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/${id}/`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Module Records (= Zoho Tasks inside the module's Task List)
// ---------------------------------------------------------------------------

/** GET /api/custom-modules/:id/records  — list all records for a module */
router.get('/:id/records', async (req, res) => {
  try {
    const { id } = req.params;
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();

    const data = await zohoGet(token, `/portal/${portalId}/projects/${zProjectId}/tasks/?tasklist_id=${id}`);
    const tasks = (data.tasks || []).filter((t: any) => t.name !== META_TASK_NAME);

    const records = await Promise.all(
      tasks.map(async (t: any) => {
        const meta = safeParse(t.description);
        const resolvedData = await resolveAttachmentUrls(req, meta._data || {});
        return { id: taskId(t), moduleId: id, data: resolvedData };
      })
    );

    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/custom-modules/:id/records  — create a new record ({ projectId, data }) */
router.post('/:id/records', async (req, res) => {
  try {
    const { id: moduleId } = req.params;
    const { data } = req.body as { data?: Record<string, any> };
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();

    const recordData = data || {};
    const name = String(Object.values(recordData)[0] ?? `Record-${Date.now()}`).slice(0, 100) || `Record-${Date.now()}`;
    const meta = { _moduleId: moduleId, _data: recordData };

    const created = await zohoPostForm(token, `/portal/${portalId}/projects/${zProjectId}/tasks/`, {
      name,
      tasklist_id: moduleId,
      description: JSON.stringify(meta),
    });
    const t = created.tasks?.[0];
    if (!t) return res.status(502).json({ error: 'Zoho did not return the created record', raw: created });

    res.status(201).json({ id: taskId(t), moduleId, data: recordData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/custom-modules/:id/records/:recordId  — replace a record's data ({ projectId, data }) */
router.put('/:id/records/:recordId', async (req, res) => {
  try {
    const { id: moduleId, recordId } = req.params;
    const { data } = req.body as { data?: Record<string, any> };
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();

    const recordData = data || {};
    const name = String(Object.values(recordData)[0] ?? `Record-${recordId}`).slice(0, 100) || `Record-${recordId}`;
    const meta = { _moduleId: moduleId, _data: recordData };

    await zohoPutForm(token, `/portal/${portalId}/projects/${zProjectId}/tasks/${recordId}/`, {
      name,
      description: JSON.stringify(meta),
    });

    const resolvedData = await resolveAttachmentUrls(req, recordData);
    res.json({ id: recordId, moduleId, data: resolvedData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/custom-modules/:id/records/:recordId  — delete a single record */
router.delete('/:id/records/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const token = await getAccessToken();
    const portalId = getPortalId();
    const zProjectId = getZohoProjectId();
    await zohoDelete(token, `/portal/${portalId}/projects/${zProjectId}/tasks/${recordId}/`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
