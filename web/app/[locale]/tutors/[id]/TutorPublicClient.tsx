'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import {
  Alert,
  Card,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { api, assetUrl } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type TutorPublic = {
  id: string;
  name: string;
  qualification?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  experienceYears?: number | null;
  teachingRadiusKm?: number | null;
  pincode?: string | null;
  isVerified?: boolean;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  subjects?: { nameEn: string; nameHi: string }[];
  classes?: { nameEn: string; nameHi: string }[];
  boards?: { nameEn: string; nameHi: string }[];
  availability?: { day: string; startTime: string; endTime: string; mode: string }[];
};

export default function TutorPublicClient() {
  const t = useTranslations('matching');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const [tutor, setTutor] = useState<TutorPublic | null>(null);
  const [error, setError] = useState('');

  const label = (item: { nameEn: string; nameHi: string }) =>
    locale === 'hi' ? item.nameHi : item.nameEn;

  useEffect(() => {
    api<TutorPublic>(`/tutors/${id}/public`)
      .then(setTutor)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-cream">
        <SiteHeader />
        <Alert className="m-8">{error}</Alert>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-cream">
        <SiteHeader />
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={tutor.name}
          actions={
            <Link
              href={`/${locale}/search`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {tc('back')}
            </Link>
          }
        />
        <Card>
          <div className="flex gap-4">
            {tutor.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(tutor.photoUrl)}
                alt={tutor.name}
                className="h-24 w-24 shrink-0 rounded-panel object-cover"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <VerifiedBadge
                  isVerified={tutor.isVerified}
                  ratingAvg={tutor.ratingAvg}
                  ratingCount={tutor.ratingCount}
                />
              </div>
              <p className="mt-1 text-ink-muted">{tutor.qualification}</p>
              <p className="text-sm text-ink-muted">{t('contactHidden')}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-ink">{tutor.bio}</p>
          <p className="mt-3 text-sm text-ink-muted">
            {tp('experience')}: {tutor.experienceYears ?? '—'} ·{' '}
            {tp('location')}: {tutor.teachingRadiusKm ?? '—'} km ·{' '}
            {tutor.pincode ?? ''}
          </p>
          <p className="mt-2 text-sm text-ink">
            {tp('subjects')}: {(tutor.subjects ?? []).map(label).join(', ') || '—'}
          </p>
          <p className="text-sm text-ink">
            {tp('classes')}: {(tutor.classes ?? []).map(label).join(', ') || '—'}
          </p>
          <p className="text-sm text-ink">
            {tp('boards')}: {(tutor.boards ?? []).map(label).join(', ') || '—'}
          </p>
          {(tutor.availability?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="font-medium text-ink">{tp('availability')}</p>
              <ul className="mt-1 space-y-0.5 text-sm text-ink-muted">
                {tutor.availability!.map((a, i) => (
                  <li key={i}>
                    {a.day} {a.startTime}-{a.endTime} ({a.mode})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
