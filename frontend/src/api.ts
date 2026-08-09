import axios from 'axios';
import type { Drawing, Task, Comment, Project, ActivityItem, Milestone, ProjectTask, ProjectTaskComment } from './types';
import { resolveFileUrl as resolveIdb } from './utils/imageStorage';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

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

/**
 * Given a drawing id, return the backend proxy URL that streams the drawing
 * file through the AppSail backend (avoids CORS issues with Stratus).
 */
export const drawingFileProxyUrl = (drawingId: string) =>
  `${API_BASE}/api/drawings/${drawingId}/file`;

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
