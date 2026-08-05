import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const rawDb = new DatabaseSync(path.join(dataDir, 'app.db'));
rawDb.exec('PRAGMA journal_mode = WAL;');
rawDb.exec('PRAGMA foreign_keys = ON;');

// Thin wrapper to keep call-sites similar to better-sqlite3's API
const db = {
  exec(sql: string) {
    rawDb.exec(sql);
  },
  prepare(sql: string) {
    const stmt = rawDb.prepare(sql);
    return {
      run: (...params: any[]) => stmt.run(...params),
      get: (...params: any[]) => stmt.get(...params),
      all: (...params: any[]) => stmt.all(...params),
    };
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  fileUrl TEXT NOT NULL,
  fileType TEXT NOT NULL,
  gridCols INTEGER NOT NULL DEFAULT 10,
  gridRows INTEGER NOT NULL DEFAULT 8,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  dueDate TEXT,
  status TEXT DEFAULT 'Active',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  drawingId TEXT NOT NULL,
  milestoneId TEXT,
  gridCode TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'Medium',
  assignedTo TEXT,
  startDate TEXT,
  dueDate TEXT,
  status TEXT DEFAULT 'Assigned',
  progress INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (drawingId) REFERENCES drawings(id) ON DELETE CASCADE,
  FOREIGN KEY (milestoneId) REFERENCES milestones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  author TEXT,
  message TEXT,
  photoUrl TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  taskId TEXT,
  drawingId TEXT,
  message TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'To Do',
  assignee TEXT,
  dueDate TEXT,
  estimatedHours REAL,
  tags TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_task_comments (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  author TEXT,
  message TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (taskId) REFERENCES project_tasks(id) ON DELETE CASCADE
);
`);

// Runtime migrations — safe to run multiple times
try { rawDb.exec('ALTER TABLE tasks ADD COLUMN milestoneId TEXT REFERENCES milestones(id) ON DELETE SET NULL'); } catch { /* already exists */ }
try { rawDb.exec('ALTER TABLE drawings ADD COLUMN milestoneId TEXT REFERENCES milestones(id) ON DELETE SET NULL'); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE projects ADD COLUMN code TEXT DEFAULT ''"); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''"); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE projects ADD COLUMN startDate TEXT DEFAULT ''"); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE projects ADD COLUMN endDate TEXT DEFAULT ''"); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'Planning'"); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE projects ADD COLUMN managerName TEXT DEFAULT ''"); } catch { /* already exists */ }
try { rawDb.exec('ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0'); } catch { /* already exists */ }
try { rawDb.exec('ALTER TABLE projects ADD COLUMN updatedAt TEXT'); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE drawings ADD COLUMN columnPositions TEXT DEFAULT '{}'"); } catch { /* already exists */ }
try { rawDb.exec("ALTER TABLE tasks ADD COLUMN elementType TEXT DEFAULT 'column'"); } catch { /* already exists */ }
try { rawDb.exec('ALTER TABLE tasks ADD COLUMN elementId TEXT'); } catch { /* already exists */ }
try { rawDb.exec('ALTER TABLE drawings ADD COLUMN lat REAL'); } catch { /* already exists */ }
try { rawDb.exec('ALTER TABLE drawings ADD COLUMN lng REAL'); } catch { /* already exists */ }
rawDb.exec("UPDATE projects SET updatedAt = createdAt WHERE updatedAt IS NULL");
rawDb.exec("UPDATE tasks SET status = 'Delayed' WHERE status = 'Waiting'");
rawDb.exec("UPDATE tasks SET elementType = 'column' WHERE elementType IS NULL");
rawDb.exec("UPDATE tasks SET elementId = 'Column_' || gridCode WHERE elementId IS NULL");

export default db;
