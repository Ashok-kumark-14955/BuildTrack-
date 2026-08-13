import axios from 'axios';
import type { Drawing, Task, Comment, Project, ActivityItem, Milestone, ProjectTask, ProjectTaskComment } from './types';
import { resolveFileUrl as resolveIdb } from './utils/imageStorage';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_BASE}/api` });

/**
 * Resolve any stored file URL to something a browser can render:
 *   - "idb://<key>"  → data URL fetched from IndexedDB (async)
 *   - "data:..."     → returned as-is
 *   - "/uploads/..." → prepend API_BASE (legacy paths)
 *   - http(s)://...  → returned as-is
 *
 * This is the ASYNC version. Use `fileUrlSync` only for backwards-compat
 * code that doesn't yet support async display.
 */
export const fileUrlAsync = (path: string): Promise<string> => {
  if (!path) return Promise.resolve('');
  return resolveIdb(path).then((v) => v ?? '');
};

/**
 * Synchronous helper for non-idb URLs (legacy /uploads/... or data:/http paths).
 * idb:// URLs are NOT supported here — use fileUrlAsync for those.
 */
export const fileUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('idb://')) {
    return path; // caller must use fileUrlAsync to resolve idb://
  }
  return `${API_BASE}${path}`;
};

export interface ProjectListParams {
  q?: string;
  status?: string;
  managerName?: string;
  archived?: 'true' | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
}

export const ProjectsAPI = {
  list: (params?: ProjectListParams) => api.get<Project[]>('/projects', { params }).then((r) => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data).then((r) => r.data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  setArchived: (id: string, archived: boolean) => api.patch<Project>(`/projects/${id}/archive`, { archived }).then((r) => r.data),
  remove: (id: string, force = false) => api.delete(`/projects/${id}`, { params: force ? { force: 'true' } : {} }),
};

export interface ProjectTaskListParams {
  projectId?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  q?: string;
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'name';
  sortDir?: 'asc' | 'desc';
}

export const ProjectTasksAPI = {
  list: (params?: ProjectTaskListParams) => api.get<ProjectTask[]>('/project-tasks', { params }).then((r) => r.data),
  get: (id: string) => api.get<ProjectTask>(`/project-tasks/${id}`).then((r) => r.data),
  create: (data: Partial<ProjectTask>) => api.post<ProjectTask>('/project-tasks', data).then((r) => r.data),
  update: (id: string, data: Partial<ProjectTask>) => api.put<ProjectTask>(`/project-tasks/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/project-tasks/${id}`),
  comments: (id: string) => api.get<ProjectTaskComment[]>(`/project-tasks/${id}/comments`).then((r) => r.data),
  addComment: (id: string, data: Partial<ProjectTaskComment>) =>
    api.post<ProjectTaskComment>(`/project-tasks/${id}/comments`, data).then((r) => r.data),
};

/**
 * Returns the backend proxy URL to stream a drawing's file by drawing ID.
 * Used by DrawingCanvas to load the drawing image from the server.
 */
export const drawingFileProxyUrl = (drawingId: string): string =>
  `${API_BASE}/api/drawings/${drawingId}/file`;

export const DrawingsAPI = {
  list: (projectId?: string) =>
    api.get<Drawing[]>('/drawings', { params: projectId ? { projectId } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Drawing>(`/drawings/${id}`).then((r) => r.data),
  upload: (form: FormData) => api.post<Drawing>('/drawings/upload', form).then((r) => r.data),
  update: (id: string, data: Partial<Drawing>) => api.patch<Drawing>(`/drawings/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/drawings/${id}`),
};

export const TasksAPI = {
  list: (drawingId?: string) =>
    api.get<Task[]>('/tasks', { params: drawingId ? { drawingId } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Task>(`/tasks/${id}`).then((r) => r.data),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data).then((r) => r.data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/tasks/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/tasks/${id}`),
  comments: (id: string) => api.get<Comment[]>(`/tasks/${id}/comments`).then((r) => r.data),
  addComment: (id: string, data: Partial<Comment>) =>
    api.post<Comment>(`/tasks/${id}/comments`, data).then((r) => r.data),
  addPhotoComment: (id: string, photo: File, data: Partial<Comment>) => {
    const form = new FormData();
    form.append('photo', photo);
    if (data.author) form.append('author', data.author);
    if (data.message) form.append('message', data.message);
    return api.post<Comment>(`/tasks/${id}/comments`, form).then((r) => r.data);
  },
  deleteComment: (taskId: string, commentId: string) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),
};

