'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Demo = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMins: number;
  mode: string;
  joinDetails?: string | null;
  tutorName: string;
  studentName: string;
  matchId: string;
  contactHidden: boolean;
};

export default function DemoDetailPage() {
  const t = useTranslations('demo');
  const tc = useTranslations('common');
  const tm = useTranslations('matching');
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [demo, setDemo] = useState<Demo | null>(null);
  const [error, setError] = useState('');

  const load = (access: string) =>
    apiWithAuth<Demo>(`/demo-classes/${id}`, access).then(setDemo);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [id, locale, router]);

  const setStatus = async (status: string) => {
    try {
      await apiWithAuth(`/demo-classes/${id}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (!demo) return <p className="p-8">{tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/${locale}/demos`} className="text-sm text-blue-600">
          {tc('back')}
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{t('detail')}</h1>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 space-y-2 rounded-lg bg-white p-6 shadow">
          <p>
            {demo.tutorName} · {demo.studentName}
          </p>
          <p>{new Date(demo.scheduledAt).toLocaleString()} · {demo.durationMins} min</p>
          <p>
            {demo.mode} · {demo.status}
          </p>
          <p className="text-sm text-gray-500">{tm('contactHidden')}</p>
          <div className="rounded bg-gray-50 p-3 text-sm">
            <p className="font-medium">{t('join')}</p>
            <p>{demo.joinDetails}</p>
          </div>
        </div>
        {demo.status === 'SCHEDULED' && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded bg-blue-600 px-4 py-2 text-white"
              onClick={() => setStatus('COMPLETED')}
            >
              {t('complete')}
            </button>
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setStatus('CANCELLED')}
            >
              {t('cancelDemo')}
            </button>
            <button
              type="button"
              className="rounded border border-amber-600 px-4 py-2 text-amber-800"
              onClick={() => setStatus('NO_SHOW')}
            >
              {t('noShow')}
            </button>
            <Link
              href={`/${locale}/agreements?matchId=${demo.matchId}`}
              className="rounded border px-4 py-2"
            >
              Agreement
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
