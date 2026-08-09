"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const projects_1 = __importDefault(require("./routes/projects"));
const drawings_1 = __importDefault(require("./routes/drawings"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const milestones_1 = __importDefault(require("./routes/milestones"));
const projectTasks_1 = __importDefault(require("./routes/projectTasks"));
const activity_1 = __importDefault(require("./routes/activity"));
const geocode_1 = __importDefault(require("./routes/geocode"));
const mcp_1 = __importDefault(require("./routes/mcp"));
const cliqReport_1 = require("./cliqReport");
const seed_house_1 = require("./seed_house");
const app = (0, express_1.default)();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 4000;
// Data is persisted in Zoho Catalyst Data Store (seeded ahead of time via
// scripts run against the Catalyst environment). The old auto-seed/self-heal
// boot logic relied on the local SQLite file and no longer applies here.
// In production, Catalyst's Authorized Domains / CORS Domain list injects
// Access-Control-Allow-Origin at the gateway level. Setting it again here
// would produce duplicate header values that browsers reject, so we only
// apply the Express `cors()` middleware for local development.
if (!process.env.X_ZOHO_CATALYST_LISTEN_PORT) {
    app.use((0, cors_1.default)());
}
app.use(express_1.default.json({ limit: '25mb' }));
// Static seed-drawing assets bundled with the deployed source (survive
// AppSail restarts/redeploys since they come from the git-tracked build,
// unlike runtime-uploaded files on the ephemeral disk).
app.use('/seed-drawings', express_1.default.static(path_1.default.join(__dirname, '../assets/seed-drawings')));
// Serve locally-uploaded photo comment files (for local dev).
// In production (AppSail), the disk is ephemeral so photo comments use
// base64 data URLs stored in the DB instead (see tasks.ts).
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
app.use('/api/projects', projects_1.default);
app.use('/api/drawings', drawings_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/milestones', milestones_1.default);
app.use('/api/project-tasks', projectTasks_1.default);
app.use('/api/activity', activity_1.default);
app.use('/api/geocode', geocode_1.default);
app.use('/mcp', mcp_1.default);
// Manual Cliq report endpoint — called from the frontend's "Send Report to Cliq" button.
// Body: { taskId: string }
app.post('/api/cliq-report', async (req, res) => {
    const { taskId } = req.body || {};
    if (!taskId) {
        return res.status(400).json({ ok: false, message: 'taskId is required' });
    }
    const result = await (0, cliqReport_1.sendManualCliqReport)(req, taskId);
    res.status(result.ok ? 200 : 500).json(result);
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
// ── Permanent sample data: House Building Project ──────────────────────────
// Run once per cold-start; the seedHouseProject function is idempotent (skips
// if the project already exists) so it is safe to call on every boot.
app.get('/api/_seed-house', async (req, res) => {
    try {
        await (0, seed_house_1.seedHouseProject)(req);
        res.json({ ok: true, message: 'House Building Project seed complete (or already existed).' });
    }
    catch (err) {
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
        const body = await response.json();
        console.log('[seed_house] startup result:', body?.message ?? body);
    }
    catch (err) {
        console.warn('[seed_house] startup seed call failed (will retry on next boot):', err);
    }
});
