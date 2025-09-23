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
  jsonLimit: process.env.JSON_LIMIT_BYTES || '1024kb',
};

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(cors({ origin: true }));
app.use(bodyParser.json({ limit: cfg.jsonLimit }));
app.use(pinoHttp({ logger }));

app.get('/api/health', async (_req, res) => {
  const traceId = uuidv4();
  res.json({ ok: true, db: true, now: new Date().toISOString(), traceId });
});

app.use('/api', eventsRouter);
app.use('/api', convertRouter);
app.use('/api', reportsRouter);

const PORT = Number(process.env.PORT || cfg.port);
app.listen(PORT, async () => {
  await migrate();
  logger.info({ port: PORT, mode: cfg.mode }, 'Primis Nexus API listening');
});
