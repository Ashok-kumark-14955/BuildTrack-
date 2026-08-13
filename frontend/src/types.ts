export type TaskStatus = 'No Task' | 'Assigned' | 'In Progress' | 'Completed' | 'Blocked' | 'Delayed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CatalystUser {
  user_id: string;
  email_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

// Extensible structural element types recognized by the drawing engine.
// Adding a new type (e.g. 'slab', 'wall') only requires a geometry generator
// and a render component — no changes to the task/status model below.
export type ElementType = 'column' | 'beam' | 'slab' | 'wall';

export interface ColumnPosition {
  x: number; // fraction of image width, 0-1
  y: number; // fraction of image height, 0-1
}

export interface Drawing {
  id: string;
  projectId: string;
  milestoneId: string | null;
  name: string;
  fileUrl: string;
  fileType: 'pdf' | 'image';
  gridCols: number;
  gridRows: number;
  columnPositions: Record<string, ColumnPosition>;
  /** Grid codes that have been individually deleted (hidden) by the user */
  deletedNodes: string[];
  /** Custom beam connections added by the user (grid code pairs) */
  customBeams: { from: string; to: string }[];
  /** Auto-derived structural beam ids that have been individually deleted (hidden) by the user */
  deletedBeams: string[];
  /** Custom display labels keyed by default gridCode (e.g. "A1" → "P1") */
  columnLabels: Record<string, string>;
  /** Custom type labels for structural elements (e.g. "column" → "Anchor Bolt", "beam" → "Rafter") */
  elementTypeLabels: Record<string, string>;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export type MilestoneStatus = 'Active' | 'Completed' | 'On Hold' | 'Cancelled';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  drawingId: string;
  milestoneId: string | null;
  // Broader than ElementType (which is the drawing-engine's rendering vocabulary) —
  // tasks carry domain-specific values like "footing", "purlin", "cladding", etc.
  elementType: string;
  elementId: string;
  gridCode: string;
  name: string;
  description: string;
  category: string;
  priority: TaskPriority;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  message: string;
  photoUrl: string | null;
  createdAt: string;
}

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed';

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  managerName: string;
  archived: number;
  createdAt: string;
  updatedAt: string;
  stats?: {
    taskCount: number;
    doneCount: number;
    progress: number;
    members: number;
  };
}

export type ProjectTaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface ProjectTask {
  id: string;
  projectId: string;
  name: string;
  description: string;
  priority: TaskPriority;
  status: ProjectTaskStatus;
  assignee: string;
  dueDate: string;
  estimatedHours: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskComment {
  id: string;
  taskId: string;
  author: string;
  message: string;
  createdAt: string;
}

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed'];
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: '#94a3b8',
  Active: '#3b82f6',
  'On Hold': '#f59e0b',
  Completed: '#10b981',
};

export const PROJECT_TASK_STATUS_OPTIONS: ProjectTaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];
export const PROJECT_TASK_STATUS_COLORS: Record<ProjectTaskStatus, string> = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  Review: '#f59e0b',
  Done: '#10b981',
};

export interface ActivityItem {
  id: string;
  taskId: string | null;
  drawingId: string | null;
  message: string;
  createdAt: string;
}

export const STATUS_COLORS: Record<string, string> = {
  'No Task':    '#64748b', // slate grey
  'Assigned':   '#3b82f6', // blue
  'In Progress':'#f97316', // orange
  'Completed':  '#22c55e', // green
  'Blocked':    '#ef4444', // red
  'Delayed':    '#1e293b', // black/dark
};

export const STATUS_OPTIONS: TaskStatus[] = ['Assigned', 'In Progress', 'Completed', 'Blocked', 'Delayed'];
export const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
export const CATEGORY_OPTIONS = ['Structural', 'Electrical', 'Plumbing', 'Finishing', 'HVAC', 'Civil', 'Safety'];
export const MILESTONE_STATUS_OPTIONS: MilestoneStatus[] = ['Active', 'Completed', 'On Hold', 'Cancelled'];

// Common construction stage names — quick-pick suggestions when naming a task on a column.
export const CONSTRUCTION_STAGE_SUGGESTIONS = [
  'Excavation', 'PCC', 'Reinforcement', 'Shuttering', 'Column Erection', 'Concreting', 'QA Inspection',
];

// Quick-pick suggestions for a task on a beam.
export const BEAM_STAGE_SUGGESTIONS = [
  'Formwork', 'Reinforcement', 'Concreting', 'Deshuttering', 'QA Inspection',
];
