'use client';

import { BrandMark } from './BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ButtonLink } from '@/components/ui';
import { getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

export function SiteHeader() {
  const t = useTranslations('common');
  const ta = useTranslations('auth');
  const { locale } = useParams<{ locale: string }>();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const menuId = useId();

  const links = [
    { href: `/${locale}#how-it-works`, label: t('navHow') },
    { href: `/${locale}#why`, label: t('navWhy') },
    { href: `/${locale}/help`, label: t('navHelp') },
    { href: `/${locale}/search`, label: t('navFind') },
  ];

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  const dashboardHref = user
    ? `/${locale}/dashboard/${user.role.toLowerCase()}`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-cream-dark/80 bg-cream/80 backdrop-blur-md">
      <div className="relative z-50 mx-auto flex h-14 max-w-6xl flex-nowrap items-center justify-between gap-2 px-3 sm:h-[3.75rem] sm:gap-4 sm:px-4">
        <Link
          href={`/${locale}`}
          className="flex min-w-0 items-center gap-2 text-ink sm:gap-2.5"
          aria-label={t('appName')}
          onClick={close}
        >
          <BrandMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <span className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
            {t('brand')}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-ink-muted lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap transition-colors hover:text-brand"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LanguageSwitcher />
          {dashboardHref ? (
            <ButtonLink
              href={dashboardHref}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {t('navDashboard')}
            </ButtonLink>
          ) : (
            <>
              <Link
                href={`/${locale}/auth/login`}
                className="hidden whitespace-nowrap text-sm font-medium text-ink-muted hover:text-brand sm:inline"
              >
                {ta('login')}
              </Link>
              <ButtonLink
                href={`/${locale}/auth/register/student`}
                size="sm"
                className="hidden sm:inline-flex"
              >
                {t('getStarted')}
              </ButtonLink>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink sm:h-9 sm:w-9 lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={t('menu')}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{t('menu')}</span>
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
            className="fixed inset-0 z-40 bg-ink/25"
            aria-hidden
            onClick={close}
          />
          <nav
            id={menuId}
            className="absolute inset-x-0 top-full z-50 border-b border-cream-dark bg-cream shadow-panel"
          >
            <div className="mx-auto flex max-w-6xl flex-col px-4 py-2 text-sm text-ink-muted">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="py-3"
                  onClick={close}
                >
                  {l.label}
                </Link>
              ))}
              {dashboardHref ? (
                <Link
                  href={dashboardHref}
                  className="mb-3 mt-1 rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-white"
                  onClick={close}
                >
                  {t('navDashboard')}
                </Link>
              ) : (
                <>
                  <Link
                    href={`/${locale}/auth/login`}
                    className="py-3 sm:hidden"
                    onClick={close}
                  >
                    {ta('login')}
                  </Link>
                  <Link
                    href={`/${locale}/auth/register/student`}
                    className="mb-3 mt-1 rounded-full bg-brand px-4 py-2.5 text-center text-sm font-medium text-white sm:hidden"
                    onClick={close}
                  >
                    {t('getStarted')}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
