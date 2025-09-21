import assert from 'node:assert/strict';

const base = `http://127.0.0.1:${process.env.PORT || 8081}`;

async function http(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// happy path
const ok = await http('POST', '/api/events', { payload: { a: 1 } });
assert.equal(ok.status, 201);

// validation: missing payload
const bad = await http('POST', '/api/events', { click_id: 'x' });
assert.equal(bad.status, 422);
assert.equal(bad.json.error, 'validation_error');

// payload cap: create > cap json string
const big = "x".repeat(Number(process.env.PAYLOAD_BYTES_CAP || 2048) + 10);
const tooBig = await http('POST', '/api/events', { payload: { big } });
assert.equal(tooBig.status, 422);

console.log('[contract] OK');
