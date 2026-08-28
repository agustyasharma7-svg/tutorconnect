'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
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

  if (!demo) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  return (
    <AppFrame>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={t('detail')}
          actions={
            <ButtonLink href={`/${locale}/demos`} variant="link" size="sm">
              {tc('back')}
            </ButtonLink>
          }
        />
        {error && <Alert className="mb-3">{error}</Alert>}
        <Card className="space-y-2">
          <p className="text-ink">
            {demo.tutorName} · {demo.studentName}
          </p>
          <p className="text-ink">
            {new Date(demo.scheduledAt).toLocaleString()} · {demo.durationMins}{' '}
            min
          </p>
          <p className="text-ink">
            {demo.mode} · {demo.status}
          </p>
          <p className="text-sm text-ink-muted">{tm('contactHidden')}</p>
          <div className="rounded-control bg-cream p-3 text-sm">
            <p className="font-medium text-ink">{t('join')}</p>
            <p className="text-ink-muted">{demo.joinDetails}</p>
          </div>
        </Card>
        {demo.status === 'SCHEDULED' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setStatus('COMPLETED')}>
              {t('complete')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStatus('CANCELLED')}
            >
              {t('cancelDemo')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border-amber-600 text-amber-800"
              onClick={() => setStatus('NO_SHOW')}
            >
              {t('noShow')}
            </Button>
            <ButtonLink
              href={`/${locale}/agreements?matchId=${demo.matchId}`}
              variant="secondary"
            >
              {t('agreement')}
            </ButtonLink>
          </div>
        )}
      </main>
    </AppFrame>
  );
}
