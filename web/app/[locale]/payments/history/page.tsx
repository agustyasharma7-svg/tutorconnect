'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Payment = {
  id: string;
  type: string;
  status: string;
  grossAmount: number;
  taxableAmount: number;
  gstAmount: number;
  createdAt: string;
};

export default function PaymentHistoryPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    apiWithAuth<Payment[]>('/payments/history', access)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('history')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!rows.length && <p className="text-gray-600">{t('historyEmpty')}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <p className="font-medium">
                {r.type} — ₹{r.grossAmount}
              </p>
              <p className="text-sm text-gray-600">
                {tc('status')}: {r.status} · {t('taxable')}: ₹{r.taxableAmount} ·{' '}
                {t('gst')}: ₹{r.gstAmount}
              </p>
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/commissions`} className="mt-6 inline-block text-blue-600 underline">
          {t('commissionsTitle')}
        </Link>
      </main>
    </>
  );
}
