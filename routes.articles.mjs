import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';

const ensure = (dir) => { if (!fs.existsSync(dir)) fse.mkdirpSync(dir); };

const loadDb = (file) => {
  if (!fs.existsSync(file)) return { articles: {} };
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { articles: {} }; }
};

const saveDb = (file, db) => fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');

const slugify = (s) => s.toLowerCase()
  .replace(/[^a-z0-9֐-׿]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const mdTemplate = ({title, summary, body, tags}) => `---
title: "${(title||'').replace(/"/g,'\"')}"
description: "${(summary||'').replace(/"/g,'\"')}"
tags: ${JSON.stringify(tags||[])}
date: "${new Date().toISOString()}"
---

${body||''}
`;

export default function ArticlesRouter({ dataDir, contentDir }) {
  ensure(dataDir); ensure(contentDir);
  const dbFile = path.join(dataDir, 'articles.json');
  const router = express.Router();

  // Submit
  router.post('/submit', (req, res) => {
    const { topic, keywords = [], metadata = {}, options = {} } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'topic is required' });
    const id = uuidv4();
    const db = loadDb(dbFile);
    db.articles[id] = {
      id, topic, keywords, metadata,
      status: 'pending',
      created_at: new Date().toISOString(),
      draft: {
        title: options.headline || topic,
        summary: options.summary || '',
        body: options.seed_content || `# ${options.headline || topic}\n\nכתוב כאן את גוף המאמר...`,
        tags: options.tags || keywords
      }
    };
    saveDb(dbFile, db);
    return res.status(202).json({ request_id: id, status: 'pending' });
  });

  // Status
  router.get('/:id/status', (req, res) => {
    const { id } = req.params;
    const db = loadDb(dbFile);
    const art = db.articles[id];
    if (!art) return res.status(404).json({ error: 'not found' });
    return res.json({ request_id: id, status: art.status });
  });

  // Publish
  router.post('/:id/publish', (req, res) => {
    const { id } = req.params;
    const db = loadDb(dbFile);
    const art = db.articles[id];
    if (!art) return res.status(404).json({ error: 'not found' });

    if (art.status === 'pending') art.status = 'ready';

    const title = (req.body && req.body.title) || art.draft.title;
    const summary = (req.body && req.body.summary) || art.draft.summary;
    const body = (req.body && req.body.body) || art.draft.body;
    const tags = (req.body && req.body.tags) || art.draft.tags;

    const slug = slugify(title);
    const filePath = path.join(contentDir, `${slug}.md`);
    ensure(contentDir);
    fs.writeFileSync(filePath, mdTemplate({ title, summary, body, tags }), 'utf8');

    art.status = 'published';
    art.published = { slug, file: filePath, at: new Date().toISOString() };
    saveDb(dbFile, db);

    return res.json({ id, status: art.status, slug, file: filePath });
  });

  return router;
}
