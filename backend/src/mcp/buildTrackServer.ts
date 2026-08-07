import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type QueryValue = string | number | boolean | undefined;

class BuildTrackApi {
  constructor(private readonly baseUrl: string) {}

  async get(path: string, query: Record<string, QueryValue> = {}) {
    const url = new URL(`/api${path}`, this.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return this.request(url, { method: 'GET' });
  }

  async post(path: string, body: unknown) {
    const url = new URL(`/api${path}`, this.baseUrl);
    return this.request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async put(path: string, body: unknown) {
    const url = new URL(`/api${path}`, this.baseUrl);
    return this.request(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request(url: URL, init: RequestInit) {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || data?.message || response.statusText;
      throw new Error(`BuildTrack API error (${response.status}): ${message}`);
    }
    return data;
  }
}

function toolResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: { result: data },
  };
}

export function createBuildTrackMcpServer(apiBaseUrl: string) {
  const api = new BuildTrackApi(apiBaseUrl);
  const server = new McpServer({
    name: 'BuildTrack Assistant',
    version: '1.0.0',
  });

  server.registerTool('list_projects', {
    title: 'List BuildTrack Projects',
    description: 'Search and filter BuildTrack construction projects. Returns project IDs needed by project-specific tools.',
    inputSchema: {
      query: z.string().trim().optional().describe('Search project name, code, or manager'),
      status: z.string().trim().optional().describe('Exact project status'),
      managerName: z.string().trim().optional().describe('Exact project manager name'),
      includeArchived: z.boolean().default(false).describe('Include archived projects'),
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
      projectId: z.string().trim().min(1).describe('BuildTrack project ID'),
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async ({ projectId }) => toolResult(await api.get(`/projects/${encodeURIComponent(projectId)}`)));

  server.registerTool('list_project_tasks', {
    title: 'List BuildTrack Project Tasks',
    description: 'List and filter the planning tasks for a BuildTrack project.',
    inputSchema: {
      projectId: z.string().trim().min(1).describe('BuildTrack project ID'),
      query: z.string().trim().optional().describe('Search task name, description, or tags'),
      status: z.string().trim().optional().describe('Exact task status, such as To Do, In Progress, or Completed'),
      priority: z.string().trim().optional().describe('Exact priority, such as Low, Medium, High, or Critical'),
      assignee: z.string().trim().optional().describe('Exact assignee name'),
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
      projectId: z.string().trim().min(1).describe('BuildTrack project ID'),
      name: z.string().trim().min(1).describe('Task name'),
      description: z.string().trim().optional().describe('Task description'),
      priority: z.string().trim().optional().describe('Priority; defaults to Medium'),
      status: z.string().trim().optional().describe('Status; defaults to To Do'),
      assignee: z.string().trim().optional().describe('Assignee name'),
      dueDate: z.string().trim().optional().describe('Due date in YYYY-MM-DD format'),
      estimatedHours: z.number().nonnegative().optional().describe('Estimated effort in hours'),
      tags: z.array(z.string().trim().min(1)).optional().describe('Task tags'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async (input) => toolResult(await api.post('/project-tasks', input)));

  server.registerTool('update_project_task', {
    title: 'Update BuildTrack Project Task',
    description: 'Update task details or status. Marking a task Completed or Done also triggers the configured Cliq completion report.',
    inputSchema: {
      taskId: z.string().trim().min(1).describe('BuildTrack project task ID'),
      name: z.string().trim().min(1).optional().describe('Task name'),
      description: z.string().trim().optional().describe('Task description'),
      priority: z.string().trim().optional().describe('Task priority'),
      status: z.string().trim().optional().describe('Task status'),
      assignee: z.string().trim().optional().describe('Assignee name'),
      dueDate: z.string().trim().optional().describe('Due date in YYYY-MM-DD format'),
      estimatedHours: z.number().nonnegative().nullable().optional().describe('Estimated effort in hours'),
      tags: z.array(z.string().trim().min(1)).optional().describe('Task tags'),
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
      taskId: z.string().trim().min(1).describe('BuildTrack project task ID'),
      message: z.string().trim().min(1).describe('Comment text'),
      author: z.string().trim().optional().describe('Comment author; defaults to Cliq User'),
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
      projectId: z.string().trim().min(1).describe('BuildTrack project ID'),
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  }, async ({ projectId }) => toolResult(await api.get('/milestones', { projectId })));

  return server;
}