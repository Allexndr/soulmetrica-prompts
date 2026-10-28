import { NextResponse } from 'next/server';
import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

export const dynamic = 'force-static';

function asMetadata() {
  return {
    issuer: SITE_ORIGIN,
    authorization_endpoint: siteUrl('/profile'),
    token_endpoint: siteUrl('/api/auth/tg-session'),
    registration_endpoint: siteUrl('/api/agent/auth'),
    revocation_endpoint: siteUrl('/api/auth/logout'),
    jwks_uri: siteUrl('/.well-known/jwks.json'),
    response_types_supported: ['code'],
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
      'urn:ietf:params:oauth:grant-type:jwt-bearer'
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['none'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['profile:read', 'readings:read', 'orders:write'],
    service_documentation: siteUrl('/auth.md'),
    ui_locales_supported: ['ru', 'en'],
    agent_auth: {
      skill: siteUrl('/auth.md'),
      register_uri: siteUrl('/api/agent/auth'),
      identity_endpoint: siteUrl('/api/agent/auth'),
      claim_uri: siteUrl('/api/auth/me'),
      identity_types_supported: ['anonymous', 'identity_assertion'],
      anonymous: {
        credential_types_supported: ['session_cookie'],
        claim_uri: siteUrl('/api/auth/me')
      },
      identity_assertion: {
        assertion_types_supported: ['telegram_login', 'verified_email'],
        credential_types_supported: ['session_cookie'],
        claim_uri: siteUrl('/api/auth/me')
      },
      events_supported: []
    }
  };
}

export function GET() {
  return NextResponse.json(asMetadata(), {
    headers: { 'Cache-Control': 'public, max-age=300' }
  });
}
