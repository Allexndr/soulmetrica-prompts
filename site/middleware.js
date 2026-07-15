import { NextResponse } from 'next/server';

const PAGE_MARKDOWN = {
  '/': `# SoulMetrica

Персональные нумерологические разборы с доставкой в Telegram.

- Сайт: https://soulmetrica.com
- Бот: https://t.me/soulmetrica_bot
- Документы для агентов: [/llms.txt](https://soulmetrica.com/llms.txt), [/auth.md](https://soulmetrica.com/auth.md), [/docs/api](https://soulmetrica.com/docs/api)

## Продукты

Полный разбор · Сценарий любви · Денежный код · Прогноз 2026 · Реализация · Скрытые блоки · Совместимость пары · Число судьбы

## Заказать

Открой форму заказа на главной или вызови WebMCP tool \`open_order\`.
`,
  '/offer': `# Публичная оферта — SoulMetrica

Полный HTML-текст: https://soulmetrica.com/offer

Юрлицо: ТОО «НЕЙРОКИДС», БИН 260540017173.
`,
  '/privacy': `# Политика конфиденциальности — SoulMetrica

Полный HTML-текст: https://soulmetrica.com/privacy

Обработка ПДн для оформления разбора и доставки в Telegram.
`,
  '/docs/api': `# SoulMetrica API

- OpenAPI: https://soulmetrica.com/openapi.json
- Catalog: https://soulmetrica.com/.well-known/api-catalog
- Health: https://soulmetrica.com/api/health
- Create order: POST https://soulmetrica.com/api/orders/create
- Auth: https://soulmetrica.com/auth.md
`
};

function prefersMarkdown(accept) {
  if (!accept) return false;
  const parts = accept.split(',').map((p) => p.trim().toLowerCase());
  let md = -1;
  let html = -1;
  parts.forEach((part, i) => {
    if (part.startsWith('text/markdown')) md = i;
    if (part.startsWith('text/html')) html = i;
  });
  if (md < 0) return false;
  if (html < 0) return true;
  return md <= html;
}

function countTokens(text) {
  return Math.max(1, Math.ceil(String(text).length / 4));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/auth.md' || pathname === '/llms.txt' || pathname === '/llms-full.txt') {
    return NextResponse.next();
  }

  if (!prefersMarkdown(request.headers.get('accept') || '')) {
    return NextResponse.next();
  }

  const md = PAGE_MARKDOWN[pathname];
  if (!md) return NextResponse.next();

  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Markdown-Tokens': String(countTokens(md)),
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

export const config = {
  matcher: ['/', '/offer', '/privacy', '/docs/api']
};
