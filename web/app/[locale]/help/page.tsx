import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HelpDesk } from './HelpDesk';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'help' });
  return {
    title: t('title'),
    description: t('lead'),
    alternates: {
      languages: {
        en: '/en/help',
        hi: '/hi/help',
      },
    },
    openGraph: {
      title: `TutorConnect — ${t('title')}`,
      description: t('lead'),
      locale: params.locale === 'hi' ? 'hi_IN' : 'en_IN',
      type: 'website',
    },
  };
}

export default function HelpPage() {
  return <HelpDesk />;
}
