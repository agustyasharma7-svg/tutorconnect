'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { startCheckout } from '@/lib/payments';

export default function RegistrationCheckoutPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
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
  }, [locale, router]);

  const pay = async () => {
    setLoading(true);
    setError('');
    try {
      await startCheckout(token, { type: 'REGISTRATION' }, locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">{t('registrationTitle')}</h1>
        <p className="mb-6 text-gray-600">{t('registrationBlurb')}</p>
        <p className="mb-4 text-lg font-semibold">₹199 {t('inclGst')}</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          disabled={loading || !token}
          onClick={pay}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? tc('loading') : t('payNow')}
        </button>
        <p className="mt-4 text-sm text-gray-500">{t('tutorOnly')}</p>
        <Link href={`/${locale}/dashboard/tutor`} className="mt-6 block text-blue-600 underline">
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
