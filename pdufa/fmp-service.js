/**
 * Company Financial Data Service — dansfera.com
 *
 * Data sources (in priority order):
 *   1. FMP (Financial Modeling Prep) — if FMP_API_KEY is set
 *   2. Yahoo Finance Chart API (v8) — no crumb required, reliable
 *   3. Yahoo Finance QuoteSummary (v10) — adds sector/industry/beta via crumb auth
 *
 * All data cached in fmp_company_cache PostgreSQL table (1hr TTL).
 */

const https = require('https');
const zlib = require('zlib');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── HTTP helpers ──────────────────────────────────────────────────────────

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
};

/**
 * Fetch raw HTTP response, accumulating Set-Cookie across redirects.
 * Returns { body, statusCode, headers, cookies[] }
 */
function fetchRaw(hostname, path, headers = {}, _accCookies = [], _depth = 0) {
  if (_depth > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const opts = {
      hostname,
      path,
      method: 'GET',
      headers: { ...DEFAULT_HEADERS, 'Accept': 'text/html,application/json,*/*', ...headers },
      // Yahoo Finance sends massive Set-Cookie headers that exceed Node's 16KB default
      maxHeaderSize: 65536,
    };
    const req = https.request(opts, (res) => {
      // Collect cookies from this hop
      const hopCookies = res.headers['set-cookie'] || [];
      const allCookies = [..._accCookies, ...hopCookies];

      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location || '';
        // Drain body to avoid socket hang
        res.resume();
        if (!loc) {
          return resolve({ body: '', statusCode: res.statusCode, headers: res.headers, cookies: allCookies });
        }
        try {
          const url = new URL(loc, `https://${hostname}`);
          return fetchRaw(url.hostname, url.pathname + (url.search || ''), headers, allCookies, _depth + 1)
            .then(resolve).catch(reject);
        } catch {
          return resolve({ body: '', statusCode: res.statusCode, headers: res.headers, cookies: allCookies });
        }
      }

      // Handle gzip/deflate/br compressed responses (Yahoo sometimes sends
      // compressed data regardless of Accept-Encoding: identity)
      const encoding = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (encoding === 'gzip') {
        stream = zlib.createGunzip();
        res.pipe(stream);
      } else if (encoding === 'deflate') {
        stream = zlib.createInflate();
        res.pipe(stream);
      } else if (encoding === 'br') {
        stream = zlib.createBrotliDecompress();
        res.pipe(stream);
      }

      const chunks = [];
      stream.on('data', chunk => { chunks.push(chunk); });
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ body, statusCode: res.statusCode, headers: res.headers, cookies: allCookies });
      });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function fetchJson(hostname, path, headers = {}) {
  return fetchRaw(hostname, path, headers).then(({ body }) => {
    try { return JSON.parse(body); }
    catch (e) { throw new Error(`JSON parse: ${e.message} — body: ${body.slice(0, 100)}`); }
  });
}

