'use client';

import { BrandMark } from '@/components/BrandMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { logoutSession, getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect, useId, useState } from 'react';

type NavItem = { href: string; label: string; match?: 'exact' | 'prefix' };

function pathActive(pathname: string, href: string, match: 'exact' | 'prefix' = 'prefix') {
  if (match === 'exact') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentAppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const base = `/${locale}`;

  const links: NavItem[] = [
    { href: `${base}/dashboard/student`, label: t('overview'), match: 'exact' },
    { href: `${base}/requirements`, label: t('myRequirements') },
    { href: `${base}/search`, label: t('findTutors') },
    { href: `${base}/matches/inbox`, label: t('applicationsInbox') },
    { href: `${base}/demos`, label: t('demos') },
    { href: `${base}/agreements`, label: t('agreements') },
    { href: `${base}/chat`, label: t('chat') },
    { href: `${base}/profile/student`, label: t('editProfile') },
  ];

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const linkClass = (href: string, match: 'exact' | 'prefix' = 'prefix') =>
    pathActive(pathname, href, match)
      ? 'text-brand font-medium'
      : 'text-ink-muted hover:text-brand';

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-40 border-b border-cream-dark/80 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[3.75rem]">
          <Link
            href={`${base}/dashboard/student`}
            className="flex min-w-0 items-center gap-2"
            aria-label={tc('appName')}
          >
            <BrandMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
            <span className="truncate text-sm font-semibold tracking-tight">
              {tc('brand')}
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm lg:flex">
            {links.slice(0, 6).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={linkClass(l.href, l.match)}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user && (
              <span className="hidden text-sm text-ink-muted sm:inline">
                {user.name}
              </span>
            )}
            <button
              type="button"
              className="text-sm font-medium text-danger hover:underline"
              onClick={async () => {
                await logoutSession();
                router.push(`${base}/auth/login`);
              }}
            >
              {tc('logout')}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line lg:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={tc('menu')}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                {open ? (
                  <path
                    d="M4 4l10 10M14 4 4 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 5h12M3 9h12M3 13h12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden">
            <div
              className="fixed inset-0 z-30 bg-ink/25"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <nav
              id={menuId}
              className="absolute inset-x-0 top-full z-40 border-b border-cream-dark bg-cream shadow-panel"
            >
              <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 text-sm">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`py-3 ${linkClass(l.href, l.match)}`}
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
