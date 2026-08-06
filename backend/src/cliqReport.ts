// Posts a task-completion report to a Zoho Cliq channel via an Incoming
// Webhook. Configure CLIQ_REPORT_WEBHOOK_URL as an env var (Cliq channel ->
// Settings -> Integrations -> Incoming Webhooks). No-op if unset, so this
// never blocks or breaks task updates when the webhook isn't configured.
import * as db from './db';
import { projectStats } from './routes/projects';

interface TaskLike {
  id: string;
  name: string;
  drawingId?: string;
  projectId?: string;
  assignedTo?: string;
  category?: string;
}

export async function reportTaskCompletion(req: any, task: TaskLike) {
  const webhookUrl = process.env.CLIQ_REPORT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    let projectId = task.projectId;
    let drawing: any = null;
    if (!projectId && task.drawingId) {
      drawing = await db.get(req, 'SELECT * FROM drawings WHERE id = ?', [task.drawingId]);
      projectId = drawing?.projectId;
    }
    const project: any = projectId ? await db.get(req, 'SELECT * FROM projects WHERE id = ?', [projectId]) : null;
    const stats = project ? await projectStats(req, project.id) : null;

    const lines = [
      `*Task Completed:* ${task.name}`,
      project ? `*Project:* ${project.name}` : null,
      drawing ? `*Drawing:* ${drawing.name}` : null,
      task.assignedTo ? `*Assignee:* ${task.assignedTo}` : null,
      stats ? `*Project Progress:* ${stats.doneCount}/${stats.taskCount} tasks (${stats.progress}%)` : null,
    ].filter(Boolean);

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    });
  } catch (err) {
    // Reporting failures must never affect the task-update response.
    console.error('Cliq report failed:', err);
  }
}
