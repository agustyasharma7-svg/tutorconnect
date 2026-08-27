'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { api } from '@/lib/api';
import { dashboardPath, saveAuth } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

export default function VerifyOtpClient() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') ?? '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      saveAuth(
        { accessToken: res.accessToken, refreshToken: res.refreshToken },
        res.user,
      );
      router.push(dashboardPath(res.user.role, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold">{t('verifyOtpTitle')}</h1>
        <p className="mb-6 text-sm text-gray-600">{email}</p>
        <form onSubmit={handleVerify} className="space-y-4 rounded-lg bg-white p-6 shadow">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('otp')}</label>
            <input
              type="text"
              required
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded border px-3 py-2 tracking-widest"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? tc('loading') : t('verifyOtp')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href={`/${locale}/auth/login`} className="text-blue-600">
            {tc('back')}
          </Link>
        </p>
      </main>
    </>
  );
}
