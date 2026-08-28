'use client';

import { SiteHeader } from '@/components/SiteHeader';
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
} from '@/components/ui';
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
        <PageHeader title={t('loginTitle')} />
        <div className="mb-4 flex gap-2 text-sm" role="tablist">
          <Button
            type="button"
            size="sm"
            variant={mode === 'otp' ? 'primary' : 'secondary'}
            onClick={() => setMode('otp')}
            aria-selected={mode === 'otp'}
          >
            {t('loginOtp')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'password' ? 'primary' : 'secondary'}
            onClick={() => setMode('password')}
            aria-selected={mode === 'password'}
          >
            {t('loginPassword')}
          </Button>
        </div>
        <Card>
          <form
            onSubmit={mode === 'otp' ? handleOtp : handlePassword}
            className="space-y-4"
          >
            <FormField label={tc('email')} id="login-email">
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
            {mode === 'password' && (
              <FormField label={tc('password')} id="login-password">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </FormField>
            )}
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={loading} fullWidth>
              {loading ? tc('loading') : mode === 'otp' ? t('sendOtp') : t('login')}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-muted">
          <Link href={`/${locale}/auth/forgot-password`} className="text-brand hover:underline">
            {t('forgotPassword')}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink-muted">
          {t('noAccount')}{' '}
          <Link href={`/${locale}/auth/register/student`} className="text-brand hover:underline">
            {t('registerStudent')}
          </Link>
        </p>
      </main>
    </>
  );
}
