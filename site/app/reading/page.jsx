import fs from 'fs';
import path from 'path';
import { LegacyShell } from '@/components/legacy/LegacyShell';

export const metadata = {
  title: 'Разбор · SoulMetrica',
  robots: { index: false, follow: false }
};

function readContent(name) {
  return fs.readFileSync(path.join(process.cwd(), 'content', name + '.html'), 'utf8');
}

export default function ReadingPage() {
  const html = readContent('reading');
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Marcellus&family=Nunito:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/css/reading.css?v=3" />
      <LegacyShell html={html} scripts={['/js/reading.js?v=3']} />
    </>
  );
}
