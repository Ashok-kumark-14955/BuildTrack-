'use strict';

/**
 * construction-api — Catalyst Advanced I/O Function
 * ──────────────────────────────────────────────────
 * Full backend for the SiteTrack construction app.
 * All data lives in Zoho Projects (India DC). Zoho Projects entities map to
 * app entities as follows:
 *
 *   App entity        → Zoho Projects entity
 *   ─────────────     ──────────────────────
 *   Project           → Zoho Project (under portal)
 *   Milestone         → Zoho Milestone
 *   Drawing           → Task List  (name = drawing name; JSON metadata lives in a
 *                                    hidden "__drawing_meta__" task inside it -
 *                                    Zoho's Task List API never returns a
 *                                    description field, so it can't live there)
 *   Drawing Task      → Zoho Task  (inside drawing's task list, custom fields)
 *   ProjectTask       → Zoho Task  (in a dedicated "Project Tasks" task list)
 *   Custom Module     → Task List  (name = module name, description = JSON schema)
 *   Custom Record     → Zoho Task  (in module's task list, custom fields in notes)
 *   Drawing files     → Catalyst Stratus (signed URLs)
 *
 * Routes exposed (all under /):
 *   GET  /health
 *   GET  /api/me
 *   GET  /api/projects
 *   POST /api/projects
 *   GET  /api/projects/:id
 *   PUT  /api/projects/:id
 *   PATCH /api/projects/:id/archive
 *   DELETE /api/projects/:id
 *   GET  /api/milestones
 *   POST /api/milestones
 *   PUT  /api/milestones/:id
 *   DELETE /api/milestones/:id
 *   GET  /api/drawings
 *   POST /api/drawings  (multipart — drawing file upload)
 *   GET  /api/drawings/:id
 *   PUT  /api/drawings/:id
 *   DELETE /api/drawings/:id
 *   GET  /api/drawings/:id/file  (proxy to Stratus)
 *   GET  /api/tasks
 *   POST /api/tasks
 *   PUT  /api/tasks/:id
 *   DELETE /api/tasks/:id
 *   POST /api/tasks/:id/comments
 *   POST /api/tasks/:id/photo-comments (multipart)
 *   GET  /api/project-tasks
 *   POST /api/project-tasks
 *   PUT  /api/project-tasks/:id
 *   DELETE /api/project-tasks/:id
 *   POST /api/project-tasks/:id/comments
 *   GET  /api/activity
 *   GET  /api/custom-modules
 *   POST /api/custom-modules
 *   PUT  /api/custom-modules/:id
 *   DELETE /api/custom-modules/:id
 *   GET  /api/custom-modules/:id/records
 *   POST /api/custom-modules/:id/records
 *   PUT  /api/custom-modules/:moduleId/records/:recordId
 *   DELETE /api/custom-modules/:moduleId/records/:recordId
 *   POST /api/custom-modules/:moduleId/records/:recordId/attachments (multipart)
 *   POST /api/seed
 *
 * Required env vars (set in Catalyst console → Functions → construction-api):
 *   ZOHO_CLIENT_ID
 *   ZOHO_CLIENT_SECRET
 *   ZOHO_REFRESH_TOKEN
 *   ZOHO_PORTAL_ID      (numeric Zoho Projects portal ID)
 *   CATALYST_PROJECT_ID (Catalyst project ID for Stratus)
 *   STRATUS_BUCKET      (Stratus bucket name)
 *   TOKEN_ROTATOR_URL   (URL of zoho-token-rotator function, e.g. https://project-rainfall-60081725173.development.catalystserverless.in/server/zoho-token-rotator)
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

// ─── Token cache ──────────────────────────────────────────────────────────────
let _cachedToken = null;
let _cacheExpiresAt = 0;

async function getZohoToken() {
  const now = Date.now();
  if (_cachedToken && now < _cacheExpiresAt - 90_000) return _cachedToken;

  // Try token rotator function first
  const rotatorUrl = process.env.TOKEN_ROTATOR_URL;
  if (rotatorUrl) {
    try {
      const resp = await fetchJSON(rotatorUrl, { method: 'POST' });
      if (resp.access_token) {
        _cachedToken = resp.access_token;
        _cacheExpiresAt = now + (resp.expires_in ?? 3600) * 1000;
        return _cachedToken;
      }
    } catch (e) {
      console.warn('[construction-api] token rotator call failed, trying direct refresh:', e.message);
    }
  }

  // Direct Zoho Accounts refresh
  const result = await postForm('https://accounts.zoho.in/oauth/v2/token', {
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });
  if (!result.access_token) throw new Error('Zoho token refresh failed: ' + JSON.stringify(result));
  _cachedToken = result.access_token;
  _cacheExpiresAt = now + (result.expires_in ?? 3600) * 1000;
  return _cachedToken;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function postForm(url, body) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Non-JSON: ' + data.slice(0, 200))); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function fetchJSON(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Non-JSON (' + res.statusCode + '): ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
}

async function zohoGet(path) {
  const token = await getZohoToken();
  const portalId = process.env.ZOHO_PORTAL_ID;
  const base = `https://projectsapi.zoho.in/restapi/portal/${portalId}`;
  return fetchJSON(base + path, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
}

async function zohoPost(path, body) {
  const token = await getZohoToken();
  const portalId = process.env.ZOHO_PORTAL_ID;
  const base = `https://projectsapi.zoho.in/restapi/portal/${portalId}`;
  const bodyStr = new URLSearchParams(flattenForZoho(body)).toString();
  return new Promise((resolve, reject) => {
    const parsed = new URL(base + path);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Non-JSON: ' + data.slice(0, 300))); } });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function zohoPut(path, body) {
  const token = await getZohoToken();
  const portalId = process.env.ZOHO_PORTAL_ID;
  const base = `https://projectsapi.zoho.in/restapi/portal/${portalId}`;
  const bodyStr = new URLSearchParams(flattenForZoho(body)).toString();
  return new Promise((resolve, reject) => {
    const parsed = new URL(base + path);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Non-JSON: ' + data.slice(0, 300))); } });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function zohoDelete(path) {
  const token = await getZohoToken();
  const portalId = process.env.ZOHO_PORTAL_ID;
  const base = `https://projectsapi.zoho.in/restapi/portal/${portalId}`;
  return new Promise((resolve, reject) => {
    const parsed = new URL(base + path);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'DELETE',
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ deleted: true }); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function flattenForZoho(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && v !== undefined) {
      if (typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(result, flattenForZoho(v, key));
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === 'object') {
            Object.assign(result, flattenForZoho(item, `${key}[${i}]`));
          } else {
            result[`${key}[${i}]`] = item;
          }
        });
      } else {
        result[key] = v;
      }
    }
  }
  return result;
}

// ─── UUID helper ──────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomBytes(16).toString('hex');
}

// ─── Body parser ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(raw.toString())); } catch { resolve({}); }
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const p = new URLSearchParams(raw.toString());
        const obj = {};
        for (const [k, v] of p.entries()) obj[k] = v;
        resolve(obj);
      } else {
        resolve(raw); // binary / multipart — caller handles
      }
    });
    req.on('error', reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      const boundaryMatch = ct.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) return resolve({ fields: {}, files: {} });
      const boundary = '--' + boundaryMatch[1];
      const parts = splitBuffer(body, boundary);
      const fields = {};
      const files = {};
      for (const part of parts) {
        if (!part || part.length === 0) continue;
        const crlfIdx = indexOfBuffer(part, Buffer.from('\r\n\r\n'));
        if (crlfIdx === -1) continue;
        const headerBuf = part.slice(0, crlfIdx).toString();
        const dataBuf = part.slice(crlfIdx + 4);
        // remove trailing \r\n
        const fileData = dataBuf.slice(-2).toString() === '\r\n' ? dataBuf.slice(0, -2) : dataBuf;
        const dispMatch = headerBuf.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
        const fileNameMatch = headerBuf.match(/filename="([^"]*)"/i);
        const ctypeMatch = headerBuf.match(/Content-Type:\s*([^\r\n]+)/i);
        if (!dispMatch) continue;
        const fieldName = dispMatch[1];
        if (fileNameMatch) {
          files[fieldName] = {
            buffer: fileData,
            originalname: fileNameMatch[1],
            mimetype: ctypeMatch ? ctypeMatch[1].trim() : 'application/octet-stream',
          };
        } else {
          fields[fieldName] = fileData.toString();
        }
      }
      resolve({ fields, files });
    });
    req.on('error', reject);
  });
}

function splitBuffer(buf, separator) {
  const sep = Buffer.isBuffer(separator) ? separator : Buffer.from(separator);
  const results = [];
  let start = 0;
  while (true) {
    const idx = indexOfBuffer(buf, sep, start);
    if (idx === -1) break;
    results.push(buf.slice(start, idx));
    start = idx + sep.length;
    if (buf.slice(start, start + 2).toString() === '--') break;
    if (buf.slice(start, start + 2).toString() === '\r\n') start += 2;
  }
  return results;
}

function indexOfBuffer(buf, search, offset = 0) {
  const sLen = search.length;
  for (let i = offset; i <= buf.length - sLen; i++) {
    let found = true;
    for (let j = 0; j < sLen; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

// ─── Response helpers ─────────────────────────────────────────────────────────
// CORS for production origins is handled by Catalyst API Gateway (Console →
// Authentication → Whitelisting → Authorized Domains). Setting the header here
// too would duplicate it and browsers reject responses with multiple
// Access-Control-Allow-Origin values. Only localhost needs it here, since the
// gateway doesn't cover local dev.
function isLocalOrigin(origin) {
  return /^http:\/\/localhost(:\d+)?$/.test(origin || '');
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };
  const origin = res.req && res.req.headers && res.req.headers.origin;
  if (isLocalOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
  }
  res.writeHead(status, headers);
  res.end(body);
}

function sendError(res, status, message, details) {
  return sendJSON(res, status, { error: message, details });
}

// ─── Query string parser ──────────────────────────────────────────────────────
function parseQS(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const p = new URLSearchParams(url.slice(idx + 1));
  const obj = {};
  for (const [k, v] of p.entries()) obj[k] = v;
  return obj;
}

function parsePath(url) {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

// ─── Stratus (object storage) helpers ────────────────────────────────────────
// We use the Catalyst Node.js SDK which is available inside functions at runtime.
let _catalyst = null;
let _stratusClient = null;

function getCatalystSDK(req) {
  if (!_catalyst) {
    try {
      const sdk = require('zcatalyst-sdk-node');
      _catalyst = sdk.initialize(req);
    } catch (e) {
      console.warn('[construction-api] Catalyst SDK not available:', e.message);
    }
  }
  return _catalyst;
}

function getStratus(req) {
  if (!_stratusClient) {
    const app = getCatalystSDK(req);
    if (app) {
      try {
        _stratusClient = app.stratus();
      } catch (e) {
        console.warn('[construction-api] Stratus not available:', e.message);
      }
    }
  }
  return _stratusClient;
}

async function uploadToStratus(req, buffer, fileName, mimeType) {
  const stratus = getStratus(req);
  if (!stratus) return null;
  const bucket = process.env.STRATUS_BUCKET;
  if (!bucket) return null;
  try {
    const key = `drawings/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await stratus.bucket(bucket).object(key).upload(buffer, { contentType: mimeType });
    return `stratus://${bucket}/${key}`;
  } catch (e) {
    console.error('[construction-api] Stratus upload failed:', e.message);
    return null;
  }
}

async function getStratusSignedUrl(req, stratusPath) {
  const stratus = getStratus(req);
  if (!stratus) return null;
  try {
    const withoutPrefix = stratusPath.replace(/^stratus:\/\/[^/]+\//, '');
    const bucket = process.env.STRATUS_BUCKET;
    const url = await stratus.bucket(bucket).object(withoutPrefix).getSignedDownloadUrl(3600);
    return url;
  } catch (e) {
    console.error('[construction-api] Stratus signed URL failed:', e.message);
    return null;
  }
}

// ─── Zoho Projects normalization ──────────────────────────────────────────────
function normalizeProject(zp) {
  return {
    id: String(zp.id_string || zp.id),
    name: zp.name || '',
    code: zp.prefix || zp.name?.substring(0, 6).toUpperCase() || '',
    description: zp.description || '',
    startDate: zp.start_date || zp.created_date || '',
    endDate: zp.end_date || '',
    status: zp.status === 'active' ? 'active' : zp.status || 'active',
    managerName: zp.owner?.name || zp.owner_name || '',
    archived: zp.status === 'archived',
    stats: {
      totalTasks: zp.task_count?.open || 0,
      completedTasks: zp.task_count?.closed || 0,
      totalDrawings: 0,
      activeDrawings: 0,
    },
  };
}

function normalizeMilestone(zm) {
  return {
    id: String(zm.id_string || zm.id),
    projectId: zm.project_id ? String(zm.project_id) : '',
    name: zm.name || '',
    description: zm.description || '',
    dueDate: zm.end_date || zm.due_date || '',
    status: zm.completed ? 'completed' : zm.status || 'pending',
  };
}

// Zoho Projects HTML-escapes description fields on the way out (e.g. `"` -> `&quot;`),
// so JSON stored there must be unescaped before parsing.
function decodeHtmlEntities(str) {
  return str.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function safeParseMeta(description) {
  if (!description) return {};
  try {
    return JSON.parse(decodeHtmlEntities(description));
  } catch {
    return {};
  }
}

// Drawing = Task List, with metadata stored as JSON in a hidden meta task
// (see DRAWING_META_TASK_NAME above).
// Metadata shape: { gridCols, gridRows, columnPositions, deletedNodes, customBeams, deletedBeams, columnLabels, elementTypeLabels, lat, lng, fileUrl, milestoneId }
function parseDrawingMeta(taskList, metaTask) {
  const meta = metaTask ? safeParseMeta(metaTask.description) : {};
  return {
    id: String(taskList.id_string || taskList.id),
    projectId: String(taskList.project_id || ''),
    milestoneId: meta.milestoneId || '',
    fileUrl: meta.fileUrl || '',
    gridCols: meta.gridCols ?? 5,
    gridRows: meta.gridRows ?? 4,
    columnPositions: meta.columnPositions ?? {},
    deletedNodes: meta.deletedNodes ?? [],
    customBeams: meta.customBeams ?? [],
    deletedBeams: meta.deletedBeams ?? [],
    columnLabels: meta.columnLabels ?? {},
    elementTypeLabels: meta.elementTypeLabels ?? {},
    lat: meta.lat ?? null,
    lng: meta.lng ?? null,
    sortOrder: meta.sortOrder ?? 9999,
    name: taskList.name || '',
  };
}

function normalizeTask(zt, drawingId) {
  let meta = {};
  try { if (zt.description) meta = safeParseMeta(zt.description); } catch { /* no meta */ }
  return {
    id: String(zt.id_string || zt.id),
    drawingId: drawingId || meta.drawingId || '',
    milestoneId: meta.milestoneId || '',
    elementType: meta.elementType || 'column',
    elementId: meta.elementId || '',
    gridCode: meta.gridCode || '',
    name: zt.name || '',
    description: meta.notes || zt.description || '',
    category: meta.category || 'inspection',
    priority: zt.priority || 'medium',
    assignedTo: zt.details?.owners?.[0]?.name || '',
    startDate: zt.start_date || '',
    dueDate: zt.due_date || zt.end_date || '',
    status: zt.status?.name === 'Closed' || zt.completed ? 'completed' : (meta.status || 'pending'),
    progress: zt.percent_complete ?? meta.progress ?? 0,
    comments: meta.comments || [],
  };
}

