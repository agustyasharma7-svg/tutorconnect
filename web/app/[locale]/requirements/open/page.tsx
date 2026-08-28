'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from '@/components/ui';
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
    <AppFrame>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('openTitle')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {!rows.length && !error ? (
          <EmptyState title={t('openTitle')} />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="flex justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink">
                      {label(r.subject)} · {label(r.class)} · {label(r.board)}
                    </p>
                    <p className="text-sm text-ink-muted">
                      ₹{r.budgetMin}–₹{r.budgetMax} · {r.mode} · {r.status}
                    </p>
                  </div>
                  <ButtonLink
                    href={`/${locale}/requirements/${r.id}`}
                    variant="link"
                    size="sm"
                  >
                    {tc('apply')}
                  </ButtonLink>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppFrame>
  );
}
