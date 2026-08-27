'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Cal = {
  bufferMinutes: number;
  availability: { day: string; startTime: string; endTime: string; mode: string }[];
  exceptions?: { id: string; date: string; reason?: string | null }[];
  slots: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    source: string;
    bufferBeforeStartAt?: string;
    bufferAfterEndAt: string;
  }[];
};

export default function CalendarPage() {
  const t = useTranslations('schedule');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [cal, setCal] = useState<Cal | null>(null);
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [exDate, setExDate] = useState('');
  const [exReason, setExReason] = useState('');

  const load = (access: string) =>
    apiWithAuth<Cal>('/schedules/calendar', access).then(setCal);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    setRole(user.role);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, router]);

  const release = async (id: string) => {
    try {
      await apiWithAuth(`/schedules/slots/${id}/release`, token, { method: 'POST' });
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const addException = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiWithAuth('/schedules/exceptions', token, {
        method: 'POST',
        body: JSON.stringify({
          date: exDate,
          reason: exReason || undefined,
        }),
      });
      setExDate('');
      setExReason('');
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const removeException = async (id: string) => {
    try {
      await apiWithAuth(`/schedules/exceptions/${id}`, token, { method: 'DELETE' });
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (!cal) return <p className="p-8">{error || tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('buffer')}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <section className="mt-6 rounded-lg bg-white p-4 shadow">
          <h2 className="font-medium">{t('available')}</h2>
          <ul className="mt-2 text-sm text-gray-700">
            {cal.availability.map((a, i) => (
              <li key={i}>
                {a.day} {a.startTime}-{a.endTime} ({a.mode})
              </li>
            ))}
          </ul>
        </section>

        {role === 'TUTOR' && (
          <section className="mt-6 rounded-lg bg-white p-4 shadow">
            <h2 className="font-medium">{t('exceptions')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('exceptionsHint')}</p>
            <form onSubmit={addException} className="mt-3 flex flex-wrap gap-2">
              <input
                type="date"
                required
                className="rounded border px-3 py-2 text-sm"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
              />
              <input
                className="min-w-[160px] flex-1 rounded border px-3 py-2 text-sm"
                placeholder={t('exceptionReason')}
                value={exReason}
                onChange={(e) => setExReason(e.target.value)}
              />
              <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-sm text-white">
                {t('addException')}
              </button>
            </form>
            <ul className="mt-3 space-y-2 text-sm">
              {(cal.exceptions ?? []).map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  <span>
                    {ex.date}
                    {ex.reason ? ` — ${ex.reason}` : ''}
                  </span>
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => removeException(ex.id)}
                  >
                    {tc('cancel')}
                  </button>
                </li>
              ))}
              {!(cal.exceptions ?? []).length && (
                <li className="text-gray-500">{t('noExceptions')}</li>
              )}
            </ul>
          </section>
        )}

        {role === 'STUDENT' && !!(cal.exceptions ?? []).length && (
          <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-medium">{t('exceptions')}</h2>
            <ul className="mt-2 text-sm">
              {cal.exceptions!.map((ex) => (
                <li key={ex.id}>
                  {ex.date}
                  {ex.reason ? ` — ${ex.reason}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          {!cal.slots.length && <p className="text-gray-600">{t('empty')}</p>}
          <ul className="space-y-3">
            {cal.slots.map((s) => (
              <li key={s.id} className="overflow-hidden rounded-lg bg-white shadow">
                <div className="border-l-4 border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
                  {t('bufferBefore')}:{' '}
                  {new Date(
                    s.bufferBeforeStartAt ?? s.startAt,
                  ).toLocaleTimeString()}{' '}
                  → {new Date(s.startAt).toLocaleTimeString()}
                </div>
                <div className="border-l-4 border-blue-500 px-4 py-3">
                  <p className="font-medium">
                    {new Date(s.startAt).toLocaleString()} →{' '}
                    {new Date(s.endAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {s.status === 'OCCUPIED'
                      ? t('occupied')
                      : s.status === 'RELEASED'
                        ? t('released')
                        : s.status}{' '}
                    · {s.source}
                  </p>
                  {role === 'STUDENT' &&
                    s.status === 'OCCUPIED' &&
                    s.source === 'AGREEMENT' && (
                      <button
                        type="button"
                        className="mt-2 text-sm text-red-600"
                        onClick={() => release(s.id)}
                      >
                        {t('release')}
                      </button>
                    )}
                </div>
                <div className="border-l-4 border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
                  {t('bufferAfter')}: {new Date(s.endAt).toLocaleTimeString()} →{' '}
                  {new Date(s.bufferAfterEndAt).toLocaleTimeString()} (
                  {cal.bufferMinutes} {t('minutes')})
                </div>
              </li>
            ))}
          </ul>
        </section>
        <Link
          href={`/${locale}/dashboard/${role.toLowerCase()}`}
          className="mt-6 inline-block text-sm text-blue-600"
        >
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
