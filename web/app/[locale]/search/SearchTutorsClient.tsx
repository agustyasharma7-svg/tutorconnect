'use client';

import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Alert, Button, ButtonLink, Card, EmptyState, FormField, Input, PageHeader, Select } from '@/components/ui';
import { api, apiWithAuth, assetUrl } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { readBrowserPosition } from '@/lib/geo';
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

export default function SearchTutorsClient() {
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
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
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
    if (filters.latitude != null) q.set('latitude', String(filters.latitude));
    if (filters.longitude != null) q.set('longitude', String(filters.longitude));
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
    <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title={t('searchTitle')} />
        {error && <Alert className="mb-3">{error}</Alert>}
        {message && (
          <Alert tone="success" className="mb-3">
            {message}
          </Alert>
        )}

        <Card className="mb-6">
          <form onSubmit={search} className="space-y-3">
            <FormField label={tp('subjects')} id="search-subject">
              {(id) => (
                <Select
                  id={id}
                  value={filters.subjectId}
                  onChange={(e) =>
                    setFilters({ ...filters, subjectId: e.target.value })
                  }
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label={tp('classes')} id="search-class">
              {(id) => (
                <Select
                  id={id}
                  value={filters.classId}
                  onChange={(e) =>
                    setFilters({ ...filters, classId: e.target.value })
                  }
                >
                  {classes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label={tp('boards')} id="search-board">
              {(id) => (
                <Select
                  id={id}
                  value={filters.boardId}
                  onChange={(e) =>
                    setFilters({ ...filters, boardId: e.target.value })
                  }
                >
                  {boards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label={tc('both')} id="search-mode">
              {(id) => (
                <Select
                  id={id}
                  value={filters.mode}
                  onChange={(e) =>
                    setFilters({ ...filters, mode: e.target.value })
                  }
                >
                  <option value="ONLINE">{tp('online')}</option>
                  <option value="OFFLINE">{tp('offline')}</option>
                  <option value="BOTH">{tc('both')}</option>
                </Select>
              )}
            </FormField>
            <FormField label={tp('pincode')} id="search-pincode">
              {(id) => (
                <Input
                  id={id}
                  value={filters.pincode}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      pincode: e.target.value,
                      latitude: undefined,
                      longitude: undefined,
                    })
                  }
                  inputMode="numeric"
                  maxLength={6}
                />
              )}
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const browser = await readBrowserPosition();
                  if (!browser) {
                    setError('Could not read device location');
                    return;
                  }
                  setFilters({
                    ...filters,
                    latitude: browser.latitude,
                    longitude: browser.longitude,
                  });
                }}
              >
                Use my location
              </Button>
              <Button type="submit">{tc('search')}</Button>
            </div>
            {filters.latitude != null && filters.longitude != null && (
              <p className="text-xs text-ink-muted">
                Origin: {filters.latitude.toFixed(5)}, {filters.longitude.toFixed(5)}
              </p>
            )}
          </form>
        </Card>

        <h2 className="mb-3 text-sm font-semibold text-ink">{t('results')}</h2>
        {!results.length ? (
          <EmptyState title={t('noResults')} />
        ) : (
          <ul className="space-y-3">
            {results.map((tutor) => (
              <li key={tutor.id}>
                <Card className="flex gap-4 p-4">
                  {tutor.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assetUrl(tutor.photoUrl)}
                      alt={tutor.name}
                      className="h-16 w-16 shrink-0 rounded-control object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{tutor.name}</p>
                      <VerifiedBadge
                        compact
                        isVerified={tutor.isVerified}
                        ratingAvg={tutor.ratingAvg}
                        ratingCount={tutor.ratingCount}
                      />
                    </div>
                    <p className="line-clamp-2 text-sm text-ink-muted">
                      {tutor.bio}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t('score')}: {tutor.score ?? '—'}
                      {tutor.distanceKm != null
                        ? ` · ${t('distance')}: ${tutor.distanceKm.toFixed(1)} km`
                        : ''}
                    </p>
                    <div className="mt-2 flex gap-3">
                      <ButtonLink
                        href={`/${locale}/tutors/${tutor.id}`}
                        variant="link"
                        size="sm"
                      >
                        {tc('view')}
                      </ButtonLink>
                      {requirementId && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => invite(tutor.id)}
                        >
                          {tc('invite')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
  );
}
