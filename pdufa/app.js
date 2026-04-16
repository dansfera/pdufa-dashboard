/**
 * Biotech Catalyst Calendar — Dan Sfera
 * Full catalyst calendar: PDUFA dates, AdCom meetings, trial readouts, conferences, earnings
 * Mounted at /pdufa on the main server.
 * dansfera.com routes here via hostname middleware in server.js
 */

const express = require('express');
const path = require('path');

const app = express();

// EJS views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets served by parent server under /pdufa/css/, /pdufa/js/, etc.
// (parent mounts: app.use('/pdufa', express.static(path.join(__dirname, 'pdufa/public'))))

const { getPool } = require('../utils/db');
const { getCompanyData, formatMarketCap, formatVolume, formatPrice } = require('./fmp-service');
const { track, pageViewMiddleware } = require('./analytics');

const BASE_URL = process.env.PDUFA_BASE_URL || 'https://dansfera.com';
const analyticsSlug = process.env.POLSIA_ANALYTICS_SLUG || '';

// Make these available to all EJS templates without explicit passing
app.locals.googleVerification = process.env.GOOGLE_SITE_VERIFICATION || '';

// ============ ANALYTICS TRACKING ============
// Automatically records page views for all non-API GET requests.
// Fire-and-forget — never blocks response.
app.use(pageViewMiddleware(getPool));

// ============ CATALYST TYPE CONFIG ============

const CATALYST_TYPES = {
  pdufa: {
    label: 'PDUFA',
    icon: '💊',
    color: 'teal',
    description: 'FDA target action date'
  },
  adcom: {
    label: 'AdCom',
    icon: '🏛️',
    color: 'orange',
    description: 'FDA Advisory Committee vote'
  },
  trial_readout: {
    label: 'Trial Readout',
    icon: '🔬',
    color: 'purple',
    description: 'Clinical trial data release'
  },
  conference: {
    label: 'Conference',
    icon: '📋',
    color: 'green',
    description: 'Scientific conference'
  },
  earnings: {
    label: 'Earnings',
    icon: '📊',
    color: 'blue',
    description: 'Quarterly earnings'
  }
};

// Catalyst types where PoA applies (regulatory decision catalysts only)
const POA_CATALYST_TYPES = new Set(['pdufa', 'adcom']);

// ============ SCHEMA.ORG HELPERS ============

// Build Schema.org Event object for a single catalyst entry
function buildEventSchema(drug, enriched, baseUrl) {
  const catalystType = drug.catalyst_type || 'pdufa';
  const config = CATALYST_TYPES[catalystType] || CATALYST_TYPES.pdufa;
  const drugName = drug.brand_name || drug.drug_name;
  const dateISO = drug.pdufa_date ? new Date(drug.pdufa_date).toISOString().split('T')[0] : null;
  const url = `${baseUrl}/drug/${drug.slug}`;

  // Build event name based on type
  let eventName;
  if (catalystType === 'pdufa') {
    eventName = `FDA PDUFA Decision: ${drugName}${drug.ticker ? ` (${drug.ticker})` : ''} — ${drug.company || ''}`;
  } else if (catalystType === 'adcom') {
    eventName = `FDA AdCom Meeting: ${drugName}${drug.ticker ? ` (${drug.ticker})` : ''} — ${drug.company || ''}`;
  } else if (catalystType === 'trial_readout') {
    eventName = `Clinical Trial Readout: ${drugName}${drug.ticker ? ` (${drug.ticker})` : ''} — ${drug.company || ''}`;
  } else if (catalystType === 'conference') {
    eventName = `${drugName} Conference Presentation — ${drug.company || ''}`;
  } else if (catalystType === 'earnings') {
    eventName = `${drug.company || drugName} Earnings Call`;
  } else {
    eventName = `${drugName} — ${config.label}`;
  }

  const description = [
    config.description,
    drug.indication ? `Indication: ${drug.indication}` : null,
    drug.phase ? `Phase: ${drug.phase}` : null,
    enriched && enriched.basePoA ? `Baseline probability of approval: ${enriched.basePoA}%` : null
  ].filter(Boolean).join('. ');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${url}#event`,
    'name': eventName,
    'url': url,
    'description': description || `${config.label} catalyst for ${drugName} by ${drug.company || 'unknown company'}.`,
    'eventStatus': 'https://schema.org/EventScheduled',
    'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode',
    'location': {
      '@type': 'VirtualLocation',
      'url': url
    },
    'organizer': {
      '@type': 'Organization',
      'name': drug.company || 'Biotech Company',
      'url': url
    },
    'about': {
      '@type': 'Drug',
      'name': drug.drug_name,
      'alternateName': drug.brand_name || undefined,
      'manufacturer': drug.company ? { '@type': 'Organization', 'name': drug.company } : undefined
    }
  };

  if (dateISO) {
    schema.startDate = dateISO;
    schema.endDate = dateISO;
  }

  // Add image for social sharing
  schema.image = `${baseUrl}/pdufa/og-default.png`;

  return JSON.stringify(schema, null, 2);
}

