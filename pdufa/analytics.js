/**
 * dansfera.com Analytics
 *
 * Lightweight server-side event tracking.
 * - Page views tracked via middleware on every GET request
 * - CTA clicks tracked via POST /api/analytics/event from browser
 * - Bot requests filtered automatically
 * - Admin reporting via GET /api/admin/analytics
 */

// Bot user-agent patterns to exclude from page view counts
const BOT_PATTERNS = /bot|crawler|spider|scraper|wget|curl|python|java|go-http|node-fetch|axios|okhttp|libwww|perl|ruby|php|cfnetwork|darwin|lighthouse|headless|phantomjs|prerender|semrushbot|ahrefsbot|dotbot|mj12bot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|archive\.org_bot|twitterbot|slackbot|discordbot/i;

// Scanner/probe path patterns — vulnerability scanners hitting CMS paths on a non-CMS site
const SCANNER_PATH_PATTERNS = /\.php($|\?|\/)|wp-admin|wp-login|wp-content|wp-includes|xmlrpc|cgi-bin|\/admin\.|\.asp($|\?|\/)|\.aspx($|\?|\/)|\.env($|\?)|\.git\/|actuator\/|phpmyadmin|joomla|drupal|\.cfm($|\?)|setup\.php|install\.php|config\.php/i;

function isBot(userAgent) {
  if (!userAgent) return true; // No UA = likely bot
  return BOT_PATTERNS.test(userAgent);
}

/**
 * Detect vulnerability scanner / CMS probe traffic by path.
 * dansfera.com is not a WordPress/PHP site — any hit to these paths is a scanner.
 */
function isBotPath(path) {
  if (!path) return false;
  return SCANNER_PATH_PATTERNS.test(path);
}

/**
 * Classify referrer source into a standard bucket.
 * @param {string} referrer - Raw Referer header value
 * @returns {string} 'twitter' | 'discord' | 'search' | 'direct' | 'ai' | 'other'
 */
function classifyRefSource(referrer) {
  if (!referrer) return 'direct';

  const r = referrer.toLowerCase();

  // AI assistants — check BEFORE twitter to avoid chatgpt.com matching t.co-style substrings
  if (r.includes('chatgpt.com') || r.includes('chat.openai.com') || r.includes('openai.com') || r.includes('perplexity.ai') || r.includes('claude.ai') || r.includes('gemini.google')) {
    return 'ai';
  }

  // Twitter / X
  if (r.includes('twitter.com') || r.includes('t.co') || r.includes('x.com')) {
    return 'twitter';
  }

  // Discord
  if (r.includes('discord.com') || r.includes('discord.gg') || r.includes('discordapp.com')) {
    return 'discord';
  }

  // Organic search engines
  if (
    r.includes('google.') ||
    r.includes('bing.com') ||
    r.includes('yahoo.com') ||
    r.includes('duckduckgo.com') ||
    r.includes('yandex.') ||
    r.includes('baidu.com') ||
    r.includes('search.') ||
    r.includes('ecosia.org') ||
    r.includes('brave.com/search')
  ) {
    return 'search';
  }

  // Same-site / internal links — treat as direct
  if (r.includes('dansfera.com') || r.includes('trialalpha')) {
    return 'direct';
  }

  return 'other';
}

/**
 * Normalize a URL path for consistent grouping.
 * e.g. /drug/orca-t → /drug/:slug
 * Keeps raw paths short for readable reporting.
 */
function normalizePage(path) {
  if (!path) return '/';

  // Strip query strings
  const p = path.split('?')[0].toLowerCase();

  // Normalize drug detail pages
  if (p.startsWith('/drug/')) return '/drug/:slug';

  return p.substring(0, 200); // cap length
}

/**
 * Fire-and-forget insert of an analytics event.
 * Never throws — all errors are silently logged.
 *
 * @param {object} pool - pg Pool instance
 * @param {object} opts
 *   event_type: 'page_view' | 'cta_click'
 *   page: normalized route string
 *   cta_placement: optional (for cta_click)
 *   referrer: raw Referer header (optional)
 *   userAgent: User-Agent header (optional)
 */
function track(pool, opts) {
  if (!pool) return;

  const { event_type, page, rawPath, cta_placement, referrer, userAgent } = opts;
  const botFlag = isBot(userAgent || '') || isBotPath(rawPath || page || '');
  const refSource = classifyRefSource(referrer || '');
  const rawRef = (referrer || '').substring(0, 500); // truncate to 500 chars

  // Fire and forget — don't await, don't block response
  pool.query(
    `INSERT INTO dansfera_analytics
       (event_type, page, cta_placement, ref_source, referrer, is_bot)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [event_type, page || '/', cta_placement || null, refSource, rawRef || null, botFlag]
  ).catch(err => {
    console.error('[Analytics] Insert error:', err.message);
  });
}

/**
 * Express middleware: automatically tracks page views on GET requests.
 * Attaches to pdufa/app.js. Skips API routes, static assets, health checks.
 */
function pageViewMiddleware(getPool) {
  return function trackPageView(req, res, next) {
    // Only track GET requests
    if (req.method !== 'GET') return next();

    const p = (req.path || '/').toLowerCase();

    // Skip: API routes, static assets, health, sitemap, robots, ads
    if (
      p.startsWith('/api/') ||
      p.startsWith('/css/') ||
      p.startsWith('/js/') ||
      p.startsWith('/img/') ||
      p.startsWith('/fonts/') ||
      p.startsWith('/pdufa/') ||
      p === '/health' ||
      p === '/sitemap.xml' ||
      p === '/robots.txt' ||
      p === '/ads.txt' ||
      p.endsWith('.png') ||
      p.endsWith('.jpg') ||
      p.endsWith('.ico') ||
      p.endsWith('.svg') ||
      p.endsWith('.woff') ||
      p.endsWith('.woff2') ||
      p.endsWith('.css') ||
      p.endsWith('.js') ||
      p.endsWith('.map')
    ) {
      return next();
    }

    // Track (fire-and-forget)
    const pool = getPool();
    track(pool, {
      event_type: 'page_view',
      page: normalizePage(req.path),
      rawPath: req.path, // raw path for scanner pattern detection
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
      userAgent: req.headers['user-agent'] || ''
    });

    next();
  };
}

module.exports = { track, pageViewMiddleware, classifyRefSource, normalizePage, isBot, isBotPath };
