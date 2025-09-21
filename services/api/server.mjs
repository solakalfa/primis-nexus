import express from 'express';
import pino from 'pino';
import eventsRoute from './routes/api/events.mjs';
import reportsRoute from './routes/api/reports.mjs';
import { migrate, pingDb } from './src/db.mjs';
import { cfg } from './src/config.mjs';

const app = express();
// --- CORS minimal ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// --- /CORS ---

const logger = pino();

app.use((req, _res, next) => { req.log = logger; next(); });
app.use(express.json({ limit: cfg.jsonLimit }));

app.get('/api/health', async (_req, res) => {
  const db = await pingDb();
  res.json({
    ok: true,
    db,
    mode: cfg.mode,
    service: 'primis-nexus-api',
    config: {
      port: cfg.port,
      payloadCap: cfg.payloadCap,
      ratePerMin: cfg.ratePerMin,
      jsonLimit: cfg.jsonLimit
    }
  });
});

// latency header + log (safe: set header BEFORE sending the response)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const _end = res.end;
  res.end = function (chunk, encoding, cb) {
    try {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      // header לפני השליחה (עדיין לא נשלחה התגובה כי אנחנו בתוך end המקורי)
      res.setHeader('x-response-time', ms.toFixed(2));
      req.log.info({ path: req.path, method: req.method, ms: +ms.toFixed(2) }, 'req_done');
    } catch {}
    return _end.call(this, chunk, encoding, cb);
  };
  next();
});

app.use('/api', eventsRoute);
app.use('/api', reportsRoute);

app.listen(cfg.port, async () => {
  await migrate();
  logger.info({ port: cfg.port, mode: cfg.mode }, 'Primis Nexus API listening');
});
