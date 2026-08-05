import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/', (req, res) => {
  const { drawingId } = req.query;
  const rows = drawingId
    ? db.prepare('SELECT * FROM activity WHERE drawingId = ? ORDER BY createdAt DESC LIMIT 50').all(drawingId)
    : db.prepare('SELECT * FROM activity ORDER BY createdAt DESC LIMIT 50').all();
  res.json(rows);
});

export default router;
