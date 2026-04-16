const express = require('express');
const path = require('path');
const fs = require('fs');
// deploy: 2026-03-26T07:30:00Z — force deploy: search bar + Adsterra ads fix (task #488842, attempt 7)

const app = express();
const port = process.env.PORT || 3000;

// EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// CRITICAL: dansfera.com ads.txt must be served BEFORE static files.
// express.static('public/') would otherwise serve the pest-guide ads.txt
// ("no programmatic advertising") which blocks Adsterra from serving ads.
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host.includes('dansfera') && req.path === '/ads.txt') {
    return res.type('text/plain').send('adsterra.com, 28967138, DIRECT\n');
  }
  next();
});

// Static files — pest guide
app.use(express.static(path.join(__dirname, 'public')));
// Static files — restoration guide (CSS accessible at /restoration/css/...)
app.use('/restoration', express.static(path.join(__dirname, 'restoration/public')));
// Static files — HVAC guide (CSS accessible at /hvac/css/...)
app.use('/hvac', express.static(path.join(__dirname, 'hvac/public')));
// Static files — PDUFA tracker (CSS accessible at /pdufa/css/...)
app.use('/pdufa', express.static(path.join(__dirname, 'pdufa/public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ RESTORATION GUIDE ============
// Mount the restoration Express sub-app under /restoration
const restorationApp = require('./restoration/app');
app.use('/restoration', restorationApp);

// ============ HVAC GUIDE ============
// Mount the HVAC Express sub-app under /hvac
const hvacApp = require('./hvac/app');
app.use('/hvac', hvacApp);

// ============ PDUFA TRACKER (dansfera.com) ============
// Mount the PDUFA Express sub-app under /pdufa
// Set pdufaBase so templates know the path prefix for internal links
const pdufaApp = require('./pdufa/app');
app.use('/pdufa', (req, res, next) => {
  req.pdufaBase = '/pdufa';
  next();
}, pdufaApp);

// Hostname-based redirects:
// sunbeltrestorationguide.com → /restoration/
// sunbelthvacguide.com → /hvac/
// dansfera.com → /pdufa (serve PDUFA app at root for custom domain)
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host.includes('restoration') && req.path === '/') {
    return res.redirect(301, '/restoration/');
  }
  if (host.includes('hvac') && req.path === '/') {
    return res.redirect(301, '/hvac/');
  }
  // ads.txt: serve HVAC-specific ads.txt for HVAC domain
  if (host.includes('hvac') && req.path === '/ads.txt') {
    return res.type('text/plain').send('# No programmatic display advertising.\n# Amazon Associates affiliate links only.\n');
  }
  // dansfera.com: route all requests through the PDUFA app
  if (host.includes('dansfera')) {
    req.pdufaBase = '';
    return pdufaApp(req, res, next);
  }
  next();
});

// Load data
const cities = require('./data/cities');
const pests = require('./data/pests');
const articles = require('./data/articles');

// Helper: get analytics slug
const analyticsSlug = process.env.POLSIA_ANALYTICS_SLUG || '';

// Common template data
function commonData() {
  return { cities, pests, articles, analyticsSlug, ga4Id: process.env.GA4_PEST_ID || '' };
}

// Health check (required for Render)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ============ PAGES ============

// Homepage
app.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'Sunbelt Pest Guide — Your Complete Pest Control Resource',
    metaDescription: 'Expert pest control guides for Sunbelt cities. Find local pest info, treatment costs, seasonal tips, and prevention strategies for Yuma, Tulsa, Greenville, Tucson, and Kansas City.',
    canonicalUrl: '/',
    ...commonData()
  });
});

// About page
app.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About Sunbelt Pest Guide — Trusted Pest Control Information',
    metaDescription: 'Learn about Sunbelt Pest Guide, your trusted source for pest control information across the Sunbelt region. Expert guides, local insights, and practical prevention tips.',
    canonicalUrl: '/about',
    ...commonData()
  });
});

