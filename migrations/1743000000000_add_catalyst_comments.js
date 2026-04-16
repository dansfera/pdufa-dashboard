module.exports = {
  name: 'add_catalyst_comments',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS catalyst_comments (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS catalyst_comments_slug_idx ON catalyst_comments (slug)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS catalyst_comments_email_idx ON catalyst_comments (email)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS catalyst_comments_created_idx ON catalyst_comments (created_at DESC)
    `);
  },
  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS catalyst_comments`);
  }
};