function normalizeProjectTask(zt) {
  let meta = {};
  try { if (zt.description) meta = safeParseMeta(zt.description); } catch { /* no meta */ }
  const tagsRaw = meta.tags || [];
  return {
    id: String(zt.id_string || zt.id),
    projectId: meta.projectId || '',
    milestoneId: meta.milestoneId || '',
    name: zt.name || '',
    description: meta.notes || '',
    priority: zt.priority || 'medium',
    status: zt.status?.name === 'Closed' || zt.completed ? 'completed' : (zt.status?.name?.toLowerCase() || 'open'),
    assignee: zt.details?.owners?.[0]?.name || '',
    dueDate: zt.due_date || zt.end_date || '',
    estimatedHours: meta.estimatedHours ?? 0,
    tags: tagsRaw,
    comments: meta.comments || [],
  };
}

// Custom Module = Task List. Custom Record = Task inside that list.
// Module schema stored as JSON in task list description.
// Record data stored as JSON in task description.
function parseModuleMeta(taskList) {
  let meta = {};
  try { if (taskList.description) meta = safeParseMeta(taskList.description); } catch {}
  return {
    id: String(taskList.id_string || taskList.id),
    name: taskList.name || '',
    fields: meta.fields || [],
    _isCustomModule: meta._isCustomModule === true,
  };
}

