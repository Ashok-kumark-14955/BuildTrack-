// Data access layer backed by Zoho Catalyst Data Store (ZCQL), replacing the
// previous local better-sqlite3/node:sqlite implementation.
export { all, get, run, datastore } from './catalyst';

// Legacy local-SQLite implementation removed — see git history if needed for
// reference. It was previously kept as a commented-out block, but nested
// `/* */` comments inside it (e.g. `/* already exists */`) broke TypeScript
// parsing and crashed the server at boot.
