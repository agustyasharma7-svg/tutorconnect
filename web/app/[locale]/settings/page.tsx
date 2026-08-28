'use client';

import { AppFrame } from '@/components/app-shell/AppFrame';
import {
  Button,
  ButtonLink,
  Card,
  CardDescription,
  CardTitle,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getSupportEmail } from '@/lib/support';
import { getStoredUser, logoutSession } from '@/lib/auth';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const ta = useTranslations('auth');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const support = getSupportEmail();

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (stored.role !== 'TUTOR') {
      router.replace(`/${locale}/dashboard/${stored.role.toLowerCase()}`);
      return;
    }
    setName(stored.name);
  }, [locale, router]);

  if (!name) {
    return (
      <div className="min-h-screen bg-cream">
        <Spinner label={tc('loading')} />
      </div>
    );
  }

  return (
    <AppFrame>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <PageHeader title={t('settings')} description={t('settingsLead')} />

        <Card>
          <CardTitle>{t('profile')}</CardTitle>
          <CardDescription>{name}</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={`/${locale}/profile/tutor`} size="sm">
              {t('completeProfile')}
            </ButtonLink>
            <ButtonLink
              href={`/${locale}/verification`}
              variant="secondary"
              size="sm"
            >
              {t('verification')}
            </ButtonLink>
          </div>
        </Card>

        <Card className="mt-4">
          <CardTitle>{tc('language')}</CardTitle>
          <CardDescription>{t('settingsLanguageHint')}</CardDescription>
          <div className="mt-3">
            <LanguageSwitcher />
          </div>
        </Card>

        <Card className="mt-4">
          <CardTitle>{ta('setPassword')}</CardTitle>
          <CardDescription>{t('settingsPasswordHint')}</CardDescription>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
          >
            {ta('forgotPassword')}
          </Link>
        </Card>

        <Card className="mt-4">
          <CardTitle>{tc('navHelp')}</CardTitle>
          <CardDescription>{support}</CardDescription>
          <Link
            href={`/${locale}/help`}
            className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
          >
            {tc('navHelp')}
          </Link>
        </Card>

        <Button
          type="button"
          variant="ghost"
          className="mt-8 text-danger hover:text-danger"
          onClick={async () => {
            await logoutSession();
            router.push(`/${locale}/auth/login`);
          }}
        >
          {tc('logout')}
        </Button>
      </main>
    </AppFrame>
  );
}
