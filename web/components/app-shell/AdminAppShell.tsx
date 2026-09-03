'use client';

import { BrandMark } from '@/components/BrandMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { logoutSession, getStoredUser } from '@/lib/auth';
import { AuthUser } from '@/lib/types';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect, useRef, useState } from 'react';

type NavItem = { href: string; label: string; match?: 'exact' | 'prefix' };

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'A'
  );
}

function pathActive(
  pathname: string,
  href: string,
  match: 'exact' | 'prefix' = 'prefix',
) {
  if (match === 'exact') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminAppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('dashboard');
  const ta = useTranslations('admin');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const base = `/${locale}`;

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: t('navAdmin'),
      items: [
        {
          href: `${base}/dashboard/admin`,
          label: t('overview'),
          match: 'exact',
        },
        {
          href: `${base}/admin/verification`,
          label: ta('verificationQueue'),
        },
        {
          href: `${base}/admin/commissions`,
          label: t('commissions'),
        },
      ],
    },
    {
      title: t('navOps'),
      items: [
        { href: `${base}/disputes`, label: ta('disputes') },
        { href: `${base}/help`, label: tc('navHelp') },
      ],
    },
  ];

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen]);

  const logout = async () => {
    await logoutSession();
    router.push(`${base}/auth/login`);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link
        href={`${base}/dashboard/admin`}
        className="flex h-14 items-center gap-2.5 border-b border-white/10 px-4"
        onClick={() => setSidebarOpen(false)}
      >
        <BrandMark className="h-8 w-8" />
        <span className="text-sm font-semibold tracking-tight text-white">
          {tc('brand')}
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a9bb0]">
              {group.title}
            </p>
            <ul className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const active = pathActive(
                  pathname,
                  item.href,
                  item.match ?? 'prefix',
                );
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg px-2.5 py-2 text-sm ${
                        active
                          ? 'bg-white/12 font-medium text-white'
                          : 'text-[#c5c0b6] hover:bg-white/6 hover:text-white'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cream">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            aria-hidden
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 z-50 w-64 bg-ink shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 self-start overflow-hidden bg-ink md:block">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-cream-dark bg-cream/90 px-3 backdrop-blur-md sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink md:hidden"
              aria-label={t('openMenu')}
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M3 5h12M3 9h12M3 13h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <p className="truncate text-sm font-semibold text-ink lg:text-base">
              {t('admin')}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex max-w-[11rem] items-center gap-2 rounded-full border border-cream-dark bg-white py-1 pl-1 pr-2.5 sm:max-w-xs sm:pr-3"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                  {initials(user?.name ?? 'Admin')}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-xs font-medium text-ink">
                    {user?.name ?? t('admin')}
                  </span>
                  <span className="block text-[10px] text-ink-muted">
                    {t('roleAdmin')}
                  </span>
                </span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-cream-dark bg-white py-1 shadow-lg"
                >
                  <Link
                    href={`${base}/dashboard/admin`}
                    className="block px-3 py-2 text-sm text-ink hover:bg-cream"
                    role="menuitem"
                  >
                    {t('overview')}
                  </Link>
                  <Link
                    href={`${base}/help`}
                    className="block px-3 py-2 text-sm text-ink hover:bg-cream"
                    role="menuitem"
                  >
                    {tc('navHelp')}
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    role="menuitem"
                    onClick={logout}
                  >
                    {tc('logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
