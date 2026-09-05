'use client';

import { ButtonLink, Card, PageHeader, PageSkeleton } from '@/components/ui';
import { getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function StudentDashboard() {
  const t = useTranslations('dashboard');
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

  if (!user) {
    return (
      <PageSkeleton />
    );
  }

  const actions = [
    { href: `/${locale}/profile/student`, label: t('editProfile'), variant: 'primary' as const },
    { href: `/${locale}/requirements/new`, label: t('postRequirement'), variant: 'secondary' as const },
    { href: `/${locale}/requirements`, label: t('myRequirements'), variant: 'secondary' as const },
    { href: `/${locale}/search`, label: t('findTutors'), variant: 'secondary' as const },
    { href: `/${locale}/matches/inbox`, label: t('applicationsInbox'), variant: 'secondary' as const },
    { href: `/${locale}/demos`, label: t('demos'), variant: 'secondary' as const },
    { href: `/${locale}/agreements`, label: t('agreements'), variant: 'secondary' as const },
    { href: `/${locale}/chat`, label: t('chat'), variant: 'secondary' as const },
    { href: `/${locale}/disputes`, label: t('disputes'), variant: 'secondary' as const },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader
          title={t('student')}
          description={t('welcome', { name: user.name })}
        />
        <Card>
          <p className="text-sm text-ink-muted">{t('phase1')}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((a) => (
              <ButtonLink key={a.href} href={a.href} variant={a.variant} size="sm">
                {a.label}
              </ButtonLink>
            ))}
          </div>
        </Card>
      </main>
  );
}
