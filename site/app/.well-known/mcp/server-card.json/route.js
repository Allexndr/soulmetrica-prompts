import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site-seo';

export const dynamic = 'force-static';

export function GET() {
  const card = {
    $schema: 'https://static.modelcontextprotocol.io/schemas/server-card/v1.json',
    serverInfo: {
      name: 'soulmetrica',
      title: 'SoulMetrica',
      version: '3.0.0',
      description:
        'Numerology readings order flow, public prices, and docs for SoulMetrica.'
    },
    transport: {
      type: 'streamable-http',
      endpoint: siteUrl('/api/mcp')
    },
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false, subscribe: false },
      prompts: { listChanged: false }
    },
    tools: [
      {
        name: 'list_products',
        description: 'List SoulMetrica product names and public prices'
      },
      {
        name: 'get_site_summary',
        description: 'Short markdown summary of the service for citations'
      }
    ],
    documentation: siteUrl('/docs/api'),
    icons: []
  };

  return NextResponse.json(card, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  });
}
