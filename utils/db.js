/**
 * Shared PostgreSQL pool for the app.
 * Only created if DATABASE_URL is set.
 *
 * Tuned 2026-05-25 to let Neon scale-to-zero between requests:
 *   - max: cap concurrent connections so we never spawn extra computes
 *   - idleTimeoutMillis: close idle sockets quickly so Neon can suspend
 *   - connectionTimeoutMillis: fail fast on a cold-start instead of hanging
 */
let pool = null;

function getPool() {
    if (pool) return pool;
    if (!process.env.DATABASE_URL) return null;
    const { Pool } = require('pg');
    pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          allowExitOnIdle: true,
    });
    pool.on('error', (err) => {
          console.error('[db] Idle Postgres client error:', err.message);
    });
    return pool;
}

module.exports = { getPool };
