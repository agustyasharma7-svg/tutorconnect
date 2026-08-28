import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SearchTutorsClient from './SearchTutorsClient';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'matching' });
  const title = `TutorConnect — ${t('searchTitle')}`;
  return {
    title,
    description: t('searchTitle'),
    alternates: {
      languages: {
        en: '/en/search',
        hi: '/hi/search',
      },
    },
    openGraph: {
      title,
      description: t('searchTitle'),
      locale: params.locale === 'hi' ? 'hi_IN' : 'en_IN',
      type: 'website',
    },
  };
}

export default function SearchPage() {
  return <SearchTutorsClient />;
}
