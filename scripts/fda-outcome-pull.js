/**
 * scripts/fda-outcome-pull.js
 *
 * Weekly auto-pull script for FDA PDUFA decision outcomes.
 * Queries the openFDA Drugs@FDA API for past PDUFA dates that don't yet have
 * an outcome recorded. Updates outcome_result, outcome_date, outcome_notes,
 * outcome_source for each matched decision.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/fda-outcome-pull.js
 *
 * Called automatically every Monday at 8:00 AM UTC by server.js scheduler.
 * Also safe to run manually at any time — only updates entries with no outcome.
 *
 * FDA API: https://open.fda.gov/apis/drug/drugsfda/
 * Rate limit: 40 req/min (no key), 240 req/min (with key)
 * We sleep 1.6s between calls to stay safely under the free limit.
 */

'use strict';

const { Pool } = require('pg');

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENFDA_BASE = 'https://api.fda.gov/drug/drugsfda.json';
// Rate-limit-safe inter-request delay (ms). 40 req/min = 1 per 1.5s. Use 1.6s for safety.
const API_DELAY_MS = 1600;
// How far before/after the PDUFA date to look for a decision (days)
const DECISION_WINDOW_DAYS = 120;

// openFDA submission_status codes → our outcome_result values
const STATUS_MAP = {
  AP:  'approved',    // Approved
  TA:  'approved',    // Tentative Approval (treat as approved for outcome purposes)
  CP:  'crl',         // Complete Response (CRL)
  CR:  'crl',         // Alternate code seen in some records
  W:   'withdrawn',   // Withdrawn
  WD:  'withdrawn',   // Withdrawn (alternate)
  RF:  'withdrawn',   // Refused to File
  RX:  'withdrawn',   // Refusal (misc)
  NA:  null,          // Not Approvable (older term, skip)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sleep ms milliseconds. */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Parse FDA date string YYYYMMDD → ISO date string YYYY-MM-DD */
function parseFDADate(str) {
  if (!str || str.length < 8) return null;
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
}

/** Strip common suffixes/prefixes that don't appear in FDA records */
function normalizeDrugName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    // Remove combination drug extras like "drug + drug"
    .split('+')[0]
    .trim()
    // Remove multi-word combination notations
    .split('/')[0]
    .trim()
    // Remove package dose info in parens
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/** Fetch openFDA endpoint, return parsed JSON or null on error/no results */
async function fetchOpenFDA(searchQuery) {
  const url = `${OPENFDA_BASE}?search=${encodeURIComponent(searchQuery)}&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DanSferaBiotechCalendar/1.0 (+https://dansfera.com)' },
      signal: AbortSignal.timeout(12000)
    });
    if (res.status === 404) return null; // openFDA returns 404 when no results found
    if (!res.ok) {
      console.warn(`  [FDA API] HTTP ${res.status} for query: ${searchQuery}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`  [FDA API] Fetch error: ${err.message}`);
    return null;
  }
}

/**
 * Given an array of openFDA submissions and a PDUFA date,
 * find the most recent actionable submission within the decision window.
 * Returns { result, date, applicationNumber, notes } or null.
 */
function findOutcomeInSubmissions(submissions, pdufaDate, applicationNumber) {
  if (!submissions || !submissions.length) return null;

  const pdufaMs = new Date(pdufaDate).getTime();
  const windowMs = DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Collect candidates: submissions with a status date within the window
  const candidates = [];
  for (const sub of submissions) {
    if (!sub.submission_status || !sub.submission_status_date) continue;
    const decisionDate = parseFDADate(sub.submission_status_date);
    if (!decisionDate) continue;
    const decisionMs = new Date(decisionDate).getTime();
    const diff = decisionMs - pdufaMs;

    // Accept decisions from 60 days before PDUFA up to 120 days after
    // (FDA sometimes acts early; delays can push it months out)
    if (diff >= -60 * 24 * 60 * 60 * 1000 && diff <= windowMs) {
      const outcomeResult = STATUS_MAP[sub.submission_status.toUpperCase()];
      if (outcomeResult !== undefined) {
        candidates.push({
          result: outcomeResult,
          date: decisionDate,
          status_code: sub.submission_status,
          submission_type: sub.submission_type || '',
          submission_number: sub.submission_number || '',
          review_priority: sub.review_priority || '',
          diff_days: Math.round(diff / (24 * 60 * 60 * 1000)),
          applicationNumber
        });
      }
    }
  }

  if (!candidates.length) return null;

  // Prefer the candidate closest in time to the PDUFA date
  candidates.sort((a, b) => Math.abs(a.diff_days) - Math.abs(b.diff_days));
  return candidates[0];
}

