'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth, assetUrl } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
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
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('inboxTitle')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex gap-3">
                {row.tutor.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(row.tutor.photoUrl)}
                    alt=""
                    className="h-14 w-14 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{row.tutor.name}</p>
                  <p className="text-sm text-gray-600">
                    {tc('status')}: {row.status} · {t('score')}: {row.score}
                  </p>
                  {row.application?.proposedFee != null && (
                    <p className="text-sm">
                      {t('proposedFee')}: ₹{row.application.proposedFee}
                    </p>
                  )}
                  {row.application?.message && (
                    <p className="text-sm text-gray-600">{row.application.message}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={`/${locale}/tutors/${row.tutor.id}`}
                      className="text-blue-600"
                    >
                      {tc('view')}
                    </Link>
                    {['APPLIED', 'INVITED'].includes(row.status) && (
                      <>
                        <button
                          type="button"
                          className="text-blue-600"
                          onClick={() => act(row.id, 'shortlist')}
                        >
                          {tc('shortlist')}
                        </button>
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={() => act(row.id, 'reject')}
                        >
                          {tc('reject')}
                        </button>
                      </>
                    )}
                    {row.status === 'SHORTLISTED' && (
                      <>
                        <Link
                          href={`/${locale}/demos?matchId=${row.id}`}
                          className="text-blue-600"
                        >
                          {t('bookDemo')}
                        </Link>
                        <Link
                          href={`/${locale}/agreements?matchId=${row.id}`}
                          className="text-blue-600"
                        >
                          {t('generateAgreement')}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
