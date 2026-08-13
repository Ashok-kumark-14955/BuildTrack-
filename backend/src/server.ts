import express from 'express';
import cors from 'cors';
import path from 'path';
import projectsRouter from './routes/projects';
import drawingsRouter from './routes/drawings';
import tasksRouter from './routes/tasks';
import milestonesRouter from './routes/milestones';
import projectTasksRouter from './routes/projectTasks';
import activityRouter from './routes/activity';
import geocodeRouter from './routes/geocode';
import mcpRouter from './routes/mcp';
import zohoProjectsRouter from './routes/zohoProjects';
import customModulesRouter from './routes/customModules';
import { sendManualCliqReport } from './cliqReport';

const app = express();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 4000;

// Data is persisted in Zoho Catalyst Data Store (seeded ahead of time via
// scripts run against the Catalyst environment). The old auto-seed/self-heal
// boot logic relied on the local SQLite file and no longer applies here.

// In production, Catalyst's Authorized Domains / CORS Domain list injects
// Access-Control-Allow-Origin at the gateway level. Setting it again here
// would produce duplicate header values that browsers reject, so we only
// apply the Express `cors()` middleware for local development.
if (!process.env.X_ZOHO_CATALYST_LISTEN_PORT) {
  app.use(cors());
}
app.use(express.json({ limit: '25mb' }));

// Static seed-drawing assets bundled with the deployed source (survive
// AppSail restarts/redeploys since they come from the git-tracked build,
// unlike runtime-uploaded files on the ephemeral disk).
app.use('/seed-drawings', express.static(path.join(__dirname, '../assets/seed-drawings')));

