import pg from 'pg';
const { Pool } = pg;

const MODE = (process.env.DB_MODE || 'mem').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
if (MODE === 'pg') {
  pool = new Pool({ connectionString: DATABASE_URL });
}

// in-mem store כשעובדים במצב MEM
const mem = { conversions: [] };

// טבלה פשוטה בלי הרחבות: id כ-TEXT (uuid נוצרת בצד Node)
async function ensureTable() {
  if (MODE !== 'pg') return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversions (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE NOT NULL,
      click_id TEXT NOT NULL,
      value NUMERIC DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

// יצירת UUID בלי תלות בחבילות:
function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random());
}

// UPSERT לפי idempotency_key
export async function upsertConversion({ idempotency_key, click_id, value = 0, currency = 'USD' }) {
  if (MODE === 'pg') {
    await ensureTable();
    const id = newId();
    const sql = `
      INSERT INTO conversions (id, idempotency_key, click_id, value, currency)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (idempotency_key) DO UPDATE
        SET click_id = EXCLUDED.click_id,
            value    = EXCLUDED.value,
            currency = EXCLUDED.currency
      RETURNING id, idempotency_key, click_id, value::float, currency, created_at;
    `;
    const { rows } = await pool.query(sql, [id, idempotency_key, click_id, value, currency]);
    return rows[0];
  }

  // MEM
  const existing = mem.conversions.find(c => c.idempotency_key === idempotency_key);
  if (existing) {
    existing.click_id = click_id;
    existing.value = value;
    existing.currency = currency;
    return existing;
  }
  const row = {
    id: newId(),
    idempotency_key, click_id, value, currency,
    created_at: new Date().toISOString()
  };
  mem.conversions.push(row);
  return row;
}
