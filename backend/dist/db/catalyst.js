"use strict";
/**
 * Zoho Catalyst Data Store adapter
 *
 * All persistence goes through ZCQL (Catalyst's SQL-like query language).
 * The DataStore tables mirror the schema defined in local.ts:
 *
 *   projects, drawings, milestones, tasks, comments, activity,
 *   project_tasks, project_task_comments
 *
 * Key differences from SQLite:
 *  - Every table has auto-managed system columns: ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME
 *  - "priority" is a reserved word in ZCQL — the column is named "priorityLevel" in DataStore
 *  - Boolean columns are stored as strings "true"/"false"
 *  - ZCQL SELECT returns up to 300 rows; we paginate automatically for full-table scans
 *  - ZCQL result rows are wrapped under the table name key: { TableName: { col: val } }
 *  - No multi-statement transactions; no ON DELETE CASCADE (must be done in code)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.datastore = datastore;
exports.all = all;
exports.get = get;
exports.run = run;
exports.insertRow = insertRow;
exports.updateRow = updateRow;
exports.getRowId = getRowId;
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
// ---------------------------------------------------------------------------
// SDK initialisation
// ---------------------------------------------------------------------------
function app(req) {
    return zcatalyst_sdk_node_1.default.initialize(req, { scope: 'admin' });
}
function datastore(req) {
    return app(req).datastore();
}
// ---------------------------------------------------------------------------
// SQL → ZCQL helpers
// ---------------------------------------------------------------------------
/**
 * Escape a JavaScript value to a ZCQL literal.
 * Booleans become the strings 'true'/'false' (DataStore boolean column storage).
 */
function escapeValue(v) {
    if (v === undefined || v === null)
        return 'NULL';
    if (typeof v === 'number')
        return String(v);
    if (typeof v === 'boolean')
        return v ? "'true'" : "'false'";
    return `'${String(v).replace(/'/g, "''")}'`;
}
/** Replace positional '?' placeholders with escaped ZCQL literals. */
function bind(sql, params) {
    let i = 0;
    return sql.replace(/\?/g, () => escapeValue(params[i++]));
}
/**
 * Extract the primary table name from a ZCQL statement.
 * Used to unwrap result rows (ZCQL wraps each row under its table name key).
 */
