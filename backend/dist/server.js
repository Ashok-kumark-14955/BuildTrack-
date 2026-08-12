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
// ---------------------------------------------------------------------------
// Catalyst Management API helper (shared by setup-tables and debug-tables)
// ---------------------------------------------------------------------------
function makeCatalystManagementApi(req) {
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
                catalystApp.config?.accessToken ||
                    catalystApp._credentials?.accessToken ||
                    '';
        }
        catch (_) { /* ignore */ }
    }
    const headers = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'PROJECT_ID': PROJECT_KEY,
        'X-Catalyst-Environment': ENVIRONMENT,
        'X-CATALYST-USER': 'admin',
        'Content-Type': 'application/json',
    };
    function catalystRequest(method, apiPath, body) {
        return new Promise((resolve, reject) => {
            const url = new URL(`${BASE_URL}/baas/v1/project/${PROJECT_ID}${apiPath}`);
            const bodyStr = body ? JSON.stringify(body) : undefined;
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method,
                headers: {
                    ...headers,
                    ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
                },
            };
            const lib = url.protocol === 'https:' ? https : http;
            const request = lib.request(options, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch {
                        resolve(data);
                    }
                });
            });
            request.on('error', reject);
            if (bodyStr)
                request.write(bodyStr);
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
        const schema = {
            custom_modules: [
                { column_name: 'name', data_type: 'varchar', max_length: 255 },
                { column_name: 'fields', data_type: 'text' },
                { column_name: 'createdAt', data_type: 'bigint' },
                { column_name: 'updatedAt', data_type: 'bigint' },
            ],
            custom_records: [
                { column_name: 'moduleId', data_type: 'varchar', max_length: 255 },
                { column_name: 'data', data_type: 'text' },
                { column_name: 'createdAt', data_type: 'bigint' },
                { column_name: 'updatedAt', data_type: 'bigint' },
            ],
        };
        // Fetch all existing tables
        const existingTablesResp = await catalystRequest('GET', '/table');
        const rawTableObjects = existingTablesResp?.data || [];
        const existingTables = rawTableObjects.map((t) => ({
            table_name: (t.table_name || '').toLowerCase(),
            table_id: String(t.table_id || ''),
        }));
        const results = [];
        for (const [tableName, columns] of Object.entries(schema)) {
            let tableId = existingTables.find(t => t.table_name === tableName)?.table_id;
            let tableStatus = 'already_exists';
            if (!tableId) {
                // Create the table
                const createResp = await catalystRequest('POST', '/table', { table_name: tableName });
                if (createResp?.status === 'success') {
                    tableId = String(createResp.data?.table_id);
                    tableStatus = 'created';
                }
                else {
                    results.push({ table: tableName, status: 'create_failed', response: createResp });
                    continue;
                }
            }
            // Fetch existing columns for this table
            const existingColsResp = await catalystRequest('GET', `/table/${tableId}/column`);
            const existingCols = (existingColsResp?.data || [])
                .map((c) => (c.column_name || '').toLowerCase());
            const colResults = [];
            for (const col of columns) {
                if (existingCols.includes(col.column_name.toLowerCase())) {
                    colResults.push({ column: col.column_name, status: 'already_exists' });
                    continue;
                }
                const colBody = [{ column_name: col.column_name, data_type: col.data_type }];
                if (col.max_length !== undefined)
                    colBody[0].max_length = col.max_length;
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
    }
    catch (err) {
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
        const tableIds = {
            custom_modules: '59125000000061005',
            custom_records: '59125000000052013',
        };
        const tables = {};
        for (const [name, id] of Object.entries(tableIds)) {
            const resp = await catalystRequest('GET', `/table/${id}/column`);
            tables[name] = {
                tableId: id,
                columns: (resp?.data || []).map((c) => ({
                    name: c.column_name,
                    type: c.data_type,
                })),
                rawResponse: resp,
            };
        }
        res.json({ ok: true, tokenPrefix: accessToken.substring(0, 20), tables });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message, stack: err.stack });
    }
});
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
