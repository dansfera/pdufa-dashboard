const express = require('express');
const path = require('path');

const app = express();

// EJS templating — hvac-specific views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load data
const cities = require('./data/cities');
const services = require('./data/services');
const articles = require('./data/articles');

// Analytics slug
const analyticsSlug = process.env.POLSIA_ANALYTICS_SLUG || '';
const baseUrl = process.env.HVAC_BASE_URL || 'https://sunbelthvacguide.com';

function commonData() {
  return { cities, services, articles, analyticsSlug, baseUrl, ga4Id: process.env.GA4_HVAC_ID || '' };
}

// ============ PAGES ============

// Homepage
app.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'Sunbelt HVAC Guide — AC Repair & Heating Information for Sunbelt Cities',
    metaDescription: 'Expert HVAC and AC repair guides for Sunbelt cities. Local cost data, maintenance tips, repair vs replace advice, and seasonal prep for Yuma, Tulsa, Greenville, Tucson, and Kansas City.',
    canonicalUrl: '/',
    ...commonData()
  });
});

// About page
app.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About Sunbelt HVAC Guide — Trusted AC & Heating Repair Information',
    metaDescription: 'Learn about Sunbelt HVAC Guide, your trusted source for HVAC repair and maintenance information across the Sunbelt region. No contractor referrals — just honest information.',
    canonicalUrl: '/about',
    ...commonData()
  });
});

// Affiliate Disclosure page
app.get('/disclosure', (req, res) => {
  res.render('pages/disclosure', {
    title: 'Affiliate Disclosure — Sunbelt HVAC Guide',
    metaDescription: 'Affiliate disclosure for Sunbelt HVAC Guide.',
    canonicalUrl: '/hvac/disclosure/',
    ...commonData()
  });
});
app.get('/disclosure/', (req, res) => res.redirect(301, '/disclosure'));

// HVAC Sizing Calculator
app.get('/calculator', (req, res) => {
  res.render('pages/calculator', {
    title: 'Free HVAC Sizing Calculator — Find the Right Tonnage | Sunbelt HVAC Guide',
    metaDescription: 'Calculate the right AC unit size and installation cost for your home in Yuma, Tucson, Tulsa, Greenville, or Kansas City. Free, instant results — no email required.',
    canonicalUrl: '/calculator',
    ...commonData()
  });
});
app.get('/calculator/', (req, res) => res.redirect(301, '/calculator'));

// Advertise page
app.get('/advertise', (req, res) => {
  const formSuccess = req.query.success === '1';
  res.render('pages/advertise', {
    title: 'Advertise With Us — Sunbelt HVAC Guide',
    metaDescription: 'Reach local homeowners searching for AC repair and HVAC services in Yuma, Tucson, Tulsa, Greenville, and Kansas City. Banner ads, sponsored listings, and featured placements available.',
    canonicalUrl: '/hvac/advertise',
    formSuccess,
    ...commonData()
  });
});

app.post('/advertise', async (req, res) => {
  const { name, business_name, email, message } = req.body;

  if (!name || !business_name || !email || !message) {
    return res.render('pages/advertise', {
      title: 'Advertise With Us — Sunbelt HVAC Guide',
      metaDescription: 'Reach local homeowners searching for HVAC and AC repair services.',
      canonicalUrl: '/hvac/advertise',
      formError: 'All fields are required.',
      formValues: req.body,
      ...commonData()
    });
  }

  // Save to DB
  try {
    const { getPool } = require('../utils/db');
    const pool = getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO ad_submissions (site, name, business_name, email, message) VALUES ($1,$2,$3,$4,$5)`,
        ['hvac', name, business_name, email, message]
      );
    }
  } catch (err) {
    console.error('[Advertise] DB save error:', err.message);
  }

  // Send email notification
  try {
    const { sendAdInquiryEmail } = require('../utils/email');
    await sendAdInquiryEmail({ site: 'hvac', name, businessName: business_name, email, message });
  } catch (err) {
    console.error('[Advertise] Email error:', err.message);
  }

  res.redirect('/hvac/advertise?success=1');
});

// City landing pages
app.get('/:citySlug', (req, res, next) => {
  const city = cities.find(c => c.slug === req.params.citySlug);
  if (!city) return next();

  const cityArticles = articles.filter(a => a.city === city.slug);
  const cityServices = services.filter(s => s.commonIn.includes(city.slug));

  res.render('pages/city', {
    title: `HVAC & AC Repair in ${city.fullName} — Local Guide | Sunbelt HVAC Guide`,
    metaDescription: city.metaDescription,
    canonicalUrl: `/${city.slug}/`,
    city,
    cityArticles,
    cityServices,
    ...commonData()
  });
});

// Service category pages
app.get('/services/:serviceSlug', (req, res, next) => {
  const service = services.find(s => s.slug === req.params.serviceSlug);
  if (!service) return next();

  const serviceArticles = articles.filter(a => a.categories.includes(service.slug));
  const serviceCities = cities.filter(c => service.commonIn.includes(c.slug));

  res.render('pages/service', {
    title: `${service.name} — Guide, Costs & What to Expect | Sunbelt HVAC Guide`,
    metaDescription: service.description,
    canonicalUrl: `/services/${service.slug}/`,
    service,
    serviceArticles,
    serviceCities,
    ...commonData()
  });
});

// Article pages
app.get('/:citySlug/:articleSlug', (req, res, next) => {
  const article = articles.find(a => a.slug === req.params.articleSlug && a.city === req.params.citySlug);
  if (!article) return next();

  const city = cities.find(c => c.slug === article.city);
  const related = articles.filter(a => article.relatedArticles && article.relatedArticles.includes(a.slug));

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
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  xml += `  <url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;

  cities.forEach(city => {
    xml += `  <url><loc>${baseUrl}/${city.slug}/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
  });

  services.forEach(service => {
    xml += `  <url><loc>${baseUrl}/services/${service.slug}/</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
  });

  articles.forEach(article => {
    xml += `  <url><loc>${baseUrl}/${article.city}/${article.slug}/</loc><lastmod>${article.updatedDate}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
  });

  xml += `  <url><loc>${baseUrl}/calculator</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
  xml += '</urlset>';

  res.type('application/xml').send(xml);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// ads.txt — served at root of HVAC subdomain
app.get('/ads.txt', (req, res) => {
  res.type('text/plain').send('# No programmatic display advertising.\n# Amazon Associates affiliate links only.\n');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Page Not Found — Sunbelt HVAC Guide',
    metaDescription: 'The page you were looking for could not be found.',
    canonicalUrl: req.path,
    ...commonData()
  });
});

module.exports = app;
