'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { apiWithAuth } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type TutorMe = {
  completeness?: { score: number; isComplete?: boolean };
};

export default function TutorDashboard() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    const token = getAccessToken();
    if (!stored || !token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (stored.role !== 'TUTOR') {
      router.replace(`/${locale}/dashboard/${stored.role.toLowerCase()}`);
      return;
    }
    setUser(stored);
    apiWithAuth<TutorMe>('/tutors/me', token)
      .then((me) => {
        setProfileComplete(
          Boolean(me.completeness?.isComplete || me.completeness?.score === 100),
        );
      })
      .catch(() => {
        setProfileComplete(false);
      });
  }, [locale, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  const cards = [
    {
      href: `/${locale}/profile/tutor`,
      title: t('profile'),
      body: profileComplete ? t('editProfile') : t('completeProfile'),
      badge: profileComplete ? tp('profileComplete') : null,
    },
    {
      href: `/${locale}/requirements/open`,
      title: t('openRequirements'),
      body: t('overviewWorkHint'),
      badge: null,
    },
    {
      href: `/${locale}/schedule`,
      title: t('calendar'),
      body: t('overviewCalendarHint'),
      badge: null,
    },
    {
      href: `/${locale}/settings`,
      title: t('settings'),
      body: t('settingsLead'),
      badge: null,
    },
  ];

  return (
    <AppFrame>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title={t('welcome', { name: user.name })}
          description={
            profileComplete ? t('phase1Complete') : t('phase1')
          }
          actions={
            profileComplete ? (
              <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                {tp('profileComplete')}
              </span>
            ) : undefined
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="block">
              <Card className="h-full transition hover:border-brand/40">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-ink">{card.title}</h2>
                  {card.badge && (
                    <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{card.body}</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </AppFrame>
  );
}
