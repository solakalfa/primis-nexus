import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { insertEvent, listEvents } from '../../src/db.mjs';

const router = Router();
const payloadCap = Number(process.env.PAYLOAD_BYTES_CAP || 2048);
const ratePerMin = Number(process.env.API_RATE_PER_MIN || 120);
const rl = new Map(); // ip -> {count, tsMinute}

const EventSchema = z.object({
  click_id: z.string().min(1).max(128).optional(),
  payload: z.record(z.any()).refine((v) => JSON.stringify(v).length <= payloadCap, {
    message: `payload too large (>${payloadCap} bytes)`
  })
});

function softRateLimit(ip) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const entry = rl.get(ip) || { count: 0, tsMinute: minute };
  if (entry.tsMinute !== minute) {
    entry.count = 0;
    entry.tsMinute = minute;
  }
  entry.count += 1;
  rl.set(ip, entry);
  return entry.count > ratePerMin;
}

// POST /api/events
router.post('/events', async (req, res) => {
  const traceId = uuidv4();
  const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown') as string;
  if (softRateLimit(ip)) {
    return res.status(429).json({ error: 'rate_limited', traceId });
  }

  const parse = EventSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(422).json({ error: 'validation_error', details: parse.error.flatten(), traceId });
  }

  const { click_id = null, payload } = parse.data;
  const id = uuidv4();
  try {
    await insertEvent({ id, click_id, payload });
    return res.status(201).json({ id, traceId });
  } catch {
    return res.status(500).json({ error: 'db_error', traceId });
  }
});

// GET /api/events
// - אם יש payload בשורת השאילתה: נשמור אירוע (pixel / noscript)
// - אחרת: נחזיר רשימת אירועים
router.get('/events', async (req, res) => {
  const traceId = uuidv4();

  if (req.query?.payload) {
    const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown') as string;
    if (softRateLimit(ip)) {
      return res.status(429).json({ error: 'rate_limited', traceId });
    }

    try {
      const payload = JSON.parse(String(req.query.payload));
      const parsed = EventSchema.safeParse({ click_id: req.query.click_id, payload });
      if (!parsed.success) {
        return res.status(422).json({ error: 'validation_error', details: parsed.error.flatten(), traceId });
      }
      const { click_id = null, payload: pl } = parsed.data;
      const id = uuidv4();
      await insertEvent({ id, click_id, payload: pl });
      return res.json({ ok: true, saved: true, id, traceId });
    } catch (e) {
      return res.status(400).json({ ok: false, error: (e as Error).message, traceId });
    }
  }

  try {
    const items = await listEvents();
    return res.json({ items, traceId });
  } catch {
    return res.status(500).json({ error: 'db_error', traceId });
  }
});

export default router;
