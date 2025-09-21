import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { reportEvents, reportSummary } from '../../src/db.mjs';

const router = Router();

router.get('/reports/events', async (_req, res) => {
  const traceId = uuidv4();
  try {
    const items = await reportEvents();
    return res.json({ items, traceId });
  } catch (e) {
    return res.status(500).json({ error: 'db_error', traceId });
  }
});

router.get('/reports/summary', async (_req, res) => {
  const traceId = uuidv4();
  try {
    const summary = await reportSummary();
    return res.json({ summary, traceId });
  } catch (e) {
    return res.status(500).json({ error: 'db_error', traceId });
  }
});

export default router;
