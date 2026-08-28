'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { startCheckout } from '@/lib/payments';
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

  if (!commission && !error) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  return (
    <AppFrame>
      <main className="mx-auto max-w-lg px-4 py-10">
        <PageHeader title={t('commissionCheckout')} />
        {commission && (
          <Card className="mb-4">
            <ul className="mb-4 space-y-1 text-sm text-ink-muted">
              {commission.lineItems.map((li) => (
                <li key={li.label}>
                  {li.label}: ₹{li.gross}
                </li>
              ))}
            </ul>
            <p className="text-lg font-semibold text-ink">
              {t('totalDue')}: ₹{commission.grossAmount} {t('inclGst')}
            </p>
          </Card>
        )}
        {error && <Alert className="mb-3">{error}</Alert>}
        <Button
          type="button"
          disabled={loading || !token || !commission}
          onClick={pay}
        >
          {loading ? tc('loading') : t('payNow')}
        </Button>
        <ButtonLink
          href={`/${locale}/commissions`}
          variant="link"
          className="mt-6"
        >
          {tc('back')}
        </ButtonLink>
      </main>
    </AppFrame>
  );
}
