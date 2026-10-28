# auth.md

Agent and human authentication for **SoulMetrica**.

## Audience

Humans order readings on the site and receive them in Telegram. Agents may read public catalogs; private readings require a user Telegram session.

## Registration (agent_auth)

- Protected Resource Metadata: `/.well-known/oauth-protected-resource`
- Authorization Server Metadata (includes `agent_auth`): `/.well-known/oauth-authorization-server`
- Register: `POST /api/agent/auth`
- Claim / session check: `GET /api/auth/me`
- Skill URL: this document (`/auth.md`)

### Supported identity types

1. **anonymous** — start via `POST /api/agent/auth` with `{ "type": "anonymous" }`; complete human Telegram login, then claim with session cookie.
2. **identity_assertion / telegram_login** — user completes Telegram Login on `/profile` or bot deep-link `@soulmetrica_bot`.

### Credential use

Prefer `Authorization: Bearer` when a token is issued; today production sessions are primarily HttpOnly cookies after Telegram auth (`credentials: include` same-origin).

## Human flow

1. `POST /api/orders/create` with PII + Telegram `@ник`
2. Pay via Unicorn `payUrl`
3. Receive reading in `@soulmetrica_bot`
4. Open `/profile` after Telegram login

## Related

- OpenAPI: `/openapi.json`
- API catalog: `/.well-known/api-catalog`
- Privacy: `/privacy` · Offer: `/offer`
