'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type Agr = {
  id: string;
  status: string;
  monthlyFee: number;
  termsText: string;
  pdfUrl?: string | null;
  studentSignedAt?: string | null;
  tutorSignedAt?: string | null;
  studentName: string;
  tutorName: string;
  requirementId?: string;
  requirementStatus?: string;
  occupiedSlots?: { id: string; startAt: string; endAt: string; status: string }[];
};

type RatingInfo = {
  requirementStatus: string;
  agreementStatus: string;
  myRating: { score: number; review?: string | null } | null;
  ratings: { id: string; score: number; review?: string | null }[];
};

export default function AgreementsPage() {
  const t = useTranslations('agreement');
  const tr = useTranslations('ratings');
  const tchat = useTranslations('chat');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const matchId = params.get('matchId');
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [rows, setRows] = useState<Agr[]>([]);
  const [selected, setSelected] = useState<Agr | null>(null);
  const [fee, setFee] = useState(5000);
  const [error, setError] = useState('');
  const [ratingInfo, setRatingInfo] = useState<RatingInfo | null>(null);
  const [score, setScore] = useState(5);
  const [review, setReview] = useState('');

  const load = (access: string) =>
    apiWithAuth<Agr[]>('/agreements', access).then(setRows);

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

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    if (!matchId) return;
    try {
      const agr = await apiWithAuth<Agr>('/agreements/generate', token, {
        method: 'POST',
        body: JSON.stringify({ matchId, monthlyFee: fee }),
      });
      setSelected(agr);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const open = async (id: string) => {
    try {
      const agr = await apiWithAuth<Agr>(`/agreements/${id}`, token);
      setSelected(agr);
      const info = await apiWithAuth<RatingInfo>(`/ratings/agreement/${id}`, token);
      setRatingInfo(info);
      setScore(5);
      setReview('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const sign = async () => {
    if (!selected) return;
    try {
      const agr = await apiWithAuth<Agr>(`/agreements/${selected.id}/sign`, token, {
        method: 'POST',
        body: JSON.stringify({ acknowledge: 'yes' }),
      });
      setSelected(agr);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const submitRating = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await apiWithAuth('/ratings', token, {
        method: 'POST',
        body: JSON.stringify({
          agreementId: selected.id,
          score,
          review: review.trim() || undefined,
        }),
      });
      await open(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('title')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {role === 'STUDENT' && matchId && (
          <form onSubmit={generate} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow">
            <label className="block text-sm">
              {t('fee')}
              <input
                type="number"
                className="mt-1 w-full rounded border px-3 py-2"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
              />
            </label>
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
              Generate
            </button>
          </form>
        )}

        {!rows.length && <p className="text-gray-600">{t('empty')}</p>}
        <ul className="mb-8 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-4 shadow">
              <button type="button" className="w-full text-left" onClick={() => open(r.id)}>
                <p className="font-medium">
                  {r.studentName} ↔ {r.tutorName}
                </p>
                <p className="text-sm text-gray-600">
                  ₹{r.monthlyFee} · {r.status}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="space-y-3 rounded-lg bg-white p-6 shadow">
            <h2 className="text-xl font-bold">{t('detail')}</h2>
            <p>
              {selected.studentName} ↔ {selected.tutorName}
            </p>
            <p>
              {t('fee')}: ₹{selected.monthlyFee} · {selected.status}
            </p>
            {selected.requirementStatus && (
              <p className="text-sm text-gray-600">
                Requirement: {selected.requirementStatus}
              </p>
            )}
            <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
              {selected.termsText}
            </pre>
            <p className="text-sm">
              {t('studentSigned')}: {selected.studentSignedAt ?? '—'}
            </p>
            <p className="text-sm">
              {t('tutorSigned')}: {selected.tutorSignedAt ?? '—'}
            </p>
            {!!selected.occupiedSlots?.length && (
              <div>
                <p className="font-medium">{t('slots')}</p>
                <ul className="text-sm text-gray-600">
                  {selected.occupiedSlots.map((s) => (
                    <li key={s.id}>
                      {new Date(s.startAt).toLocaleString()} ({s.status})
                      {role === 'STUDENT' && s.status === 'OCCUPIED' && (
                        <button
                          type="button"
                          className="ml-2 text-red-600"
                          onClick={() =>
                            apiWithAuth(`/schedules/slots/${s.id}/release`, token, {
                              method: 'POST',
                            }).then(() => open(selected.id))
                          }
                        >
                          Release
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {selected.status !== 'ACTIVE' &&
                selected.status !== 'COMPLETED' &&
                selected.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={sign}
                    className="rounded bg-blue-600 px-4 py-2 text-white"
                  >
                    {t('sign')}
                  </button>
                )}
              {selected.pdfUrl && (
                <a
                  href={selected.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border px-4 py-2"
                >
                  {t('download')}
                </a>
              )}
              {(selected.status === 'ACTIVE' || selected.status === 'COMPLETED') && (
                <Link
                  href={`/${locale}/chat/${selected.id}`}
                  className="rounded bg-emerald-700 px-4 py-2 text-white"
                >
                  {tchat('openChat')}
                </Link>
              )}
              {(selected.status === 'ACTIVE' || selected.status === 'COMPLETED') && (
                <Link
                  href={`/${locale}/disputes?agreementId=${selected.id}`}
                  className="rounded border px-4 py-2"
                >
                  {td('disputes')}
                </Link>
              )}
              {selected.requirementId && selected.status === 'ACTIVE' && role === 'STUDENT' && (
                <Link
                  href={`/${locale}/requirements/${selected.requirementId}`}
                  className="rounded border px-4 py-2"
                >
                  Requirement
                </Link>
              )}
            </div>

            {ratingInfo && (
              <div className="mt-4 border-t pt-4">
                <h3 className="font-medium">{tr('title')}</h3>
                {ratingInfo.requirementStatus !== 'COMPLETED' && (
                  <p className="mt-1 text-sm text-gray-600">{tr('gate')}</p>
                )}
                {ratingInfo.requirementStatus === 'COMPLETED' && ratingInfo.myRating && (
                  <p className="mt-1 text-sm text-green-700">
                    {tr('already')}: {ratingInfo.myRating.score} ★
                    {ratingInfo.myRating.review ? ` — ${ratingInfo.myRating.review}` : ''}
                  </p>
                )}
                {ratingInfo.requirementStatus === 'COMPLETED' && !ratingInfo.myRating && (
                  <form onSubmit={submitRating} className="mt-3 space-y-2">
                    <label className="block text-sm">
                      {tr('score')}
                      <select
                        className="mt-1 w-full rounded border px-3 py-2"
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      className="w-full rounded border px-3 py-2"
                      rows={2}
                      placeholder={tr('review')}
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                    />
                    <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
                      {tr('submit')}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
        <Link
          href={`/${locale}/dashboard/${role.toLowerCase()}`}
          className="mt-6 inline-block text-sm text-blue-600"
        >
          {tc('back')}
        </Link>
      </main>
    </>
  );
}
