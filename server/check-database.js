import 'dotenv/config';
import pg from 'pg';
import { describeDatabaseError } from './database.js';

const client = new pg.Client({ connectionTimeoutMillis: 4000 });
console.log(
  'Checking PostgreSQL:',
  JSON.stringify({
    host: client.host,
    port: client.port,
    database: client.database,
    user: client.user,
  }),
);

try {
  await client.connect();
  const {
    rows: [role],
  } = await client.query(
    'SELECT rolcreatedb OR rolsuper AS can_create_database FROM pg_roles WHERE rolname = current_user',
  );
  // Use the same catalog/size query as the landing page to catch access failures too.
  const { rows } = await client.query(
    "SELECT datname AS id, pg_database_size(oid)::text AS bytes FROM pg_database WHERE left(datname,7)='gibble_' ORDER BY datname",
  );
  console.log('Connection and graph listing succeeded.');
  console.log('Graphs:', rows.map((row) => row.id).join(', ') || '(none yet)');
  if (!role?.can_create_database)
    console.warn(
      'This PostgreSQL role cannot create databases. New Graph requires CREATEDB permission.',
    );
} catch (error) {
  console.error(describeDatabaseError(error).message);
  if (error.code) console.error('Error code:', error.code);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
