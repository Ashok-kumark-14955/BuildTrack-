import axios from 'axios';
import type { Drawing, Task, Comment, Project, ActivityItem, Milestone, ProjectTask, ProjectTaskComment } from './types';
import { resolveFileUrl as resolveIdb } from './utils/imageStorage';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// In production (Catalyst Slate), this is set to the construction-api Function URL.
// In dev, VITE_API_BASE is empty and calls are proxied via vite.config.ts.
// The Function URL pattern: https://<project-domain>.catalystserverless.in/server/construction-api
const API_BASE: string = import.meta.env.VITE_API_BASE || '';

export const api = axios.create({ baseURL: `${API_BASE}/api` });

/**
 * Resolve any stored file URL to something a browser can render:
 *   - "idb://<key>"  → data URL fetched from IndexedDB (async)
 *   - "data:..."     → returned as-is
 *   - "/uploads/..." → prepend API_BASE (legacy paths)
 *   - http(s)://...  → returned as-is
 */
export const fileUrlAsync = (path: string): Promise<string> => {
  if (!path) return Promise.resolve('');
  return resolveIdb(path).then((v) => v ?? '');
};

/** Synchronous helper for non-idb URLs. */
export const fileUrl = (path: string) => {
  if (!path) return '';
  if (
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('idb://')
  ) {
    return path;
  }
  return `${API_BASE}${path}`;
};

// ─── Drawing file proxy URL ───────────────────────────────────────────────────
/**
 * Returns the Function proxy URL to stream a drawing's file by drawing ID.
 * Used by DrawingCanvas to load the drawing image.
 * The projectId query param is required by the Function backend.
 */
