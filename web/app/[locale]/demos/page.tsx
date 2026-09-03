'use client';

import { Alert, Button, ButtonLink, Card, EmptyState, FormField, Input, PageHeader, Select } from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

export default function DemosPage() {
  const t = useTranslations('demo');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
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
      setMessage(t('booked'));
      router.push(`/${locale}/demos/${demo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title={t('title')} description={t('noChat')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {message && (
          <Alert tone="success" className="mb-3">
            {message}
          </Alert>
        )}

        {role === 'STUDENT' && matchId && (
          <Card className="mb-8">
            <form onSubmit={book} className="space-y-3">
              <h2 className="font-medium text-ink">{t('book')}</h2>
              <FormField label={t('when')} id="demo-when">
                {(id) => (
                  <Input
                    id={id}
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                  />
                )}
              </FormField>
              <FormField label={t('duration')} id="demo-duration">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                  />
                )}
              </FormField>
              <FormField label={tp('online')} id="demo-mode">
                {(id) => (
                  <Select
                    id={id}
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="ONLINE">{tp('online')}</option>
                    <option value="OFFLINE">{tp('offline')}</option>
                  </Select>
                )}
              </FormField>
              <Button type="submit">{t('book')}</Button>
            </form>
          </Card>
        )}

        {!rows.length ? (
          <EmptyState title={t('empty')} />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink">
                      {new Date(r.scheduledAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {r.mode} · {r.status}
                    </p>
                  </div>
                  <ButtonLink
                    href={`/${locale}/demos/${r.id}`}
                    variant="link"
                    size="sm"
                  >
                    {tc('view')}
                  </ButtonLink>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
  );
}
