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
    let rawTables: any[] = [];
    try {
      const existing = await ds.getAllTables();
      rawTables = existing.map((t: any) => t.toJSON ? t.toJSON() : t);
      existingTableNames = existing.map((t: any) =>
        (t.table_name || t.tableName || t.name || '').toLowerCase()
      );
    } catch (listErr: any) {
      // If listing fails, proceed anyway
    }

    const results: any[] = [];

    // We'll try multiple payload formats and capture raw errors to diagnose
    const tableNames = ['custom_modules', 'custom_records'];
    const colDefs = {
      custom_modules: ['id', 'name', 'fields', 'createdAt', 'updatedAt'],
      custom_records: ['id', 'moduleId', 'data', 'createdAt', 'updatedAt'],
    };

    for (const name of tableNames) {
      if (existingTableNames.includes(name.toLowerCase())) {
        results.push({ table: name, status: 'already_exists' });
        continue;
      }

      const cols = colDefs[name as keyof typeof colDefs];
      const columnArray = cols.map(c => ({ column_name: c, data_type: 'text' }));

      // Try payload format 1: { table_name, columns: [...] }
      const payloadV1 = { table_name: name, columns: columnArray };
      // Try payload format 2: { table_name, column_details: [...] }
      const payloadV2 = { table_name: name, column_details: columnArray };
      // Try payload format 3: nested under table_details
      const payloadV3 = { table_details: { table_name: name, column_details: columnArray } };
      // Try payload format 4: columns with data_type: 'varchar', max_length: 255
      const columnArrayVarchar = cols.map(c => ({ column_name: c, data_type: 'varchar', max_length: 255 }));
      const payloadV4 = { table_name: name, columns: columnArrayVarchar };

      const payloads = [
        { label: 'v1_text_columns', data: payloadV1 },
        { label: 'v2_text_column_details', data: payloadV2 },
        { label: 'v3_table_details_nested', data: payloadV3 },
        { label: 'v4_varchar_columns', data: payloadV4 },
      ];

      let succeeded = false;
      const attempts: any[] = [];

      for (const p of payloads) {
        if (succeeded) break;
        try {
          const resp = await requester.send({
            method: 'POST',
            path: '/table',
            data: p.data,
            type: 'json',
            catalyst: true,
            track: false,
            user: 'admin',
          });
          results.push({ table: name, status: 'created', format: p.label, result: resp.data });
          succeeded = true;
        } catch (e: any) {
          attempts.push({ format: p.label, error: e.message, code: e.code, statusCode: e.statusCode });
          // If "already exists", stop trying
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

    res.json({ ok: true, existingTables: existingTableNames, results });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
