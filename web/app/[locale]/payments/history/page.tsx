'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Payment = {
  id: string;
  type: string;
  status: string;
  grossAmount: number;
  taxableAmount: number;
  gstAmount: number;
  createdAt: string;
};

export default function PaymentHistoryPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    apiWithAuth<Payment[]>('/payments/history', access)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  return (
    <AppFrame>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('history')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length && !error ? (
          <EmptyState title={t('historyEmpty')} />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <p className="font-medium text-ink">
                    {r.type} — ₹{r.grossAmount}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {tc('status')}: {r.status} · {t('taxable')}: ₹
                    {r.taxableAmount} · {t('gst')}: ₹{r.gstAmount}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <ButtonLink
          href={`/${locale}/commissions`}
          variant="link"
          className="mt-6"
        >
          {t('commissionsTitle')}
        </ButtonLink>
      </main>
    </AppFrame>
  );
}
