import pg from 'pg';
const { Pool } = pg;

const MODE = (process.env.DB_MODE || 'mem').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || '';

let pool = null;
if (MODE === 'pg') {
  pool = new Pool({ connectionString: DATABASE_URL });
}

const mem = { outbox: [] };

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random());
}

export async function ensureOutboxTable() {
  if (MODE !== 'pg') return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

export async function enqueueOutbox(type, payload) {
  const id = newId();
  if (MODE === 'pg') {
    await ensureOutboxTable();
    await pool.query(
      `INSERT INTO outbox (id, type, payload, status) VALUES ($1,$2,$3,'pending')`,
      [id, type, JSON.stringify(payload)]
    );
  } else {
    mem.outbox.push({ id, type, payload, status: 'pending', attempts: 0, created_at: new Date().toISOString() });
  }
  return { id };
}

export async function getPendingOutbox(limit = 50) {
  if (MODE === 'pg') {
    const { rows } = await pool.query(
      `SELECT id, type, payload, attempts, status FROM outbox WHERE status='pending' ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );
    return rows;
  }
  return mem.outbox.filter(x => x.status === 'pending').slice(0, limit);
}

export async function markOutboxSuccess(id) {
  if (MODE === 'pg') {
    await pool.query(`UPDATE outbox SET status='done', updated_at=now() WHERE id=$1`, [id]);
  } else {
    const row = mem.outbox.find(x => x.id === id);
    if (row) row.status = 'done';
  }
}

export async function markOutboxFailure(id, err) {
  if (MODE === 'pg') {
    await pool.query(`UPDATE outbox SET attempts = attempts + 1, last_error = $2, updated_at=now() WHERE id=$1`, [id, String(err).slice(0, 5000)]);
  } else {
    const row = mem.outbox.find(x => x.id === id);
    if (row) {
      row.attempts = (row.attempts || 0) + 1;
      row.last_error = String(err);
    }
  }
}
