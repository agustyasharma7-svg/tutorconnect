'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  Spinner,
} from '@/components/ui';
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

  if (!cal) {
    return (
      <div className="min-h-screen bg-cream">
        {error ? <Alert className="m-8">{error}</Alert> : <Spinner label={tc('loading')} />}
      </div>
    );
  }

  return (
    <AppFrame>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('title')} description={t('buffer')} />
        {error && <Alert className="mb-4">{error}</Alert>}

        <Card>
          <h2 className="font-medium text-ink">{t('available')}</h2>
          <ul className="mt-2 space-y-0.5 text-sm text-ink-muted">
            {cal.availability.map((a, i) => (
              <li key={i}>
                {a.day} {a.startTime}-{a.endTime} ({a.mode})
              </li>
            ))}
          </ul>
        </Card>

        {role === 'TUTOR' && (
          <Card className="mt-4">
            <h2 className="font-medium text-ink">{t('exceptions')}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t('exceptionsHint')}</p>
            <form onSubmit={addException} className="mt-3 flex flex-wrap items-end gap-2">
              <FormField label={t('exceptions')} id="ex-date" className="min-w-[10rem]">
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    required
                    value={exDate}
                    onChange={(e) => setExDate(e.target.value)}
                  />
                )}
              </FormField>
              <FormField
                label={t('exceptionReason')}
                id="ex-reason"
                className="min-w-[10rem] flex-1"
              >
                {(id) => (
                  <Input
                    id={id}
                    value={exReason}
                    onChange={(e) => setExReason(e.target.value)}
                  />
                )}
              </FormField>
              <Button type="submit" size="sm">
                {t('addException')}
              </Button>
            </form>
            <ul className="mt-3 space-y-2 text-sm">
              {(cal.exceptions ?? []).map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center justify-between rounded-control border border-amber-200 bg-amber-50 px-3 py-2"
                >
                  <span>
                    {ex.date}
                    {ex.reason ? ` — ${ex.reason}` : ''}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-danger"
                    onClick={() => removeException(ex.id)}
                  >
                    {tc('cancel')}
                  </Button>
                </li>
              ))}
              {!(cal.exceptions ?? []).length && (
                <li className="text-ink-muted">{t('noExceptions')}</li>
              )}
            </ul>
          </Card>
        )}

        {role === 'STUDENT' && !!(cal.exceptions ?? []).length && (
          <Alert tone="warning" className="mt-4">
            <p className="font-medium">{t('exceptions')}</p>
            <ul className="mt-2 text-sm">
              {cal.exceptions!.map((ex) => (
                <li key={ex.id}>
                  {ex.date}
                  {ex.reason ? ` — ${ex.reason}` : ''}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <section className="mt-6">
          {!cal.slots.length ? (
            <EmptyState title={t('empty')} />
          ) : (
            <ul className="space-y-3">
              {cal.slots.map((s) => (
                <li key={s.id}>
                  <Card className="overflow-hidden p-0">
                    <div className="border-l-4 border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
                      {t('bufferBefore')}:{' '}
                      {new Date(
                        s.bufferBeforeStartAt ?? s.startAt,
                      ).toLocaleTimeString()}{' '}
                      → {new Date(s.startAt).toLocaleTimeString()}
                    </div>
                    <div className="border-l-4 border-brand px-4 py-3">
                      <p className="font-medium text-ink">
                        {new Date(s.startAt).toLocaleString()} →{' '}
                        {new Date(s.endAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-ink-muted">
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
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="mt-2 text-danger"
                            onClick={() => release(s.id)}
                          >
                            {t('release')}
                          </Button>
                        )}
                    </div>
                    <div className="border-l-4 border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
                      {t('bufferAfter')}: {new Date(s.endAt).toLocaleTimeString()} →{' '}
                      {new Date(s.bufferAfterEndAt).toLocaleTimeString()} (
                      {cal.bufferMinutes} {t('minutes')})
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {role && (
          <Link
            href={`/${locale}/dashboard/${role.toLowerCase()}`}
            className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
          >
            {tc('back')}
          </Link>
        )}
      </main>
    </AppFrame>
  );
}