// Build Schema.org ItemList for homepage — lists upcoming catalysts
function buildHomeItemListSchema(upcoming, baseUrl) {
  const items = upcoming.slice(0, 30).map((d, i) => {
    const drugName = d.brand_name || d.drug_name;
    const catalystType = d.catalyst_type || 'pdufa';
    const config = CATALYST_TYPES[catalystType] || CATALYST_TYPES.pdufa;
    const dateISO = d.pdufa_date ? new Date(d.pdufa_date).toISOString().split('T')[0] : null;
    return {
      '@type': 'ListItem',
      'position': i + 1,
      'item': {
        '@type': 'Event',
        '@id': `${baseUrl}/drug/${d.slug}#event`,
        'name': `${config.label}: ${drugName}${d.ticker ? ` (${d.ticker})` : ''}`,
        'url': `${baseUrl}/drug/${d.slug}`,
        'startDate': dateISO || undefined,
        'description': `${config.description}${d.indication ? ` for ${d.indication}` : ''}`,
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode',
        'location': { '@type': 'VirtualLocation', 'url': `${baseUrl}/drug/${d.slug}` },
        'organizer': { '@type': 'Organization', 'name': d.company || 'Biotech Company' }
      }
    };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Biotech Catalyst Calendar 2026 — FDA PDUFA Dates & Trial Readouts',
    'description': 'Live biotech catalyst calendar. PDUFA dates, AdCom meetings, Phase 3 trial readouts, conference schedules. Curated by Dan Sfera.',
    'url': baseUrl,
    'numberOfItems': items.length,
    'itemListElement': items
  };

  return JSON.stringify(schema, null, 2);
}

// Build Schema.org ItemList for "Upcoming This Week" featured section
function buildWeeklyItemListSchema(weekItems, baseUrl) {
  const items = weekItems.map((d, i) => {
    const drugName = d.brand_name || d.drug_name;
    const catalystType = d.catalyst_type || 'pdufa';
    const config = CATALYST_TYPES[catalystType] || CATALYST_TYPES.pdufa;
    const dateISO = d.pdufa_date ? new Date(d.pdufa_date).toISOString().split('T')[0] : null;
    return {
      '@type': 'ListItem',
      'position': i + 1,
      'item': {
        '@type': 'Event',
        '@id': `${baseUrl}/drug/${d.slug}#event`,
        'name': `${config.label}: ${drugName}${d.ticker ? ` (${d.ticker})` : ''}`,
        'url': `${baseUrl}/drug/${d.slug}`,
        'startDate': dateISO || undefined,
        'description': `${config.description}${d.indication ? ` for ${d.indication}` : ''}`,
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode',
        'location': { '@type': 'VirtualLocation', 'url': `${baseUrl}/drug/${d.slug}` },
        'organizer': { '@type': 'Organization', 'name': d.company || 'Biotech Company' }
      }
    };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Biotech Catalysts — Upcoming This Week',
    'description': `${items.length} biotech catalyst${items.length !== 1 ? 's' : ''} scheduled this week. FDA PDUFA dates, trial readouts, and more.`,
    'url': baseUrl,
    'numberOfItems': items.length,
    'itemListElement': items
  };

  return JSON.stringify(schema, null, 2);
}

// ============ HELPERS ============

function getStatusClass(pdufaDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(pdufaDate);
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'this-week';
  if (diffDays <= 30) return 'this-month';
  return 'upcoming';
}

function formatDate(dateStr) {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function daysUntil(pdufaDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(pdufaDate);
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

// FDA historical approval rates by submission type (CDER data 2015-2025)
// Sources: FDA CDER annual reports, Haber et al. (2020), BIO industry analysis
const FDA_POA_RATES = {
  snda_sbla:        { standard: 92, priority: 92 }, // supplemental — consistently high
  nda:              { standard: 85, priority: 90 },
  bla:              { standard: 80, priority: 88 },
  orphan_rare:      { standard: 93, priority: 93 }, // orphan/rare disease — FDA prioritizes
  adcom_positive:   { standard: 95, priority: 95 }, // post-AdCom positive vote
  phase3:           { standard: 58, priority: 58 }, // Phase 3 readout → eventual approval
  phase2:           { standard: 33, priority: 33 },
  phase1:           { standard: 70, priority: 70 }, // Phase 1 safety (already cleared preclinical)
  default:          { standard: 85, priority: 90 }
};

function getBasePoA(phase, reviewType, hasCrlHistory, catalystType, designation) {
  // PoA only applies to regulatory decision catalysts (PDUFA and AdCom)
  if (!POA_CATALYST_TYPES.has(catalystType)) return null;
  if (!phase) return null;

  const p = (phase || '').toLowerCase();
  const desigArr = Array.isArray(designation) ? designation : (designation ? [designation] : []);
  const desigStr = desigArr.join(' ').toLowerCase();
  const isOrphan = desigStr.includes('orphan') || desigStr.includes('rare disease') || desigStr.includes('rare pediatric');
  const isPriority = reviewType === 'priority';

  let rateKey;
  if (p.includes('snda') || p.includes('sbla')) {
    rateKey = 'snda_sbla';
  } else if (isOrphan && (p.includes('nda') || p.includes('bla'))) {
    rateKey = 'orphan_rare';
  } else if (p.includes('nda')) {
    rateKey = 'nda';
  } else if (p.includes('bla')) {
    rateKey = 'bla';
  } else if (p.includes('phase iii') || p.includes('phase3') || p === 'iii') {
    rateKey = 'phase3';
  } else if (p.includes('phase ii') || p.includes('phase2') || p === 'ii') {
    rateKey = 'phase2';
  } else if (p.includes('phase i') || p.includes('phase1') || p === 'i') {
    rateKey = 'phase1';
  } else {
    rateKey = 'default';
  }

  const rates = FDA_POA_RATES[rateKey];
  let baseRate = isPriority ? rates.priority : rates.standard;

  // CRL resubmission penalty: prior rejection reduces PoA by ~28%
  if (hasCrlHistory) baseRate = Math.round(baseRate * 0.72);

  return baseRate;
}

// Human-readable rationale for the PoA score (shown as tooltip/footnote)
function getPoARationale(phase, reviewType, hasCrlHistory, catalystType, designation) {
  if (!POA_CATALYST_TYPES.has(catalystType)) return null;
  if (!phase) return null;

  const p = (phase || '').toLowerCase();
  const desigArr = Array.isArray(designation) ? designation : (designation ? [designation] : []);
  const desigStr = desigArr.join(' ').toLowerCase();
  const isOrphan = desigStr.includes('orphan') || desigStr.includes('rare disease') || desigStr.includes('rare pediatric');
  const isPriority = reviewType === 'priority';

  let rationale;
  if (p.includes('snda') || p.includes('sbla')) {
    rationale = 'sNDA/sBLA historical approval rate';
  } else if (isOrphan && (p.includes('nda') || p.includes('bla'))) {
    rationale = 'Orphan/rare disease designation approval rate';
  } else if (p.includes('nda')) {
    rationale = isPriority ? 'NDA priority review approval rate' : 'NDA standard review approval rate';
  } else if (p.includes('bla')) {
    rationale = isPriority ? 'BLA priority review approval rate' : 'BLA standard review approval rate';
  } else if (p.includes('phase iii') || p.includes('phase3') || p === 'iii') {
    rationale = 'Phase 3 trial readout → eventual approval rate';
  } else if (p.includes('phase ii') || p.includes('phase2') || p === 'ii') {
    rationale = 'Phase 2 → eventual approval rate';
  } else if (p.includes('phase i') || p.includes('phase1') || p === 'i') {
    rationale = 'Phase 1 → eventual approval rate';
  } else {
    rationale = 'FDA historical approval rate';
  }

  if (hasCrlHistory) rationale += ' (prior CRL resubmission penalty applied)';
  return rationale;
}

function getCatalystConfig(catalystType) {
  return CATALYST_TYPES[catalystType] || CATALYST_TYPES.pdufa;
}

// Normalize outcome result from status or outcome_result field
function getOutcomeResult(d) {
  // Prefer the dedicated outcome_result column if present
  if (d.outcome_result) return d.outcome_result.toLowerCase();
  // Fall back to status field
  const s = (d.status || '').toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'crl') return 'crl';
  if (s === 'withdrawn') return 'withdrawn';
  if (s === 'delayed') return 'delayed';
  if (s === 'complete response' || s === 'complete_response') return 'crl';
  return null;
}

// Human-readable outcome label
function getOutcomeLabel(result) {
  const labels = {
    approved: '✓ FDA Approved',
    crl: '✗ Complete Response Letter (CRL)',
    delayed: '⏳ Review Delayed',
    withdrawn: '— Application Withdrawn',
    pending: '🕐 Decision Pending'
  };
  return labels[result] || '— Decision Unknown';
}

// CSS class for outcome styling
function getOutcomeClass(result) {
  if (result === 'approved') return 'approved';
  if (result === 'crl') return 'crl';
  if (result === 'delayed') return 'delayed';
  if (result === 'withdrawn') return 'unknown';
  return 'unknown';
}

function enrichEntry(d) {
  const hasCrlHistory = (d.notes || '').toLowerCase().includes('resubmission') ||
                        (d.notes || '').toLowerCase().includes('complete response') ||
                        d.status === 'CRL';
  const catalystType = d.catalyst_type || 'pdufa';
  const outcomeResult = getOutcomeResult(d);
  const designation = d.designation || [];
  return {
    ...d,
    catalyst_type: catalystType,
    catalystConfig: getCatalystConfig(catalystType),
    statusClass: getStatusClass(d.pdufa_date),
    formattedDate: formatDate(d.pdufa_date),
    daysUntil: daysUntil(d.pdufa_date),
    basePoA: getBasePoA(d.phase, d.review_type, hasCrlHistory, catalystType, designation),
    poaRationale: getPoARationale(d.phase, d.review_type, hasCrlHistory, catalystType, designation),
    hasCrlHistory,
    showPoA: POA_CATALYST_TYPES.has(catalystType),
    outcomeResult,
    outcomeLabel: outcomeResult ? getOutcomeLabel(outcomeResult) : null,
    outcomeClass: outcomeResult ? getOutcomeClass(outcomeResult) : null
  };
}

// ============ ROUTES ============

// Homepage — Catalyst Calendar view
app.get('/', async (req, res) => {
  try {
    const pool = getPool();
    let entries = [];

    if (pool) {
      const result = await pool.query(`
        SELECT * FROM pdufa_dates
        WHERE status NOT IN ('withdrawn')
        ORDER BY pdufa_date ASC
      `);
      entries = result.rows;
    }

    // Enrich all entries
    entries = entries.map(enrichEntry);

    // Group by upcoming/past
    const now = new Date();
    const upcoming = entries.filter(d => new Date(d.pdufa_date) >= now);
    const past = entries.filter(d => new Date(d.pdufa_date) < now);

    // "Upcoming This Week" — events within next 7 days
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const thisWeek = upcoming.filter(d => {
      const dt = new Date(d.pdufa_date);
      return dt >= now && dt <= weekFromNow;
    });
    // Fallback: if no events this week, grab the next soonest catalyst
    const nextUp = thisWeek.length === 0 && upcoming.length > 0 ? upcoming[0] : null;

    // Build Schema.org ItemList specifically for this week's featured section
    const weeklySchemaItems = (thisWeek.length > 0 ? thisWeek : (nextUp ? [nextUp] : []));
    const weeklySchema = weeklySchemaItems.length > 0 ? buildWeeklyItemListSchema(weeklySchemaItems, BASE_URL) : null;

    // Stats
    const pdufaEntries = entries.filter(d => d.catalyst_type === 'pdufa');
    const upcomingPdufa = upcoming.filter(d => d.catalyst_type === 'pdufa');

    // Catalyst type counts for filter pills
    const typeCounts = {};
    upcoming.forEach(d => {
      typeCounts[d.catalyst_type] = (typeCounts[d.catalyst_type] || 0) + 1;
    });

    const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
    const pageSchema = buildHomeItemListSchema(upcoming, BASE_URL);
    res.render('pages/home', {
      title: 'Biotech Catalyst Calendar 2026 — FDA PDUFA Dates, Trial Readouts & AdCom | Dan Sfera',
      metaDescription: 'Live biotech catalyst calendar for 2026. PDUFA dates, FDA Advisory Committee meetings, Phase 3 trial readouts, and conference schedules. Curated by Dan Sfera — 20+ years in clinical trials.',
      canonicalUrl: '/',
      ogType: 'website',
      pageSchema,
      weeklySchema,
      thisWeek,
      nextUp,
      entries,
      upcoming,
      past,
      typeCounts,
      BASE_URL,
      appBase,
      analyticsSlug,
      CATALYST_TYPES,
      formatDate,
      daysUntil,
      getStatusClass,
      getBasePoA,
      getCatalystConfig,
      stats: {
        total: entries.length,
        upcomingTotal: upcoming.length,
        upcomingPdufa: upcomingPdufa.length,
        priorityPdufa: pdufaEntries.filter(d => d.review_type === 'priority').length
      }
    });
  } catch (err) {
    console.error('[PDUFA] Home error:', err.message);
    const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
    res.render('pages/home', {
      title: 'Biotech Catalyst Calendar 2026 — Dan Sfera',
      metaDescription: 'Live biotech catalyst calendar for 2026.',
      canonicalUrl: '/',
      ogType: 'website',
      pageSchema: null,
      weeklySchema: null,
      thisWeek: [],
      nextUp: null,
      entries: [],
      upcoming: [],
      past: [],
      typeCounts: {},
      BASE_URL,
      appBase,
      analyticsSlug,
      CATALYST_TYPES,
      formatDate,
      daysUntil,
      getStatusClass,
      getBasePoA,
      getCatalystConfig,
      stats: { total: 0, upcomingTotal: 0, upcomingPdufa: 0, priorityPdufa: 0 },
      error: 'Database temporarily unavailable. Data will appear shortly.'
    });
  }
});

// Entry detail page (works for all catalyst types)
app.get('/drug/:slug', async (req, res, next) => {
  try {
    const pool = getPool();
    if (!pool) return next();

    const result = await pool.query(
      'SELECT * FROM pdufa_dates WHERE slug = $1',
      [req.params.slug]
    );

    if (!result.rows.length) return next();
    const drug = result.rows[0];

    // Get recent articles for this drug (PDUFA entries only)
    let articles = [];
    if ((drug.catalyst_type || 'pdufa') === 'pdufa') {
      const articleResult = await pool.query(
        `SELECT * FROM pdufa_articles WHERE drug_id = $1 AND is_published = true ORDER BY published_at DESC LIMIT 5`,
        [drug.id]
      );
      articles = articleResult.rows;
    }

    const enriched = enrichEntry(drug);
    const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
    const catalystConfig = getCatalystConfig(enriched.catalyst_type);

    const titleDrug = drug.brand_name || drug.drug_name;
    const titleTicker = drug.ticker ? ` (${drug.ticker})` : (drug.company ? ` — ${drug.company}` : '');
    const pageTitle = `${titleDrug}${titleTicker} — ${catalystConfig.label} ${formatDate(drug.pdufa_date)} | Dan Sfera`;
    const pageDesc = `${catalystConfig.label} catalyst: ${drug.brand_name || drug.drug_name} by ${drug.company}. ${catalystConfig.description} — ${formatDate(drug.pdufa_date)}. ${drug.indication || ''}.`.replace(/\.\s*\.$/, '.').trim();

    // Build Schema.org Event markup
    const pageSchema = buildEventSchema(drug, enriched, BASE_URL);

    // OG image: use drug-specific image if available, else default
    const ogImageAlt = `${titleDrug} — ${catalystConfig.label} ${formatDate(drug.pdufa_date)} | Dan Sfera Biotech Catalyst Calendar`;

    // Fetch real-time financial data for the drug's ticker (server-side, cached 1hr)
    let companyFinancials = null;
    if (drug.ticker) {
      try {
        const pool = getPool();
        companyFinancials = await getCompanyData(drug.ticker, pool);
      } catch (e) {
        console.error('[FMP] Error fetching financials for', drug.ticker, ':', e.message);
      }
    }

    res.render('pages/drug', {
      title: pageTitle,
      metaDescription: pageDesc,
      canonicalUrl: `/drug/${drug.slug}`,
      ogType: 'article',
      pageSchema,
      ogImageAlt,
      drug: enriched,
      articles,
      companyFinancials,
      formatMarketCap,
      formatVolume,
      formatPrice,
      BASE_URL,
      appBase,
      analyticsSlug,
      formatDate,
      CATALYST_TYPES,
      getCatalystConfig
    });
  } catch (err) {
    console.error('[PDUFA] Drug detail error:', err.message);
    next(err);
  }
});

// About the Calendar page
app.get('/about', (req, res) => {
  const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
  res.render('pages/about', {
    title: 'About the PDUFA Calendar — Biotech Catalyst Tracker by Dan Sfera',
    metaDescription: 'Free PDUFA calendar tracking FDA drug approval dates, AdCom meetings, Phase 3 trial readouts, and conference schedules. Built by Dan Sfera, clinical trials veteran with 20+ years experience.',
    canonicalUrl: '/about',
    ogType: 'website',
    pageSchema: null,
    BASE_URL,
    appBase,
    analyticsSlug
  });
});

// PDUFA Dates Explained — SEO educational page
app.get('/pdufa-explained', (req, res) => {
  const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
  const pageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "PDUFA Dates Explained: The FDA Approval Calendar Every Biotech Investor Needs",
    "description": "A complete guide to PDUFA dates, the FDA drug review process (NDA/BLA, Priority vs. Standard review), Complete Response Letters, and probability-of-approval scores for biotech investors.",
    "url": `${BASE_URL}/pdufa-explained`,
    "datePublished": "2026-04-08",
    "dateModified": new Date().toISOString().split('T')[0],
    "author": {
      "@type": "Person",
      "name": "Dan Sfera",
      "url": `${BASE_URL}/dan-sfera`,
      "sameAs": ["https://x.com/dansfera", "https://substack.com/@dansfera1"]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Dan Sfera | Biotech Catalyst Calendar",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/pdufa/og-default.png`
      }
    },
    "image": `${BASE_URL}/pdufa/og-default.png`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/pdufa-explained`
    },
    "about": [
      { "@type": "Thing", "name": "PDUFA date" },
      { "@type": "Thing", "name": "FDA drug approval" },
      { "@type": "Thing", "name": "Biotech investing" },
      { "@type": "Thing", "name": "New Drug Application" }
    ]
  });

  res.render('pages/pdufa-explained', {
    title: 'PDUFA Dates Explained — FDA Approval Dates & Biotech Catalyst Calendar | Dan Sfera',
    metaDescription: 'What is a PDUFA date? Learn how the FDA review process works (NDA/BLA, Priority vs. Standard review), what a Complete Response Letter means, and how to use probability-of-approval scores to track biotech catalyst dates.',
    canonicalUrl: '/pdufa-explained',
    ogType: 'article',
    pageSchema,
    BASE_URL,
    appBase,
    analyticsSlug
  });
});

// How to Trade PDUFA Dates — SEO actionable strategy guide
app.get('/how-to-trade-pdufa-dates', async (req, res) => {
  const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';

  // Fetch 3 upcoming PDUFA/AdCom catalysts for the "Current Examples" section
  let upcomingExamples = [];
  try {
    const pool = getPool();
    if (pool) {
      const result = await pool.query(`
        SELECT * FROM pdufa_dates
        WHERE status NOT IN ('withdrawn')
          AND catalyst_type IN ('pdufa', 'adcom')
          AND pdufa_date >= CURRENT_DATE
        ORDER BY pdufa_date ASC
        LIMIT 3
      `);
      upcomingExamples = result.rows.map(enrichEntry);
    }
  } catch (e) {
    console.error('[PDUFA] how-to-trade examples error:', e.message);
  }

  const pageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Trade PDUFA Dates: Strategy Guide for Biotech Investors",
    "description": "Learn how to trade PDUFA dates with position sizing, options strategies around IV crush, reading probability of approval scores, and the most common mistakes that destroy biotech catalyst traders.",
    "url": `${BASE_URL}/how-to-trade-pdufa-dates`,
    "datePublished": "2026-04-08",
    "dateModified": new Date().toISOString().split('T')[0],
    "author": {
      "@type": "Person",
      "name": "Dan Sfera",
      "url": `${BASE_URL}/dan-sfera`,
      "sameAs": ["https://x.com/dansfera", "https://substack.com/@dansfera1"]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Dan Sfera | Biotech Catalyst Calendar",
      "url": BASE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/pdufa/og-default.png`
      }
    },
    "image": `${BASE_URL}/pdufa/og-default.png`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/how-to-trade-pdufa-dates`
    },
    "about": [
      { "@type": "Thing", "name": "PDUFA date trading" },
      { "@type": "Thing", "name": "Biotech catalyst trading" },
      { "@type": "Thing", "name": "FDA approval trading strategy" },
      { "@type": "Thing", "name": "PDUFA trading strategy" }
    ]
  });

  res.render('pages/how-to-trade-pdufa-dates', {
    title: 'How to Trade PDUFA Dates — Biotech Catalyst Trading Strategy | Dan Sfera',
    metaDescription: 'Step-by-step PDUFA trading strategy guide: position sizing for binary events, options IV crush, reading probability of approval scores, AdCom signals, and the most common mistakes that destroy biotech catalyst traders.',
    canonicalUrl: '/how-to-trade-pdufa-dates',
    ogType: 'article',
    pageSchema,
    BASE_URL,
    appBase,
    analyticsSlug,
    upcomingExamples
  });
});

// Q2 2026 Biotech Catalysts — auto-generated SEO calendar page
app.get('/biotech-catalysts-q2-2026', async (req, res) => {
  const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';

  // Q2 2026 = April 1 – June 30, 2026
  let catalysts = [];
  try {
    const pool = getPool();
    if (pool) {
      const result = await pool.query(`
        SELECT * FROM pdufa_dates
        WHERE status NOT IN ('withdrawn')
          AND pdufa_date >= '2026-04-01'
          AND pdufa_date <= '2026-06-30'
        ORDER BY pdufa_date ASC
      `);
      catalysts = result.rows.map(enrichEntry);
    }
  } catch (e) {
    console.error('[PDUFA] biotech-catalysts-q2-2026 error:', e.message);
  }

  // Build Schema.org Article + ItemList
  const today = new Date().toISOString().split('T')[0];
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Q2 2026 Biotech Catalysts — Complete FDA Calendar',
    'description': 'All biotech catalysts in Q2 2026 (April–June): PDUFA dates, AdCom meetings, Phase 3 trial readouts, and conference schedules.',
    'url': `${BASE_URL}/biotech-catalysts-q2-2026`,
    'numberOfItems': catalysts.length,
    'itemListElement': catalysts.map((d, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'item': {
        '@type': 'Event',
        '@id': `${BASE_URL}/drug/${d.slug}#event`,
        'name': `${d.catalystConfig.label}: ${d.brand_name || d.drug_name}${d.ticker ? ` (${d.ticker})` : ''}`,
        'url': `${BASE_URL}/drug/${d.slug}`,
        'startDate': d.pdufa_date ? new Date(d.pdufa_date).toISOString().split('T')[0] : undefined,
        'description': `${d.catalystConfig.description}${d.indication ? ` for ${d.indication}` : ''}`,
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OnlineEventAttendanceMode',
        'location': { '@type': 'VirtualLocation', 'url': `${BASE_URL}/drug/${d.slug}` },
        'organizer': { '@type': 'Organization', 'name': d.company || 'Biotech Company' }
      }
    }))
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': 'Q2 2026 Biotech Catalysts: Complete FDA Calendar',
    'description': 'All biotech catalysts in Q2 2026 (April–June): PDUFA dates, FDA Advisory Committee meetings, Phase 3 trial readouts, and conference schedules. Updated from live database.',
    'url': `${BASE_URL}/biotech-catalysts-q2-2026`,
    'datePublished': '2026-04-13',
    'dateModified': today,
    'author': {
      '@type': 'Person',
      'name': 'Dan Sfera',
      'url': `${BASE_URL}/dan-sfera`,
      'sameAs': ['https://x.com/dansfera', 'https://substack.com/@dansfera1']
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Dan Sfera | Biotech Catalyst Calendar',
      'url': BASE_URL,
      'logo': { '@type': 'ImageObject', 'url': `${BASE_URL}/pdufa/og-default.png` }
    },
    'image': `${BASE_URL}/pdufa/og-default.png`,
    'mainEntityOfPage': { '@type': 'WebPage', '@id': `${BASE_URL}/biotech-catalysts-q2-2026` },
    'about': [
      { '@type': 'Thing', 'name': 'biotech catalysts Q2 2026' },
      { '@type': 'Thing', 'name': 'FDA PDUFA dates 2026' },
      { '@type': 'Thing', 'name': 'upcoming FDA decisions 2026' },
      { '@type': 'Thing', 'name': 'biotech stocks Q2 2026' }
    ]
  };

  const pageSchema = JSON.stringify([articleSchema, itemListSchema]);

  res.render('pages/biotech-catalysts-q2-2026', {
    title: 'Q2 2026 Biotech Catalysts: Complete FDA Calendar — PDUFA Dates & Trial Readouts | Dan Sfera',
    metaDescription: 'Complete Q2 2026 biotech catalyst calendar: all FDA PDUFA decisions, AdCom meetings, and Phase 3 trial readouts from April through June 2026. Updated weekly from live database. Probability of approval scores included.',
    canonicalUrl: '/biotech-catalysts-q2-2026',
    ogType: 'article',
    pageSchema,
    BASE_URL,
    appBase,
    analyticsSlug,
    catalysts,
    formatDate,
    CATALYST_TYPES,
    getCatalystConfig
  });
});

