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
import { seedHouseProject } from './seed_house';

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

// ── Permanent sample data: House Building Project ──────────────────────────
// Run once per cold-start; the seedHouseProject function is idempotent (skips
// if the project already exists) so it is safe to call on every boot.
app.get('/api/_seed-house', async (req, res) => {
  try {
    await seedHouseProject(req);
    res.json({ ok: true, message: 'House Building Project seed complete (or already existed).' });
  } catch (err: any) {
    console.error('[seed_house] error', err);
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  // Trigger house project seed via internal HTTP call so Catalyst SDK
  // initialises correctly (it needs a real Express Request context).
  const baseUrl = `http://localhost:${PORT}`;
  try {
    const response = await fetch(`${baseUrl}/api/_seed-house`, { method: 'GET' });
    const body = await response.json() as any;
    console.log('[seed_house] startup result:', body?.message ?? body);
  } catch (err) {
    console.warn('[seed_house] startup seed call failed (will retry on next boot):', err);
  }
});
