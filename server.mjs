import { apiKeyAuth } from './auth.mjs';
import { rateLimit } from './rate.mjs';
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import ArticlesRouter from './routes.articles.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'pn-articles-api-mvp' }));
// Global middleware: auth + rate limit for API routes
app.use('/api/v1', apiKeyAuth, rateLimit);

app.use('/api/v1/articles', ArticlesRouter({
  dataDir: path.join(__dirname, 'data'),
  contentDir: process.env.CONTENT_DIR || path.join(__dirname, '..', 'primis-nexus-site', 'src', 'content', 'articles')
}));

const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`[ARTICLES-API] http://${HOST}:${PORT}`));
