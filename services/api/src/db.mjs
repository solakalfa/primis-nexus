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