/**
 * Build the Drugs@FDA detail URL for an application number.
 * e.g. "BLA761399" → ApplNo=761399
 */
function buildDrugsAtFDALink(applicationNumber) {
  if (!applicationNumber) {
    return 'https://www.accessdata.fda.gov/scripts/cder/daf/';
  }
  const numeric = applicationNumber.replace(/[^0-9]/g, '').replace(/^0+/, '');
  if (!numeric) return 'https://www.accessdata.fda.gov/scripts/cder/daf/';
  return `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${numeric}`;
}

/**
 * Build a human-readable outcome note.
 */
function buildOutcomeNotes(drug, candidate) {
  const resultLabels = {
    approved: 'FDA Approved',
    crl: 'Complete Response Letter (CRL) issued',
    withdrawn: 'Application withdrawn by sponsor',
    delayed: 'Review period extended / delayed'
  };
  const label = resultLabels[candidate.result] || candidate.result;
  const dateStr = candidate.date ? ` on ${candidate.date}` : '';
  const appStr = candidate.applicationNumber ? ` (${candidate.applicationNumber})` : '';
  return `${label}${dateStr}${appStr}. Source: FDA Drugs@FDA database.`;
}

/**
 * Look up FDA decision for a single drug entry.
 * Tries multiple search strategies in sequence, returning on first hit.
 * Returns outcome object or null.
 */
