'use client';

import { SiteHeader } from '@/components/SiteHeader';
import { AdminAppShell } from '@/components/app-shell/AdminAppShell';
import { StudentAppShell } from '@/components/app-shell/StudentAppShell';
import { TutorAppShell } from '@/components/app-shell/TutorAppShell';
import { ShellSkeleton } from '@/components/ui';
import { getStoredUser } from '@/lib/auth';
import { usePathname } from 'next/navigation';
import { ReactNode, useLayoutEffect, useState } from 'react';

function readStoredRole(): string {
  try {
    const role = getStoredUser()?.role;
    return role ? String(role).trim().toUpperCase() : '';
  } catch {
    return '';
  }
}

/** Fallback when storage is briefly empty after client navigations. */
function roleFromPath(pathname: string): string {
  if (
    pathname.includes('/dashboard/admin') ||
    /\/admin(\/|$)/.test(pathname)
  ) {
    return 'ADMIN';
  }
  if (
    pathname.includes('/dashboard/student') ||
    pathname.includes('/profile/student') ||
    pathname.includes('/matches/inbox') ||
    pathname.includes('/requirements/new') ||
    /\/requirements$/.test(pathname)
  ) {
    return 'STUDENT';
  }
  if (
    pathname.includes('/dashboard/tutor') ||
    pathname.includes('/profile/tutor') ||
    pathname.includes('/verification') ||
    pathname.includes('/requirements/open') ||
    pathname.includes('/matches/mine') ||
    pathname.includes('/commissions') ||
    pathname.includes('/payments/')
  ) {
    return 'TUTOR';
  }
  return '';
}

/**
 * Persistent role shell. Mounted once via AppShellGate so navigating
 * between modules keeps sidebar/navbar in place.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const [role, setRole] = useState<string | undefined>(undefined);

  useLayoutEffect(() => {
    const sync = () => {
      const stored = readStoredRole();
      const inferred = roleFromPath(pathname);
      setRole(stored || inferred || '');
    };

    sync();
    // Catch login → dashboard races and same-tab auth updates
    const t0 = window.setTimeout(sync, 0);
    const t1 = window.setTimeout(sync, 100);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('tc-auth-changed', sync);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('tc-auth-changed', sync);
    };
  }, [pathname]);

  if (role === undefined) {
    return <ShellSkeleton />;
  }

  if (role === 'TUTOR') {
    return <TutorAppShell>{children}</TutorAppShell>;
  }

  if (role === 'STUDENT') {
    return <StudentAppShell>{children}</StudentAppShell>;
  }

  if (role === 'ADMIN') {
    return <AdminAppShell>{children}</AdminAppShell>;
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      {children}
    </div>
  );
}
