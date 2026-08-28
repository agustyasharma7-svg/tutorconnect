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

type LineItem = {
  label: string;
  gross: number;
  taxable: number;
  gst: number;
};

type Commission = {
  id: string;
  status: string;
  grossAmount: number;
  taxableAmount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  monthlyFee: number;
  lineItems: LineItem[];
  invoicePdfUrl?: string | null;
  dueAt?: string | null;
  studentName?: string;
  createdAt: string;
};

export default function CommissionsPage() {
  const t = useTranslations('payments');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<Commission[]>([]);
  const [selected, setSelected] = useState<Commission | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    apiWithAuth<Commission[]>('/commissions', access)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const open = async (id: string) => {
    try {
      const c = await apiWithAuth<Commission>(`/commissions/${id}`, token);
      setSelected(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <AppFrame>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          title={t('commissionsTitle')}
          actions={
            <ButtonLink
              href={`/${locale}/payments/history`}
              variant="link"
              size="sm"
            >
              {t('history')}
            </ButtonLink>
          }
        />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length ? (
          <EmptyState title={t('commissionsEmpty')} />
        ) : (
          <ul className="mb-8 space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => open(r.id)}
                  >
                    <p className="font-medium text-ink">
                      {r.studentName ?? r.id.slice(0, 8)} — ₹{r.grossAmount}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {tc('status')}: {r.status}
                    </p>
                  </button>
                  {(r.status === 'GENERATED' || r.status === 'OVERDUE') && (
                    <ButtonLink
                      href={`/${locale}/payments/commission/${r.id}`}
                      size="sm"
                      className="mt-2"
                    >
                      {t('payNow')}
                    </ButtonLink>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-ink">{t('invoice')}</h2>
            <p className="text-sm text-ink-muted">
              {t('monthlyFee')}: ₹{selected.monthlyFee}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {selected.lineItems.map((li) => (
                <li key={li.label} className="border-b border-cream-dark pb-2">
                  <p className="font-medium text-ink">{li.label}</p>
                  <p className="text-ink-muted">
                    {t('gross')}: ₹{li.gross} · {t('taxable')}: ₹{li.taxable} ·{' '}
                    {t('gst')}: ₹{li.gst}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ink">
              {t('taxable')}: ₹{selected.taxableAmount} · CGST ₹{selected.cgst} ·
              SGST ₹{selected.sgst}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {t('totalDue')}: ₹{selected.grossAmount}
            </p>
            {selected.invoicePdfUrl && (
              <a
                href={selected.invoicePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
              >
                {t('downloadInvoice')}
              </a>
            )}
          </Card>
        )}
      </main>
    </AppFrame>
  );
}