// Build cookie header string from accumulated Set-Cookie values
function buildCookieStr(cookies) {
  return cookies.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

// ─── Yahoo Finance crumb auth (for quoteSummary enrichment) ───────────────

const _yfAuth = { crumb: null, cookieStr: null, expiresAt: 0, failedUntil: 0 };

async function getYFAuth() {
  if (_yfAuth.crumb && _yfAuth.cookieStr && Date.now() < _yfAuth.expiresAt) {
    return _yfAuth;
  }

  // Cooldown after failure — don't retry for 10 minutes to prevent burst errors
  if (_yfAuth.failedUntil && Date.now() < _yfAuth.failedUntil) {
    return null;
  }

  try {
    // Step 1: Fetch finance.yahoo.com — follow redirects and collect ALL cookies
    const res1 = await fetchRaw('finance.yahoo.com', '/', {
      'Accept': 'text/html,application/xhtml+xml,*/*',
    });

    if (!res1.cookies.length) {
      console.warn('[FMP] No cookies from Yahoo Finance homepage');
      _yfAuth.failedUntil = Date.now() + 10 * 60 * 1000; // 10 min cooldown
      return null;
    }

    const cookieStr = buildCookieStr(res1.cookies);

    // Step 2: Fetch crumb
    const res2 = await fetchRaw('query1.finance.yahoo.com', '/v1/test/getcrumb', {
      'Cookie': cookieStr,
      'Accept': 'text/plain,*/*',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
    });

    const crumb = (res2.body || '').trim();
    if (!crumb || crumb.length < 2 || crumb === 'Unauthorized' || crumb.startsWith('<') || crumb.startsWith('{')) {
      console.warn('[FMP] Invalid YF crumb:', crumb.slice(0, 60));
      _yfAuth.failedUntil = Date.now() + 10 * 60 * 1000; // 10 min cooldown
      return null;
    }

    _yfAuth.crumb = crumb;
    _yfAuth.cookieStr = cookieStr;
    _yfAuth.expiresAt = Date.now() + 50 * 60 * 1000; // 50 min
    _yfAuth.failedUntil = 0; // clear cooldown on success
    console.log('[FMP] Yahoo Finance crumb acquired');
    return _yfAuth;
  } catch (e) {
    console.error('[FMP] YF auth error:', e.message);
    _yfAuth.failedUntil = Date.now() + 10 * 60 * 1000; // 10 min cooldown
    return null;
  }
}

// ─── Yahoo Finance Chart API (primary — no crumb required) ────────────────

async function fetchFromYahooChart(symbol) {
  // v8/finance/chart with 1y range gives us: price, 52-week range, volume, market cap
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false`;

  const reqHeaders = {
    'Accept': 'application/json',
    'Referer': `https://finance.yahoo.com/quote/${symbol}/`,
    'Origin': 'https://finance.yahoo.com',
  };

  let raw = null;
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      raw = await fetchJson(host, path, reqHeaders);
      if (raw?.chart?.result?.[0]) break;
    } catch (e) {
      console.warn(`[FMP] Chart fetch error (${host}) for ${symbol}:`, e.message);
    }
  }

  const chartResult = raw?.chart?.result?.[0];
  if (!chartResult) {
    const err = raw?.chart?.error;
    if (err) console.warn('[FMP] Chart API error for', symbol, ':', JSON.stringify(err).slice(0, 100));
    else console.warn('[FMP] No chart result for', symbol, '— raw:', JSON.stringify(raw || {}).slice(0, 200));
    return null;
  }

  const meta = chartResult.meta || {};
  const quotes = chartResult.indicators?.quote?.[0] || {};

  const regularPrice = meta.regularMarketPrice ?? null;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? null;

  // 52-week range from the 1y range of data
  const highs = (quotes.high || []).filter(v => v != null);
  const lows = (quotes.low || []).filter(v => v != null);
  const yearHigh = highs.length > 0 ? Math.max(...highs) : null;
  const yearLow = lows.length > 0 ? Math.min(...lows) : null;

  let change = null, changesPercentage = null;
  if (regularPrice != null && prevClose != null && prevClose !== 0) {
    change = regularPrice - prevClose;
    changesPercentage = Number(((change / prevClose) * 100).toFixed(2));
  }

  return {
    ticker: symbol,
    source: 'yahoo_chart',
    companyName: meta.shortName || meta.longName || null,
    price: regularPrice,
    change,
    changesPercentage,
    dayLow: meta.regularMarketDayLow ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    yearHigh,
    yearLow,
    marketCap: meta.marketCap ?? null,
    avgVolume: meta.averageDailyVolume3Month ?? meta.averageDailyVolume10Day ?? null,
    volume: meta.regularMarketVolume ?? null,
    sharesOutstanding: null,
    floatShares: null,
    beta: null,
    sector: null,
    industry: null,
    exchange: meta.exchangeName || meta.fullExchangeName || null,
    currency: meta.currency || 'USD',
    image: null,
    website: null,
    fetchedAt: new Date().toISOString()
  };
}

// ─── Yahoo Finance QuoteSummary (enrichment — requires crumb) ─────────────

async function enrichWithQuoteSummary(symbol, baseData) {
  const auth = await getYFAuth();
  if (!auth) return baseData; // no crumb → return base data as-is

  const crumbParam = `&crumb=${encodeURIComponent(auth.crumb)}`;
  const modules = 'summaryProfile,defaultKeyStatistics,summaryDetail';
  const path = `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&formatted=false${crumbParam}`;
  const reqHeaders = {
    'Accept': 'application/json',
    'Cookie': auth.cookieStr,
    'Referer': `https://finance.yahoo.com/quote/${symbol}/`,
    'Origin': 'https://finance.yahoo.com',
  };

  let raw = null;
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      raw = await fetchJson(host, path, reqHeaders);
      if (raw?.quoteSummary?.result?.[0]) break;
    } catch { /* try next */ }
  }

  const result = raw?.quoteSummary?.result?.[0];
  if (!result) {
    if (raw?.quoteSummary?.error) {
      console.warn('[FMP] QuoteSummary error for', symbol, '— resetting crumb');
      _yfAuth.expiresAt = 0; // force re-auth next time
    }
    return baseData;
  }

  const profile = result.summaryProfile || {};
  const keyStats = result.defaultKeyStatistics || {};
  const summary = result.summaryDetail || {};

  return {
    ...baseData,
    source: 'yahoo',
    sharesOutstanding: keyStats.sharesOutstanding ?? null,
    floatShares: keyStats.floatShares ?? null,
    beta: summary.beta ?? keyStats.beta ?? null,
    sector: profile.sector || null,
    industry: profile.industry || null,
    website: profile.website || null,
    // Update 52-week from summaryDetail if available (more precise)
    yearHigh: summary.fiftyTwoWeekHigh ?? baseData.yearHigh,
    yearLow: summary.fiftyTwoWeekLow ?? baseData.yearLow,
    avgVolume: summary.averageVolume ?? baseData.avgVolume,
  };
}

