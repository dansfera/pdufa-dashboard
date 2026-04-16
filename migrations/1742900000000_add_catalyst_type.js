/**
 * Migration: Add catalyst_type to pdufa_dates
 * Expands PDUFA tracker into full biotech catalyst calendar
 */

module.exports = {
  name: 'add_catalyst_type',
  up: async (client) => {
    // Add catalyst_type column with default 'pdufa' for backward compat
    await client.query(`
      ALTER TABLE pdufa_dates
      ADD COLUMN IF NOT EXISTS catalyst_type VARCHAR(50) NOT NULL DEFAULT 'pdufa'
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS pdufa_dates_catalyst_type_idx ON pdufa_dates (catalyst_type)
    `);
  }
};
