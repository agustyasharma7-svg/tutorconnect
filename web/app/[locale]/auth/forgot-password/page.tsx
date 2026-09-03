'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { Alert, Button, Card, FormField, Input, PageHeader } from '@/components/ui';
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
        <PageHeader title={t('forgotTitle')} />
        {step === 'email' ? (
          <Card>
            <form onSubmit={sendOtp} className="space-y-4">
              <FormField label={tc('email')} id="forgot-email">
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </FormField>
              {error && <Alert>{error}</Alert>}
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? tc('loading') : t('sendOtp')}
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <form onSubmit={reset} className="space-y-4">
              <p className="text-sm text-ink-muted">{email}</p>
              <FormField label={t('otp')} id="forgot-otp">
                {(id) => (
                  <Input
                    id={id}
                    required
                    pattern="\d{6}"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                )}
              </FormField>
              <FormField label={tc('password')} id="forgot-password">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </FormField>
              {error && <Alert>{error}</Alert>}
              {message && <Alert tone="success">{message}</Alert>}
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? tc('loading') : t('resetPassword')}
              </Button>
            </form>
          </Card>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href={`/${locale}/auth/login`} className="text-brand hover:underline">
            {tc('back')}
          </Link>
        </p>
      </main>
    </>
  );
}
