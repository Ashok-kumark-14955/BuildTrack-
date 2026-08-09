/**
 * api.ts — Browser-only implementation (no backend server required).
 *
 * All data is stored in IndexedDB via browserDb.ts.
 * The same API surface is exported so the rest of the app (AppContext, pages)
 * does not need any changes.
 */

import type { Drawing, Task, Comment, Project, ActivityItem, Milestone, ProjectTask, ProjectTaskComment } from './types';
import { resolveFileUrl as resolveIdb } from './utils/imageStorage';
import {
  projectsAll, projectGet, projectCreate, projectUpdate, projectDelete,
  drawingsAll, drawingGet, drawingUpdate, drawingDelete, drawingUpload,
  tasksAll, taskGet, taskCreate, taskUpdate, taskDelete,
  taskCommentsAll, taskCommentCreate, taskCommentDelete,
  milestonesAll, milestoneGet, milestoneCreate, milestoneUpdate, milestoneDelete,
  activityAll,
  projectTasksAll, projectTaskGet, projectTaskCreate, projectTaskUpdate, projectTaskDelete,
  projectTaskCommentsAll, projectTaskCommentCreate,
} from './utils/browserDb';

export { resolveIdb };

// ─── File URL helpers ─────────────────────────────────────────────────────────

/**
 * Resolve any stored file URL to something a browser can render:
 *   - "idb://<key>"  → data URL fetched from IndexedDB (async)
 *   - "data:..."     → returned as-is
 *   - http(s)://...  → returned as-is
 */
export const fileUrlAsync = (path: string): Promise<string> => {
  if (!path) return Promise.resolve('');
  return resolveIdb(path).then((v) => v ?? '');
};

/** Sync helper — idb:// URLs are NOT resolved here. */
export const fileUrl = (path: string): string => {
  if (!path) return '';
  return path; // all URLs are self-contained (data: or idb://)
};

/** No-op in browser-only mode — kept for API compatibility. */
export const drawingFileProxyUrl = (drawingId: string): string =>
  `idb://drawing-${drawingId}`;

// ─── Projects API ─────────────────────────────────────────────────────────────

export interface ProjectListParams {
  q?: string;
  status?: string;
  managerName?: string;
  archived?: 'true' | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
}

export const ProjectsAPI = {
  list: async (params?: ProjectListParams): Promise<Project[]> => {
    let rows = await projectsAll();
    // filter archived unless explicitly requested
    if (!params?.archived) rows = rows.filter((p) => !p.archived);
    if (params?.status) rows = rows.filter((p) => p.status === params.status);
    if (params?.q) {
      const q = params.q.toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return rows;
  },
  get: (id: string): Promise<Project | undefined> => projectGet(id),
  create: (data: Partial<Project>): Promise<Project> => projectCreate(data),
  update: (id: string, data: Partial<Project>): Promise<Project> => projectUpdate(id, data),
  setArchived: (id: string, archived: boolean): Promise<Project> => projectUpdate(id, { archived: archived ? 1 : 0 }),
  remove: (id: string, _force = false): Promise<void> => projectDelete(id),
};

// ─── Project Tasks API ────────────────────────────────────────────────────────

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
  list: (params?: ProjectTaskListParams): Promise<ProjectTask[]> =>
    projectTasksAll(params?.projectId),
  get: (id: string): Promise<ProjectTask | undefined> => projectTaskGet(id),
  create: (data: Partial<ProjectTask>): Promise<ProjectTask> => projectTaskCreate(data),
  update: (id: string, data: Partial<ProjectTask>): Promise<ProjectTask> => projectTaskUpdate(id, data),
  remove: (id: string): Promise<void> => projectTaskDelete(id),
  comments: (id: string): Promise<ProjectTaskComment[]> => projectTaskCommentsAll(id),
  addComment: (id: string, data: Partial<ProjectTaskComment>): Promise<ProjectTaskComment> =>
    projectTaskCommentCreate(id, data),
};

// ─── Drawings API ─────────────────────────────────────────────────────────────

export const DrawingsAPI = {
  list: (projectId?: string): Promise<Drawing[]> => drawingsAll(projectId),
  get: (id: string): Promise<Drawing | undefined> => drawingGet(id),
  upload: (form: FormData): Promise<Drawing> => drawingUpload(form),
  update: (id: string, data: Partial<Drawing>): Promise<Drawing> =>
    drawingUpdate(id, data as Record<string, unknown>),
  remove: (id: string): Promise<void> => drawingDelete(id),
};

// ─── Tasks API ────────────────────────────────────────────────────────────────

export const TasksAPI = {
  list: (drawingId?: string): Promise<Task[]> => tasksAll(drawingId),
  get: (id: string): Promise<Task | undefined> => taskGet(id),
  create: (data: Partial<Task>): Promise<Task> => taskCreate(data),
  update: (id: string, data: Partial<Task>): Promise<Task> => taskUpdate(id, data),
  remove: (id: string): Promise<void> => taskDelete(id),
  comments: (id: string): Promise<Comment[]> => taskCommentsAll(id),
  addComment: (id: string, data: Partial<Comment>): Promise<Comment> => taskCommentCreate(id, data),
  addPhotoComment: async (id: string, photo: File, data: Partial<Comment>): Promise<Comment> => {
    // Convert photo to data URL and store as part of comment
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(photo);
    });
    return taskCommentCreate(id, { ...data, photoUrl: dataUrl });
  },
  deleteComment: (_taskId: string, commentId: string): Promise<void> => taskCommentDelete(commentId),
};

// ─── Milestones API ───────────────────────────────────────────────────────────

export const MilestonesAPI = {
  list: (projectId?: string): Promise<Milestone[]> => milestonesAll(projectId),
  get: (id: string): Promise<Milestone | undefined> => milestoneGet(id),
  tasks: (id: string): Promise<Task[]> => tasksAll().then((ts) => ts.filter((t) => t.milestoneId === id)),
  create: (data: Partial<Milestone>): Promise<Milestone> => milestoneCreate(data),
  update: (id: string, data: Partial<Milestone>): Promise<Milestone> => milestoneUpdate(id, data),
  remove: (id: string): Promise<void> => milestoneDelete(id),
};

// ─── Activity API ─────────────────────────────────────────────────────────────

export const ActivityAPI = {
  list: (_drawingId?: string): Promise<ActivityItem[]> => activityAll(),
};

// ─── Cliq API (no-op in browser-only mode) ────────────────────────────────────

export const CliqAPI = {
  sendReport: async (_taskId: string): Promise<{ ok: boolean; message: string }> => ({
    ok: false,
    message: 'Cliq integration is not available in offline mode.',
  }),
};

// ─── Geocode API ──────────────────────────────────────────────────────────────

export const GeocodeAPI = {
  reverse: async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const json = await res.json();
      return (json as { display_name?: string }).display_name ?? `${lat}, ${lng}`;
    } catch {
      return `${lat}, ${lng}`;
    }
  },
};

// ─── Legacy axios instance shim (unused but kept for compatibility) ────────────
// Some deeply-nested code may still import `api` directly. Export a minimal shim.
export const api = {
  get: () => Promise.reject(new Error('Direct axios calls are disabled in browser-only mode')),
  post: () => Promise.reject(new Error('Direct axios calls are disabled in browser-only mode')),
  put: () => Promise.reject(new Error('Direct axios calls are disabled in browser-only mode')),
  patch: () => Promise.reject(new Error('Direct axios calls are disabled in browser-only mode')),
  delete: () => Promise.reject(new Error('Direct axios calls are disabled in browser-only mode')),
};
