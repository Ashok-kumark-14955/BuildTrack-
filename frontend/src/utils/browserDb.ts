/**
 * browserDb.ts
 *
 * Full browser-side IndexedDB database replacing all backend API calls.
 * Stores: projects, drawings, tasks, milestones, activity, projectTasks,
 *         taskComments, projectTaskComments
 *
 * All IDs are UUIDs generated via crypto.randomUUID().
 * Drawing SVG files are stored in the "images" IDB store (same as imageStorage.ts)
 * under the key "drawing-<id>" and referenced via "idb://drawing-<id>".
 */

const DB_NAME = 'buildtrack-db';
const DB_VERSION = 6; // v6: wall task quality refresh + sortOrder force-apply

const STORES = [
  'projects',
  'drawings',
  'tasks',
  'milestones',
  'activity',
  'projectTasks',
  'taskComments',
  'projectTaskComments',
  'images',          // reuse same store as imageStorage.ts
  'meta',            // key-value meta (e.g. seeded flag)
] as const;

type StoreName = typeof STORES[number];

// ─── DB open ────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

/** Stores that are plain key-value (no keyPath — key supplied manually) */
const KV_STORES = new Set(['images', 'meta']);

export function openBuildTrackDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = (e.target as IDBOpenDBRequest).transaction!;
      for (const name of STORES) {
        const wantsKeyPath = !KV_STORES.has(name);
        if (db.objectStoreNames.contains(name)) {
          // A store created by an earlier schema version may have the wrong
          // keyPath (e.g. "images" created as in-line keys instead of KV).
          // Recreate it so put() semantics match KV_STORES.
          const hasKeyPath = tx.objectStore(name).keyPath !== null;
          if (hasKeyPath !== wantsKeyPath) {
            db.deleteObjectStore(name);
            db.createObjectStore(name, wantsKeyPath ? { keyPath: 'id' } : undefined);
          }
        } else {
          db.createObjectStore(name, wantsKeyPath ? { keyPath: 'id' } : undefined);
        }
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

// ─── Generic CRUD helpers ───────────────────────────────────────────────────

async function dbAll<T>(store: StoreName): Promise<T[]> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut<T extends { id: string }>(store: StoreName, item: T): Promise<T> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store: StoreName, id: string): Promise<void> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Meta helpers ────────────────────────────────────────────────────────────

export async function metaGet(key: string): Promise<string | undefined> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const req = tx.objectStore('meta').get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function metaSet(key: string, value: string): Promise<void> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const req = tx.objectStore('meta').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Image store (same as imageStorage.ts but via this DB) ──────────────────

