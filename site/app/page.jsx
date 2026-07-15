import fs from 'fs';
import path from 'path';
import { LegacyShell } from '@/components/legacy/LegacyShell';
import { siteUrl } from '@/lib/site-seo';

export const metadata = {
  title: 'Твоя карта личности',
  description:
    'Дневник про нумерологию и выбор. Персональные разборы SoulMetrica — полный разбор, любовь, деньги, прогноз. Доставка в Telegram.',
  alternates: { canonical: siteUrl('/') }
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Что такое SoulMetrica?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SoulMetrica — сервис персональных нумерологических разборов по дате рождения с оплатой онлайн и доставкой в Telegram.'
      }
    },
    {
      '@type': 'Question',
      name: 'Как получить разбор?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Выбери продукт на сайте, укажи имя, дату рождения, телефон и Telegram @ник, оплати через Unicorn — разбор придёт в @soulmetrica_bot.'
      }
    },
    {
      '@type': 'Question',
      name: 'Чем полный разбор отличается от отдельных?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Полный разбор включает 12 глав: характер, деньги, любовь, блоки, прогноз 2026 и горизонт на 5 лет — обычно выгоднее, чем собирать по одному.'
      }
    }
  ]
};

function readContent(name) {
  return fs.readFileSync(path.join(process.cwd(), 'content', name + '.html'), 'utf8');
}

export default function HomePage() {
  const html = readContent('landing');
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Nunito:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/css/veluna.css?v=71" />
      <link rel="stylesheet" href="/css/veluna-light.css?v=71" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  function boot(){
    var mc = navigator.modelContext || document.modelContext;
    if (!mc || typeof mc.registerTool !== 'function') return;
    try {
      mc.registerTool({
        name: 'open_order',
        description: 'Open SoulMetrica order modal',
        inputSchema: { type: 'object', properties: { product: { type: 'string' } } },
        execute: async function(a){
          if (window.velunaOpenOrder) window.velunaOpenOrder((a&&a.product)||'Полный разбор');
          return { content: [{ type: 'text', text: 'ok' }] };
        }
      });
      mc.registerTool({
        name: 'list_products',
        description: 'List SoulMetrica products',
        inputSchema: { type: 'object', properties: {} },
        execute: async function(){
          var r = await fetch('/api/admin/prices?public=1');
          return { content: [{ type: 'text', text: await r.text() }] };
        }
      });
      mc.registerTool({
        name: 'get_llms_txt',
        description: 'Fetch llms.txt for citations',
        inputSchema: { type: 'object', properties: {} },
        execute: async function(){
          var r = await fetch('/llms.txt');
          return { content: [{ type: 'text', text: await r.text() }] };
        }
      });
    } catch (e) {}
  }
  boot();
  document.addEventListener('modelcontextready', boot);
})();`
        }}
      />
      <LegacyShell
        html={html}
        scripts={[
          '/js/veluna-currency.js?v=1',
          '/js/veluna-systems.js?v=5',
          '/js/veluna.js?v=44',
          '/js/veluna-quiz.js?v=12',
          '/js/webmcp.js?v=2'
        ]}
      />
    </>
  );
}
