import { MetadataRoute } from 'next';

const site =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/*/dashboard/', '/*/admin/', '/*/chat/', '/*/payments/'],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
