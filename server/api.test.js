import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/api.js';

test('database error details reach the caller, and a later reconnect can succeed', async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () =>
    ++attempts === 1
      ? Response.json(
          { error: 'PostgreSQL authentication failed. Check PGUSER and PGPASSWORD.' },
          { status: 503 },
        )
      : Response.json([{ id: 'gibble_example', name: 'example' }]),
  );
  await assert.rejects(api('/databases'), /PostgreSQL authentication failed/);
  assert.deepEqual(await api('/databases'), [{ id: 'gibble_example', name: 'example' }]);
});

test('a stopped API or wrong frontend server produces guidance instead of a JSON parsing error', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('<html>Not the API</html>', { status: 200 }),
  );
  await assert.rejects(api('/databases'), /did not return a Gibble API response.*HTTP 200/);
});

test('an empty Vite proxy failure explains that the API is unavailable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }));
  await assert.rejects(api('/databases'), /HTTP 500.*API terminal/);
});

test('network failures provide a reconnect instruction', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(api('/databases'), /Cannot reach the Gibble API.*reconnect/);
});