function parseRecordMeta(task) {
  let data = {};
  try { if (task.description) data = safeParseMeta(task.description); } catch {}
  return {
    id: String(task.id_string || task.id),
    moduleId: data._moduleId || '',
    data: data._data || {},
  };
}

// ─── In-memory activity log (since Zoho Projects has no activity API we can write to) ──
const _activityLog = [];

function logActivity(message, taskId, drawingId) {
  _activityLog.unshift({
    id: uuid(),
    taskId: taskId || null,
    drawingId: drawingId || null,
    message,
    createdAt: new Date().toISOString(),
  });
  if (_activityLog.length > 200) _activityLog.length = 200;
}

// ─── Task list tag helpers ────────────────────────────────────────────────────
const DRAWING_TAG = '__drawing__';
const PROJECT_TASK_TAG = '__project_tasks__';
const CUSTOM_MODULE_TAG = '__custom_module__';

// Zoho's Task List API never returns a description field (confirmed absent on
// create, get, and list responses, even with an explicit fields param), so a
// drawing's JSON metadata can't live on the task list itself. Tasks *do*
// round-trip description correctly, so metadata lives in a hidden task named
// DRAWING_META_TASK_NAME inside the drawing's task list instead. Its presence
// is also what marks a task list as a drawing (in place of the old
// description._type === DRAWING_TAG check).
const DRAWING_META_TASK_NAME = '__drawing_meta__';

