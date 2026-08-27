'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { startCheckout } from '@/lib/payments';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Commission = {
  id: string;
  status: string;
  grossAmount: number;
  lineItems: { label: string; gross: number }[];
};

export default function CommissionCheckoutPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [commission, setCommission] = useState<Commission | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    apiWithAuth<Commission>(`/commissions/${id}`, access)
      .then(setCommission)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router, id]);

  const pay = async () => {
    setLoading(true);
    setError('');
    try {
      await startCheckout(token, { type: 'COMMISSION', commissionId: id }, locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">{t('commissionCheckout')}</h1>
        {commission && (
          <>
            <ul className="mb-4 space-y-1 text-sm">
              {commission.lineItems.map((li) => (
                <li key={li.label}>
                  {li.label}: ₹{li.gross}
                </li>
              ))}
            </ul>
            <p className="mb-4 text-lg font-semibold">
              {t('totalDue')}: ₹{commission.grossAmount} {t('inclGst')}
            </p>
          </>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={loading || !token || !commission}
          onClick={pay}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? tc('loading') : t('payNow')}
        </button>
        <Link href={`/${locale}/commissions`} className="mt-6 block text-blue-600 underline">
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
