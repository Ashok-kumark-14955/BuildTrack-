import type { Request } from 'express';
import * as catalystDb from './catalyst';

const useCatalystDataStore =
	process.env.USE_CATALYST_DATASTORE === 'true' || Boolean(process.env.X_ZOHO_CATALYST_LISTEN_PORT);

let localModule: typeof import('./local') | undefined;

function localDb(): typeof import('./local') {
	localModule ??= require('./local') as typeof import('./local');
	return localModule;
}

export async function all(req: Request, sql: string, params: any[] = []) {
	return useCatalystDataStore ? catalystDb.all(req, sql, params) : localDb().all(req, sql, params);
}

export async function get(req: Request, sql: string, params: any[] = []) {
	return useCatalystDataStore ? catalystDb.get(req, sql, params) : localDb().get(req, sql, params);
}

export async function run(req: Request, sql: string, params: any[] = []) {
	return useCatalystDataStore ? catalystDb.run(req, sql, params) : localDb().run(req, sql, params);
}

export function datastore(req: Request) {
	if (!useCatalystDataStore) {
		throw new Error('Catalyst Data Store is unavailable in local SQLite mode.');
	}
	return catalystDb.datastore(req);
}

export default {
	exec(sql: string) {
		return localDb().default.exec(sql);
	},
	prepare(sql: string) {
		return localDb().default.prepare(sql);
	},
};
