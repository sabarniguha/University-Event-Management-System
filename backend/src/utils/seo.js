// Link previews (WhatsApp, Telegram, Facebook, LinkedIn) and search engines read the HTML the server sends,
// not what React draws later, so event pages get their own title, description and image here.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plain = (text, max) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}...` : t;
};

const absolute = (base, url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith('/') ? `${base}${url}` : '';
};

// Returns the index.html text with this event's tags in the <head>.
function injectEventMeta(html, event, base) {
  const title = `${event.title} | UniEvents`;
  const when = new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const description = plain(`${when} at ${event.venue}. ${event.description}`, 200);
  const image = absolute(base, event.bannerUrl);
  const url = `${base}/events/${event.id}`;
  const tags = [
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="UniEvents" />',
    `<meta property="og:title" content="${esc(event.title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(event.title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
  ].filter(Boolean).join('\n    ');
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

function sitemapXml(base, events) {
  const items = [
    { loc: `${base}/`, changefreq: 'daily' },
    { loc: `${base}/events`, changefreq: 'daily' },
    ...events.map((e) => ({ loc: `${base}/events/${e.id}`, lastmod: new Date(e.updatedAt).toISOString().slice(0, 10), changefreq: 'weekly' })),
  ];
  const body = items.map((i) => `  <url><loc>${esc(i.loc)}</loc>${i.lastmod ? `<lastmod>${i.lastmod}</lastmod>` : ''}<changefreq>${i.changefreq}</changefreq></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

module.exports = { injectEventMeta, sitemapXml, esc };