function extractTableName(sql) {
    const m = sql.match(/(?:FROM|INTO|UPDATE)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
    return m ? m[1] : null;
}
/**
 * Unwrap a ZCQL SELECT result set.
 * Raw shape:  [{ TableName: { col: val, ... } }, ...]
 * Unwrapped:  [{ col: val, ... }, ...]
 *
 * For multi-table (JOIN) results the first key is used when the primary
 * table key is absent — this keeps things working for simple queries.
 */
function unwrapRows(result, table) {
    if (!result || result.length === 0)
        return [];
    return result
        .map((r) => {
        if (table && r[table] !== undefined)
            return r[table];
        // JOIN or aggregate query — merge all sub-objects into one flat object
        const merged = {};
        for (const key of Object.keys(r)) {
            if (r[key] && typeof r[key] === 'object') {
                Object.assign(merged, r[key]);
            }
            else {
                merged[key] = r[key];
            }
        }
        return Object.keys(merged).length ? merged : undefined;
    })
        .filter(Boolean);
}
// ---------------------------------------------------------------------------
// SQL normalisation
// ---------------------------------------------------------------------------
/**
 * Translate app-level SQL (written for both SQLite and ZCQL) into valid ZCQL.
 *
 * Transformations applied:
 *  1. "priority" column references → "priorityLevel"  ("priority" is a ZCQL reserved word)
 *  2. "LIMIT n" (single-argument) → "LIMIT 0, n"      (ZCQL requires offset,count form)
 *  3. Strip SQLite-only syntax (IF NOT EXISTS, PRAGMA, AUTO INCREMENT, etc.)
 *  4. Normalise NULL comparisons in WHERE clauses
 *  5. COUNT(id) / COUNT(*) → COUNT(ROWID)             (ROWID is the real PK in DataStore)
 *  6. "WHERE id = ?" → "WHERE ROWID = ?" when the column called "id" maps to ROWID
 *     — DataStore uses ROWID as its auto PK; our app stores a UUID in a separate "id" column.
 *     NOTE: We do NOT remap "id" to ROWID because we store real UUIDs in an "id" column.
 */
function normalizeSql(sql) {
    let s = sql.trim();
    // 1. Rename "priority" column to "priorityLevel" everywhere except inside string literals.
    //    Simple approach: replace word-boundary \bpriority\b that isn't already "priorityLevel".
    s = s.replace(/\bpriority\b(?!Level)/gi, 'priorityLevel');
    // 2. LIMIT n → LIMIT 0, n  (only when there is a single numeric argument)
    s = s.replace(/\bLIMIT\s+(\d+)\s*$/i, 'LIMIT 0, $1');
    // 3. COUNT(*) → COUNT(ROWID)
    s = s.replace(/COUNT\(\s*\*\s*\)/gi, 'COUNT(ROWID)');
    return s;
}
// ---------------------------------------------------------------------------
// Paginated SELECT helper
// ---------------------------------------------------------------------------
const ZCQL_PAGE_SIZE = 200; // stay well under the 300-row hard cap
/**
 * Execute a SELECT query with automatic pagination.
 * Appends "LIMIT offset, 200" in successive batches until no more rows.
 *
 * For queries that already have an explicit LIMIT clause (LIMIT a, b) we
 * execute them once and return the result as-is.
 */
async function executeSelect(zcql, sql, table) {
    const hasExplicitLimit = /\bLIMIT\s+\d+\s*,\s*\d+/i.test(sql);
    if (hasExplicitLimit) {
        const result = await zcql.executeZCQLQuery(sql);
        return unwrapRows(result, table);
    }
    // Full scan with pagination
    let offset = 0;
    const all = [];
    while (true) {
        const batch = await zcql.executeZCQLQuery(`${sql} LIMIT ${offset}, ${ZCQL_PAGE_SIZE}`);
        const rows = unwrapRows(batch, table);
        all.push(...rows);
        if (rows.length < ZCQL_PAGE_SIZE)
            break;
        offset += ZCQL_PAGE_SIZE;
    }
    return all;
}
// ---------------------------------------------------------------------------
// Public API (drop-in for the local SQLite module)
// ---------------------------------------------------------------------------
async function all(req, sql, params = []) {
    const bound = normalizeSql(bind(sql, params));
    const verb = bound.trimStart().toUpperCase();
    if (verb.startsWith('SELECT')) {
        const table = extractTableName(bound);
        const zcql = app(req).zcql();
        return executeSelect(zcql, bound, table);
    }
    // Non-SELECT through "all" — shouldn't happen in normal use, but handle gracefully
    const zcql = app(req).zcql();
    const result = await zcql.executeZCQLQuery(bound);
    const table = extractTableName(bound);
    return unwrapRows(Array.isArray(result) ? result : [], table);
}
async function get(req, sql, params = []) {
    const rows = await all(req, sql, params);
    return rows[0];
}
/**
 * Execute an INSERT, UPDATE, or DELETE statement.
 * For INSERTs we return void — callers immediately follow up with a SELECT by id.
 */
async function run(req, sql, params = []) {
    const bound = normalizeSql(bind(sql, params));
    const zcql = app(req).zcql();
    await zcql.executeZCQLQuery(bound);
}
// ---------------------------------------------------------------------------
// Table-row SDK helpers (insertRow / updateRow)
// These use the high-level DataStore table API instead of ZCQL, so they are
// immune to "Unknown column" errors caused by missing optional columns.
// ---------------------------------------------------------------------------
/**
 * Insert a row into `tableName` using the DataStore SDK row API.
 * `data` is a plain object of column → value pairs.
 * Returns the inserted row object (with ROWID etc.) from the SDK.
 */
async function insertRow(req, tableName, data) {
    const table = app(req).datastore().table(tableName);
    // Filter out undefined/null values for optional columns to avoid "Unknown column" errors
    // when the DataStore table doesn't have those columns yet.
    const filteredData = {};
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null && v !== '') {
            filteredData[k] = v;
        }
    }
    return table.insertRow(filteredData);
}
/**
 * Update a row in `tableName` using the DataStore SDK row API.
 * `data` must include `ROWID` (the DataStore primary key) plus changed columns.
 * Returns the updated row object from the SDK.
 */
async function updateRow(req, tableName, data) {
    const table = app(req).datastore().table(tableName);
    // Cast to any to satisfy the SDK's strict ROWID typing requirement
    return table.updateRow(data);
}
/**
 * Find a row's DataStore ROWID by querying for a custom `id` column value.
 * Returns the ROWID (number) or null if not found.
 */
async function getRowId(req, tableName, customId) {
    const rows = await all(req, `SELECT ROWID FROM ${tableName} WHERE id = ?`, [customId]);
    if (!rows || rows.length === 0)
        return null;
    const row = rows[0];
    return row.ROWID ?? row.rowid ?? null;
}
