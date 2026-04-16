/**
 * Migration: Add FDA outcome fields to pdufa_dates
 * Enables tracking of FDA decisions for past PDUFA dates
 */

module.exports = {
  name: 'add_pdufa_outcome',
  up: async (client) => {
    // outcome_result: approved, crl, delayed, withdrawn, pending, unknown
    await client.query(`
      ALTER TABLE pdufa_dates
      ADD COLUMN IF NOT EXISTS outcome_result VARCHAR(50)
    `);

    // outcome_date: actual date FDA issued the decision (may differ from PDUFA date)
    await client.query(`
      ALTER TABLE pdufa_dates
      ADD COLUMN IF NOT EXISTS outcome_date DATE
    `);

    // outcome_notes: brief description of the decision
    // e.g. "Complete Response Letter issued citing CMC deficiencies"
    await client.query(`
      ALTER TABLE pdufa_dates
      ADD COLUMN IF NOT EXISTS outcome_notes TEXT
    `);

    // outcome_source: where the outcome was sourced from
    // e.g. "FDA Press Release", "SEC 8-K filing", "Company PR"
    await client.query(`
      ALTER TABLE pdufa_dates
      ADD COLUMN IF NOT EXISTS outcome_source VARCHAR(255)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS pdufa_dates_outcome_result_idx ON pdufa_dates (outcome_result)
    `);

    // Backfill outcome_result from existing status field for past entries
    // status values: 'approved', 'CRL', 'withdrawn' → map to outcome_result
    await client.query(`
      UPDATE pdufa_dates
      SET outcome_result = CASE
        WHEN status = 'approved' THEN 'approved'
        WHEN status = 'CRL' THEN 'crl'
        WHEN status = 'withdrawn' THEN 'withdrawn'
        WHEN status = 'delayed' THEN 'delayed'
        ELSE NULL
      END
      WHERE status NOT IN ('upcoming', 'pending') AND outcome_result IS NULL
    `);
  },
  down: async (client) => {
    await client.query(`ALTER TABLE pdufa_dates DROP COLUMN IF EXISTS outcome_result`);
    await client.query(`ALTER TABLE pdufa_dates DROP COLUMN IF EXISTS outcome_date`);
    await client.query(`ALTER TABLE pdufa_dates DROP COLUMN IF EXISTS outcome_notes`);
    await client.query(`ALTER TABLE pdufa_dates DROP COLUMN IF EXISTS outcome_source`);
  }
};
