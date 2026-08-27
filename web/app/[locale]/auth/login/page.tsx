'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { api } from '@/lib/api';
import { dashboardPath, saveAuth } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'login' }),
      });
      router.push(`/${locale}/auth/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
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
        <h1 className="mb-6 text-2xl font-bold">{t('loginTitle')}</h1>
        <div className="mb-4 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode('otp')}
            className={`rounded px-3 py-1 ${mode === 'otp' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {t('loginOtp')}
          </button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`rounded px-3 py-1 ${mode === 'password' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            {t('loginPassword')}
          </button>
        </div>
        <form
          onSubmit={mode === 'otp' ? handleOtp : handlePassword}
          className="space-y-4 rounded-lg bg-white p-6 shadow"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">{tc('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          {mode === 'password' && (
            <div>
              <label className="mb-1 block text-sm font-medium">{tc('password')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? tc('loading') : mode === 'otp' ? t('sendOtp') : t('login')}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href={`/${locale}/auth/forgot-password`} className="text-blue-600">
            {t('forgotPassword')}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/register/student`} className="text-blue-600">
            {t('registerStudent')}
          </Link>
        </p>
      </main>
    </>
  );
}
