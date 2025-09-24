// services/api/routes/api/metrics-report.mjs
import { Router } from 'express';
import metrics from '../../middleware/metrics.mjs';
const router = Router();
router.get('/reports/summary', (req, res) => {
  const hours = Number.parseInt(req.query.hours ?? '24', 10);
  const h = Number.isFinite(hours) && hours > 0 ? hours : 24;
  const data = metrics.getSummary(h);
  res.json({ ok: true, ...data });
});
export default router;