export const MilestonesAPI = {
  list: (projectId?: string) =>
    api.get<Milestone[]>('/milestones', { params: projectId ? { projectId } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Milestone>(`/milestones/${id}`).then((r) => r.data),
  tasks: (id: string) => api.get<Task[]>(`/milestones/${id}/tasks`).then((r) => r.data),
  create: (data: Partial<Milestone>) => api.post<Milestone>('/milestones', data).then((r) => r.data),
  update: (id: string, data: Partial<Milestone>) => api.put<Milestone>(`/milestones/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/milestones/${id}`),
};

export const ActivityAPI = {
  list: (drawingId?: string) =>
    api.get<ActivityItem[]>('/activity', { params: drawingId ? { drawingId } : {} }).then((r) => r.data),
};

export const CliqAPI = {
  sendReport: (taskId: string) =>
    api.post<{ ok: boolean; message: string }>('/cliq-report', { taskId }).then((r) => r.data),
};

export const GeocodeAPI = {
  reverse: (lat: number, lng: number) =>
    api.get<{ displayName: string }>('/geocode/reverse', { params: { lat, lng } }).then((r) => r.data.displayName),
};

// ─── Self-contained Custom Modules ───────────────────────────────────────────

export interface CustomField {
  id: string;        // uuid generated on client
  label: string;     // display name e.g. "Status"
  type: 'text' | 'name' | 'select' | 'multiuser' | 'number' | 'date' | 'attachment'; // field type
  options?: string[]; // for type="select"
}

export interface CustomModule {
  id: string;
  name: string;
  fields: CustomField[];   // parsed from JSON string
  createdAt: string;
  updatedAt: string;
}

export interface CustomRecord {
  id: string;
  moduleId: string;
  data: Record<string, any>; // parsed from JSON string
  createdAt: string;
  updatedAt: string;
}

// Helper to parse fields/data JSON that the backend stores as strings
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
  // Module definitions
  list: () =>
    api.get<any[]>('/custom-modules').then((r) => r.data.map(parseModuleRow)),
  create: (name: string, fields: CustomField[] = []) =>
    api.post<any>('/custom-modules', { name, fields }).then((r) => parseModuleRow(r.data)),
  update: (id: string, patch: { name?: string; fields?: CustomField[] }) =>
    api.put<any>(`/custom-modules/${id}`, patch).then((r) => parseModuleRow(r.data)),
  remove: (id: string) =>
    api.delete(`/custom-modules/${id}`),

  // Records within a module
  listRecords: (moduleId: string) =>
    api.get<any[]>(`/custom-modules/${moduleId}/records`).then((r) => r.data.map(parseRecordRow)),
  createRecord: (moduleId: string, data: Record<string, any>) =>
    api.post<any>(`/custom-modules/${moduleId}/records`, data).then((r) => parseRecordRow(r.data)),
  updateRecord: (moduleId: string, recordId: string, data: Record<string, any>) =>
    api.put<any>(`/custom-modules/${moduleId}/records/${recordId}`, data).then((r) => parseRecordRow(r.data)),
  deleteRecord: (moduleId: string, recordId: string) =>
    api.delete(`/custom-modules/${moduleId}/records/${recordId}`),

  // Upload a file attachment to Catalyst Stratus; returns { url, name, type, size }
  uploadAttachment: (file: File): Promise<{ url: string; name: string; type: string; size: number }> => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ url: string; name: string; type: string; size: number }>(
      '/custom-modules/upload-attachment',
      form,
    ).then((r) => r.data);
  },
};

// ─── Zoho Projects — Custom Modules (via Task Lists + Tasks) ─────────────────

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

const ZOHO_PORTAL_ID = '60082733574';
const ZOHO_PROJECT_ID = '476111000000075843';
const zpBase = `/zoho-projects/portals/${ZOHO_PORTAL_ID}/projects/${ZOHO_PROJECT_ID}`;

export const ZohoProjectsAPI = {
  // Task Lists (Custom Module sections)
  listTasklists: () =>
    api.get<{ tasklists: ZohoTaskList[] }>(`${zpBase}/tasklists`).then((r) => r.data.tasklists || []),

  createTasklist: (name: string) =>
    api.post(`${zpBase}/tasklists`, { name }).then((r) => r.data),

  deleteTasklist: (tasklistId: string) =>
    api.delete(`${zpBase}/tasklists/${tasklistId}`).then((r) => r.data),

  // Tasks (records within a module)
  listTasks: (tasklistId: string) =>
    api.get<{ tasks: ZohoTask[] }>(`${zpBase}/tasklists/${tasklistId}/tasks`).then((r) => r.data.tasks || []),

  createTask: (tasklistId: string, data: { name: string; description?: string; due_date?: string }) =>
    api.post<{ tasks: ZohoTask[] }>(`${zpBase}/tasklists/${tasklistId}/tasks`, data).then((r) => r.data),

  updateTask: (taskId: string, data: { name?: string; description?: string; due_date?: string; status?: string }) =>
    api.put(`/zoho-projects/portals/${ZOHO_PORTAL_ID}/projects/${ZOHO_PROJECT_ID}/tasks/${taskId}`, data).then((r) => r.data),

  deleteTask: (taskId: string) =>
    api.delete(`/zoho-projects/portals/${ZOHO_PORTAL_ID}/projects/${ZOHO_PROJECT_ID}/tasks/${taskId}`).then((r) => r.data),
};
