'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { api, apiWithAuth, assetUrl } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';

type CatalogItem = { id: string; nameEn: string; nameHi: string };
type TutorCard = {
  id: string;
  name: string;
  bio?: string | null;
  photoUrl?: string | null;
  experienceYears?: number | null;
  score?: number;
  distanceKm?: number | null;
  isVerified?: boolean;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  subjects?: CatalogItem[];
};

export default function SearchTutorsPage() {
  const t = useTranslations('matching');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const requirementId = params.get('requirementId');

  const [token, setToken] = useState('');
  const [subjects, setSubjects] = useState<CatalogItem[]>([]);
  const [classes, setClasses] = useState<CatalogItem[]>([]);
  const [boards, setBoards] = useState<CatalogItem[]>([]);
  const [filters, setFilters] = useState({
    subjectId: '',
    classId: '',
    boardId: '',
    mode: 'BOTH',
    pincode: '',
  });
  const [results, setResults] = useState<TutorCard[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const label = (item: CatalogItem) => (locale === 'hi' ? item.nameHi : item.nameEn);

  useEffect(() => {
    const user = getStoredUser();
    const access = getAccessToken();
    if (!user || !access || user.role !== 'STUDENT') {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setToken(access);
    Promise.all([
      api<CatalogItem[]>('/catalog/subjects'),
      api<CatalogItem[]>('/catalog/classes'),
      api<CatalogItem[]>('/catalog/boards'),
    ]).then(([s, c, b]) => {
      setSubjects(s);
      setClasses(c);
      setBoards(b);
      setFilters((f) => ({
        ...f,
        subjectId: s[0]?.id ?? '',
        classId: c[0]?.id ?? '',
        boardId: b[0]?.id ?? '',
      }));
    });
  }, [locale, router]);

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    const q = new URLSearchParams();
    if (filters.subjectId) q.set('subjectId', filters.subjectId);
    if (filters.classId) q.set('classId', filters.classId);
    if (filters.boardId) q.set('boardId', filters.boardId);
    if (filters.mode) q.set('mode', filters.mode);
    if (filters.pincode) q.set('pincode', filters.pincode);
    try {
      const rows = await apiWithAuth<TutorCard[]>(`/search/tutors?${q}`, token);
      setResults(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const invite = async (tutorId: string) => {
    if (!requirementId) {
      setError('Open a requirement detail and invite from there');
      return;
    }
    try {
      await apiWithAuth('/matches/invite', token, {
        method: 'POST',
        body: JSON.stringify({ requirementId, tutorId }),
      });
      setMessage(t('invited'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-bold">{t('searchTitle')}</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 text-sm text-green-700">{message}</p>}
        <form onSubmit={search} className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow">
          <select
            className="w-full rounded border px-3 py-2"
            value={filters.subjectId}
            onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={filters.classId}
            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
          >
            {classes.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={filters.boardId}
            onChange={(e) => setFilters({ ...filters, boardId: e.target.value })}
          >
            {boards.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={filters.mode}
            onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
          >
            <option value="ONLINE">{tp('online')}</option>
            <option value="OFFLINE">{tp('offline')}</option>
            <option value="BOTH">{tc('both')}</option>
          </select>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder={tp('pincode')}
            value={filters.pincode}
            onChange={(e) => setFilters({ ...filters, pincode: e.target.value })}
          />
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
            {tc('search')}
          </button>
        </form>

        <h2 className="mb-3 font-medium">{t('results')}</h2>
        {!results.length && <p className="text-gray-600">{t('noResults')}</p>}
        <ul className="space-y-3">
          {results.map((tutor) => (
            <li key={tutor.id} className="flex gap-4 rounded-lg bg-white p-4 shadow">
              {tutor.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(tutor.photoUrl)}
                  alt=""
                  className="h-16 w-16 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{tutor.name}</p>
                  <VerifiedBadge
                    compact
                    isVerified={tutor.isVerified}
                    ratingAvg={tutor.ratingAvg}
                    ratingCount={tutor.ratingCount}
                  />
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{tutor.bio}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {t('score')}: {tutor.score ?? '—'}
                  {tutor.distanceKm != null
                    ? ` · ${t('distance')}: ${tutor.distanceKm.toFixed(1)} km`
                    : ''}
                </p>
                <div className="mt-2 flex gap-3 text-sm">
                  <Link
                    href={`/${locale}/tutors/${tutor.id}`}
                    className="text-blue-600"
                  >
                    {tc('view')}
                  </Link>
                  {requirementId && (
                    <button
                      type="button"
                      className="text-blue-600"
                      onClick={() => invite(tutor.id)}
                    >
                      {tc('invite')}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