// Dan Sfera investor profile page
app.get('/dan-sfera', (req, res) => {
  const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
  res.render('pages/dan-sfera', {
    title: 'Dan Sfera — Investor | Clinical Trials Veteran & Biotech Analyst',
    metaDescription: 'Dan Sfera — 20+ years in clinical trials. Seed investor backing early-stage healthcare technology companies at the intersection of clinical operations, AI, and FDA strategy.',
    canonicalUrl: '/dan-sfera',
    ogType: 'profile',
    pageSchema: null,
    BASE_URL,
    appBase,
    analyticsSlug
  });
});

// API: Get real-time financial data for a ticker (cached, server-side)
app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const pool = getPool();
    const data = await getCompanyData(req.params.ticker, pool);
    if (!data) {
      return res.status(404).json({ success: false, message: 'No financial data found for ticker: ' + req.params.ticker });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// API endpoint for JSON data
app.get('/api/calendar', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ success: false, message: 'Database unavailable' });

    const typeFilter = req.query.type;
    let query = `
      SELECT drug_name, brand_name, company, ticker, cashtag, pdufa_date,
             indication, review_type, designation, phase, status, slug, catalyst_type
      FROM pdufa_dates
      WHERE status NOT IN ('withdrawn')
    `;
    const params = [];
    if (typeFilter && CATALYST_TYPES[typeFilter]) {
      query += ` AND catalyst_type = $1`;
      params.push(typeFilter);
    }
    query += ` ORDER BY pdufa_date ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ FINANCIAL DATA API ============
// Primary: Yahoo Finance (no API key required)
// Optional override: set FMP_API_KEY for Financial Modeling Prep

// Simple in-memory cache with TTL
const _finCache = new Map();
function finCacheGet(key) {
  const entry = _finCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { _finCache.delete(key); return null; }
  return entry.value;
}
function finCacheSet(key, value, ttlMs) {
  _finCache.set(key, { value, expires: Date.now() + ttlMs });
}

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; DanSferaBiotechCalendar/1.0)',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function yfFetch(url) {
  try {
    const res = await fetch(url, {
      headers: YF_HEADERS,
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[YF] fetch error:', e.message);
    return null;
  }
}

// Yahoo Finance: search autocomplete
async function yfSearch(query) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&enableEnhancedTrivialQuery=true`;
  const data = await yfFetch(url);
  if (!data || !data.quotes) return [];
  return data.quotes
    .filter(q => q.symbol && q.quoteType === 'EQUITY' && !q.symbol.includes('.'))
    .slice(0, 8)
    .map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchDisp || q.exchange || '',
      hasCatalyst: false
    }));
}

