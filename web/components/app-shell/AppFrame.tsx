'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { StudentAppShell } from '@/components/app-shell/StudentAppShell';
import { TutorAppShell } from '@/components/app-shell/TutorAppShell';
import { getStoredUser } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export function AppFrame({ children }: { children: ReactNode }) {
  const tc = useTranslations('common');
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRole(getStoredUser()?.role ?? '');
  }, []);

  if (role === undefined) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  if (role === 'TUTOR') {
    return <TutorAppShell>{children}</TutorAppShell>;
  }

  if (role === 'STUDENT') {
    return <StudentAppShell>{children}</StudentAppShell>;
  }

  // ADMIN and unauthenticated: marketing header chrome
  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      {children}
    </div>
  );
}
