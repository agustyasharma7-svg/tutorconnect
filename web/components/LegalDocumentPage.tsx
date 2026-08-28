'use client';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSupportEmail } from '@/lib/support';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

type Section = { heading: string; body: string };

const SUPPORT = getSupportEmail();

export function LegalDocumentPage({
  titleKey,
  introKey,
  sectionsKey,
  updatedKey,
}: {
  titleKey: 'termsTitle' | 'privacyTitle' | 'agreementTitle';
  introKey: 'termsIntro' | 'privacyIntro' | 'agreementIntro';
  sectionsKey: 'termsSections' | 'privacySections' | 'agreementSections';
  updatedKey: 'termsUpdated' | 'privacyUpdated' | 'agreementUpdated';
}) {
  const t = useTranslations('legal');
  const tc = useTranslations('common');
  const { locale } = useParams<{ locale: string }>();
  const sections = t.raw(sectionsKey) as Section[];

  return (
    <div className="min-h-screen bg-cream text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {t(titleKey)}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{t(updatedKey)}</p>
        <p className="mt-4 leading-relaxed text-ink-muted">{t(introKey)}</p>
        <div className="mt-8 space-y-6">
          {Array.isArray(sections) &&
            sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-lg font-semibold text-ink">{s.heading}</h2>
                <p className="mt-2 leading-relaxed text-ink-muted">{s.body}</p>
              </section>
            ))}
        </div>
        <p className="mt-10 text-sm text-ink-muted">
          {t('supportLabel')}:{' '}
          <a className="font-medium text-brand hover:underline" href={`mailto:${SUPPORT}`}>
            {SUPPORT}
          </a>
        </p>
        <Link
          href={`/${locale}`}
          className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
        >
          {tc('back')}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
