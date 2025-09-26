// Simple API Key auth via X-API-Key header
export function apiKeyAuth(req, res, next) {
  const header = req.header('X-API-Key');
  const allow = (process.env.API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allow.length) return res.status(503).json({ error: 'API temporarily unavailable (no keys configured)' });
  if (!header || !allow.includes(header)) return res.status(401).json({ error: 'invalid API key' });
  req.apiKey = header;
  next();
}