// Yahoo Finance: quote summary (price + profile + key stats)
async function yfQuoteSummary(ticker) {
  const modules = 'price,summaryProfile,defaultKeyStatistics,summaryDetail';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=`;
  const data = await yfFetch(url);
  if (!data || !data.quoteSummary || data.quoteSummary.error) return null;
  return data.quoteSummary.result && data.quoteSummary.result[0];
}

// FMP optional override
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

async function fmpFetch(path) {
  if (!FMP_API_KEY) return null;
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_BASE}${path}${sep}apikey=${FMP_API_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// GET /api/search?q=AMGN — autocomplete ticker/company search
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 1) return res.json({ success: true, results: [] });

  const cacheKey = `search:${q.toUpperCase()}`;
  const cached = finCacheGet(cacheKey);
  if (cached) return res.json({ success: true, results: cached, cached: true });

  try {
    // Get external search results (Yahoo Finance preferred, FMP fallback)
    let extResults = [];
    if (FMP_API_KEY) {
      const data = await fmpFetch(`/search?query=${encodeURIComponent(q)}&limit=8`);
      if (Array.isArray(data)) {
        extResults = data
          .filter(r => r.symbol && !r.symbol.includes('.'))
          .slice(0, 8)
          .map(r => ({ symbol: r.symbol, name: r.name, exchange: r.exchangeShortName || '', hasCatalyst: false }));
      }
    }
    if (!extResults.length) {
      extResults = await yfSearch(q);
    }

    // Merge with catalyst DB matches
    const pool = getPool();
    if (pool) {
      const dbRes = await pool.query(
        `SELECT DISTINCT ticker, company, drug_name FROM pdufa_dates
         WHERE (UPPER(ticker) LIKE $1 OR UPPER(company) LIKE $2)
           AND ticker IS NOT NULL AND ticker != ''
         ORDER BY ticker LIMIT 5`,
        [`${q.toUpperCase()}%`, `%${q.toUpperCase()}%`]
      );

      const extSymbols = new Set(extResults.map(r => r.symbol));
      dbRes.rows.forEach(row => {
        if (row.ticker && !extSymbols.has(row.ticker)) {
          extResults.unshift({
            symbol: row.ticker,
            name: row.company || row.drug_name || row.ticker,
            exchange: '',
            hasCatalyst: true
          });
        }
      });

      // Mark results that have catalysts in our DB
      const allSymbols = extResults.map(r => r.symbol);
      if (allSymbols.length > 0) {
        const inDb = await pool.query(
          `SELECT DISTINCT ticker FROM pdufa_dates WHERE ticker = ANY($1)`,
          [allSymbols]
        );
        const dbSet = new Set(inDb.rows.map(r => r.ticker));
        extResults.forEach(r => { if (dbSet.has(r.symbol)) r.hasCatalyst = true; });
      }
    }

    finCacheSet(cacheKey, extResults, 60 * 60 * 1000); // 1 hour cache
    res.json({ success: true, results: extResults });
  } catch (err) {
    console.error('[Search] error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stock/:ticker — full stock data + catalysts from our DB
app.get('/api/stock/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase().replace(/[^A-Z0-9.]/g, '');
  if (!ticker) return res.status(400).json({ success: false, message: 'Invalid ticker' });

  const cacheKey = `stock:${ticker}`;
  const cached = finCacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  try {
    let data = null;

    // Try FMP first if key is configured (more reliable)
    if (FMP_API_KEY) {
      const [profileData, quoteData] = await Promise.all([
        fmpFetch(`/profile/${ticker}`),
        fmpFetch(`/quote/${ticker}`)
      ]);
      const profile = Array.isArray(profileData) && profileData[0] ? profileData[0] : null;
      const quote = Array.isArray(quoteData) && quoteData[0] ? quoteData[0] : null;
      if (profile || quote) {
        let weekLow52 = quote?.yearLow ?? null;
        let weekHigh52 = quote?.yearHigh ?? null;
        if (profile?.range) {
          const parts = profile.range.split(' - ');
          if (parts.length === 2) {
            const lo = parseFloat(parts[0]), hi = parseFloat(parts[1]);
            if (!isNaN(lo)) weekLow52 = lo;
            if (!isNaN(hi)) weekHigh52 = hi;
          }
        }
        data = {
          ticker: profile?.symbol || quote?.symbol || ticker,
          companyName: profile?.companyName || quote?.name || ticker,
          price: quote?.price ?? profile?.price ?? null,
          change: quote?.change ?? null,
          changesPercentage: quote?.changesPercentage ?? null,
          marketCap: profile?.mktCap || quote?.marketCap || null,
          weekLow52, weekHigh52,
          avgVolume: profile?.volAvg || quote?.avgVolume || null,
          volume: quote?.volume || null,
          sector: profile?.sector || null,
          industry: profile?.industry || null,
          beta: profile?.beta ?? null,
          description: profile?.description || null,
          website: profile?.website || null,
          image: profile?.image || null,
          exchange: profile?.exchange || quote?.exchange || null
        };
      }
    }

    // Fall back to Yahoo Finance
    if (!data) {
      const yfData = await yfQuoteSummary(ticker);
      if (yfData) {
        const price = yfData.price || {};
        const profile = yfData.summaryProfile || {};
        const stats = yfData.defaultKeyStatistics || {};
        const summary = yfData.summaryDetail || {};

        const raw = v => (v && typeof v === 'object' && 'raw' in v) ? v.raw : v;

        data = {
          ticker,
          companyName: price.longName || price.shortName || ticker,
          price: raw(price.regularMarketPrice),
          change: raw(price.regularMarketChange),
          changesPercentage: raw(price.regularMarketChangePercent) != null
            ? raw(price.regularMarketChangePercent) * 100 : null,
          marketCap: raw(price.marketCap),
          weekLow52: raw(summary.fiftyTwoWeekLow),
          weekHigh52: raw(summary.fiftyTwoWeekHigh),
          avgVolume: raw(summary.averageVolume) || raw(summary.averageVolume10days),
          volume: raw(price.regularMarketVolume),
          sector: profile.sector || null,
          industry: profile.industry || null,
          beta: raw(stats.beta) ?? raw(summary.beta3YearMonthly) ?? null,
          description: profile.longBusinessSummary || null,
          website: profile.website || null,
          image: null,
          exchange: price.exchangeName || price.fullExchangeName || null
        };
      }
    }

    if (!data) {
      return res.json({ success: false, message: `No financial data found for ${ticker}` });
    }

    // Fetch catalysts for this ticker from our DB
    const pool = getPool();
    let catalysts = [];
    if (pool) {
      const catRes = await pool.query(
        `SELECT drug_name, brand_name, company, ticker, pdufa_date, catalyst_type,
                indication, phase, review_type, designation, status, slug, notes
         FROM pdufa_dates
         WHERE UPPER(ticker) = $1 AND status NOT IN ('withdrawn')
         ORDER BY pdufa_date ASC`,
        [ticker]
      );
      catalysts = catRes.rows.map(d => enrichEntry(d));
    }

    const result = { ...data, catalysts };
    finCacheSet(cacheKey, result, 15 * 60 * 1000); // 15 minute cache
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Stock] error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ COMMENTS API ============

// GET /api/comments/:slug — fetch comments for a catalyst, newest-first
app.get('/api/comments/:slug', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ success: true, comments: [] });

    const { slug } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT id, display_name, text, created_at
       FROM catalyst_comments
       WHERE slug = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [slug, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM catalyst_comments WHERE slug = $1`,
      [slug]
    );

    res.json({
      success: true,
      comments: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
  } catch (err) {
    console.error('[Comments] GET error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load comments.' });
  }
});

