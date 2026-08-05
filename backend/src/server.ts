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
import db from './db';

const app = express();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 4000;

// Auto-seed sample project data on first boot so the app is explorable with zero setup
const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
if (projectCount === 0) {
  require('./seed');
}

// Auto-seed the Apex Steel sample project (4 steel drawings) if it hasn't been added yet
const steelProjectCount = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE code = 'ASIC-P1'").get() as { count: number }).count;
if (steelProjectCount === 0) {
  require('./seed_steel');
}

// Self-healing calibration fixup: some hosting environments (e.g. AppSail) may
// reset/restart with a stale copy of the DB that predates the columnPositions
// fix. Re-apply known-good grid marker positions for the steel sample drawings
// on every boot so the fix survives restarts/redeploys regardless of DB state.
require('./fixCalibration');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/projects', projectsRouter);
app.use('/api/drawings', drawingsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/project-tasks', projectTasksRouter);
app.use('/api/activity', activityRouter);
app.use('/api/geocode', geocodeRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
