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
