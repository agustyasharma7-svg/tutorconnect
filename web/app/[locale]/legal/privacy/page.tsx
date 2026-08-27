'use client';

import { SiteHeader } from '@/components/SiteHeader';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('legal');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">{t('privacyTitle')}</h1>
        <p className="mt-4 text-gray-700">{t('privacyBody')}</p>
        <Link href={`/${locale}`} className="mt-8 inline-block text-blue-600">
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
