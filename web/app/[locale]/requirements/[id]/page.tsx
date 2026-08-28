'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  FormField,
  Input,
  PageHeader,
  Spinner,
  Textarea,
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
  scheduleDays: string[];
  scheduleTime?: string | null;
  durationMins: number;
  pincode?: string | null;
  notes?: string | null;
  subject?: { nameEn: string; nameHi: string };
  class?: { nameEn: string; nameHi: string };
  board?: { nameEn: string; nameHi: string };
};

export default function RequirementDetailPage() {
  const t = useTranslations('requirements');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const tp = useTranslations('profile');
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<Req | null>(null);
  const [role, setRole] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [fee, setFee] = useState(5000);

  const label = (item?: { nameEn: string; nameHi: string }) =>
    item ? (locale === 'hi' ? item.nameHi : item.nameEn) : '—';

  const load = (access: string) =>
    apiWithAuth<Req>(`/requirements/${id}`, access).then(setReq);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setRole(user.role);
    setToken(access);
    load(access).catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [id, locale, router]);

  const publish = async () => {
    try {
      await apiWithAuth(`/requirements/${id}/publish`, token, { method: 'POST' });
      setMessage(t('published'));
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const cancel = async () => {
    try {
      await apiWithAuth(`/requirements/${id}/cancel`, token, { method: 'POST' });
      setMessage(t('cancelled'));
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const markComplete = async () => {
    try {
      await apiWithAuth(`/requirements/${id}/complete`, token, { method: 'POST' });
      setMessage(t('completed'));
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const apply = async () => {
    try {
      await apiWithAuth('/matches/apply', token, {
        method: 'POST',
        body: JSON.stringify({
          requirementId: id,
          message: applyMsg || undefined,
          proposedFee: fee,
        }),
      });
      setMessage(tc('apply'));
      router.push(`/${locale}/matches/mine`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (!req) {
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
            <ButtonLink
              href={
                role === 'TUTOR'
                  ? `/${locale}/requirements/open`
                  : `/${locale}/requirements`
              }
              variant="link"
              size="sm"
            >
              {tc('back')}
            </ButtonLink>
          }
        />
        {error && <Alert className="mb-3">{error}</Alert>}
        {message && (
          <Alert tone="success" className="mb-3">
            {message}
          </Alert>
        )}
        <Card className="space-y-2">
          <p className="text-lg font-medium text-ink">
            {label(req.subject)} · {label(req.class)} · {label(req.board)}
          </p>
          <p className="text-ink">
            {tc('budget')}: ₹{req.budgetMin}–₹{req.budgetMax}/mo
          </p>
          <p className="text-ink">
            {tc('status')}: {req.status}
          </p>
          <p className="text-ink-muted">
            {req.mode} · {req.scheduleDays.join(', ')}{' '}
            {req.scheduleTime ? `@ ${req.scheduleTime}` : ''} ·{' '}
            {req.durationMins} min
          </p>
          {req.pincode && (
            <p className="text-ink-muted">
              {tp('pincode')}: {req.pincode}
            </p>
          )}
          {req.notes && <p className="text-ink-muted">{req.notes}</p>}
        </Card>

        {role === 'STUDENT' && (
          <div className="mt-6 flex flex-wrap gap-2">
            {req.status === 'DRAFT' && (
              <>
                <ButtonLink
                  href={`/${locale}/requirements/new?id=${req.id}`}
                  variant="secondary"
                >
                  {t('edit')}
                </ButtonLink>
                <Button type="button" onClick={publish}>
                  {tc('publish')}
                </Button>
              </>
            )}
            {['DRAFT', 'OPEN', 'APPLIED', 'SHORTLISTED', 'MATCHED'].includes(
              req.status,
            ) && (
              <Button type="button" variant="secondary" onClick={cancel}>
                {tc('cancel')}
              </Button>
            )}
            {['OPEN', 'APPLIED', 'SHORTLISTED'].includes(req.status) && (
              <>
                <ButtonLink href={`/${locale}/search?requirementId=${req.id}`}>
                  {tc('invite')} / {tc('search')}
                </ButtonLink>
                <ButtonLink
                  href={`/${locale}/matches/inbox?requirementId=${req.id}`}
                  variant="secondary"
                >
                  {td('applicationsInbox')}
                </ButtonLink>
              </>
            )}
            {req.status === 'ACTIVE' && (
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={markComplete}
              >
                {t('markComplete')}
              </Button>
            )}
          </div>
        )}

        {role === 'ADMIN' && req.status === 'ACTIVE' && (
          <Button
            type="button"
            className="mt-4 bg-emerald-700 hover:bg-emerald-800"
            onClick={markComplete}
          >
            {t('markComplete')}
          </Button>
        )}

        {role === 'TUTOR' &&
          ['OPEN', 'APPLIED', 'SHORTLISTED'].includes(req.status) && (
            <Card className="mt-6 space-y-3">
              <h2 className="font-medium text-ink">{tc('apply')}</h2>
              <FormField label={t('notes')} id="apply-msg">
                {(fid) => (
                  <Textarea
                    id={fid}
                    rows={3}
                    value={applyMsg}
                    onChange={(e) => setApplyMsg(e.target.value)}
                  />
                )}
              </FormField>
              <FormField label={tc('budget')} id="apply-fee">
                {(fid) => (
                  <Input
                    id={fid}
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value))}
                  />
                )}
              </FormField>
              <Button type="button" onClick={apply}>
                {tc('apply')}
              </Button>
            </Card>
          )}
      </main>
    </AppFrame>
  );
}
