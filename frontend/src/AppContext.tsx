import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DrawingsAPI, TasksAPI, ActivityAPI, ZohoBackboneAPI, MilestonesAPI, ProjectTasksAPI } from './api';
import type { ActivityItem, CatalystUser, Drawing, Milestone, Project, ProjectTask, Task } from './types';
import { ensureSampleData } from './utils/seedData';

interface AppState {
  user: CatalystUser | null;
  signOut: () => void;
  projects: Project[];
  drawings: Drawing[];
  tasks: Task[];
  projectTasks: ProjectTask[];
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
  refreshProjectTasks: () => Promise<void>;
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
  /** Mark a single grid node as deleted (hidden). Pass restore=true to un-delete. */
  deleteDrawingNode: (drawingId: string, code: string, restore?: boolean) => Promise<void>;
  /** Mark a single auto-derived beam as deleted (hidden). Pass restore=true to un-delete. */
  deleteDrawingBeam: (drawingId: string, beamId: string, restore?: boolean) => Promise<void>;
  /** Add a custom beam between two grid codes. */
  addCustomBeam: (drawingId: string, from: string, to: string) => Promise<void>;
  /** Remove a custom beam by its two grid codes. */
  removeCustomBeam: (drawingId: string, from: string, to: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children, user }: { children: ReactNode; user: CatalystUser | null }) {
  const signOut = useCallback(() => {
    // catalyst.auth.signOut() requires the Web SDK (loaded in index.html) and
    // a redirect URL — it crashes without one and does not return a promise.
    (window as any).catalyst?.auth?.signOut(window.location.origin);
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [focusElementRequest, setFocusElementRequest] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectIdRaw] = useState<string | null>(
    () => localStorage.getItem('activeProjectId')
  );

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdRaw(id);
    if (id) localStorage.setItem('activeProjectId', id);
    else localStorage.removeItem('activeProjectId');
  }, []);

  const refreshDrawings = useCallback(async () => {
    // Pass activeProjectId so the Function can filter by project.
    // If no project selected yet, fetch all (projectId omitted — backend returns empty, but
    // we still fall back correctly during the init sequence).
    const pid = activeProjectId ?? undefined;
    const list = await DrawingsAPI.list(pid);
    setDrawings(list);
    // Only auto-select the first drawing when there is no current selection at all.
    // Also sync activeProjectId so the sidebar shows the correct project's drawings.
    if (!currentDrawingId && list.length > 0) {
      setCurrentDrawingId(list[0].id);
      // Only set if not already persisted (don't override localStorage value)
      setActiveProjectIdRaw((prev) => {
        const next = prev ?? list[0].projectId ?? null;
        if (next && !prev) localStorage.setItem('activeProjectId', next);
        return next;
      });
    }
    return list; // allow callers to act on the fresh list
  }, [currentDrawingId, activeProjectId]);

  // When activeProjectId changes, fetch the latest drawings and auto-select the
  // first drawing for that project — but ONLY when the user explicitly switched
  // projects (not on initial app load). We track the previous value to detect
  // the difference: null → someId is initialisation; someId → otherId is a switch.
  const prevActiveProjectId = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProjectId) {
      prevActiveProjectId.current = null;
      return;
    }
    if (prevActiveProjectId.current === activeProjectId) return;

    const wasUserSwitch = prevActiveProjectId.current !== null;
    prevActiveProjectId.current = activeProjectId;

    DrawingsAPI.list().then((list) => {
      setDrawings(list);
      // Only auto-jump to first drawing when user explicitly chose a project,
      // not on the silent initial-load auto-selection.
      if (wasUserSwitch) {
        const projectDrawings = list.filter((d) => d.projectId === activeProjectId);
        if (projectDrawings.length > 0) {
          setCurrentDrawingId(projectDrawings[0].id);
        } else {
          setCurrentDrawingId(null);
        }
      }
    }).catch(() => {});
  }, [activeProjectId]);

  /** Patch a single drawing's columnPositions in local state without a full reload.
   *  Used by calibration drags so the image never unmounts/reloads. */
  const patchDrawingColumnPositions = useCallback((drawingId: string, code: string, x: number, y: number) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        return { ...d, columnPositions: { ...d.columnPositions, [code]: { x, y } } };
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
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const newLabels = { ...(d.columnLabels ?? {}), [code]: label };
        if (!label) delete newLabels[code];
        return { ...d, columnLabels: newLabels };
      })
    );
    await DrawingsAPI.update(drawingId, { columnLabels: { [code]: label } } as any);
  }, []);

  const refreshTasks = useCallback(async () => {
    // Tasks are scoped to a drawing; without a drawingId we skip the fetch.
    // Individual pages (DrawingPage) load tasks directly when they need them.
    // Here we just clear stale tasks so the context stays consistent.
    setTasks([]);
  }, []);

  const refreshProjectTasks = useCallback(async () => {
    if (!activeProjectId) { setProjectTasks([]); return; }
    const list = await ProjectTasksAPI.list({ projectId: activeProjectId });
    setProjectTasks(list);
  }, [activeProjectId]);

  const refreshMilestones = useCallback(async () => {
    if (!activeProjectId) { setMilestones([]); return; }
    const list = await MilestonesAPI.list(activeProjectId);
    setMilestones(list);
  }, [activeProjectId]);

  const refreshActivity = useCallback(async () => {
    const list = await ActivityAPI.list();
    setActivity(list);
  }, []);

  const refreshProjects = useCallback(async () => {
    const list = await ZohoBackboneAPI.listProjects();
    setProjects(list);
  }, []);

  useEffect(() => {
    // Always ensure sample data is present in IndexedDB before loading state.
    console.log('[AppContext] Starting data initialization...');
    ensureSampleData().then(() => {
      console.log('[AppContext] ensureSampleData completed successfully');

      // Load everything in parallel, then auto-correct activeProjectId if needed.
      Promise.all([
        ZohoBackboneAPI.listProjects().then((p) => {
          console.log('[AppContext] Projects loaded:', p.length);
          setProjects(p);
          return p;
        }).catch((e) => { console.error('[AppContext] Projects load failed:', e); return [] as typeof projects; }),
        DrawingsAPI.list().then((list) => {
          console.log('[AppContext] Drawings loaded:', list.length);
          setDrawings(list);
          return list;
        }),
        refreshTasks().then(() => console.log('[AppContext] Tasks loaded')),
        refreshProjectTasks().then(() => console.log('[AppContext] ProjectTasks loaded')),
        refreshMilestones().then(() => console.log('[AppContext] Milestones loaded')),
        refreshActivity().then(() => console.log('[AppContext] Activity loaded')),
      ]).then(([loadedProjects, loadedDrawings]) => {
        // Auto-correct activeProjectId: if the stored value has no drawings,
        // switch to the first project that does, or just the first project.
        // Determine the best activeProjectId based on which project has drawings
        const drawingProjectIds = new Set((loadedDrawings as any[]).map((d: any) => d.projectId));
        const storedId = localStorage.getItem('activeProjectId');

        let chosenId: string | null = null;

        if (storedId && drawingProjectIds.has(storedId)) {
          // Stored project has drawings — keep it
          chosenId = storedId;
        } else {
          // Pick the first project that has drawings, falling back to first project
          const projectsArr = loadedProjects as any[];
          const best =
            projectsArr.find((p: any) => drawingProjectIds.has(p.id)) ??
            projectsArr[0] ??
            null;
          chosenId = best?.id ?? null;
        }

        if (chosenId) {
          localStorage.setItem('activeProjectId', chosenId);
          // Auto-select first drawing for that project
          const firstDrawing = (loadedDrawings as any[]).find((d: any) => d.projectId === chosenId);
          if (firstDrawing) {
            setCurrentDrawingId(firstDrawing.id);
          }
        } else {
          localStorage.removeItem('activeProjectId');
        }

        console.log('[AppContext] Auto-corrected activeProjectId →', chosenId);
        setActiveProjectIdRaw(chosenId);
      });
    }).catch((err) => {
      // Even if ensureSampleData fails, still try to load what's in the DB
      console.error('[AppContext] ensureSampleData FAILED:', err);
      ZohoBackboneAPI.listProjects().then(setProjects).catch(() => {});
      refreshDrawings();
      refreshTasks();
      refreshMilestones();
      refreshActivity();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = useCallback(async (data: Partial<Task>) => {
    const task = await TasksAPI.create(data as Partial<Task> & { projectId: string; drawingId: string });
    setTasks((prev) => [task, ...prev]);
    refreshActivity();
    return task;
  }, [refreshActivity]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const updated = await TasksAPI.update(id, data as Partial<Task> & { projectId: string });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    refreshActivity();
    return updated;
  }, [refreshActivity]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    await TasksAPI.remove(id, (task as any)?.projectId ?? activeProjectId ?? '');
    setTasks((prev) => prev.filter((t) => t.id !== id));
    refreshActivity();
  }, [refreshActivity, tasks, activeProjectId]);

  /** Delete a drawing and all its tasks from local state and backend. */
  const deleteDrawing = useCallback(async (id: string) => {
    const drawing = drawings.find((d) => d.id === id);
    await DrawingsAPI.remove(id, (drawing as any)?.projectId ?? activeProjectId ?? '');
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
    await MilestonesAPI.remove(id, activeProjectId ?? '');
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    setTasks((prev) => prev.map((t) => t.milestoneId === id ? { ...t, milestoneId: null } : t));
  }, []);

  const requestFocusElement = useCallback((id: string | null) => {
    setFocusElementRequest(id);
  }, []);

  /** Mark or un-mark a single grid node as deleted. Optimistic local update + backend persist. */
  const deleteDrawingNode = useCallback(async (drawingId: string, code: string, restore = false) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const existing = d.deletedNodes ?? [];
        const next = restore
          ? existing.filter((c) => c !== code)
          : existing.includes(code) ? existing : [...existing, code];
        return { ...d, deletedNodes: next };
      })
    );
    await DrawingsAPI.update(drawingId, { deletedNodes: { [code]: !restore } } as any);
  }, []);

  /** Mark or un-mark a single auto-derived beam as deleted. Optimistic local update + backend persist. */
  const deleteDrawingBeam = useCallback(async (drawingId: string, beamId: string, restore = false) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const existing = d.deletedBeams ?? [];
        const next = restore
          ? existing.filter((b) => b !== beamId)
          : existing.includes(beamId) ? existing : [...existing, beamId];
        return { ...d, deletedBeams: next };
      })
    );
    await DrawingsAPI.update(drawingId, { deletedBeams: { [beamId]: !restore } } as any);
  }, []);

  /** Add a custom beam between two nodes. Optimistic local update + backend persist. */
  const addCustomBeam = useCallback(async (drawingId: string, from: string, to: string) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        const existing = d.customBeams ?? [];
        const alreadyExists = existing.some(
          (b) => (b.from === from && b.to === to) || (b.from === to && b.to === from)
        );
        if (alreadyExists) return d;
        return { ...d, customBeams: [...existing, { from, to }] };
      })
    );
    await DrawingsAPI.update(drawingId, { customBeams: { add: [{ from, to }] } } as any);
  }, []);

  /** Remove a custom beam between two nodes. Optimistic local update + backend persist. */
  const removeCustomBeam = useCallback(async (drawingId: string, from: string, to: string) => {
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drawingId) return d;
        return {
          ...d,
          customBeams: (d.customBeams ?? []).filter(
            (b) => !((b.from === from && b.to === to) || (b.from === to && b.to === from))
          ),
        };
      })
    );
    await DrawingsAPI.update(drawingId, { customBeams: { remove: [{ from, to }] } } as any);
  }, []);

  const currentDrawing = useMemo(() => drawings.find((d) => d.id === currentDrawingId), [drawings, currentDrawingId]);
  const tasksForCurrentDrawing = useMemo(
    () => tasks.filter((t) => t.drawingId === currentDrawingId),
    [tasks, currentDrawingId]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value: AppState = useMemo(() => ({
    user,
    signOut,
    projects,
    drawings,
    tasks,
    projectTasks,
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
    refreshProjectTasks,
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
    deleteDrawingNode,
    deleteDrawingBeam,
    addCustomBeam,
    removeCustomBeam,
  }), [
    user, signOut,
    projects, drawings, tasks, projectTasks, milestones, activity,
    currentDrawingId, selectedElementId,
    setCurrentDrawingId, setSelectedElementId,
    refreshDrawings, refreshTasks, refreshProjectTasks, refreshActivity, refreshProjects, refreshMilestones,
    createTask, updateTask, deleteTask, deleteDrawing,
    createMilestone, updateMilestone, deleteMilestone,
    currentDrawing, tasksForCurrentDrawing,
    focusElementRequest, requestFocusElement,
    patchDrawingColumnPositions, resetDrawingColumnPositions,
    patchDrawingColumnLabel, patchDrawingElementTypeLabel,
    deleteDrawingNode, deleteDrawingBeam, addCustomBeam, removeCustomBeam,
    activeProjectId,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
