import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

export const metadata = {
  title: 'API — SoulMetrica',
  description: 'Документация публичного API и agent-discovery для SoulMetrica',
  alternates: { canonical: siteUrl('/docs/api') }
};

export default function ApiDocsPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '48px 20px 80px',
        fontFamily: 'Georgia, Times New Roman, serif',
        color: '#1a1820',
        lineHeight: 1.55
      }}
    >
      <p style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12, opacity: 0.7 }}>
        SoulMetrica · service-doc
      </p>
      <h1 style={{ fontSize: 36, margin: '8px 0 16px' }}>API и agent discovery</h1>
      <p>
        Базовый origin: <a href={SITE_ORIGIN}>{SITE_ORIGIN}</a>. Machine-readable описание —{' '}
        <a href="/openapi.json">openapi.json</a>. Каталог RFC 9727 —{' '}
        <a href="/.well-known/api-catalog">/.well-known/api-catalog</a>.
      </p>

      <h2 id="prices">Цены</h2>
      <pre style={{ background: '#f6f4f8', padding: 16, overflow: 'auto' }}>
        {`GET /api/admin/prices?public=1`}
      </pre>

      <h2 id="orders-create">Создание оплаты</h2>
      <pre style={{ background: '#f6f4f8', padding: 16, overflow: 'auto' }}>
        {`POST /api/orders/create
Content-Type: application/json

{
  "product": "Полный разбор",
  "addons": [],
  "sum": 30,
  "name": "Айгерим",
  "phone": "+77001112233",
  "contact": "@username",
  "meta": { "day": "15", "month": "6", "year": "1995" }
}`}
      </pre>

      <h2>Здоровье / MCP</h2>
      <ul>
        <li>
          <a href="/api/health">GET /api/health</a>
        </li>
        <li>
          <a href="/api/mcp">GET/POST /api/mcp</a> — minimal MCP JSON-RPC
        </li>
        <li>
          <a href="/.well-known/mcp/server-card.json">MCP Server Card</a>
        </li>
      </ul>

      <h2>Auth</h2>
      <p>
        См. <a href="/auth.md">/auth.md</a> и{' '}
        <a href="/.well-known/oauth-protected-resource">oauth-protected-resource</a>.
      </p>

      <p style={{ marginTop: 40 }}>
        <a href="/">← На главную</a>
      </p>
    </main>
  );
}
