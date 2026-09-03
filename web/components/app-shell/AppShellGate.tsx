'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import { usePathname } from 'next/navigation';
import { ReactNode, useMemo } from 'react';

/**
 * Routes that own their own chrome (SiteHeader / marketing layout).
 * Everything else keeps a persistent AppFrame so sidebar/navbar
 * do not remount when moving between modules.
 */
function isPublicChromePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  // /en or /hi
  if (segments.length <= 1) return true;
  const route = segments.slice(1).join('/');
  if (route.startsWith('auth')) return true;
  if (route.startsWith('legal')) return true;
  // Public tutor profile pages
  if (/^tutors\/[^/]+$/.test(route)) return true;
  return false;
}

export function AppShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const isPublic = useMemo(() => isPublicChromePath(pathname), [pathname]);

  if (isPublic) {
    return <>{children}</>;
  }

  return <AppFrame key="app-shell">{children}</AppFrame>;
}
