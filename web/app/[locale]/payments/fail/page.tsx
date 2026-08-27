'use client';

import { SiteHeader } from '@/components/SiteHeader';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PaymentFailPage() {
  const t = useTranslations('payments');
  const { locale } = useParams<{ locale: string }>();
  const params = useSearchParams();
  const reason = params.get('reason');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-red-700">{t('failTitle')}</h1>
        <p className="mb-4 text-gray-600">{t('failBlurb')}</p>
        {reason && <p className="mb-4 text-sm text-red-600">{reason}</p>}
        <Link
          href={`/${locale}/commissions`}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          {t('tryAgain')}
        </Link>
      </main>
    </>
  );
}
