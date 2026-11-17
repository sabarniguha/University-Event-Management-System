const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const prisma = require('../utils/prismaClient');
const asyncHandler = require('../utils/asyncHandler');
const { appUrl } = require('../utils/mailer');
const { injectEventMeta, sitemapXml } = require('../utils/seo');

// Public address comes from configuration, never from request headers.
router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const events = await prisma.event.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, updatedAt: true }, orderBy: { startsAt: 'desc' }, take: 5000 });
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemapXml(appUrl(), events));
}));

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /organizer\nDisallow: /student\n\nSitemap: ${appUrl()}/sitemap.xml\n`);
});

// Event pages: the same single-page app, with this event's preview tags added. Any problem falls through to the plain app.
function eventPage(dist) {
  let template = null;
  return asyncHandler(async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return next();
    try {
      if (!template) template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
      const event = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true, description: true, venue: true, startsAt: true, bannerUrl: true, status: true } });
      if (!event || event.status !== 'PUBLISHED') return next();
      return res.type('html').set('Cache-Control', 'public, max-age=300').send(injectEventMeta(template, event, appUrl()));
    } catch (e) {
      console.error('[seo] preview failed, serving plain page:', e.message);
      return next();
    }
  });
}

module.exports = { router, eventPage };