// POST /api/comments/:slug — submit a comment (rate limited: 5/hr per email)
app.post('/api/comments/:slug', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ success: false, message: 'Database unavailable.' });

    const { slug } = req.params;
    const { display_name, email, text } = req.body;

    // Validate
    if (!display_name || !email || !text) {
      return res.status(400).json({ success: false, message: 'Name, email, and comment are required.' });
    }
    if (display_name.trim().length < 2 || display_name.trim().length > 50) {
      return res.status(400).json({ success: false, message: 'Name must be 2–50 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (text.trim().length < 5 || text.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Comment must be 5–2000 characters.' });
    }

    // Rate limit: 5 comments per hour per email
    const rateCheck = await pool.query(
      `SELECT COUNT(*) FROM catalyst_comments
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [email.trim().toLowerCase()]
    );
    if (parseInt(rateCheck.rows[0].count) >= 5) {
      return res.status(429).json({ success: false, message: 'You\'ve posted too many comments. Please wait an hour.' });
    }

    // Verify slug exists
    const slugCheck = await pool.query(
      `SELECT id FROM pdufa_dates WHERE slug = $1`,
      [slug]
    );
    if (!slugCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Catalyst not found.' });
    }

    // Insert
    const result = await pool.query(
      `INSERT INTO catalyst_comments (slug, display_name, email, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, display_name, text, created_at`,
      [slug, display_name.trim(), email.trim().toLowerCase(), text.trim()]
    );

    res.json({ success: true, comment: result.rows[0] });
  } catch (err) {
    console.error('[Comments] POST error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save comment.' });
  }
});

// ============ ANALYTICS API ============

// GET /go/substack — server-side CTA click tracking via redirect
// Ad-blocker-proof: tracks the click as a normal navigation, then 302s to Substack.
// Query params: p=placement (sticky_banner|table_block|drug_inline)
const SUBSTACK_URL = 'https://dansfera1.substack.com/subscribe';
const ALLOWED_PLACEMENTS = ['sticky_banner', 'table_block', 'drug_inline'];

app.get('/go/substack', (req, res) => {
  try {
    const placement = req.query.p || 'unknown';
    const pool = getPool();
    track(pool, {
      event_type: 'cta_click',
      page: req.headers['referer'] ? new URL(req.headers['referer']).pathname : '/',
      cta_placement: ALLOWED_PLACEMENTS.includes(placement) ? placement : 'unknown',
      referrer: req.headers['referer'] || '',
      userAgent: req.headers['user-agent'] || ''
    });
  } catch (err) {
    // Never block the redirect — tracking is best-effort
    console.error('[Analytics] Redirect track error:', err.message);
  }
  res.redirect(302, SUBSTACK_URL);
});

// POST /api/evt — backup client-side CTA tracking (renamed from /api/analytics/event
// to avoid ad-blocker filter lists that block URLs containing "analytics").
app.post('/api/evt', (req, res) => {
  try {
    const { event_type, placement, page } = req.body || {};
    const ALLOWED_EVENTS = ['cta_click'];

    if (!ALLOWED_EVENTS.includes(event_type)) {
      return res.status(400).json({ ok: false });
    }

    const pool = getPool();
    track(pool, {
      event_type,
      page: page || '/',
      cta_placement: ALLOWED_PLACEMENTS.includes(placement) ? placement : 'unknown',
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[Analytics] Event error:', err.message);
    res.json({ ok: true });
  }
});

// Legacy endpoint kept for backward compat (but blocked by most ad blockers)
app.post('/api/analytics/event', (req, res) => {
  try {
    const { event_type, placement, page } = req.body || {};
    const ALLOWED_EVENTS = ['cta_click'];

    if (!ALLOWED_EVENTS.includes(event_type)) {
      return res.status(400).json({ success: false, message: 'Invalid event_type' });
    }

    const pool = getPool();
    track(pool, {
      event_type,
      page: page || '/',
      cta_placement: ALLOWED_PLACEMENTS.includes(placement) ? placement : 'unknown',
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Analytics] Event error:', err.message);
    res.json({ success: true }); // Never fail the client
  }
});

// ============ ADMIN COMMENTS API ============
// Requires header: x-admin-secret: <PDUFA_ADMIN_SECRET env var>

function requireAdminSecret(req, res, next) {
  const secret = process.env.PDUFA_ADMIN_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'Admin not configured.' });
  if (req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  next();
}

// GET /api/admin/comments — list all comments (newest first), optional ?slug= filter
app.get('/api/admin/comments', requireAdminSecret, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ success: true, comments: [] });
    const { slug, page } = req.query;
    const pg = Math.max(1, parseInt(page) || 1);
    const limit = 50;
    const offset = (pg - 1) * limit;
    const params = slug ? [slug, limit, offset] : [limit, offset];
    const rows = await pool.query(
      slug
        ? `SELECT id, slug, display_name, email, text, created_at FROM catalyst_comments WHERE slug = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
        : `SELECT id, slug, display_name, email, text, created_at FROM catalyst_comments ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    const countRes = await pool.query(
      slug
        ? `SELECT COUNT(*) FROM catalyst_comments WHERE slug = $1`
        : `SELECT COUNT(*) FROM catalyst_comments`,
      slug ? [slug] : []
    );
    res.json({ success: true, comments: rows.rows, total: parseInt(countRes.rows[0].count), page: pg, limit });
  } catch (err) {
    console.error('[Admin Comments] GET error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load comments.' });
  }
});

// DELETE /api/admin/comments/:id — delete a comment by ID
app.delete('/api/admin/comments/:id', requireAdminSecret, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ success: false, message: 'Database unavailable.' });
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM catalyst_comments WHERE id = $1 RETURNING id`,
      [parseInt(id)]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }
    console.log(`[Admin Comments] Deleted comment id=${id}`);
    res.json({ success: true, deleted: result.rows[0].id });
  } catch (err) {
    console.error('[Admin Comments] DELETE error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete comment.' });
  }
});