export async function saveDrawingFile(key: string, dataUrl: string): Promise<void> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    const req = tx.objectStore('images').put(dataUrl, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadDrawingFile(key: string): Promise<string | null> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly');
    const req = tx.objectStore('images').get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDrawingFile(key: string): Promise<void> {
  const db = await openBuildTrackDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    const req = tx.objectStore('images').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ─── Projects ────────────────────────────────────────────────────────────────

import type { Project, Drawing, Task, Milestone, ActivityItem, Comment, ProjectTask, ProjectTaskComment } from '../types';

export async function projectsAll(): Promise<Project[]> {
  const rows = await dbAll<Project>('projects');
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function projectGet(id: string): Promise<Project | undefined> {
  return dbGet('projects', id);
}

export async function projectCreate(data: Partial<Project>): Promise<Project> {
  const now = nowIso();
  const project: Project = {
    id: newId(),
    name: data.name ?? 'Untitled Project',
    code: data.code ?? '',
    description: data.description ?? '',
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    status: data.status ?? 'Planning',
    managerName: data.managerName ?? '',
    archived: 0,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut('projects', project);
  await activityLog(null, null, `Project "${project.name}" created`);
  return project;
}

export async function projectUpdate(id: string, data: Partial<Project>): Promise<Project> {
  const existing = await dbGet<Project>('projects', id);
  if (!existing) throw new Error(`Project ${id} not found`);
  const updated: Project = { ...existing, ...data, id, updatedAt: nowIso() };
  await dbPut('projects', updated);
  return updated;
}

export async function projectDelete(id: string): Promise<void> {
  await dbDelete('projects', id);
  // cascade delete drawings and their tasks
  const drawings = (await dbAll<Drawing>('drawings')).filter((d) => d.projectId === id);
  for (const d of drawings) {
    await drawingDelete(d.id);
  }
  const milestones = (await dbAll<Milestone>('milestones')).filter((m) => m.projectId === id);
  for (const m of milestones) await dbDelete('milestones', m.id);
  const pts = (await dbAll<ProjectTask>('projectTasks')).filter((t) => t.projectId === id);
  for (const t of pts) await dbDelete('projectTasks', t.id);
  // Note: if a sample project is deleted, ensureSampleData() will restore it on next startup.
}

// ─── Drawings ────────────────────────────────────────────────────────────────

export async function drawingsAll(projectId?: string): Promise<Drawing[]> {
  const rows = await dbAll<Drawing>('drawings');
  const filtered = projectId ? rows.filter((d) => d.projectId === projectId) : rows;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function drawingGet(id: string): Promise<Drawing | undefined> {
  return dbGet('drawings', id);
}

export async function drawingCreate(data: Partial<Drawing> & { svgContent?: string }): Promise<Drawing> {
  const id = newId();
  const idbKey = `drawing-${id}`;
  let fileUrl = data.fileUrl ?? '';

  // If inline SVG content provided, store it in IDB
  if (data.svgContent) {
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(data.svgContent)))}`;
    await saveDrawingFile(idbKey, svgDataUrl);
    fileUrl = `idb://${idbKey}`;
  }

  const now = nowIso();
  const drawing: Drawing = {
    id,
    projectId: data.projectId ?? '',
    milestoneId: data.milestoneId ?? null,
    name: data.name ?? 'Untitled Drawing',
    fileUrl,
    fileType: 'image',
    gridCols: data.gridCols ?? 5,
    gridRows: data.gridRows ?? 4,
    columnPositions: data.columnPositions ?? {},
    deletedNodes: data.deletedNodes ?? [],
    customBeams: data.customBeams ?? [],
    deletedBeams: data.deletedBeams ?? [],
    columnLabels: data.columnLabels ?? {},
    elementTypeLabels: data.elementTypeLabels ?? {},
    annotations: data.annotations ?? [],
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    createdAt: data.createdAt ?? now,
  };
  await dbPut('drawings', drawing);
  await activityLog(null, id, `Drawing "${drawing.name}" added`);
  return drawing;
}

export async function drawingUpdate(id: string, data: Record<string, unknown>): Promise<Drawing> {
  const existing = await dbGet<Drawing>('drawings', id);
  if (!existing) throw new Error(`Drawing ${id} not found`);

  let updated: Drawing = { ...existing };

  if (data.resetColumnPositions) {
    updated = { ...updated, columnPositions: {} };
  }
  if (data.elementTypeLabels && typeof data.elementTypeLabels === 'object') {
    updated.elementTypeLabels = { ...updated.elementTypeLabels, ...(data.elementTypeLabels as Record<string,string>) };
  }
  if (data.columnLabels && typeof data.columnLabels === 'object') {
    updated.columnLabels = { ...updated.columnLabels, ...(data.columnLabels as Record<string,string>) };
  }
  // Merge (not replace) — callers send single-code deltas (e.g. from a grid-segment
  // drag), and a plain overwrite here would wipe out every other calibrated point.
  if (data.columnPositions && typeof data.columnPositions === 'object') {
    updated.columnPositions = { ...updated.columnPositions, ...(data.columnPositions as Record<string, { x: number; y: number }>) };
  }
  // deletedNodes patch: { [code]: true } adds the code; { [code]: false } removes it.
  if (data.resetDeletedNodes) {
    updated.deletedNodes = [];
  } else if (data.deletedNodes && typeof data.deletedNodes === 'object') {
    let codes = [...(updated.deletedNodes ?? [])];
    for (const [code, remove] of Object.entries(data.deletedNodes as Record<string, boolean>)) {
      codes = remove ? (codes.includes(code) ? codes : [...codes, code]) : codes.filter((c) => c !== code);
    }
    updated.deletedNodes = codes;
  }
  // deletedBeams patch: { [beamId]: true } adds the id; { [beamId]: false } removes it.
  if (data.resetDeletedBeams) {
    updated.deletedBeams = [];
  } else if (data.deletedBeams && typeof data.deletedBeams === 'object') {
    let ids = [...(updated.deletedBeams ?? [])];
    for (const [beamId, remove] of Object.entries(data.deletedBeams as Record<string, boolean>)) {
      ids = remove ? (ids.includes(beamId) ? ids : [...ids, beamId]) : ids.filter((b) => b !== beamId);
    }
    updated.deletedBeams = ids;
  }
  // customBeams patch: { add?: {from,to}[], remove?: {from,to}[] }
  if (data.resetCustomBeams) {
    updated.customBeams = [];
  } else if (data.customBeams && typeof data.customBeams === 'object') {
    let beams = [...(updated.customBeams ?? [])];
    const { add, remove } = data.customBeams as { add?: { from: string; to: string }[]; remove?: { from: string; to: string }[] };
    const sameBeam = (a: { from: string; to: string }, b: { from: string; to: string }) =>
      (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
    if (add) {
      for (const b of add) {
        if (!beams.some((c) => sameBeam(c, b))) beams.push(b);
      }
    }
    if (remove) {
      beams = beams.filter((c) => !remove.some((r) => sameBeam(c, r)));
    }
    updated.customBeams = beams;
  }
  // annotations patch: { add?: Annotation[], remove?: string[] (ids) }
  if (data.resetAnnotations) {
    updated.annotations = [];
  } else if (data.annotations && typeof data.annotations === 'object') {
    let annotations = [...(updated.annotations ?? [])];
    const { add, remove } = data.annotations as { add?: typeof annotations; remove?: string[] };
    if (add) annotations.push(...add);
    if (remove) annotations = annotations.filter((a) => !remove.includes(a.id));
    updated.annotations = annotations;
  }
  // Generic field updates
  const plain = ['name','milestoneId','gridCols','gridRows','lat','lng','sortOrder'] as const;
  for (const key of plain) {
    if (key in data) (updated as any)[key] = data[key];
  }

  await dbPut('drawings', updated);
  return updated;
}

export async function drawingDelete(id: string): Promise<void> {
  const drawing = await dbGet<Drawing>('drawings', id);
  await dbDelete('drawings', id);
  if (drawing?.fileUrl?.startsWith('idb://')) {
    await deleteDrawingFile(drawing.fileUrl.slice('idb://'.length));
  }
  // cascade delete tasks
  const tasks = (await dbAll<Task>('tasks')).filter((t) => t.drawingId === id);
  for (const t of tasks) {
    await dbDelete('tasks', t.id);
    const comments = (await dbAll<Comment>('taskComments')).filter((c) => c.taskId === t.id);
    for (const c of comments) await dbDelete('taskComments', c.id);
  }
}

/** Upload a drawing file from a FormData (mirrors the old backend upload endpoint). */
export async function drawingUpload(form: FormData): Promise<Drawing> {
  const file = form.get('file') as File | null;
  const name = (form.get('name') as string) || file?.name || 'Drawing';
  const projectId = (form.get('projectId') as string) || '';
  const milestoneId = (form.get('milestoneId') as string) || null;

  if (!file) throw new Error('No file provided');

  const id = newId();
  const idbKey = `drawing-${id}`;
  const dataUrl = await fileToDataUrl(file);
  await saveDrawingFile(idbKey, dataUrl);

  const now = nowIso();
  const drawing: Drawing = {
    id,
    projectId,
    milestoneId: milestoneId || null,
    name,
    fileUrl: `idb://${idbKey}`,
    fileType: 'image',
    gridCols: 5,
    gridRows: 4,
    columnPositions: {},
    deletedNodes: [],
    customBeams: [],
    deletedBeams: [],
    columnLabels: {},
    elementTypeLabels: {},
    annotations: [],
    lat: null,
    lng: null,
    createdAt: now,
  };
  await dbPut('drawings', drawing);
  await activityLog(null, id, `Drawing "${drawing.name}" uploaded`);
  return drawing;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function tasksAll(drawingId?: string): Promise<Task[]> {
  const rows = await dbAll<Task>('tasks');
  const filtered = drawingId ? rows.filter((t) => t.drawingId === drawingId) : rows;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function taskGet(id: string): Promise<Task | undefined> {
  return dbGet('tasks', id);
}

export async function taskCreate(data: Partial<Task>): Promise<Task> {
  const now = nowIso();
  const task: Task = {
    id: newId(),
    drawingId: data.drawingId ?? '',
    milestoneId: data.milestoneId ?? null,
    elementType: data.elementType ?? 'column',
    elementId: data.elementId ?? '',
    gridCode: data.gridCode ?? '',
    name: data.name ?? 'New Task',
    description: data.description ?? '',
    category: data.category ?? 'Structural',
    priority: data.priority ?? 'Medium',
    assignedTo: data.assignedTo ?? '',
    startDate: data.startDate ?? '',
    dueDate: data.dueDate ?? '',
    status: data.status ?? 'Assigned',
    progress: data.progress ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut('tasks', task);
  await activityLog(task.id, task.drawingId ?? null, `Task "${task.name}" created`);
  return task;
}

export async function taskUpdate(id: string, data: Partial<Task>): Promise<Task> {
  const existing = await dbGet<Task>('tasks', id);
  if (!existing) throw new Error(`Task ${id} not found`);
  const updated: Task = { ...existing, ...data, id, updatedAt: nowIso() };
  await dbPut('tasks', updated);
  await activityLog(id, updated.drawingId ?? null, `Task "${updated.name}" updated`);
  return updated;
}

export async function taskDelete(id: string): Promise<void> {
  await dbDelete('tasks', id);
  const comments = (await dbAll<Comment>('taskComments')).filter((c) => c.taskId === id);
  for (const c of comments) await dbDelete('taskComments', c.id);
}

// ─── Task Comments ────────────────────────────────────────────────────────────

export async function taskCommentsAll(taskId: string): Promise<Comment[]> {
  const rows = await dbAll<Comment>('taskComments');
  return rows.filter((c) => c.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function taskCommentCreate(taskId: string, data: Partial<Comment>): Promise<Comment> {
  const comment: Comment = {
    id: newId(),
    taskId,
    author: data.author ?? 'User',
    message: data.message ?? '',
    photoUrl: data.photoUrl ?? null,
    createdAt: nowIso(),
  };
  await dbPut('taskComments', comment);
  return comment;
}

export async function taskCommentDelete(commentId: string): Promise<void> {
  await dbDelete('taskComments', commentId);
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function milestonesAll(projectId?: string): Promise<Milestone[]> {
  const rows = await dbAll<Milestone>('milestones');
  const filtered = projectId ? rows.filter((m) => m.projectId === projectId) : rows;
  return filtered.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function milestoneGet(id: string): Promise<Milestone | undefined> {
  return dbGet('milestones', id);
}

export async function milestoneCreate(data: Partial<Milestone>): Promise<Milestone> {
  const now = nowIso();
  const milestone: Milestone = {
    id: newId(),
    projectId: data.projectId ?? '',
    name: data.name ?? 'Milestone',
    description: data.description ?? '',
    dueDate: data.dueDate ?? '',
    status: data.status ?? 'Active',
    createdAt: now,
    updatedAt: now,
  };
  await dbPut('milestones', milestone);
  return milestone;
}

export async function milestoneUpdate(id: string, data: Partial<Milestone>): Promise<Milestone> {
  const existing = await dbGet<Milestone>('milestones', id);
  if (!existing) throw new Error(`Milestone ${id} not found`);
  const updated: Milestone = { ...existing, ...data, id, updatedAt: nowIso() };
  await dbPut('milestones', updated);
  return updated;
}

export async function milestoneDelete(id: string): Promise<void> {
  await dbDelete('milestones', id);
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export async function activityAll(): Promise<ActivityItem[]> {
  const rows = await dbAll<ActivityItem>('activity');
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}

async function activityLog(taskId: string | null, drawingId: string | null, message: string): Promise<void> {
  const item: ActivityItem = {
    id: newId(),
    taskId,
    drawingId,
    message,
    createdAt: nowIso(),
  };
  await dbPut('activity', item);
}

// ─── Project Tasks ────────────────────────────────────────────────────────────

export async function projectTasksAll(projectId?: string): Promise<ProjectTask[]> {
  const rows = await dbAll<ProjectTask>('projectTasks');
  const filtered = projectId ? rows.filter((t) => t.projectId === projectId) : rows;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function projectTaskGet(id: string): Promise<ProjectTask | undefined> {
  return dbGet('projectTasks', id);
}

export async function projectTaskCreate(data: Partial<ProjectTask>): Promise<ProjectTask> {
  const now = nowIso();
  const task: ProjectTask = {
    id: newId(),
    projectId: data.projectId ?? '',
    milestoneId: data.milestoneId ?? null,
    name: data.name ?? 'New Task',
    description: data.description ?? '',
    priority: data.priority ?? 'Medium',
    status: data.status ?? 'To Do',
    assignee: data.assignee ?? '',
    dueDate: data.dueDate ?? '',
    estimatedHours: data.estimatedHours ?? null,
    tags: data.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await dbPut('projectTasks', task);
  return task;
}

export async function projectTaskUpdate(id: string, data: Partial<ProjectTask>): Promise<ProjectTask> {
  const existing = await dbGet<ProjectTask>('projectTasks', id);
  if (!existing) throw new Error(`ProjectTask ${id} not found`);
  const updated: ProjectTask = { ...existing, ...data, id, updatedAt: nowIso() };
  await dbPut('projectTasks', updated);
  return updated;
}

export async function projectTaskDelete(id: string): Promise<void> {
  await dbDelete('projectTasks', id);
}

export async function projectTaskCommentsAll(taskId: string): Promise<ProjectTaskComment[]> {
  const rows = await dbAll<ProjectTaskComment>('projectTaskComments');
  return rows.filter((c) => c.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function projectTaskCommentCreate(taskId: string, data: Partial<ProjectTaskComment>): Promise<ProjectTaskComment> {
  const comment: ProjectTaskComment = {
    id: newId(),
    taskId,
    author: data.author ?? 'User',
    message: data.message ?? '',
    createdAt: nowIso(),
  };
  await dbPut('projectTaskComments', comment);
  return comment;
}
