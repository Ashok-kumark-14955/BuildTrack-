import { Router } from 'express';
import * as db from '../db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { drawingId } = req.query;
    const rows = drawingId
      ? await db.all(req, 'SELECT * FROM activity WHERE drawingId = ? ORDER BY createdAt DESC LIMIT 50', [drawingId])
      : await db.all(req, 'SELECT * FROM activity ORDER BY createdAt DESC LIMIT 50');
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
