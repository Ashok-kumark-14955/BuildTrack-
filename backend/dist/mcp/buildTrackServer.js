"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuildTrackMcpServer = createBuildTrackMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
class BuildTrackApi {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async get(path, query = {}) {
        const url = new URL(`/api${path}`, this.baseUrl);
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined)
                url.searchParams.set(key, String(value));
        }
        return this.request(url, { method: 'GET' });
    }
    async post(path, body) {
        const url = new URL(`/api${path}`, this.baseUrl);
        return this.request(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async put(path, body) {
        const url = new URL(`/api${path}`, this.baseUrl);
        return this.request(url, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });
    }
    async request(url, init) {
        const response = await fetch(url, init);
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const message = data?.error || data?.message || response.statusText;
            throw new Error(`BuildTrack API error (${response.status}): ${message}`);
        }
        return data;
    }
}
function toolResult(data) {
    return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: { result: data },
    };
}
function createBuildTrackMcpServer(apiBaseUrl) {
    const api = new BuildTrackApi(apiBaseUrl);
    const server = new mcp_js_1.McpServer({
        name: 'BuildTrack Assistant',
        version: '1.0.0',
    });
    server.registerTool('list_projects', {
        title: 'List BuildTrack Projects',
        description: 'Search and filter BuildTrack construction projects. Returns project IDs needed by project-specific tools.',
        inputSchema: {
            query: zod_1.z.string().trim().optional().describe('Search project name, code, or manager'),
            status: zod_1.z.string().trim().optional().describe('Exact project status'),
            managerName: zod_1.z.string().trim().optional().describe('Exact project manager name'),
            includeArchived: zod_1.z.boolean().default(false).describe('Include archived projects'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
    }, async ({ query, status, managerName, includeArchived }) => {
        const projects = await api.get('/projects', {
            q: query,
            status,
            managerName,
            archived: includeArchived ? 'all' : undefined,
            sortBy: 'updatedAt',
            sortDir: 'desc',
        });
        return toolResult(projects);
    });
    server.registerTool('get_project', {
        title: 'Get BuildTrack Project',
        description: 'Get a project and its task completion statistics by project ID.',
        inputSchema: {
            projectId: zod_1.z.string().trim().min(1).describe('BuildTrack project ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
    }, async ({ projectId }) => toolResult(await api.get(`/projects/${encodeURIComponent(projectId)}`)));
    server.registerTool('list_project_tasks', {
        title: 'List BuildTrack Project Tasks',
        description: 'List and filter the planning tasks for a BuildTrack project.',
        inputSchema: {
            projectId: zod_1.z.string().trim().min(1).describe('BuildTrack project ID'),
            query: zod_1.z.string().trim().optional().describe('Search task name, description, or tags'),
            status: zod_1.z.string().trim().optional().describe('Exact task status, such as To Do, In Progress, or Completed'),
            priority: zod_1.z.string().trim().optional().describe('Exact priority, such as Low, Medium, High, or Critical'),
            assignee: zod_1.z.string().trim().optional().describe('Exact assignee name'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
    }, async ({ projectId, query, status, priority, assignee }) => {
        return toolResult(await api.get('/project-tasks', {
            projectId,
            q: query,
            status,
            priority,
            assignee,
            sortBy: 'dueDate',
            sortDir: 'asc',
        }));
    });
    server.registerTool('create_project_task', {
        title: 'Create BuildTrack Project Task',
        description: 'Create a planning task in a BuildTrack project.',
        inputSchema: {
            projectId: zod_1.z.string().trim().min(1).describe('BuildTrack project ID'),
            name: zod_1.z.string().trim().min(1).describe('Task name'),
            description: zod_1.z.string().trim().optional().describe('Task description'),
            priority: zod_1.z.string().trim().optional().describe('Priority; defaults to Medium'),
            status: zod_1.z.string().trim().optional().describe('Status; defaults to To Do'),
            assignee: zod_1.z.string().trim().optional().describe('Assignee name'),
            dueDate: zod_1.z.string().trim().optional().describe('Due date in YYYY-MM-DD format'),
            estimatedHours: zod_1.z.number().nonnegative().optional().describe('Estimated effort in hours'),
            tags: zod_1.z.array(zod_1.z.string().trim().min(1)).optional().describe('Task tags'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    }, async (input) => toolResult(await api.post('/project-tasks', input)));
    server.registerTool('update_project_task', {
        title: 'Update BuildTrack Project Task',
        description: 'Update task details or status. Marking a task Completed or Done also triggers the configured Cliq completion report.',
        inputSchema: {
            taskId: zod_1.z.string().trim().min(1).describe('BuildTrack project task ID'),
            name: zod_1.z.string().trim().min(1).optional().describe('Task name'),
            description: zod_1.z.string().trim().optional().describe('Task description'),
            priority: zod_1.z.string().trim().optional().describe('Task priority'),
            status: zod_1.z.string().trim().optional().describe('Task status'),
            assignee: zod_1.z.string().trim().optional().describe('Assignee name'),
            dueDate: zod_1.z.string().trim().optional().describe('Due date in YYYY-MM-DD format'),
            estimatedHours: zod_1.z.number().nonnegative().nullable().optional().describe('Estimated effort in hours'),
            tags: zod_1.z.array(zod_1.z.string().trim().min(1)).optional().describe('Task tags'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    }, async ({ taskId, ...changes }) => {
        const path = `/project-tasks/${encodeURIComponent(taskId)}`;
        const existing = await api.get(path);
        return toolResult(await api.put(path, { ...existing, ...changes }));
    });
    server.registerTool('add_project_task_comment', {
        title: 'Comment on BuildTrack Project Task',
        description: 'Add a text comment to a BuildTrack project task.',
        inputSchema: {
            taskId: zod_1.z.string().trim().min(1).describe('BuildTrack project task ID'),
            message: zod_1.z.string().trim().min(1).describe('Comment text'),
            author: zod_1.z.string().trim().optional().describe('Comment author; defaults to Cliq User'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    }, async ({ taskId, message, author }) => {
        return toolResult(await api.post(`/project-tasks/${encodeURIComponent(taskId)}/comments`, {
            message,
            author: author || 'Cliq User',
        }));
    });
    server.registerTool('list_milestones', {
        title: 'List BuildTrack Milestones',
        description: 'List the milestones for a BuildTrack project.',
        inputSchema: {
            projectId: zod_1.z.string().trim().min(1).describe('BuildTrack project ID'),
        },
        annotations: { readOnlyHint: true, idempotentHint: true },
    }, async ({ projectId }) => toolResult(await api.get('/milestones', { projectId })));
    return server;
}
