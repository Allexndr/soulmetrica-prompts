import { NextResponse } from 'next/server';
import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export function GET() {
  const body = {
    linkset: [
      {
        anchor: siteUrl('/api/'),
        'service-desc': [
          {
            href: siteUrl('/openapi.json'),
            type: 'application/json'
          }
        ],
        'service-doc': [
          {
            href: siteUrl('/docs/api'),
            type: 'text/html'
          }
        ],
        status: [
          {
            href: siteUrl('/api/health'),
            type: 'application/json'
          }
        ]
      },
      {
        anchor: siteUrl('/api/orders/create'),
        'service-desc': [
          {
            href: siteUrl('/openapi.json#/paths/~1api~1orders~1create'),
            type: 'application/json'
          }
        ],
        'service-doc': [
          {
            href: siteUrl('/docs/api#orders-create'),
            type: 'text/html'
          }
        ]
      },
      {
        anchor: siteUrl('/api/admin/prices'),
        'service-desc': [
          {
            href: siteUrl('/openapi.json#/paths/~1api~1admin~1prices'),
            type: 'application/json'
          }
        ],
        'service-doc': [
          {
            href: siteUrl('/docs/api#prices'),
            type: 'text/html'
          }
        ]
      }
    ],
    meta: {
      title: 'SoulMetrica API Catalog',
      publisher: SITE_ORIGIN,
      generated: new Date().toISOString().slice(0, 10)
    }
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
