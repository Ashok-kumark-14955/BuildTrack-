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
 * POST /api/setup-tables
 * Ensures custom_modules and custom_records tables exist in Catalyst DataStore,
 * along with their required columns. Uses the Catalyst REST Management API directly
 * with the Zoho OAuth token from the CLI credentials.
 *
 * Confirmed working approach (discovered via direct REST API testing):
 *  - Table creation: POST /baas/v1/project/{projectId}/table  body: {"table_name":"..."}
 *  - Column creation: POST /baas/v1/project/{projectId}/table/{tableId}/column
 *    body: [{"column_name":"...","data_type":"varchar","max_length":255}]
 *    or [{"column_name":"...","data_type":"text"}] / [{"column_name":"...","data_type":"bigint"}]
 *
 * This endpoint is idempotent — it safely skips tables/columns that already exist.
 */
app.post('/api/setup-tables', async (req, res) => {
  try {
    const https = require('https');
    const http = require('http');

    // Catalyst project credentials (Development environment)
    const PROJECT_ID = '59125000000013030';
    const PROJECT_KEY = '50044693287';
    const BASE_URL = 'https://api.catalyst.zoho.in';
    const ENVIRONMENT = 'Development';

    // Resolve OAuth token: prefer env var, fall back to SDK-provided token
    let accessToken = process.env.ZOHO_ACCESS_TOKEN || '';
    if (!accessToken) {
      try {
        const catalyst = require('zcatalyst-sdk-node');
        const catalystApp = catalyst.initialize(req as any, { scope: 'admin' });
        accessToken = (catalystApp as any).config?.accessToken || '';
      } catch (_) { /* ignore */ }
    }

    if (!accessToken) {
      return res.status(400).json({
        ok: false,
        error: 'No access token available. Set ZOHO_ACCESS_TOKEN env var or call from an authenticated Catalyst context.',
      });
    }

    const commonHeaders: Record<string, string> = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'PROJECT_ID': PROJECT_KEY,
      'X-Catalyst-Environment': ENVIRONMENT,
      'X-CATALYST-USER': 'admin',
      'Content-Type': 'application/json',
    };

    /** Generic JSON REST call to the Catalyst Management API */
    function catalystRequest(method: string, path: string, body?: any): Promise<any> {
      return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}/baas/v1/project/${PROJECT_ID}${path}`);
        const bodyStr = body ? JSON.stringify(body) : undefined;
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method,
          headers: {
            ...commonHeaders,
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
    const existingTables: Array<{ table_name: string; table_id: string }> =
      (existingTablesResp?.data || []).map((t: any) => ({
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

    res.json({ ok: true, results });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
