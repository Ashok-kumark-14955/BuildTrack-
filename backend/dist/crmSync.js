"use strict";
/**
 * crmSync.ts
 *
 * Two-way BuildTrack <-> Zoho CRM sync for projects, milestones, and tasks.
 * Uses the Catalyst Connection "Ashokprimehome" (OAuth to Zoho CRM) to call
 * the CRM REST API, and the `crm_sync_map` DataStore table to track
 * buildtrack_id <-> crm_id pairs per entity type.
 *
 * Both BuildTrack task types — Drawing Grid Tasks (`tasks` table, entity
 * type "task") and standalone Project Tasks (`project_tasks` table, entity
 * type "projectTask") — sync to/from the same CRM "Task_list" module. They
 * share the module but never share a `crm_sync_map` row (entity_type keeps
 * them distinct even though their buildtrack_id UUIDs could theoretically
 * collide with a different table's id).
 *
 * Sync failures are logged but never thrown — a CRM outage must not break
 * the app's own create/update/delete flows.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncProjectUpsert = syncProjectUpsert;
exports.syncProjectDelete = syncProjectDelete;
exports.syncMilestoneUpsert = syncMilestoneUpsert;
exports.syncMilestoneDelete = syncMilestoneDelete;
exports.syncTaskUpsert = syncTaskUpsert;
exports.syncTaskDelete = syncTaskDelete;
exports.syncProjectTaskUpsert = syncProjectTaskUpsert;
exports.syncProjectTaskDelete = syncProjectTaskDelete;
exports.reconcileCrmTaskDeletes = reconcileCrmTaskDeletes;
const zcatalyst_sdk_node_1 = __importDefault(require("zcatalyst-sdk-node"));
const db = __importStar(require("./db"));
const CONNECTION_NAME = 'Ashokprimehome';
const CRM_API_BASE = 'https://www.zohoapis.in/crm/v8';
const MODULE = {
    project: 'Ashok_Prime_Home_Projects',
    milestone: 'Milestones',
    task: 'Task_list',
    projectTask: 'Task_list',
};
/**
 * Fetch the stored OAuth headers for the "Ashokprimehome" Catalyst Connection
 * and use them directly on a plain fetch() call to the Zoho CRM REST API.
 */
