import { NextResponse } from 'next/server';
import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

export const dynamic = 'force-static';

export function GET() {
  const card = {
    name: 'SoulMetrica',
    description:
      'Numerology readings for SoulMetrica — order flow, prices, Telegram delivery',
    version: '3.0.0',
    url: SITE_ORIGIN + '/',
    documentationUrl: siteUrl('/docs/api'),
    provider: {
      organization: 'SoulMetrica',
      url: SITE_ORIGIN
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain', 'application/json'],
    supportedInterfaces: [
      {
        url: siteUrl('/api/mcp'),
        protocol: 'MCP',
        transport: 'JSONRPC'
      },
      {
        url: siteUrl('/openapi.json'),
        protocol: 'HTTP',
        transport: 'REST'
      }
    ],
    skills: [
      {
        id: 'order-reading',
        name: 'Order a reading',
        description: 'Help a user order a SoulMetrica numerology product',
        tags: ['commerce', 'numerology'],
        examples: ['Хочу полный разбор']
      },
      {
        id: 'list-products',
        name: 'List products',
        description: 'Return the public product catalog',
        tags: ['catalog'],
        examples: ['Какие разборы есть?']
      }
    ]
  };

  return NextResponse.json(card, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  });
}
