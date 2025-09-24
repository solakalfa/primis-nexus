// services/api/middleware/metrics.mjs
const METRICS = { reqs: [] };

export function requestTimer(req, res, next) {
  const t0 = Date.now();
  res.on('finish', () => {
    try {
      METRICS.reqs.push({
        t: Date.now(),
        dur_ms: Date.now() - t0,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode
      });
      if (METRICS.reqs.length > 100000) METRICS.reqs.splice(0, METRICS.reqs.length - 80000);
    } catch {}
  });
  next();
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a,b)=>a-b);
  const idx = Math.ceil((p/100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length-1, idx))];
}

export function getSummary(hours=24) {
  const horizon = Date.now() - (hours*60*60*1000);
  const rows = METRICS.reqs.filter(r => r.t >= horizon);
  const total = rows.length;
  const ok = rows.filter(r => r.status >= 200 && r.status < 300).length;
  const fail = total - ok;
  const durations = rows.map(r => r.dur_ms);
  const p95 = percentile(durations, 95);
  const p99 = percentile(durations, 99);
  const avg = durations.length ? (durations.reduce((a,b)=>a+b,0) / durations.length) : null;
  const buckets = {
    convert: rows.filter(r => r.path.includes('/api/convert')).length,
    events: rows.filter(r => r.path.includes('/api/events')).length,
    flush: rows.filter(r => r.path.includes('/destinations/meta/flush')).length,
    health: rows.filter(r => r.path.includes('/api/health')).length
  };
  return { window_hours: hours, totals: { total, ok, fail }, latency_ms: { p95, p99, avg }, hits: buckets, now: new Date().toISOString() };
}

export default { requestTimer, getSummary };
