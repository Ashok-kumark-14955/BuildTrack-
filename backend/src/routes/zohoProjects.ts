/**
 * zohoProjects.ts
 * ---------------
 * Express router that proxies Zoho Projects REST API (India DC).
 *
 * Zoho Projects is the PRIMARY data backbone for BuildTrack:
 *   - Projects    → GET/POST/PUT /api/zoho-projects/projects
 *   - Milestones  → GET/POST/PUT/DELETE /api/zoho-projects/projects/:zpId/milestones
 *   - Tasks       → GET/POST/PUT/DELETE /api/zoho-projects/projects/:zpId/tasks
 *
 * Custom Modules (task lists) remain as before:
 *   - Task Lists  → /api/zoho-projects/portals/:portalId/projects/:projectId/tasklists
 *
 * Default portal env var: ZOHO_PORTAL_ID
 * Demo seeding: POST /api/zoho-projects/seed
 *
 * Env vars required: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 * Optional defaults: ZOHO_PORTAL_ID, ZOHO_PROJECT_ID
 */

import { Router, Request, Response, NextFunction } from 'express';
import https from 'https';
import { getAccessToken, exchangeCodeForTokens } from '../zohoAuth';
import * as db from '../db';

const router = Router();

export const ZOHO_API_BASE = 'https://projectsapi.zoho.in/restapi';

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
// Exported so other Zoho-Projects-backed routes (e.g. customModules.ts) reuse
// the same proven request/auth pattern instead of duplicating an HTTP client.

/**
 * Zoho's REST API returns errors (rate limits, validation failures, etc.) as
 * HTTP 200 with the real failure embedded in the JSON body, e.g.
 * { "error": { "status_code": 400, "title": "URL_ROLLING_THROTTLES_LIMIT_EXCEEDED", ... } }.
 * Without this check, callers that do `data.tasks || []` silently read an
 * error payload as "zero tasks" instead of failing loudly.
 */
function parseZohoResponse(data: string, statusCode: number | undefined): any {
  if (!data.trim()) return { statusCode };
  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error(`Non-JSON (${statusCode}): ${data.slice(0, 200)}`);
  }
  if (parsed && parsed.error) {
    const err = parsed.error;
    throw new Error(`Zoho API error (${err.status_code ?? statusCode}) ${err.title ?? ''}: ${err.details?.message || 'request failed'}`);
  }
  return parsed;
}

