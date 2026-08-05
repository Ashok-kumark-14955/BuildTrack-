# Construction Drawing Task Management — MVP

## Structure
- `frontend/` — React + TypeScript + Tailwind v4 + react-konva (drawing/grid viewer, dashboard, task list)
- `backend/` — Node + Express + TypeScript, using built-in `node:sqlite` (no native build required)

## Running

Backend:
```
cd backend
npm install
npm run seed   # populates sample project/drawing/tasks
npm run dev    # http://localhost:4000
```

Frontend:
```
cd frontend
npm install
npm run dev    # http://localhost:5173
```

Frontend reads `VITE_API_BASE` from `frontend/.env` (defaults to `http://localhost:4000`).

## Features implemented
- Upload drawing (image/PDF), zoom/pan/fit-to-screen/fullscreen, toggle grid, adjustable grid size, A1/A2/B1... numbering
- Click grid cell → task panel: create/update/delete tasks with all required fields, comments/timeline
- Grid color reflects task status (gray/blue/yellow/orange/green/red) and updates instantly
- Dashboard: totals, completed/pending/overdue/blocked, completion %, status progress bars, recent activity feed
- Task List: search, status/priority filters, sortable columns, Excel export, click/hover to navigate & zoom to grid on drawing
- Shared React context keeps grid colors, dashboard stats, and task list in sync without page refresh

## Notes / known limitations (MVP scope)
- Single sample project/drawing seeded; multi-project switching UI not built (backend supports it)
- Photo upload on comments is a placeholder button (no file upload wired yet)
- PDF drawings are stored but rendered as `<img>`; a PDF-to-image render step (e.g. pdf.js) would be needed for real PDF support
- `node:sqlite` is experimental (Node 22.5+); backend must run with `--experimental-sqlite` (already wired into npm scripts)
