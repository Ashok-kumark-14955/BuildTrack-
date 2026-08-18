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

// Migration endpoint: Add deletedBeams, customBeams, deletedNodes columns to drawings table
// Uses the Zoho refresh token (stored in env vars) to get a fresh Zoho OAuth token,
// then calls the Catalyst Management REST API directly to add the columns.
// The graceful fallback in drawings.ts handles the case where columns don't exist yet,
// so this migration is run once to permanently add the columns.
app.post('/api/migrate/add-beam-columns', async (req, res) => {
  try {
    console.log('🚀 [Migration] Adding beam/node editor columns to drawings table...');

    if (!process.env.X_ZOHO_CATALYST_LISTEN_PORT) {
      return res.json({ ok: true, message: 'Local dev — columns already exist in SQLite', results: [] });
    }

    // Get a fresh Zoho access token using the stored refresh token
    const freshToken = await getZohoAccessToken();
    console.log('[Migration] Token obtained:', freshToken ? 'YES (' + freshToken.substring(0, 20) + '...)' : 'NO');

    if (!freshToken) {
      return res.status(500).json({
        ok: false,
        error: 'Could not obtain Zoho access token. Check ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN env vars.',
      });
    }

    const { catalystRequest } = makeCatalystManagementApi(req);

    // Step 1: Get all tables to find the drawings table ID
    const tableListRaw = await catalystRequest('GET', '/table', undefined, freshToken);
    console.log('[Migration] Table list:', JSON.stringify(tableListRaw).substring(0, 200));

    let tablesRaw: any[];
    if (Array.isArray(tableListRaw)) {
      tablesRaw = tableListRaw;
    } else if (Array.isArray(tableListRaw?.data)) {
      tablesRaw = tableListRaw.data;
    } else {
      return res.json({ ok: false, error: 'Unexpected table list shape', raw: tableListRaw });
    }

    const drawingsTableInfo = tablesRaw.find((t: any) => (t.table_name || '').toLowerCase() === 'drawings');
    if (!drawingsTableInfo) {
      return res.json({
        ok: false,
        error: 'drawings table not found',
        tablesFound: tablesRaw.map((t: any) => t.table_name),
      });
    }

    const tableId = String(drawingsTableInfo.table_id);
    console.log(`[Migration] Found drawings table, id=${tableId}`);

    // Step 2: Get existing columns so we don't duplicate
    const colListRaw = await catalystRequest('GET', `/table/${tableId}/column`, undefined, freshToken);
    const existingCols: string[] = (Array.isArray(colListRaw?.data) ? colListRaw.data : [])
      .map((c: any) => (c.column_name || '').toLowerCase());
    console.log('[Migration] Existing columns:', existingCols.join(', '));

    // Step 3: Add each missing column
    const columnsToAdd = ['deletedBeams', 'customBeams', 'deletedNodes'];
    const results: any[] = [];

    for (const colName of columnsToAdd) {
      if (existingCols.includes(colName.toLowerCase())) {
        console.log(`[Migration] ℹ️  Column ${colName} already exists`);
        results.push({ column: colName, status: 'exists' });
        continue;
      }
      try {
        const colResp = await catalystRequest('POST', `/table/${tableId}/column`, [{ column_name: colName, data_type: 'text' }], freshToken);
        console.log(`[Migration] Column ${colName} response:`, JSON.stringify(colResp));
        if (colResp?.status === 'success') {
          results.push({ column: colName, status: 'added' });
        } else {
          results.push({ column: colName, status: 'unexpected', response: colResp });
        }
      } catch (e: any) {
        results.push({ column: colName, status: 'error', error: e.message });
      }
    }

    console.log('[Migration] ✨ Done:', JSON.stringify(results));
    res.json({ ok: true, tableId, results });

  } catch (error: any) {
    console.error('[Migration] ❌ Migration failed:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Debug: test SDK updateRow directly for a drawing row
// POST /api/debug-update-drawing  body: { drawingId, col, value }
// ---------------------------------------------------------------------------
app.post('/api/debug-update-drawing', async (req, res) => {
  try {
    const { drawingId, col, value } = req.body || {};
    if (!drawingId || !col) return res.status(400).json({ error: 'drawingId and col required' });

    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req, { scope: 'admin' });
    const zcql = catalystApp.zcql();

    // 1. Fetch ROWID
    const selectSql = `SELECT ROWID FROM drawings WHERE id = '${drawingId}'`;
    const selectResult = await zcql.executeZCQLQuery(selectSql);
    console.log('[debug] selectResult:', JSON.stringify(selectResult));

    let rowId: number | null = null;
    if (Array.isArray(selectResult) && selectResult[0]) {
      const inner = selectResult[0].drawings || selectResult[0];
      rowId = Number(inner.ROWID || inner.rowid);
    }

    if (!rowId) return res.json({ ok: false, error: 'ROWID not found', selectResult });

    // 2. Try SDK updateRow
    const table = catalystApp.datastore().table('drawings');
    const updatePayload = { ROWID: rowId, [col]: value };
    console.log('[debug] updatePayload:', JSON.stringify(updatePayload));

    let sdkResult: any;
    try {
      sdkResult = await table.updateRow(updatePayload as any);
      console.log('[debug] sdkResult:', JSON.stringify(sdkResult));
    } catch (sdkErr: any) {
      return res.json({ ok: false, rowId, error: sdkErr.message, updatePayload });
    }

    // 3. Read back
    const readResult = await zcql.executeZCQLQuery(`SELECT ${col} FROM drawings WHERE id = '${drawingId}'`);
    console.log('[debug] readResult:', JSON.stringify(readResult));

    res.json({ ok: true, rowId, updatePayload, sdkResult, readResult });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

// ---------------------------------------------------------------------------
// Auto-migration: ensure beam/node editor columns exist in DataStore on startup
// ---------------------------------------------------------------------------
async function runMigrations() {
  if (!process.env.X_ZOHO_CATALYST_LISTEN_PORT) {
    // Local dev: SQLite auto-creates these columns — nothing to do
    return;
  }
  try {
    const https = require('https');
    // Use the Catalyst Management API to add columns via REST
    // This works at startup without a real req/session object.
    const PROJECT_ID = '59125000000013030';
    const PROJECT_KEY = '50044693287';
    const ENVIRONMENT = 'Development';

    // Get access token from environment (injected by Catalyst at runtime)
    const accessToken = process.env.CATALYST_AUTH_TOKEN || process.env.ZOHO_ACCESS_TOKEN || '';

    if (!accessToken) {
      console.warn('[migration] No access token available — skipping startup migration. Use /api/migrate/add-beam-columns endpoint to run manually.');
      return;
    }

    const headers: Record<string, string> = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'PROJECT_ID': PROJECT_KEY,
      'X-Catalyst-Environment': ENVIRONMENT,
      'X-CATALYST-USER': 'admin',
      'Content-Type': 'application/json',
    };

    // First, get the drawings table ID
    const tableListResult = await new Promise<any>((resolve, reject) => {
      const req = https.request({
        hostname: 'api.catalyst.zoho.in',
        path: `/baas/v1/project/${PROJECT_ID}/table`,
        method: 'GET',
        headers,
      }, (res: any) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
      });
      req.on('error', reject);
      req.end();
    });

    const tables: any[] = tableListResult?.data || [];
    const drawingsTable = tables.find((t: any) => (t.table_name || '').toLowerCase() === 'drawings');
    if (!drawingsTable) {
      console.warn('[migration] drawings table not found — skipping column migration');
      return;
    }

    const tableId = String(drawingsTable.table_id);

    // Get existing columns
    const colListResult = await new Promise<any>((resolve, reject) => {
      const req = https.request({
        hostname: 'api.catalyst.zoho.in',
        path: `/baas/v1/project/${PROJECT_ID}/table/${tableId}/column`,
        method: 'GET',
        headers,
      }, (res: any) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
      });
      req.on('error', reject);
      req.end();
    });

    const existingCols: string[] = (colListResult?.data || []).map((c: any) => (c.column_name || '').toLowerCase());
    console.log('[migration] Existing drawings columns:', existingCols.join(', '));

    const columnsToAdd = [
      { column_name: 'deletedBeams', data_type: 'text' },
      { column_name: 'customBeams',  data_type: 'text' },
      { column_name: 'deletedNodes', data_type: 'text' },
    ];

    for (const col of columnsToAdd) {
      if (existingCols.includes(col.column_name.toLowerCase())) {
        console.log(`[migration] ℹ️  Column ${col.column_name} already exists — skipping`);
        continue;
      }

      try {
        const bodyStr = JSON.stringify([col]);
        const result = await new Promise<any>((resolve, reject) => {
          const req = https.request({
            hostname: 'api.catalyst.zoho.in',
            path: `/baas/v1/project/${PROJECT_ID}/table/${tableId}/column`,
            method: 'POST',
            headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) },
          }, (res: any) => {
            let data = '';
            res.on('data', (c: any) => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
          });
          req.on('error', reject);
          req.write(bodyStr);
          req.end();
        });

        if (result?.status === 'success') {
          console.log(`[migration] ✅ Column ${col.column_name} added to drawings table`);
        } else {
          console.warn(`[migration] ⚠️  Column ${col.column_name}: unexpected response`, JSON.stringify(result));
        }
      } catch (err: any) {
        console.warn(`[migration] ⚠️  Column ${col.column_name}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.warn('[migration] Could not run auto-migration at startup:', err.message);
  }
}

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
// Catalyst Management API helper (shared by setup-tables, debug-tables, migrate)
// ---------------------------------------------------------------------------

/** Fetch a fresh Zoho access token using the stored refresh token. */
async function getZohoAccessToken(): Promise<string> {
  const https = require('https');
  const clientId     = process.env.ZOHO_CLIENT_ID     || '';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN || '';

  if (!clientId || !clientSecret || !refreshToken) return '';

  return new Promise<string>((resolve) => {
    const body = `grant_type=refresh_token&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}`;
    const options = {
      hostname: 'accounts.zoho.in',
      path: '/oauth/v2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const request = https.request(options, (resp: any) => {
      let data = '';
      resp.on('data', (c: any) => { data += c; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.access_token || '');
        } catch {
          resolve('');
        }
      });
    });
    request.on('error', () => resolve(''));
    request.write(body);
    request.end();
  });
}

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

  function catalystRequest(method: string, apiPath: string, body?: any, overrideToken?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}/baas/v1/project/${PROJECT_ID}${apiPath}`);
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const token = overrideToken || accessToken;
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          ...headers,
          'Authorization': `Zoho-oauthtoken ${token}`,
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

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: err?.message || String(err), detail: err?.toString?.() });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  // Run migrations after server starts to ensure DataStore has required columns
  runMigrations().catch((err) => console.warn('[migration] startup error:', err?.message || err));
});
