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
 * Creates the custom_modules and custom_records tables in Catalyst DataStore
 * using the Catalyst REST Management API (POST /baas/v1/project/{id}/table).
 * The SDK's datastore requester is reused so auth headers are injected automatically.
 *
 * This endpoint is meant to be called ONCE after deployment from inside AppSail
 * where the Catalyst SDK can authenticate with admin scope.
 */
app.post('/api/setup-tables', async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req as any, { scope: 'admin' });
    const ds = catalystApp.datastore();
    const requester = (ds as any).requester;

    // First, fetch all existing tables so we can skip ones that already exist.
    let existingTableNames: string[] = [];
    let rawTableObjects: any[] = [];
    try {
      const existing = await ds.getAllTables();
      rawTableObjects = existing.map((t: any) => {
        const j = t.toJSON ? t.toJSON() : t;
        return j;
      });
      existingTableNames = rawTableObjects.map((t: any) =>
        (t.table_name || t.tableName || t.name || t.TABLE_NAME || '').toLowerCase()
      );
    } catch (listErr: any) {
      rawTableObjects = [{ listError: String(listErr) }];
    }

    const results: any[] = [];
    // Expose app config + debug info for diagnosing auth/URL
    const appConfig: any = {};
    try {
      appConfig.projectId = (catalystApp as any).config?.projectId;
      appConfig.projectKey = (catalystApp as any).config?.projectKey;
      appConfig.environment = (catalystApp as any).config?.environment;
      appConfig.projectDomain = (catalystApp as any).config?.projectDomain;
    } catch (_) { /* ignore */ }

    const tableNames = ['custom_modules', 'custom_records'];
    const colDefs: Record<string, string[]> = {
      custom_modules: ['id', 'name', 'fields', 'createdAt', 'updatedAt'],
      custom_records: ['id', 'moduleId', 'data', 'createdAt', 'updatedAt'],
    };

    // The SDK's FormData helper (exports.default)
    const FormDataClass = require('zcatalyst-sdk-node/lib/utils/form-data.js').default;

    for (const name of tableNames) {
      const normalizedExisting = existingTableNames.map((n: string) => n.toLowerCase());
      if (normalizedExisting.includes(name.toLowerCase())) {
        results.push({ table: name, status: 'already_exists' });
        continue;
      }
      const alreadyExists = rawTableObjects.some((t: any) => {
        const tn = (t.table_name || t.tableName || t.name || t.TABLE_NAME || '');
        return tn.toLowerCase() === name.toLowerCase();
      });
      if (alreadyExists) {
        results.push({ table: name, status: 'already_exists_raw' });
        continue;
      }

      const cols = colDefs[name];

      // Build all payload variants
      // v1: multipart with column_details (text)
      const tdJson1 = JSON.stringify({ table_name: name, column_details: cols.map(c => ({ column_name: c, data_type: 'text' })) });
      // v2: multipart with column_details (varchar)
      const tdJson2 = JSON.stringify({ table_name: name, column_details: cols.map(c => ({ column_name: c, data_type: 'varchar', max_length: 255 })) });
      // v3: multipart minimal single column
      const tdJson3 = JSON.stringify({ table_name: name, column_details: [{ column_name: cols[0], data_type: 'text' }] });
      // v4: JSON body - standard column_details
      // v5: url-encoded
      const urlEncoded1 = `table_details=${encodeURIComponent(tdJson1)}`;

      const payloads: Array<{ label: string; data: any; type: string }> = [];

      // Multipart variants (type: 'file' — SDK FormData)
      for (const [label, json] of [
        ['v1_mp_text_cols', tdJson1],
        ['v2_mp_varchar_cols', tdJson2],
        ['v3_mp_minimal', tdJson3],
      ] as [string, string][]) {
        try {
          const fd = new FormDataClass();
          fd.append('table_details', json);
          payloads.push({ label, data: fd, type: 'file' });
        } catch (fdErr: any) {
          results.push({ table: name, format: label, status: 'fd_build_error', error: String(fdErr) });
        }
      }

      // JSON variants (type: 'json')
      payloads.push({ label: 'v4_json_text_cols', data: { table_name: name, column_details: cols.map(c => ({ column_name: c, data_type: 'text' })) }, type: 'json' });
      payloads.push({ label: 'v5_json_varchar_cols', data: { table_name: name, column_details: cols.map(c => ({ column_name: c, data_type: 'varchar', max_length: 255 })) }, type: 'json' });
      payloads.push({ label: 'v6_json_td_str', data: { table_details: tdJson1 }, type: 'json' });
      payloads.push({ label: 'v7_json_name_only', data: { table_name: name }, type: 'json' });

      // URL-encoded variant (type: 'form')
      payloads.push({ label: 'v8_urlenc', data: urlEncoded1, type: 'form' });

      let succeeded = false;
      const attempts: any[] = [];

      for (const p of payloads) {
        if (succeeded) break;
        try {
          const sendOpts: any = {
            method: 'POST',
            path: '/table',
            data: p.data,
            type: p.type,
            catalyst: true,
            track: false,
            user: 'admin',
          };
          const resp = await requester.send(sendOpts);
          results.push({ table: name, status: 'created', format: p.label, result: resp.data });
          succeeded = true;
        } catch (e: any) {
          attempts.push({ format: p.label, error: e.message, code: e.code, statusCode: e.statusCode });
          const msg = (e.message || '').toLowerCase();
          if (msg.includes('already exists') || msg.includes('duplicate')) {
            results.push({ table: name, status: 'already_exists' });
            succeeded = true;
          }
        }
      }

      if (!succeeded) {
        results.push({ table: name, status: 'all_formats_failed', attempts });
      }
    }

    res.json({ ok: true, appConfig, rawTableObjects, existingTables: existingTableNames, results });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
