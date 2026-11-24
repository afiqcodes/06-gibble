import 'dotenv/config';
import express from 'express';
import { createDatabasePool, describeDatabaseError } from './database.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quote, makeGraph } from './graph.js';
import { foreignKeyQuery } from './schema.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// The admin connection lists and creates graphs; each graph gets a separate database pool.
const admin = createDatabasePool({
  database: process.env.PGDATABASE || 'postgres',
  connectionTimeoutMillis: 4000,
});
const pools = new Map();
// Route parameters must stay within Gibble's managed database namespace.
const valid = (id) => /^gibble_[a-z0-9_]{1,48}$/.test(id);
const pool = (id) => {
  if (!valid(id)) throw new Error('Invalid database identifier');
  if (!pools.has(id))
    pools.set(
      id,
      createDatabasePool({
        database: id,
        max: 4,
        connectionTimeoutMillis: 4000,
        statement_timeout: 10000,
      }),
    );
  return pools.get(id);
};

app.get('/api/health', async (req, res, next) => {
  try {
    await admin.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (e) {
    next(e);
  }
});

app.get('/api/databases', async (req, res, next) => {
  try {
    // PostgreSQL's catalog is the registry; no separate graph metadata table is needed.
    const { rows } = await admin.query(
      `SELECT datname AS id, pg_database_size(oid)::text AS bytes
       FROM pg_database
       WHERE left(datname, 7) = 'gibble_'
       ORDER BY datname`,
    );
    res.json(rows.map((r) => ({ ...r, name: r.id.slice(7).replaceAll('_', ' ') })));
  } catch (e) {
    next(e);
  }
});

app.post('/api/databases', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!/^[a-zA-Z][a-zA-Z0-9 _-]{0,40}$/.test(name))
      return res.status(400).json({
        error: 'Use 1–41 letters, numbers, spaces, underscores or hyphens; start with a letter.',
      });
    const id = 'gibble_' + name.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
    await admin.query('CREATE DATABASE ' + quote(id));
    res.status(201).json({ id, name });
  } catch (e) {
    next(e);
  }
});

app.post('/api/databases/:id/query', async (req, res, next) => {
  let client;
  try {
    const sql = req.body.sql;
    if (typeof sql !== 'string' || !sql.trim())
      return res.status(400).json({ error: 'Enter a SQL statement.' });
    client = await pool(req.params.id).connect();
    // A transaction makes multi-statement editor submissions atomic. The connection is always reset.
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='10s'");
    await client.query("SET LOCAL lock_timeout='3s'");
    const start = performance.now();
    const result = await client.query(sql);
    await client.query('COMMIT');
    const results = (Array.isArray(result) ? result : [result]).map((r) => ({
      command: r.command,
      rowCount: r.rowCount,
      columns: r.fields.map((f) => f.name),
      rows: r.rows,
    }));
    res.json({ results, duration: Math.round(performance.now() - start) });
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally {
    // Destroy this connection so SQL session settings cannot leak into later editor runs.
    if (client) client.release(true);
  }
});

// Build the shared snapshot consumed by Graph Overview, Tables, and Charts.
app.get('/api/databases/:id/snapshot', async (req, res, next) => {
  try {
    const db = pool(req.params.id);
    const { rows: names } = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    const tables = [];
    for (const { table_name: name } of names) {
      const { rows: keys } = await db.query(
        `SELECT a.attname
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE i.indrelid = $1::regclass AND i.indisprimary
         ORDER BY array_position(i.indkey, a.attnum)`,
        ['public.' + quote(name)],
      );
      // Bound the visual snapshot while reporting the full row count separately.
      const { rows } = await db.query('SELECT * FROM public.' + quote(name) + ' LIMIT 500');
      const { rows: count } = await db.query(
        'SELECT COUNT(*)::text AS count FROM public.' + quote(name),
      );
      const { rows: columns } = await db.query(
        `SELECT column_name AS name, data_type AS type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [name],
      );
      tables.push({
        name,
        rows,
        columns,
        primaryKeys: keys.map((k) => k.attname),
        count: Number(count[0].count),
      });
    }
    const { rows: fks } = await db.query(foreignKeyQuery);
    res.json({ tables, ...makeGraph(tables, fks), limit: 500 });
  } catch (e) {
    next(e);
  }
});

// Serve the production build and let React handle page navigation; unknown API routes stay JSON.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
app.use(express.static(root));
app.get('/{*path}', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Unknown endpoint' });
  res.sendFile(path.join(root, 'index.html'));
});
app.use((err, req, res, next) => {
  const { status, message } = describeDatabaseError(err);
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT || 3002);
const server = app.listen(port, '127.0.0.1');
server.on('listening', () => console.log('Gibble API: http://127.0.0.1:' + port));
server.on('error', (err) => {
  console.error(
    err.code === 'EADDRINUSE'
      ? 'Gibble API could not start: port ' +
          port +
          ' is already in use. Set a free PORT in .env and restart npm run dev.'
      : err.message,
  );
  process.exit(1);
});
// Close pooled database connections when the development watcher or terminal stops the API.
async function shutdown() {
  server.close();
  await Promise.all([admin.end(), ...[...pools.values()].map((p) => p.end())]);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
