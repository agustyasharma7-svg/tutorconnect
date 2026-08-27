'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Commission = {
  id: string;
  status: string;
  grossAmount: number;
  taxableAmount: number;
  gstAmount: number;
  tutorName?: string;
  studentName?: string;
  waivedReason?: string | null;
  dueAt?: string | null;
  createdAt: string;
};

export default function AdminCommissionsPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<Commission[]>([]);
  const [error, setError] = useState('');
  const [waiveId, setWaiveId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = (access: string) =>
    apiWithAuth<Commission[]>('/admin/commissions', access).then(setRows);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'ADMIN') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const submitWaive = async (e: FormEvent) => {
    e.preventDefault();
    if (!waiveId) return;
    try {
      await apiWithAuth(`/admin/commissions/${waiveId}/waive`, token, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setWaiveId(null);
      setReason('');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('commissionsTitle')}</h1>
          <Link href={`/${locale}/dashboard/admin`} className="text-sm text-blue-600">
            {tc('back')}
          </Link>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!rows.length && <p className="text-gray-600">{t('commissionsEmpty')}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <p className="font-medium">
                {r.tutorName ?? 'Tutor'} → {r.studentName ?? 'Student'} — ₹
                {r.grossAmount}
              </p>
              <p className="text-sm text-gray-600">
                {tc('status')}: {r.status} · GST ₹{r.gstAmount}
                {r.dueAt ? ` · due ${new Date(r.dueAt).toLocaleDateString()}` : ''}
              </p>
              {r.waivedReason && (
                <p className="mt-1 text-sm text-gray-500">
                  {t('waived')}: {r.waivedReason}
                </p>
              )}
              {(r.status === 'GENERATED' || r.status === 'OVERDUE') && (
                <button
                  type="button"
                  className="mt-2 text-sm text-amber-800 underline"
                  onClick={() => {
                    setWaiveId(r.id);
                    setReason('');
                  }}
                >
                  {t('waive')}
                </button>
              )}
            </li>
          ))}
        </ul>

        {waiveId && (
          <form
            onSubmit={submitWaive}
            className="mt-6 space-y-3 rounded-lg border bg-white p-4 shadow"
          >
            <p className="font-medium">{t('waiveTitle')}</p>
            <textarea
              required
              minLength={5}
              className="w-full rounded border px-3 py-2 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('waiveReason')}
            />
            <div className="flex gap-2">
              <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
                {t('confirmWaive')}
              </button>
              <button
                type="button"
                className="rounded border px-4 py-2"
                onClick={() => setWaiveId(null)}
              >
                {tc('cancel')}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
