import { NextResponse } from 'next/server';
import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    {
      resource: SITE_ORIGIN + '/',
      authorization_servers: [SITE_ORIGIN],
      scopes_supported: ['profile:read', 'readings:read', 'orders:write'],
      bearer_methods_supported: ['header'],
      resource_documentation: siteUrl('/auth.md')
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
