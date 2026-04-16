/**
 * Shared PostgreSQL pool for the app.
 * Only created if DATABASE_URL is set.
 */
let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

module.exports = { getPool };
