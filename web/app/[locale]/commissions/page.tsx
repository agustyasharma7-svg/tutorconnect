'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('commissionsTitle')}</h1>
          <Link
            href={`/${locale}/payments/history`}
            className="text-sm text-blue-600 underline"
          >
            {t('history')}
          </Link>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!rows.length && <p className="text-gray-600">{t('commissionsEmpty')}</p>}
        <ul className="mb-8 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <button type="button" className="w-full text-left" onClick={() => open(r.id)}>
                <p className="font-medium">
                  {r.studentName ?? r.id.slice(0, 8)} — ₹{r.grossAmount}
                </p>
                <p className="text-sm text-gray-600">
                  {tc('status')}: {r.status}
                </p>
              </button>
              {(r.status === 'GENERATED' || r.status === 'OVERDUE') && (
                <Link
                  href={`/${locale}/payments/commission/${r.id}`}
                  className="mt-2 inline-block rounded bg-blue-600 px-3 py-1.5 text-sm text-white"
                >
                  {t('payNow')}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {selected && (
          <section className="rounded-lg bg-white p-5 shadow">
            <h2 className="mb-3 text-lg font-semibold">{t('invoice')}</h2>
            <p className="text-sm text-gray-600">
              {t('monthlyFee')}: ₹{selected.monthlyFee}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {selected.lineItems.map((li) => (
                <li key={li.label} className="border-b pb-2">
                  <p className="font-medium">{li.label}</p>
                  <p>
                    {t('gross')}: ₹{li.gross} · {t('taxable')}: ₹{li.taxable} ·{' '}
                    {t('gst')}: ₹{li.gst}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              {t('taxable')}: ₹{selected.taxableAmount} · CGST ₹{selected.cgst} ·
              SGST ₹{selected.sgst}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {t('totalDue')}: ₹{selected.grossAmount}
            </p>
            {selected.invoicePdfUrl && (
              <a
                href={selected.invoicePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-blue-600 underline"
              >
                {t('downloadInvoice')}
              </a>
            )}
          </section>
        )}
      </main>
    </>
  );
}
