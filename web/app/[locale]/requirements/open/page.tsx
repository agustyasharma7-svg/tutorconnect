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

export default function OpenRequirementsPage() {
  const t = useTranslations('matching');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Req[]>([]);
  const [error, setError] = useState('');

  const label = (item?: { nameEn: string; nameHi: string }) =>
    item ? (locale === 'hi' ? item.nameHi : item.nameEn) : '—';

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    apiWithAuth<Req[]>('/requirements/open', access)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('openTitle')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {label(r.subject)} · {label(r.class)} · {label(r.board)}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{r.budgetMin}–₹{r.budgetMax} · {r.mode} · {r.status}
                  </p>
                </div>
                <Link
                  href={`/${locale}/requirements/${r.id}`}
                  className="text-sm text-blue-600"
                >
                  {tc('apply')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
