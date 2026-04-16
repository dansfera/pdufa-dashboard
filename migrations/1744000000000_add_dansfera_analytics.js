module.exports = {
  name: 'add_dansfera_analytics',
  up: async (client) => {
    // Core analytics events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS dansfera_analytics (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,       -- 'page_view' | 'cta_click'
        page VARCHAR(500),                     -- normalized route (e.g. '/', '/drug/orca-t')
        cta_placement VARCHAR(100),            -- 'sticky_banner' | 'table_block' | 'drug_inline' (for cta_click)
        ref_source VARCHAR(100),               -- 'twitter' | 'discord' | 'search' | 'direct' | 'other'
        referrer TEXT,                         -- raw Referer header (truncated to 500)
        is_bot BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for fast admin queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS dansfera_analytics_created_idx
        ON dansfera_analytics (created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS dansfera_analytics_event_type_idx
        ON dansfera_analytics (event_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS dansfera_analytics_page_idx
        ON dansfera_analytics (page)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS dansfera_analytics_ref_source_idx
        ON dansfera_analytics (ref_source)
    `);
  },
  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS dansfera_analytics`);
  }
};
