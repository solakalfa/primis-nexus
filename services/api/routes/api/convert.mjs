import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { upsertConversion, findEventByClickId } from '../../src/db.mjs';

const router = Router();

const ConvertSchema = z.object({
  click_id: z.string().min(1).max(128),
  value: z.number().finite().nonnegative().default(0),
  currency: z.string().min(3).max(10).default('USD'),
  idempotency_key: z.string().min(1).max(128)
});

router.post('/convert', async (req, res) => {
  const traceId = uuidv4();
  try {
    const parsed = ConvertSchema.parse(req.body || {});
    const click = await findEventByClickId(parsed.click_id);
    const conv = await upsertConversion(parsed);
    return res.json({ ok: true, linked: Boolean(click), conversion: conv, traceId });
  } catch (e) {
    return res.status(422).json({ ok: false, error: String(e?.message || e), traceId });
  }
});

export default router;
