'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Req = {
  id: string;
  status: string;
  budgetMin: number;
  budgetMax: number;
  mode: string;
  subject?: { nameEn: string; nameHi: string };
  class?: { nameEn: string; nameHi: string };
  board?: { nameEn: string; nameHi: string };
};

export default function RequirementsListPage() {
  const t = useTranslations('requirements');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Req[]>([]);
  const [error, setError] = useState('');

  const label = (item?: { nameEn: string; nameHi: string }) =>
    item ? (locale === 'hi' ? item.nameHi : item.nameEn) : '—';

  useEffect(() => {
    const user = getStoredUser();
    const token = getAccessToken();
    if (!user || !token || user.role !== 'STUDENT') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    apiWithAuth<Req[]>('/requirements', token)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link
            href={`/${locale}/requirements/new`}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
          >
            {t('new')}
          </Link>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!rows.length && !error && <p className="text-gray-600">{t('empty')}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {label(r.subject)} · {label(r.class)} · {label(r.board)}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{r.budgetMin}–₹{r.budgetMax}/mo · {r.mode}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                    {tc('status')}: {r.status}
                  </p>
                </div>
                <Link
                  href={`/${locale}/requirements/${r.id}`}
                  className="text-sm text-blue-600"
                >
                  {tc('view')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
