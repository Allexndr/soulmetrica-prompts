import { PUBLIC_PATHS, siteUrl } from '@/lib/site-seo';

export default function sitemap() {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((p) => ({
    url: siteUrl(p.path),
    lastModified,
    changeFrequency: p.changefreq,
    priority: p.priority
  }));
}
