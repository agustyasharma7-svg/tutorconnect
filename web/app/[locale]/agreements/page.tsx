'use client';

import { Alert, Button, ButtonLink, Card, EmptyState, FormField, Input, PageHeader, Select, Textarea } from '@/components/ui';
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
    <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('title')} />
        {error && <Alert className="mb-3">{error}</Alert>}

        {role === 'STUDENT' && matchId && (
          <Card className="mb-6">
            <form onSubmit={generate} className="space-y-3">
              <FormField label={t('fee')} id="agr-fee">
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value))}
                  />
                )}
              </FormField>
              <Button type="submit">{t('generate')}</Button>
            </form>
          </Card>
        )}

        {!rows.length ? (
          <EmptyState title={t('empty')} />
        ) : (
          <ul className="mb-8 space-y-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => open(r.id)}
                  >
                    <p className="font-medium text-ink">
                      {r.studentName} ↔ {r.tutorName}
                    </p>
                    <p className="text-sm text-ink-muted">
                      ₹{r.monthlyFee} · {r.status}
                    </p>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <Card className="space-y-3">
            <h2 className="text-xl font-semibold text-ink">{t('detail')}</h2>
            <p className="text-ink">
              {selected.studentName} ↔ {selected.tutorName}
            </p>
            <p className="text-ink">
              {t('fee')}: ₹{selected.monthlyFee} · {selected.status}
            </p>
            {selected.requirementStatus && (
              <p className="text-sm text-ink-muted">
                {t('requirement')}: {selected.requirementStatus}
              </p>
            )}
            <pre className="whitespace-pre-wrap rounded-control bg-cream p-3 text-sm text-ink">
              {selected.termsText}
            </pre>
            <p className="text-sm text-ink-muted">
              {t('studentSigned')}: {selected.studentSignedAt ?? '—'}
            </p>
            <p className="text-sm text-ink-muted">
              {t('tutorSigned')}: {selected.tutorSignedAt ?? '—'}
            </p>
            {!!selected.occupiedSlots?.length && (
              <div>
                <p className="font-medium text-ink">{t('slots')}</p>
                <ul className="text-sm text-ink-muted">
                  {selected.occupiedSlots.map((s) => (
                    <li key={s.id}>
                      {new Date(s.startAt).toLocaleString()} ({s.status})
                      {role === 'STUDENT' && s.status === 'OCCUPIED' && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="ml-2 text-danger"
                          onClick={() =>
                            apiWithAuth(`/schedules/slots/${s.id}/release`, token, {
                              method: 'POST',
                            }).then(() => open(selected.id))
                          }
                        >
                          {t('release')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {selected.status !== 'ACTIVE' &&
                selected.status !== 'COMPLETED' &&
                selected.status !== 'CANCELLED' && (
                  <Button type="button" onClick={sign}>
                    {selected.studentSignedAt && selected.tutorSignedAt
                      ? t('retryActivation')
                      : t('sign')}
                  </Button>
                )}
              {selected.pdfUrl && (
                <ButtonLink
                  href={selected.pdfUrl}
                  variant="secondary"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('download')}
                </ButtonLink>
              )}
              {(selected.status === 'ACTIVE' || selected.status === 'COMPLETED') && (
                <ButtonLink
                  href={`/${locale}/chat/${selected.id}`}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {tchat('openChat')}
                </ButtonLink>
              )}
              {(selected.status === 'ACTIVE' || selected.status === 'COMPLETED') && (
                <ButtonLink
                  href={`/${locale}/disputes?agreementId=${selected.id}`}
                  variant="secondary"
                >
                  {td('disputes')}
                </ButtonLink>
              )}
              {selected.requirementId &&
                selected.status === 'ACTIVE' &&
                role === 'STUDENT' && (
                  <ButtonLink
                    href={`/${locale}/requirements/${selected.requirementId}`}
                    variant="secondary"
                  >
                    {t('requirement')}
                  </ButtonLink>
                )}
            </div>

            {ratingInfo && (
              <div className="mt-4 border-t border-cream-dark pt-4">
                <h3 className="font-medium text-ink">{tr('title')}</h3>
                {ratingInfo.requirementStatus !== 'COMPLETED' && (
                  <p className="mt-1 text-sm text-ink-muted">{tr('gate')}</p>
                )}
                {ratingInfo.requirementStatus === 'COMPLETED' &&
                  ratingInfo.myRating && (
                    <Alert tone="success" className="mt-2">
                      {tr('already')}: {ratingInfo.myRating.score} ★
                      {ratingInfo.myRating.review
                        ? ` — ${ratingInfo.myRating.review}`
                        : ''}
                    </Alert>
                  )}
                {ratingInfo.requirementStatus === 'COMPLETED' &&
                  !ratingInfo.myRating && (
                    <form onSubmit={submitRating} className="mt-3 space-y-2">
                      <FormField label={tr('score')} id="rating-score">
                        {(id) => (
                          <Select
                            id={id}
                            value={score}
                            onChange={(e) => setScore(Number(e.target.value))}
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </Select>
                        )}
                      </FormField>
                      <FormField label={tr('review')} id="rating-review">
                        {(id) => (
                          <Textarea
                            id={id}
                            rows={2}
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                          />
                        )}
                      </FormField>
                      <Button type="submit">{tr('submit')}</Button>
                    </form>
                  )}
              </div>
            )}
          </Card>
        )}

        {role && (
          <Link
            href={`/${locale}/dashboard/${role.toLowerCase()}`}
            className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
          >
            {tc('back')}
          </Link>
        )}
      </main>
  );
}
