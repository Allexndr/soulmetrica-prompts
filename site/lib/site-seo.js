const SITE = (process.env.SITE_URL || 'https://soulmetrica.com').replace(/\/$/, '');

export const SITE_ORIGIN = SITE || 'https://soulmetrica.com';

export const PUBLIC_PATHS = [
  { path: '/', changefreq: 'weekly', priority: 1 },
  { path: '/offer', changefreq: 'monthly', priority: 0.6 },
  { path: '/privacy', changefreq: 'monthly', priority: 0.5 },
  { path: '/docs/api', changefreq: 'monthly', priority: 0.5 },
  { path: '/llms.txt', changefreq: 'weekly', priority: 0.7 },
  { path: '/auth.md', changefreq: 'monthly', priority: 0.3 }
];

export function siteUrl(pathname) {
  if (!pathname || pathname === '/') return SITE_ORIGIN + '/';
  return SITE_ORIGIN + (pathname.charAt(0) === '/' ? pathname : '/' + pathname);
}

export function linkHeaderValue() {
  return [
    '<' + siteUrl('/.well-known/api-catalog') + '>; rel="api-catalog"',
    '<' + siteUrl('/llms.txt') + '>; rel="describedby"; type="text/plain"',
    '<' + siteUrl('/openapi.json') + '>; rel="service-desc"; type="application/json"',
    '<' + siteUrl('/docs/api') + '>; rel="service-doc"',
    '<' + siteUrl('/sitemap.xml') + '>; rel="index"; type="application/xml"',
    '<' + siteUrl('/.well-known/agent-skills/index.json') + '>; rel="related"; type="application/json"',
    '<' + siteUrl('/.well-known/mcp/server-card.json') + '>; rel="related"; type="application/json"',
    '<' + siteUrl('/auth.md') + '>; rel="related"; type="text/markdown"'
  ].join(', ');
}