// ─── FMP data fetcher ──────────────────────────────────────────────────────

async function fetchFromFMP(symbol, apiKey) {
  const [profileRes, quoteRes] = await Promise.all([
    fetchJson('financialmodelingprep.com', `/api/v3/profile/${symbol}?apikey=${apiKey}`),
    fetchJson('financialmodelingprep.com', `/api/v3/quote/${symbol}?apikey=${apiKey}`)
  ]);

  const p = Array.isArray(profileRes) ? profileRes[0] : profileRes;
  const q = Array.isArray(quoteRes) ? quoteRes[0] : quoteRes;

  if (!p || !q || p['Error Message'] || !p.symbol) return null;

  return {
    ticker: symbol,
    source: 'fmp',
    companyName: p.companyName || null,
    price: q.price ?? null,
    change: q.change ?? null,
    changesPercentage: q.changesPercentage ?? null,
    dayLow: q.dayLow ?? null,
    dayHigh: q.dayHigh ?? null,
    yearHigh: q.yearHigh ?? null,
    yearLow: q.yearLow ?? null,
    marketCap: p.mktCap || q.marketCap || null,
    avgVolume: q.avgVolume || p.volAvg || null,
    volume: q.volume ?? null,
    sharesOutstanding: q.sharesOutstanding ?? null,
    floatShares: p.floatShares ?? null,
    beta: p.beta ?? null,
    sector: p.sector || null,
    industry: p.industry || null,
    exchange: p.exchangeShortName || p.exchange || null,
    currency: p.currency || 'USD',
    image: p.image || null,
    website: p.website || null,
    fetchedAt: new Date().toISOString()
  };
}

// ─── Format helpers ────────────────────────────────────────────────────────

function formatMarketCap(val) {
  if (!val || isNaN(val)) return 'N/A';
  const n = Number(val);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatVolume(val) {
  if (!val || isNaN(val)) return 'N/A';
  const n = Number(val);
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatPrice(val, currency) {
  if (val == null || isNaN(val)) return 'N/A';
  const prefix = currency === 'USD' ? '$' : (currency || '');
  return `${prefix}${Number(val).toFixed(2)}`;
}

// ─── Public API ────────────────────────────────────────────────────────────

async function getCompanyData(ticker, pool) {
  if (!ticker) return null;

  const symbol = ticker.replace(/^\$/, '').toUpperCase().trim();
  if (!symbol || symbol.length > 12) return null;

  // 1. Try cache
  if (pool) {
    try {
      const cached = await pool.query(
        `SELECT data, cached_at FROM fmp_company_cache WHERE ticker = $1`,
        [symbol]
      );
      if (cached.rows.length) {
        const ageMs = Date.now() - new Date(cached.rows[0].cached_at).getTime();
        if (ageMs < CACHE_TTL_MS) return cached.rows[0].data;
      }
    } catch (e) {
      console.error('[FMP] Cache read error:', e.message);
    }
  }

  // 2. Fetch: FMP → Yahoo Chart → QuoteSummary enrichment
  let data = null;

  if (process.env.FMP_API_KEY) {
    try {
      data = await fetchFromFMP(symbol, process.env.FMP_API_KEY);
      if (data) console.log('[FMP] Fetched', symbol, 'from FMP');
    } catch (e) {
      console.error('[FMP] FMP error for', symbol, ':', e.message);
    }
  }

  if (!data) {
    console.log('[FMP] Attempting Yahoo Chart API for', symbol);
    try {
      data = await fetchFromYahooChart(symbol);
      if (data) {
        console.log('[FMP] Fetched', symbol, 'from Yahoo Chart API');
        // Try to enrich with sector/industry/beta via crumb-based quoteSummary
        data = await enrichWithQuoteSummary(symbol, data);
      } else {
        console.warn('[FMP] Yahoo Chart returned null for', symbol);
      }
    } catch (e) {
      console.error('[FMP] Yahoo error for', symbol, ':', e.message);
    }
  }

  if (!data) {
    console.warn('[FMP] No data found for ticker:', symbol);
    return null;
  }

  // 3. Write to cache
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO fmp_company_cache (ticker, data, cached_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (ticker) DO UPDATE SET data = $2, cached_at = NOW()`,
        [symbol, JSON.stringify(data)]
      );
    } catch (e) {
      console.error('[FMP] Cache write error:', e.message);
    }
  }

  return data;
}

module.exports = { getCompanyData, formatMarketCap, formatVolume, formatPrice };
