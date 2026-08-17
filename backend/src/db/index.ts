/**
 * Database entry-point
 *
 * When running inside Zoho Catalyst (X_ZOHO_CATALYST_LISTEN_PORT is set, or
 * USE_CATALYST_DATASTORE=true) all queries are routed to the Catalyst Data Store
 * via ZCQL (see ./catalyst.ts).
 *
 * In local development the SQLite adapter (./local.ts) is used as a drop-in
 * replacement so the app can be run and tested without a Catalyst environment.
 */

import type { Request } from 'express';
import * as catalystDb from './catalyst';

// Use Catalyst Data Store when deployed on AppSail or when the env flag is set.
const useCatalystDataStore =
  process.env.USE_CATALYST_DATASTORE === 'true' ||
  Boolean(process.env.X_ZOHO_CATALYST_LISTEN_PORT);

// Lazily load the local SQLite module so it is never imported (or its
// side-effects run) when we are running against the real DataStore.
let localModule: typeof import('./local') | undefined;

function localDb(): typeof import('./local') {
  localModule ??= require('./local') as typeof import('./local');
  return localModule;
}

export async function all(req: Request, sql: string, params: any[] = []) {
  return useCatalystDataStore
    ? catalystDb.all(req, sql, params)
    : localDb().all(req, sql, params);
}

export async function get(req: Request, sql: string, params: any[] = []) {
  return useCatalystDataStore
    ? catalystDb.get(req, sql, params)
    : localDb().get(req, sql, params);
}

export async function run(req: Request, sql: string, params: any[] = []) {
  return useCatalystDataStore
    ? catalystDb.run(req, sql, params)
    : localDb().run(req, sql, params);
}

/**
 * Insert a row via the DataStore SDK table API (bypasses ZCQL INSERT).
 * In local-dev SQLite mode this falls back to a regular ZCQL-style INSERT.
 */
export async function insertRow(req: Request, tableName: string, data: Record<string, any>): Promise<any> {
  if (useCatalystDataStore) {
    return catalystDb.insertRow(req, tableName, data);
  }
  // Local SQLite fallback — build and run an INSERT from the data object
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const sql = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  return localDb().run(req, sql, vals);
}

/**
 * Update a row via the DataStore SDK table API (bypasses ZCQL UPDATE).
 * `data` must include `ROWID` for DataStore; in SQLite mode we use the `id` UUID column instead.
 */
export async function updateRow(req: Request, tableName: string, data: Record<string, any>): Promise<any> {
  if (useCatalystDataStore) {
    return catalystDb.updateRow(req, tableName, data);
  }
  // Local SQLite fallback — build UPDATE from data object (using 'id' as the key)
  const { id, ROWID, ...rest } = data;
  const lookupId = id ?? ROWID;
  const cols = Object.keys(rest);
  const vals = Object.values(rest);
  const sql = `UPDATE ${tableName} SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`;
  return localDb().run(req, sql, [...vals, lookupId]);
}

/**
 * Get the DataStore ROWID for a row identified by its custom UUID `id` column.
 * In local-dev SQLite mode always returns null (ROWID not needed).
 */
export async function getRowId(req: Request, tableName: string, customId: string): Promise<number | null> {
  if (useCatalystDataStore) {
    return catalystDb.getRowId(req, tableName, customId);
  }
  return null;
}

/**
 * Returns the raw Catalyst DataStore instance for operations that need the
 * table-level SDK API (insertRow, updateRow, deleteRow, getPagedRows …).
 * Throws in local-dev mode where Catalyst is unavailable.
 */
export function datastore(req: Request) {
  if (!useCatalystDataStore) {
    throw new Error('Catalyst Data Store is unavailable in local SQLite mode.');
  }
  return catalystDb.datastore(req);
}

// Thin wrapper that exposes the low-level SQLite `exec` / `prepare` API used
// by seeding scripts.  In production this is never called.
export default {
  exec(sql: string) {
    return localDb().default.exec(sql);
  },
  prepare(sql: string) {
    return localDb().default.prepare(sql);
  },
};
