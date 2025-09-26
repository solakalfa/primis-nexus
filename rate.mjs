// Simple rate limit per minute per key/ip
const hits = new Map();
export function rateLimit(req, res, next) {
  const limit = Number(process.env.RATE_LIMIT_PER_MIN || 60);
  const key = req.apiKey || req.ip || 'anon';
  const now = Date.now();
  const minute = 60 * 1000;
  const bucket = hits.get(key)?.filter(ts => now - ts < minute) || [];
  bucket.push(now);
  hits.set(key, bucket);
  if (bucket.length > limit) return res.status(429).json({ error: 'rate limit exceeded' });
  next();
}
