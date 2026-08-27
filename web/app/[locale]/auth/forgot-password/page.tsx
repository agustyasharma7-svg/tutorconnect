'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'reset' }),
      });
      setStep('reset');
      setMessage('OTP sent to email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ email, otp, password }),
      });
      setMessage('Password updated. You can login now.');
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
        <h1 className="mb-6 text-2xl font-bold">{t('forgotTitle')}</h1>
        {step === 'email' ? (
          <form onSubmit={sendOtp} className="space-y-4 rounded-lg bg-white p-6 shadow">
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
            >
              {loading ? tc('loading') : t('sendOtp')}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4 rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">{email}</p>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('otp')}</label>
              <input
                required
                pattern="\d{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
            >
              {loading ? tc('loading') : t('resetPassword')}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href={`/${locale}/auth/login`} className="text-blue-600">
            {tc('back')}
          </Link>
        </p>
      </main>
    </>
  );
}
