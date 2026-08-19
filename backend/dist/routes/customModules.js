"use strict";
/**
 * Custom Modules routes — Workforce & Safety
 *
 * Backed by Zoho Projects instead of Catalyst Data Store:
 *   Custom Module  → Zoho Task List (holds its records)
 *   Custom Record  → Zoho Task inside that list
 *
 * Module *definitions* (name/fields/buildTrackProjectId) do NOT live on the
 * task list itself — Zoho's Task List API never round-trips a `description`
 * field — nor are they discovered by scanning every task list's tasks: this
 * shared project already has 30+ pre-existing task lists from earlier seed
 * scripts, and probing each one's tasks to find a per-module meta task blew
 * through Zoho's rate limit (100 requests/2min) in live testing.
 *
 * Instead, every module definition lives as ONE entry in a JSON array stored
 * on a single hidden "index" task (INDEX_TASK_NAME) inside one hidden "index"
 * task list (INDEX_TASKLIST_NAME). Listing modules costs 1-2 API calls total
 * regardless of how many other task lists exist in the project. Zoho tasks DO
 * round-trip `description` correctly (unlike task lists), which is also how
 * individual record data is stored.
 *
 * All modules currently live inside a single shared Zoho project
 * (ZOHO_PROJECT_ID) since BuildTrack projects don't each have their own Zoho
 * Project yet. A module is scoped to a BuildTrack project via the
 * `buildTrackProjectId` stored in its index entry — the same keying
 * convention backend/seed_workers_module.mjs already used ("projectId:<id>").
 *
 * Attachments still go through Catalyst Stratus — file blobs are a separate
 * concern from record data and Stratus is already Zoho-native storage.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zohoAuth_1 = require("../zohoAuth");
const zohoProjects_1 = require("./zohoProjects");
const stratus_1 = require("../db/stratus");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
// Per-record data (unrelated to module definitions below) still marks the
// module a record belongs to inline; no per-module meta task is used anymore.
const INDEX_TASKLIST_NAME = '__custom_modules_index__';
const INDEX_TASK_NAME = '__index__';
// Cached for the lifetime of this process — the index task list's id never
// changes once created, so this avoids re-resolving it on every request.
let cachedIndexTasklistId = null;
function getZohoProjectId() {
    const pid = process.env.ZOHO_PROJECT_ID;
    if (!pid)
        throw new Error('ZOHO_PROJECT_ID env var is required (the Zoho project that hosts custom modules)');
    return pid;
}
/**
 * Zoho returns task `description` HTML-entity-encoded (e.g. `"` as `&quot;`),
 * so a raw JSON.parse always fails. Decode before parsing.
 */
