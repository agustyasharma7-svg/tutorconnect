'use client';

import { Alert, Button, ButtonLink, Card, PageHeader } from '@/components/ui';
import { apiWithAuth, assetUrl } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type InboxItem = {
  id: string;
  status: string;
  score: number;
  application?: { message?: string | null; proposedFee?: number | null } | null;
  tutor: { id: string; name: string; photoUrl?: string | null; bio?: string | null };
  requirement: { id: string; status: string };
};

export default function InboxPage() {
  const t = useTranslations('matching');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const requirementId = params.get('requirementId') ?? undefined;
  const [rows, setRows] = useState<InboxItem[]>([]);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = (access: string) => {
    const q = requirementId ? `?requirementId=${requirementId}` : '';
    return apiWithAuth<InboxItem[]>(`/matches/inbox${q}`, access).then(setRows);
  };

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'STUDENT') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [locale, requirementId, router]);

  const act = async (id: string, action: 'shortlist' | 'reject') => {
    try {
      await apiWithAuth(`/matches/${id}/${action}`, token, { method: 'PATCH' });
      setMessage(action);
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('inboxTitle')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {message && <Alert tone="success" className="mb-3">{message}</Alert>}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Card className="p-4">
                <div className="flex gap-3">
                  {row.tutor.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assetUrl(row.tutor.photoUrl)}
                      alt={row.tutor.name}
                      className="h-14 w-14 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-ink">{row.tutor.name}</p>
                    <p className="text-sm text-ink-muted">
                      {tc('status')}: {row.status} · {t('score')}: {row.score}
                    </p>
                    {row.application?.proposedFee != null && (
                      <p className="text-sm">
                        {t('proposedFee')}: ₹{row.application.proposedFee}
                      </p>
                    )}
                    {row.application?.message && (
                      <p className="text-sm text-ink-muted">
                        {row.application.message}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <ButtonLink
                        href={`/${locale}/tutors/${row.tutor.id}`}
                        variant="link"
                        size="sm"
                      >
                        {tc('view')}
                      </ButtonLink>
                      {['APPLIED', 'INVITED'].includes(row.status) && (
                        <>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => act(row.id, 'shortlist')}
                          >
                            {tc('shortlist')}
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="text-danger"
                            onClick={() => act(row.id, 'reject')}
                          >
                            {tc('reject')}
                          </Button>
                        </>
                      )}
                      {row.status === 'SHORTLISTED' && (
                        <>
                          <ButtonLink
                            href={`/${locale}/demos?matchId=${row.id}`}
                            variant="link"
                            size="sm"
                          >
                            {t('bookDemo')}
                          </ButtonLink>
                          <ButtonLink
                            href={`/${locale}/agreements?matchId=${row.id}`}
                            variant="link"
                            size="sm"
                          >
                            {t('generateAgreement')}
                          </ButtonLink>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </main>
  );
}
