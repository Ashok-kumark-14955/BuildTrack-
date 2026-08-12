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
 * using ZCQL DDL statements (CREATE TABLE IF NOT EXISTS).
 * This endpoint is meant to be called ONCE after deployment, from inside AppSail
 * where the Catalyst SDK can authenticate with admin scope.
 */
app.post('/api/setup-tables', async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req as any, { scope: 'admin' });
    const zcql = catalystApp.zcql();

    const results: any[] = [];

    // ZCQL DDL: CREATE TABLE statements for each required table.
    // Catalyst DataStore auto-adds ROWID (primary key) and CREATORID columns.
    const ddlStatements: Array<{ table: string; ddl: string }> = [
      {
        table: 'custom_modules',
        ddl: `CREATE TABLE IF NOT EXISTS custom_modules (id varchar(255), name varchar(255), fields varchar(5000), createdAt varchar(255), updatedAt varchar(255))`,
      },
      {
        table: 'custom_records',
        ddl: `CREATE TABLE IF NOT EXISTS custom_records (id varchar(255), moduleId varchar(255), data varchar(10000), createdAt varchar(255), updatedAt varchar(255))`,
      },
    ];

    for (const { table, ddl } of ddlStatements) {
      try {
        const result = await zcql.executeZCQLQuery(ddl);
        results.push({ table, status: 'created', result });
      } catch (tableErr: any) {
        const msg: string = tableErr.message || '';
        // Treat "table already exists" style errors as success
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
          results.push({ table, status: 'already_exists' });
        } else {
          results.push({ table, status: 'error', error: msg });
        }
      }
    }

    res.json({ ok: true, results });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
