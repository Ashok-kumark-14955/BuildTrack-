"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = all;
exports.get = get;
exports.run = run;
exports.insertRow = insertRow;
exports.updateRow = updateRow;
exports.getRowId = getRowId;
exports.datastore = datastore;
const catalystDb = __importStar(require("./catalyst"));
// Use Catalyst Data Store when deployed on AppSail or when the env flag is set.
const useCatalystDataStore = process.env.USE_CATALYST_DATASTORE === 'true' ||
    Boolean(process.env.X_ZOHO_CATALYST_LISTEN_PORT);
// Lazily load the local SQLite module so it is never imported (or its
// side-effects run) when we are running against the real DataStore.
let localModule;
function localDb() {
    localModule ?? (localModule = require('./local'));
    return localModule;
}
async function all(req, sql, params = []) {
    return useCatalystDataStore
        ? catalystDb.all(req, sql, params)
        : localDb().all(req, sql, params);
}
async function get(req, sql, params = []) {
    return useCatalystDataStore
        ? catalystDb.get(req, sql, params)
        : localDb().get(req, sql, params);
}
async function run(req, sql, params = []) {
    return useCatalystDataStore
        ? catalystDb.run(req, sql, params)
        : localDb().run(req, sql, params);
}
/**
 * Insert a row via the DataStore SDK table API (bypasses ZCQL INSERT).
 * In local-dev SQLite mode this falls back to a regular ZCQL-style INSERT.
 */
async function insertRow(req, tableName, data) {
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
async function updateRow(req, tableName, data) {
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
async function getRowId(req, tableName, customId) {
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
function datastore(req) {
    if (!useCatalystDataStore) {
        throw new Error('Catalyst Data Store is unavailable in local SQLite mode.');
    }
    return catalystDb.datastore(req);
}
// Thin wrapper that exposes the low-level SQLite `exec` / `prepare` API used
// by seeding scripts.  In production this is never called.
exports.default = {
    exec(sql) {
        return localDb().default.exec(sql);
    },
    prepare(sql) {
        return localDb().default.prepare(sql);
    },
};
