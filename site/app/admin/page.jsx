import fs from 'fs';
import path from 'path';
import { LegacyShell } from '@/components/legacy/LegacyShell';

export const metadata = {
  title: 'Admin · SoulMetrica',
  robots: { index: false, follow: false }
};

function readContent(name) {
  return fs.readFileSync(path.join(process.cwd(), 'content', name + '.html'), 'utf8');
}

export default function AdminPage() {
  const html = readContent('admin');
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Marcellus&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/css/admin.css?v=2" />
      <LegacyShell html={html} scripts={['/js/admin.js?v=6']} />
    </>
  );
}