export const drawingFileProxyUrl = (drawingId: string, projectId?: string): string => {
  const base = `${API_BASE}/api/drawings/${drawingId}/file`;
  return projectId ? `${base}?projectId=${encodeURIComponent(projectId)}` : base;
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectListParams {
  q?: string;
  status?: string;
  managerName?: string;
  archived?: 'true' | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
}

export const ProjectsAPI = {
  list: (_params?: ProjectListParams) =>
    api.get<Project[]>('/projects').then((r) => r.data),
  get: (id: string) =>
    api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: Partial<Project>) =>
    api.post<Project>('/projects', data).then((r) => r.data),
  update: (id: string, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  setArchived: (id: string, archived: boolean) =>
    api.patch<Project>(`/projects/${id}/archive`, { archived }).then((r) => r.data),
  remove: (id: string, force?: boolean) =>
    api.delete(`/projects/${id}`, force ? { params: { force: 'true' } } : undefined),
};

// ─── Milestones ───────────────────────────────────────────────────────────────

export const MilestonesAPI = {
  list: (projectId?: string) =>
    api
      .get<Milestone[]>('/milestones', { params: projectId ? { projectId } : {} })
      .then((r) => r.data),
  get: (id: string) =>
    api.get<Milestone>(`/milestones/${id}`).then((r) => r.data),
  tasks: (id: string) =>
    api.get<Task[]>(`/milestones/${id}/tasks`).then((r) => r.data),
  create: (data: Partial<Milestone>) =>
    api.post<Milestone>('/milestones', data).then((r) => r.data),
  update: (id: string, data: Partial<Milestone>) =>
    api.put<Milestone>(`/milestones/${id}`, data).then((r) => r.data),
  remove: (id: string, projectId: string) =>
    api.delete(`/milestones/${id}`, { params: { projectId } }),
};

// ─── Drawings ─────────────────────────────────────────────────────────────────

export const DrawingsAPI = {
  list: (projectId?: string) =>
    api
      .get<Drawing[]>('/drawings', { params: projectId ? { projectId } : {} })
      .then((r) => r.data),
  get: (id: string, projectId: string) =>
    api
      .get<Drawing>(`/drawings/${id}`, { params: { projectId } })
      .then((r) => r.data),
  /** Upload a drawing file (multipart/form-data) */
  upload: (form: FormData) =>
    api.post<Drawing>('/drawings', form).then((r) => r.data),
  update: (id: string, data: Partial<Drawing> & { projectId?: string }) =>
    api.put<Drawing>(`/drawings/${id}`, data).then((r) => r.data),
  remove: (id: string, projectId: string) =>
    api.delete(`/drawings/${id}`, { params: { projectId } }),
};

// ─── Drawing Tasks ────────────────────────────────────────────────────────────

export const TasksAPI = {
  list: (params: { drawingId?: string; projectId?: string; milestoneId?: string }) =>
    api.get<Task[]>('/tasks', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<Task>(`/tasks/${id}`).then((r) => r.data),
  create: (data: Partial<Task> & { projectId: string; drawingId: string }) =>
    api.post<Task>('/tasks', data).then((r) => r.data),
  update: (id: string, data: Partial<Task> & { projectId: string }) =>
    api.put<Task>(`/tasks/${id}`, data).then((r) => r.data),
  remove: (id: string, projectId: string) =>
    api.delete(`/tasks/${id}`, { params: { projectId } }),
  comments: (id: string) =>
    api.get<Comment[]>(`/tasks/${id}/comments`).then((r) => r.data),
  addComment: (id: string, data: Partial<Comment> & { projectId?: string }) =>
    api.post<Comment>(`/tasks/${id}/comments`, data).then((r) => r.data),
  addPhotoComment: (id: string, photo: File, data: Partial<Comment> & { projectId?: string }) => {
    const form = new FormData();
    form.append('photo', photo);
    if (data.projectId) form.append('projectId', data.projectId);
    if (data.author) form.append('author', data.author);
    if (data.message) form.append('text', data.message);
    return api.post<Comment>(`/tasks/${id}/photo-comments`, form).then((r) => r.data);
  },
  deleteComment: (_taskId: string, _commentId: string) =>
    // Zoho Projects doesn't expose a delete-comment endpoint; no-op for now
    Promise.resolve(),
};

// ─── Project Tasks ────────────────────────────────────────────────────────────

export interface ProjectTaskListParams {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  milestoneId?: string;
  q?: string;
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'name';
  sortDir?: 'asc' | 'desc';
}

export const ProjectTasksAPI = {
  list: (params?: ProjectTaskListParams) =>
    api.get<ProjectTask[]>('/project-tasks', { params }).then((r) => r.data),
  get: (id: string) =>
    api.get<ProjectTask>(`/project-tasks/${id}`).then((r) => r.data),
  create: (data: Partial<ProjectTask> & { projectId: string }) =>
    api.post<ProjectTask>('/project-tasks', data).then((r) => r.data),
  update: (id: string, data: Partial<ProjectTask> & { projectId: string }) =>
    api.put<ProjectTask>(`/project-tasks/${id}`, data).then((r) => r.data),
  remove: (id: string, projectId: string) =>
    api.delete(`/project-tasks/${id}`, { params: { projectId } }),
  comments: (id: string) =>
    api.get<ProjectTaskComment[]>(`/project-tasks/${id}/comments`).then((r) => r.data),
  addComment: (id: string, data: Partial<ProjectTaskComment> & { projectId: string }) =>
    api.post<ProjectTaskComment>(`/project-tasks/${id}/comments`, data).then((r) => r.data),
};

// ─── Activity ─────────────────────────────────────────────────────────────────

export const ActivityAPI = {
  list: (drawingId?: string) =>
    api
      .get<ActivityItem[]>('/activity', { params: drawingId ? { drawingId } : {} })
      .then((r) => r.data),
};

// ─── Custom Modules ───────────────────────────────────────────────────────────

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'name' | 'select' | 'multiuser' | 'number' | 'date' | 'attachment';
  options?: string[];
}

export interface CustomModule {
  id: string;
  name: string;
  fields: CustomField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomRecord {
  id: string;
  moduleId: string;
  data: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

function parseModuleRow(row: any): CustomModule {
  return {
    ...row,
    fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : (row.fields ?? []),
  };
}

function parseRecordRow(row: any): CustomRecord {
  let data: Record<string, any> = {};
  try {
    data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data ?? {});
  } catch {
    data = {};
  }
  return { ...row, data };
}

export const CustomModulesAPI = {
  list: (projectId: string) =>
    api.get<any[]>('/custom-modules', { params: { projectId } }).then((r) => r.data.map(parseModuleRow)),
  create: (projectId: string, name: string, fields: CustomField[] = []) =>
    api.post<any>('/custom-modules', { projectId, name, fields }).then((r) => parseModuleRow(r.data)),
  update: (projectId: string, id: string, patch: { name?: string; fields?: CustomField[] }) =>
    api.put<any>(`/custom-modules/${id}`, { projectId, ...patch }).then((r) => parseModuleRow(r.data)),
  remove: (projectId: string, id: string) =>
    api.delete(`/custom-modules/${id}`, { params: { projectId } }),

  listRecords: (projectId: string, moduleId: string) =>
    api.get<any[]>(`/custom-modules/${moduleId}/records`, { params: { projectId } }).then((r) => r.data.map(parseRecordRow)),
  createRecord: (projectId: string, moduleId: string, data: Record<string, any>) =>
    api.post<any>(`/custom-modules/${moduleId}/records`, { projectId, data }).then((r) => parseRecordRow(r.data)),
  updateRecord: (projectId: string, moduleId: string, recordId: string, data: Record<string, any>) =>
    api.put<any>(`/custom-modules/${moduleId}/records/${recordId}`, { projectId, data }).then((r) => parseRecordRow(r.data)),
  deleteRecord: (projectId: string, moduleId: string, recordId: string) =>
    api.delete(`/custom-modules/${moduleId}/records/${recordId}`, { params: { projectId } }),

  uploadAttachment: (projectId: string, moduleId: string, recordId: string, file: File): Promise<{ url: string; name: string }> => {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    return api
      .post<{ url: string; name: string }>(`/custom-modules/${moduleId}/records/${recordId}/attachments`, form)
      .then((r) => r.data);
  },
};

// ─── Seed ─────────────────────────────────────────────────────────────────────

export const SeedAPI = {
  seed: () => api.post('/seed').then((r) => r.data),
};

// ─── Legacy aliases (kept for backward-compat with AppContext / pages) ─────────
// ZohoBackboneAPI now routes to the same Function endpoints as ProjectsAPI.

export const ZohoBackboneAPI = {
  listProjects: () => ProjectsAPI.list(),
  getProject: (id: string) => ProjectsAPI.get(id),
  createProject: (data: Partial<Project>) => ProjectsAPI.create(data),
  updateProject: (id: string, data: Partial<Project>) => ProjectsAPI.update(id, data),
  removeProject: (id: string) => ProjectsAPI.remove(id),

  listMilestones: (projectId: string) => MilestonesAPI.list(projectId),
  createMilestone: (projectId: string, data: Partial<Milestone>) =>
    MilestonesAPI.create({ ...data, projectId }),
  updateMilestone: (_projectId: string, milestoneId: string, data: Partial<Milestone>) =>
    MilestonesAPI.update(milestoneId, data),
  removeMilestone: (projectId: string, milestoneId: string) =>
    MilestonesAPI.remove(milestoneId, projectId),

  listTasks: (projectId: string) =>
    TasksAPI.list({ projectId }),
  createTask: (_projectId: string, data: Partial<Task> & { projectId: string; drawingId: string }) =>
    TasksAPI.create(data),
  updateTask: (_projectId: string, taskId: string, data: Partial<Task> & { projectId: string }) =>
    TasksAPI.update(taskId, data),
  removeTask: (projectId: string, taskId: string) =>
    TasksAPI.remove(taskId, projectId),

  seed: () => SeedAPI.seed(),
};

// ─── Cliq API (stub — Zoho Projects doesn't expose a public Cliq endpoint) ────
export const CliqAPI = {
  sendReport: (_taskId: string): Promise<{ ok: boolean; message: string }> =>
    Promise.resolve({ ok: false, message: 'Cliq reporting not available in Functions mode' }),
};

// ─── Geocode API ──────────────────────────────────────────────────────────────
// Calls the AppSail backend's reverse-geocoding proxy (Nominatim).
export const GeocodeAPI = {
  reverse: (lat: number, lng: number): Promise<string> =>
    api
      .get<{ displayName: string }>('/geocode/reverse', { params: { lat, lng } })
      .then((r) => r.data.displayName || '')
      .catch(() => ''),
};

// ─── Zoho Projects (legacy direct portal/project references) ─────────────────
// Kept for ZohoProjects.tsx page backward compatibility.

export interface ZohoTaskList {
  id: string;
  id_string: string;
  name: string;
  task_count?: { closed: number; open: number };
}

export interface ZohoTask {
  id: string;
  id_string: string;
  name: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  status?: { name: string; type: string; color_code?: string };
  tasklist?: { id: string; id_string: string; name: string };
  percent_complete?: string;
  priority?: string;
  key?: string;
}

// ZohoProjectsAPI is now a thin wrapper over CustomModulesAPI since
// all custom module data lives in Zoho Projects task lists via the Function.
// The projectId must be passed via the activeProjectId in context.
export const ZohoProjectsAPI = {
  listTasklists: (projectId: string) =>
    api.get<any>('/custom-modules', { params: { projectId } })
      .then((r) => (r.data as any[]).map((m: any) => ({ id: m.id, id_string: m.id, name: m.name }))),

  createTasklist: (projectId: string, name: string) =>
    api.post('/custom-modules', { projectId, name, fields: [] }).then((r) => r.data),

  deleteTasklist: (projectId: string, tasklistId: string) =>
    api.delete(`/custom-modules/${tasklistId}`, { params: { projectId } }).then((r) => r.data),

  listTasks: (projectId: string, tasklistId: string) =>
    api.get<any[]>(`/custom-modules/${tasklistId}/records`, { params: { projectId } })
      .then((r) => r.data.map((rec: any) => ({
        id: rec.id,
        id_string: rec.id,
        name: Object.values(rec.data || {})[0] || rec.id,
        description: JSON.stringify(rec.data || {}),
        completed: false,
      }))),

  createTask: (projectId: string, tasklistId: string, data: { name: string; description?: string }) =>
    api.post(`/custom-modules/${tasklistId}/records`, { projectId, data }).then((r) => r.data),

  updateTask: (projectId: string, tasklistId: string, taskId: string, data: Record<string, any>) =>
    api.put(`/custom-modules/${tasklistId}/records/${taskId}`, { projectId, data }).then((r) => r.data),

  deleteTask: (projectId: string, tasklistId: string, taskId: string) =>
    api.delete(`/custom-modules/${tasklistId}/records/${taskId}`, { params: { projectId } }).then((r) => r.data),
};
