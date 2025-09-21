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

const health = await http('GET', '/api/health');
assert.equal(health.status, 200);
assert.equal(health.json.ok, true);

const created = await http('POST', '/api/events', { payload: { hello: 'world' }, click_id: 'abc' });
assert.equal(created.status, 201);
assert.ok(created.json.id);
assert.ok(created.json.traceId);

const listed = await http('GET', '/api/events');
assert.equal(listed.status, 200);
assert.ok(Array.isArray(listed.json.items));

console.log('[smoke] OK');
