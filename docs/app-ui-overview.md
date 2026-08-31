# BuildTrack — App UI Overview

**Stack:** React + TypeScript + Tailwind CSS v4 + `react-konva` (canvas) + `lucide-react` (icons) + `react-hot-toast` (notifications) + `react-router-dom`.

---

## 1. Overall Layout

Defined in [App.tsx](../frontend/src/App.tsx). Full-viewport dark theme with a maroon/rose gradient background:

```
┌───────────────────────────────────────────────────────────┐
│  padded gradient backdrop (radial maroon glow, #360016…)  │
│  ┌──────────┐  ┌─────────────────────────────────────────┐│
│  │          │  │                                         ││
│  │ Sidebar  │  │        Routed page content              ││
│  │ (rounded │  │        (rounded-2xl, bg-black)           ││
│  │  panel)  │  │                                         ││
│  │          │  │                                         ││
│  └──────────┘  └─────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
     + global <Toaster /> (top-right)
```

- On load, a full-screen "Loading BuildTrack…" splash (spinner + hard-hat icon) shows while Catalyst auth resolves ([useCatalystAuth](../frontend/src/utils/catalystAuth.ts)).
- Both the sidebar and the content area are independently rounded, giving a "floating panels" look over the gradient backdrop.

---

## 2. Navigation — Sidebar ([Sidebar.tsx](../frontend/src/components/Sidebar.tsx))

Collapsible left rail with 5 nav items, each with its own accent color:

| Route | Label | Icon | Accent |
|---|---|---|---|
| `/` | Drawing & Task Tracker | `FileImage` | blue |
| `/tasks` | Task Management | `ListChecks` | green |
| `/dashboard` | Dashboard | `LayoutDashboard` | orange |
| `/zoho-modules` | Workforce & Safety | `Package` | purple |
| `/settings` | Settings | `Settings` | gray |

Additional sidebar features:
- Collapse/expand toggle (`PanelLeftClose` / `PanelLeftOpen`).
- Project switcher with search, add (`+`), edit, delete, and per-project circular **progress ring** (custom SVG arc, maroon→pink gradient, turns green at 100%).
- Drag-to-reorder (`GripVertical`) drawing list under the active project, persisted via `DrawingsAPI.reorder`.
- Quick actions: new drawing upload, new project (opens `ProjectFormModal`).

---

## 3. Drawing & Task Tracker (`/`) — [DrawingPage.tsx](../frontend/src/pages/DrawingPage.tsx)

The primary/default screen. Combines:

- **`TopToolbar.tsx`** — sticky header with: file upload, grid toggle (`Grid3x3`), beam-view toggle, grid-size stepper (+/−), calibration mode, freehand draw mode + color picker + eraser, fullscreen toggle, share/export snapshot, notifications bell.
- **`DrawingCanvas.tsx`** — `react-konva`-based canvas rendering the uploaded drawing image/PDF with:
  - Zoom / pan / fit-to-screen
  - An overlay grid (columns lettered A, B, C…; rows numbered 1, 2, 3… → cell codes like `A1`, `B3`)
  - Colored grid nodes/cells reflecting live task status
  - Structural beam lines between columns (auto-derived + user custom beams), with delete/restore support
  - Freehand annotation strokes (markup drawing)
  - Draggable column position calibration
- **`Legend.tsx`** — floating pill in the top-left corner showing the status→color legend (glowing colored dots per status, pink "Status" brand tab).
- **`TaskPanel.tsx`** — slide-in panel opened by clicking a grid cell; edits/creates the task (name, description, category, priority, assignee, dates, status, progress) and shows its comment/photo timeline.
- **`FieldsModal.tsx`** — used for configuring custom field labels (column labels, element type labels).
- **`WeatherRiskBadge.tsx`** — small badge showing weather-based risk indicator (via `useWeatherForecast` + `weather.ts` util), using the drawing's geocoded lat/lng.

---

## 4. Dashboard (`/dashboard`) — [Dashboard.tsx](../frontend/src/pages/Dashboard.tsx)

Analytics/overview screen:
- **Donut/ring chart** (`DonutRing`) — overall completion % in the center, maroon→orange gradient (green at 100%).
- **Stat cards** — total tasks, completed, pending, overdue, blocked (icons: `CheckCircle2`, `Clock`, `AlertTriangle`, `Ban`, `ListTodo`).
- **Status progress bars** — per-status breakdown.
- **Recent activity feed** — timestamped list (`timeAgo()` helper: "just now", "5m ago", "2h ago", "3d ago") with an icon per event type (status change = refresh icon/rose tint, comment = message icon/purple tint, creation = plus icon/emerald tint).

---

## 5. Task List (`/tasks`) — [TaskList.tsx](../frontend/src/pages/TaskList.tsx)

Kanban-adjacent flat table view for **Project Tasks**:
- Search box, status/priority filter chips, sortable column headers (due date, priority, created, name).
- Excel export button.
- Row click/hover jumps to and highlights the linked grid cell back on the Drawing page.
- **`ProjectTaskDrawer.tsx`** — slide-in drawer for creating/editing a project task and its comments.

---

## 6. Projects (`/projects`) — [Projects.tsx](../frontend/src/pages/Projects.tsx)

Project management grid/list:
- Uses **`ProjectFormModal.tsx`** for create/edit (name, code, description, dates, status, manager).
- Archive/unarchive toggle, delete with a task-count confirmation guard.

---

## 7. Workforce & Safety (`/zoho-modules`) — [ZohoProjects.tsx](../frontend/src/pages/ZohoProjects.tsx)

Custom-modules UI (Zoho-Projects-backed):
- Lists dynamically defined modules (e.g. Workforce, Safety Induction, Toolbox Talks) with custom field schemas.
- **`FieldsModal.tsx`** doubles as the module field-schema editor (field types: text, name, select w/ per-option colors, multiuser, number, date, attachment).
- Record list/detail views per module, with file attachment upload (proxied through Stratus).

---

## 8. Settings (`/settings`) — [SettingsPage.tsx](../frontend/src/pages/SettingsPage.tsx)

App-level configuration screen (environment/integration settings, e.g. Cliq/Zoho connection status).

---

## 9. Login (unused) — [LoginPage.tsx](../frontend/src/pages/LoginPage.tsx)

Exists in the codebase but is **not wired into the router** — `App.tsx` never renders it. Authentication is instead handled transparently by `useCatalystAuth()`, which falls back to a local guest user (`FALLBACK_USER`) if the Catalyst Web SDK session check fails, so the app UI never blocks on a login screen from the code's perspective.

---

## 10. Visual Design Language

- **Palette**: deep maroon/rose gradient background (`#360016 → #520024 → #42001e → #2a0012`), pink/rose accent (`#d6486e`, `#8b0a2e`) for primary actions and progress indicators, green (`#4ade80`/`#22c55e`) reserved for 100%-complete states.
- **Surfaces**: near-black translucent glass panels (`rgba(15,15,20,0.95)`) with `backdrop-filter: blur(20px)` and soft borders/shadows — consistent "frosted glass over gradient" look throughout.
- **Status colors** (`STATUS_COLORS` in [types.ts](../frontend/src/types.ts)) drive: grid cell fill, legend dots, dashboard bars, and activity icons — one shared source of truth.
- **Iconography**: `lucide-react` icon set throughout, no other icon library.
- **Motion**: subtle `animate-in fade-in slide-in-from-left-2`-style entrance transitions, pulsing "ping" glow on legend/status dots.
