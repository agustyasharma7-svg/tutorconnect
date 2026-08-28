import type { Metadata } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { HomeLanding } from '@/components/home/HomeLanding';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' });
  const title = `TutorConnect India — ${t('hero')}`;
  const description = t('metaDescription');
  return {
    title,
    description,
    alternates: {
      languages: {
        en: '/en',
        hi: '/hi',
      },
    },
    openGraph: {
      title,
      description,
      locale: params.locale === 'hi' ? 'hi_IN' : 'en_IN',
      type: 'website',
    },
  };
}

export default async function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <HomeLanding />
      </main>
      <SiteFooter />
    </>
  );
}
