import express from 'express';
import pino from 'pino';
import eventsRoute from './routes/api/events.mjs';
import reportsRoute from './routes/api/reports.mjs';
import { migrate, pingDb } from './src/db.mjs';
import { cfg } from './src/config.mjs';

const app = express();
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
// latency + traceId monitor
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    res.setHeader('x-response-time', ms.toFixed(2));
    req.log.info({ path: req.path, method: req.method, ms: +ms.toFixed(2) }, 'req_done');
  });
  next();
});

app.use('/api', eventsRoute);
app.use('/api', reportsRoute);

app.listen(cfg.port, async () => {
  await migrate();
  logger.info({ port: cfg.port, mode: cfg.mode }, 'Primis Nexus API listening');
});
