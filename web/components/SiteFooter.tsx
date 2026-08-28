'use client';

import { BrandMark } from './BrandMark';
import { getSupportEmail } from '@/lib/support';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('common');
  const tl = useTranslations('legal');
  const ta = useTranslations('auth');
  const { locale } = useParams<{ locale: string }>();
  const support = getSupportEmail();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-ink text-[#e8e4dc]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="text-base font-semibold tracking-tight text-white">
              {t('brand')}
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#c5c0b6]">
            {t('footerTagline')}
          </p>
          <a
            href={`mailto:${support}`}
            className="mt-5 inline-block text-sm text-[#9db7ff] underline-offset-4 hover:underline"
          >
            {support}
          </a>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9bb0]">
            {t('footerProduct')}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href={`/${locale}#how-it-works`} className="hover:text-white">
                {t('navHow')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}#why`} className="hover:text-white">
                {t('navWhy')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/search`} className="hover:text-white">
                {t('navFind')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/help`} className="hover:text-white">
                {t('navHelp')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9bb0]">
            {t('footerJoin')}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                href={`/${locale}/auth/register/student`}
                className="hover:text-white"
              >
                {ta('registerStudent')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/auth/register/tutor`}
                className="hover:text-white"
              >
                {ta('registerTutor')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/auth/login`} className="hover:text-white">
                {ta('login')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/help#contact`} className="hover:text-white">
                {t('contact')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9bb0]">
            {t('footerLegal')}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href={`/${locale}/legal/terms`} className="hover:text-white">
                {tl('termsLink')}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/legal/privacy`} className="hover:text-white">
                {tl('privacyLink')}
              </Link>
            </li>
            <li>
              <Link
                href={`/${locale}/legal/agreement`}
                className="hover:text-white"
              >
                {tl('agreementLink')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[#8a9bb0]">
          {t('footerRights', { year })}
        </p>
      </div>
    </footer>
  );
}
