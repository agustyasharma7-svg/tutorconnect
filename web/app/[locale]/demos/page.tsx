'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

export default function DemosPage() {
  const t = useTranslations('demo');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get('matchId');

  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [rows, setRows] = useState<
    { id: string; status: string; scheduledAt: string; mode: string }[]
  >([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode, setMode] = useState('ONLINE');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    setRole(user.role);
    apiWithAuth<typeof rows>('/demo-classes', access)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const book = async (e: FormEvent) => {
    e.preventDefault();
    if (!matchId) return;
    try {
      const demo = await apiWithAuth<{ id: string }>('/demo-classes/book', token, {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMins,
          mode,
        }),
      });
      setMessage('Booked');
      router.push(`/${locale}/demos/${demo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">{t('title')}</h1>
        <p className="mb-4 text-sm text-gray-600">{t('noChat')}</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}

        {role === 'STUDENT' && matchId && (
          <form onSubmit={book} className="mb-8 space-y-3 rounded-lg bg-white p-4 shadow">
            <h2 className="font-medium">{t('book')}</h2>
            <label className="block text-sm">
              {t('when')}
              <input
                type="datetime-local"
                className="mt-1 w-full rounded border px-3 py-2"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </label>
            <input
              type="number"
              className="w-full rounded border px-3 py-2"
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
            />
            <select
              className="w-full rounded border px-3 py-2"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="ONLINE">ONLINE</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
              {t('book')}
            </button>
          </form>
        )}

        {!rows.length && <p className="text-gray-600">{t('empty')}</p>}
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{new Date(r.scheduledAt).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    {r.mode} · {r.status}
                  </p>
                </div>
                <Link href={`/${locale}/demos/${r.id}`} className="text-sm text-blue-600">
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