async function crmRequest(req, method, path, body) {
    const app = zcatalyst_sdk_node_1.default.initialize(req, { scope: 'admin' });
    const { headers } = await app.connections().getConnectionCredentials(CONNECTION_NAME);
    const res = await fetch(`${CRM_API_BASE}${path}`, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok)
        throw new Error(`CRM ${method} ${path} -> HTTP ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
}
async function getCrmId(req, entityType, buildtrackId) {
    const row = await db.get(req, 'SELECT crm_id FROM crm_sync_map WHERE entity_type = ? AND buildtrack_id = ?', [entityType, buildtrackId]);
    return row?.crm_id ?? null;
}
async function saveMapping(req, entityType, buildtrackId, crmId) {
    const existing = await getCrmId(req, entityType, buildtrackId);
    const now = new Date().toISOString();
    if (existing) {
        await db.run(req, 'UPDATE crm_sync_map SET crm_id = ?, last_synced_at = ?, sync_direction = ? WHERE entity_type = ? AND buildtrack_id = ?', [crmId, now, 'buildtrack_to_crm', entityType, buildtrackId]);
    }
    else {
        await db.run(req, 'INSERT INTO crm_sync_map (entity_type, buildtrack_id, crm_id, last_synced_at, sync_direction) VALUES (?, ?, ?, ?, ?)', [entityType, buildtrackId, crmId, now, 'buildtrack_to_crm']);
    }
}
async function deleteMapping(req, entityType, buildtrackId) {
    await db.run(req, 'DELETE FROM crm_sync_map WHERE entity_type = ? AND buildtrack_id = ?', [entityType, buildtrackId]);
}
async function crmCreate(req, entityType, data) {
    const body = await crmRequest(req, 'POST', `/${MODULE[entityType]}`, { data: [data] });
    const result = body?.data?.[0];
    if (result?.status !== 'success')
        throw new Error(`CRM create failed: ${JSON.stringify(result)}`);
    return result.details?.id ?? null;
}
async function crmUpdate(req, entityType, crmId, data) {
    const body = await crmRequest(req, 'PUT', `/${MODULE[entityType]}`, { data: [{ id: crmId, ...data }] });
    const result = body?.data?.[0];
    if (result?.status !== 'success')
        throw new Error(`CRM update failed: ${JSON.stringify(result)}`);
}
async function crmDelete(req, entityType, crmId) {
    await crmRequest(req, 'DELETE', `/${MODULE[entityType]}?ids=${crmId}`);
}
// ---------------------------------------------------------------------------
// Public sync entry points — called from the route handlers, fire-and-forget.
// ---------------------------------------------------------------------------
async function syncProjectUpsert(req, project) {
    try {
        const crmId = await getCrmId(req, 'project', project.id);
        const data = {
            Name: project.name,
            Description: project.description || '',
            Start_Date: project.startDate || null,
            End_Date: project.endDate || null,
        };
        if (crmId) {
            await crmUpdate(req, 'project', crmId, data);
        }
        else {
            const newId = await crmCreate(req, 'project', data);
            if (newId)
                await saveMapping(req, 'project', project.id, newId);
        }
    }
    catch (err) {
        console.error('[crmSync] project upsert failed', project.id, err);
    }
}
async function syncProjectDelete(req, projectId) {
    try {
        const crmId = await getCrmId(req, 'project', projectId);
        if (!crmId)
            return;
        await crmDelete(req, 'project', crmId);
        await deleteMapping(req, 'project', projectId);
    }
    catch (err) {
        console.error('[crmSync] project delete failed', projectId, err);
    }
}
async function syncMilestoneUpsert(req, milestone) {
    try {
        const crmId = await getCrmId(req, 'milestone', milestone.id);
        const projectCrmId = await getCrmId(req, 'project', milestone.projectId);
        const data = {
            Name: milestone.name,
        };
        if (projectCrmId)
            data.Project = { id: projectCrmId };
        if (crmId) {
            await crmUpdate(req, 'milestone', crmId, data);
        }
        else {
            const newId = await crmCreate(req, 'milestone', data);
            if (newId)
                await saveMapping(req, 'milestone', milestone.id, newId);
        }
    }
    catch (err) {
        console.error('[crmSync] milestone upsert failed', milestone.id, err);
    }
}
async function syncMilestoneDelete(req, milestoneId) {
    try {
        const crmId = await getCrmId(req, 'milestone', milestoneId);
        if (!crmId)
            return;
        await crmDelete(req, 'milestone', crmId);
        await deleteMapping(req, 'milestone', milestoneId);
    }
    catch (err) {
        console.error('[crmSync] milestone delete failed', milestoneId, err);
    }
}
// ---------------------------------------------------------------------------
// Drawing Grid Tasks (`tasks` table) <-> CRM Task_list
// ---------------------------------------------------------------------------
async function syncTaskUpsert(req, task) {
    try {
        const crmId = await getCrmId(req, 'task', task.id);
        const data = {
            Name: task.name,
            Description: task.description || '',
            Category: task.category || '',
            Staart: task.startDate || null,
            Date_2: task.dueDate || null,
            Status: task.status || '',
            Priority: task.priorityLevel ?? task.priority ?? '',
            Progress: task.progress ?? 0,
            Assignee_Name: task.assignedTo || '',
        };
        if (task.milestoneId) {
            const milestoneCrmId = await getCrmId(req, 'milestone', task.milestoneId);
            if (milestoneCrmId) {
                // NOTE: the Task_list module's lookup field to Milestones is "MIleStone"
                // (unusual casing baked into the CRM schema) — do NOT rename to "Milestone".
                data.MIleStone = { id: milestoneCrmId };
                const milestone = await db.get(req, 'SELECT projectId FROM milestones WHERE id = ?', [task.milestoneId]);
                const projectCrmId = milestone?.projectId ? await getCrmId(req, 'project', milestone.projectId) : null;
                if (projectCrmId)
                    data.Project = { id: projectCrmId };
            }
        }
        if (crmId) {
            await crmUpdate(req, 'task', crmId, data);
        }
        else {
            const newId = await crmCreate(req, 'task', data);
            if (newId)
                await saveMapping(req, 'task', task.id, newId);
        }
    }
    catch (err) {
        console.error('[crmSync] task upsert failed', task.id, err);
    }
}
async function syncTaskDelete(req, taskId) {
    try {
        const crmId = await getCrmId(req, 'task', taskId);
        if (!crmId)
            return;
        await crmDelete(req, 'task', crmId);
        await deleteMapping(req, 'task', taskId);
    }
    catch (err) {
        console.error('[crmSync] task delete failed', taskId, err);
    }
}
// ---------------------------------------------------------------------------
// Project Tasks (`project_tasks` table) <-> CRM Task_list
// ---------------------------------------------------------------------------
async function syncProjectTaskUpsert(req, task) {
    try {
        const crmId = await getCrmId(req, 'projectTask', task.id);
        const data = {
            Name: task.name,
            Description: task.description || '',
            Date_2: task.dueDate || null,
            Status: task.status || '',
            Priority: task.priorityLevel ?? task.priority ?? '',
            Assignee_Name: task.assignee || '',
        };
        const projectCrmId = task.projectId ? await getCrmId(req, 'project', task.projectId) : null;
        if (projectCrmId)
            data.Project = { id: projectCrmId };
        if (task.milestoneId) {
            const milestoneCrmId = await getCrmId(req, 'milestone', task.milestoneId);
            if (milestoneCrmId)
                data.MIleStone = { id: milestoneCrmId };
        }
        if (crmId) {
            await crmUpdate(req, 'projectTask', crmId, data);
        }
        else {
            const newId = await crmCreate(req, 'projectTask', data);
            if (newId)
                await saveMapping(req, 'projectTask', task.id, newId);
        }
    }
    catch (err) {
        console.error('[crmSync] project task upsert failed', task.id, err);
    }
}
async function syncProjectTaskDelete(req, taskId) {
    try {
        const crmId = await getCrmId(req, 'projectTask', taskId);
        if (!crmId)
            return;
        await crmDelete(req, 'projectTask', crmId);
        await deleteMapping(req, 'projectTask', taskId);
    }
    catch (err) {
        console.error('[crmSync] project task delete failed', taskId, err);
    }
}
// ---------------------------------------------------------------------------
// Reconciliation: catch CRM-side deletes.
//
// Zoho CRM workflow rules cannot fire a webhook on record deletion, so a
// task deleted directly in CRM never reaches crmWebhook.ts. Instead this
// periodically lists every live Task_list record id and deletes the
// BuildTrack counterpart of any mapped crm_id that's gone missing.
//
// Writes go straight through db.run (not the route handlers) so they don't
// re-trigger syncTaskDelete/syncProjectTaskDelete and bounce back to CRM.
// ---------------------------------------------------------------------------
async function fetchAllCrmTaskIds(req) {
    const ids = new Set();
    let page = 1;
    while (true) {
        const body = await crmRequest(req, 'GET', `/${MODULE.task}?fields=id&per_page=200&page=${page}`).catch((err) => {
            // CRM returns a 204/"no content" style error once pages run out.
            if (String(err?.message || '').includes('HTTP 204'))
                return null;
            throw err;
        });
        const records = body?.data || [];
        for (const r of records)
            if (r?.id)
                ids.add(String(r.id));
        if (records.length < 200)
            break;
        page += 1;
    }
    return ids;
}
async function reconcileCrmTaskDeletes(req) {
    try {
        const liveCrmIds = await fetchAllCrmTaskIds(req);
        const mapped = await db.all(req, `SELECT entity_type, buildtrack_id, crm_id FROM crm_sync_map WHERE entity_type IN ('task', 'projectTask')`);
        for (const row of mapped) {
            if (liveCrmIds.has(String(row.crm_id)))
                continue;
            const entityType = row.entity_type;
            const table = entityType === 'task' ? 'tasks' : 'project_tasks';
            try {
                const existing = await db.get(req, `SELECT * FROM ${table} WHERE id = ?`, [row.buildtrack_id]);
                if (existing) {
                    await db.run(req, `DELETE FROM ${table} WHERE id = ?`, [row.buildtrack_id]);
                    console.log(`[crmSync] reconcile: deleted ${entityType} ${row.buildtrack_id} (CRM record ${row.crm_id} no longer exists)`);
                }
                await deleteMapping(req, entityType, row.buildtrack_id);
            }
            catch (err) {
                console.error('[crmSync] reconcile delete failed for', entityType, row.buildtrack_id, err);
            }
        }
    }
    catch (err) {
        console.error('[crmSync] reconcile pass failed', err);
    }
}
