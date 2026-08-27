'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { VerifiedBadge } from '@/components/VerifiedBadge';
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

export default function PublicTutorPage() {
  const t = useTranslations('matching');
  const tc = useTranslations('common');
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

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!tutor) return <p className="p-8">{tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/${locale}/search`} className="text-sm text-blue-600">
          {tc('back')}
        </Link>
        <div className="mt-4 rounded-lg bg-white p-6 shadow">
          <div className="flex gap-4">
            {tutor.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(tutor.photoUrl)}
                alt=""
                className="h-24 w-24 rounded object-cover"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{tutor.name}</h1>
                <VerifiedBadge
                  isVerified={tutor.isVerified}
                  ratingAvg={tutor.ratingAvg}
                  ratingCount={tutor.ratingCount}
                />
              </div>
              <p className="text-gray-600">{tutor.qualification}</p>
              <p className="text-sm text-gray-500">{t('contactHidden')}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap">{tutor.bio}</p>
          <p className="mt-3 text-sm">
            Experience: {tutor.experienceYears ?? '—'} yrs · Radius:{' '}
            {tutor.teachingRadiusKm ?? '—'} km · {tutor.pincode ?? ''}
          </p>
          <p className="mt-2 text-sm">
            Subjects: {(tutor.subjects ?? []).map(label).join(', ')}
          </p>
          <p className="text-sm">
            Classes: {(tutor.classes ?? []).map(label).join(', ')}
          </p>
          <p className="text-sm">
            Boards: {(tutor.boards ?? []).map(label).join(', ')}
          </p>
          {(tutor.availability?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="font-medium">Availability</p>
              <ul className="mt-1 text-sm text-gray-600">
                {tutor.availability!.map((a, i) => (
                  <li key={i}>
                    {a.day} {a.startTime}-{a.endTime} ({a.mode})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
