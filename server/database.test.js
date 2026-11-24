import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabasePool, describeDatabaseError } from './database.js';

test('localhost connection failures retain actionable errors when the aggregate message is empty', () => {
  const error = new AggregateError([
    Object.assign(new Error('connect ECONNREFUSED ::1:5432'), { code: 'ECONNREFUSED' }),
    Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' }),
  ]);
  const result = describeDatabaseError(error);
  assert.equal(result.status, 503);
  assert.match(result.message, /docker compose up -d/);
  assert.match(result.message, /PGHOST and PGPORT/);
});

test('authentication failures explain which settings need checking', () => {
  const result = describeDatabaseError({
    code: '28P01',
    message: 'password authentication failed',
  });
  assert.equal(result.status, 503);
  assert.match(result.message, /PGUSER and PGPASSWORD/);
});

test('SQL errors and duplicate database conflicts retain their original details', () => {
  assert.deepEqual(
    describeDatabaseError({ code: '42601', message: 'syntax error at or near SELECT' }),
    {
      status: 400,
      message: 'syntax error at or near SELECT',
    },
  );
  assert.deepEqual(describeDatabaseError({ code: '42P04', message: 'database already exists' }), {
    status: 409,
    message: 'database already exists',
  });
});

test('idle pool disconnects are handled so they do not become uncaught error events', async () => {
  const messages = [];
  const pool = createDatabasePool({}, (message) => messages.push(message));
  try {
    assert.doesNotThrow(() =>
      pool.emit('error', Object.assign(new Error('terminating connection'), { code: '57P01' })),
    );
    assert.match(messages[0], /PostgreSQL shut down/);
  } finally {
    await pool.end();
  }
});
