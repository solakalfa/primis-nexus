import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPendingOutbox, markOutboxSuccess, markOutboxFailure } from '../../src/outbox.mjs';

const router = Router();

const PIXEL_ID = process.env.META_PIXEL_ID || '';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const DRY_RUN = !PIXEL_ID || !ACCESS_TOKEN;
const DEFAULT_UA = process.env.DEFAULT_UA || 'PNexus/1.0';
const DEFAULT_IP = process.env.DEFAULT_IP || '8.8.8.8';
const EVENT_SOURCE_URL = process.env.EVENT_SOURCE_URL || 'https://primis-nexus.app/';

// Minimal Meta CAPI sender (Purchase)
async function sendToMeta(item) {
  const payload = item.payload || {};
  const events = [{
    event_name: 'Purchase',
    event_time: Math.floor(Date.now()/1000),
    action_source: 'website',
    event_source_url: EVENT_SOURCE_URL,
    user_data: { client_user_agent: DEFAULT_UA, client_ip_address: DEFAULT_IP },
    event_id: payload.idempotency_key || payload.id,
    custom_data: {
      currency: payload.currency || 'USD',
      value: Number(payload.value || 0)
    }
  }];

  if (DRY_RUN) {
    return { dry_run: true, events_sent: events.length };
  }

  const url = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: events, test_event_code: process.env.META_TEST_EVENT_CODE || undefined })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Meta CAPI ${res.status}: ${JSON.stringify(json).slice(0,300)}`);
    err.status = res.status;
    err.response = json;
    throw err;
  }
  return json;
}

router.post('/destinations/meta/flush', async (_req, res) => {
  const traceId = uuidv4();
  try {
    const items = await getPendingOutbox(50);
    let ok = 0, fail = 0;
    for (const it of items) {
      try {
        await sendToMeta(it);
        await markOutboxSuccess(it.id);
        ok++;
      } catch (e) {
        await markOutboxFailure(it.id, e);
        fail++;
      }
    }
    return res.json({ ok: true, processed: items.length, sent: ok, failed: fail, dry_run: DRY_RUN, traceId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e), traceId });
  }
});

export default router;
