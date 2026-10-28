# SoulMetrica

Next.js 15 (App Router) + `pages/api` serverless + Supabase + Vercel.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Structure

| Path | Role |
|------|------|
| `app/` | React pages (App Router) |
| `pages/api/` | HTTP API (payments, auth, admin, Telegram) |
| `lib/` | Server business logic |
| `components/` | React components |
| `public/` | Static assets, CSS, legacy browser JS |
| `content/` | HTML fragments during UI→React migration |

## Notes

- Production framework preset must be **Next.js** (not “Other”).
- Old `*.html` URLs redirect to `/`, `/profile`, `/admin`, etc.
- Landing/profile/admin still use `LegacyShell` + `public/js/*` while we port UI fully into React.
