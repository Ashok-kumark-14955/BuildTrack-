/**
 * zohoProjects.ts
 * ---------------
 * Express router that proxies Zoho Projects REST API (India DC).
 *
 * Custom Modules are implemented via Zoho Projects Task Lists + Tasks:
 *
 *   GET  /api/zoho-projects/portals
 *   GET  /api/zoho-projects/portals/:portalId/projects
 *
 *   GET  /api/zoho-projects/portals/:portalId/projects/:projectId/tasklists
 *        → List all task lists (custom module sections)
 *   POST /api/zoho-projects/portals/:portalId/projects/:projectId/tasklists
 *        → Create a task list (custom module section)  body: { name }
 *   DELETE /api/zoho-projects/portals/:portalId/projects/:projectId/tasklists/:tasklistId
 *        → Delete a task list
 *
 *   GET  /api/zoho-projects/portals/:portalId/projects/:projectId/tasklists/:tasklistId/tasks
 *        → List tasks in a task list (records in a module)
 *   POST /api/zoho-projects/portals/:portalId/projects/:projectId/tasklists/:tasklistId/tasks
 *        → Create a task (record) in a task list   body: { name, description?, due_date? }
 *   PUT  /api/zoho-projects/portals/:portalId/projects/:projectId/tasks/:taskId
 *        → Update a task
 *   DELETE /api/zoho-projects/portals/:portalId/projects/:projectId/tasks/:taskId
 *        → Delete a task
 *
 *   POST /api/zoho-projects/exchange
 *        → Exchange auth code for tokens (one-time setup)  body: { code }
 *
 * Env vars required: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 * Portal/Project IDs: ZOHO_PORTAL_ID, ZOHO_PROJECT_ID (optional defaults)
 */

import { Router, Request, Response, NextFunction } from 'express';
import https from 'https';
import { getAccessToken, exchangeCodeForTokens } from '../zohoAuth';

const router = Router();

const ZOHO_API_BASE = 'https://projectsapi.zoho.in/restapi';

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

function zohoGet(token: string, path: string): Promise<any> {
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
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Non-JSON (${res.statusCode}): ${data.slice(0, 200)}`)); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function zohoPostForm(token: string, path: string, body: Record<string, string>): Promise<any> {
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
          if (!data.trim()) return resolve({ statusCode: res.statusCode });
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Non-JSON (${res.statusCode}): ${data.slice(0, 200)}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function zohoPutForm(token: string, path: string, body: Record<string, string>): Promise<any> {
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
          if (!data.trim()) return resolve({ statusCode: res.statusCode });
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Non-JSON (${res.statusCode}): ${data.slice(0, 200)}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function zohoDelete(token: string, path: string): Promise<any> {
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
          try { resolve(JSON.parse(data)); }
          catch { resolve({ statusCode: res.statusCode, ok: true }); }
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

// ─── Projects ──────────────────────────────────────────────────────────────────

router.get('/portals/:portalId/projects', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(token, `/portal/${req.params.portalId}/projects/`);
  res.json(data);
}));

// ─── Task Lists (Custom Module Sections) ──────────────────────────────────────

// GET all task lists
router.get('/portals/:portalId/projects/:projectId/tasklists', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasklists/`
  );
  res.json(data);
}));

// POST create a task list
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

// DELETE a task list
router.delete('/portals/:portalId/projects/:projectId/tasklists/:tasklistId', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoDelete(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasklists/${req.params.tasklistId}/`
  );
  res.json(data);
}));

// ─── Tasks (Custom Module Records) ────────────────────────────────────────────

// GET tasks in a task list
router.get('/portals/:portalId/projects/:projectId/tasklists/:tasklistId/tasks', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoGet(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasks/?tasklist_id=${req.params.tasklistId}`
  );
  res.json(data);
}));

// POST create a task in a task list
router.post('/portals/:portalId/projects/:projectId/tasklists/:tasklistId/tasks', handle(async (req, res) => {
  const token = await getAccessToken();
  const { name, description, due_date } = req.body as {
    name?: string;
    description?: string;
    due_date?: string;
  };
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

// PUT update a task
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

// DELETE a task
router.delete('/portals/:portalId/projects/:projectId/tasks/:taskId', handle(async (req, res) => {
  const token = await getAccessToken();
  const data = await zohoDelete(
    token,
    `/portal/${req.params.portalId}/projects/${req.params.projectId}/tasks/${req.params.taskId}/`
  );
  res.json(data);
}));

// ─── Convenience: use env-configured portal/project defaults ──────────────────

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