export function zohoGet(token: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(ZOHO_API_BASE + path);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(parseZohoResponse(data, res.statusCode)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export function zohoPostForm(token: string, path: string, body: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const url = new URL(ZOHO_API_BASE + path);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(parseZohoResponse(data, res.statusCode)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export function zohoPutForm(token: string, path: string, body: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const url = new URL(ZOHO_API_BASE + path);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(parseZohoResponse(data, res.statusCode)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export function zohoDelete(token: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(ZOHO_API_BASE + path);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'DELETE',
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (!data.trim()) return resolve({ statusCode: res.statusCode, ok: true });
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            return resolve({ statusCode: res.statusCode, ok: true });
          }
          if (parsed && parsed.error) {
            const err = parsed.error;
            return reject(new Error(`Zoho API error (${err.status_code ?? res.statusCode}) ${err.title ?? ''}: ${err.details?.message || 'request failed'}`));
          }
          resolve(parsed);
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// ─── Async handler wrapper ─────────────────────────────────────────────────────

const handle = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// ─── Helper: get default portal ID ────────────────────────────────────────────

export function getPortalId(): string {
  const pid = process.env.ZOHO_PORTAL_ID;
  if (!pid) throw new Error('ZOHO_PORTAL_ID env var is required');
  return pid;
}

// ─── Token exchange ────────────────────────────────────────────────────────────

router.post('/exchange', handle(async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return void res.status(400).json({ error: 'code is required' });
  const tokens = await exchangeCodeForTokens(code);
  res.json(tokens);
}));

// ─── Portals ───────────────────────────────────────────────────────────────────

router.get('/portals', handle(async (_req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(token, '/portals/');
  res.json(data);
}));

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY BACKBONE — Projects, Milestones, Tasks via default portal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a Zoho Project object to the BuildTrack Project shape.
 * Zoho Projects field reference:
 *   id_string, name, description, status, start_date, end_date,
 *   owner_name, percent_complete, task_count { open, closed }
 */
function normalizeProject(zp: any) {
  const taskOpen = Number(zp.task_count?.open ?? 0);
  const taskClosed = Number(zp.task_count?.closed ?? 0);
  const taskCount = taskOpen + taskClosed;
  const progress = taskCount > 0 ? Math.round((taskClosed / taskCount) * 100) : Number(zp.percent_complete ?? 0);

  // Map Zoho status to BuildTrack status
  const statusMap: Record<string, string> = {
    active: 'Active',
    completed: 'Completed',
    archived: 'On Hold',
    template: 'Planning',
  };

  return {
    id: zp.id_string,
    zpId: zp.id_string,          // keep raw Zoho id for further API calls
    name: zp.name || 'Unnamed',
    code: (zp.name || '').slice(0, 6).toUpperCase().replace(/\s/g, ''),
    description: zp.description || '',
    startDate: zp.start_date || '',
    endDate: zp.end_date || '',
    status: statusMap[(zp.status || '').toLowerCase()] || 'Active',
    managerName: zp.owner_name || '',
    archived: (zp.status || '').toLowerCase() === 'archived',
    createdAt: zp.created_date || new Date().toISOString(),
    updatedAt: zp.last_modified_time || new Date().toISOString(),
    stats: {
      taskCount,
      doneCount: taskClosed,
      progress,
      members: Number(zp.member_count ?? 0),
    },
    _source: 'zoho',
  };
}

/**
 * Normalize a Zoho Milestone object to BuildTrack Milestone shape.
 */
function normalizeMilestone(zm: any) {
  const statusMap: Record<string, string> = {
    open: 'Active',
    closed: 'Completed',
  };
  return {
    id: zm.id_string,
    zpId: zm.id_string,
    projectId: zm.project_id || '',
    name: zm.name || '',
    description: zm.description || '',
    dueDate: zm.end_date || '',
    status: statusMap[(zm.flag || '').toLowerCase()] || 'Active',
    createdAt: zm.created_date || new Date().toISOString(),
    updatedAt: zm.last_modified_time || new Date().toISOString(),
    _source: 'zoho',
  };
}

/**
 * Normalize a Zoho Task to BuildTrack Task shape.
 */
function normalizeTask(zt: any) {
  const statusMap: Record<string, string> = {
    'not started': 'Assigned',
    'in progress': 'In Progress',
    completed: 'Completed',
    closed: 'Completed',
    deferred: 'Blocked',
    waiting: 'Blocked',
  };
  const priorityMap: Record<string, string> = {
    none: 'Low',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };
  const rawStatus = (zt.status?.name || zt.status || 'not started').toLowerCase();
  const rawPriority = (zt.priority || 'none').toLowerCase();

  return {
    id: zt.id_string,
    zpId: zt.id_string,
    drawingId: '',                                  // drawing tasks are separate
    milestoneId: zt.milestone?.id_string || null,
    elementType: 'task',
    elementId: zt.id_string,
    gridCode: '',
    name: zt.name || '',
    description: zt.description || '',
    category: zt.tasklist?.name || 'General',
    priority: priorityMap[rawPriority] || 'Medium',
    assignedTo: (zt.details?.owners || []).map((o: any) => o.name).join(', ') || '',
    startDate: zt.start_date || '',
    dueDate: zt.end_date || '',
    status: statusMap[rawStatus] || 'Assigned',
    progress: Number(zt.percent_complete ?? 0),
    createdAt: zt.created_date || new Date().toISOString(),
    updatedAt: zt.last_modified_time || new Date().toISOString(),
    _source: 'zoho',
  };
}

// ─── Helper: serialize a SQLite project row ────────────────────────────────────

function serializeSqliteProject(r: any) {
  return {
    ...r,
    archived: r.archived === true || r.archived === 'true' || r.archived === 1 || r.archived === '1',
  };
}

// ─── GET all projects in the portal ───────────────────────────────────────────

router.get('/projects', handle(async (req, res) => {
  // If ZOHO_PORTAL_ID is not configured, fall back to the local SQLite projects table.
  // This allows the dev server to work without Zoho credentials.
  const portalId = process.env.ZOHO_PORTAL_ID;
  if (!portalId) {
    const rows: any[] = await db.all(req, 'SELECT * FROM projects ORDER BY createdAt DESC', []);
    return void res.json(rows.map(serializeSqliteProject));
  }
  const token = await getAccessToken();
  const data = await zohoGet(token, `/portal/${portalId}/projects/`);
  const projects = (data.projects || []).map(normalizeProject);
  res.json(projects);
}));

// ─── GET a single project ─────────────────────────────────────────────────────

router.get('/projects/:zpId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  // Zoho does not have a single-project endpoint in REST v3 — list and filter
  const data = await zohoGet(token, `/portal/${portalId}/projects/`);
  const raw = (data.projects || []).find((p: any) => String(p.id_string) === req.params.zpId);
  if (!raw) return void res.status(404).json({ error: 'Project not found' });
  res.json(normalizeProject(raw));
}));

// ─── POST create a project ────────────────────────────────────────────────────

router.post('/projects', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const { name, description, startDate, endDate, managerName } = req.body as Record<string, string>;
  if (!name?.trim()) return void res.status(400).json({ error: 'name is required' });

  const formBody: Record<string, string> = { name: name.trim() };
  if (description) formBody.description = description;
  if (startDate) formBody.start_date = startDate;
  if (endDate) formBody.end_date = endDate;
  if (managerName) formBody.owner = managerName;

  const data = await zohoPostForm(token, `/portal/${portalId}/projects/`, formBody);
  const created = (data.projects || [])[0];
  if (!created) return void res.status(500).json({ error: 'Zoho did not return the created project', raw: data });
  res.status(201).json(normalizeProject(created));
}));

// ─── PUT update a project ─────────────────────────────────────────────────────

router.put('/projects/:zpId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const { name, description, startDate, endDate, status } = req.body as Record<string, string>;

  const formBody: Record<string, string> = {};
  if (name) formBody.name = name;
  if (description) formBody.description = description;
  if (startDate) formBody.start_date = startDate;
  if (endDate) formBody.end_date = endDate;
  if (status) {
    // Map BuildTrack status back to Zoho status
    const zpStatusMap: Record<string, string> = {
      Active: 'active',
      Completed: 'completed',
      'On Hold': 'archived',
      Planning: 'active',
    };
    formBody.status = zpStatusMap[status] || 'active';
  }

  const data = await zohoPutForm(token, `/portal/${portalId}/projects/${req.params.zpId}/`, formBody);
  const updated = (data.projects || [])[0];
  if (!updated) return void res.status(500).json({ error: 'Zoho did not return the updated project', raw: data });
  res.json(normalizeProject(updated));
}));

