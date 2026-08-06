import catalyst from 'zcatalyst-sdk-node';
import type { Request } from 'express';

// Admin scope bypasses per-row/table permission checks — this server has no
// end-user auth layer of its own, so it acts as the trusted backend.
function app(req: Request) {
  return catalyst.initialize(req, { scope: 'admin' });
}

export function datastore(req: Request) {
  return app(req).datastore();
}

function escapeValue(v: any): string {
  if (v === undefined || v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? "'true'" : "'false'";
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Substitutes '?' placeholders in order with escaped ZCQL literals.
function bind(sql: string, params: any[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => escapeValue(params[i++]));
}

// ZCQL wraps every result row under the queried table's name.
function extractTableName(sql: string): string | null {
  const m = sql.match(/(?:FROM|INTO|UPDATE)\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  return m ? m[1] : null;
}

export async function all(req: Request, sql: string, params: any[] = []): Promise<any[]> {
  const bound = bind(sql, params);
  const zcql = app(req).zcql();
  const result = await zcql.executeZCQLQuery(bound);
  const table = extractTableName(bound);
  if (!table) return result;
  return result.map((r: any) => r[table]).filter(Boolean);
}

export async function get(req: Request, sql: string, params: any[] = []): Promise<any | undefined> {
  const rows = await all(req, sql, params);
  return rows[0];
}

export async function run(req: Request, sql: string, params: any[] = []): Promise<void> {
  const bound = bind(sql, params);
  const zcql = app(req).zcql();
  await zcql.executeZCQLQuery(bound);
}
