"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCliqPayload = buildCliqPayload;
exports.reportTaskCompletion = reportTaskCompletion;
exports.sendManualCliqReport = sendManualCliqReport;
// Posts task-completion reports through an authorized Zoho MCP server.
// Configure ZOHO_CLIQ_MCP_URL and ZOHO_CLIQ_CHANNEL. The legacy incoming
// webhook remains a fallback when MCP is not configured.
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const db = __importStar(require("./db"));
const projects_1 = require("./routes/projects");
function isCliqChannelUniqueNameTool(name) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return normalized.includes('cliq')
        && normalized.includes('message')
        && normalized.includes('channel')
        && normalized.includes('unique_name')
        && (normalized.includes('send') || normalized.includes('post'));
}
function isCliqReportingConfigured() {
    return Boolean((process.env.ZOHO_CLIQ_MCP_URL && process.env.ZOHO_CLIQ_CHANNEL)
        || process.env.CLIQ_REPORT_WEBHOOK_URL);
}
async function sendCliqText(text) {
    const mcpUrl = process.env.ZOHO_CLIQ_MCP_URL;
    const channel = process.env.ZOHO_CLIQ_CHANNEL;
    if (mcpUrl || channel) {
        if (!mcpUrl || !channel) {
            throw new Error('ZOHO_CLIQ_MCP_URL and ZOHO_CLIQ_CHANNEL must both be configured');
        }
        const client = new index_js_1.Client({ name: 'BuildTrack Cliq Reporter', version: '1.0.0' });
        const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(mcpUrl));
        try {
            await client.connect(transport);
            const configuredTool = process.env.ZOHO_CLIQ_MCP_TOOL;
            const tools = configuredTool ? null : await client.listTools();
            const toolName = configuredTool
                || tools?.tools.find((tool) => isCliqChannelUniqueNameTool(tool.name))?.name;
            if (!toolName) {
                throw new Error('Zoho Cliq channel-unique-name message tool was not found in the configured MCP server');
            }
            const result = await client.callTool({
                name: toolName,
                arguments: {
                    path_variables: { CHANNEL_UNIQUE_NAME: channel },
                    body: { text },
                    query_params: {},
                },
            });
            if (result.isError) {
                const content = Array.isArray(result.content)
                    ? result.content
                    : [];
                const detail = content
                    .filter((item) => item.type === 'text')
                    .map((item) => item.text || '')
                    .join(' ');
                throw new Error(detail || 'Zoho Cliq MCP tool returned an error');
            }
            return;
        }
        finally {
            await client.close().catch(() => undefined);
        }
    }
    const webhookUrl = process.env.CLIQ_REPORT_WEBHOOK_URL;
    if (!webhookUrl) {
        throw new Error('Zoho Cliq reporting is not configured');
    }
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) {
        throw new Error(`Cliq webhook returned HTTP ${response.status}`);
    }
}
/** Build the Zoho Cliq message payload for a task completion event. */
function buildCliqPayload(params) {
    const { taskName, projectName, drawingName, assignedTo, category, dueDate, priority, doneCount, taskCount, progress, } = params;
    // Rich Cliq card format (Incoming Webhook card payload)
    const fields = [];
    if (projectName)
        fields.push(`📁 *Project:* ${projectName}`);
    if (drawingName)
        fields.push(`📐 *Drawing:* ${drawingName}`);
    if (assignedTo)
        fields.push(`👷 *Completed by:* ${assignedTo}`);
    if (category)
        fields.push(`🔧 *Category:* ${category}`);
    if (priority)
        fields.push(`⚑ *Priority:* ${priority}`);
    if (dueDate)
        fields.push(`📅 *Due Date:* ${dueDate}`);
    if (taskCount != null && doneCount != null) {
        const pct = progress ?? Math.round((doneCount / taskCount) * 100);
        const filled = Math.round(pct / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        fields.push(`📊 *Progress:* ${doneCount}/${taskCount} tasks  [${bar}] ${pct}%`);
    }
    const body = [
        `✅ *Task Marked Complete*`,
        `> ${taskName}`,
        '',
        ...fields,
    ].join('\n');
    return { text: body };
}
/** Fire a Cliq report for a completed task. */
async function reportTaskCompletion(req, task) {
    if (!isCliqReportingConfigured())
        return;
    try {
        let projectId = task.projectId;
        let drawing = null;
        if (!projectId && task.drawingId) {
            drawing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [task.drawingId]);
            projectId = drawing?.projectId;
        }
        const project = projectId
            ? await db.get(req, 'SELECT * FROM projects WHERE id = ?', [projectId])
            : null;
        const stats = project ? await (0, projects_1.projectStats)(req, project.id) : null;
        const payload = buildCliqPayload({
            taskName: task.name,
            projectName: project?.name,
            drawingName: drawing?.name,
            assignedTo: task.assignedTo,
            category: task.category,
            dueDate: task.dueDate,
            priority: task.priority,
            doneCount: stats?.doneCount,
            taskCount: stats?.taskCount,
            progress: stats?.progress,
        });
        await sendCliqText(payload.text);
        console.log(`[Cliq] Report sent for task "${task.name}"`);
    }
    catch (err) {
        // Reporting failures must never affect the task-update response.
        console.error('[Cliq] Report failed:', err);
    }
}
/**
 * Manual report endpoint — called from the frontend when the user clicks
 * "Send Report to Cliq" on a specific task.  Returns { ok, message }.
 */
async function sendManualCliqReport(req, taskId) {
    if (!isCliqReportingConfigured()) {
        return {
            ok: false,
            message: 'Zoho Cliq reporting is not configured. Set ZOHO_CLIQ_MCP_URL and ZOHO_CLIQ_CHANNEL.',
        };
    }
    try {
        const task = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [taskId]);
        if (!task) {
            // Try project_tasks table as fallback
            const pt = await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [taskId]);
            if (!pt)
                return { ok: false, message: 'Task not found' };
            const project = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [pt.projectId]);
            const payload = buildCliqPayload({
                taskName: pt.name,
                projectName: project?.name,
                assignedTo: pt.assignee,
                priority: pt.priorityLevel ?? pt.priority,
                dueDate: pt.dueDate,
            });
            await sendCliqText(payload.text);
            return { ok: true, message: 'Report sent to Zoho Cliq successfully!' };
        }
        // Drawing task path
        let drawing = null;
        let projectId = task.projectId;
        if (!projectId && task.drawingId) {
            drawing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [task.drawingId]);
            projectId = drawing?.projectId;
        }
        const project = projectId
            ? await db.get(req, 'SELECT * FROM projects WHERE id = ?', [projectId])
            : null;
        const stats = project ? await (0, projects_1.projectStats)(req, project.id) : null;
        const payload = buildCliqPayload({
            taskName: task.name,
            projectName: project?.name,
            drawingName: drawing?.name,
            assignedTo: task.assignedTo,
            category: task.category,
            dueDate: task.dueDate,
            priority: task.priorityLevel ?? task.priority,
            doneCount: stats?.doneCount,
            taskCount: stats?.taskCount,
            progress: stats?.progress,
        });
        await sendCliqText(payload.text);
        return { ok: true, message: 'Report sent to Zoho Cliq successfully!' };
    }
    catch (err) {
        return { ok: false, message: `Failed to send report: ${err?.message ?? err}` };
    }
}