// ─── Route matching helper ────────────────────────────────────────────────────
function matchRoute(method, pattern, reqMethod, reqPath) {
  if (method !== reqMethod) return null;
  const patParts = pattern.split('/').filter(Boolean);
  const reqParts = reqPath.split('/').filter(Boolean);
  if (patParts.length !== reqParts.length) return null;
  const params = {};
  for (let i = 0; i < patParts.length; i++) {
    if (patParts[i].startsWith(':')) {
      params[patParts[i].slice(1)] = reqParts[i];
    } else if (patParts[i] !== reqParts[i]) {
      return null;
    }
  }
  return params;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// GET /health
async function handleHealth(req, res) {
  return sendJSON(res, 200, { ok: true, service: 'construction-api' });
}

// GET /api/me
async function handleMe(req, res) {
  try {
    const app = getCatalystSDK(req);
    if (!app) return sendJSON(res, 200, { id: 'dev', name: 'Developer', email: 'dev@localhost' });
    const user = await app.userManagement().getCurrentUser();
    return sendJSON(res, 200, {
      id: String(user.user_id || user.id || 'unknown'),
      name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.name || 'User',
      email: user.email_id || user.email || '',
      role: user.role_name || 'User',
      joinDate: user.created_time || new Date().toISOString(),
    });
  } catch (e) {
    return sendJSON(res, 200, { id: 'unknown', name: 'User', email: '' });
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

async function handleListProjects(req, res) {
  try {
    const data = await zohoGet('/projects/');
    if (data.error) return sendError(res, 502, 'Failed to list projects', data.error);
    const projects = (data.projects || []).map(normalizeProject);
    return sendJSON(res, 200, projects);
  } catch (e) {
    return sendError(res, 500, 'Failed to list projects', e.message);
  }
}

async function handleCreateProject(req, res) {
  try {
    const body = await readBody(req);
    const data = await zohoPost('/projects/', {
      name: body.name,
      description: body.description || '',
      start_date: body.startDate || '',
      end_date: body.endDate || '',
    });
    const project = data.projects?.[0] ? normalizeProject(data.projects[0]) : null;
    if (!project) return sendError(res, 400, 'Project creation failed', data);
    logActivity(`Project "${project.name}" created`);
    return sendJSON(res, 201, project);
  } catch (e) {
    return sendError(res, 500, 'Failed to create project', e.message);
  }
}

async function handleGetProject(req, res, params) {
  try {
    const data = await zohoGet(`/projects/${params.id}/`);
    const project = data.projects?.[0] ? normalizeProject(data.projects[0]) : null;
    if (!project) return sendError(res, 404, 'Project not found');
    return sendJSON(res, 200, project);
  } catch (e) {
    return sendError(res, 500, 'Failed to get project', e.message);
  }
}

async function handleUpdateProject(req, res, params) {
  try {
    const body = await readBody(req);
    const data = await zohoPut(`/projects/${params.id}/`, {
      name: body.name,
      description: body.description || '',
      start_date: body.startDate || '',
      end_date: body.endDate || '',
    });
    const project = data.projects?.[0] ? normalizeProject(data.projects[0]) : null;
    if (!project) return sendError(res, 400, 'Project update failed', data);
    logActivity(`Project "${project.name}" updated`);
    return sendJSON(res, 200, project);
  } catch (e) {
    return sendError(res, 500, 'Failed to update project', e.message);
  }
}

async function handleArchiveProject(req, res, params) {
  try {
    const body = await readBody(req);
    const archive = body.archived !== false;
    // Zoho Projects: status can be 'active' or 'archived'
    await zohoPut(`/projects/${params.id}/`, { status: archive ? 'archived' : 'active' });
    return sendJSON(res, 200, { id: params.id, archived: archive });
  } catch (e) {
    return sendError(res, 500, 'Failed to archive project', e.message);
  }
}

async function handleDeleteProject(req, res, params) {
  try {
    await zohoDelete(`/projects/${params.id}/`);
    logActivity(`Project ${params.id} deleted`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete project', e.message);
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

async function handleListMilestones(req, res, qs) {
  try {
    const projectId = qs.projectId;
    if (!projectId) return sendJSON(res, 200, []);
    const data = await zohoGet(`/projects/${projectId}/milestones/`);
    const milestones = (data.milestones || []).map((m) => ({
      ...normalizeMilestone(m),
      projectId,
    }));
    return sendJSON(res, 200, milestones);
  } catch (e) {
    return sendError(res, 500, 'Failed to list milestones', e.message);
  }
}

async function handleCreateMilestone(req, res) {
  try {
    const body = await readBody(req);
    const projectId = body.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    const data = await zohoPost(`/projects/${projectId}/milestones/`, {
      name: body.name,
      end_date: body.dueDate || '',
      status: 'open',
      flag: 'external',
    });
    const m = data.milestones?.[0] ? { ...normalizeMilestone(data.milestones[0]), projectId } : null;
    if (!m) return sendError(res, 400, 'Milestone creation failed', data);
    logActivity(`Milestone "${m.name}" created`);
    return sendJSON(res, 201, m);
  } catch (e) {
    return sendError(res, 500, 'Failed to create milestone', e.message);
  }
}

async function handleUpdateMilestone(req, res, params) {
  try {
    const body = await readBody(req);
    const projectId = body.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    const data = await zohoPut(`/projects/${projectId}/milestones/${params.id}/`, {
      name: body.name,
      end_date: body.dueDate || '',
      status: body.status || 'open',
      flag: 'external',
    });
    const m = data.milestones?.[0] ? { ...normalizeMilestone(data.milestones[0]), projectId } : { id: params.id, ...body };
    return sendJSON(res, 200, m);
  } catch (e) {
    return sendError(res, 500, 'Failed to update milestone', e.message);
  }
}

async function handleDeleteMilestone(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    await zohoDelete(`/projects/${projectId}/milestones/${params.id}/`);
    logActivity(`Milestone ${params.id} deleted`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete milestone', e.message);
  }
}

// ─── Drawings (= Task Lists carrying a hidden DRAWING_META_TASK_NAME task) ───

async function getDrawingMetaTask(projectId, drawingId) {
  const data = await zohoGet(`/projects/${projectId}/tasklists/${drawingId}/tasks/`);
  const tasks = data.tasks || [];
  return tasks.find((t) => t.name === DRAWING_META_TASK_NAME) || null;
}

// Fetches every task list plus every task in the project in one shot (Zoho's
// project-wide /tasks/ endpoint includes each task's tasklist id), then pairs
// each task list with its meta task, if any. Avoids an N+1 fetch per drawing.
async function getDrawingTaskLists(projectId) {
  const [tlData, taskData] = await Promise.all([
    zohoGet(`/projects/${projectId}/tasklists/`),
    zohoGet(`/projects/${projectId}/tasks/`),
  ]);
  const allTaskLists = tlData.tasklists || [];
  const allTasks = taskData.tasks || [];
  const metaTaskByTaskListId = new Map();
  for (const t of allTasks) {
    if (t.name !== DRAWING_META_TASK_NAME) continue;
    const tlId = String(t.tasklist?.id_string || t.tasklist?.id || '');
    if (tlId) metaTaskByTaskListId.set(tlId, t);
  }
  return allTaskLists
    .map((tl) => ({ tl, metaTask: metaTaskByTaskListId.get(String(tl.id_string || tl.id)) }))
    .filter((entry) => entry.metaTask);
}

async function handleListDrawings(req, res, qs) {
  try {
    const projectId = qs.projectId;
    if (!projectId) return sendJSON(res, 200, []);
    const entries = await getDrawingTaskLists(projectId);
    const drawings = entries.map(({ tl, metaTask }) =>
      parseDrawingMeta({ ...tl, project_id: projectId }, metaTask));
    // Sort by sortOrder ascending so the frontend receives drawings in the user's saved order
    drawings.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    return sendJSON(res, 200, drawings);
  } catch (e) {
    return sendError(res, 500, 'Failed to list drawings', e.message);
  }
}

async function handleUploadDrawing(req, res) {
  try {
    const { fields, files } = await parseMultipart(req);
    const projectId = fields.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');

    let fileUrl = '';
    const file = files.file || files.drawing;
    if (file) {
      fileUrl = await uploadToStratus(req, file.buffer, file.originalname, file.mimetype);
      if (!fileUrl) {
        // Fall back to base64 data URL if Stratus is not configured
        const b64 = file.buffer.toString('base64');
        fileUrl = `data:${file.mimetype};base64,${b64}`;
      }
    }

    const meta = {
      _type: DRAWING_TAG,
      milestoneId: fields.milestoneId || '',
      fileUrl,
      gridCols: parseInt(fields.gridCols || '5', 10),
      gridRows: parseInt(fields.gridRows || '4', 10),
      columnPositions: {},
      deletedNodes: [],
      customBeams: [],
      deletedBeams: [],
      columnLabels: {},
      elementTypeLabels: {},
      lat: fields.lat ? parseFloat(fields.lat) : null,
      lng: fields.lng ? parseFloat(fields.lng) : null,
    };

    const data = await zohoPost(`/projects/${projectId}/tasklists/`, {
      name: fields.name || `Drawing-${Date.now()}`,
    });
    const tl = data.tasklists?.[0];
    if (!tl) return sendError(res, 400, 'Drawing creation failed', data);
    const drawingId = String(tl.id_string || tl.id);

    const metaTaskData = await zohoPost(`/projects/${projectId}/tasks/`, {
      name: DRAWING_META_TASK_NAME,
      tasklist_id: drawingId,
      description: JSON.stringify(meta),
    });
    const metaTask = metaTaskData.tasks?.[0];

    logActivity(`Drawing "${tl.name}" uploaded`);
    return sendJSON(res, 201, parseDrawingMeta({ ...tl, project_id: projectId }, metaTask));
  } catch (e) {
    return sendError(res, 500, 'Failed to upload drawing', e.message);
  }
}

async function handleGetDrawing(req, res, params, qs) {
  try {
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    const data = await zohoGet(`/projects/${projectId}/tasklists/${params.id}/`);
    const tl = data.tasklists?.[0];
    if (!tl) return sendError(res, 404, 'Drawing not found');
    const metaTask = await getDrawingMetaTask(projectId, params.id);
    return sendJSON(res, 200, parseDrawingMeta({ ...tl, project_id: projectId }, metaTask));
  } catch (e) {
    return sendError(res, 500, 'Failed to get drawing', e.message);
  }
}

async function handleUpdateDrawing(req, res, params) {
  try {
    const body = await readBody(req);
    // Accept projectId from body OR query string (belt-and-suspenders)
    const qs = parseQS(req.url);
    const projectId = body.projectId || qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');

    // Fetch current task list (for its name) and meta task (for its metadata)
    const existing = await zohoGet(`/projects/${projectId}/tasklists/${params.id}/`);
    const tl = existing.tasklists?.[0];
    if (!tl) return sendError(res, 404, 'Drawing not found');

    const metaTask = await getDrawingMetaTask(projectId, params.id);
    const meta = metaTask ? safeParseMeta(metaTask.description) : {};

    // Helper: use body value when key is explicitly present (even if null),
    // otherwise fall back to current meta value.
    const pick = (key, fallback) => Object.prototype.hasOwnProperty.call(body, key) ? body[key] : fallback;

    // ── Merge JSON array/object fields using the same patch protocol as the
    //    AppSail backend's mergeJsonField helper ──────────────────────────────

    // deletedNodes: { [code]: true|false } — true=delete, false=restore
    const currentDeletedNodes = Array.isArray(meta.deletedNodes) ? meta.deletedNodes : [];
    let nextDeletedNodes = currentDeletedNodes;
    if (body.resetDeletedNodes) {
      nextDeletedNodes = [];
    } else if (body.deletedNodes && typeof body.deletedNodes === 'object' && !Array.isArray(body.deletedNodes)) {
      nextDeletedNodes = [...currentDeletedNodes];
      for (const [code, remove] of Object.entries(body.deletedNodes)) {
        if (remove) {
          if (!nextDeletedNodes.includes(code)) nextDeletedNodes.push(code);
        } else {
          nextDeletedNodes = nextDeletedNodes.filter((c) => c !== code);
        }
      }
    }

    // deletedBeams: { [beamId]: true|false } — true=delete, false=restore
    const currentDeletedBeams = Array.isArray(meta.deletedBeams) ? meta.deletedBeams : [];
    let nextDeletedBeams = currentDeletedBeams;
    if (body.resetDeletedBeams) {
      nextDeletedBeams = [];
    } else if (body.deletedBeams && typeof body.deletedBeams === 'object' && !Array.isArray(body.deletedBeams)) {
      nextDeletedBeams = [...currentDeletedBeams];
      for (const [beamId, remove] of Object.entries(body.deletedBeams)) {
        if (remove) {
          if (!nextDeletedBeams.includes(beamId)) nextDeletedBeams.push(beamId);
        } else {
          nextDeletedBeams = nextDeletedBeams.filter((b) => b !== beamId);
        }
      }
    }

    // columnPositions: merge patch object into current positions
    const currentColumnPositions = (meta.columnPositions && typeof meta.columnPositions === 'object') ? meta.columnPositions : {};
    let nextColumnPositions = currentColumnPositions;
    if (body.resetColumnPositions) {
      nextColumnPositions = {};
    } else if (body.columnPositions && typeof body.columnPositions === 'object' && !Array.isArray(body.columnPositions)) {
      nextColumnPositions = { ...currentColumnPositions, ...body.columnPositions };
    }

    // columnLabels: merge patch object into current labels
    const currentColumnLabels = (meta.columnLabels && typeof meta.columnLabels === 'object') ? meta.columnLabels : {};
    let nextColumnLabels = currentColumnLabels;
    if (body.resetColumnLabels) {
      nextColumnLabels = {};
    } else if (body.columnLabels && typeof body.columnLabels === 'object' && !Array.isArray(body.columnLabels)) {
      nextColumnLabels = { ...currentColumnLabels, ...body.columnLabels };
    }

    // elementTypeLabels: merge patch object into current labels
    const currentElementTypeLabels = (meta.elementTypeLabels && typeof meta.elementTypeLabels === 'object') ? meta.elementTypeLabels : {};
    let nextElementTypeLabels = currentElementTypeLabels;
    if (body.resetElementTypeLabels) {
      nextElementTypeLabels = {};
    } else if (body.elementTypeLabels && typeof body.elementTypeLabels === 'object' && !Array.isArray(body.elementTypeLabels)) {
      nextElementTypeLabels = { ...currentElementTypeLabels, ...body.elementTypeLabels };
    }

    // customBeams: { add?: [{from,to}], remove?: [{from,to}] }
    const currentCustomBeams = Array.isArray(meta.customBeams) ? meta.customBeams : [];
    let nextCustomBeams = currentCustomBeams;
    if (body.resetCustomBeams) {
      nextCustomBeams = [];
    } else if (body.customBeams && typeof body.customBeams === 'object' && !Array.isArray(body.customBeams)) {
      nextCustomBeams = [...currentCustomBeams];
      const { add, remove: rem } = body.customBeams;
      if (Array.isArray(add)) {
        for (const b of add) {
          const exists = nextCustomBeams.some(
            (c) => (c.from === b.from && c.to === b.to) || (c.from === b.to && c.to === b.from)
          );
          if (!exists) nextCustomBeams.push(b);
        }
      }
      if (Array.isArray(rem)) {
        nextCustomBeams = nextCustomBeams.filter(
          (c) => !rem.some((r) => (r.from === c.from && r.to === c.to) || (r.from === c.to && r.to === c.from))
        );
      }
    }

    // Merge updates — explicit null is honoured (e.g. clearing lat/lng)
    const merged = {
      ...meta,
      _type: DRAWING_TAG,
      milestoneId: pick('milestoneId', meta.milestoneId),
      fileUrl: pick('fileUrl', meta.fileUrl),
      gridCols: pick('gridCols', meta.gridCols),
      gridRows: pick('gridRows', meta.gridRows),
      columnPositions: nextColumnPositions,
      deletedNodes: nextDeletedNodes,
      customBeams: nextCustomBeams,
      deletedBeams: nextDeletedBeams,
      columnLabels: nextColumnLabels,
      elementTypeLabels: nextElementTypeLabels,
      lat: pick('lat', meta.lat),
      lng: pick('lng', meta.lng),
    };

    await zohoPut(`/projects/${projectId}/tasklists/${params.id}/`, {
      name: body.name || tl.name,
    });

    if (metaTask) {
      await zohoPut(`/projects/${projectId}/tasks/${metaTask.id_string || metaTask.id}/`, {
        description: JSON.stringify(merged),
      });
    } else {
      await zohoPost(`/projects/${projectId}/tasks/`, {
        name: DRAWING_META_TASK_NAME,
        tasklist_id: params.id,
        description: JSON.stringify(merged),
      });
    }

    return sendJSON(res, 200, {
      id: params.id,
      projectId,
      name: body.name || tl.name,
      ...merged,
    });
  } catch (e) {
    return sendError(res, 500, 'Failed to update drawing', e.message);
  }
}

// POST /api/drawings/reorder
// Body: { projectId: string, orderedIds: string[] }
// Updates each drawing's metadata with its new sortOrder index.
async function handleReorderDrawings(req, res) {
  try {
    const body = await readBody(req);
    const { projectId, orderedIds } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');
    if (!Array.isArray(orderedIds)) return sendError(res, 400, 'orderedIds must be an array');

    // Update all drawings in parallel — each gets a sortOrder matching its new index.
    await Promise.all(
      orderedIds.map(async (drawingId, index) => {
        try {
          const metaTask = await getDrawingMetaTask(projectId, drawingId);
          if (!metaTask) return; // skip if drawing not found
          const meta = safeParseMeta(metaTask.description);
          const merged = { ...meta, sortOrder: index };
          await zohoPut(`/projects/${projectId}/tasks/${metaTask.id_string || metaTask.id}/`, {
            description: JSON.stringify(merged),
          });
        } catch (e) {
          console.warn(`[reorder] Failed to update sortOrder for drawing ${drawingId}:`, e.message);
        }
      })
    );

    return sendJSON(res, 200, { ok: true, reordered: orderedIds.length });
  } catch (e) {
    return sendError(res, 500, 'Failed to reorder drawings', e.message);
  }
}

async function handleDeleteDrawing(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    await zohoDelete(`/projects/${projectId}/tasklists/${params.id}/`);
    logActivity(`Drawing ${params.id} deleted`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete drawing', e.message);
  }
}

async function handleDrawingFile(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');

    const data = await zohoGet(`/projects/${projectId}/tasklists/${params.id}/`);
    const tl = data.tasklists?.[0];
    if (!tl) return sendError(res, 404, 'Drawing not found');

    const metaTask = await getDrawingMetaTask(projectId, params.id);
    const meta = metaTask ? safeParseMeta(metaTask.description) : {};

    const fileUrl = meta.fileUrl || '';

    if (fileUrl.startsWith('stratus://')) {
      // Proxy the file bytes directly instead of redirecting.
      // A 302 redirect to Stratus causes cross-origin SVG loading which strips
      // embedded CSS styles/colors when the browser renders SVG via <img>.
      // Serving the bytes from the same function origin preserves all styles.
      const signed = await getStratusSignedUrl(req, fileUrl);
      if (!signed) return sendError(res, 500, 'Could not generate signed URL');

      // Determine content-type from the Stratus key extension
      const keyPart = fileUrl.replace(/^stratus:\/\/[^/]+\//, '');
      const ext = keyPart.split('.').pop()?.toLowerCase();
      const mimeMap = {
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        pdf: 'application/pdf',
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      // Fetch bytes from Stratus signed URL and stream them back
      try {
        const fileBytes = await new Promise((resolve, reject) => {
          const parsedUrl = new URL(signed);
          const lib = parsedUrl.protocol === 'https:' ? https : http;
          lib.get(signed, (upstream) => {
            const chunks = [];
            upstream.on('data', (c) => chunks.push(c));
            upstream.on('end', () => resolve(Buffer.concat(chunks)));
            upstream.on('error', reject);
          }).on('error', reject);
        });
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': fileBytes.length,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(fileBytes);
      } catch (fetchErr) {
        console.error('[handleDrawingFile] proxy fetch failed, falling back to redirect:', fetchErr.message);
        res.writeHead(302, { Location: signed });
        return res.end();
      }
    } else if (fileUrl.startsWith('data:')) {
      const [header, b64] = fileUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const buf = Buffer.from(b64, 'base64');
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=3600',
      });
      return res.end(buf);
    } else if (fileUrl.startsWith('http')) {
      res.writeHead(302, { Location: fileUrl });
      return res.end();
    }

    return sendError(res, 404, 'No drawing file found');
  } catch (e) {
    return sendError(res, 500, 'Failed to get drawing file', e.message);
  }
}

// ─── Drawing Tasks ────────────────────────────────────────────────────────────

async function handleListTasks(req, res, qs) {
  try {
    const { drawingId, projectId, milestoneId } = qs;
    if (!drawingId || !projectId) return sendJSON(res, 200, []);
    const data = await zohoGet(`/projects/${projectId}/tasklists/${drawingId}/tasks/`);
    let tasks = (data.tasks || [])
      .filter((t) => t.name !== DRAWING_META_TASK_NAME)
      .map((t) => normalizeTask(t, drawingId));
    if (milestoneId) tasks = tasks.filter((t) => t.milestoneId === milestoneId);
    return sendJSON(res, 200, tasks);
  } catch (e) {
    return sendError(res, 500, 'Failed to list tasks', e.message);
  }
}

async function handleCreateTask(req, res) {
  try {
    const body = await readBody(req);
    const { projectId, drawingId } = body;
    if (!projectId || !drawingId) return sendError(res, 400, 'projectId and drawingId required');

    const meta = {
      drawingId,
      milestoneId: body.milestoneId || '',
      elementType: body.elementType || 'column',
      elementId: body.elementId || '',
      gridCode: body.gridCode || '',
      notes: body.description || '',
      category: body.category || 'inspection',
      status: body.status || 'pending',
      progress: body.progress ?? 0,
      comments: [],
    };

    const data = await zohoPost(`/projects/${projectId}/tasks/`, {
      name: body.name,
      tasklist_id: drawingId,
      priority: body.priority || 'medium',
      start_date: body.startDate || '',
      due_date: body.dueDate || '',
      description: JSON.stringify(meta),
    });

    const task = data.tasks?.[0] ? normalizeTask(data.tasks[0], drawingId) : null;
    if (!task) return sendError(res, 400, 'Task creation failed', data);
    logActivity(`Task "${task.name}" created`, task.id, drawingId);
    return sendJSON(res, 201, task);
  } catch (e) {
    return sendError(res, 500, 'Failed to create task', e.message);
  }
}

async function handleUpdateTask(req, res, params) {
  try {
    const body = await readBody(req);
    const { projectId, drawingId } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');

    // Fetch current task
    const existing = await zohoGet(`/projects/${projectId}/tasks/${params.id}/`);
    const zt = existing.tasks?.[0];
    if (!zt) return sendError(res, 404, 'Task not found');

    let meta = {};
    try { meta = safeParseMeta(zt.description); } catch {}

    const newMeta = {
      ...meta,
      milestoneId: body.milestoneId ?? meta.milestoneId,
      elementType: body.elementType ?? meta.elementType,
      elementId: body.elementId ?? meta.elementId,
      gridCode: body.gridCode ?? meta.gridCode,
      notes: body.description ?? meta.notes,
      category: body.category ?? meta.category,
      status: body.status ?? meta.status,
      progress: body.progress ?? meta.progress,
    };

    const updatePayload = {
      name: body.name || zt.name,
      priority: body.priority || zt.priority,
      due_date: body.dueDate || zt.due_date || '',
      start_date: body.startDate || zt.start_date || '',
      description: JSON.stringify(newMeta),
    };
    if (body.status === 'completed') updatePayload.status = 'closed';

    await zohoPut(`/projects/${projectId}/tasks/${params.id}/`, updatePayload);

    const updated = normalizeTask({ ...zt, ...updatePayload }, drawingId || meta.drawingId);
    if (body.status === 'completed') {
      logActivity(`Task "${updated.name}" marked complete`, params.id, updated.drawingId);
    }
    return sendJSON(res, 200, updated);
  } catch (e) {
    return sendError(res, 500, 'Failed to update task', e.message);
  }
}

async function handleDeleteTask(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    await zohoDelete(`/projects/${projectId}/tasks/${params.id}/`);
    logActivity(`Task ${params.id} deleted`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete task', e.message);
  }
}

async function handleAddComment(req, res, params) {
  try {
    const body = await readBody(req);
    const projectId = body.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');

    // Zoho Projects comments API
    const data = await zohoPost(`/projects/${projectId}/tasks/${params.id}/comments/`, {
      content: body.content || body.text,
    });

    const c = data.comments?.[0] || { id: uuid(), content: body.content || body.text, added_time: new Date().toISOString() };
    return sendJSON(res, 201, {
      id: String(c.id_string || c.id),
      text: c.content,
      author: body.author || 'User',
      createdAt: c.added_time || new Date().toISOString(),
    });
  } catch (e) {
    return sendError(res, 500, 'Failed to add comment', e.message);
  }
}

async function handlePhotoComment(req, res, params) {
  try {
    const { fields, files } = await parseMultipart(req);
    const projectId = fields.projectId;
    const file = files.photo;
    if (!projectId) return sendError(res, 400, 'projectId required');

    let photoUrl = '';
    if (file) {
      const stratusUrl = await uploadToStratus(req, file.buffer, file.originalname, file.mimetype);
      if (stratusUrl) {
        photoUrl = stratusUrl;
      } else {
        photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }
    }

    const commentText = `[photo:${photoUrl}] ${fields.text || ''}`.trim();
    const data = await zohoPost(`/projects/${projectId}/tasks/${params.id}/comments/`, {
      content: commentText,
    });
    const c = data.comments?.[0] || { id: uuid(), content: commentText, added_time: new Date().toISOString() };
    return sendJSON(res, 201, {
      id: String(c.id_string || c.id),
      text: fields.text || '',
      photoUrl,
      author: fields.author || 'User',
      createdAt: c.added_time || new Date().toISOString(),
    });
  } catch (e) {
    return sendError(res, 500, 'Failed to add photo comment', e.message);
  }
}

// ─── Project Tasks (= Tasks in a dedicated task list per project) ─────────────

async function ensureProjectTasksList(projectId) {
  const data = await zohoGet(`/projects/${projectId}/tasklists/`);
  const all = data.tasklists || [];
  const existing = all.find((tl) => {
    try { return safeParseMeta(tl.description)._type === PROJECT_TASK_TAG; } catch { return false; }
  });
  if (existing) return String(existing.id_string || existing.id);

  // Create dedicated task list
  const created = await zohoPost(`/projects/${projectId}/tasklists/`, {
    name: 'Project Tasks',
    description: JSON.stringify({ _type: PROJECT_TASK_TAG }),
  });
  return String(created.tasklists?.[0]?.id_string || created.tasklists?.[0]?.id || '');
}

async function handleListProjectTasks(req, res, qs) {
  try {
    const { projectId, milestoneId, status, priority, assignee } = qs;
    if (!projectId) return sendJSON(res, 200, []);
    const taskListId = await ensureProjectTasksList(projectId);
    if (!taskListId) return sendJSON(res, 200, []);
    const data = await zohoGet(`/projects/${projectId}/tasklists/${taskListId}/tasks/`);
    let tasks = (data.tasks || []).map(normalizeProjectTask);
    if (milestoneId) tasks = tasks.filter((t) => t.milestoneId === milestoneId);
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);
    if (assignee) tasks = tasks.filter((t) => t.assignee === assignee);
    return sendJSON(res, 200, tasks);
  } catch (e) {
    return sendError(res, 500, 'Failed to list project tasks', e.message);
  }
}

async function handleCreateProjectTask(req, res) {
  try {
    const body = await readBody(req);
    const { projectId } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');
    const taskListId = await ensureProjectTasksList(projectId);

    const meta = {
      projectId,
      milestoneId: body.milestoneId || '',
      notes: body.description || '',
      estimatedHours: body.estimatedHours ?? 0,
      tags: body.tags || [],
      status: body.status || 'open',
      comments: [],
    };

    const data = await zohoPost(`/projects/${projectId}/tasks/`, {
      name: body.name,
      tasklist_id: taskListId,
      priority: body.priority || 'medium',
      due_date: body.dueDate || '',
      description: JSON.stringify(meta),
    });

    const task = data.tasks?.[0] ? normalizeProjectTask(data.tasks[0]) : null;
    if (!task) return sendError(res, 400, 'Project task creation failed', data);
    logActivity(`Project task "${task.name}" created`);
    return sendJSON(res, 201, task);
  } catch (e) {
    return sendError(res, 500, 'Failed to create project task', e.message);
  }
}

async function handleUpdateProjectTask(req, res, params) {
  try {
    const body = await readBody(req);
    const { projectId } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');

    const existing = await zohoGet(`/projects/${projectId}/tasks/${params.id}/`);
    const zt = existing.tasks?.[0];
    if (!zt) return sendError(res, 404, 'Task not found');

    let meta = {};
    try { meta = safeParseMeta(zt.description); } catch {}

    const newMeta = {
      ...meta,
      milestoneId: body.milestoneId ?? meta.milestoneId,
      notes: body.description ?? meta.notes,
      estimatedHours: body.estimatedHours ?? meta.estimatedHours,
      tags: body.tags ?? meta.tags,
      status: body.status ?? meta.status,
    };

    const updatePayload = {
      name: body.name || zt.name,
      priority: body.priority || zt.priority,
      due_date: body.dueDate || zt.due_date || '',
      description: JSON.stringify(newMeta),
    };
    if (body.status === 'completed') updatePayload.status = 'closed';

    await zohoPut(`/projects/${projectId}/tasks/${params.id}/`, updatePayload);
    return sendJSON(res, 200, normalizeProjectTask({ ...zt, ...updatePayload }));
  } catch (e) {
    return sendError(res, 500, 'Failed to update project task', e.message);
  }
}

async function handleDeleteProjectTask(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    await zohoDelete(`/projects/${projectId}/tasks/${params.id}/`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete project task', e.message);
  }
}

async function handleAddProjectTaskComment(req, res, params) {
  try {
    const body = await readBody(req);
    const projectId = body.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    const data = await zohoPost(`/projects/${projectId}/tasks/${params.id}/comments/`, {
      content: body.content || body.text,
    });
    const c = data.comments?.[0] || { id: uuid(), content: body.content, added_time: new Date().toISOString() };
    return sendJSON(res, 201, {
      id: String(c.id_string || c.id),
      text: c.content,
      author: body.author || 'User',
      createdAt: c.added_time || new Date().toISOString(),
    });
  } catch (e) {
    return sendError(res, 500, 'Failed to add comment', e.message);
  }
}

// ─── Activity ─────────────────────────────────────────────────────────────────

async function handleListActivity(req, res, qs) {
  const { drawingId, taskId, limit } = qs;
  let items = _activityLog;
  if (drawingId) items = items.filter((a) => a.drawingId === drawingId);
  if (taskId) items = items.filter((a) => a.taskId === taskId);
  const maxItems = parseInt(limit || '50', 10);
  return sendJSON(res, 200, items.slice(0, maxItems));
}

// ─── Custom Modules (= Task Lists with CUSTOM_MODULE_TAG) ────────────────────

async function handleListCustomModules(req, res, qs) {
  try {
    const projectId = qs.projectId;
    if (!projectId) return sendJSON(res, 200, []);
    const data = await zohoGet(`/projects/${projectId}/tasklists/`);
    const modules = (data.tasklists || [])
      .map(parseModuleMeta)
      .filter((m) => m._isCustomModule);
    return sendJSON(res, 200, modules.map(({ _isCustomModule, ...m }) => m));
  } catch (e) {
    return sendError(res, 500, 'Failed to list custom modules', e.message);
  }
}

async function handleCreateCustomModule(req, res) {
  try {
    const body = await readBody(req);
    const { projectId, name, fields } = body;
    if (!projectId || !name) return sendError(res, 400, 'projectId and name required');

    const meta = { _type: CUSTOM_MODULE_TAG, _isCustomModule: true, fields: fields || [] };
    const data = await zohoPost(`/projects/${projectId}/tasklists/`, {
      name,
      description: JSON.stringify(meta),
    });
    const tl = data.tasklists?.[0];
    if (!tl) return sendError(res, 400, 'Module creation failed', data);
    return sendJSON(res, 201, {
      id: String(tl.id_string || tl.id),
      name: tl.name,
      fields: fields || [],
    });
  } catch (e) {
    return sendError(res, 500, 'Failed to create custom module', e.message);
  }
}

async function handleUpdateCustomModule(req, res, params) {
  try {
    const body = await readBody(req);
    const { projectId, name, fields } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');

    const existing = await zohoGet(`/projects/${projectId}/tasklists/${params.id}/`);
    const tl = existing.tasklists?.[0];
    if (!tl) return sendError(res, 404, 'Module not found');

    let meta = {};
    try { meta = safeParseMeta(tl.description); } catch {}

    const newMeta = { ...meta, _isCustomModule: true, fields: fields ?? meta.fields ?? [] };
    await zohoPut(`/projects/${projectId}/tasklists/${params.id}/`, {
      name: name || tl.name,
      description: JSON.stringify(newMeta),
    });

    return sendJSON(res, 200, {
      id: params.id,
      name: name || tl.name,
      fields: newMeta.fields,
    });
  } catch (e) {
    return sendError(res, 500, 'Failed to update custom module', e.message);
  }
}

async function handleDeleteCustomModule(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    await zohoDelete(`/projects/${projectId}/tasklists/${params.id}/`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete custom module', e.message);
  }
}

async function handleListCustomRecords(req, res, params, qs) {
  try {
    const projectId = qs.projectId;
    if (!projectId) return sendJSON(res, 200, []);
    const data = await zohoGet(`/projects/${projectId}/tasklists/${params.id}/tasks/`);
    const records = (data.tasks || []).map(parseRecordMeta);
    return sendJSON(res, 200, records);
  } catch (e) {
    return sendError(res, 500, 'Failed to list records', e.message);
  }
}

async function handleCreateCustomRecord(req, res, params) {
  try {
    const body = await readBody(req);
    const { projectId, data: recordData } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');

    const meta = { _moduleId: params.id, _data: recordData || {} };
    const name = recordData?.[Object.keys(recordData || {})[0]] || `Record-${Date.now()}`;
    const data = await zohoPost(`/projects/${projectId}/tasks/`, {
      name: String(name).slice(0, 100),
      tasklist_id: params.id,
      description: JSON.stringify(meta),
    });
    const t = data.tasks?.[0];
    if (!t) return sendError(res, 400, 'Record creation failed', data);
    return sendJSON(res, 201, parseRecordMeta(t));
  } catch (e) {
    return sendError(res, 500, 'Failed to create record', e.message);
  }
}

async function handleUpdateCustomRecord(req, res, params) {
  try {
    const body = await readBody(req);
    const { projectId, data: recordData } = body;
    if (!projectId) return sendError(res, 400, 'projectId required');

    const existing = await zohoGet(`/projects/${projectId}/tasks/${params.recordId}/`);
    const zt = existing.tasks?.[0];
    if (!zt) return sendError(res, 404, 'Record not found');

    let meta = {};
    try { meta = safeParseMeta(zt.description); } catch {}

    const newMeta = { ...meta, _data: { ...meta._data, ...(recordData || {}) } };
    const name = newMeta._data[Object.keys(newMeta._data)[0]] || zt.name;
    await zohoPut(`/projects/${projectId}/tasks/${params.recordId}/`, {
      name: String(name).slice(0, 100),
      description: JSON.stringify(newMeta),
    });
    return sendJSON(res, 200, { id: params.recordId, moduleId: params.id, data: newMeta._data });
  } catch (e) {
    return sendError(res, 500, 'Failed to update record', e.message);
  }
}

async function handleDeleteCustomRecord(req, res, params) {
  try {
    const qs = parseQS(req.url);
    const projectId = qs.projectId;
    if (!projectId) return sendError(res, 400, 'projectId required');
    await zohoDelete(`/projects/${projectId}/tasks/${params.recordId}/`);
    return sendJSON(res, 200, { deleted: true });
  } catch (e) {
    return sendError(res, 500, 'Failed to delete record', e.message);
  }
}

async function handleUploadRecordAttachment(req, res, params) {
  try {
    const { fields, files } = await parseMultipart(req);
    const projectId = fields.projectId;
    const file = files.file || files.attachment;
    if (!projectId || !file) return sendError(res, 400, 'projectId and file required');

    let fileUrl = await uploadToStratus(req, file.buffer, file.originalname, file.mimetype);
    if (!fileUrl) {
      fileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    return sendJSON(res, 201, { url: fileUrl, name: file.originalname });
  } catch (e) {
    return sendError(res, 500, 'Failed to upload attachment', e.message);
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function handleSeed(req, res) {
  try {
    // Create a sample project
    const projData = await zohoPost('/projects/', {
      name: 'Prestige Heights – Phase 1',
      description: 'Mixed-use development — residential towers and commercial podium',
    });
    const proj = projData.projects?.[0];
    if (!proj) return sendError(res, 400, 'Could not create seed project', projData);
    const projectId = String(proj.id_string || proj.id);

    // Create milestones
    const milestoneNames = [
      { name: 'Foundation & Basement', dueDate: '09-30-2025' },
      { name: 'Structure – Levels 1-10', dueDate: '12-31-2025' },
      { name: 'Structure – Levels 11-20', dueDate: '03-31-2026' },
      { name: 'Envelope & Glazing', dueDate: '06-30-2026' },
      { name: 'Interiors & MEP', dueDate: '09-30-2026' },
    ];
    const milestones = [];
    for (const m of milestoneNames) {
      const md = await zohoPost(`/projects/${projectId}/milestones/`, {
        name: m.name, end_date: m.dueDate, status: 'open', flag: 'external',
      });
      if (md.milestones?.[0]) milestones.push(md.milestones[0]);
    }

    // Create task lists (drawings)
    const drawingMeta = {
      _type: DRAWING_TAG,
      milestoneId: milestones[0] ? String(milestones[0].id_string || milestones[0].id) : '',
      fileUrl: '',
      gridCols: 6, gridRows: 5,
      columnPositions: {},
      deletedNodes: [], customBeams: [], deletedBeams: [],
      columnLabels: {}, elementTypeLabels: {},
      lat: 12.9716, lng: 77.5946,
    };
    const tlData = await zohoPost(`/projects/${projectId}/tasklists/`, {
      name: 'Tower A – Ground Floor Plan',
      description: JSON.stringify(drawingMeta),
    });
    const tl = tlData.tasklists?.[0];
    const drawingId = tl ? String(tl.id_string || tl.id) : '';

    // Create a few tasks in the drawing
    if (drawingId) {
      const taskDefs = [
        { name: 'Column C1 Inspection', gridCode: 'A1', elementType: 'column', priority: 'high' },
        { name: 'Beam B1-B2 Check', gridCode: 'B1-B2', elementType: 'beam', priority: 'medium' },
        { name: 'Foundation Pit Survey', gridCode: 'A2', elementType: 'column', priority: 'high' },
      ];
      for (const td of taskDefs) {
        const meta = { drawingId, milestoneId: drawingMeta.milestoneId, ...td, notes: '', category: 'inspection', status: 'pending', progress: 0, comments: [] };
        await zohoPost(`/projects/${projectId}/tasks/`, {
          name: td.name,
          tasklist_id: drawingId,
          priority: td.priority,
          description: JSON.stringify(meta),
        });
      }
    }

    logActivity('Seed data created for Prestige Heights – Phase 1');
    return sendJSON(res, 201, {
      projectId,
      message: 'Seed data created successfully',
      milestones: milestones.length,
      drawings: drawingId ? 1 : 0,
    });
  } catch (e) {
    return sendError(res, 500, 'Seed failed', e.message);
  }
}

// ─── Main router ──────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  const method = req.method.toUpperCase();
  const path = parsePath(req.url);
  const qs = parseQS(req.url);

  // CORS pre-flight — production origins are handled by Catalyst API Gateway;
  // only localhost needs a header here (gateway doesn't cover local dev).
  if (method === 'OPTIONS') {
    const headers = {};
    if (isLocalOrigin(req.headers.origin)) {
      headers['Access-Control-Allow-Origin'] = req.headers.origin;
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }
    res.writeHead(204, headers);
    return res.end();
  }

  try {
    // Health
    if (path === '/health' || path === '/') return handleHealth(req, res);

    // Me
    if (path === '/api/me' && method === 'GET') return handleMe(req, res);

    // Projects
    if (path === '/api/projects' && method === 'GET') return handleListProjects(req, res);
    if (path === '/api/projects' && method === 'POST') return handleCreateProject(req, res);
    let m;
    if ((m = matchRoute('GET', '/api/projects/:id', method, path))) return handleGetProject(req, res, m);
    if ((m = matchRoute('PUT', '/api/projects/:id', method, path))) return handleUpdateProject(req, res, m);
    if ((m = matchRoute('PATCH', '/api/projects/:id/archive', method, path))) return handleArchiveProject(req, res, m);
    if ((m = matchRoute('DELETE', '/api/projects/:id', method, path))) return handleDeleteProject(req, res, m);

    // Milestones
    if (path === '/api/milestones' && method === 'GET') return handleListMilestones(req, res, qs);
    if (path === '/api/milestones' && method === 'POST') return handleCreateMilestone(req, res);
    if ((m = matchRoute('PUT', '/api/milestones/:id', method, path))) return handleUpdateMilestone(req, res, m);
    if ((m = matchRoute('DELETE', '/api/milestones/:id', method, path))) return handleDeleteMilestone(req, res, m);

    // Drawings
    if (path === '/api/drawings' && method === 'GET') return handleListDrawings(req, res, qs);
    if (path === '/api/drawings' && method === 'POST') return handleUploadDrawing(req, res);
    if (path === '/api/drawings/reorder' && method === 'POST') return handleReorderDrawings(req, res);
    if ((m = matchRoute('GET', '/api/drawings/:id', method, path))) return handleGetDrawing(req, res, m, qs);
    if ((m = matchRoute('GET', '/api/drawings/:id/file', method, path))) return handleDrawingFile(req, res, m);
    if ((m = matchRoute('PUT', '/api/drawings/:id', method, path))) return handleUpdateDrawing(req, res, m);
    if ((m = matchRoute('DELETE', '/api/drawings/:id', method, path))) return handleDeleteDrawing(req, res, m);

    // Tasks
    if (path === '/api/tasks' && method === 'GET') return handleListTasks(req, res, qs);
    if (path === '/api/tasks' && method === 'POST') return handleCreateTask(req, res);
    if ((m = matchRoute('PUT', '/api/tasks/:id', method, path))) return handleUpdateTask(req, res, m);
    if ((m = matchRoute('DELETE', '/api/tasks/:id', method, path))) return handleDeleteTask(req, res, m);
    if ((m = matchRoute('POST', '/api/tasks/:id/comments', method, path))) return handleAddComment(req, res, m);
    if ((m = matchRoute('POST', '/api/tasks/:id/photo-comments', method, path))) return handlePhotoComment(req, res, m);

    // Project Tasks
    if (path === '/api/project-tasks' && method === 'GET') return handleListProjectTasks(req, res, qs);
    if (path === '/api/project-tasks' && method === 'POST') return handleCreateProjectTask(req, res);
    if ((m = matchRoute('PUT', '/api/project-tasks/:id', method, path))) return handleUpdateProjectTask(req, res, m);
    if ((m = matchRoute('DELETE', '/api/project-tasks/:id', method, path))) return handleDeleteProjectTask(req, res, m);
    if ((m = matchRoute('POST', '/api/project-tasks/:id/comments', method, path))) return handleAddProjectTaskComment(req, res, m);

    // Activity
    if (path === '/api/activity' && method === 'GET') return handleListActivity(req, res, qs);

    // Custom Modules
    if (path === '/api/custom-modules' && method === 'GET') return handleListCustomModules(req, res, qs);
    if (path === '/api/custom-modules' && method === 'POST') return handleCreateCustomModule(req, res);
    if ((m = matchRoute('PUT', '/api/custom-modules/:id', method, path))) return handleUpdateCustomModule(req, res, m);
    if ((m = matchRoute('DELETE', '/api/custom-modules/:id', method, path))) return handleDeleteCustomModule(req, res, m);
    if ((m = matchRoute('GET', '/api/custom-modules/:id/records', method, path))) return handleListCustomRecords(req, res, m, qs);
    if ((m = matchRoute('POST', '/api/custom-modules/:id/records', method, path))) return handleCreateCustomRecord(req, res, m);
    if ((m = matchRoute('PUT', '/api/custom-modules/:moduleId/records/:recordId', method, path))) return handleUpdateCustomRecord(req, res, m);
    if ((m = matchRoute('DELETE', '/api/custom-modules/:moduleId/records/:recordId', method, path))) return handleDeleteCustomRecord(req, res, m);
    if ((m = matchRoute('POST', '/api/custom-modules/:moduleId/records/:recordId/attachments', method, path))) return handleUploadRecordAttachment(req, res, m);

    // Seed
    if (path === '/api/seed' && method === 'POST') return handleSeed(req, res);

    return sendError(res, 404, 'Not found', path);
  } catch (e) {
    console.error('[construction-api] Unhandled error:', e);
    return sendError(res, 500, 'Internal server error', e.message);
  }
};
