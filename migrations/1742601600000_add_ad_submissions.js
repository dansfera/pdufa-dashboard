module.exports = {
  name: 'add_ad_submissions',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ad_submissions (
        id SERIAL PRIMARY KEY,
        site VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        emailed BOOLEAN DEFAULT FALSE
      )
    `);
  }
};
