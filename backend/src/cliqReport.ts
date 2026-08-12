// Posts task-completion reports through an authorized Zoho MCP server.
// Configure ZOHO_CLIQ_MCP_URL and ZOHO_CLIQ_CHANNEL. The legacy incoming
// webhook remains a fallback when MCP is not configured.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as db from './db';
import { projectStats } from './routes/projects';

export interface TaskLike {
  id: string;
  name: string;
  drawingId?: string;
  projectId?: string;
  assignedTo?: string;
  category?: string;
  dueDate?: string;
  priority?: string;
}

function isCliqChannelUniqueNameTool(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return normalized.includes('cliq')
    && normalized.includes('message')
    && normalized.includes('channel')
    && normalized.includes('unique_name')
    && (normalized.includes('send') || normalized.includes('post'));
}

function isCliqReportingConfigured(): boolean {
  return Boolean(
    (process.env.ZOHO_CLIQ_MCP_URL && process.env.ZOHO_CLIQ_CHANNEL)
    || process.env.CLIQ_REPORT_WEBHOOK_URL,
  );
}

async function sendCliqText(text: string): Promise<void> {
  const mcpUrl = process.env.ZOHO_CLIQ_MCP_URL;
  const channel = process.env.ZOHO_CLIQ_CHANNEL;

  if (mcpUrl || channel) {
    if (!mcpUrl || !channel) {
      throw new Error('ZOHO_CLIQ_MCP_URL and ZOHO_CLIQ_CHANNEL must both be configured');
    }

    const client = new Client({ name: 'BuildTrack Cliq Reporter', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));

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
          ? result.content as Array<{ type?: string; text?: string }>
          : [];
        const detail = content
          .filter((item) => item.type === 'text')
          .map((item) => item.text || '')
          .join(' ');
        throw new Error(detail || 'Zoho Cliq MCP tool returned an error');
      }
      return;
    } finally {
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
export function buildCliqPayload(params: {
  taskName: string;
  projectName?: string;
  drawingName?: string;
  assignedTo?: string;
  category?: string;
  dueDate?: string;
  priority?: string;
  doneCount?: number;
  taskCount?: number;
  progress?: number;
}): object {
  const {
    taskName, projectName, drawingName, assignedTo,
    category, dueDate, priority, doneCount, taskCount, progress,
  } = params;

  // Rich Cliq card format (Incoming Webhook card payload)
  const fields: string[] = [];

  if (projectName) fields.push(`📁 *Project:* ${projectName}`);
  if (drawingName) fields.push(`📐 *Drawing:* ${drawingName}`);
  if (assignedTo)  fields.push(`👷 *Completed by:* ${assignedTo}`);
  if (category)    fields.push(`🔧 *Category:* ${category}`);
  if (priority)    fields.push(`⚑ *Priority:* ${priority}`);
  if (dueDate)     fields.push(`📅 *Due Date:* ${dueDate}`);

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
export async function reportTaskCompletion(req: any, task: TaskLike): Promise<void> {
  if (!isCliqReportingConfigured()) return;

  try {
    let projectId = task.projectId;
    let drawing: any = null;

    if (!projectId && task.drawingId) {
      drawing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [task.drawingId]);
      projectId = drawing?.projectId;
    }

    const project: any = projectId
      ? await db.get(req, 'SELECT * FROM projects WHERE id = ?', [projectId])
      : null;

    const stats = project ? await projectStats(req, project.id) : null;

    const payload = buildCliqPayload({
      taskName:    task.name,
      projectName: project?.name,
      drawingName: drawing?.name,
      assignedTo:  task.assignedTo,
      category:    task.category,
      dueDate:     task.dueDate,
      priority:    task.priority,
      doneCount:   stats?.doneCount,
      taskCount:   stats?.taskCount,
      progress:    stats?.progress,
    });

    await sendCliqText((payload as { text: string }).text);

    console.log(`[Cliq] Report sent for task "${task.name}"`);
  } catch (err) {
    // Reporting failures must never affect the task-update response.
    console.error('[Cliq] Report failed:', err);
  }
}

/**
 * Manual report endpoint — called from the frontend when the user clicks
 * "Send Report to Cliq" on a specific task.  Returns { ok, message }.
 */
export async function sendManualCliqReport(
  req: any,
  taskId: string,
): Promise<{ ok: boolean; message: string; notConfigured?: boolean }> {
  if (!isCliqReportingConfigured()) {
    return {
      ok: false,
      message:
        'Cliq not configured. Please set ZOHO_CLIQ_MCP_URL and ZOHO_CLIQ_CHANNEL in your Catalyst environment variables.',
      notConfigured: true,
    };
  }

  try {
    const task: any = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      // Try project_tasks table as fallback
      const pt: any = await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [taskId]);
      if (!pt) return { ok: false, message: 'Task not found' };

      const project: any = await db.get(req, 'SELECT * FROM projects WHERE id = ?', [pt.projectId]);
      const payload = buildCliqPayload({
        taskName:    pt.name,
        projectName: project?.name,
        assignedTo:  pt.assignee,
        priority:    pt.priorityLevel ?? pt.priority,
        dueDate:     pt.dueDate,
      });
      await sendCliqText((payload as { text: string }).text);
      return { ok: true, message: 'Report sent to Zoho Cliq successfully!' };
    }

    // Drawing task path
    let drawing: any = null;
    let projectId = task.projectId;
    if (!projectId && task.drawingId) {
      drawing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [task.drawingId]);
      projectId = drawing?.projectId;
    }
    const project: any = projectId
      ? await db.get(req, 'SELECT * FROM projects WHERE id = ?', [projectId])
      : null;
    const stats = project ? await projectStats(req, project.id) : null;

    const payload = buildCliqPayload({
      taskName:    task.name,
      projectName: project?.name,
      drawingName: drawing?.name,
      assignedTo:  task.assignedTo,
      category:    task.category,
      dueDate:     task.dueDate,
      priority:    task.priorityLevel ?? task.priority,
      doneCount:   stats?.doneCount,
      taskCount:   stats?.taskCount,
      progress:    stats?.progress,
    });

    await sendCliqText((payload as { text: string }).text);
    return { ok: true, message: 'Report sent to Zoho Cliq successfully!' };
  } catch (err: any) {
    return { ok: false, message: `Failed to send report: ${err?.message ?? err}` };
  }
}
