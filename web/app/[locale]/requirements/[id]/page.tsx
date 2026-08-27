'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
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
      setMessage('Applied');
      router.push(`/${locale}/matches/mine`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (!req) return <p className="p-8">{tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('detail')}</h1>
          <Link
            href={
              role === 'TUTOR'
                ? `/${locale}/requirements/open`
                : `/${locale}/requirements`
            }
            className="text-sm text-blue-600"
          >
            {tc('back')}
          </Link>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}
        <div className="space-y-2 rounded-lg bg-white p-6 shadow">
          <p className="text-lg font-medium">
            {label(req.subject)} · {label(req.class)} · {label(req.board)}
          </p>
          <p>
            {tc('budget')}: ₹{req.budgetMin}–₹{req.budgetMax}/mo
          </p>
          <p>
            {tc('status')}: {req.status}
          </p>
          <p>
            Mode: {req.mode} · {req.scheduleDays.join(', ')}{' '}
            {req.scheduleTime ? `@ ${req.scheduleTime}` : ''} · {req.durationMins} min
          </p>
          {req.pincode && <p>Pincode: {req.pincode}</p>}
          {req.notes && <p className="text-gray-600">{req.notes}</p>}
        </div>

        {role === 'STUDENT' && (
          <div className="mt-6 flex flex-wrap gap-3">
            {req.status === 'DRAFT' && (
              <>
                <Link
                  href={`/${locale}/requirements/new?id=${req.id}`}
                  className="rounded border px-4 py-2"
                >
                  {t('edit')}
                </Link>
                <button
                  type="button"
                  onClick={publish}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  {tc('publish')}
                </button>
              </>
            )}
            {['DRAFT', 'OPEN', 'APPLIED', 'SHORTLISTED', 'MATCHED'].includes(
              req.status,
            ) && (
              <button type="button" onClick={cancel} className="rounded border px-4 py-2">
                {tc('cancel')}
              </button>
            )}
            {['OPEN', 'APPLIED', 'SHORTLISTED'].includes(req.status) && (
              <>
                <Link
                  href={`/${locale}/search?requirementId=${req.id}`}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  {tc('invite')} / {tc('search')}
                </Link>
                <Link
                  href={`/${locale}/matches/inbox?requirementId=${req.id}`}
                  className="rounded border px-4 py-2"
                >
                  Inbox
                </Link>
              </>
            )}
            {req.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={markComplete}
                className="rounded bg-emerald-700 px-4 py-2 text-white"
              >
                {t('markComplete')}
              </button>
            )}
          </div>
        )}

        {role === 'ADMIN' && req.status === 'ACTIVE' && (
          <button
            type="button"
            onClick={markComplete}
            className="mt-4 rounded bg-emerald-700 px-4 py-2 text-white"
          >
            {t('markComplete')}
          </button>
        )}

        {role === 'TUTOR' &&
          ['OPEN', 'APPLIED', 'SHORTLISTED'].includes(req.status) && (
            <div className="mt-6 space-y-3 rounded-lg bg-white p-6 shadow">
              <h2 className="font-medium">{tc('apply')}</h2>
              <textarea
                className="w-full rounded border px-3 py-2"
                rows={3}
                value={applyMsg}
                onChange={(e) => setApplyMsg(e.target.value)}
              />
              <input
                type="number"
                className="w-full rounded border px-3 py-2"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
              <button
                type="button"
                onClick={apply}
                className="rounded bg-blue-600 px-4 py-2 text-white"
              >
                {tc('apply')}
              </button>
            </div>
          )}
      </main>
    </>
  );
}
