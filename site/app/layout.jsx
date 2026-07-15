import { ThemeBoot } from '@/components/providers/ThemeBoot';
import { SITE_ORIGIN, siteUrl } from '@/lib/site-seo';

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SoulMetrica',
  alternateName: ['SoulMetrica'],
  url: SITE_ORIGIN,
  logo: siteUrl('/assets/figma/logo-icon.svg'),
  email: undefined,
  telephone: '+77079322193',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Алматы',
    addressCountry: 'KZ',
    streetAddress: 'пр. Навои 280'
  },
  sameAs: ['https://t.me/soulmetrica_bot'],
  parentOrganization: {
    '@type': 'Organization',
    name: 'ТОО НЕЙРОКИДС',
    taxID: '260540017173'
  }
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SoulMetrica',
  url: SITE_ORIGIN,
  inLanguage: 'ru-KZ',
  potentialAction: {
    '@type': 'OrderAction',
    target: SITE_ORIGIN + '/#products'
  }
};

export const metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: 'SoulMetrica — персональный разбор по дате рождения',
    template: '%s · SoulMetrica'
  },
  description:
    'Нумерологические разборы SoulMetrica: полный разбор личности, любовь, деньги, прогноз. Оплата онлайн, доставка в Telegram @soulmetrica_bot.',
  keywords: [
    'нумерология',
    'разбор личности',
    'SoulMetrica',
    'SoulMetrica',
    'число судьбы',
    'прогноз 2026',
    'Telegram разбор'
  ],
  authors: [{ name: 'SoulMetrica' }],
  creator: 'SoulMetrica',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    url: SITE_ORIGIN,
    siteName: 'SoulMetrica',
    title: 'SoulMetrica — персональный разбор по дате рождения',
    description:
      'Уникальный разбор по твоей дате. PDF в Telegram. Полный разбор, любовь, деньги, прогноз.',
    images: [{ url: '/assets/figma/hero-woman-light.png', width: 1200, height: 630, alt: 'SoulMetrica' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoulMetrica — персональный разбор',
    description: 'Разбор по дате рождения с доставкой в Telegram'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true }
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%237159ff'/%3E%3Cpath d='M16 7l2.2 6.8H25l-5.5 4 2.1 6.8L16 20.4 10.4 24.6l2.1-6.8L7 13.8h6.8z' fill='%23fff'/%3E%3C/svg%3E"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" data-theme="light" suppressHydrationWarning>
      <head>
        <ThemeBoot />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="describedby" href="/llms.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