// ─── DELETE a project ─────────────────────────────────────────────────────────

router.delete('/projects/:zpId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const data = await zohoDelete(token, `/portal/${portalId}/projects/${req.params.zpId}/`);
  res.json(data);
}));

// ─── GET milestones for a project ────────────────────────────────────────────

router.get('/projects/:zpId/milestones', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const data = await zohoGet(token, `/portal/${portalId}/projects/${req.params.zpId}/milestones/`);
  const milestones = (data.milestones || []).map((m: any) => normalizeMilestone({ ...m, project_id: req.params.zpId }));
  res.json(milestones);
}));

// ─── POST create milestone ────────────────────────────────────────────────────

router.post('/projects/:zpId/milestones', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const { name, dueDate, description } = req.body as Record<string, string>;
  if (!name?.trim()) return void res.status(400).json({ error: 'name is required' });

  const formBody: Record<string, string> = {
    name: name.trim(),
    flag: 'internal',
  };
  if (dueDate) formBody.end_date = dueDate;
  if (description) formBody.description = description;

  const data = await zohoPostForm(token, `/portal/${portalId}/projects/${req.params.zpId}/milestones/`, formBody);
  const created = (data.milestones || [])[0];
  if (!created) return void res.status(500).json({ error: 'Zoho did not return the created milestone', raw: data });
  res.status(201).json(normalizeMilestone({ ...created, project_id: req.params.zpId }));
}));

