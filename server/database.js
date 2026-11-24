import pg from 'pg';

const connectionErrors = {
  ECONNREFUSED:
    'PostgreSQL refused the connection. Start the database with docker compose up -d, and check PGHOST and PGPORT in .env.',
  ENOTFOUND: 'PostgreSQL host could not be found. Check PGHOST in .env.',
  EAI_AGAIN: 'PostgreSQL host lookup failed. Check PGHOST and your network, then reconnect.',
  ETIMEDOUT:
    'PostgreSQL connection timed out. Check that the database is running and PGHOST and PGPORT are correct.',
  ECONNRESET: 'PostgreSQL disconnected. Check that the database is running, then reconnect.',
  EPERM:
    'Permission denied connecting to PostgreSQL. Check the permissions or sandbox of the process running Gibble.',
  EACCES:
    'Permission denied connecting to PostgreSQL. Check the database socket and process permissions.',
  '28P01':
    'PostgreSQL authentication failed. Check PGUSER and PGPASSWORD in .env against the existing database credentials.',
  28000:
    'PostgreSQL rejected this role or connection. Check PGUSER in .env and the database authentication rules.',
  '3D000':
    'The requested PostgreSQL database does not exist. Check PGDATABASE in .env, or reconnect to refresh the graph list.',
  '57P01': 'PostgreSQL shut down the connection. Start the database, then reconnect.',
  '57P02': 'PostgreSQL is restarting after a failure. Check the database logs, then reconnect.',
  '57P03': 'PostgreSQL is starting or shutting down. Wait for it to be ready, then reconnect.',
};

export function describeDatabaseError(error) {
  // Node can report localhost connection failures as an AggregateError with an empty message.
  const code = error.code || error.errors?.find((item) => item.code)?.code;
  if (connectionErrors[code]) return { status: 503, message: connectionErrors[code] };
  return {
    status: code === '42P04' ? 409 : 400,
    message:
      error.message ||
      error.errors?.find((item) => item.message)?.message ||
      'Database request failed.',
  };
}

export function createDatabasePool(options, reportError = console.error) {
  const pool = new pg.Pool(options);
  // Idle connections emit errors outside request handlers when PostgreSQL disconnects.
  // Handling them keeps the API alive so a later request can open a fresh connection.
  pool.on('error', (error) =>
    reportError('Gibble PostgreSQL connection: ' + describeDatabaseError(error).message),
  );
  return pool;
}
