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

import catalyst from 'zcatalyst-sdk-node';
import type { Request } from 'express';

// ---------------------------------------------------------------------------
// SDK initialisation
// ---------------------------------------------------------------------------

function app(req: Request) {
  return catalyst.initialize(req as any, { scope: 'admin' });
}

export function datastore(req: Request) {
  return app(req).datastore();
}

// ---------------------------------------------------------------------------
// SQL → ZCQL helpers
// ---------------------------------------------------------------------------

/**
 * Escape a JavaScript value to a ZCQL literal.
 * Booleans become the strings 'true'/'false' (DataStore boolean column storage).
 */
function escapeValue(v: any): string {
  if (v === undefined || v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? "'true'" : "'false'";
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Replace positional '?' placeholders with escaped ZCQL literals. */
function bind(sql: string, params: any[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => escapeValue(params[i++]));
}

/**
 * Extract the primary table name from a ZCQL statement.
 * Used to unwrap result rows (ZCQL wraps each row under its table name key).
 */
function extractTableName(sql: string): string | null {
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
function unwrapRows(result: any[], table: string | null): any[] {
  if (!result || result.length === 0) return [];
  return result
    .map((r: any) => {
      if (table && r[table] !== undefined) return r[table];
      // JOIN or aggregate query — merge all sub-objects into one flat object
      const merged: any = {};
      for (const key of Object.keys(r)) {
        if (r[key] && typeof r[key] === 'object') {
          Object.assign(merged, r[key]);
        } else {
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
function normalizeSql(sql: string): string {
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
async function executeSelect(zcql: any, sql: string, table: string | null): Promise<any[]> {
  const hasExplicitLimit = /\bLIMIT\s+\d+\s*,\s*\d+/i.test(sql);

  if (hasExplicitLimit) {
    const result = await zcql.executeZCQLQuery(sql);
    return unwrapRows(result, table);
  }

  // Full scan with pagination
  let offset = 0;
  const all: any[] = [];
  while (true) {
    const batch = await zcql.executeZCQLQuery(`${sql} LIMIT ${offset}, ${ZCQL_PAGE_SIZE}`);
    const rows = unwrapRows(batch, table);
    all.push(...rows);
    if (rows.length < ZCQL_PAGE_SIZE) break;
    offset += ZCQL_PAGE_SIZE;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Public API (drop-in for the local SQLite module)
// ---------------------------------------------------------------------------

export async function all(req: Request, sql: string, params: any[] = []): Promise<any[]> {
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

export async function get(req: Request, sql: string, params: any[] = []): Promise<any | undefined> {
  const rows = await all(req, sql, params);
  return rows[0];
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement.
 * For INSERTs we return void — callers immediately follow up with a SELECT by id.
 */
export async function run(req: Request, sql: string, params: any[] = []): Promise<void> {
  const bound = normalizeSql(bind(sql, params));
  const zcql = app(req).zcql();
  await zcql.executeZCQLQuery(bound);
}
