import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { foreignKeyQuery } from './schema.js';
import { makeGraph, quote } from './graph.js';

test(
  'PostgreSQL foreign-key metadata decodes into arrays and produces edges',
  { skip: !process.env.GIBBLE_TEST_DATABASE },
  async () => {
    const db = new pg.Client({
      database: process.env.GIBBLE_TEST_DATABASE,
      connectionTimeoutMillis: 4000,
    });
    await db.connect();
    try {
      await db.query('BEGIN READ ONLY');
      const { rows: fks } = await db.query(foreignKeyQuery);
      assert.ok(fks.length > 0, 'Choose a test database containing foreign keys');
      for (const fk of fks) {
        assert.ok(
          Array.isArray(fk.source_columns),
          'source_columns must decode as a JavaScript array',
        );
        assert.ok(
          Array.isArray(fk.target_columns),
          'target_columns must decode as a JavaScript array',
        );
        assert.equal(fk.source_columns.length, fk.target_columns.length);
        assert.ok(fk.source_columns.every((c) => typeof c === 'string'));
      }
      const { rows: names } = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
      );
      const tables = [];
      for (const { table_name: name } of names) {
        const { rows } = await db.query('SELECT * FROM public.' + quote(name) + ' LIMIT 500');
        tables.push({ name, rows, primaryKeys: [] });
      }
      const graph = makeGraph(tables, fks);
      assert.ok(graph.edges.length > 0, 'Choose a test database with linked rows');
      const ids = new Set(graph.nodes.map((n) => n.data.id));
      for (const edge of graph.edges) {
        assert.ok(ids.has(edge.data.source));
        assert.ok(ids.has(edge.data.target));
      }
    } finally {
      await db.query('ROLLBACK').catch(() => {});
      await db.end();
    }
  },
);
