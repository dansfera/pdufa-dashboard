module.exports = {
  name: 'add_fmp_cache',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS fmp_company_cache (
        ticker VARCHAR(20) PRIMARY KEY,
        data JSONB NOT NULL,
        cached_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS fmp_company_cache_cached_at_idx ON fmp_company_cache (cached_at)
    `);
  },
  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS fmp_company_cache`);
  }
};
