import { NextResponse } from 'next/server';
import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

export const dynamic = 'force-static';

/** Minimal A2A Agent Card for discovery scanners */
export function GET() {
  const card = {
    name: 'SoulMetrica',
    description:
      'Numerology readings: order flow, public prices, Telegram delivery via @soulmetrica_bot',
    url: SITE_ORIGIN + '/',
    provider: {
      organization: 'SoulMetrica / ТОО НЕЙРОКИДС',
      url: SITE_ORIGIN
    },
    version: '3.0.0',
    documentationUrl: siteUrl('/docs/api'),
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [
      {
        id: 'order-reading',
        name: 'Order a reading',
        description: 'Help a user order a SoulMetrica product',
        tags: ['commerce', 'numerology'],
        examples: ['Хочу полный разбор', 'Order love scenario reading']
      },
      {
        id: 'list-products',
        name: 'List products',
        description: 'Return product catalog',
        tags: ['catalog']
      }
    ],
    endpoints: {
      mcp: siteUrl('/api/mcp'),
      openapi: siteUrl('/openapi.json')
    }
  };

  return NextResponse.json(card, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  });
}
