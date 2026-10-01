"use strict";
/**
 * crmWebhook.ts
 *
 * Receives outgoing webhooks from Zoho CRM Workflow Rules (configured on
 * Ashok_Prime_Home_Projects, Milestones, and Task_list) and applies the
 * change to the matching BuildTrack row via `crm_sync_map`.
 *
 * Writes here use db.insertRow/updateRow directly (NOT the projects/
 * milestones/tasks route handlers) so they don't re-trigger crmSync.ts and
 * bounce the change straight back to CRM.
 *
 * Auth: CRM webhooks can't do OAuth, so the workflow rule's webhook URL must
 * include `?secret=<CRM_WEBHOOK_SECRET>` — requests without a matching
 * secret are rejected.
 *
 * Deletes are intentionally NOT handled — CRM-side deletes are ignored.
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
const db = __importStar(require("../db"));
const router = (0, express_1.Router)();
async function findBuildtrackId(req, entityType, crmId) {
    const row = await db.get(req, 'SELECT buildtrack_id FROM crm_sync_map WHERE entity_type = ? AND crm_id = ?', [entityType, crmId]);
    return row?.buildtrack_id ?? null;
}
async function markSynced(req, entityType, buildtrackId, crmId) {
    await db.run(req, 'UPDATE crm_sync_map SET last_synced_at = ?, sync_direction = ? WHERE entity_type = ? AND buildtrack_id = ?', [new Date().toISOString(), 'crm_to_buildtrack', entityType, buildtrackId]);
}
router.post('/', async (req, res, next) => {
    try {
        if (req.query.secret !== process.env.CRM_WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }
        // Zoho CRM workflow webhooks post the module's field values directly in the body.
        const { module, id, Name } = req.body || {};
        if (!module || !id)
            return res.status(400).json({ error: 'module and id are required' });
        const entityType = module === 'Ashok_Prime_Home_Projects' ? 'project' :
            module === 'Milestones' ? 'milestone' :
                module === 'Task_list' ? 'task' : null;
        if (!entityType)
            return res.status(400).json({ error: `Unrecognized module: ${module}` });
        const buildtrackId = await findBuildtrackId(req, entityType, id);
        if (!buildtrackId) {
            // Record was created in CRM directly, not via BuildTrack — no mapping to update yet.
            return res.status(204).end();
        }
        const table = entityType === 'project' ? 'projects' : entityType === 'milestone' ? 'milestones' : 'tasks';
        const existing = await db.get(req, `SELECT * FROM ${table} WHERE id = ?`, [buildtrackId]);
        if (!existing)
            return res.status(404).json({ error: 'BuildTrack record not found' });
        if (Name && Name !== existing.name) {
            await db.run(req, `UPDATE ${table} SET name = ?, updatedAt = ? WHERE id = ?`, [Name, new Date().toISOString(), buildtrackId]);
        }
        await markSynced(req, entityType, buildtrackId, id);
        res.status(204).end();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
