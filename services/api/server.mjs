import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

import eventsRouter from './routes/api/events.mjs';
import reportsRouter from './routes/api/reports.mjs';
import convertRouter from './routes/api/convert.mjs';
import { migrate } from './src/db.mjs';

const cfg = {
  port: Number(process.env.PORT || 8080),
  mode: (process.env.DB_MODE || 'mem').toLowerCase(),
  jsonLimit: process.env.JSON_LIMIT_BYTES || '1024kb'
};

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: cfg.jsonLimit }));
app.use(pinoHttp({ logger }));

// Health: legacy + v1
app.get('/api/health', (_req, res) => {
  const traceId = uuidv4();
  res.json({ ok: true, db: true, now: new Date().toISOString(), traceId });
});
app.get('/api/v1/health', (_req, res) => {
  const traceId = uuidv4();
  res.json({ ok: true, db: true, now: new Date().toISOString(), traceId });
});

// Deprecation headers for legacy (/api) during pilot
const deprecate = (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', '2025-12-31');
  res.setHeader('Link', '</api/v1>; rel="successor-version"');
  next();
};

// Routers: legacy (/api) kept for now + new (/api/v1)
app.use('/api', deprecate, eventsRouter);
app.use('/api', deprecate, convertRouter);
app.use('/api', deprecate, reportsRouter);

app.use('/api/v1', eventsRouter);
app.use('/api/v1', convertRouter);
app.use('/api/v1', reportsRouter);

const PORT = Number(process.env.PORT || cfg.port);
app.listen(PORT, async () => {
  try { await migrate(); } catch (_) {}
  logger.info({ port: PORT, mode: cfg.mode }, 'Primis Nexus API listening');
});
