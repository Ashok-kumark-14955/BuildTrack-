"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.get = get;
exports.run = run;
const node_sqlite_1 = require("node:sqlite");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataDir = path_1.default.join(__dirname, '..', '..', 'data');
if (!fs_1.default.existsSync(dataDir))
    fs_1.default.mkdirSync(dataDir, { recursive: true });
const rawDb = new node_sqlite_1.DatabaseSync(path_1.default.join(dataDir, 'app.db'));
rawDb.exec('PRAGMA journal_mode = WAL;');
rawDb.exec('PRAGMA foreign_keys = ON;');
function normalizeSql(sql) {
    return sql
        .replace(/\bpriorityLevel\b/g, 'priority')
        .replace(/archived\s*=\s*'true'/gi, "(archived = 1 OR archived = 'true')")
        .replace(/archived\s*=\s*'false'/gi, "(archived = 0 OR archived = 'false')");
}
function normalizeParam(value) {
    if (value === undefined)
        return null;
    if (typeof value === 'boolean')
        return value ? 1 : 0;
    return value;
}
function normalizeRow(row) {
    if (!row || typeof row !== 'object')
        return row;
    const normalized = { ...row };
    if ('priority' in normalized && !('priorityLevel' in normalized)) {
        normalized.priorityLevel = normalized.priority;
    }
    return normalized;
}
function normalizeRows(rows) {
    return rows.map(normalizeRow);
}
function ignoreExistingColumn(sql) {
    try {
        rawDb.exec(sql);
    }
    catch { }
}
rawDb.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  startDate TEXT DEFAULT '',
  endDate TEXT DEFAULT '',
  status TEXT DEFAULT 'Planning',
  managerName TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  milestoneId TEXT,
  name TEXT NOT NULL,
  fileUrl TEXT NOT NULL,
  fileType TEXT NOT NULL,
  gridCols INTEGER NOT NULL DEFAULT 10,
  gridRows INTEGER NOT NULL DEFAULT 8,
  columnPositions TEXT DEFAULT '{}',
  deletedNodes TEXT DEFAULT '[]',
  columnLabels TEXT DEFAULT '{}',
  elementTypeLabels TEXT DEFAULT '{}',
  lat REAL,
  lng REAL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (milestoneId) REFERENCES milestones(id) ON DELETE SET NULL
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
  elementType TEXT DEFAULT 'column',
  elementId TEXT,
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

CREATE TABLE IF NOT EXISTS custom_modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_records (
  id TEXT PRIMARY KEY,
  moduleId TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (moduleId) REFERENCES custom_modules(id) ON DELETE CASCADE
);
`);
ignoreExistingColumn('ALTER TABLE tasks ADD COLUMN milestoneId TEXT REFERENCES milestones(id) ON DELETE SET NULL');
ignoreExistingColumn('ALTER TABLE drawings ADD COLUMN milestoneId TEXT REFERENCES milestones(id) ON DELETE SET NULL');
ignoreExistingColumn("ALTER TABLE projects ADD COLUMN code TEXT DEFAULT ''");
ignoreExistingColumn("ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''");
ignoreExistingColumn("ALTER TABLE projects ADD COLUMN startDate TEXT DEFAULT ''");
ignoreExistingColumn("ALTER TABLE projects ADD COLUMN endDate TEXT DEFAULT ''");
ignoreExistingColumn("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'Planning'");
ignoreExistingColumn("ALTER TABLE projects ADD COLUMN managerName TEXT DEFAULT ''");
ignoreExistingColumn('ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0');
ignoreExistingColumn('ALTER TABLE projects ADD COLUMN updatedAt TEXT');
ignoreExistingColumn("ALTER TABLE drawings ADD COLUMN columnPositions TEXT DEFAULT '{}'");
ignoreExistingColumn("ALTER TABLE drawings ADD COLUMN deletedNodes TEXT DEFAULT '[]'");
ignoreExistingColumn("ALTER TABLE drawings ADD COLUMN customBeams TEXT DEFAULT '[]'");
ignoreExistingColumn("ALTER TABLE drawings ADD COLUMN deletedBeams TEXT DEFAULT '[]'");
ignoreExistingColumn("ALTER TABLE drawings ADD COLUMN columnLabels TEXT DEFAULT '{}'");
ignoreExistingColumn("ALTER TABLE drawings ADD COLUMN elementTypeLabels TEXT DEFAULT '{}'");
ignoreExistingColumn('ALTER TABLE drawings ADD COLUMN lat REAL');
ignoreExistingColumn('ALTER TABLE drawings ADD COLUMN lng REAL');
ignoreExistingColumn("ALTER TABLE tasks ADD COLUMN elementType TEXT DEFAULT 'column'");
ignoreExistingColumn('ALTER TABLE tasks ADD COLUMN elementId TEXT');
ignoreExistingColumn('ALTER TABLE project_tasks ADD COLUMN estimatedHours REAL');
ignoreExistingColumn('ALTER TABLE project_tasks ADD COLUMN tags TEXT');
rawDb.exec("UPDATE projects SET updatedAt = createdAt WHERE updatedAt IS NULL");
rawDb.exec("UPDATE tasks SET status = 'Delayed' WHERE status = 'Waiting'");
rawDb.exec("UPDATE tasks SET elementType = 'column' WHERE elementType IS NULL");
rawDb.exec("UPDATE tasks SET elementId = 'Column_' || gridCode WHERE elementId IS NULL");
const db = {
    exec(sql) {
        rawDb.exec(normalizeSql(sql));
    },
    prepare(sql) {
        const stmt = rawDb.prepare(normalizeSql(sql));
        return {
            run: (...params) => stmt.run(...params.map(normalizeParam)),
            get: (...params) => normalizeRow(stmt.get(...params.map(normalizeParam))),
            all: (...params) => normalizeRows(stmt.all(...params.map(normalizeParam))),
        };
    },
};
async function all(_req, sql, params = []) {
    return db.prepare(sql).all(...params);
}
async function get(_req, sql, params = []) {
    return db.prepare(sql).get(...params);
}
async function run(_req, sql, params = []) {
    db.prepare(sql).run(...params);
}
exports.default = db;