async function lookupFDAOutcome(drug) {
  const brandName = normalizeDrugName(drug.brand_name);
  const genericName = normalizeDrugName(drug.drug_name);

  // Build search strategies. More specific = earlier in list.
  const strategies = [];

  // 1. Exact brand name match (most reliable)
  if (brandName) {
    strategies.push(`openfda.brand_name:"${brandName}"`);
  }

  // 2. Generic name match
  if (genericName && genericName !== brandName) {
    strategies.push(`openfda.generic_name:"${genericName}"`);
  }

  // 3. Sponsor + generic (helps disambiguate)
  if (genericName && drug.company) {
    const sponsorClean = drug.company.split(' ')[0].toUpperCase(); // first word of company
    strategies.push(`openfda.generic_name:"${genericName}"+sponsor_name:"${sponsorClean}"`);
  }

  for (const query of strategies) {
    const data = await fetchOpenFDA(query);
    await sleep(API_DELAY_MS);

    if (!data || !data.results || !data.results.length) continue;

    // Check each returned application
    for (const app of data.results) {
      const candidate = findOutcomeInSubmissions(
        app.submissions,
        drug.pdufa_date,
        app.application_number
      );
      if (candidate && candidate.result !== null) {
        // Verify drug name loosely matches (avoid false positives)
        const fdaBrand = (app.openfda?.brand_name || []).join(' ').toLowerCase();
        const fdaGeneric = (app.openfda?.generic_name || []).join(' ').toLowerCase();
        const nameMatch = fdaBrand.includes(brandName) ||
                          fdaGeneric.includes(genericName) ||
                          brandName.includes(fdaBrand.split(' ')[0]) ||
                          genericName.includes(fdaGeneric.split(' ')[0]);

        if (!nameMatch && !brandName && !genericName) {
          // Skip if names don't match at all
          continue;
        }

        return {
          result: candidate.result,
          date: candidate.date,
          notes: buildOutcomeNotes(drug, candidate),
          source: buildDrugsAtFDALink(candidate.applicationNumber),
          applicationNumber: candidate.applicationNumber,
          searchQuery: query
        };
      }
    }

    // No match in this strategy — try next
  }

  return null; // No FDA decision found
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('[FDA Pull] ERROR: DATABASE_URL not set. Cannot connect to database.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000
  });

  const client = await pool.connect();

  try {
    const runStart = new Date();
    console.log(`\n[FDA Pull] ═══════════════════════════════════════════`);
    console.log(`[FDA Pull] Starting FDA PDUFA outcome pull`);
    console.log(`[FDA Pull] Run time: ${runStart.toISOString()}`);
    console.log(`[FDA Pull] ═══════════════════════════════════════════\n`);

    // Find all past PDUFA dates without an outcome recorded
    const { rows: candidates } = await client.query(`
      SELECT id, drug_name, brand_name, company, ticker, cashtag,
             pdufa_date, phase, slug, nda_bla_type, notes, status
      FROM pdufa_dates
      WHERE catalyst_type = 'pdufa'
        AND pdufa_date < NOW()
        AND (outcome_result IS NULL OR outcome_result = '')
      ORDER BY pdufa_date DESC
    `);

    console.log(`[FDA Pull] Found ${candidates.length} PDUFA entries without outcomes\n`);

    if (!candidates.length) {
      console.log('[FDA Pull] Nothing to update — all past PDUFAs already have outcomes.\n');
      await logRun(client, 0, 0, 'success', 'Nothing to update');
      return;
    }

    let updated = 0;
    let notFound = 0;
    const updateLog = [];

    for (let i = 0; i < candidates.length; i++) {
      const drug = candidates[i];
      const label = `${drug.drug_name}${drug.brand_name ? ` (${drug.brand_name})` : ''}`;
      const tickerStr = drug.ticker ? ` [${drug.ticker}]` : '';
      console.log(`[${i + 1}/${candidates.length}] ${label}${tickerStr} — PDUFA: ${drug.pdufa_date}`);

      try {
        const outcome = await lookupFDAOutcome(drug);

        if (outcome) {
          await client.query(`
            UPDATE pdufa_dates
            SET outcome_result = $1,
                outcome_date   = $2,
                outcome_notes  = $3,
                outcome_source = $4,
                updated_at     = NOW()
            WHERE id = $5
          `, [
            outcome.result,
            outcome.date,
            outcome.notes,
            outcome.source,
            drug.id
          ]);

          console.log(`  ✓ ${outcome.result.toUpperCase()} on ${outcome.date || '(date unknown)'}`);
          console.log(`    Notes: ${outcome.notes}`);
          updateLog.push({
            drug: drug.drug_name,
            brandName: drug.brand_name,
            ticker: drug.ticker,
            slug: drug.slug,
            result: outcome.result,
            date: outcome.date,
            applicationNumber: outcome.applicationNumber
          });
          updated++;
        } else {
          console.log(`  — No FDA decision found in openFDA within ${DECISION_WINDOW_DAYS}d window`);
          notFound++;
        }

      } catch (err) {
        console.error(`  ✗ Error checking ${label}:`, err.message);
        notFound++;
      }

      console.log(''); // spacing
    }

    // ─── Summary ───────────────────────────────────────────────────────────
    const durationMs = Date.now() - runStart.getTime();
    const durationStr = `${(durationMs / 1000).toFixed(1)}s`;

    console.log(`[FDA Pull] ═══════════════════════════════════════════`);
    console.log(`[FDA Pull] Run complete in ${durationStr}`);
    console.log(`[FDA Pull]   Updated:   ${updated}`);
    console.log(`[FDA Pull]   Not found: ${notFound}`);
    console.log(`[FDA Pull] ═══════════════════════════════════════════\n`);

    if (updateLog.length > 0) {
      console.log('[FDA Pull] Updated entries:');
      updateLog.forEach(u => {
        const ticker = u.ticker ? ` (${u.ticker})` : '';
        const brand = u.brandName ? ` / ${u.brandName}` : '';
        const appNo = u.applicationNumber ? ` — ${u.applicationNumber}` : '';
        console.log(`  • ${u.drug}${brand}${ticker}: ${u.result.toUpperCase()} on ${u.date || '?'}${appNo}`);
      });
      console.log('');
    }

    const summary = `${updated} outcomes updated, ${notFound} not found in openFDA`;
    await logRun(client, updated, notFound, 'success', summary);

  } catch (err) {
    console.error('[FDA Pull] Fatal error:', err.message);
    try {
      await logRun(client, 0, 0, 'error', err.message);
    } catch (_) { /* ignore log error */ }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

/** Log run to pdufa_refresh_log for transparency */
async function logRun(client, updated, notFound, status, notes) {
  try {
    await client.query(`
      INSERT INTO pdufa_refresh_log (source, records_upserted, status, notes)
      VALUES ($1, $2, $3, $4)
    `, ['fda-outcome-pull', updated, status, notes]);
  } catch (err) {
    // Non-fatal: table might not exist in very old deployments
    console.warn('[FDA Pull] Could not write to pdufa_refresh_log:', err.message);
  }
}

// Run if invoked directly
if (require.main === module) {
  run().catch(err => {
    console.error('[FDA Pull] Exiting with error:', err.message);
    process.exit(1);
  });
}

module.exports = { run };
