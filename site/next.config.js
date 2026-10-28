/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@sparticuz/chromium',
    'puppeteer-core',
    'pdfkit',
    '@node-rs/argon2'
  ],
  // Keep markdown prompts for serverless fs.readFileSync (Pages + App routes).
  outputFileTracingIncludes: {
    '/*': ['./lib/prompts/**/*'],
    '/api/**/*': ['./lib/prompts/**/*'],
    '/pages/api/**/*': ['./lib/prompts/**/*']
  },
  async headers() {
    const link =
      '</.well-known/api-catalog>; rel="api-catalog", ' +
      '</llms.txt>; rel="describedby"; type="text/plain", ' +
      '</openapi.json>; rel="service-desc"; type="application/json", ' +
      '</docs/api>; rel="service-doc", ' +
      '</sitemap.xml>; rel="index"; type="application/xml", ' +
      '</.well-known/agent-skills/index.json>; rel="related"; type="application/json", ' +
      '</.well-known/mcp/server-card.json>; rel="related"; type="application/json", ' +
      '</.well-known/agent.json>; rel="related"; type="application/json", ' +
      '</auth.md>; rel="related"; type="text/markdown"';

    return [
      {
        source: '/',
        headers: [
          { key: 'Link', value: link },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'payment=(), geolocation=()' }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'payment=(), geolocation=()' }
        ]
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }]
      },
      {
        source: '/llms.txt',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }]
      },
      {
        source: '/auth.md',
        headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }]
      }
    ];
  },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/profile.html', destination: '/profile', permanent: true },
      { source: '/admin.html', destination: '/admin', permanent: true },
      { source: '/reading.html', destination: '/reading', permanent: true },
      { source: '/offer.html', destination: '/offer', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true }
    ];
  },
  async rewrites() {
    return [
      { source: '/pay-success.html', destination: '/api/pay-success' },
      { source: '/pay-fail.html', destination: '/api/pay-fail' }
    ];
  }
};

module.exports = nextConfig;