// ============ ADMIN ANALYTICS ENDPOINT ============
// GET /api/admin/analytics — traffic metrics for dansfera.com
// Requires x-admin-secret header (same admin secret as comments API)

app.get('/api/admin/analytics', requireAdminSecret, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ success: false, message: 'Database unavailable.' });

    const { days = '7' } = req.query;
    const daysInt = Math.min(90, Math.max(1, parseInt(days) || 7));

    // Helper: run a query and return rows
    const q = (sql, params) => pool.query(sql, params).then(r => r.rows);

    // ── 1. Total page views (non-bot) ──
    const [totals] = await q(`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND NOT is_bot) AS total_page_views,
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND NOT is_bot AND created_at >= NOW() - INTERVAL '24 hours') AS views_today,
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND NOT is_bot AND created_at >= NOW() - INTERVAL '7 days') AS views_7d,
        COUNT(*) FILTER (WHERE event_type = 'cta_click' AND NOT is_bot) AS total_cta_clicks,
        COUNT(*) FILTER (WHERE event_type = 'cta_click' AND NOT is_bot AND created_at >= NOW() - INTERVAL '7 days') AS cta_clicks_7d
      FROM dansfera_analytics
    `);

    // ── 2. Top pages by traffic (last N days, non-bot) ──
    const topPages = await q(`
      SELECT page, COUNT(*) AS views
      FROM dansfera_analytics
      WHERE event_type = 'page_view'
        AND NOT is_bot
        AND created_at >= NOW() - INTERVAL '${daysInt} days'
      GROUP BY page
      ORDER BY views DESC
      LIMIT 20
    `);

    // ── 3. Referral source breakdown (last N days, non-bot page views) ──
    const refSources = await q(`
      SELECT ref_source, COUNT(*) AS views
      FROM dansfera_analytics
      WHERE event_type = 'page_view'
        AND NOT is_bot
        AND created_at >= NOW() - INTERVAL '${daysInt} days'
      GROUP BY ref_source
      ORDER BY views DESC
    `);

    // ── 4. CTA click breakdown by placement (all time) ──
    const ctaBreakdown = await q(`
      SELECT cta_placement, COUNT(*) AS clicks
      FROM dansfera_analytics
      WHERE event_type = 'cta_click'
        AND NOT is_bot
      GROUP BY cta_placement
      ORDER BY clicks DESC
    `);

    // ── 5. Daily page views trend (last N days) ──
    const dailyTrend = await q(`
      SELECT
        DATE(created_at AT TIME ZONE 'UTC') AS date,
        COUNT(*) AS views
      FROM dansfera_analytics
      WHERE event_type = 'page_view'
        AND NOT is_bot
        AND created_at >= NOW() - INTERVAL '${daysInt} days'
      GROUP BY DATE(created_at AT TIME ZONE 'UTC')
      ORDER BY date ASC
    `);

    // ── 6. CTA click-through rate (CTR) ──
    // CTR = cta_clicks / page_views (same period)
    const [ctaWindow] = await q(`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND NOT is_bot) AS page_views,
        COUNT(*) FILTER (WHERE event_type = 'cta_click' AND NOT is_bot) AS cta_clicks
      FROM dansfera_analytics
      WHERE created_at >= NOW() - INTERVAL '${daysInt} days'
    `);
    const ctr = ctaWindow.page_views > 0
      ? ((ctaWindow.cta_clicks / ctaWindow.page_views) * 100).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      window_days: daysInt,
      summary: {
        total_page_views: parseInt(totals.total_page_views),
        views_today: parseInt(totals.views_today),
        views_7d: parseInt(totals.views_7d),
        total_cta_clicks: parseInt(totals.total_cta_clicks),
        cta_clicks_7d: parseInt(totals.cta_clicks_7d),
        ctr_percent: ctr
      },
      top_pages: topPages.map(r => ({ page: r.page, views: parseInt(r.views) })),
      referral_sources: refSources.map(r => ({ source: r.ref_source, views: parseInt(r.views) })),
      cta_breakdown: ctaBreakdown.map(r => ({ placement: r.cta_placement, clicks: parseInt(r.clicks) })),
      daily_trend: dailyTrend.map(r => ({ date: r.date, views: parseInt(r.views) }))
    });
  } catch (err) {
    console.error('[Admin Analytics] error:', err.message);
    res.status(500).json({ success: false, message: 'Analytics query failed: ' + err.message });
  }
});

