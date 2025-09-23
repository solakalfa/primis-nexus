import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import eventsRouter from './routes/api/events.mjs';
import convertRouter from './routes/api/convert.mjs';
import { migrate } from './src/db.mjs';
import cors from 'cors';

const cfg = {
  port: Number(process.env.PORT || 8080),
  mode: process.env.DB_MODE || 'mem',
  jsonLimit: process.env.JSON_LIMIT_BYTES || '1024kb'
};

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

// Middleware
app.use(
  pinoHttp({
    logger,
    genReqId: () => uuidv4(),
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url
      }),
      res: (res) => ({
        statusCode: res.statusCode
      })
    }
  })
);

// CORS
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);
app.options('*', cors());

// Body parser
app.use(bodyParser.json({ limit: cfg.jsonLimit }));

// Routes
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    db: true,
    mode: cfg.mode,
    service: 'primis-nexus-api',
    config: {
      port: cfg.port,
      payloadCap: Number(process.env.PAYLOAD_BYTES_CAP || 2048),
      ratePerMin: Number(process.env.API_RATE_PER_MIN || 120),
      jsonLimit: cfg.jsonLimit
    }
  });
});

app.use('/api', eventsRouter);
app.use('/api', convertRouter);

// Start server — use PORT from env if available

const PORT = Number(process.env.PORT || (cfg.port || 8080));
app.listen(PORT, async () => {
  await migrate();
  logger.info({ port: PORT, mode: cfg.mode }, 'Primis Nexus API listening');
});
