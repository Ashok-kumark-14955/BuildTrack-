"use strict";
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
exports.datastore = datastore;
const catalystDb = __importStar(require("./catalyst"));
const useCatalystDataStore = process.env.USE_CATALYST_DATASTORE === 'true' || Boolean(process.env.X_ZOHO_CATALYST_LISTEN_PORT);
let localModule;
function localDb() {
    localModule ?? (localModule = require('./local'));
    return localModule;
}
async function all(req, sql, params = []) {
    return useCatalystDataStore ? catalystDb.all(req, sql, params) : localDb().all(req, sql, params);
}
async function get(req, sql, params = []) {
    return useCatalystDataStore ? catalystDb.get(req, sql, params) : localDb().get(req, sql, params);
}
async function run(req, sql, params = []) {
    return useCatalystDataStore ? catalystDb.run(req, sql, params) : localDb().run(req, sql, params);
}
function datastore(req) {
    if (!useCatalystDataStore) {
        throw new Error('Catalyst Data Store is unavailable in local SQLite mode.');
    }
    return catalystDb.datastore(req);
}
exports.default = {
    exec(sql) {
        return localDb().default.exec(sql);
    },
    prepare(sql) {
        return localDb().default.prepare(sql);
    },
};