// ============ ADMIN CATALYST REFRESH ENDPOINT ============
// POST /api/admin/refresh-catalysts — trigger weekly catalyst data refresh manually
// Same logic as the automated Monday cron. Returns { added, updated, expired }.
// Usage: curl -X POST https://dansfera.com/api/admin/refresh-catalysts \
//             -H "x-admin-secret: <PDUFA_ADMIN_SECRET>"

app.post('/api/admin/refresh-catalysts', requireAdminSecret, (req, res) => {
  res.json({
    success: true,
    message: 'Catalyst refresh triggered. Check server logs for progress. Results will be logged to pdufa_refresh_log.'
  });

  // Run after response is sent so the HTTP client doesn't wait for the full run
  setImmediate(() => {
    try {
      const { run } = require('../scripts/catalyst-refresh');
      run()
        .then(result => {
          console.log('[Admin Refresh] Catalyst refresh completed:', result);
        })
        .catch(err => {
          console.error('[Admin Refresh] Catalyst refresh failed:', err.message);
        });
    } catch (err) {
      console.error('[Admin Refresh] Could not load catalyst-refresh script:', err.message);
    }
  });
});

// ============ ADMIN: LAST REFRESH STATUS ============
// GET /api/admin/refresh-catalysts — returns last N refresh runs from pdufa_refresh_log
app.get('/api/admin/refresh-catalysts', requireAdminSecret, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.json({ success: false, message: 'Database unavailable.' });

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const { rows } = await pool.query(`
      SELECT source, records_upserted, status, notes, created_at
      FROM pdufa_refresh_log
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({ success: true, runs: rows, count: rows.length });
  } catch (err) {
    console.error('[Admin Refresh] GET log error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Google Search Console HTML verification file
// Set GOOGLE_VERIFICATION_FILE_SLUG env var to the code from GSC (e.g. "1234567890abcdef")
app.get('/google:code.html', (req, res, next) => {
  const slug = process.env.GOOGLE_VERIFICATION_FILE_SLUG;
  if (!slug || req.params.code !== slug) return next();
  res.type('text/html').send(`google-site-verification: google${slug}.html`);
});

// Sitemap
// RSS Feed — upcoming & recently resolved catalyst events (cached 1 hour)
const RSS_CACHE_KEY = 'rss:feed';

app.get('/feed.xml', async (req, res) => {
  const cached = finCacheGet(RSS_CACHE_KEY);
  if (cached) {
    res.type('application/rss+xml').send(cached);
    return;
  }

  try {
    const pool = getPool();
    let items = [];

    if (pool) {
      // Upcoming in next 30 days + recently resolved in last 7 days with outcomes
      const result = await pool.query(`
        SELECT drug_name, brand_name, ticker, catalyst_type, pdufa_date,
               company, indication, phase, slug, status, outcome_result,
               outcome_date, designation
        FROM pdufa_dates
        WHERE status NOT IN ('withdrawn')
          AND (
            (pdufa_date >= CURRENT_DATE AND pdufa_date <= CURRENT_DATE + INTERVAL '30 days')
            OR
            (pdufa_date >= CURRENT_DATE - INTERVAL '7 days' AND pdufa_date < CURRENT_DATE AND outcome_result IS NOT NULL)
          )
        ORDER BY pdufa_date ASC
        LIMIT 20
      `);
      items = result.rows;
    }

    function escapeXml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function buildItemTitle(d) {
      const config = CATALYST_TYPES[d.catalyst_type] || CATALYST_TYPES.pdufa;
      const drugName = d.brand_name || d.drug_name;
      const ticker = d.ticker ? ` (${d.ticker})` : '';
      const company = d.company ? ` — ${d.company}` : '';
      return `${config.label}: ${drugName}${ticker}${company}`;
    }

    function buildItemDescription(d) {
      const config = CATALYST_TYPES[d.catalyst_type] || CATALYST_TYPES.pdufa;
      const drugName = d.brand_name || d.drug_name;
      const dateStr = d.pdufa_date
        ? new Date(d.pdufa_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
        : 'TBD';
      const parts = [
        `${config.label} catalyst: ${drugName}${d.ticker ? ` (${d.ticker})` : ''}`,
        d.company ? `Company: ${d.company}` : null,
        `Date: ${dateStr}`,
        d.indication ? `Indication: ${d.indication}` : null,
        d.phase ? `Phase: ${d.phase}` : null,
        d.outcome_result ? `Outcome: ${d.outcome_result}` : null,
      ];
      return parts.filter(Boolean).join('. ');
    }

    const buildDate = new Date().toUTCString();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    xml += '  <channel>\n';
    xml += '    <title>TrialAlpha Biotech Catalyst Calendar</title>\n';
    xml += '    <description>FDA PDUFA dates, AdCom meetings, Phase 3 trial readouts, and more. Curated by Dan Sfera.</description>\n';
    xml += `    <link>${BASE_URL}</link>\n`;
    xml += `    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n`;
    xml += '    <language>en-US</language>\n';
    xml += `    <lastBuildDate>${buildDate}</lastBuildDate>\n`;
    xml += '    <ttl>60</ttl>\n';
    xml += '    <image>\n';
    xml += `      <url>${BASE_URL}/pdufa/og-default.png</url>\n`;
    xml += '      <title>TrialAlpha Biotech Catalyst Calendar</title>\n';
    xml += `      <link>${BASE_URL}</link>\n`;
    xml += '    </image>\n';

    for (const d of items) {
      const itemUrl = `${BASE_URL}/drug/${d.slug}`;
      const title = escapeXml(buildItemTitle(d));
      const description = escapeXml(buildItemDescription(d));
      const pubDate = d.pdufa_date ? new Date(d.pdufa_date).toUTCString() : buildDate;
      xml += '    <item>\n';
      xml += `      <title>${title}</title>\n`;
      xml += `      <description>${description}</description>\n`;
      xml += `      <link>${itemUrl}</link>\n`;
      xml += `      <guid isPermaLink="true">${itemUrl}</guid>\n`;
      xml += `      <pubDate>${pubDate}</pubDate>\n`;
      xml += '    </item>\n';
    }

    xml += '  </channel>\n';
    xml += '</rss>';

    finCacheSet(RSS_CACHE_KEY, xml, 60 * 60 * 1000); // 1 hour cache
    res.type('application/rss+xml').send(xml);
  } catch (err) {
    console.error('[RSS] Feed error:', err.message);
    res.status(500).type('application/rss+xml').send('<?xml version="1.0"?><rss version="2.0"><channel><title>Feed Error</title></channel></rss>');
  }
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const pool = getPool();
    let entries = [];
    if (pool) {
      const result = await pool.query(`SELECT slug, pdufa_date, updated_at FROM pdufa_dates WHERE status NOT IN ('withdrawn') ORDER BY pdufa_date ASC`);
      entries = result.rows;
    }

    const today = new Date().toISOString().split('T')[0];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${BASE_URL}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/feed.xml</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/pdufa-explained</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/how-to-trade-pdufa-dates</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/biotech-catalysts-q2-2026</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${BASE_URL}/dan-sfera</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    entries.forEach(d => {
      // Prefer updated_at, fall back to pdufa_date, then today
      const lastmod = d.updated_at
        ? new Date(d.updated_at).toISOString().split('T')[0]
        : d.pdufa_date
          ? new Date(d.pdufa_date).toISOString().split('T')[0]
          : today;
      xml += `  <url><loc>${BASE_URL}/drug/${d.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    });
    xml += '</urlset>';

    res.type('application/xml').send(xml);
  } catch (err) {
    res.status(500).send('<!-- Sitemap error -->');
  }
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${BASE_URL}/sitemap.xml\n`);
});

// Ads.txt (Adsterra)
app.get('/ads.txt', (req, res) => {
  const adsTxt = process.env.PDUFA_ADS_TXT ||
    '# Dan Sfera Biotech Catalyst Calendar\nadsterra.com, 28967138, DIRECT\n';
  res.type('text/plain').send(adsTxt);
});

// Health check — required for Render deploy swap on dansfera.com custom domain
// dansfera.com routes ALL requests through this sub-app (server.js hostname middleware),
// so /health must live here or Render's health check returns 404 and the deploy never completes.
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// 404
app.use((req, res) => {
  const appBase = req.pdufaBase !== undefined ? req.pdufaBase : '';
  res.status(404).render('pages/404', {
    title: 'Page Not Found — Dan Sfera Biotech Catalyst Calendar',
    metaDescription: '404 — this page does not exist.',
    canonicalUrl: req.path,
    BASE_URL,
    appBase,
    analyticsSlug
  });
});

// ============ WEEKLY CATALYST REFRESH (Mondays 06:00 UTC = 2:00 AM ET) ============
// Automatically refreshes catalyst data: pulls FDA outcomes for past PDUFA entries
// and marks overdue catalysts as 'reported'. Logs results to pdufa_refresh_log.
// Runs BEFORE the FDA outcome-only pull at 08:00 UTC so the two don't overlap.

(function scheduleWeeklyCatalystRefresh() {
  if (!process.env.DATABASE_URL) {
    console.log('[Catalyst Scheduler] No DATABASE_URL — skipping weekly catalyst refresh scheduler.');
    return;
  }

  /**
   * Calculate milliseconds until the next Monday at 06:00 UTC.
   * If today is Monday and it's before 06:00 UTC, fires today.
   */
  function msUntilNextMondayAt6UTC() {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7 || 7;

    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      6, 0, 0, 0   // 06:00:00.000 UTC
    ));

    // If we computed "today" but it's already past 06:00, push to next Monday
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 7);
    }

    return next.getTime() - now.getTime();
  }

  function runCatalystRefresh() {
    console.log('[Catalyst Scheduler] Running weekly catalyst data refresh...');
    try {
      const { run } = require('../scripts/catalyst-refresh');
      run()
        .then(result => {
          console.log('[Catalyst Scheduler] Weekly refresh complete:', result);
        })
        .catch(err => {
          console.error('[Catalyst Scheduler] Refresh failed:', err.message);
        });
    } catch (err) {
      console.error('[Catalyst Scheduler] Could not load catalyst-refresh script:', err.message);
    }
  }

  const msUntilFirst = msUntilNextMondayAt6UTC();
  const nextRunDate = new Date(Date.now() + msUntilFirst);
  console.log(`[Catalyst Scheduler] Weekly refresh scheduled. Next run: ${nextRunDate.toUTCString()}`);

  setTimeout(function fireAndSchedule() {
    runCatalystRefresh();
    // Re-schedule every 7 days (exact 7-day interval, drift-free)
    setInterval(runCatalystRefresh, 7 * 24 * 60 * 60 * 1000);
  }, msUntilFirst);
})();

module.exports = app;
