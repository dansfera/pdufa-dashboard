/**
 * scripts/catalyst-refresh.js
 *
 * Weekly catalyst data refresh script for dansfera.com.
 * Runs every Monday at 6:00 AM UTC (2:00 AM ET).
 *
 * What it does:
 *   1. Pulls FDA outcomes for past PDUFA entries that have no outcome recorded
 *   2. Marks overdue catalysts (>60 days past date, no outcome, no terminal status) as 'reported'
 *   3. Logs a summary to pdufa_refresh_log
 *   4. Returns { added, updated, expired } counts
 *
 * Usage:
 *   DATABASE_URL=... node scripts/catalyst-refresh.js
 *
 * Called automatically every Monday at 6:00 AM UTC by the scheduler in pdufa/app.js.
 * Also available via POST /api/admin/refresh-catalysts for manual triggers.
 */

'use strict';

const { Pool } = require('pg');
const { run: runFDAOutcomePull } = require('./fda-outcome-pull');

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('[Catalyst Refresh] DATABASE_URL not set. Cannot connect to database.');
  }

  const startTime = Date.now();
  console.log(`[Catalyst Refresh] ══════════════════════════════════════════════`);
  console.log(`[Catalyst Refresh] Starting weekly catalyst data refresh`);
  console.log(`[Catalyst Refresh] Run time: ${new Date().toISOString()}`);
  console.log(`[Catalyst Refresh] ══════════════════════════════════════════════\n`);

  // Create a small pool just for the pre/post count queries and expired marking
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    max: 2
  });

  let added = 0;
  let updated = 0;
  let expired = 0;

  try {
    // ── STEP 1: Count past PDUFAs without outcomes (before pull) ────────────
    console.log('[Catalyst Refresh] Step 1: FDA outcome pull for past PDUFA dates...');

    const { rows: [before] } = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM pdufa_dates
      WHERE catalyst_type = 'pdufa'
        AND pdufa_date < NOW()
        AND (outcome_result IS NULL OR outcome_result = '')
    `);
    const beforeCount = parseInt(before.cnt);
    console.log(`[Catalyst Refresh]   ${beforeCount} entries without outcomes before pull`);

    // ── STEP 2: Run FDA outcome pull ─────────────────────────────────────────
    // This script creates its own pool, queries openFDA for each past PDUFA entry,
    // and updates outcome_result, outcome_date, outcome_notes, outcome_source.
    try {
      await runFDAOutcomePull();
    } catch (pullErr) {
      console.error('[Catalyst Refresh] FDA outcome pull error (non-fatal):', pullErr.message);
    }

    // ── STEP 3: Count remaining entries without outcomes (after pull) ────────
    const { rows: [after] } = await pool.query(`
      SELECT COUNT(*) AS cnt
      FROM pdufa_dates
      WHERE catalyst_type = 'pdufa'
        AND pdufa_date < NOW()
        AND (outcome_result IS NULL OR outcome_result = '')
    `);
    const afterCount = parseInt(after.cnt);
    updated = Math.max(0, beforeCount - afterCount);
    console.log(`[Catalyst Refresh]   ${afterCount} entries still without outcomes after pull`);
    console.log(`[Catalyst Refresh]   Step 1 complete: ${updated} outcomes updated\n`);

    // ── STEP 4: Mark overdue catalysts as expired ────────────────────────────
    // Catalysts that are >60 days past their PDUFA date with no outcome and
    // no terminal status get marked as 'reported' so they don't mislead visitors.
    console.log('[Catalyst Refresh] Step 2: Marking overdue catalysts as expired...');

    const { rows: expiredRows, rowCount: expiredCount } = await pool.query(`
      UPDATE pdufa_dates
      SET status = 'reported', updated_at = NOW()
      WHERE catalyst_type = 'pdufa'
        AND pdufa_date < NOW() - INTERVAL '60 days'
        AND (outcome_result IS NULL OR outcome_result = '')
        AND status NOT IN ('withdrawn', 'approved', 'crl', 'reported', 'delayed')
      RETURNING id, drug_name, brand_name, ticker, pdufa_date
    `);

    expired = expiredCount;
    if (expired > 0) {
      console.log(`[Catalyst Refresh]   Marked ${expired} overdue catalysts as 'reported':`);
      expiredRows.forEach(r => {
        const name = r.brand_name || r.drug_name;
        const ticker = r.ticker ? ` (${r.ticker})` : '';
        const date = new Date(r.pdufa_date).toISOString().split('T')[0];
        console.log(`    • ${name}${ticker} — PDUFA was ${date}`);
      });
    } else {
      console.log('[Catalyst Refresh]   No overdue catalysts to mark.');
    }
    console.log('');

    // ── STEP 5: Log this refresh run ─────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    const summary = `Weekly refresh: ${updated} outcomes updated, ${expired} marked expired, ${added} added. Duration: ${(durationMs / 1000).toFixed(1)}s`;

    try {
      await pool.query(`
        INSERT INTO pdufa_refresh_log (source, records_upserted, status, notes)
        VALUES ($1, $2, $3, $4)
      `, ['catalyst-refresh', updated + expired + added, 'success', summary]);
    } catch (logErr) {
      console.warn('[Catalyst Refresh] Could not write to pdufa_refresh_log:', logErr.message);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`[Catalyst Refresh] ══════════════════════════════════════════════`);
    console.log(`[Catalyst Refresh] Refresh complete in ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`[Catalyst Refresh]   Added:   ${added}`);
    console.log(`[Catalyst Refresh]   Updated: ${updated}`);
    console.log(`[Catalyst Refresh]   Expired: ${expired}`);
    console.log(`[Catalyst Refresh] ══════════════════════════════════════════════\n`);

    return { added, updated, expired };

  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error('[Catalyst Refresh] Fatal error:', err.message);

    try {
      await pool.query(`
        INSERT INTO pdufa_refresh_log (source, records_upserted, status, notes)
        VALUES ($1, $2, $3, $4)
      `, ['catalyst-refresh', 0, 'error', err.message]);
    } catch (_) { /* non-fatal */ }

    throw err;
  } finally {
    await pool.end().catch(() => {});
  }
}

// Run if invoked directly
if (require.main === module) {
  run().catch(err => {
    console.error('[Catalyst Refresh] Exiting with error:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
