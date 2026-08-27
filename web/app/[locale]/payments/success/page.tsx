'use client';

import { SiteHeader } from '@/components/SiteHeader';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PaymentSuccessPage() {
  const t = useTranslations('payments');
  const { locale } = useParams<{ locale: string }>();
  const params = useSearchParams();
  const paymentId = params.get('paymentId');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-green-700">{t('successTitle')}</h1>
        <p className="mb-4 text-gray-600">{t('successBlurb')}</p>
        {paymentId && (
          <p className="mb-4 text-sm text-gray-500">
            {t('ref')}: {paymentId}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/commissions`}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            {t('commissionsTitle')}
          </Link>
          <Link href={`/${locale}/dashboard/tutor`} className="rounded border px-4 py-2">
            Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}
