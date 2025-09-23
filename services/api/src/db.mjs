import pg from 'pg';

const { Pool } = pg;
const MODE = (process.env.DB_MODE || 'mem').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL;

let pool;
if (MODE === 'pg') {
  pool = new Pool({ connectionString: DATABASE_URL });
}

const mem = {
  events: [],
};

export async function migrate() {
  if (MODE !== 'pg') return;
  const sql = `CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    click_id TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  ); CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at DESC);`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[DB] migration ok');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[DB] migration failed', e);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

export async function insertEvent({ id, click_id, payload }) {
  if (MODE === 'pg') {
    await pool.query('INSERT INTO events (id, click_id, payload) VALUES ($1, $2, $3)', [id, click_id, payload]);
    return;
  }
  mem.events.unshift({ id, click_id, payload, created_at: new Date().toISOString() });
  if (mem.events.length > 5000) mem.events.pop();
}

export async function listEvents() {
  if (MODE === 'pg') {
    const { rows } = await pool.query('SELECT id, click_id, payload, created_at FROM events ORDER BY created_at DESC LIMIT 50');
    return rows;
  }
  return mem.events.slice(0, 50);
}

export async function pingDb() {
  if (MODE === 'pg') {
    try { await pool.query('SELECT 1'); return true; } catch { return false; }
  }
  return true;
}

export async function reportEvents() {
  if (MODE === 'pg') {
    const { rows } = await pool.query(
      `SELECT click_id, COUNT(*) as count, MAX(created_at) as last_seen
       FROM events GROUP BY click_id ORDER BY count DESC LIMIT 50`
    );
    return rows;
  }
  // MEM mode
  const map = new Map();
  for (const ev of mem.events) {
    if (!ev.click_id) continue;
    const entry = map.get(ev.click_id) || { click_id: ev.click_id, count: 0, last_seen: ev.created_at };
    entry.count += 1;
    if (ev.created_at > entry.last_seen) entry.last_seen = ev.created_at;
    map.set(ev.click_id, entry);
  }
  return Array.from(map.values());
}

export async function reportSummary() {
  if (MODE === 'pg') {
    const { rows } = await pool.query(`SELECT COUNT(*)::int as total FROM events`);
    return { total: rows[0].total };
  }
  return { total: mem.events.length };
}

// === helper for T-Convert Join ===
export async function findEventByClickId(click_id) {
  if (!click_id) return null;
  if (MODE === 'pg') {
    const { rows } = await pool.query(
      `SELECT * FROM events WHERE click_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [click_id]
    );
    return rows[0] || null;
  } else {
    const arr = (mem.events || []).filter(e => e.click_id === click_id);
    return arr.sort((a,b) => (a.created_at||'') < (b.created_at||'') ? 1 : -1)[0] || null;
  }
}

// === helper for T-Convert Join ===
export async function upsertConversion({ idempotency_key, click_id, value = 0, currency = 'USD' }) {
  if (MODE === 'pg') {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        idempotency_key TEXT UNIQUE NOT NULL,
        click_id TEXT NOT NULL,
        value NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    const sql = `
      INSERT INTO conversions (idempotency_key, click_id, value, currency)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (idempotency_key) DO UPDATE
        SET click_id = EXCLUDED.click_id,
            value = EXCLUDED.value,
            currency = EXCLUDED.currency
      RETURNING id, idempotency_key, click_id, value::float, currency, created_at;
    `;
    const { rows } = await pool.query(sql, [idempotency_key, click_id, value, currency]);
    return rows[0];
  } else {
    if (!mem.conversions) mem.conversions = [];
    const existing = mem.conversions.find(c => c.idempotency_key === idempotency_key);
    if (existing) {
      existing.click_id = click_id;
      existing.value = value;
      existing.currency = currency;
      return existing;
    }
    const row = {
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())),
      idempotency_key, click_id, value, currency,
      created_at: new Date().toISOString(),
    };
    mem.conversions.push(row);
    return row;
  }
}
// === T-Convert Join helpers ===
export async function findEventByClickId(click_id) {
  if (MODE === 'pg') {
    const { rows } = await pool.query('SELECT * FROM events WHERE click_id =  ORDER BY created_at DESC LIMIT 1',[click_id]);
    return rows[0] || null;
  } else {
    const arr = (mem.events || []).filter(e => e.click_id === click_id);
    return arr.sort((a,b) => (a.created_at||'') < (b.created_at||'') ? 1 : -1)[0] || null;
  }
}
export async function upsertConversion({ idempotency_key, click_id, value = 0, currency = 'USD' }) {
  if (MODE === 'pg') {
    await pool.query('CREATE TABLE IF NOT EXISTS conversions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_key TEXT UNIQUE NOT NULL, click_id TEXT NOT NULL, value NUMERIC DEFAULT 0, currency TEXT DEFAULT \'USD\', created_at TIMESTAMPTZ DEFAULT now());');
    const sql = 'INSERT INTO conversions (idempotency_key, click_id, value, currency) VALUES (,,,) ON CONFLICT (idempotency_key) DO UPDATE SET click_id = EXCLUDED.click_id, value = EXCLUDED.value, currency = EXCLUDED.currency RETURNING id, idempotency_key, click_id, value::float, currency, created_at;';
    const { rows } = await pool.query(sql, [idempotency_key, click_id, value, currency]);
    return rows[0];
  } else {
    const existing = mem.conversions.find(c => c.idempotency_key === idempotency_key);
    if (existing) { existing.click_id = click_id; existing.value = value; existing.currency = currency; return existing; }
    const row = { id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())), idempotency_key, click_id, value, currency, created_at: new Date().toISOString() };
    mem.conversions.push(row);
    return row;
  }
}
