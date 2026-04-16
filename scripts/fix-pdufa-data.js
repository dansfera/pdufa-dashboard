/**
 * fix-pdufa-data.js
 * Fixes inaccurate PDUFA entries:
 * 1. Removes retatrutide (no NDA filed — still Phase 3 as of Mar 2026)
 * 2. Removes lifileucel cervical cancer (no confirmed sBLA/PDUFA — original melanoma approval was Feb 2024)
 * 3. Updates tabelecleucel status → CRL (second CRL issued Jan 12, 2026)
 * 4. Updates dupilumab AFRS status → approved (approved Feb 26, 2026)
 * 5. Fixes orforglipron PDUFA date → April 10, 2026 (Priority Review via National Priority Voucher)
 *
 * Run: DATABASE_URL=... node scripts/fix-pdufa-data.js
 */

const { Pool } = require('pg');

async function fix() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Exiting.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('Fixing PDUFA data...\n');

    // 1. Delete retatrutide — no NDA filed, still Phase 3
    const del1 = await client.query(
      `DELETE FROM pdufa_dates WHERE slug = 'retatrutide-lilly-obesity-diabetes' RETURNING drug_name`
    );
    console.log(del1.rows.length > 0
      ? `✅ Deleted retatrutide (${del1.rows[0].drug_name}) — no confirmed NDA/PDUFA date`
      : `ℹ️  retatrutide not found in DB (already removed or not seeded)`
    );

    // 2. Delete lifileucel cervical cancer — no confirmed sBLA for this indication
    const del2 = await client.query(
      `DELETE FROM pdufa_dates WHERE slug = 'lifileucel-amtagvi-iova-cervical-cancer' RETURNING drug_name`
    );
    console.log(del2.rows.length > 0
      ? `✅ Deleted lifileucel (IOVA) cervical cancer entry — no confirmed sBLA/PDUFA date`
      : `ℹ️  lifileucel cervical cancer entry not found in DB`
    );

    // 3. Update tabelecleucel → status CRL (second CRL issued Jan 12, 2026)
    const upd1 = await client.query(
      `UPDATE pdufa_dates
       SET status = 'CRL',
           notes = 'FDA issued second CRL on January 12, 2026. ALLELE trial data deemed inadequate for approval. BLA resubmission was accepted July 2025 with PDUFA Jan 10, 2026.',
           updated_at = NOW()
       WHERE slug = 'tabelecleucel-atra-ebv-ptld'
       RETURNING drug_name`
    );
    console.log(upd1.rows.length > 0
      ? `✅ Updated tabelecleucel → CRL (FDA issued 2nd CRL Jan 12, 2026)`
      : `ℹ️  tabelecleucel not found in DB`
    );

    // 4. Update dupilumab AFRS → status approved (approved Feb 26, 2026)
    const upd2 = await client.query(
      `UPDATE pdufa_dates
       SET status = 'approved',
           notes = 'FDA approved Dupixent for AFRS on February 26, 2026 — 2 days ahead of PDUFA target date. Supplemental BLA expanding Dupixent label to include allergic fungal rhinosinusitis in adults and children 6+.',
           updated_at = NOW()
       WHERE slug = 'dupixent-dupilumab-afrs'
       RETURNING drug_name`
    );
    console.log(upd2.rows.length > 0
      ? `✅ Updated dupilumab AFRS → approved (FDA approval Feb 26, 2026)`
      : `ℹ️  dupilumab AFRS not found in DB`
    );

    // 5. Fix orforglipron: real PDUFA date = April 10, 2026 via Priority Review voucher
    const upd3 = await client.query(
      `UPDATE pdufa_dates
       SET pdufa_date = '2026-04-10',
           review_type = 'priority',
           designation = ARRAY['Priority Review', 'Fast Track', 'Breakthrough Therapy'],
           notes = 'NDA submitted 2025 for obesity. FDA granted Priority Review via National Priority Review Voucher from FDA Commissioner Makary. PDUFA date April 10, 2026. Four positive Phase 3 ATTAIN trials. Oral once-daily pill — major convenience advantage over injectable GLP-1s.',
           updated_at = NOW()
       WHERE slug = 'orforglipron-lilly-oral-glp1-obesity'
       RETURNING drug_name, pdufa_date`
    );
    console.log(upd3.rows.length > 0
      ? `✅ Updated orforglipron PDUFA date → April 10, 2026 (Priority Review)`
      : `ℹ️  orforglipron not found in DB`
    );

    console.log('\n✅ PDUFA data fix complete.');

  } catch (err) {
    console.error('Fix failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