// ─── PUT update milestone ─────────────────────────────────────────────────────

router.put('/projects/:zpId/milestones/:milestoneId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const { name, dueDate, status } = req.body as Record<string, string>;
  const formBody: Record<string, string> = {};
  if (name) formBody.name = name;
  if (dueDate) formBody.end_date = dueDate;
  if (status) formBody.flag = status === 'Completed' ? 'closed' : 'open';

  const data = await zohoPutForm(
    token,
    `/portal/${portalId}/projects/${req.params.zpId}/milestones/${req.params.milestoneId}/`,
    formBody
  );
  const updated = (data.milestones || [])[0];
  if (!updated) return void res.status(500).json({ error: 'Zoho did not return updated milestone', raw: data });
  res.json(normalizeMilestone({ ...updated, project_id: req.params.zpId }));
}));

// ─── DELETE milestone ─────────────────────────────────────────────────────────

router.delete('/projects/:zpId/milestones/:milestoneId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const data = await zohoDelete(
    token,
    `/portal/${portalId}/projects/${req.params.zpId}/milestones/${req.params.milestoneId}/`
  );
  res.json(data);
}));

// ─── GET tasks for a project ──────────────────────────────────────────────────

router.get('/projects/:zpId/tasks', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  // Zoho returns paginated tasks — fetch all pages
  let index = 1;
  const allTasks: any[] = [];
  while (true) {
    const data = await zohoGet(
      token,
      `/portal/${portalId}/projects/${req.params.zpId}/tasks/?range=${index},100`
    );
    const batch = data.tasks || [];
    allTasks.push(...batch);
    if (batch.length < 100) break;
    index += 100;
  }
  res.json(allTasks.map(normalizeTask));
}));

// ─── POST create task ─────────────────────────────────────────────────────────

router.post('/projects/:zpId/tasks', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const { name, description, dueDate, priority, status, tasklistId } = req.body as Record<string, string>;
  if (!name?.trim()) return void res.status(400).json({ error: 'name is required' });

  const formBody: Record<string, string> = { name: name.trim() };
  if (description) formBody.description = description;
  if (dueDate) formBody.end_date = dueDate;
  if (priority) formBody.priority = priority.toLowerCase();
  if (status) formBody.status = status;
  if (tasklistId) formBody.tasklist_id = tasklistId;

  const data = await zohoPostForm(
    token,
    `/portal/${portalId}/projects/${req.params.zpId}/tasks/`,
    formBody
  );
  const created = (data.tasks || [])[0];
  if (!created) return void res.status(500).json({ error: 'Zoho did not return the created task', raw: data });
  res.status(201).json(normalizeTask(created));
}));

// ─── PUT update task ──────────────────────────────────────────────────────────

router.put('/projects/:zpId/tasks/:taskId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const { name, description, dueDate, priority, status, progress } = req.body as Record<string, string>;

  const formBody: Record<string, string> = {};
  if (name) formBody.name = name;
  if (description) formBody.description = description;
  if (dueDate) formBody.end_date = dueDate;
  if (priority) formBody.priority = priority.toLowerCase();
  if (status) {
    // Map BuildTrack status back to Zoho
    const zStatusMap: Record<string, string> = {
      Assigned: 'Open',
      'In Progress': 'In Progress',
      Completed: 'Completed',
      Blocked: 'Deferred',
      Delayed: 'Deferred',
    };
    formBody.status = zStatusMap[status] || status;
  }
  if (progress) formBody.percent_complete = progress;

  const data = await zohoPutForm(
    token,
    `/portal/${portalId}/projects/${req.params.zpId}/tasks/${req.params.taskId}/`,
    formBody
  );
  const updated = (data.tasks || [])[0];
  if (!updated) return void res.status(500).json({ error: 'Zoho did not return the updated task', raw: data });
  res.json(normalizeTask(updated));
}));

