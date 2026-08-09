import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DrawingsAPI, TasksAPI, ActivityAPI, ProjectsAPI, MilestonesAPI } from './api';
import type { ActivityItem, Drawing, Milestone, Project, Task } from './types';

interface AppState {
  projects: Project[];
  drawings: Drawing[];
  tasks: Task[];
  milestones: Milestone[];
  activity: ActivityItem[];
  currentDrawingId: string | null;
  selectedElementId: string | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  setCurrentDrawingId: (id: string | null) => void;
  setSelectedElementId: (id: string | null) => void;
  refreshDrawings: () => Promise<void | Drawing[]>;
  refreshTasks: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshMilestones: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  deleteDrawing: (id: string) => Promise<void>;
  createMilestone: (data: Partial<Milestone>) => Promise<Milestone>;
  updateMilestone: (id: string, data: Partial<Milestone>) => Promise<Milestone>;
  deleteMilestone: (id: string) => Promise<void>;
  currentDrawing: Drawing | undefined;
  tasksForCurrentDrawing: Task[];
  focusElementRequest: string | null;
  requestFocusElement: (id: string | null) => void;
  patchDrawingColumnPositions: (drawingId: string, code: string, x: number, y: number) => void;
  resetDrawingColumnPositions: (drawingId: string) => Promise<void>;
  patchDrawingColumnLabel: (drawingId: string, code: string, label: string) => Promise<void>;
  patchDrawingElementTypeLabel: (drawingId: string, elementType: string, label: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [focusElementRequest, setFocusElementRequest] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const refreshDrawings = useCallback(async () => {
    const list = await DrawingsAPI.list();
    setDrawings(list);
    // Only auto-select the first drawing when there is no current selection at all
    if (!currentDrawingId && list.length > 0) setCurrentDrawingId(list[0].id);
    return list; // allow callers to act on the fresh list
  }, [currentDrawingId]);

  // When activeProjectId changes, fetch the latest drawings and immediately
  // switch currentDrawingId to the first drawing that belongs to that project.
  // We re-fetch here so that newly-uploaded drawings for this project are
  // always visible even if the in-memory list is stale.
  useEffect(() => {
    if (!activeProjectId) return;
    DrawingsAPI.list().then((list) => {
      setDrawings(list);
      const projectDrawings = list.filter((d) => d.projectId === activeProjectId);
      if (projectDrawings.length > 0) {
        setCurrentDrawingId(projectDrawings[0].id);
      } else {
        setCurrentDrawingId(null);
      }
    }).catch(() => {});
  }, [activeProjectId]);

  /** Patch a single drawing's columnPositions in local state without a full reload.
   *  Used by calibration drags so the image never unmounts/reloads. */
  const patchDrawingColumnPositions = useCallback((drawingId: string, code: string, x: number, y: number) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const updated = { ...d, columnPositions: { ...d.columnPositions, [code]: { x, y } } };
        return updated;
      })
    );
  }, []);

  /** Clear all manual column-position overrides for a drawing, reverting to the evenly-spaced default grid. */
  const resetDrawingColumnPositions = useCallback(async (drawingId: string) => {
    setDrawings((prev) => prev.map((d) => (d.id === drawingId ? { ...d, columnPositions: {} } : d)));
    await DrawingsAPI.update(drawingId, { resetColumnPositions: true } as any);
  }, []);

  /** Set a custom type label (e.g. "column" → "Anchor Bolt", "beam" → "Rafter"). Persists to backend. */
  const patchDrawingElementTypeLabel = useCallback(async (drawingId: string, elementType: string, label: string) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const newLabels = { ...(d.elementTypeLabels ?? {}), [elementType]: label };
        if (!label) delete newLabels[elementType];
        return { ...d, elementTypeLabels: newLabels };
      })
    );
    await DrawingsAPI.update(drawingId, { elementTypeLabels: { [elementType]: label } } as any);
  }, []);

  /** Set a custom display label for a column (e.g. "A1" → "P1"). Persists to backend. */
  const patchDrawingColumnLabel = useCallback(async (drawingId: string, code: string, label: string) => {
    // Optimistic local update
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const newLabels = { ...(d.columnLabels ?? {}), [code]: label };
        if (!label) delete newLabels[code]; // empty label = remove override
        return { ...d, columnLabels: newLabels };
      })
    );
    // Persist
    await DrawingsAPI.update(drawingId, { columnLabels: { [code]: label } } as any);
  }, []);

  const refreshTasks = useCallback(async () => {
    const list = await TasksAPI.list();
    setTasks(list);
  }, []);

  const refreshMilestones = useCallback(async () => {
    const list = await MilestonesAPI.list();
    setMilestones(list);
  }, []);

  const refreshActivity = useCallback(async () => {
    const list = await ActivityAPI.list();
    setActivity(list);
  }, []);

  const refreshProjects = useCallback(async () => {
    const list = await ProjectsAPI.list();
    setProjects(list);
  }, []);

  useEffect(() => {
    ProjectsAPI.list().then(setProjects).catch(() => {});
    refreshDrawings();
    refreshTasks();
    refreshMilestones();
    refreshActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = useCallback(async (data: Partial<Task>) => {
    const task = await TasksAPI.create(data);
    setTasks((prev) => [task, ...prev]);
    refreshActivity();
    return task;
  }, [refreshActivity]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const updated = await TasksAPI.update(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    refreshActivity();
    return updated;
  }, [refreshActivity]);

  const deleteTask = useCallback(async (id: string) => {
    await TasksAPI.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    refreshActivity();
  }, [refreshActivity]);

  /** Delete a drawing and all its tasks from local state and backend. */
  const deleteDrawing = useCallback(async (id: string) => {
    await DrawingsAPI.remove(id);
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    setTasks((prev) => prev.filter((t) => t.drawingId !== id));
    setCurrentDrawingId((prev) => (prev === id ? null : prev));
  }, []);

  const createMilestone = useCallback(async (data: Partial<Milestone>) => {
    const milestone = await MilestonesAPI.create(data);
    setMilestones((prev) => [...prev, milestone]);
    return milestone;
  }, []);

  const updateMilestone = useCallback(async (id: string, data: Partial<Milestone>) => {
    const updated = await MilestonesAPI.update(id, data);
    setMilestones((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const deleteMilestone = useCallback(async (id: string) => {
    await MilestonesAPI.remove(id);
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    // Unlink tasks locally
    setTasks((prev) => prev.map((t) => t.milestoneId === id ? { ...t, milestoneId: null } : t));
  }, []);

  const requestFocusElement = useCallback((id: string | null) => {
    setFocusElementRequest(id);
  }, []);

  const currentDrawing = useMemo(() => drawings.find((d) => d.id === currentDrawingId), [drawings, currentDrawingId]);
  const tasksForCurrentDrawing = useMemo(
    () => tasks.filter((t) => t.drawingId === currentDrawingId),
    [tasks, currentDrawingId]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value: AppState = useMemo(() => ({
    projects,
    drawings,
    tasks,
    milestones,
    activity,
    currentDrawingId,
    selectedElementId,
    activeProjectId,
    setActiveProjectId,
    setCurrentDrawingId,
    setSelectedElementId,
    refreshDrawings,
    refreshTasks,
    refreshActivity,
    refreshProjects,
    refreshMilestones,
    createTask,
    updateTask,
    deleteTask,
    deleteDrawing,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    currentDrawing,
    tasksForCurrentDrawing,
    focusElementRequest,
    requestFocusElement,
    patchDrawingColumnPositions,
    resetDrawingColumnPositions,
    patchDrawingColumnLabel,
    patchDrawingElementTypeLabel,
  }), [
    projects, drawings, tasks, milestones, activity,
    currentDrawingId, selectedElementId,
    setCurrentDrawingId, setSelectedElementId,
    refreshDrawings, refreshTasks, refreshActivity, refreshProjects, refreshMilestones,
    createTask, updateTask, deleteTask, deleteDrawing,
    createMilestone, updateMilestone, deleteMilestone,
    currentDrawing, tasksForCurrentDrawing,
    focusElementRequest, requestFocusElement,
    patchDrawingColumnPositions, resetDrawingColumnPositions,
    patchDrawingColumnLabel, patchDrawingElementTypeLabel,
    activeProjectId,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
