# Business Requirements Document (BRD)
## Module: Task Management — BuildTrack / SiteTrack Construction App

**Document version:** 1.0
**Date:** 2026-08-28
**Prepared for:** BuildTrack construction drawing task management platform

---

## 1. Purpose

This document defines the business requirements for the **Task Management module**, which enables construction site teams to plan, assign, track, and report on work items — both at the granular level of individual drawing/grid elements (columns, beams, slabs, walls) and at the broader project level (procurement, admin, general work).

## 2. Business Objectives

| # | Objective |
|---|-----------|
| BO-1 | Give site engineers a visual way to assign and track construction work directly on drawings, eliminating spreadsheet-based tracking. |
| BO-2 | Provide real-time visibility of task status/progress to project managers via dashboards. |
| BO-3 | Maintain an auditable activity trail for every task change. |
| BO-4 | Automatically notify stakeholders (via Zoho Cliq) when work is completed. |
| BO-5 | Support both drawing-linked tasks and general (non-drawing) project tasks under one system. |

## 3. Scope

### In Scope
- Creation, assignment, update, and deletion of two task types: **Drawing Grid Tasks** and **Project Tasks**.
- Status and priority tracking, due dates, categories/tags, progress percentage.
- Comments (text and photo) on tasks.
- Linking tasks to milestones and projects.
- Activity feed / audit log of all task events.
- Automated Cliq notification on task completion.
- Search, filter, and sort capability across both task types.
- Excel export of the project task list.

### Out of Scope (current release)
- Multi-level task dependencies / critical path scheduling.
- Native mobile app (mobile access is via responsive web only).
- Real-time push notifications beyond Cliq messages.
- Role-based approval workflows for task completion.

## 4. Stakeholders

| Role | Interest |
|------|----------|
| Site Engineer / Foreman | Creates and updates tasks tied to drawing grid cells; uploads progress photos. |
| Project Manager | Monitors dashboard progress %, overdue/blocked tasks, and milestone health. |
| Site Worker / Contractor | Assigned to tasks; updates status and adds comments. |
| Admin / Back Office | Manages project tasks (procurement, non-field work) via the Task List (Kanban-style) view. |
| Management (via Cliq) | Receives automated completion notifications without logging into the app. |

## 5. Functional Requirements

### FR-1 — Drawing Grid Tasks
- FR-1.1: System shall auto-generate one task per grid cell when a drawing is uploaded, sized to the configured grid (`gridCols × gridRows`, max 30×30).
- FR-1.2: Each task shall support: name, description, category, priority (Low/Medium/High/Critical), assignee, start date, due date, status, progress (%), element type (column/beam/slab/wall), and element ID.
- FR-1.3: Task status shall support: `No Task`, `Assigned`, `In Progress`, `Completed`, `Blocked`, `Delayed`.
- FR-1.4: Grid cell color on the drawing shall reflect current task status and update instantly without page reload.
- FR-1.5: Users shall be able to edit or delete any drawing task via a task panel opened by clicking its grid cell.
- FR-1.6: Tasks may optionally be linked to a milestone.

### FR-2 — Project Tasks (Kanban / List)
- FR-2.1: System shall support standalone tasks not tied to any drawing, scoped to a project.
- FR-2.2: Each project task shall support: name, description, priority, status (`To Do`, `In Progress`, `Review`, `Done`), assignee, due date, estimated hours, tags, and optional milestone link.
- FR-2.3: Users shall be able to search (by name/description/tags), filter (by status/priority/assignee/milestone), and sort (by due date/priority/created date/name) the project task list.
- FR-2.4: Users shall be able to export the visible project task list to Excel.
- FR-2.5: Clicking/hovering a project task that references a drawing element shall navigate to and highlight the corresponding grid cell.

### FR-3 — Comments & Attachments
- FR-3.1: Users shall be able to add text comments to any task (both types).
- FR-3.2: Users shall be able to attach a photo to a drawing-task comment.
- FR-3.3: Comments shall be timestamped and attributed to an author.
- FR-3.4: Users shall be able to delete a comment.

### FR-4 — Activity & Audit Trail
- FR-4.1: Every task create, update, delete, and comment action shall generate an activity log entry with a human-readable message and timestamp.
- FR-4.2: The dashboard shall display the most recent 50 activity entries, optionally filtered by drawing.

### FR-5 — Notifications
- FR-5.1: When a task's status changes to `Completed` (grid task) or `Completed`/`Done` (project task), the system shall automatically send a notification to a configured Zoho Cliq channel.
- FR-5.2: The notification shall include project name, drawing name (if applicable), assignee, category, due date, priority, and overall project completion percentage.
- FR-5.3: Notification delivery shall support two mechanisms with fallback: Zoho Cliq via MCP tool call (primary) and an incoming webhook (fallback) if MCP is not configured.

### FR-6 — Progress & Reporting
- FR-6.1: Project-level statistics (total tasks, completed tasks, completion %, distinct assignees/"members") shall be computed by combining both Drawing Grid Tasks and Project Tasks for a given project.
- FR-6.2: The Dashboard shall display totals, completed/pending/overdue/blocked counts, completion percentage, and status progress bars.

### FR-7 — Milestones
- FR-7.1: Tasks (of either type) may be associated with a project milestone.
- FR-7.2: Users shall be able to view all drawing tasks belonging to a given milestone.

## 6. Non-Functional Requirements

| # | Requirement |
|---|-------------|
| NFR-1 | Grid/task status updates shall reflect in the UI without requiring a full page refresh. |
| NFR-2 | Photo attachments shall be stored durably in production (Zoho Catalyst Stratus) rather than on ephemeral local disk. |
| NFR-3 | The system shall function in both a local development environment (SQLite) and a production Zoho Catalyst environment (DataStore) with no code branching visible to the end user. |
| NFR-4 | Task list queries shall support filtering and sorting server-side to avoid transferring unbounded data to the client. |
| NFR-5 | Cliq notification failures shall not block or fail the underlying task status update. |

## 7. Business Rules

- BR-1: A task must belong to exactly one project, either directly (Project Task) or indirectly via its parent drawing (Drawing Grid Task).
- BR-2: `priority` is always one of `Low`, `Medium`, `High`, `Critical`.
- BR-3: Deleting a drawing does not automatically delete its historical activity log entries.
- BR-4: A milestone link on a task is optional and may be cleared (unlinked) independently of other field updates.
- BR-5: Task completion notifications are best-effort — a Cliq delivery failure is logged but does not roll back the task update.

## 8. Assumptions & Constraints

- Zoho Cliq channel and MCP/webhook credentials are configured per environment via environment variables.
- The production data backbone may be either Zoho Catalyst DataStore or Zoho Projects, depending on deployment target; both must expose the same task fields to the frontend contract.
- Maximum grid size is capped at 30×30 cells per drawing, bounding the number of auto-created tasks per drawing to 900.

## 9. Success Metrics

- % reduction in manual status-tracking spreadsheets in use on site.
- Average time from task completion to stakeholder notification (target: near-instant via Cliq).
- Dashboard completion % accuracy validated against manual site audit.

## 10. Open Questions

- Should project tasks support the same milestone-tasks listing endpoint currently limited to drawing tasks (`GET /api/milestones/:id/tasks`)?
- Should task completion require an approval step before triggering the Cliq notification?
- Is a mobile-native app in scope for a future phase?
