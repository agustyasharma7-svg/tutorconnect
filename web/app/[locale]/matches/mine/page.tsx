'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Row = {
  id: string;
  status: string;
  score: number;
  requirement: {
    id: string;
    budgetMin: number;
    budgetMax: number;
    mode: string;
    subject?: { nameEn: string; nameHi: string };
    class?: { nameEn: string; nameHi: string };
  };
};

export default function TutorMatchesPage() {
  const t = useTranslations('matching');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const label = (item?: { nameEn: string; nameHi: string }) =>
    item ? (locale === 'hi' ? item.nameHi : item.nameEn) : '—';

  const load = (access: string) =>
    apiWithAuth<Row[]>('/matches/mine', access).then(setRows);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'TUTOR') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const withdraw = async (id: string) => {
    try {
      await apiWithAuth(`/matches/${id}/withdraw`, token, { method: 'PATCH' });
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('mineTitle')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg bg-white p-4 shadow">
              <p className="font-medium">
                {label(row.requirement.subject)} · {label(row.requirement.class)}
              </p>
              <p className="text-sm text-gray-600">
                {tc('status')}: {row.status} · ₹{row.requirement.budgetMin}–
                {row.requirement.budgetMax}
              </p>
              <div className="mt-2 flex gap-3 text-sm">
                <Link
                  href={`/${locale}/requirements/${row.requirement.id}`}
                  className="text-blue-600"
                >
                  {tc('view')}
                </Link>
                {['APPLIED', 'INVITED'].includes(row.status) && (
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => withdraw(row.id)}
                  >
                    {tc('withdraw')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