function decodeHtmlEntities(str) {
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&amp;/g, '&');
}
function safeParse(raw) {
    try {
        const str = typeof raw === 'string' ? decodeHtmlEntities(raw) : raw;
        return typeof str === 'string' ? JSON.parse(str) : (str || {});
    }
    catch {
        return {};
    }
}
function taskId(t) {
    return String(t.id_string || t.id);
}
/**
 * Walk a record's data object and resolve any attachment fields whose url
 * starts with "stratus://" to a fresh signed URL.
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
            }
        }
    }
    return resolved;
}
/** Resolve (or create, once) the shared index task list's id. */
async function getIndexTasklistId(token, portalId, zProjectId) {
    if (cachedIndexTasklistId)
        return cachedIndexTasklistId;
    const tlData = await (0, zohoProjects_1.zohoGet)(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/`);
    const existing = (tlData.tasklists || []).find((tl) => tl.name === INDEX_TASKLIST_NAME);
    if (existing) {
        cachedIndexTasklistId = taskId(existing);
        return cachedIndexTasklistId;
    }
    const created = await (0, zohoProjects_1.zohoPostForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/`, {
        name: INDEX_TASKLIST_NAME,
        flag: 'internal',
    });
    const tl = created.tasklists?.[0];
    if (!tl)
        throw new Error('Failed to create the custom-modules index task list');
    cachedIndexTasklistId = taskId(tl);
    return cachedIndexTasklistId;
}
/** Read the full module index: { listId, indexTaskId, modules }. */
async function readIndex(token, portalId, zProjectId) {
    let listId = await getIndexTasklistId(token, portalId, zProjectId);
    let taskData;
    try {
        taskData = await (0, zohoProjects_1.zohoGet)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/?tasklist_id=${listId}`);
    }
    catch (err) {
        // The cached index task list id is stale — e.g. it was deleted outside
        // the app. Drop the cache and re-resolve (or recreate) once.
        if (!String(err?.message || '').includes('(404)'))
            throw err;
        cachedIndexTasklistId = null;
        listId = await getIndexTasklistId(token, portalId, zProjectId);
        taskData = await (0, zohoProjects_1.zohoGet)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/?tasklist_id=${listId}`);
    }
    const indexTask = (taskData.tasks || []).find((t) => t.name === INDEX_TASK_NAME);
    const meta = safeParse(indexTask?.description);
    const modules = Array.isArray(meta.modules) ? meta.modules : [];
    return { listId, indexTaskId: indexTask ? taskId(indexTask) : null, modules };
}
/** Write the full module index back (create the index task on first write). */
async function writeIndex(token, portalId, zProjectId, listId, indexTaskId, modules) {
    const description = JSON.stringify({ modules });
    if (indexTaskId) {
        await (0, zohoProjects_1.zohoPutForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/${indexTaskId}/`, { description });
    }
    else {
        await (0, zohoProjects_1.zohoPostForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/`, {
            name: INDEX_TASK_NAME,
            tasklist_id: listId,
            description,
        });
    }
}
// ---------------------------------------------------------------------------
// Attachment upload endpoint (unchanged — Stratus, not Zoho)
// ---------------------------------------------------------------------------
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
// Module Definitions (= Zoho Task Lists)
// ---------------------------------------------------------------------------
/** GET /api/custom-modules?projectId=  — list module definitions for a BuildTrack project */
router.get('/', async (req, res) => {
    try {
        const projectId = String(req.query.projectId || '');
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        const { modules } = await readIndex(token, portalId, zProjectId);
        const filtered = modules.filter((m) => !projectId || m.buildTrackProjectId === projectId);
        res.json(filtered);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** POST /api/custom-modules  — create a new module ({ projectId, name, fields }) */
router.post('/', async (req, res) => {
    try {
        const { projectId, name, fields } = req.body;
        if (!name)
            return res.status(400).json({ error: 'name is required' });
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        // Real task list — this is where the module's records will live.
        const tlData = await (0, zohoProjects_1.zohoPostForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/`, {
            name,
            flag: 'internal',
        });
        const tl = tlData.tasklists?.[0];
        if (!tl)
            return res.status(502).json({ error: 'Zoho did not return the created task list', raw: tlData });
        const listId = taskId(tl);
        const module = { id: listId, name: tl.name, fields: fields || [], buildTrackProjectId: projectId || '' };
        const { listId: indexListId, indexTaskId, modules } = await readIndex(token, portalId, zProjectId);
        await writeIndex(token, portalId, zProjectId, indexListId, indexTaskId, [...modules, module]);
        res.status(201).json(module);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** PUT /api/custom-modules/:id  — update module name and/or fields */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, fields } = req.body;
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        if (name !== undefined) {
            await (0, zohoProjects_1.zohoPutForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/${id}/`, { name });
        }
        const { listId, indexTaskId, modules } = await readIndex(token, portalId, zProjectId);
        let updated = null;
        const nextModules = modules.map((m) => {
            if (m.id !== id)
                return m;
            updated = { ...m, name: name !== undefined ? name : m.name, fields: fields !== undefined ? fields : m.fields };
            return updated;
        });
        if (!updated) {
            // Module existed as a task list but had no index entry yet (created before this route existed).
            updated = { id, name: name || '', fields: fields || [], buildTrackProjectId: '' };
            nextModules.push(updated);
        }
        await writeIndex(token, portalId, zProjectId, listId, indexTaskId, nextModules);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** DELETE /api/custom-modules/:id  — delete module + all its records (Zoho cascades tasks) */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        await (0, zohoProjects_1.zohoDelete)(token, `/portal/${portalId}/projects/${zProjectId}/tasklists/${id}/`);
        const { listId, indexTaskId, modules } = await readIndex(token, portalId, zProjectId);
        await writeIndex(token, portalId, zProjectId, listId, indexTaskId, modules.filter((m) => m.id !== id));
        res.json({ ok: true });
    }
    catch (err) {
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
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        const data = await (0, zohoProjects_1.zohoGet)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/?tasklist_id=${id}`);
        const tasks = data.tasks || [];
        const records = await Promise.all(tasks.map(async (t) => {
            const meta = safeParse(t.description);
            const resolvedData = await resolveAttachmentUrls(req, meta._data || {});
            return { id: taskId(t), moduleId: id, data: resolvedData };
        }));
        res.json(records);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** POST /api/custom-modules/:id/records  — create a new record ({ projectId, data }) */
router.post('/:id/records', async (req, res) => {
    try {
        const { id: moduleId } = req.params;
        const { data } = req.body;
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        const recordData = data || {};
        const name = String(Object.values(recordData)[0] ?? `Record-${Date.now()}`).slice(0, 100) || `Record-${Date.now()}`;
        const meta = { _moduleId: moduleId, _data: recordData };
        const created = await (0, zohoProjects_1.zohoPostForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/`, {
            name,
            tasklist_id: moduleId,
            description: JSON.stringify(meta),
        });
        const t = created.tasks?.[0];
        if (!t)
            return res.status(502).json({ error: 'Zoho did not return the created record', raw: created });
        res.status(201).json({ id: taskId(t), moduleId, data: recordData });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** PUT /api/custom-modules/:id/records/:recordId  — replace a record's data ({ projectId, data }) */
router.put('/:id/records/:recordId', async (req, res) => {
    try {
        const { id: moduleId, recordId } = req.params;
        const { data } = req.body;
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        const recordData = data || {};
        const name = String(Object.values(recordData)[0] ?? `Record-${recordId}`).slice(0, 100) || `Record-${recordId}`;
        const meta = { _moduleId: moduleId, _data: recordData };
        await (0, zohoProjects_1.zohoPutForm)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/${recordId}/`, {
            name,
            description: JSON.stringify(meta),
        });
        const resolvedData = await resolveAttachmentUrls(req, recordData);
        res.json({ id: recordId, moduleId, data: resolvedData });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/** DELETE /api/custom-modules/:id/records/:recordId  — delete a single record */
router.delete('/:id/records/:recordId', async (req, res) => {
    try {
        const { recordId } = req.params;
        const token = await (0, zohoAuth_1.getAccessToken)();
        const portalId = (0, zohoProjects_1.getPortalId)();
        const zProjectId = getZohoProjectId();
        await (0, zohoProjects_1.zohoDelete)(token, `/portal/${portalId}/projects/${zProjectId}/tasks/${recordId}/`);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