// Serve locally-uploaded photo comment files (for local dev).
// In production (AppSail), the disk is ephemeral so photo comments use
// base64 data URLs stored in the DB instead (see tasks.ts).
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/projects', projectsRouter);
app.use('/api/drawings', drawingsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/project-tasks', projectTasksRouter);
app.use('/api/activity', activityRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/mcp', mcpRouter);
app.use('/api/zoho-projects', zohoProjectsRouter);
app.use('/api/custom-modules', customModulesRouter);

// Manual Cliq report endpoint — called from the frontend's "Send Report to Cliq" button.
// Body: { taskId: string }
app.post('/api/cliq-report', async (req, res) => {
  const { taskId } = req.body || {};
  if (!taskId) {
    return res.status(400).json({ ok: false, message: 'taskId is required' });
  }
  const result = await sendManualCliqReport(req, taskId);
  res.status(result.ok ? 200 : 500).json(result);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

/**
 * GET /api/me
 * Returns the currently authenticated Catalyst user.
 * - In production (AppSail), Catalyst injects the user via SDK.
 * - In local dev (no Catalyst env), returns a mock user so the app still works.
 * Frontend uses this to decide whether to show the login page.
 *
 * Note: catalyst.initialize(req) may throw "INVALID_URL_PATTERN" when the
 * request comes cross-domain from the Slate frontend (*.onslate.com →
 * *.catalystappsail.in). We catch all SDK errors and return 401 so the
 * frontend's auth guard can redirect to the login page cleanly.
 */
app.get('/api/me', async (req, res) => {
  // Local dev: no Catalyst env — return a mock user so the app loads normally.
  if (!process.env.X_ZOHO_CATALYST_LISTEN_PORT) {
    return res.json({
      user_id: 'local-dev',
      email_id: 'dev@localhost',
      first_name: 'Dev',
      last_name: 'User',
      display_name: 'Dev User',
    });
  }

  try {
    const catalyst = require('zcatalyst-sdk-node');
    // getCurrentUser() requires the default (User) scope — { scope: 'admin' }
    // is for DataStore/ZCQL/Cache operations and does not carry the caller's
    // session identity, so it always resolved to no user here.
    const catalystApp = catalyst.initialize(req);
    const userManagement = catalystApp.userManagement();
    const user = await userManagement.getCurrentUser();
    if (!user || !(user.user_id || user.userId)) {
      // Project collaborators/admins aren't registered "app users" and get
      // no user record back even though their session is valid.
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({
      user_id: user.user_id || user.userId,
      email_id: user.email_id || user.email,
      first_name: user.first_name || user.firstName || '',
      last_name: user.last_name || user.lastName || '',
      display_name:
        user.display_name ||
        `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim(),
    });
  } catch (err: any) {
    // SDK throws INVALID_URL_PATTERN (cross-domain), NOT_AUTHENTICATED, or
    // similar when the user has no valid Catalyst session cookie.
    console.warn('[/api/me] Auth check failed:', err?.message || err);
    return res.status(401).json({ error: 'Not authenticated' });
  }
});

// ---------------------------------------------------------------------------
// Catalyst Management API helper (shared by setup-tables and debug-tables)
// ---------------------------------------------------------------------------

function makeCatalystManagementApi(req: any) {
  const https = require('https');
  const http = require('http');

  const PROJECT_ID = '59125000000013030';
  const PROJECT_KEY = '50044693287';
  const BASE_URL = 'https://api.catalyst.zoho.in';
  const ENVIRONMENT = 'Development';

  // Resolve token: try env var first, then SDK
  let accessToken = process.env.ZOHO_ACCESS_TOKEN || '';
  if (!accessToken) {
    try {
      const catalyst = require('zcatalyst-sdk-node');
      const catalystApp = catalyst.initialize(req, { scope: 'admin' });
      // The SDK stores the token in various spots depending on version
      accessToken =
        (catalystApp as any).config?.accessToken ||
        (catalystApp as any)._credentials?.accessToken ||
        '';
    } catch (_) { /* ignore */ }
  }

  const headers: Record<string, string> = {
    'Authorization': `Zoho-oauthtoken ${accessToken}`,
    'PROJECT_ID': PROJECT_KEY,
    'X-Catalyst-Environment': ENVIRONMENT,
    'X-CATALYST-USER': 'admin',
    'Content-Type': 'application/json',
  };

  function catalystRequest(method: string, apiPath: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}/baas/v1/project/${PROJECT_ID}${apiPath}`);
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          ...headers,
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
      };
      const lib = url.protocol === 'https:' ? https : http;
      const request = lib.request(options, (resp: any) => {
        let data = '';
        resp.on('data', (chunk: any) => { data += chunk; });
        resp.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        });
      });
      request.on('error', reject);
      if (bodyStr) request.write(bodyStr);
      request.end();
    });
  }

  return { accessToken, catalystRequest };
}

/**
 * POST /api/setup-tables
 * Ensures custom_modules and custom_records tables exist in Catalyst DataStore,
 * along with their required columns. Uses the Catalyst REST Management API directly
 * with the Zoho OAuth token from the SDK-provided runtime token.
 *
 * This endpoint is idempotent — it safely skips tables/columns that already exist.
 */
app.post('/api/setup-tables', async (req, res) => {
  try {
    const { accessToken, catalystRequest } = makeCatalystManagementApi(req);

    // Debug: also fetch raw table list to include in response
    const rawTableList = await catalystRequest('GET', '/table');

    if (!accessToken) {
      return res.status(400).json({
        ok: false,
        error: 'No access token available. Set ZOHO_ACCESS_TOKEN env var or call from an authenticated Catalyst context.',
      });
    }

    const appConfig = {
      projectId: '59125000000013030',
      projectKey: '50044693287',
      environment: 'Development',
      projectDomain: 'https://project-rainfall-60081725173.development.catalystserverless.in',
    };

    // Schema definition
    // DataStore always auto-creates ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME.
    // We only need to add our application-level columns.
    const schema: Record<string, Array<{ column_name: string; data_type: string; max_length?: number }>> = {
      custom_modules: [
        { column_name: 'name',      data_type: 'varchar', max_length: 255 },
        { column_name: 'fields',    data_type: 'text' },
        { column_name: 'createdAt', data_type: 'bigint' },
        { column_name: 'updatedAt', data_type: 'bigint' },
      ],
      custom_records: [
        { column_name: 'moduleId',  data_type: 'varchar', max_length: 255 },
        { column_name: 'data',      data_type: 'text' },
        { column_name: 'createdAt', data_type: 'bigint' },
        { column_name: 'updatedAt', data_type: 'bigint' },
      ],
    };

    // Fetch all existing tables
    const existingTablesResp = await catalystRequest('GET', '/table');
    const rawTableObjects = existingTablesResp?.data || [];
    const existingTables: Array<{ table_name: string; table_id: string }> =
      rawTableObjects.map((t: any) => ({
        table_name: (t.table_name || '').toLowerCase(),
        table_id: String(t.table_id || ''),
      }));

    const results: any[] = [];

    for (const [tableName, columns] of Object.entries(schema)) {
      let tableId: string | undefined = existingTables.find(t => t.table_name === tableName)?.table_id;
      let tableStatus = 'already_exists';

      if (!tableId) {
        // Create the table
        const createResp = await catalystRequest('POST', '/table', { table_name: tableName });
        if (createResp?.status === 'success') {
          tableId = String(createResp.data?.table_id);
          tableStatus = 'created';
        } else {
          results.push({ table: tableName, status: 'create_failed', response: createResp });
          continue;
        }
      }

      // Fetch existing columns for this table
      const existingColsResp = await catalystRequest('GET', `/table/${tableId}/column`);
      const existingCols: string[] = (existingColsResp?.data || [])
        .map((c: any) => (c.column_name || '').toLowerCase());

      const colResults: any[] = [];
      for (const col of columns) {
        if (existingCols.includes(col.column_name.toLowerCase())) {
          colResults.push({ column: col.column_name, status: 'already_exists' });
          continue;
        }
        const colBody: any[] = [{ column_name: col.column_name, data_type: col.data_type }];
        if (col.max_length !== undefined) colBody[0].max_length = col.max_length;
        const colResp = await catalystRequest('POST', `/table/${tableId}/column`, colBody);
        colResults.push({
          column: col.column_name,
          status: colResp?.status === 'success' ? 'created' : 'failed',
          response: colResp,
        });
      }

      results.push({ table: tableName, status: tableStatus, tableId, columns: colResults });
    }

    res.json({
      ok: true,
      appConfig,
      rawTableObjects,
      existingTables: existingTables.map(t => t.table_name),
      results,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

/**
 * GET /api/debug-tables
 * Returns the columns for custom_modules and custom_records tables.
 * Used to diagnose schema issues — confirms what columns actually exist in DataStore.
 */
app.get('/api/debug-tables', async (req, res) => {
  try {
    const { accessToken, catalystRequest } = makeCatalystManagementApi(req);

    if (!accessToken) {
      return res.status(400).json({ ok: false, error: 'No access token available' });
    }

    const tableIds: Record<string, string> = {
      custom_modules: '59125000000061005',
      custom_records: '59125000000052013',
    };

    const tables: any = {};
    for (const [name, id] of Object.entries(tableIds)) {
      const resp = await catalystRequest('GET', `/table/${id}/column`);
      tables[name] = {
        tableId: id,
        columns: (resp?.data || []).map((c: any) => ({
          name: c.column_name,
          type: c.data_type,
        })),
        rawResponse: resp,
      };
    }

    res.json({ ok: true, tokenPrefix: accessToken.substring(0, 20), tables });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

// Serve the built frontend from this same AppSail service (same-origin).
// Slate and AppSail live on different Catalyst domains, so a Slate-hosted
// frontend can't have its Zoho login session cookie recognized by this
// backend's catalyst.initialize(req) call across domains. Serving the
// frontend from here instead makes auth cookies same-origin.
const frontendDist = path.join(__dirname, '../public');
app.use(express.static(frontendDist));
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
