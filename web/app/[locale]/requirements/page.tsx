'use client';

import { Alert, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
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
    <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          title={t('title')}
          actions={
            <ButtonLink href={`/${locale}/requirements/new`} size="sm">
              {t('new')}
            </ButtonLink>
          }
        />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length && !error ? (
          <EmptyState
            title={t('empty')}
            action={
              <ButtonLink href={`/${locale}/requirements/new`} size="sm">
                {t('new')}
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink">
                      {label(r.subject)} · {label(r.class)} · {label(r.board)}
                    </p>
                    <p className="text-sm text-ink-muted">
                      ₹{r.budgetMin}–₹{r.budgetMax}/mo · {r.mode}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-ink-muted">
                      {tc('status')}: {r.status}
                    </p>
                  </div>
                  <ButtonLink
                    href={`/${locale}/requirements/${r.id}`}
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
