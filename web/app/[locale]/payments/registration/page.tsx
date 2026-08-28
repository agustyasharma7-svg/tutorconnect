'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  PageHeader,
} from '@/components/ui';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { startCheckout } from '@/lib/payments';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

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
    <AppFrame>
      <main className="mx-auto max-w-lg px-4 py-10">
        <PageHeader
          title={t('registrationTitle')}
          description={t('registrationBlurb')}
        />
        <Card>
          <p className="text-lg font-semibold text-ink">
            ₹199 {t('inclGst')}
          </p>
          {error && <Alert className="mt-3">{error}</Alert>}
          <Button
            type="button"
            className="mt-4"
            disabled={loading || !token}
            onClick={pay}
          >
            {loading ? tc('loading') : t('payNow')}
          </Button>
          <p className="mt-4 text-sm text-ink-muted">{t('tutorOnly')}</p>
        </Card>
        <ButtonLink
          href={`/${locale}/dashboard/tutor`}
          variant="link"
          className="mt-6"
        >
          {tc('back')}
        </ButtonLink>
      </main>
    </AppFrame>
  );
}
