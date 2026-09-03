'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { Alert, Button, Card, FormField, Input, PageHeader } from '@/components/ui';
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
        <PageHeader title={t('verifyOtpTitle')} description={email} />
        <Card>
          <form onSubmit={handleVerify} className="space-y-4">
            <FormField label={t('otp')} id="verify-otp">
              {(id) => (
                <Input
                  id={id}
                  type="text"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="tracking-widest"
                />
              )}
            </FormField>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={loading} fullWidth>
              {loading ? tc('loading') : t('verifyOtp')}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm">
          <Link href={`/${locale}/auth/login`} className="text-brand hover:underline">
            {tc('back')}
          </Link>
        </p>
      </main>
    </>
  );
}