// ─── DELETE task ──────────────────────────────────────────────────────────────

router.delete('/projects/:zpId/tasks/:taskId', handle(async (req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const data = await zohoDelete(
    token,
    `/portal/${portalId}/projects/${req.params.zpId}/tasks/${req.params.taskId}/`
  );
  res.json(data);
}));

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO SEED — Create a realistic construction project with tasks & milestones
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/seed', handle(async (_req, res) => {
  const token = await getAccessToken();
  const portalId = getPortalId();
  const log: string[] = [];

  function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // 1. Create the project
  log.push('Creating project: Prestige Heights – Phase 1');
  const projData = await zohoPostForm(token, `/portal/${portalId}/projects/`, {
    name: 'Prestige Heights – Phase 1',
    description: 'A 12-storey residential tower in Whitefield. Ground floor to roof slab with MEP, facade & interiors.',
    start_date: '09-14-2025',
    end_date: '03-31-2027',
  });
  const project = (projData.projects || [])[0];
  if (!project) return void res.status(500).json({ error: 'Failed to create project', raw: projData });
  const zpId = project.id_string;
  log.push(`Project created: ${zpId}`);

  // 2. Create milestones
  const milestonePayloads = [
    { name: 'Foundation Complete', end_date: '12-15-2025', flag: 'internal' },
    { name: 'Structure Topping Out', end_date: '06-30-2026', flag: 'internal' },
    { name: 'MEP Rough-in Done', end_date: '09-30-2026', flag: 'internal' },
    { name: 'Facade & Finishing', end_date: '01-15-2027', flag: 'internal' },
    { name: 'Handover Ready', end_date: '03-31-2027', flag: 'internal' },
  ];

  const milestoneIds: Record<string, string> = {};
  for (const mp of milestonePayloads) {
    await delay(300);
    const mData = await zohoPostForm(token, `/portal/${portalId}/projects/${zpId}/milestones/`, mp);
    const m = (mData.milestones || [])[0];
    if (m) {
      milestoneIds[mp.name] = m.id_string;
      log.push(`Milestone: ${mp.name} → ${m.id_string}`);
    }
  }

  // 3. Create task lists (construction phases)
  const tasklistPayloads = [
    { name: 'Civil & Structural', flag: 'internal' },
    { name: 'Electrical', flag: 'internal' },
    { name: 'Plumbing & HVAC', flag: 'internal' },
    { name: 'Finishing & Interiors', flag: 'internal' },
    { name: 'QA & Inspections', flag: 'internal' },
  ];

  const tasklistIds: Record<string, string> = {};
  for (const tlp of tasklistPayloads) {
    await delay(300);
    const tlData = await zohoPostForm(token, `/portal/${portalId}/projects/${zpId}/tasklists/`, tlp);
    const tl = (tlData.tasklists || [])[0];
    if (tl) {
      tasklistIds[tlp.name] = tl.id_string;
      log.push(`Tasklist: ${tlp.name} → ${tl.id_string}`);
    }
  }

  // 4. Create realistic tasks
  const tasks = [
    // Civil & Structural
    { name: 'Site Clearing & Levelling', list: 'Civil & Structural', priority: 'high', status: 'Completed', pct: '100', start: '09-14-2025', end: '09-28-2025' },
    { name: 'Pile Foundation Drilling – Block A', list: 'Civil & Structural', priority: 'high', status: 'Completed', pct: '100', start: '10-01-2025', end: '11-15-2025' },
    { name: 'Pile Cap Reinforcement & Concreting', list: 'Civil & Structural', priority: 'high', status: 'Completed', pct: '100', start: '11-15-2025', end: '12-15-2025' },
    { name: 'Ground Beam Construction', list: 'Civil & Structural', priority: 'high', status: 'Completed', pct: '100', start: '12-01-2025', end: '01-10-2026' },
    { name: 'Column Erection – G to 3F', list: 'Civil & Structural', priority: 'high', status: 'In Progress', pct: '75', start: '01-10-2026', end: '03-30-2026' },
    { name: 'Slab Shuttering & Concreting – Floors 1–3', list: 'Civil & Structural', priority: 'high', status: 'In Progress', pct: '60', start: '02-01-2026', end: '04-30-2026' },
    { name: 'Column Erection – 4F to 7F', list: 'Civil & Structural', priority: 'medium', status: 'Open', pct: '0', start: '04-01-2026', end: '06-15-2026' },
    { name: 'Staircase Construction – All Floors', list: 'Civil & Structural', priority: 'medium', status: 'Open', pct: '0', start: '03-15-2026', end: '07-30-2026' },
    { name: 'Roof Slab & Parapet Wall', list: 'Civil & Structural', priority: 'high', status: 'Open', pct: '0', start: '06-01-2026', end: '07-15-2026' },
    // Electrical
    { name: 'Main LT Panel Installation', list: 'Electrical', priority: 'high', status: 'In Progress', pct: '40', start: '01-20-2026', end: '03-15-2026' },
    { name: 'Conduit Laying – Floors 1–6', list: 'Electrical', priority: 'medium', status: 'Open', pct: '0', start: '03-01-2026', end: '06-30-2026' },
    { name: 'DB Board Fixing – All Floors', list: 'Electrical', priority: 'medium', status: 'Open', pct: '0', start: '05-01-2026', end: '08-30-2026' },
    { name: 'Wiring & Termination', list: 'Electrical', priority: 'medium', status: 'Open', pct: '0', start: '07-01-2026', end: '10-15-2026' },
    { name: 'Lift Motor Room Electrical', list: 'Electrical', priority: 'high', status: 'Open', pct: '0', start: '08-01-2026', end: '09-30-2026' },
    // Plumbing & HVAC
    { name: 'Underground Drainage & Sump Pit', list: 'Plumbing & HVAC', priority: 'high', status: 'Completed', pct: '100', start: '10-15-2025', end: '12-01-2025' },
    { name: 'Water Supply Line – Riser Pipe', list: 'Plumbing & HVAC', priority: 'medium', status: 'In Progress', pct: '50', start: '02-01-2026', end: '05-30-2026' },
    { name: 'Sanitary Line – Each Floor', list: 'Plumbing & HVAC', priority: 'medium', status: 'Open', pct: '0', start: '04-01-2026', end: '08-15-2026' },
    { name: 'HVAC Duct Installation – Common Areas', list: 'Plumbing & HVAC', priority: 'low', status: 'Open', pct: '0', start: '07-01-2026', end: '10-30-2026' },
    // Finishing
    { name: 'External Plastering', list: 'Finishing & Interiors', priority: 'medium', status: 'Open', pct: '0', start: '07-15-2026', end: '10-30-2026' },
    { name: 'Internal Wall Plastering – All Flats', list: 'Finishing & Interiors', priority: 'medium', status: 'Open', pct: '0', start: '08-01-2026', end: '11-30-2026' },
    { name: 'Floor Tiling – Common Corridors', list: 'Finishing & Interiors', priority: 'medium', status: 'Open', pct: '0', start: '10-01-2026', end: '01-15-2027' },
    { name: 'Painting – External & Internal', list: 'Finishing & Interiors', priority: 'low', status: 'Open', pct: '0', start: '11-01-2026', end: '02-15-2027' },
    { name: 'Facade Cladding & Glazing', list: 'Finishing & Interiors', priority: 'high', status: 'Open', pct: '0', start: '09-01-2026', end: '01-15-2027' },
    // QA
    { name: 'Structural Audit – Foundation Stage', list: 'QA & Inspections', priority: 'high', status: 'Completed', pct: '100', start: '12-10-2025', end: '12-20-2025' },
    { name: 'Concrete Core Test Reports', list: 'QA & Inspections', priority: 'high', status: 'In Progress', pct: '70', start: '01-15-2026', end: '04-30-2026' },
    { name: 'Electrical Safety Audit', list: 'QA & Inspections', priority: 'medium', status: 'Open', pct: '0', start: '10-15-2026', end: '11-15-2026' },
    { name: 'Fire NOC & Plumbing Certification', list: 'QA & Inspections', priority: 'high', status: 'Open', pct: '0', start: '01-01-2027', end: '02-28-2027' },
    { name: 'Pre-Handover Inspection & Snag List', list: 'QA & Inspections', priority: 'high', status: 'Open', pct: '0', start: '03-01-2027', end: '03-25-2027' },
  ];

  for (const t of tasks) {
    await delay(200);
    const tlId = tasklistIds[t.list];
    if (!tlId) continue;
    const formBody: Record<string, string> = {
      name: t.name,
      tasklist_id: tlId,
      priority: t.priority,
      percent_complete: t.pct,
    };
    if (t.start) formBody.start_date = t.start;
    if (t.end) formBody.end_date = t.end;
    if (t.status !== 'Open') formBody.status = t.status;

    await zohoPostForm(token, `/portal/${portalId}/projects/${zpId}/tasks/`, formBody);
    log.push(`Task: ${t.name}`);
  }

  log.push('Seed complete!');
  res.json({
    ok: true,
    projectId: zpId,
    projectName: 'Prestige Heights – Phase 1',
    log,
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// ORIGINAL ROUTES — Task Lists & Tasks via explicit portalId/projectId params
// (kept for Custom Modules page backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/portals/:portalId/projects', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(token, `/portal/${req.params.portalId}/projects/`);
  res.json(data);
}));

