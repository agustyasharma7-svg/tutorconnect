'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function StudentDashboard() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (stored.role !== 'STUDENT') {
      router.replace(`/${locale}/dashboard/${stored.role.toLowerCase()}`);
      return;
    }
    setUser(stored);
  }, [locale, router]);

  if (!user) return <p className="p-8">{tc('loading')}</p>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('student')}</h1>
          <button
            onClick={() => {
              clearAuth();
              router.push(`/${locale}/auth/login`);
            }}
            className="text-sm text-red-600 underline"
          >
            {tc('logout')}
          </button>
        </div>
        <p className="mt-4 text-lg">{t('welcome', { name: user.name })}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/profile/student`}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            {t('editProfile')}
          </Link>
          <Link
            href={`/${locale}/requirements`}
            className="rounded border px-4 py-2"
          >
            {t('myRequirements')}
          </Link>
          <Link
            href={`/${locale}/requirements/new`}
            className="rounded border px-4 py-2"
          >
            {t('postRequirement')}
          </Link>
          <Link href={`/${locale}/search`} className="rounded border px-4 py-2">
            {t('findTutors')}
          </Link>
          <Link
            href={`/${locale}/matches/inbox`}
            className="rounded border px-4 py-2"
          >
            {t('applicationsInbox')}
          </Link>
          <Link href={`/${locale}/demos`} className="rounded border px-4 py-2">
            {t('demos')}
          </Link>
          <Link href={`/${locale}/agreements`} className="rounded border px-4 py-2">
            {t('agreements')}
          </Link>
          <Link href={`/${locale}/chat`} className="rounded border px-4 py-2">
            {t('chat')}
          </Link>
          <Link href={`/${locale}/disputes`} className="rounded border px-4 py-2">
            {t('disputes')}
          </Link>
        </div>
      </main>
    </>
  );
}
