'use client';

import { Alert, Button, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
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
    <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('mineTitle')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length && !error ? (
          <EmptyState title={t('mineTitle')} />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id}>
                <Card className="p-4">
                  <p className="font-medium text-ink">
                    {label(row.requirement.subject)} ·{' '}
                    {label(row.requirement.class)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {tc('status')}: {row.status} · ₹{row.requirement.budgetMin}–
                    {row.requirement.budgetMax}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <ButtonLink
                      href={`/${locale}/requirements/${row.requirement.id}`}
                      variant="link"
                      size="sm"
                    >
                      {tc('view')}
                    </ButtonLink>
                    {['APPLIED', 'INVITED'].includes(row.status) && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-danger"
                        onClick={() => withdraw(row.id)}
                      >
                        {tc('withdraw')}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
  );
}
