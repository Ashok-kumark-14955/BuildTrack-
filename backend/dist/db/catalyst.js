"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.datastore = datastore;
exports.all = all;
exports.get = get;
exports.run = run;
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
// Admin scope bypasses per-row/table permission checks — this server has no
// end-user auth layer of its own, so it acts as the trusted backend.
function app(req) {
    return zcatalyst_sdk_node_1.default.initialize(req, { scope: 'admin' });
}
function datastore(req) {
    return app(req).datastore();
}
function escapeValue(v) {
    if (v === undefined || v === null)
        return 'NULL';
    if (typeof v === 'number')
        return String(v);
    if (typeof v === 'boolean')
        return v ? "'true'" : "'false'";
    return `'${String(v).replace(/'/g, "''")}'`;
}
// Substitutes '?' placeholders in order with escaped ZCQL literals.
function bind(sql, params) {
    let i = 0;
    return sql.replace(/\?/g, () => escapeValue(params[i++]));
}
// ZCQL wraps every result row under the queried table's name.
function extractTableName(sql) {
    const m = sql.match(/(?:FROM|INTO|UPDATE)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
    return m ? m[1] : null;
}
async function all(req, sql, params = []) {
    const bound = bind(sql, params);
    const zcql = app(req).zcql();
    const result = await zcql.executeZCQLQuery(bound);
    const table = extractTableName(bound);
    if (!table)
        return result;
    return result.map((r) => r[table]).filter(Boolean);
}
async function get(req, sql, params = []) {
    const rows = await all(req, sql, params);
    return rows[0];
}
async function run(req, sql, params = []) {
    const bound = bind(sql, params);
    const zcql = app(req).zcql();
    await zcql.executeZCQLQuery(bound);
}
