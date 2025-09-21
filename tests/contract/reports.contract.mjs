import assert from 'node:assert/strict';

const base = `http://127.0.0.1:${process.env.PORT || 8081}`;

async function http(path) {
  const res = await fetch(base + path);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// Create some events first
await fetch(base + '/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: { foo: 'bar' }, click_id: 'X1' })
});
await fetch(base + '/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: { foo: 'baz' }, click_id: 'X1' })
});

const eventsReport = await http('/api/reports/events');
assert.equal(eventsReport.status, 200);
assert.ok(Array.isArray(eventsReport.json.items));
assert.ok(eventsReport.json.items[0].click_id);

const summaryReport = await http('/api/reports/summary');
assert.equal(summaryReport.status, 200);
assert.ok(typeof summaryReport.json.summary.total === 'number');

console.log('[reports contract] OK');