// Affiliate Disclosure page
app.get('/disclosure', (req, res) => {
  res.render('pages/disclosure', {
    title: 'Affiliate Disclosure — Sunbelt Pest Guide',
    metaDescription: 'Affiliate disclosure for Sunbelt Pest Guide.',
    canonicalUrl: '/disclosure/',
    ...commonData()
  });
});
app.get('/disclosure/', (req, res) => res.redirect(301, '/disclosure'));

// Advertise page
app.get('/advertise', (req, res) => {
  const formSuccess = req.query.success === '1';
  res.render('pages/advertise', {
    title: 'Advertise With Us — Sunbelt Pest Guide',
    metaDescription: 'Reach local homeowners searching for pest control in Yuma, Tucson, Tulsa, Greenville, and Kansas City. Banner ads, sponsored listings, and featured placements available.',
    canonicalUrl: '/advertise',
    formSuccess,
    ...commonData()
  });
});

app.post('/advertise', async (req, res) => {
  const { name, business_name, email, message } = req.body;

  if (!name || !business_name || !email || !message) {
    return res.render('pages/advertise', {
      title: 'Advertise With Us — Sunbelt Pest Guide',
      metaDescription: 'Reach local homeowners searching for pest control services.',
      canonicalUrl: '/advertise',
      formError: 'All fields are required.',
      formValues: req.body,
      ...commonData()
    });
  }

  // Save to DB
  try {
    const { getPool } = require('./utils/db');
    const pool = getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO ad_submissions (site, name, business_name, email, message) VALUES ($1,$2,$3,$4,$5)`,
        ['pest', name, business_name, email, message]
      );
    }
  } catch (err) {
    console.error('[Advertise] DB save error:', err.message);
  }

  // Send email notification
  try {
    const { sendAdInquiryEmail } = require('./utils/email');
    await sendAdInquiryEmail({ site: 'pest', name, businessName: business_name, email, message });
  } catch (err) {
    console.error('[Advertise] Email error:', err.message);
  }

  res.redirect('/advertise?success=1');
});

// City landing pages
app.get('/:citySlug', (req, res, next) => {
  const city = cities.find(c => c.slug === req.params.citySlug);
  if (!city) return next();

  const cityArticles = articles.filter(a => a.city === city.slug);
  const cityPests = pests.filter(p => p.commonIn.includes(city.slug));

  res.render('pages/city', {
    title: `Pest Control in ${city.fullName} — Local Guide | Sunbelt Pest Guide`,
    metaDescription: city.metaDescription,
    canonicalUrl: `/${city.slug}/`,
    city,
    cityArticles,
    cityPests,
    ...commonData()
  });
});

// Pest category pages
app.get('/pests/:pestSlug', (req, res, next) => {
  const pest = pests.find(p => p.slug === req.params.pestSlug);
  if (!pest) return next();

  const pestArticles = articles.filter(a => a.categories.includes(pest.slug));
  const pestCities = cities.filter(c => pest.commonIn.includes(c.slug));

  res.render('pages/pest', {
    title: `${pest.name} Control Guide — Prevention & Treatment | Sunbelt Pest Guide`,
    metaDescription: pest.description,
    canonicalUrl: `/pests/${pest.slug}/`,
    pest,
    pestArticles,
    pestCities,
    ...commonData()
  });
});

// Article pages
app.get('/:citySlug/:articleSlug', (req, res, next) => {
  const article = articles.find(a => a.slug === req.params.articleSlug && a.city === req.params.citySlug);
  if (!article) return next();

  const city = cities.find(c => c.slug === article.city);
  const related = articles.filter(a => article.relatedArticles.includes(a.slug));

  res.render('pages/article', {
    title: article.metaTitle,
    metaDescription: article.metaDescription,
    canonicalUrl: `/${article.city}/${article.slug}/`,
    article,
    city,
    related,
    ...commonData()
  });
});

// Sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://sunbeltpestguide.com';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Homepage
  xml += `  <url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;

  // City pages
  cities.forEach(city => {
    xml += `  <url><loc>${baseUrl}/${city.slug}/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
  });

  // Pest category pages
  pests.forEach(pest => {
    xml += `  <url><loc>${baseUrl}/pests/${pest.slug}/</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
  });

  // Articles
  articles.forEach(article => {
    xml += `  <url><loc>${baseUrl}/${article.city}/${article.slug}/</loc><lastmod>${article.updatedDate}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
  });

  // About
  xml += `  <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;

  xml += '</urlset>';
  res.type('application/xml').send(xml);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || 'https://sunbeltpestguide.com';
  res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// ============ ADMIN: MANUAL FDA OUTCOME PULL TRIGGER ============
app.post('/api/admin/fda-pull', (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  const expected = process.env.ADMIN_SECRET || 'polsia-fda-pull-2026';
  if (secret !== expected) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  res.json({ success: true, message: 'FDA outcome pull triggered. Check server logs for progress.' });
  // Run after response is sent
  setImmediate(() => {
    try {
      const { run } = require('./scripts/fda-outcome-pull');
      run()
        .then(() => console.log('[FDA Admin Trigger] Pull completed successfully.'))
        .catch(err => console.error('[FDA Admin Trigger] Pull failed:', err.message));
    } catch (err) {
      console.error('[FDA Admin Trigger] Could not load fda-outcome-pull script:', err.message);
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found — Sunbelt Pest Guide',
    metaDescription: 'The page you were looking for could not be found.',
    canonicalUrl: req.path,
    ...commonData()
  });
});

app.listen(port, () => {
  console.log(`Sunbelt Pest Guide running on port ${port}`);
});

// ============ WEEKLY FDA OUTCOME PULL (Mondays 08:00 UTC) ============
// Automatically pulls FDA approval/CRL decisions for past PDUFA dates.
// Only updates entries that don't already have an outcome_result set.
// Runs weekly so we don't overwrite manually-entered corrections.

(function scheduleWeeklyFDAOutcomePull() {
  if (!process.env.DATABASE_URL) {
    console.log('[FDA Scheduler] No DATABASE_URL — skipping weekly FDA outcome pull scheduler.');
    return;
  }

  /**
   * Calculate milliseconds until the next Monday at 08:00 UTC.
   * If today is Monday and it's before 08:00 UTC, fires today.
   */
  function msUntilNextMondayAt8UTC() {
    const now = new Date();
    // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7 || 7;

    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      8, 0, 0, 0   // 08:00:00.000 UTC
    ));

    // If we computed "today" but it's already past 08:00, push to next Monday
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 7);
    }

    return next.getTime() - now.getTime();
  }

  function runFDAOutcomePull() {
    console.log('[FDA Scheduler] Running weekly FDA outcome pull...');
    try {
      const { run } = require('./scripts/fda-outcome-pull');
      run().catch(err => {
        console.error('[FDA Scheduler] Pull failed:', err.message);
      });
    } catch (err) {
      console.error('[FDA Scheduler] Could not load fda-outcome-pull script:', err.message);
    }
  }

  // ── ONE-TIME IMMEDIATE PULL on startup (backfill trigger) ──
  // Runs once 5 seconds after boot to backfill any past PDUFA dates
  // that still have NULL outcome_result. Safe to leave in: the pull
  // script skips rows that already have outcomes set.
  if (process.env.FDA_PULL_ON_STARTUP === 'true') {
    setTimeout(() => {
      console.log('[FDA Startup] Running one-time FDA outcome backfill...');
      runFDAOutcomePull();
    }, 5000);
  }

  const msUntilFirst = msUntilNextMondayAt8UTC();
  const nextRunDate = new Date(Date.now() + msUntilFirst);
  console.log(`[FDA Scheduler] Weekly FDA outcome pull scheduled. Next run: ${nextRunDate.toUTCString()}`);

  setTimeout(function fireAndSchedule() {
    runFDAOutcomePull();
    // Re-schedule every 7 days (exact interval keeps it drift-free)
    setInterval(runFDAOutcomePull, 7 * 24 * 60 * 60 * 1000);
  }, msUntilFirst);
})();
