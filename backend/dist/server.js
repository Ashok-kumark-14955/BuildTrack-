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
const zohoProjects_1 = __importDefault(require("./routes/zohoProjects"));
const customModules_1 = __importDefault(require("./routes/customModules"));
const cliqReport_1 = require("./cliqReport");
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
app.use('/api/zoho-projects', zohoProjects_1.default);
app.use('/api/custom-modules', customModules_1.default);
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
        const catalystApp = catalyst.initialize(req, { scope: 'admin' });
        // Access the datastore's internal AuthorizedHttpClient requester.
        // It pre-populates auth headers and prepends /baas/v1/project/{projectId} when req.catalyst=true.
        const ds = catalystApp.datastore();
        const requester = ds.requester;
        const results = [];
        // First, fetch all existing tables so we can skip ones that already exist.
        let existingTableNames = [];
        try {
            const existing = await ds.getAllTables();
            existingTableNames = existing.map((t) => (t.table_name || t.tableName || t.name || '').toLowerCase());
        }
        catch (_e) {
            // If listing fails, proceed and let individual create calls report errors.
        }
        const tableDefs = [
            {
                table_name: 'custom_modules',
                columns: [
                    { column_name: 'id', data_type: 'varchar', max_size: 255 },
                    { column_name: 'name', data_type: 'varchar', max_size: 255 },
                    { column_name: 'fields', data_type: 'varchar', max_size: 5000 },
                    { column_name: 'createdAt', data_type: 'varchar', max_size: 255 },
                    { column_name: 'updatedAt', data_type: 'varchar', max_size: 255 },
                ],
            },
            {
                table_name: 'custom_records',
                columns: [
                    { column_name: 'id', data_type: 'varchar', max_size: 255 },
                    { column_name: 'moduleId', data_type: 'varchar', max_size: 255 },
                    { column_name: 'data', data_type: 'varchar', max_size: 10000 },
                    { column_name: 'createdAt', data_type: 'varchar', max_size: 255 },
                    { column_name: 'updatedAt', data_type: 'varchar', max_size: 255 },
                ],
            },
        ];
        for (const tableDef of tableDefs) {
            const name = tableDef.table_name;
            try {
                if (existingTableNames.includes(name.toLowerCase())) {
                    results.push({ table: name, status: 'already_exists' });
                    continue;
                }
                // POST /baas/v1/project/{id}/table  — uses the SDK requester so auth is handled automatically.
                const resp = await requester.send({
                    method: 'POST',
                    path: '/table',
                    data: tableDef,
                    type: 'json',
                    catalyst: true,
                    track: false,
                    user: 'admin',
                });
                results.push({ table: name, status: 'created', result: resp.data });
            }
            catch (tableErr) {
                const msg = tableErr.message || '';
                if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('duplicate')) {
                    results.push({ table: name, status: 'already_exists' });
                }
                else {
                    results.push({ table: name, status: 'error', error: msg });
                }
            }
        }
        res.json({ ok: true, results });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
