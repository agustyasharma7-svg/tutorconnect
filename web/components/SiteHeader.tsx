'use client';

import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export function SiteHeader() {
  const t = useTranslations('common');
  const tl = useTranslations('legal');
  const { locale } = useParams<{ locale: string }>();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href={`/${locale}`} className="text-lg font-bold text-blue-700">
          {t('appName')}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <Link href={`/${locale}/legal/terms`} className="hover:text-blue-700">
            {tl('termsLink')}
          </Link>
          <Link href={`/${locale}/legal/privacy`} className="hover:text-blue-700">
            {tl('privacyLink')}
          </Link>
          <Link href={`/${locale}/legal/agreement`} className="hover:text-blue-700">
            {tl('agreementLink')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
