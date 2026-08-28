import { MetadataRoute } from 'next';

const site =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['en', 'hi'] as const;
  const paths = [
    '',
    '/search',
    '/help',
    '/auth/login',
    '/legal/privacy',
    '/legal/terms',
    '/legal/agreement',
  ];
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of paths) {
      entries.push({
        url: `${site}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' || path === '/search' ? 'daily' : 'monthly',
        priority:
          path === '' ? 1 : path === '/search' ? 0.9 : path === '/help' ? 0.8 : 0.5,
      });
    }
  }
  return entries;
}
