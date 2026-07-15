import fs from 'fs';
import path from 'path';
import { LegacyShell } from '@/components/legacy/LegacyShell';

export const metadata = {
  title: 'Кабинет · SoulMetrica',
  robots: { index: false, follow: false }
};

function readContent(name) {
  return fs.readFileSync(path.join(process.cwd(), 'content', name + '.html'), 'utf8');
}

export default function ProfilePage() {
  const html = readContent('profile');
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400&family=Marcellus&family=Nunito:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/css/profile.css?v=9" />
      <LegacyShell html={html} scripts={['/js/veluna-currency.js?v=1', '/js/profile.js?v=14']} />
    </>
  );
}
