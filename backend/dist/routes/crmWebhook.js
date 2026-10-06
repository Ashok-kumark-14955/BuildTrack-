"use strict";
/**
 * crmWebhook.ts
 *
 * Receives outgoing webhooks from Zoho CRM Workflow Rules (configured on
 * Ashok_Prime_Home_Projects, Milestones, and Task_list) and applies the
 * change to the matching BuildTrack row via `crm_sync_map`.
 *
 * IMPORTANT (CRM-side setup): the Workflow Rule's webhook/Instant Action must
 * post the full set of fields below as body parameters, not just "Name" —
 * otherwise the omitted fields are silently treated as "not sent" and left
 * untouched here. For Task_list: Name, Description, Category, Staart,
 * Date_2, Status, Priority, Progress, Assignee_Name, MIleStone, Project.
 * The workflow should fire on both "Create" and "Edit".
 *
 * Writes here use db.run directly (NOT the tasks/projectTasks/milestones
 * route handlers) so they don't re-trigger crmSync.ts and bounce the change
 * straight back to CRM.
 *
 * Task_list backs two different BuildTrack tables (Drawing Grid Tasks and
 * standalone Project Tasks) that share one `crm_sync_map` entity_type set
 * ('task' / 'projectTask') — we try both when resolving a CRM task id.
 *
 * Creates: an edit/update to an existing, already-mapped CRM task updates the
 * matching BuildTrack row. A Task_list record created directly in CRM (no
 * existing mapping) is created in BuildTrack as a standalone Project Task,
 * since a Drawing Grid Task requires a drawingId that has no CRM equivalent
 * to derive it from — it's created only if the CRM record's Project lookup
 * resolves to a known BuildTrack project.
 *
 * Deletes are intentionally NOT handled here — CRM doesn't support delete
 * webhooks. See `reconcileCrmTaskDeletes` in crmSync.ts for that direction.
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
const express_1 = require("express");
const uuid_1 = require("uuid");
const db = __importStar(require("../db"));
const router = (0, express_1.Router)();
async function findMapping(req, entityTypes, crmId) {
    for (const entityType of entityTypes) {
        const row = await db.get(req, 'SELECT buildtrack_id FROM crm_sync_map WHERE entity_type = ? AND crm_id = ?', [entityType, crmId]);
        if (row?.buildtrack_id)
            return { entityType, buildtrackId: row.buildtrack_id };
    }
    return null;
}
async function saveMapping(req, entityType, buildtrackId, crmId, direction) {
    const existing = await db.get(req, 'SELECT crm_id FROM crm_sync_map WHERE entity_type = ? AND buildtrack_id = ?', [entityType, buildtrackId]);
    const now = new Date().toISOString();
    if (existing) {
        await db.run(req, 'UPDATE crm_sync_map SET crm_id = ?, last_synced_at = ?, sync_direction = ? WHERE entity_type = ? AND buildtrack_id = ?', [crmId, now, direction, entityType, buildtrackId]);
    }
    else {
        await db.run(req, 'INSERT INTO crm_sync_map (entity_type, buildtrack_id, crm_id, last_synced_at, sync_direction) VALUES (?, ?, ?, ?, ?)', [entityType, buildtrackId, crmId, now, direction]);
    }
}
function lookupId(value) {
    // Zoho CRM webhooks represent a lookup field either as the bare id string
    // or as an object { id, name }, depending on how the workflow is configured.
    if (!value)
        return null;
    if (typeof value === 'string')
        return value;
    if (typeof value === 'object' && value.id)
        return String(value.id);
    return null;
}
async function resolveBuildtrackId(req, entityType, crmId) {
    if (!crmId)
        return null;
    const row = await db.get(req, 'SELECT buildtrack_id FROM crm_sync_map WHERE entity_type = ? AND crm_id = ?', [entityType, crmId]);
    return row?.buildtrack_id ?? null;
}
router.post('/', async (req, res, next) => {
    try {
        if (req.query.secret !== process.env.CRM_WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }
        // Zoho CRM workflow webhooks post the module's field values directly in the body.
        const { module, id } = req.body || {};
        if (!module || !id)
            return res.status(400).json({ error: 'module and id are required' });
        if (module === 'Ashok_Prime_Home_Projects' || module === 'Milestones') {
            const entityType = module === 'Ashok_Prime_Home_Projects' ? 'project' : 'milestone';
            const mapping = await findMapping(req, [entityType], id);
            if (!mapping)
                return res.status(204).end(); // created directly in CRM — no mapping yet
            const table = entityType === 'project' ? 'projects' : 'milestones';
            const existing = await db.get(req, `SELECT * FROM ${table} WHERE id = ?`, [mapping.buildtrackId]);
            if (!existing)
                return res.status(404).json({ error: 'BuildTrack record not found' });
            const { Name } = req.body;
            if (Name && Name !== existing.name) {
                await db.run(req, `UPDATE ${table} SET name = ?, updatedAt = ? WHERE id = ?`, [Name, new Date().toISOString(), mapping.buildtrackId]);
            }
            await saveMapping(req, entityType, mapping.buildtrackId, id, 'crm_to_buildtrack');
            return res.status(204).end();
        }
        if (module !== 'Task_list') {
            return res.status(400).json({ error: `Unrecognized module: ${module}` });
        }
        const { Name, Description, Category, Staart, Date_2, Status, Priority, Progress, Assignee_Name, MIleStone, Project, } = req.body;
        const mapping = await findMapping(req, ['task', 'projectTask'], id);
        if (mapping?.entityType === 'task') {
            const existing = await db.get(req, 'SELECT * FROM tasks WHERE id = ?', [mapping.buildtrackId]);
            if (!existing)
                return res.status(404).json({ error: 'BuildTrack task not found' });
            const milestoneId = await resolveBuildtrackId(req, 'milestone', lookupId(MIleStone));
            await db.run(req, `UPDATE tasks SET name=?, description=?, category=?, startDate=?, dueDate=?, status=?, priorityLevel=?, progress=?, assignedTo=?, milestoneId=?, updatedAt=? WHERE id=?`, [
                Name ?? existing.name,
                Description ?? existing.description,
                Category ?? existing.category,
                Staart ?? existing.startDate,
                Date_2 ?? existing.dueDate,
                Status ?? existing.status,
                Priority ?? existing.priorityLevel,
                Progress ?? existing.progress,
                Assignee_Name ?? existing.assignedTo,
                milestoneId ?? existing.milestoneId,
                new Date().toISOString(),
                mapping.buildtrackId,
            ]);
            await saveMapping(req, 'task', mapping.buildtrackId, id, 'crm_to_buildtrack');
            return res.status(204).end();
        }
        if (mapping?.entityType === 'projectTask') {
            const existing = await db.get(req, 'SELECT * FROM project_tasks WHERE id = ?', [mapping.buildtrackId]);
            if (!existing)
                return res.status(404).json({ error: 'BuildTrack project task not found' });
            const milestoneId = await resolveBuildtrackId(req, 'milestone', lookupId(MIleStone));
            await db.run(req, `UPDATE project_tasks SET name=?, description=?, dueDate=?, status=?, priorityLevel=?, assignee=?, milestoneId=?, updatedAt=? WHERE id=?`, [
                Name ?? existing.name,
                Description ?? existing.description,
                Date_2 ?? existing.dueDate,
                Status ?? existing.status,
                Priority ?? existing.priorityLevel,
                Assignee_Name ?? existing.assignee,
                milestoneId ?? existing.milestoneId,
                new Date().toISOString(),
                mapping.buildtrackId,
            ]);
            await saveMapping(req, 'projectTask', mapping.buildtrackId, id, 'crm_to_buildtrack');
            return res.status(204).end();
        }
        // No existing mapping — this Task_list record was created directly in CRM.
        // Create it as a standalone BuildTrack Project Task if we can resolve its project.
        const projectId = await resolveBuildtrackId(req, 'project', lookupId(Project));
        if (!projectId) {
            // No way to place this task in BuildTrack without a known project — skip.
            return res.status(204).end();
        }
        const newId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const milestoneId = await resolveBuildtrackId(req, 'milestone', lookupId(MIleStone));
        await db.insertRow(req, 'project_tasks', {
            id: newId,
            projectId,
            name: Name || 'Untitled Task',
            description: Description || '',
            priorityLevel: Priority || 'Medium',
            status: Status || 'To Do',
            assignee: Assignee_Name || '',
            dueDate: Date_2 || '',
            tags: '[]',
            milestoneId: milestoneId || null,
            createdAt: now,
            updatedAt: now,
        });
        await saveMapping(req, 'projectTask', newId, id, 'crm_to_buildtrack');
        return res.status(204).end();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
