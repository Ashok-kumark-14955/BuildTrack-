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

// Debug: see what request headers AppSail injects (remove after investigation)
app.get('/api/debug/headers', (req, res) => {
  res.json({
    headers: req.headers,
    catalystRelated: Object.entries(req.headers)
      .filter(([k]) => k.includes('catalyst') || k.includes('zoho') || k.includes('zc'))
      .reduce<Record<string, any>>((acc, [k, v]) => { acc[k] = v; return acc; }, {})
  });
});

// Debug: test Stratus SDK init and bucket head-check from inside AppSail
app.get('/api/debug/stratus-test', async (req, res) => {
  try {
    const catalyst = require('zcatalyst-sdk-node');
    const catalystApp = catalyst.initialize(req, { scope: 'admin' });
    const stratus = catalystApp.stratus();
    const bucketName = process.env.STRATUS_BUCKET || 'buildtrack';
    let bucketExists = false;
    try {
      bucketExists = await stratus.headBucket(bucketName);
    } catch (e: any) {
      return res.json({ ok: false, step: 'headBucket', bucket: bucketName, error: e?.message || String(e) });
    }
    res.json({ ok: true, bucket: bucketName, exists: bucketExists });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// TEMPORARY debug endpoint — lists all env keys that contain CATALYST, ZOHO, or are related
// to Stratus detection. Remove after confirming the right env var names.
app.get('/api/debug/env', (_req, res) => {
  const relevant = Object.entries(process.env)
    .filter(([k]) => k.includes('CATALYST') || k.includes('ZOHO') || k === 'USE_STRATUS' || k === 'PORT')
    .reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = v ? v.slice(0, 40) : '';
      return acc;
    }, {});
  res.json({ stratusEnabled: Boolean(
    process.env.X_ZOHO_CATALYST_LISTEN_PORT ||
    process.env.CATALYST_PROJECT_ID ||
    process.env.X_ZOHO_CATALYST_PROJECT_ID ||
    process.env.ZOHO_CATALYST_PROJECT_ID ||
    process.env.X_CATALYST_ENVIRONMENT ||
    process.env.CATALYST_ENVIRONMENT ||
    process.env.X_ZOHO_CATALYST_API_DOMAIN ||
    process.env.USE_STRATUS === 'true'
  ), relevant });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