router.get('/portals/:portalId/projects/:projectId/tasklists', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasklists/`
  );
  res.json(data);
}));

router.post('/portals/:portalId/projects/:projectId/tasklists', handle(async (req, res) => {
  const token = await getAccessToken();
  const { name, flag } = req.body as { name?: string; flag?: string };
  if (!name?.trim()) return void res.status(400).json({ error: 'name is required' });
  const data = await zohoPostForm(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasklists/`,
    { name: name.trim(), flag: flag || 'internal' }
  );
  res.status(201).json(data);
}));

router.delete('/portals/:portalId/projects/:projectId/tasklists/:tasklistId', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoDelete(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasklists/${req.params.tasklistId}/`
  );
  res.json(data);
}));

router.get('/portals/:portalId/projects/:projectId/tasklists/:tasklistId/tasks', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasks/?tasklist_id=${req.params.tasklistId}`
  );
  res.json(data);
}));

router.post('/portals/:portalId/projects/:projectId/tasklists/:tasklistId/tasks', handle(async (req, res) => {
  const token = await getAccessToken();
  const { name, description, due_date } = req.body as { name?: string; description?: string; due_date?: string };
  if (!name?.trim()) return void res.status(400).json({ error: 'name is required' });

  const formBody: Record<string, string> = {
    name: name.trim(),
    tasklist_id: String(req.params.tasklistId),
  };
  if (description) formBody.description = String(description);
  if (due_date) formBody.due_date = String(due_date);

  const data = await zohoPostForm(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasks/`,
    formBody
  );
  res.status(201).json(data);
}));

router.put('/portals/:portalId/projects/:projectId/tasks/:taskId', handle(async (req, res) => {
  const token = await getAccessToken();
  const { name, description, due_date, status } = req.body as Record<string, string>;
  const formBody: Record<string, string> = {};
  if (name) formBody.name = name;
  if (description) formBody.description = description;
  if (due_date) formBody.due_date = due_date;
  if (status) formBody.status = status;
  const data = await zohoPutForm(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasks/${req.params.taskId}/`,
    formBody
  );
  res.json(data);
}));

router.delete('/portals/:portalId/projects/:projectId/tasks/:taskId', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoDelete(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasks/${req.params.taskId}/`
  );
  res.json(data);
}));

router.get('/default/tasklists', handle(async (_req, res) => {
  const token = await getAccessToken();
  const portalId = process.env.ZOHO_PORTAL_ID;
  const projectId = process.env.ZOHO_PROJECT_ID;
  if (!portalId || !projectId) {
    return void res.status(400).json({ error: 'ZOHO_PORTAL_ID and ZOHO_PROJECT_ID env vars required' });
  }
  const data = await zohoGet(token, `/portal/${portalId}/projects/${projectId}/tasklists/`);
  res.json(data);
}));

export default router;
