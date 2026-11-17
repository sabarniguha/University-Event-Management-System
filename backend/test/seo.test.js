const test = require('node:test');
const assert = require('node:assert');
const { injectEventMeta, sitemapXml } = require('../src/utils/seo');

const html = '<html><head><meta name="description" content="old" /><title>UniEvents</title></head><body></body></html>';
const event = { id: 7, title: 'Tech <Fest> "26"', description: 'Line one.\n\nLine two', venue: 'Main Hall', startsAt: '2026-12-01T10:00:00Z', bannerUrl: '/api/media/3' };

test('event meta tags are escaped, absolute and replace the old description', () => {
  const out = injectEventMeta(html, event, 'https://uni.example.com');
  assert.ok(out.includes('<title>Tech &lt;Fest&gt; &quot;26&quot; | UniEvents</title>'));
  assert.ok(out.includes('property="og:image" content="https://uni.example.com/api/media/3"'));
  assert.ok(out.includes('property="og:url" content="https://uni.example.com/events/7"'));
  assert.strictEqual((out.match(/name="description"/g) || []).length, 1);
  assert.ok(!out.includes('content="old"'));
});

test('no image means a small card and no og:image', () => {
  const out = injectEventMeta(html, { ...event, bannerUrl: null }, 'https://x.io');
  assert.ok(out.includes('summary"') && !out.includes('og:image'));
});

test('sitemap lists the home page, events page and each event', () => {
  const xml = sitemapXml('https://x.io', [{ id: 7, updatedAt: '2026-11-01T00:00:00Z' }]);
  assert.ok(xml.includes('<loc>https://x.io/events/7</loc>') && xml.includes('<lastmod>2026-11-01</lastmod>') && xml.includes('<loc>https://x.io/events</loc>'));
});
