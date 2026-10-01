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

import { Router } from 'express';
import * as db from '../db';

const router = Router();

type EntityType = 'project' | 'milestone' | 'task';

async function findBuildtrackId(req: any, entityType: EntityType, crmId: string): Promise<string | null> {
  const row = await db.get(
    req,
    'SELECT buildtrack_id FROM crm_sync_map WHERE entity_type = ? AND crm_id = ?',
    [entityType, crmId]
  );
  return row?.buildtrack_id ?? null;
}

async function markSynced(req: any, entityType: EntityType, buildtrackId: string, crmId: string): Promise<void> {
  await db.run(
    req,
    'UPDATE crm_sync_map SET last_synced_at = ?, sync_direction = ? WHERE entity_type = ? AND buildtrack_id = ?',
    [new Date().toISOString(), 'crm_to_buildtrack', entityType, buildtrackId]
  );
}

router.post('/', async (req, res, next) => {
  try {
    if (req.query.secret !== process.env.CRM_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    // Zoho CRM workflow webhooks post the module's field values directly in the body.
    const { module, id, Name } = req.body || {};
    if (!module || !id) return res.status(400).json({ error: 'module and id are required' });

    const entityType: EntityType | null =
      module === 'Ashok_Prime_Home_Projects' ? 'project' :
      module === 'Milestones' ? 'milestone' :
      module === 'Task_list' ? 'task' : null;
    if (!entityType) return res.status(400).json({ error: `Unrecognized module: ${module}` });

    const buildtrackId = await findBuildtrackId(req, entityType, id);
    if (!buildtrackId) {
      // Record was created in CRM directly, not via BuildTrack — no mapping to update yet.
      return res.status(204).end();
    }

    const table = entityType === 'project' ? 'projects' : entityType === 'milestone' ? 'milestones' : 'tasks';
    const existing: any = await db.get(req, `SELECT * FROM ${table} WHERE id = ?`, [buildtrackId]);
    if (!existing) return res.status(404).json({ error: 'BuildTrack record not found' });

    if (Name && Name !== existing.name) {
      await db.run(req, `UPDATE ${table} SET name = ?, updatedAt = ? WHERE id = ?`, [Name, new Date().toISOString(), buildtrackId]);
    }
    await markSynced(req, entityType, buildtrackId, id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
