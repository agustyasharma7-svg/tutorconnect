'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function TutorDashboard() {
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
    if (stored.role !== 'TUTOR') {
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
          <h1 className="text-2xl font-bold">{t('tutor')}</h1>
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
            href={`/${locale}/profile/tutor`}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            {t('completeProfile')}
          </Link>
          <Link
            href={`/${locale}/verification`}
            className="rounded border px-4 py-2"
          >
            {t('verification')}
          </Link>
          <Link
            href={`/${locale}/requirements/open`}
            className="rounded border px-4 py-2"
          >
            {t('openRequirements')}
          </Link>
          <Link
            href={`/${locale}/matches/mine`}
            className="rounded border px-4 py-2"
          >
            {t('myApplications')}
          </Link>
          <Link href={`/${locale}/demos`} className="rounded border px-4 py-2">
            {t('demos')}
          </Link>
          <Link href={`/${locale}/schedule`} className="rounded border px-4 py-2">
            {t('calendar')}
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
          <Link href={`/${locale}/commissions`} className="rounded border px-4 py-2">
            {t('commissions')}
          </Link>
          <Link
            href={`/${locale}/payments/registration`}
            className="rounded border px-4 py-2"
          >
            {t('payRegistration')}
          </Link>
        </div>
      </main>
    </>
  );
}
