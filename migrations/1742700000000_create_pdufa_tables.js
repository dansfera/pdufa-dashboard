module.exports = {
  name: 'create_pdufa_tables',
  up: async (client) => {
    // PDUFA dates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdufa_dates (
        id SERIAL PRIMARY KEY,
        drug_name VARCHAR(255) NOT NULL,
        brand_name VARCHAR(255),
        company VARCHAR(255) NOT NULL,
        ticker VARCHAR(50),
        cashtag VARCHAR(50),
        pdufa_date DATE NOT NULL,
        indication TEXT NOT NULL,
        review_type VARCHAR(50) DEFAULT 'standard',
        designation TEXT[],
        phase VARCHAR(50),
        nda_bla_type VARCHAR(50),
        filing_date DATE,
        status VARCHAR(50) DEFAULT 'upcoming',
        advisory_committee_date DATE,
        notes TEXT,
        slug VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS pdufa_dates_date_idx ON pdufa_dates (pdufa_date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS pdufa_dates_status_idx ON pdufa_dates (status)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS pdufa_dates_slug_idx ON pdufa_dates (slug)
    `);

    // Sentiment scores table (for future xAI integration)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdufa_sentiment (
        id SERIAL PRIMARY KEY,
        drug_id INTEGER REFERENCES pdufa_dates(id) ON DELETE CASCADE,
        score NUMERIC(5,2),
        volume INTEGER,
        source VARCHAR(100),
        raw_data JSONB,
        scored_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS pdufa_sentiment_drug_idx ON pdufa_sentiment (drug_id)
    `);

    // Articles table (for Dan's DD content)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdufa_articles (
        id SERIAL PRIMARY KEY,
        drug_id INTEGER REFERENCES pdufa_dates(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        content TEXT,
        excerpt TEXT,
        author VARCHAR(255) DEFAULT 'Dan Sfera',
        published_at TIMESTAMPTZ,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Admin: track data refresh runs
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdufa_refresh_log (
        id SERIAL PRIMARY KEY,
        source VARCHAR(100),
        records_upserted INTEGER DEFAULT 0,
        status VARCHAR(50),
        notes TEXT,
        ran_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
};
